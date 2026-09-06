/* A bounded disk cache and a route-aware queue. Only public map tiles enter it. */
(function(host){
  'use strict';
  const NAME='trek-map-tiles-v1',LIMIT=256,MAX_TILE=512*1024,TTL=7*86400000;
  const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const allowed=url=>/^https:\/\/tiles\.openfreemap\.org\/planet\/[^/]+\/\d+\/\d+\/\d+\.pbf$/.test(url)||/^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/\d+\/\d+\/\d+\.png$/.test(url);
  const tileAt=([lon,lat],z)=>{const n=2**z;return [Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];};
  const urlFor=(template,z,x,y)=>template.replace('{z}',z).replace('{x}',x).replace('{y}',y);
  function corridor(path,from,to,vector,zoom=13,radius=1600){
    const urls=new Set();
    for(let d=Math.max(0,from);d<=Math.min(path.total,to)+.1;d+=800){
      const point=path.sample(d).point;
      for(const [template,z] of [[vector,Math.max(10,zoom-1)],[vector,zoom],[DEM,Math.max(10,zoom-1)],[DEM,Math.min(14,zoom+1)]]){
        if(!template)continue;
        const [x,y]=tileAt(point,z),tileMetres=40075017*Math.cos(point[1]*Math.PI/180)/2**z;
        const r=Math.max(1,Math.ceil(radius/tileMetres));
        for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)urls.add(urlFor(template,z,x+dx,y+dy));
      }
    }
    return [...urls];
  }
  function create({storage=host.caches,fetcher=host.fetch.bind(host),now=Date.now}={}){
    const inflight=new Map(),memory=new Map(),queued=new Map();
    let cache=null,persistent=false,hits=0,network=0,errors=0,writes=0,active=0,generation=0,epoch=-1,pruning=Promise.resolve();
    const opened=Promise.resolve().then(()=>storage?.open(NAME)).then(c=>{cache=c||null;persistent=!!cache;}).catch(()=>{});
    const remember=(url,value)=>{memory.delete(url);memory.set(url,value);while(memory.size>32)memory.delete(memory.keys().next().value);};
    async function read(url){
      if(!allowed(url))throw Error('Not a Trek map tile');
      if(memory.has(url)){const v=memory.get(url);remember(url,v);hits++;return v;}
      if(inflight.has(url))return inflight.get(url);
      const job=(async()=>{
        await opened;
        if(cache)try{const response=await cache.match(url);if(response&&now()-Number(response.headers.get('x-trek-cached-at'))<TTL){const data=await response.arrayBuffer();hits++;remember(url,data);return data;}}catch{cache=null;persistent=false;}
        network++;
        try{
          const response=await fetcher(url,{credentials:'omit',signal:AbortSignal.timeout(15000)});
          if(!response.ok)throw Error('Map tile '+response.status);
          const data=await response.arrayBuffer();remember(url,data);
          if(cache&&data.byteLength<=MAX_TILE){
            const headers=new Headers({'content-type':response.headers.get('content-type')||'application/octet-stream','x-trek-cached-at':String(now())});
            // Serial writes keep eviction bounded without blocking map delivery.
            pruning=pruning.then(async()=>{if(!cache)return;await cache.put(url,new Response(data,{headers}));writes++;if(writes%12===1){const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-LIMIT)))await cache.delete(key);}}).catch(()=>{cache=null;persistent=false;});
          }
          return data;
        }catch(e){errors++;throw e;}
      })();
      inflight.set(url,job);try{return await job;}finally{inflight.delete(url);}
    }
    const signalRead=(url,signal)=>new Promise((resolve,reject)=>{
      if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return;}
      const abort=()=>{reject(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',abort,{once:true});
      read(url).then(data=>{signal?.removeEventListener('abort',abort);if(!signal?.aborted)resolve({data:data.slice(0)});},e=>{signal?.removeEventListener('abort',abort);reject(e);});
    });
    const install=lib=>lib.addProtocol('trek-cache',(params,controller)=>signalRead(params.url.slice('trek-cache://'.length),controller.signal));
    const transformRequest=(url,type)=>type==='Tile'&&allowed(url)?{url:'trek-cache://'+url}:{url};
    function pump(){
      while(active<3&&queued.size){
        const [url,finish]=queued.entries().next().value;queued.delete(url);active++;
        read(url).then(()=>finish(true),()=>finish(false)).finally(()=>{active--;pump();});
      }
    }
    async function warm(urls,onProgress=()=>{}){
      const id=++generation;let done=0,failed=0;
      for(const finish of queued.values())finish(false);queued.clear();
      const jobs=[...new Set(urls)].map(url=>new Promise(resolve=>{
        const finish=ok=>{done++;if(!ok)failed++;if(id===generation)onProgress({done,total:urls.length,failed});resolve(ok);};
        const previous=queued.get(url);if(previous)previous(false);queued.set(url,finish);
      }));pump();await Promise.all(jobs);return {done,failed,cancelled:id!==generation};
    }
    function ahead(path,distance,vector,zoom){
      const key=Math.floor(distance/3500);if(key===epoch)return;epoch=key;
      // A seek discards speculative work; at most three in-flight tiles finish.
      void warm(corridor(path,distance-1000,distance+16000,vector,Math.max(11,Math.min(14,Math.floor(zoom)))));
    }
    const cancel=()=>{generation++;epoch=-1;for(const finish of queued.values())finish(false);queued.clear();};
    const flush=()=>pruning;
    return {read,install,transformRequest,warm,ahead,cancel,flush,status:()=>({persistent,hits,network,errors,pending:queued.size+active,memory:memory.size}),name:NAME};
  }
  const api={create,corridor,tileAt,urlFor,DEM,allowed};if(typeof module!=='undefined')module.exports=api;else host.TrekCache=api;
})(typeof window==='undefined'?globalThis:window);
