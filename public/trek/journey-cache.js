/* A bounded disk cache and a route-aware queue. Only public map tiles enter it. */
(function(host){
  'use strict';
  const NAME='trek-map-tiles-v1',LIMIT=256,MAX_TILE=512*1024,TTL=7*86400000,WARM_LIMIT=192;
  const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const allowed=url=>/^https:\/\/tiles\.openfreemap\.org\/planet\/[^/]+\/\d+\/\d+\/\d+\.pbf$/.test(url)||/^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/\d+\/\d+\/\d+\.png$/.test(url);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const tileAt=([lon,lat],z)=>{const n=2**z;return [Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];};
  const urlFor=(template,z,x,y)=>template.replace('{z}',z).replace('{x}',x).replace('{y}',y);
  function landscape(bounds,vector,zoom=13){
    if(!bounds)return [];
    // Prepare a coarse, complete terrain backdrop across the viewing window,
    // then let the route corridor supply finer detail. Reduce the level for a
    // large view instead of turning a broad camera into an unbounded download.
    let z=clamp(Math.floor(zoom)-1,0,13),a,b;
    do{
      a=tileAt([clamp(bounds[0][0],-180,179.999),clamp(bounds[1][1],-85,85)],z);
      b=tileAt([clamp(bounds[1][0],-180,179.999),clamp(bounds[0][1],-85,85)],z);
      if((b[0]-a[0]+1)*(b[1]-a[1]+1)<=36||z===0)break;
      z--;
    }while(true);
    const tiles=[];
    for(let x=a[0];x<=b[0];x++)for(let y=a[1];y<=b[1];y++)tiles.push([x,y]);
    tiles.sort((p,q)=>Math.hypot(p[0]-(a[0]+b[0])/2,p[1]-(a[1]+b[1])/2)-Math.hypot(q[0]-(a[0]+b[0])/2,q[1]-(a[1]+b[1])/2));
    return tiles.flatMap(([x,y])=>[urlFor(DEM,z,x,y),...(vector?[urlFor(vector,z,x,y)]:[])]);
  }
  function corridor(path,from,to,vector,zoom=13,radius=1600){
    const urls=new Set(),start=clamp(from,0,path.total),end=clamp(to,start,path.total),z=clamp(Math.ceil(zoom),11,14),dem=clamp(Math.round(zoom+1),10,14);
    // Start on the route and add the nearest neighbours first. The visible
    // vector level precedes its parent. Raster DEM uses 256px tiles and rounds
    // its own zoom, so retain the camera fraction when choosing that level.
    for(let d=start;d<=end;d=Math.min(end,d+800)){
      const point=path.sample(d).point;
      for(const [template,level] of [[vector,z],[DEM,dem],[vector,z-1],[DEM,Math.max(10,dem-1)]]){
        if(!template)continue;
        const [x,y]=tileAt(point,level),tileMetres=40075017*Math.cos(point[1]*Math.PI/180)/2**level;
        const r=clamp(Math.ceil(radius/tileMetres),0,2),offsets=[];
        for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)offsets.push([dx,dy]);
        offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
        for(const [dx,dy] of offsets){
          const n=2**level;if(y+dy<0||y+dy>=n)continue;
          urls.add(urlFor(template,level,(x+dx+n)%n,y+dy));
          if(urls.size===WARM_LIMIT)return [...urls];
        }
      }
      if(d===end)break;
    }
    return [...urls];
  }
  const lookAhead=speed=>clamp(8000+Math.max(0,speed||0)*12,12000,40000);
  // How far along the route every tile the camera will pass through has
  // arrived: the rendered vector and DEM levels on the route itself. The
  // traveller reads this to keep the walk behind the landscape, never ahead.
  function routeTiles(path,d,vector,zoom){
    const point=path.sample(d).point,z=clamp(Math.ceil(zoom),11,14),dem=clamp(Math.round(zoom+1),10,14),urls=[];
    for(const [template,level] of [[vector,z],[DEM,dem]])if(template){const [x,y]=tileAt(point,level);urls.push(urlFor(template,level,x,y));}
    return urls;
  }
  function create({storage=host.caches,fetcher=host.fetch.bind(host),now=Date.now,resolveTile=null}={}){
    const inflight=new Map(),memory=new Map(),queued=new Map(),warming=new Map(),arrived=new Map();
    // Public tile URLs that have arrived, most recent last. Enough entries for
    // a long look-ahead; the oldest are forgotten first.
    const markArrived=url=>{arrived.delete(url);arrived.set(url,true);if(arrived.size>4096)arrived.delete(arrived.keys().next().value);};
    let cache=null,persistent=false,hits=0,network=0,errors=0,aborted=0,writes=0,generation=0,epoch='',lastAhead=-Infinity,pruning=Promise.resolve();
    const opened=Promise.resolve().then(()=>storage?.open(NAME)).then(c=>{cache=c||null;persistent=!!cache;}).catch(()=>{});
    const remember=(url,value)=>{memory.delete(url);memory.set(url,value);while(memory.size>32)memory.delete(memory.keys().next().value);};
    const abortError=()=>new DOMException('Aborted','AbortError');
    function read(url,{signal}={}){
      if(!allowed(url))return Promise.reject(Error('Not a Trek map tile'));
      const original=url;url=resolveTile?.(url)||url;
      if(signal?.aborted)return Promise.reject(abortError());
      if(memory.has(url)){const value=memory.get(url);remember(url,value);hits++;markArrived(original);return Promise.resolve(value);}
      let job=inflight.get(url);
      if(!job){
        job={controller:new AbortController(),users:new Set(),settled:false};
        const current=job;
        current.promise=(async()=>{
          await opened;
          if(cache)try{
            const response=await cache.match(url);
            if(response&&now()-Number(response.headers.get('x-trek-cached-at'))<TTL){const data=await response.arrayBuffer();hits++;remember(url,data);return data;}
          }catch{cache=null;persistent=false;}
          if(current.controller.signal.aborted)throw abortError();
          network++;let timeout;
          try{
            timeout=setTimeout(()=>current.controller.abort(),15000);
            let response;
            try{response=await fetcher(url,{credentials:'omit',signal:current.controller.signal});}
            catch(error){if(url===original||current.controller.signal.aborted)throw error;}
            // An old open page can outlive a prepared package revision.
            // Missing local tiles fall back to their original public provider.
            if(!response?.ok&&url!==original&&!current.controller.signal.aborted)response=await fetcher(original,{credentials:'omit',signal:current.controller.signal});
            if(!response?.ok)throw Error('Map tile '+response?.status);
            const data=await response.arrayBuffer();remember(url,data);
            if(cache&&data.byteLength<=MAX_TILE){
              const headers=new Headers({'content-type':response.headers.get('content-type')||'application/octet-stream','x-trek-cached-at':String(now())});
              // Serial writes keep eviction bounded without blocking map delivery.
              pruning=pruning.then(async()=>{if(!cache)return;await cache.put(url,new Response(data,{headers}));writes++;if(writes%12===1){const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-LIMIT)))await cache.delete(key);}}).catch(()=>{cache=null;persistent=false;});
            }
            return data;
          }catch(error){if(current.controller.signal.aborted)aborted++;else errors++;throw error;}
          finally{clearTimeout(timeout);}
        })();
        inflight.set(url,current);
        const settled=()=>{current.settled=true;if(inflight.get(url)===current)inflight.delete(url);};
        // A tile that fails for good counts as settled, so the walk never waits
        // on it forever; an aborted one may still be wanted and does not.
        current.promise.then(()=>{markArrived(original);settled();},()=>{if(!current.controller.signal.aborted)markArrived(original);settled();});
      }
      // A foreground map request and a speculative request share one fetch.
      // Abort the network only when every consumer has left this tile behind.
      return new Promise((resolve,reject)=>{
        const user={};job.users.add(user);
        const release=()=>{
          signal?.removeEventListener('abort',cancel);job.users.delete(user);
          if(!job.users.size&&!job.settled){job.controller.abort();if(inflight.get(url)===job)inflight.delete(url);}
        };
        const cancel=()=>{release();reject(abortError());};
        signal?.addEventListener('abort',cancel,{once:true});
        job.promise.then(data=>{release();if(!signal?.aborted)resolve(data);},error=>{release();reject(error);});
      });
    }
    const signalRead=(url,signal)=>read(url,{signal}).then(data=>({data:data.slice(0)}));
    const install=lib=>lib.addProtocol('trek-cache',(params,controller)=>signalRead(params.url.slice('trek-cache://'.length),controller.signal));
    const transformRequest=(url,type)=>type==='Tile'&&allowed(url)?{url:'trek-cache://'+url}:{url};
    function pump(){
      while(warming.size<3&&queued.size){
        const [url,job]=queued.entries().next().value;queued.delete(url);
        job.controller=new AbortController();warming.set(url,job);
        read(url,{signal:job.controller.signal}).then(()=>job.finishes.forEach(finish=>finish(true)),()=>job.finishes.forEach(finish=>finish(false))).finally(()=>{
          if(warming.get(url)===job)warming.delete(url);pump();
        });
      }
    }
    async function warm(urls,onProgress=()=>{}){
      const id=++generation,wanted=[...new Set(urls)].filter(allowed).slice(0,WARM_LIMIT),keep=new Set(wanted);let done=0,failed=0;
      for(const job of queued.values())job.finishes.forEach(finish=>finish(false));queued.clear();
      for(const [url,job] of warming)if(!keep.has(url))job.controller.abort();
      const jobs=wanted.map(url=>new Promise(resolve=>{
        const finish=ok=>{done++;if(!ok)failed++;if(id===generation)onProgress({done,total:wanted.length,failed});resolve(ok);};
        const running=warming.get(url);
        if(running&&!running.controller.signal.aborted)running.finishes.push(finish);
        else queued.set(url,{finishes:[finish]});
      }));
      pump();await Promise.all(jobs);return {done,failed,cancelled:id!==generation};
    }
    function ahead(path,distance,vector,zoom,speed=0,bounds=null){
      const horizon=lookAhead(speed),key=[Math.floor(distance/1600),Math.ceil(zoom),Math.round(zoom+1),Math.floor(horizon/4000)].join(':');
      if(key===epoch||now()-lastAhead<600)return;epoch=key;lastAhead=now();
      if(typeof bounds==='function')bounds=bounds();
      // The tiles the camera will pass through come first, as far as the
      // look-ahead reaches; then the scenery around them and the broad view.
      // Successive plans retain shared work and cancel only tiles outside it.
      void warm([...corridor(path,distance,distance+horizon,vector,zoom,0),...corridor(path,distance,distance+4000,vector,zoom),...landscape(bounds,vector,zoom),...corridor(path,distance-2000,distance,vector,zoom,1000)]);
    }
    const cancel=()=>{
      generation++;epoch='';lastAhead=-Infinity;
      for(const job of queued.values())job.finishes.forEach(finish=>finish(false));queued.clear();
      for(const job of warming.values())job.controller.abort();
    };
    const flush=()=>pruning;
    function readyAhead(path,from,vector,zoom,horizon){
      const end=clamp(from+horizon,from,path.total);
      for(let d=clamp(from,0,path.total);;d=Math.min(end,d+400)){
        if(routeTiles(path,d,vector,zoom).some(url=>!arrived.has(url)))return Math.max(0,d-from);
        if(d>=end)return horizon;
      }
    }
    return {read,install,transformRequest,warm,ahead,cancel,flush,readyAhead,status:()=>({persistent,hits,network,errors,aborted,pending:queued.size+warming.size,memory:memory.size}),name:NAME};
  }
  const api={create,corridor,landscape,lookAhead,routeTiles,tileAt,urlFor,DEM,allowed};if(typeof module!=='undefined')module.exports=api;else host.TrekCache=api;
})(typeof window==='undefined'?globalThis:window);
