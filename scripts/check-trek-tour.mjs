import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Route=require('../public/trek/journey-route.js'),Tour=require('../public/trek/journey-tour.js');
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const route=read('public/trek/route-detail.json'),original=JSON.stringify(route);
const path=Route.buildJourneyPath(route,67,read('public/trek/route-links.json'));
const days=read('data/trek-days.json').days;
for(const step of [1/60,1/30,.1,1]){
  const tour=Tour.create(path),jumps=[];let seconds=0;
  while(!tour.status().finished&&seconds<200){const jump=tour.advance(step);if(jump)jumps.push(jump);seconds+=step;}
  assert(tour.status().finished&&seconds>=120&&seconds<165,'the tour has a short, frame-rate-independent viewing budget');
  assert(jumps.at(-1).final&&jumps.at(-1).distance===path.total,'the tour reaches the actual Sofia endpoint');
  assert(jumps.every((jump,i)=>jump.distance>(jumps[i-1]?.distance??0)),'every transition moves forward on the route');
  assert.equal(tour.advance(30),null,'completion cannot schedule another transition');
  const countries=new Set(tour.stages.map(stage=>days.find(day=>day.n===path.dayAt(stage.start).day).country));
  assert.equal(countries.size,7,'all seven countries appear in the short tour');
}
const resumed=Tour.create(path),selected=path.dayDistance(45,.5);resumed.seek(selected);
assert(resumed.boundary()>selected,'resuming highlights after exploring cannot rewind the selected location');
let next;while(!next)next=resumed.advance(1);
assert(next.distance>selected,'the next highlight is ahead of the manually selected day');
resumed.seek(0);assert.equal(resumed.status().stage,1);assert.equal(resumed.status().elapsed,0);
assert.equal(JSON.stringify(route),original,'highlights never edit the recorded route');
console.log('Highlights checks passed: a bounded viewing time, all seven countries, forward transitions, restart and the actual arrival.');
