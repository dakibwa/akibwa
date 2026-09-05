import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildJourneyPath,metres,headingDelta}=require('../public/trek/journey-route.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const original=JSON.stringify(route),path=buildJourneyPath(route);
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
    if(b>a)assert.equal(path.recordedFraction(n,a),path.recordedFraction(n,b),'visual connections must never advance walking metrics');
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
