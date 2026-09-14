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
  const dt=step,travelDt=step*Pace.playbackRate;
  let distance=0,rendered=0,speed=0,heading=null,velocity=0,seconds=0,nextUpdate=0,target=0,view=null;
  const scale=Camera.scaleForPace(0);
  while(distance<path.total&&seconds<1500){
    if(seconds>=nextUpdate){
      target=capAt(distance);
      for(const offset of [450,1000,2000,3500,5500,8000])target=Math.min(target,Math.sqrt(capAt(distance+offset)**2+2*1800*offset));
      nextUpdate=seconds+.24;
    }
    speed=Pace.advance(speed,Camera.speedLimit(path,distance,target,heading,scale),travelDt);
    const previous=distance;distance=Math.min(path.total,distance+speed*travelDt);
    assert(distance>=previous&&distance-previous<=10000*travelDt+.001,'every frame advances continuously; dates never trigger a jump');
    rendered+=(distance-rendered)*(1-Math.exp(-dt/.6));
    const turn=Camera.turn(heading,velocity,Camera.headingAt(path,rendered,scale),dt);
    assert(Math.abs(turn.velocity)<=12.001&&Math.abs(turn.velocity-velocity)<=6*dt+.001,'the quicker trip still eases camera turns');
    heading=turn.heading;velocity=turn.velocity;
    const terrain=Camera.terrainFrame(path,rendered,heightAt,scale);
    const fit=Camera.routeFrame(path,rendered,heightAt,heading,48,{width:390,height:844,top:90,bottom:230},terrain.winding,scale);
    const previousView=view;
    view=Camera.steadyFrame(view,{focus:fit.focus,base:fit.base,clearance:Math.max(terrain.height-fit.base,fit.clearance)},dt);
    assert(view.base+view.clearance-terrain.ground>700,'the continuous camera anticipates the mountains without a ground collision');
    if(previousView){
      assert(Math.abs(Math.log(view.clearance/previousView.clearance))/dt<=.06001,'zoom changes remain gentle through the complete route');
      assert(Math.abs(view.zoomVelocity-previousView.zoomVelocity)<=.02*dt+.00001,'zoom acceleration stays bounded through turns and terrain changes');
    }
    assert.equal(scale,5,'Auto keeps one broad rail instead of zooming with scene speed');
    seconds+=step;
  }
  assert.equal(distance,path.total,'the default journey reaches the actual endpoint');
  assert(seconds>780&&seconds<900,'base-route timing leaves room for live settlement detail around a fifteen-minute trip');
  durations.push(seconds);
}
assert(Math.max(...durations)-Math.min(...durations)<20,'frame rate does not multiply the journey duration');

