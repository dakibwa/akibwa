import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),Pace=require('../public/trek/journey-pace.js'),Camera=require('../public/trek/journey-camera.js');
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const empty={places:[],shapes:[]},flat=Pace.terrain(()=>100,0),point=[5,48];
const open=Pace.scene(point,flat,empty);
assert.equal(open.cap,7200);assert.equal(open.reason,'open country');
const city=Pace.context([{properties:{class:'city'},geometry:{type:'Point',coordinates:point}}]);
const town=Pace.scene(point,flat,city);assert(town.cap<250&&town.cap<open.cap/10);
const high=Pace.scene(point,Pace.terrain(()=>2000,0),empty);assert(high.cap<=281&&high.reason==='mountains','a straight mountain plateau slows even without road bends');
const steep=Pace.scene(point,Pace.terrain(d=>500+d/3,0),empty);assert(steep.cap<open.cap/10,'strong local relief slows below the high-altitude threshold');
const landmark=Pace.scene(point,flat,empty,[{point}]);assert(landmark.cap<town.cap&&landmark.reason==='landmark');
const square=(cx,cy,r)=>[[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r],[cx-r,cy-r]];
for(const [layer,kind,reason] of [['landcover','wood','woodland'],['landuse','residential','town'],['water','lake','waterside']]){
 const features=Pace.context([{sourceLayer:layer,properties:{class:kind},geometry:{type:'Polygon',coordinates:[square(5,48,.01)]}}]);
 const at=Pace.scene(point,flat,features),away=Pace.scene([5.1,48],flat,features);
 assert(at.cap<open.cap&&at.reason===reason);assert.equal(away.cap,open.cap,'leaving mapped scenery releases its slowdown');
}
const hole=Pace.context([{sourceLayer:'landcover',properties:{class:'wood'},geometry:{type:'Polygon',coordinates:[square(5,48,.1),square(5,48,.02)]}}]);
assert.equal(Pace.scene(point,flat,hole).cap,open.cap,'a woodland clearing is not classified as forest');
// A loaded town ahead must slow the journey before entry. Source parsing belongs
// to the map-data scheduler, not to the repeated playback updates.
const listeners=new Map();let queries=0,loaded=true;
const testMap={on:(event,fn)=>listeners.set(event,fn),off:event=>listeners.delete(event),areTilesLoaded:()=>loaded,querySourceFeatures:(_,options)=>{queries++;return options.sourceLayer==='place'?[{properties:{class:'city'},geometry:{type:'Point',coordinates:[.1,0]}}]:[];}};
const controller=Pace.create({map:testMap,path:{total:30000,sample:d=>({point:[d/111195,0]})},heightAt:()=>100});
await new Promise(resolve=>setTimeout(resolve,25));
const reads=queries,far=controller.update(0,true),approach=controller.update(4000,true),inside=controller.update(11120,true),departed=controller.update(23000,true);
assert(reads===5&&approach.anticipating&&approach.target<far.target&&inside.target<300,'the loaded city is anticipated before its centre');
assert.equal(departed.target,7200,'the pace recovers after leaving the city');
for(let i=0;i<250;i++)controller.update(i*20,true);
assert.equal(queries,reads,'playback never performs map queries or geometry preparation');
loaded=false;assert(controller.update(23000,true).target<=1400,'unprepared scenery prevents rapid acceleration');
listeners.get('sourcedata')({sourceId:'openmaptiles'});controller.destroy();
assert.equal(listeners.size,0,'removing the map also removes the data listeners and pending refresh');
for(const dt of [1/60,1/30,.1])for(const [from,to] of [[0,7200],[7200,150],[700,700]]){
 let speed=from;
 for(let i=0;i<500;i++){const next=Pace.advance(speed,to,dt);assert(next>=0&&Number.isFinite(next));assert(next-speed<=650*dt+.00001&&speed-next<=1500*dt+.00001,'speed changes have bounded acceleration and braking');assert((to-speed)*(to-next)>=-.00001,'the pace never overshoots its target');speed=next;}
}
const path=require('../public/trek/journey-route.js').buildJourneyPath(read('public/trek/route-detail.json'),67,read('public/trek/route-links.json'));
const profile=read('public/trek/elevation-profile.json'),heightAt=d=>require('../public/trek/journey-elevation.js').sample(profile,d,false),landmarks=read('data/trek-landmarks.json').landmarks;
for(let d=0;d<path.total;d+=550){
 const scene=Pace.scene(path.sample(d).point,Pace.terrain(heightAt,d),empty,landmarks),heading=Camera.headingAt(path,d);
 const speed=Camera.speedLimit(path,d,scene.cap,heading);
 assert(Number.isFinite(scene.cap)&&scene.cap>=149.9&&scene.cap<=7200.001);
 assert(speed>=35&&speed<=scene.cap+.0001,'automatic scenery pacing retains the existing bend limits');
}
assert(Pace.scene(path.sample(path.dayDistance(30,.65)).point,Pace.terrain(heightAt,path.dayDistance(30,.65)),empty).cap<700,'the actual Alpine pass receives a scenic pace');
console.log('Automatic pace checks passed: open stretches, city centres, high and steep mountains, landmarks, woodland, water, clearings, departure, bounded speed changes and whole-route bend limits.');
