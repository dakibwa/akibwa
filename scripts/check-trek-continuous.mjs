/* Keep the complete default trip short without skipping any route distance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Route=require('../public/trek/journey-route.js'),Pace=require('../public/trek/journey-pace.js'),Camera=require('../public/trek/journey-camera.js'),Elevation=require('../public/trek/journey-elevation.js');
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const route=read('public/trek/route-detail.json'),original=JSON.stringify(route);
const path=Route.buildJourneyPath(route,67,read('public/trek/route-links.json')),profile=read('public/trek/elevation-profile.json'),landmarks=read('data/trek-landmarks.json').landmarks;
const heightAt=d=>Elevation.sample(profile,d,false),caps=[];
for(let d=0;d<=path.total+180;d+=180)caps.push(Pace.scene(path.sample(d).point,Pace.terrain(heightAt,d),{places:[],shapes:[]},landmarks).cap);
const capAt=d=>caps[Math.min(caps.length-1,Math.round(d/180))];
const durations=[];
for(const step of [1/60,1/30,.1]){
  const dt=step*Pace.playbackRate;
  let distance=0,rendered=0,speed=0,heading=null,velocity=0,seconds=0,scale=1,nextUpdate=0,target=0,height=null,verticalVelocity=0;
  while(distance<path.total&&seconds<900){
    if(seconds>=nextUpdate){
      target=capAt(distance);
      for(const offset of [450,1000,2000,3500,5500,8000])target=Math.min(target,Math.sqrt(capAt(distance+offset)**2+2*1800*offset));
      nextUpdate=seconds+.24;
    }
    scale+=(Camera.scaleForSpeed(target)-scale)*(1-Math.exp(-dt/2));
    speed=Pace.advance(speed,Camera.speedLimit(path,distance,target,heading,scale),dt);
    const previous=distance;distance=Math.min(path.total,distance+speed*dt);
    assert(distance>=previous&&distance-previous<=10000*dt+.001,'every frame advances continuously; dates never trigger a jump');
    rendered+=(distance-rendered)*(1-Math.exp(-dt/.6));
    const turn=Camera.turn(heading,velocity,Camera.headingAt(path,rendered,scale),dt);
    assert(Math.abs(turn.velocity)<=12.001&&Math.abs(turn.velocity-velocity)<=6*dt+.001,'the quicker trip still eases camera turns');
    heading=turn.heading;velocity=turn.velocity;
    const terrain=Camera.terrainFrame(path,rendered,heightAt,scale);
    const rise=Camera.rise(height,verticalVelocity,terrain.height,dt,Math.max(scale,Math.min(8,Math.max(1,((height??terrain.height)-terrain.ground)/850))));
    height=rise.height;verticalVelocity=rise.velocity;
    assert(height-terrain.ground>700,'the continuous camera anticipates the mountains without a ground collision');
    assert(scale>=1&&scale<=8,'the travelling view has a bounded field of view');
    seconds+=step;
  }
  assert.equal(distance,path.total,'the default journey reaches the actual endpoint');
  assert(seconds>330&&seconds<540,'base-route timing leaves room for live settlement detail around a ten-minute trip');
  durations.push(seconds);
}
assert(Math.max(...durations)-Math.min(...durations)<20,'frame rate does not multiply the journey duration');
assert.equal(JSON.stringify(route),original,'camera framing never changes the recorded route');
console.log('Continuous journey checks passed: '+durations.map(n=>(n/60).toFixed(1)).join('/')+' minutes at 60/30/10 fps, forward travel, bounded turns, clear terrain and the true endpoint.');
