/* Regressions for the abrupt turns and camera zigzags seen in the Alps. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildJourneyPath,metres,headingDelta}=require('../public/trek/journey-route.js');
const camera=require('../public/trek/journey-camera.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const original=JSON.stringify(route),path=buildJourneyPath(route);
const paces=[300,1600,3200];

for(let d=0;d<=path.total;d+=250){
  const p=camera.pointAt(path,d),next=camera.pointAt(path,d+1),heading=camera.headingAt(path,d);
  assert(p.every(Number.isFinite)&&Number.isFinite(heading));
  assert(metres(p,path.sample(d).point)<=165.2,'the smoothed camera must stay near the recorded or connecting path');
  assert(metres(p,next)<1.01,'a GPS corner must not teleport the camera');
  for(const pace of paces){
    const speed=camera.speedLimit(path,d,pace,heading);
    assert(speed>=35&&speed<=pace,'corners may slow travel but must not reverse, stall or accelerate it');
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
      const dt=[1/60,1/30,.1][step++%3];
      speed+=(camera.speedLimit(path,distance,pace,heading)-speed)*(1-Math.exp(-dt/.85));
      distance=Math.min(end,distance+speed*dt);
      renderedDistance+=(distance-renderedDistance)*(1-Math.exp(-dt/.6));
      const wanted=camera.headingAt(path,renderedDistance),next=camera.turn(heading,velocity,wanted,dt);
      const turn=Math.abs(headingDelta(heading,next.heading))/dt;
      assert(turn<=14.001,'the view must not whip around at a tight turn');
      assert(Math.abs(next.velocity-velocity)<=9*dt+.0001,'turning must ease in and out');
      largestTurn=Math.max(largestTurn,turn);worstLag=Math.max(worstLag,Math.abs(headingDelta(next.heading,wanted)));
      heading=next.heading;velocity=next.velocity;elapsed+=dt;
    }
    assert(distance===end,'even a tight bend must remain traversable at every pace');
  }
}
assert(worstLag<22,'the view must keep up with the path through the tested switchbacks');
const north=camera.turn(179,0,-179,1/30);
assert(north.heading>179&&north.heading<180,'crossing north must choose the short turn');
const landmarks=JSON.parse(readFileSync(new URL('../data/trek-landmarks.json',import.meta.url),'utf8')).landmarks;
for(const [id,d] of [['reims',136600],['nancy',365700]]){
  const p=camera.pointAt(path,d),heading=camera.headingAt(path,d),frame=camera.landmarkFrame(landmarks,p,heading);
  assert.equal(frame.id,id);assert(frame.strength>.9&&frame.lift<=360,'the cathedral approach gains room for its enlarged silhouette');
  assert(Math.abs(headingDelta(heading,frame.heading))<=35.701,'a landmark glance remains a bounded turn from the direction of travel');
  assert.equal(camera.landmarkFrame(landmarks,p,heading+180),null,'the view must not turn back to chase a landmark behind the traveller');
  let look=null,velocity=0,routeHeading=heading,routeVelocity=0,distance=d-1000,speed=0;
  for(let i=0;i<1800;i++){
    const dt=1/30,wanted=camera.headingAt(path,distance),framing=camera.landmarkFrame(landmarks,camera.pointAt(path,distance),wanted);
    const routeTurn=camera.turn(routeHeading,routeVelocity,wanted,dt);routeHeading=routeTurn.heading;routeVelocity=routeTurn.velocity;
    const viewTurn=camera.turn(look,velocity,framing?.heading??wanted,dt);
    if(look!==null)assert(Math.abs(headingDelta(look,viewTurn.heading))/dt<=14.001,'continuous landmark framing never snaps the camera');
    look=viewTurn.heading;velocity=viewTurn.velocity;
    speed+=(camera.speedLimit(path,distance,1600,routeHeading)-speed)*(1-Math.exp(-dt/.85));distance+=speed*dt;
  }
  assert(distance>d+2000,'glancing at a landmark must not stall route playback');
}
assert.equal(JSON.stringify(route),original,'camera smoothing must never rewrite the approved GPS route');
console.log(`Camera checks passed: whole-route continuity and proximity, four difficult stretches at all three paces, bounded cathedral glances, maximum route turn ${largestTurn.toFixed(1)}°/s and heading lag ${worstLag.toFixed(1)}°.`);
