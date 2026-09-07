import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{buildJourneyPath,metres}=require('../public/trek/journey-route.js'),Train=require('../public/trek/journey-train.js');
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const links=read('public/trek/route-links.json'),rails=read('data/trek-rail-routes.json'),path=buildJourneyPath(read('public/trek/route-detail.json'),67,links);
assert.equal(rails.features.length,2);
for(const rail of rails.features){
  const link=links.features.find(f=>f.properties.gap===rail.properties.gap),part=path.pieces.filter(p=>p.kind==='connection')[rail.properties.gap];
  assert.deepEqual(part.points,link.geometry.coordinates,'rail tracks are not rounded away from mapped geometry');
  assert.deepEqual(part.points.slice(link.properties.railFrom,link.properties.railTo+1),rail.geometry.coordinates,'the traveller uses the sourced track points');
  assert(rail.properties.wayIds.length>15&&rail.properties.snapshot&&rail.properties.via.length>=4,'each track alignment retains its network provenance');
  assert(!Train.pose(path,part.start).active&&!Train.pose(path,part.end).active,'the train never drives along station access joins');
  let shown=0,tunnels=0;
  for(let d=part.railStart+200;d<part.railEnd-200;d+=163){
    const pose=Train.pose(path,d);assert(pose.active);
    for(const car of pose.cars){
      assert(metres(car.point,path.sample(car.distance).point)<.001,'every coach follows the real rail alignment');
      if(car.structure?.type==='tunnel')tunnels++;
      assert(Math.abs(Math.hypot(...car.forward)-1)<.00001);shown++;
    }
    assert.equal(pose.cars.length,3,'all three coaches remain visible through the entire rail journey, including tunnels');
    assert.deepEqual(Train.pose(path,d),pose,'a paused or reversed clock gives the same train position');
  }
  assert(shown>300);if(part.structures.some(s=>s.type==='tunnel'))assert(tunnels>0);
  const poses=Train.pose(path,part.railStart+1000).cars;
  const mesh=Train.mesh(poses,()=>150,[0,0]);assert(mesh.length>500&&mesh.length<30000&&[...mesh].every(Number.isFinite),'the paper train has finite, bounded geometry');
}
for(const p of path.pieces.filter(p=>p.mode!=='train'))assert(!Train.pose(path,(p.start+p.end)/2).active,'walking never shows a train');
console.log('Train checks passed: sourced railway coordinates, separate station access, curved coach positions, continuous tunnel passage, reversible playback and bounded mesh.');