// Pace selection changes an already moving camera. Starting every pace from
// an independently fitted frame misses a fast traveller outrunning a close
// view while its zoom is still opening over a ridge.
let transitionClearance=Infinity,longestTransition=0;
for(const selected of [12800,0])for(const mode of ['moving','pause','date','repeat'])for(const dt of [1/30,.1]){
  let distance=path.dayDistance(30,0),rendered=distance,pace=400,scale=Camera.scaleForPace(pace),speed=0,heading=null,headingVelocity=0,look=null,lookVelocity=0,pitch=null,view=null,required=null,transition=null;
  let pausedAt=null,guardedFrames=0,releasedAt=null;
  const frame=(snap=false)=>{
    rendered=snap?distance:rendered+(distance-rendered)*(1-Math.exp(-dt/.6));
    const point=Camera.pointAt(path,rendered,scale),wanted=Camera.headingAt(path,rendered,scale);
    const rotation=Camera.turn(heading,headingVelocity,wanted,dt);heading=rotation.heading;headingVelocity=rotation.velocity;
    const landmark=Camera.landmarkFrame(landmarks,point,wanted),wantedLook=wanted+Route.headingDelta(wanted,landmark?.heading??wanted)*(pace===0?.35:1);
    const glance=Camera.turn(look,lookVelocity,wantedLook,dt);look=glance.heading;lookVelocity=glance.velocity;
    const terrain=Camera.terrainFrame(path,rendered,heightAt,scale),wantedPitch=pace===0?48:Math.max(34,Math.min(60,54-18*terrain.winding-12*(landmark?.strength||0)));
    pitch=pitch===null?wantedPitch:pitch+Math.max(-3*dt,Math.min(3*dt,(wantedPitch-pitch)*(1-Math.exp(-dt/1.6))));
    const fit=Camera.routeFrame(path,rendered,heightAt,look,pitch,{width:390,height:844,top:90,bottom:230},terrain.winding,scale);
    required=Math.max(terrain.height+(landmark?.lift||0)-fit.base,fit.clearance);
    view=Camera.steadyFrame(snap?null:view,{focus:fit.focus,base:fit.base,clearance:required},dt);
    const clearance=view.base+view.clearance-terrain.ground;
    transitionClearance=Math.min(transitionClearance,clearance);
    assert(clearance>750,'a pace increase must clear the ridge without the emergency floor');
  };
  frame(true);
  for(let tick=0;tick<Math.round(100/dt);tick++){
    const seconds=tick*dt-15;
    if(tick===Math.round(15/dt)){pace=mode==='repeat'?1600:selected;transition={scale:Camera.scaleForPace(pace),fromScale:scale,limit:400};}
    if(mode==='repeat'&&tick===Math.round(18/dt)){
      // An intermediate selection has not yet fitted, so it cannot become
      // the next transition's faster travel allowance.
      const limit=Math.min(transition?.limit??Infinity,pace),fromScale=transition?.fromScale??scale;
      pace=selected;transition={scale:Camera.scaleForPace(pace),fromScale,limit};
      assert.equal(transition.limit,400,'repeated pace choices retain the last fitted travel allowance');
    }
    if(mode==='date'&&tick===Math.round(18/dt)){
      // A date change prepares the selected pace before enabling Play.
      distance=path.dayDistance(31,.35);rendered=distance;scale=Camera.scaleForPace(pace);transition=null;speed=0;heading=null;headingVelocity=0;look=null;lookVelocity=0;pitch=null;view=null;frame(true);
      assert.equal(pace,selected,'date preparation preserves the chosen pace');
    }
    const paused=mode==='pause'&&seconds>=5&&seconds<9;
    if(paused){if(pausedAt===null)pausedAt=distance;speed=0;assert.equal(distance,pausedAt,'pausing a widening view stops route travel');}
    else{
      let requested=pace||capAt(distance);
      if(pace===0)for(const offset of [450,1000,2000,3500,5500,8000])requested=Math.min(requested,Math.sqrt(capAt(distance+offset)**2+2*1800*offset));
      scale+=(Camera.scaleForPace(pace)-scale)*(1-Math.exp(-dt/6));
      const desired=Camera.speedLimit(path,distance,requested,heading,scale),guarded=Camera.paceLimit(transition,desired,scale,view.clearance,required);
      if(transition&&!guarded.settled){guardedFrames++;assert(guarded.speed<=400,'the faster request waits for the actual wider frame');}
      if(transition&&guarded.settled){releasedAt=seconds;transition=null;}
      const beforeSpeed=speed;
      const travelDt=dt*(pace===0?Pace.playbackRate:1);
      speed=pace===0?Pace.advance(speed,guarded.speed,travelDt):speed+(guarded.speed-speed)*(1-Math.exp(-travelDt/.85));
      assert(Math.abs(speed-beforeSpeed)<Math.max(1,Math.abs(guarded.speed-beforeSpeed)),'the pace change eases speed rather than assigning the new rate');
      distance=Math.min(path.total,distance+speed*travelDt);
    }
    frame();
  }
  assert(guardedFrames>0,'the close-to-wide transition exercises its framing guard');
  assert.equal(transition,null,'the wider pace eventually becomes fully available');
  if(mode!=='date'){assert(releasedAt>0&&releasedAt<75,'camera fitting must not leave faster playback capped indefinitely');longestTransition=Math.max(longestTransition,releasedAt);}
  assert.equal(pace,selected,'pausing, resuming and preparation never replace the selected pace');
}
assert.deepEqual(Camera.paceLimit(null,4321,5,0,0),{speed:4321,settled:true},'an initially fitted Auto journey retains its existing timing');
console.log(`Pace transitions passed: quarter-speed to8× and Auto over mountains, pause/resume, prepared dates, ${transitionClearance.toFixed(0)} m minimum clearance and ${longestTransition.toFixed(1)} s longest widening transition.`);
assert.equal(JSON.stringify(route),original,'camera framing never changes the recorded route');
console.log('Continuous journey checks passed: '+durations.map(n=>(n/60).toFixed(1)).join('/')+' minutes at 60/30/10 fps, forward travel, bounded turns, clear terrain and the true endpoint.');
