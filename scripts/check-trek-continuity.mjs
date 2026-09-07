import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {buildJourneyPath,metres,headingDelta}=require('../public/trek/journey-route.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const links=JSON.parse(readFileSync(new URL('../public/trek/route-links.json',import.meta.url),'utf8'));
const original=JSON.stringify(route),originalLinks=JSON.stringify(links),path=buildJourneyPath(route,67,links);
assert.equal(links.precision,'estimated');
assert.deepEqual(Object.keys(links).sort(),['features','generated','method','precision','routeHash','source','sourceUrl','type','version']);
assert.equal(links.routeHash,createHash('sha256').update(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url))).digest('hex'));
assert.equal(links.features.length,56);
assert.deepEqual(links.features.filter(f=>f.properties.mode==='train').map(f=>f.properties.gap),[15,38],'only the reported Stuttgart and Croatian transfers remain trains');
for(let i=0;i<links.features.length;i++){
  const f=links.features[i],p=f.properties,coordinates=f.geometry.coordinates;
  assert.deepEqual(Object.keys(f).sort(),['geometry','properties','type']);
  assert.deepEqual(Object.keys(f.geometry).sort(),['coordinates','type']);
  assert.deepEqual(Object.keys(p).sort(),['day','estimated','fromDay','gap','method','mode']);
  assert.equal(p.gap,i);assert.equal(p.estimated,true);assert(['walk','train'].includes(p.mode));
  assert.equal(p.fromDay,route.features[i].properties.throughDay);assert.equal(p.day,route.features[i+1].properties.day);
  assert.equal(f.geometry.type,'LineString');assert(coordinates.length>=2);
  assert.deepEqual(coordinates[0],route.features[i].geometry.coordinates.at(-1));
  assert.deepEqual(coordinates.at(-1),route.features[i+1].geometry.coordinates[0]);
  assert(coordinates.every(p=>p.length===2&&p.every(Number.isFinite)&&p[0]>=2&&p[0]<=24&&p[1]>=42&&p[1]<=50),'estimates contain only public corridor coordinates, without private activity channels');
  if(p.mode==='walk'&&metres(coordinates[0],coordinates.at(-1))>400)assert(coordinates.length>5,'long walking gaps must follow mapped paths rather than a straight connection');
}
assert.equal(JSON.stringify(links),originalLinks,'display rounding never edits the sourced estimates');
assert.equal(JSON.stringify(route),original,'the visual route must never mutate the approved recordings');
assert.equal(path.connections.features.length,56);
assert.equal(path.recorded.features.length,57);
assert(path.connections.features.every(f=>f.properties.kind==='connection'));
assert(path.recorded.features.every(f=>f.properties.kind==='recorded'));
for(let i=1;i<path.pieces.length;i++){
  const a=path.pieces[i-1],b=path.pieces[i];
  assert.deepEqual(a.points.at(-1),b.points[0],'each recording and connection must meet exactly');
  assert.equal(a.end,b.start);
  assert(metres(path.sample(a.end-.01).point,path.sample(a.end+.01).point)<.03,'traversing a join must not teleport');
}
for(let n=1;n<67;n++){
  assert(path.boundaries[n]>=path.boundaries[n-1],'day order must remain monotonic');
  assert.equal(path.dayDistance(n,1),path.dayDistance(n+1,0),'day boundaries must be continuous');
}
for(let n=1;n<=67;n++){
  const start=path.dayDistance(n,0),end=path.dayDistance(n,1);
  const recorded=path.pieces.filter(p=>p.kind==='recorded').reduce((sum,p)=>sum+Math.max(0,Math.min(end,p.end)-Math.max(start,p.start)),0);
  if(recorded>0){assert.equal(path.recordedFraction(n,start),0);assert.equal(path.recordedFraction(n,end),1);}
  for(const p of path.pieces.filter(p=>p.kind==='connection')){
    const a=Math.max(start,p.start),b=Math.min(end,p.end);
    if(b>a)assert.equal(path.recordedFraction(n,a),path.recordedFraction(n,b),'walking estimates must not be counted in original recorded metrics');
  }
}
assert.equal(path.dayDistance(1,0),0);assert.equal(path.dayDistance(67,1),path.total);
assert.equal(headingDelta(179,-179),2,'crossing north must not turn the camera through a full circle');
assert.equal(headingDelta(725,10),5,'accumulated turns must still choose the shortest direction');
assert.equal(headingDelta(-725,-10),-5);
assert.equal(path.sample(path.total).kind,'recorded');
assert.deepEqual(path.sample(0).point,route.features[0].geometry.coordinates[0]);
assert.deepEqual(path.sample(path.total).point,route.features.at(-1).geometry.coordinates.at(-1));
const largest=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
assert(largest.end-largest.start>90000,'exercise the substantial Croatia gap');
assert.equal(path.sample((largest.start+largest.end)/2).kind,'connection','the unrecorded crossing must remain identified');
for(let i=0;i<route.features.length;i++){
  const originalPoints=route.features[i].geometry.coordinates,shown=path.recorded.features[i].geometry.coordinates;
  assert.deepEqual(shown[0],originalPoints[0]);assert.deepEqual(shown.at(-1),originalPoints.at(-1));
  for(const p of shown)assert(originalPoints.some(q=>metres(p,q)<=18.01),'rounding must stay within 18 m of an original vertex');
}
console.log('Continuous route checks passed: all 56 joins, all 67 day boundaries, the 94 km gap, bounded corner rounding and unchanged source coordinates.');
