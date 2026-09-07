/* Regressions for the abrupt turns and camera zigzags seen in the Alps. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildJourneyPath,metres,headingDelta}=require('../public/trek/journey-route.js');
const camera=require('../public/trek/journey-camera.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const original=JSON.stringify(route),path=buildJourneyPath(route);
const profile=JSON.parse(readFileSync(new URL('../public/trek/elevation-profile.json',import.meta.url),'utf8'));
const originalProfile=JSON.stringify(profile),{sample}=require('../public/trek/journey-elevation.js');
const heightAt=distance=>sample(profile,distance,false);
const paces=[400,1600,3200];

for(let d=0;d<=path.total;d+=250){
  const p=camera.pointAt(path,d),next=camera.pointAt(path,d+1),heading=camera.headingAt(path,d);
  assert(p.every(Number.isFinite)&&Number.isFinite(heading));
  assert(metres(p,path.sample(d).point)<=165.2,'the smoothed camera must stay near the recorded or connecting path');
  assert(metres(p,next)<1.01,'a GPS corner must not teleport the camera');
  const framing=camera.terrainFrame(path,d,heightAt);
  assert(Number.isFinite(framing.height)&&framing.height>=framing.ground+849.99&&framing.lift>=0&&framing.lift<=480,'terrain framing keeps a broad view and adds bounded room around bends');
  for(const pace of paces){
    const speed=camera.speedLimit(path,d,pace,heading);
    assert(speed>=35&&speed<=pace,'corners may slow travel but must not reverse, stall or accelerate it');
  }
}
for(const boundary of path.boundaries){
  assert(metres(camera.pointAt(path,boundary-.01),camera.pointAt(path,boundary+.01))<.021,'day changes must not reset the camera rail');
}

let worstLag=0,largestTurn=0;
const stretches=[[16,.4,.65],[17,.94,.999],[30,.23,.34],[30,.45,.99],[31,0,1],[41,.45,.69],[53,0,.1]].map(([day,start,finish])=>[path.dayDistance(day,start),path.dayDistance(day,finish)]);
stretches.push([path.total-2000,path.total]);
for(const [start,end] of stretches){
  assert(end>start,'every difficult stretch must exercise a moving camera');
  for(const pace of paces){
    let distance=start,renderedDistance=start,heading=camera.headingAt(path,start),velocity=0,speed=0,elapsed=0,step=0,variation=0,reversals=0,turnSign=0;
    while(distance<end&&elapsed<1800){
      const dt=[1/60,1/30,.1][step++%3];
      speed+=(camera.speedLimit(path,distance,pace,heading)-speed)*(1-Math.exp(-dt/.85));
      distance=Math.min(end,distance+speed*dt);
      renderedDistance+=(distance-renderedDistance)*(1-Math.exp(-dt/.6));
      const wanted=camera.headingAt(path,renderedDistance),next=camera.turn(heading,velocity,wanted,dt);
      const turn=Math.abs(headingDelta(heading,next.heading))/dt;
      assert(turn<=12.001,'the view must not whip around at a tight turn');
      assert(Math.abs(next.velocity-velocity)<=6*dt+.0001,'turning must ease in and out');
      variation+=Math.abs(headingDelta(heading,next.heading));
      if(Math.abs(next.velocity)>1){
        if(turnSign&&Math.sign(next.velocity)!==turnSign)reversals++;
        turnSign=Math.sign(next.velocity);
      }
      largestTurn=Math.max(largestTurn,turn);worstLag=Math.max(worstLag,Math.abs(headingDelta(next.heading,wanted)));
      heading=next.heading;velocity=next.velocity;elapsed+=dt;
    }
    assert(distance===end,'even a tight bend must remain traversable at every pace');
    if(pace===1600&&start===path.dayDistance(30,.23))assert(variation<50&&reversals<=1,'the camera looks along the valley instead of following each town zigzag');
    if(pace===1600&&start===path.dayDistance(30,.45))assert(variation<230&&reversals<=8,'the Alpine descent must avoid repeated left-right corrections');
    if(start===path.dayDistance(31,0))assert(variation<310,'the day-31 loop must not make the camera circle with the local path');
  }
}
let largestRise=0,smallestClearance=Infinity;
for(const pace of paces){
  // Traverse the mountain descent, the reported faults and the next day without
  // resetting height. A fresh camera at each waypoint would conceal a lurch.
  let distance=path.dayDistance(30,0),renderedDistance=distance,heading=camera.headingAt(path,distance),velocity=0,speed=0,height=null,verticalVelocity=0,elapsed=0,step=0;
  const end=path.dayDistance(32,.1);
  while(distance<end&&elapsed<1000){
    const dt=[1/60,1/30,.1][step++%3];
    speed+=(camera.speedLimit(path,distance,pace,heading)-speed)*(1-Math.exp(-dt/.85));
    distance=Math.min(end,distance+speed*dt);renderedDistance+=(distance-renderedDistance)*(1-Math.exp(-dt/.6));
    const turn=camera.turn(heading,velocity,camera.headingAt(path,renderedDistance),dt);heading=turn.heading;velocity=turn.velocity;
    const framing=camera.terrainFrame(path,renderedDistance,heightAt),vertical=camera.rise(height,verticalVelocity,framing.height,dt);
    if(height!==null){
      const rise=(vertical.height-height)/dt;largestRise=Math.max(largestRise,Math.abs(rise));
      assert(rise>=-110.001&&rise<=180.001,'height changes remain bounded during a continuous mountain crossing');
      assert(Math.abs(vertical.velocity-verticalVelocity)<=65*dt+.0001,'the climb and descent ease their acceleration');
    }
    height=vertical.height;verticalVelocity=vertical.velocity;elapsed+=dt;
    smallestClearance=Math.min(smallestClearance,height-framing.ground);
    assert(height-framing.ground>750,'anticipation clears the ridge without needing an emergency height clamp');
  }
  assert.equal(distance,end,'every pace can cross both Alpine days continuously');
}
for(const d of [1130563,1145308,1166593]){
  const a=camera.terrainFrame(path,d,heightAt),b=camera.terrainFrame(path,d+6,heightAt);
  assert(Math.abs(a.ground-b.ground)<6&&Math.abs(a.height-b.height)<12,'the known day-31 DEM seams cannot change the camera reference or planned height abruptly');
}
assert(camera.terrainFrame(path,path.dayDistance(31,.75),heightAt).lift>350,'the tight day-31 loop is approached with additional height');
assert(worstLag<22,'the view must keep up with the path through the tested switchbacks');
const north=camera.turn(179,0,-179,1/30);
assert(north.heading>179&&north.heading<180,'crossing north must choose the short turn');
for(const wanted of [-90,-12,12,90]){
  let heading=0,velocity=0;
  for(let i=0;i<1800;i++){
    const next=camera.turn(heading,velocity,wanted,1/60);
    assert(Math.sign(wanted)*next.heading<=Math.abs(wanted)+.02,'a settled direction must not cause a correcting swing back');
    heading=next.heading;velocity=next.velocity;
  }
  assert(Math.abs(headingDelta(heading,wanted))<.02,'damping must still settle on the intended heading');
}
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
    if(look!==null)assert(Math.abs(headingDelta(look,viewTurn.heading))/dt<=12.001,'continuous landmark framing never snaps the camera');
    look=viewTurn.heading;velocity=viewTurn.velocity;
    speed+=(camera.speedLimit(path,distance,1600,routeHeading)-speed)*(1-Math.exp(-dt/.85));distance+=speed*dt;
  }
  assert(distance>d+2000,'glancing at a landmark must not stall route playback');
}
assert.equal(JSON.stringify(route),original,'camera smoothing must never rewrite the approved GPS route');
assert.equal(JSON.stringify(profile),originalProfile,'camera framing must never alter the mapped elevation profile');
console.log(`Camera checks passed: whole-route continuity and proximity, eight difficult stretches at all three paces, day-31 tile seams, continuous Alpine height control (${smallestClearance.toFixed(0)} m minimum clearance, ${largestRise.toFixed(0)} m/s maximum rise), bounded cathedral glances, maximum route turn ${largestTurn.toFixed(1)}°/s and heading lag ${worstLag.toFixed(1)}°.`);
