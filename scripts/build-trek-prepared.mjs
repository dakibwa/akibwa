// Explicit maintenance build: prepare one Alpine scene from public map data.
// Ordinary site builds never fetch geographic data.
import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
const require=createRequire(import.meta.url),deps=createRequire(process.env.TREK_BUILD_MODULES||import.meta.url);
const {VectorTile}=deps('@mapbox/vector-tile'),{PbfReader}=deps('pbf'),sharp=require('sharp'),triangulate=deps('earcut').default;
const Paper=require('../public/trek/journey-paper.js'),Landmarks=require('../public/trek/journey-landmarks.js'),Cache=require('../public/trek/journey-cache.js');
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root)));
const dir=new URL('public/trek/prepared/',root);mkdirSync(dir,{recursive:true});
const previous=existsSync(new URL('manifest.json',dir))?read('public/trek/prepared/manifest.json'):null;
const cache=process.env.TREK_PREPARED_CACHE||'/tmp/trek-prepared-source';mkdirSync(cache,{recursive:true});
const center=Paper.project([13.13,47.112]),radius=21000,westNorth=Paper.unproject(center.map(n=>n-radius)),eastSouth=Paper.unproject(center.map(n=>n+radius));
const tileJSON=await (await fetch('https://tiles.openfreemap.org/planet')).json(),vector=tileJSON.tiles[0];
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,12),tiles={},decoded=new Map(),features={landcover:[],building:[],transportation:[],waterway:[]};
const jobs=[];
for(let z=9;z<=14;z++){
 const [x0,y0]=Cache.tileAt(westNorth,z),[x1,y1]=Cache.tileAt(eastSouth,z);
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const type of z<=12?['vector','dem']:['vector'])jobs.push({type,z,x,y});
}
let index=0,done=0;
await Promise.all(Array.from({length:4},async()=>{while(index<jobs.length){
 const {type,z,x,y}=jobs[index++],key=`${type}/${z}/${x}/${y}`,template=type==='vector'?vector:Cache.DEM,url=Cache.urlFor(template,z,x,y),cached=join(cache,hash(url));
 let bytes;
 if(existsSync(cached))bytes=readFileSync(cached);else{let r;for(let attempt=0;attempt<3;attempt++){r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(r.ok)break;}if(!r?.ok)throw Error(url+' '+r?.status);bytes=Buffer.from(await r.arrayBuffer());writeFileSync(cached,bytes);}
 // Keep z14 terrain only around the walk; the distant mountains use z12/13.
 const fineA=Cache.tileAt([13.065,47.18],14),fineB=Cache.tileAt([13.22,47.025],14);
 const include=type==='vector'||z<14||(x>=fineA[0]&&x<=fineB[0]&&y>=fineA[1]&&y<=fineB[1]);
 if(include){
  const encodedCache=cached+'.webp';
  const encoded=type==='dem'?(existsSync(encodedCache)?readFileSync(encodedCache):await sharp(bytes).webp({lossless:true,effort:6}).toBuffer()):bytes;
  if(type==='dem'&&!existsSync(encodedCache))writeFileSync(encodedCache,encoded);
  const name=`${type}-${z}-${x}-${y}-${hash(encoded)}.${type==='vector'?'pbf':'webp'}`;
  writeFileSync(new URL(name,dir),encoded);tiles[key]={file:name,bytes:encoded.length};
 }
 if(type==='vector'&&z===14){const tile=new VectorTile(new PbfReader(bytes));for(const layer of Object.keys(features)){const source=tile.layers[layer];if(source)for(let i=0;i<source.length;i++){const f=source.feature(i).toGeoJSON(x,y,z);features[layer].push(f);}}}
 if(type==='dem'&&z===12){const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});if(info.width!==256||info.channels!==3)throw Error('Invalid DEM');decoded.set(`${z}/${x}/${y}`,data);}
 if(++done%100===0)console.log(`Prepared source tiles ${done}/${jobs.length}`);
}}));
// Deduplicate tile overlap by stable IDs and exact geometry. Keep split polygons;
// the scenery compiler deduplicates their geographic placements itself.
for(const layer of Object.keys(features)){const unique=new Map();for(const f of features[layer]){const key=f.id+':'+JSON.stringify(f.geometry);if(!unique.has(key))unique.set(key,f);}features[layer]=[...unique.values()];}
// Match the fixed z12 terrain surface with bilinear, cross-tile sampling.
const heightAt=p=>{
 const [lng,lat]=Paper.unproject(p),z=12,n=2**z,gx=(lng+180)/360*n*256,gy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n*256,x=Math.floor(gx),y=Math.floor(gy);
 const pixel=(x,y)=>{const data=decoded.get(`${z}/${Math.floor(x/256)}/${Math.floor(y/256)}`);if(!data)return null;const i=((y%256)*256+x%256)*3;return data[i]*256+data[i+1]+data[i+2]/256-32768;};
 const a=pixel(x,y),b=pixel(x+1,y),c=pixel(x,y+1),d=pixel(x+1,y+1);if([a,b,c,d].some(v=>v===null))return null;
 return (a+(b-a)*(gx-x))*(1-(gy-y))+(c+(d-c)*(gx-x))*(gy-y);
};
const route=read('public/trek/route-detail.json'),links=read('public/trek/route-links.json'),landmarks=read('data/trek-landmarks.json').landmarks;
const work=Paper.compileScene({center,radius,features:layer=>features[layer],heightAt,nearRoute:Paper.routeIndex({type:'FeatureCollection',features:[...route.features,...links.features]}),landmarks,landmarkAPI:Landmarks,solidBuildings:true,triangulate});
let next;do{next=work.next();}while(!next.done);const scene=next.value;
// Sort finished triangles into spatial chunks. Runtime selection copies only
// nearby chunks; it never recalculates roofs, terrain heights or tree geometry.
const cells=new Map();
for(let i=0;i<scene.vertices.length;i+=21){const x=(scene.vertices[i]+scene.vertices[i+7]+scene.vertices[i+14])/3,y=(scene.vertices[i+1]+scene.vertices[i+8]+scene.vertices[i+15])/3,key=Math.floor(x/2048)+':'+Math.floor(y/2048);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(...scene.vertices.subarray(i,i+21));}
const ordered=new Float32Array(scene.vertices.length),chunks=[];let offset=0;
for(const [key,values]of cells){const [x,y]=key.split(':').map(Number);ordered.set(values,offset);chunks.push({center:[(x+.5)*2048,(y+.5)*2048],offset,length:values.length});offset+=values.length;}
scene.vertices=ordered;scene.chunks=chunks;
// Typed geometry stays binary; only the small metadata and map overlays use JSON.
const arrays=[],add=data=>{const a=data instanceof Float32Array?data:new Float32Array(data),entry={offset:arrays.reduce((n,a)=>n+a.byteLength,0),length:a.length};arrays.push(a);return entry;};
const metadata={...scene,vertices:add(scene.vertices),births:[],instances:[...scene.instances].map(([k,v])=>[k,add(v)]),treeModels:[...scene.treeModels].map(([k,v])=>[k,{width:v.width,height:v.height,data:add(v.data)}])};
const header=Buffer.from(JSON.stringify(metadata)),padding=(4-header.length%4)%4,head=Buffer.alloc(4);head.writeUInt32LE(header.length);
const binary=Buffer.concat([head,header,Buffer.alloc(padding),...arrays.map(a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength))]),compressed=gzipSync(binary,{level:9}),sceneFile=`gastein-${hash(compressed)}.scene.gz`;
writeFileSync(new URL(sceneFile,dir),compressed);
const manifest={version:1,id:'gastein',name:'Gastein valley',core:[13.03,47.02,13.25,47.20],bounds:[westNorth[0],eastSouth[1],eastSouth[0],westNorth[1]],center:Paper.unproject(center),radius,scene:sceneFile,sceneBytes:compressed.length,decodedBytes:binary.length,tiles,tileBytes:Object.values(tiles).reduce((n,t)=>n+t.bytes,0),inputs:Object.fromEntries(['public/trek/journey-paper.js','public/trek/journey-landmarks.js','data/trek-landmarks.json','public/trek/route-detail.json','public/trek/route-links.json'].map(p=>[p,hash(readFileSync(new URL(p,root)))])),source:{vector,terrain:Cache.DEM,terrainZoom:12,terrainResolutionMetres:26,credits:['© OpenStreetMap contributors / OpenFreeMap','Terrain © Mapzen'],date:new Date().toISOString().slice(0,10)},stats:{trees:scene.trees,roofs:scene.roofs,landmarks:scene.landmarks,vertices:scene.vertices.length/7+scene.treeVertices,features:Object.fromEntries(Object.entries(features).map(([k,v])=>[k,v.length]))}};
writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest)+'\n');console.log(JSON.stringify({...manifest,tiles:Object.keys(tiles).length},null,2));

if(previous){const retained=new Set([manifest.scene,...Object.values(tiles).map(t=>t.file)]);for(const file of [previous.scene,...Object.values(previous.tiles).map(t=>t.file)])if(!retained.has(file))unlinkSync(new URL(file,dir));}
