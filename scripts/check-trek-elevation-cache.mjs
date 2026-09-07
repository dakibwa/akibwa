import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Elevation=require('../public/trek/journey-elevation.js'),Cache=require('../public/trek/journey-cache.js');
const routeBytes=readFileSync(new URL('../public/trek/route-detail.json',import.meta.url));
const linksBytes=readFileSync(new URL('../public/trek/route-links.json',import.meta.url));
const path=require('../public/trek/journey-route.js').buildJourneyPath(JSON.parse(routeBytes),67,JSON.parse(linksBytes));
const profile=JSON.parse(readFileSync(new URL('../public/trek/elevation-profile.json',import.meta.url)));
assert.equal(profile.linksHash,createHash('sha256').update(linksBytes).digest('hex'));
assert.equal(profile.routeHash,createHash('sha256').update(routeBytes).digest('hex'));
assert(Math.abs(profile.total-path.total)<1);assert.equal(profile.pieces.length,path.pieces.length);
let count=0;
for(let i=0;i<profile.pieces.length;i++){
 const p=profile.pieces[i],original=path.pieces[i];
 assert.equal(p.kind,original.kind);assert(Math.abs(p.start-original.start)<1);assert(Math.abs(p.end-original.end)<1);
 assert(p.samples.length>=2);assert.equal(p.samples[0][0],p.start);assert.equal(p.samples.at(-1)[0],p.end);
 for(let j=0;j<p.samples.length;j++){
  const [distance,height]=p.samples[j];count++;assert.equal(p.samples[j].length,2);assert(Number.isInteger(height)&&height>=-100&&height<=4000);
  if(j){assert(distance>=p.samples[j-1][0]);assert(distance-p.samples[j-1][0]<=201);}
 }
}
assert.equal(count,path.pieces.reduce((n,p)=>n+Math.max(1,Math.ceil((p.end-p.start)/profile.step))+1,0),'each piece has a bounded terrain sampling interval');assert(profile.pieces.every(p=>Number.isFinite(Elevation.sample(profile,(p.start+p.end)/2))),'every recorded section and visual link has mapped terrain');assert(profile.max>2300&&profile.max<2700,'the full profile includes the Alpine pass');
assert.equal(Elevation.sample(profile,profile.total),profile.pieces.at(-1).samples.at(-1)[1]);
const originalProfile=JSON.stringify(profile),originalRoute=JSON.stringify(path.boundaries);
for(let d=0;d<path.total;d+=537)assert(Math.abs(Elevation.distanceAt(path,Elevation.progressAt(path,d))-d)<.00001,'day-scaled scrubbing must round-trip to the same route position');
for(let day=1;day<67;day++)for(const t of [.1,.5,.9])assert(Math.abs(Elevation.progressAt(path,path.dayDistance(day,t))-(day-1+t)/67)<.000001,'every numbered day shares the same width on the timeline');
assert.equal(Elevation.progressAt(path,path.total),1);assert.equal(Elevation.distanceAt(path,1),path.total);assert.equal(Elevation.distanceAt(path,.999),path.total,'the final arrival segment adds no invented distance');
const days=JSON.parse(readFileSync(new URL('../data/trek-days.json',import.meta.url))).days.map(d=>({n:d.n,c:d.country}));
const segments=Elevation.dayProfiles(profile,path,days);
assert.equal(segments.length,67);assert.equal(segments.at(-1).parts[0].kind,'finish');
assert.deepEqual(segments.map(s=>s.country),days.map(d=>d.c));
assert.equal(Math.max(...segments.flatMap(s=>s.parts.flatMap(p=>p.points.map(([,h])=>h)))),profile.max,'segmenting the days must retain the true Alpine peak');
for(const segment of segments){
  assert(segment.parts.length>0);assert(segment.parts.every(p=>p.points.length>=2&&p.points.every(([x,h])=>x>=0&&x<=1&&Number.isFinite(h))));
  const middle=path.dayDistance(segment.day,.5);
  if(path.sample(middle).kind==='connection')assert(segment.parts.some(p=>p.kind==='connection'),'missing recordings retain their mapped-connection provenance');
}
assert.equal(JSON.stringify(profile),originalProfile);assert.equal(JSON.stringify(path.boundaries),originalRoute);
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
// Fractional camera zoom must prepare the next vector level, nearest tile first.
const from=path.dayDistance(30,.5),point=path.sample(from).point,[tileX,tileY]=Cache.tileAt(point,14);
assert.equal(Cache.corridor(path,from,from+6500,vector,13.3)[0],Cache.urlFor(vector,14,tileX,tileY));
// Raster sources round their 256px tile zoom independently of vector tiles.
for(const [cameraZoom,demZoom] of [[12.3,13],[12.7,14],[13.3,14]]){
 const [x,y]=Cache.tileAt(point,demZoom),tiles=Cache.corridor(path,from,from+1000,vector,cameraZoom);
 assert(tiles.includes(Cache.urlFor(Cache.DEM,demZoom,x,y)),'fractional camera zoom '+cameraZoom+' must warm the rendered DEM level '+demZoom);
}
assert(Cache.corridor(path,0,path.total,vector,14).length<=192,'even a whole-route input cannot create an unbounded speculative plan');
assert(Cache.corridor(path,path.total,path.total,vector,13).length>0,'arrival still prepares its local tiles');
assert.equal(Cache.lookAhead(0),12000);assert.equal(Cache.lookAhead(800),17600);assert.equal(Cache.lookAhead(12800),40000);
let planClock=0;const planned=[];
cache=Cache.create({storage:null,now:()=>planClock,fetcher:async url=>{planned.push(url);return new Response('tile');}});
cache.ahead(path,from,vector,12.3);
while(cache.status().pending)await new Promise(resolve=>setTimeout(resolve,0));
assert(!planned.some(url=>url.includes('/terrarium/14/')));
planned.length=0;planClock=1000;cache.ahead(path,from,vector,12.7);
while(cache.status().pending)await new Promise(resolve=>setTimeout(resolve,0));
assert(planned.some(url=>url.includes('/terrarium/14/')),'a fractional raster-level change refreshes look-ahead without movement or a vector-level change');
let warmed=0;
cache=Cache.create({storage:null,fetcher:async()=>{warmed++;return new Response('ok');}});
await cache.warm(Array.from({length:300},(_,i)=>Cache.urlFor(Cache.DEM,14,8000+i,5000)));
assert.equal(warmed,192,'the request queue enforces its bound independently of corridor callers');assert(cache.status().memory<=32);

