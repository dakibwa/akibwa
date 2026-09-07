import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Route=require('../public/trek/journey-route.js'),Boat=require('../public/trek/journey-boat.js');
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const route=read('public/trek/route-detail.json'),links=read('public/trek/route-links.json'),boats=read('data/trek-boat-routes.json');
const source=JSON.stringify([route,links,boats]),path=Route.buildJourneyPath(route,67,links),part=path.pieces.find(p=>p.mode==='boat');
assert.equal(boats.features.length,1);assert.equal(boats.features[0].properties.gap,31);
const water=boats.features[0].geometry.coordinates,drawn=path.connections.features.find(f=>f.properties.mode==='boat').geometry.coordinates;
assert.deepEqual(drawn,water,'the boat follows mapped ferry ways without smoothing across the shore');
assert(boats.snapshot&&boats.features[0].properties.wayIds.length===7&&boats.method.includes('unverified'),'the estimated sailing retains source and uncertainty');
assert(Route.metres(route.features[31].geometry.coordinates.at(-1),water[0])<25,'the prior recording ends beside Velden landing');
assert(Route.metres(path.sample(part.boatStart).point,water[0])<.001);assert(Route.metres(path.sample(part.boatEnd).point,water.at(-1))<.001);
for(const d of [part.start,part.boatStart-1,part.boatEnd+1,part.end]){assert(!Boat.pose(path,d).active);assert.equal(path.sample(d).mode,'walk');}
let count=0;
for(let d=part.boatStart+200;d<part.boatEnd-200;d+=117){
  const pose=Boat.pose(path,d);assert(pose.active&&pose.opacity===1&&pose.cars.length===1);
  assert.equal(path.sample(d).mode,'boat');assert.deepEqual(pose.cars[0].point,path.sample(d).point);
  assert(Math.abs(Math.hypot(...pose.cars[0].forward)-1)<1e-9);assert.deepEqual(Boat.pose(path,d),pose);count++;
}
assert(count>100,'exercise the whole crossing, including intermediate landings');
const pose=Boat.pose(path,(part.boatStart+part.boatEnd)/2),mesh=Boat.mesh(pose.cars,()=>440,[0,0]);
assert(mesh.length>1000&&mesh.length<15000&&[...mesh].every(Number.isFinite),'the detailed boat has finite, bounded geometry');
for(const p of path.pieces.filter(p=>p.mode!=='boat'))assert(!Boat.pose(path,(p.start+p.end)/2).active);
assert.equal(JSON.stringify([route,links,boats]),source,'boat presentation does not edit the source recordings or mapped water route');
console.log(`Boat checks passed: ${count} points across the sourced Wörthersee passage, water-only model, separate shore walks, reversible playback and bounded mesh.`);
