import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Elevation=require('../public/trek/journey-elevation.js'),Cache=require('../public/trek/journey-cache.js');
const routeBytes=readFileSync(new URL('../public/trek/route-detail.json',import.meta.url));
const path=require('../public/trek/journey-route.js').buildJourneyPath(JSON.parse(routeBytes));
const profile=JSON.parse(readFileSync(new URL('../public/trek/elevation-profile.json',import.meta.url)));
assert.equal(profile.routeHash,createHash('sha256').update(routeBytes).digest('hex'));
assert(Math.abs(profile.total-path.total)<1);assert.equal(profile.pieces.length,path.pieces.length);
let count=0;
for(let i=0;i<profile.pieces.length;i++){
 const p=profile.pieces[i],original=path.pieces[i];
 assert.equal(p.kind,original.kind);assert(Math.abs(p.start-original.start)<1);assert(Math.abs(p.end-original.end)<1);
 if(p.kind==='connection'){assert.equal(p.samples.length,0);if(p.end-p.start>2)assert.equal(Elevation.sample(profile,(p.start+p.end)/2),null);continue;}
 assert(p.samples.length>=2);assert.equal(p.samples[0][0],p.start);assert.equal(p.samples.at(-1)[0],p.end);
 for(let j=0;j<p.samples.length;j++){
  const [distance,height]=p.samples[j];count++;assert.equal(p.samples[j].length,2);assert(Number.isInteger(height)&&height>=-100&&height<=4000);
  if(j){assert(distance>p.samples[j-1][0]);assert(distance-p.samples[j-1][0]<=201);}
 }
}
assert.equal(count,9820);assert(profile.max>2300&&profile.max<2700,'the full profile includes the Alpine pass');
assert.equal(Elevation.sample(profile,profile.total),profile.pieces.at(-1).samples.at(-1)[1]);
const entries=new Map();
const fakeCache={match:async key=>entries.get(String(key))?.clone(),put:async(key,response)=>entries.set(String(key),response.clone()),keys:async()=>[...entries.keys()],delete:async key=>entries.delete(String(key))};
const storage={open:async()=>fakeCache};let calls=0,clock=1000;
const fetcher=async()=>{calls++;return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'application/octet-stream'}});};
const tile='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/11/1098/719.png';
let cache=Cache.create({storage,fetcher,now:()=>clock});
await Promise.all([cache.read(tile),cache.read(tile),cache.read(tile)]);assert.equal(calls,1,'foreground, hillshade and prefetch share one download');await cache.flush();
cache=Cache.create({storage,fetcher,now:()=>clock});assert.deepEqual([...new Uint8Array(await cache.read(tile))],[1,2,3]);assert.equal(calls,1,'a new page reads the persistent tile');assert.equal(cache.status().hits,1);
clock+=8*86400000;cache=Cache.create({storage,fetcher,now:()=>clock});await cache.read(tile);await cache.flush();assert.equal(calls,2,'expired tiles refresh');
cache=Cache.create({storage:{open:async()=>{throw Error('Storage denied');}},fetcher});await cache.read(tile);assert.equal(cache.status().persistent,false,'private-mode storage failures retain normal map loading');
await assert.rejects(cache.read('https://example.com/private'),/Not a Trek map tile/);
let protocol;cache.install({addProtocol:(name,fn)=>{assert.equal(name,'trek-cache');protocol=fn;}});
const abort=new AbortController();abort.abort();await assert.rejects(protocol({url:'trek-cache://'+tile},abort),{name:'AbortError'});
const a=await protocol({url:'trek-cache://'+tile},new AbortController());new Uint8Array(a.data)[0]=99;
const b=await protocol({url:'trek-cache://'+tile},new AbortController());assert.equal(new Uint8Array(b.data)[0],1,'worker transfer and callers cannot damage the cached bytes');
const vector='https://tiles.openfreemap.org/planet/20260830_080001_pt/{z}/{x}/{y}.pbf';
const urls=Cache.corridor(path,path.dayDistance(30,.5),path.dayDistance(30,.5)+6500,vector,13,1200);
assert(urls.length>20&&urls.length<250);assert(urls.every(Cache.allowed));assert.equal(new Set(urls).size,urls.length);
assert.equal(cache.transformRequest(tile,'Tile').url,'trek-cache://'+tile);assert.equal(cache.transformRequest(tile,'Image').url,tile,'the custom protocol is confined to map tiles');
let active=0,peak=0;
cache=Cache.create({storage:{open:async()=>{throw Error();}},fetcher:async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,2));active--;return new Response('ok');}});
await cache.warm(urls.slice(0,16));assert.equal(peak,3,'look-ahead work has bounded network concurrency');assert.equal(cache.status().pending,0);
console.log('Elevation and cache checks passed: full mapped profile, unmeasured gaps, persistent hits, refresh, cancellation, storage fallback, isolated bytes and bounded prefetch.');