// A seek stops obsolete downloads immediately, retains overlap, and never aborts
// a tile the visible map still owns. Manually settled fetches make this a race test.
const waiting=new Map(),started=[],cancelled=[];
cache=Cache.create({storage:null,fetcher:(url,{signal})=>new Promise((resolve,reject)=>{
 started.push(url);waiting.set(url,()=>{waiting.delete(url);resolve(new Response('tile'));});
 signal.addEventListener('abort',()=>{cancelled.push(url);waiting.delete(url);reject(new DOMException('Aborted','AbortError'));},{once:true});
})});
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
const [keep,oldA,oldB,oldQueued,nextA,nextB,nextC]=urls;
const prior=cache.warm([keep,oldA,oldB,oldQueued]);await settle();
assert.equal(started.length,3);
const foreground=cache.read(keep);
const replacement=cache.warm([keep,nextA,nextB,nextC]);await settle();
assert(cancelled.includes(oldA)&&cancelled.includes(oldB),'superseded speculative-only requests abort');
assert(!cancelled.includes(keep),'overlapping and visible-map consumers keep their fetch');
assert(!started.includes(oldQueued),'a superseded queued tile never downloads');
assert.equal(started.filter(url=>url===keep).length,1,'a refreshed plan shares its active tile');
waiting.get(keep)();await settle();
for(const finish of [...waiting.values()])finish();
assert.equal((await prior).cancelled,true);assert.equal((await replacement).failed,0);await foreground;
assert.equal(cache.status().errors,0,'normal seek cancellations are not reported as network errors');
assert.equal(cache.status().aborted,2);

let visibleAbort=false,releaseVisible;
cache=Cache.create({storage:null,fetcher:(_, {signal})=>new Promise((resolve,reject)=>{
 releaseVisible=()=>resolve(new Response('visible'));
 signal.addEventListener('abort',()=>{visibleAbort=true;reject(new DOMException('Aborted','AbortError'));},{once:true});
})});
const speculative=cache.warm([tile]);await settle();
const visible=cache.read(tile);cache.cancel();await speculative;
assert.equal(visibleAbort,false,'cancelling look-ahead preserves a foreground consumer');releaseVisible();await visible;
let fetchSignal;
cache=Cache.create({storage:null,fetcher:(_, {signal})=>new Promise((_,reject)=>{
 fetchSignal=signal;signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
})});
cache.install({addProtocol:(_,fn)=>{protocol=fn;}});
const controller=new AbortController(),abandoned=protocol({url:'trek-cache://'+tile},controller);await settle();controller.abort();
await assert.rejects(abandoned,{name:'AbortError'});assert(fetchSignal.aborted,'leaving the last foreground tile aborts its network request');
console.log('Elevation and cache checks passed: reversible day timeline, all 67 segments, Alpine peak, persistent refresh/fallback, isolated bytes, nearest-first zoom coverage, speed-aware bounded prefetch, overlap reuse and foreground-safe seek cancellation.');
