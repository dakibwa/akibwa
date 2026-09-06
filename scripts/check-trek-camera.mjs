/* Regressions for the abrupt turns and camera zigzags seen in the Alps. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildJourneyPath,metres,headingDelta}=require('../public/trek/journey-route.js');
const camera=require('../public/trek/journey-camera.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const original=JSON.stringify(route),path=buildJourneyPath(route);
const paces=[180,675,1400];

for(let d=0;d<=path.total;d+=250){
  const p=camera.pointAt(path,d),next=camera.pointAt(path,d+1),heading=camera.headingAt(path,d);
  assert(p.every(Number.isFinite)&&Number.isFinite(heading));
  assert(metres(p,path.sample(d).point)<=165.2,'the smoothed camera must stay near the recorded or connecting path');
  assert(metres(p,next)<1.01,'a GPS corner must not teleport the camera');
  for(const pace of paces){
    const speed=camera.speedLimit(path,d,pace,heading);
    assert(speed>=20&&speed<=pace,'corners may slow travel but must not reverse, stall or accelerate it');
  }
}
for(const boundary of path.boundaries){
  assert(metres(camera.pointAt(path,boundary-.01),camera.pointAt(path,boundary+.01))<.021,'day changes must not reset the camera rail');
}

let worstLag=0,largestTurn=0;
const stretches=[[16,.45,.65],[30,.45,.99],[41,.45,.65]].map(([day,start,finish])=>[path.dayDistance(day,start),path.dayDistance(day,finish)]);
stretches.push([path.total-2000,path.total]);
for(const [start,end] of stretches){
  assert(end>start,'every difficult stretch must exercise a moving camera');
  for(const pace of paces){
    let distance=start,renderedDistance=start,heading=camera.headingAt(path,start),velocity=0,speed=0,elapsed=0,step=0;
    while(distance<end&&elapsed<1800){
      const dt=[1/60,1/30,.05][step++%3];
      speed+=(camera.speedLimit(path,distance,pace,heading)-speed)*(1-Math.exp(-dt/1.2));
      distance=Math.min(end,distance+speed*dt);
      renderedDistance+=(distance-renderedDistance)*(1-Math.exp(-dt/.6));
      const wanted=camera.headingAt(path,renderedDistance),next=camera.turn(heading,velocity,wanted,dt);
      const turn=Math.abs(headingDelta(heading,next.heading))/dt;
      assert(turn<=9.001,'the view must not whip around at a tight turn');
      assert(Math.abs(next.velocity-velocity)<=6*dt+.0001,'turning must ease in and out');
      largestTurn=Math.max(largestTurn,turn);worstLag=Math.max(worstLag,Math.abs(headingDelta(next.heading,wanted)));
      heading=next.heading;velocity=next.velocity;elapsed+=dt;
    }
    assert(distance===end,'even a tight bend must remain traversable at every pace');
  }
}
assert(worstLag<22,'the view must keep up with the path through the tested switchbacks');
const north=camera.turn(179,0,-179,1/30);
assert(north.heading>179&&north.heading<180,'crossing north must choose the short turn');
assert.equal(JSON.stringify(route),original,'camera smoothing must never rewrite the approved GPS route');
console.log(`Camera checks passed: whole-route continuity and proximity, four difficult stretches at all three paces, maximum turn ${largestTurn.toFixed(1)}°/s and heading lag ${worstLag.toFixed(1)}°.`);
