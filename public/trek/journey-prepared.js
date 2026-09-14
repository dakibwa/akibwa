/* Finished scenery and versioned local terrain for the Gastein pilot. */
(function(host){
  'use strict';
  const contains=(bounds,[lng,lat])=>lng>=bounds[0]&&lat>=bounds[1]&&lng<=bounds[2]&&lat<=bounds[3];
  function decode(buffer){
    const length=new DataView(buffer).getUint32(0,true),start=4+length+(4-length%4)%4;
    if(length>buffer.byteLength-4)throw Error('Invalid prepared scene header');
    const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,length)));
    const array=({offset,length})=>new Float32Array(buffer,start+offset,length);
    return {...meta,vertices:array(meta.vertices),births:new Map(meta.births),instances:new Map(meta.instances.map(([k,v])=>[k,array(v)])),treeModels:new Map(meta.treeModels.map(([k,v])=>[k,{...v,data:array(v.data)}]))};
  }
  function select(scene, center, radius) {
    const local=center.map((n,i)=>n-scene.origin[i]),reach=radius+1600;
    const chunks=scene.chunks.filter(c=>Math.hypot(c.center[0]-local[0],c.center[1]-local[1])<reach+1500);
    const vertices=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;
    for(const c of chunks){vertices.set(scene.vertices.subarray(c.offset,c.offset+c.length),offset);offset+=c.length;}
    const instances=new Map();let trees=0,treeVertices=0;
    for(const [key,values]of scene.instances){const visible=[];for(let i=0;i<values.length;i+=5)if(Math.hypot(values[i]-local[0],values[i+1]-local[1])<reach)visible.push(...values.subarray(i,i+5));if(visible.length){instances.set(key,new Float32Array(visible));trees+=visible.length/5;treeVertices+=visible.length/5*scene.treeModels.get(key).data.length/6;}}
    return {...scene,vertices,instances,trees,treeVertices,radius};
  }
  async function create({manifestURL,fetcher=host.fetch.bind(host)}={}){
    const response=await fetcher(manifestURL);if(!response.ok)throw Error('Prepared atlas unavailable');
    const manifest=await response.json(),base=new URL('.',new URL(manifestURL,host.location.href));
    let selection=null,selectionKey=null;
    let scene=null,pending=null,loadedBytes=0,preloaded=0,failed=0;
    const url=file=>new URL(file,base).href;
    async function load(){
      if(pending)return pending;
      pending=(async()=>{
        const response=await fetcher(url(manifest.scene),{cache:'force-cache'});if(!response.ok)throw Error('Prepared scenery unavailable');
        const bytes=await response.arrayBuffer();loadedBytes+=bytes.byteLength;
        const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        scene=decode(await new Response(stream).arrayBuffer());return scene;
      })();return pending;
    }
    function resolveTile(original){
      const vector=original.match(/\/planet\/[^/]+\/(\d+\/\d+\/\d+)\.pbf$/),dem=original.match(/\/terrarium\/(\d+\/\d+\/\d+)\.png$/);
      const item=manifest.tiles[(vector?'vector/':dem?'dem/':'')+(vector?.[1]||dem?.[1]||'')];return item?url(item.file):null;
    }
    // The complete coarse backdrop fits a small startup budget. Fine detail
    // follows actual camera demand through the existing foreground tile queue.
    async function preload(){
      const entries=Object.entries(manifest.tiles).filter(([key])=>+key.split('/')[1]<=12);let index=0;
      await Promise.all(Array.from({length:2},async()=>{while(index<entries.length){const [,tile]=entries[index++];try{const r=await fetcher(url(tile.file),{cache:'force-cache',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Tile '+r.status);await r.arrayBuffer();preloaded++;}catch{failed++;}}}));
    }
    return {manifest,load,preload,resolveTile,at:(point,radius=14000)=>{
      if(!scene||!contains(manifest.core,point))return null;
      const center=host.TrekPaper.project(point),key=center.map(n=>Math.floor(n/1000)).join(':')+':'+Math.round(radius/400);
      if(key!==selectionKey){selection={...select(scene,center,radius),key};selectionKey=key;}
      return selection;
    },status:()=>({id:manifest.id,loaded:!!scene,sceneBytes:manifest.sceneBytes,decodedBytes:manifest.decodedBytes,loadedBytes,preloaded,failed,tileBytes:manifest.tileBytes})};
  }
  const api={contains,decode,select,create};if(typeof module!=='undefined')module.exports=api;host.TrekPrepared=api;
})(typeof window==='undefined'?globalThis:window);
