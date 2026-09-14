import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {mesh,displayFootprint}=require('../public/trek/journey-landmarks.js');
const {create,nearestPlace,routePlaceIndex,settlementWindow,settlementCache,rollingPlaces,metres,flags}=require('../public/trek/journey-wayfinding.js');
const {buildJourneyPath}=require('../public/trek/journey-route.js');
const {landmarkBuildingIds}=require('../public/trek/journey-paper.js');
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const landmarks=read('data/trek-landmarks.json').landmarks,route=read('public/trek/route-detail.json');
const before=JSON.stringify(landmarks);
assert.equal(landmarks.length,12);
assert.deepEqual(new Set(landmarks.map(l=>l.country)),new Set(Object.keys(flags)),'landmarks cover the seven countries on this walk');
for(const item of landmarks){
  assert(item.source.startsWith('https://')&&/^https:\/\/www.openstreetmap.org\/way\/\d+$/.test(item.mapSource),'retain public name and coordinate provenance');
  const closest=Math.min(...route.features.flatMap(f=>f.geometry.coordinates.map(p=>metres(p,item.point))));
  assert(closest<1250,`${item.name} must remain near an actual recording, not just a connection`);
  const faces=mesh(item);
  assert(faces.length>80&&faces.length<2200,'recognisable models keep a small geometry budget');
  for(const face of faces){
    assert(/^#[0-9a-f]{6}$/i.test(face.color));
    for(const p of [face.a,face.b,face.c])assert(p.length===3&&p.every(Number.isFinite)&&p[2]>=0&&Math.abs(p[0])<260&&Math.abs(p[1])<260&&p[2]<400,'oversized landmarks stay finite, grounded and below the camera clearance floor');
  }
  assert.equal(Math.min(...faces.flatMap(f=>[f.a[2],f.b[2],f.c[2]])),0,'enlarging a landmark must not lift its feet off the ground');
  if(['reims','nancy'].includes(item.id))assert(Math.max(...faces.flatMap(f=>[f.a[2],f.b[2],f.c[2]]))>300,'the two French cathedrals must rise clearly above the surrounding town');
  const footprint=displayFootprint(item);assert.equal(footprint.length,5);assert.deepEqual(footprint[0],footprint.at(-1));assert(footprint.every(p=>p.every(Number.isFinite)&&metres(p,item.point)<350),'the grounding shadow is closed and stays within the enlarged model budget');
}
assert.equal(JSON.stringify(landmarks),before,'rendering must not rewrite the source landmarks');
const place=(name,kind,point)=>({properties:{name,class:kind},geometry:{type:'Point',coordinates:point}});
const munich=place('Munich','city',[11.575,48.137]);
assert.equal(nearestPlace([munich,munich],[11.57,48.14]).name,'Munich','duplicate map tiles still yield one settlement');
assert.equal(nearestPlace([munich],[11.8,48.14]),null,'a distant city cannot appear over the countryside');
assert.equal(nearestPlace([place('Bavaria','state',[11.57,48.14])],[11.57,48.14]),null,'region labels are not town announcements');
const village=place('Village','village',[11.57,48.14]),held=nearestPlace([village],village.geometry.coordinates);
assert.equal(nearestPlace([village],[11.57,48.147],held)?.name,'Village','a small hysteresis margin avoids flicker at a settlement edge');
assert.equal(nearestPlace([village],[11.57,48.15],held),null,'hysteresis must still release a town after leaving');

const ordered=Array.from({length:15},(_,i)=>({id:'place-'+i,name:'Place '+i,kind:i%5?'village':'city',point:[i*5000/111195,0],distance:i*5000,proximity:0,routeKind:'recorded',mode:'walk'}));
const orderedBefore=JSON.stringify(ordered);
const middle=settlementWindow(ordered,25000,[25000/111195,0]);
assert.equal(middle.entries.length,9);assert.equal(middle.currentId,'place-5');assert.equal(middle.currentIndex,2);
assert.deepEqual(middle.entries.slice(0,3).map(e=>e.state),['passed','passed','current'],'two recent places precede the current settlement');
const between=settlementWindow(ordered,27500,[27500/111195,0]);
assert.equal(between.currentId,null,'an old city cannot remain current deep into countryside');
assert.equal(between.entries[between.currentIndex].id,'place-6','between towns the window anchors the next place');
assert.equal(settlementWindow(ordered,0,[0,0]).currentIndex,0,'the beginning never invents already passed towns');
const finished=settlementWindow(ordered,75000,[75000/111195,0]);
assert.equal(finished.entries.length,3);assert.equal(finished.currentIndex,2);assert.equal(finished.currentId,null,'the route end retains the last context without claiming to be in a distant town');
assert.equal(settlementWindow(ordered,400000,[4,0]).entries.length,0,'a distant date seek cannot display an unrelated old window');
assert.equal(JSON.stringify(ordered),orderedBefore,'window selection never mutates its cached source');

const syntheticRoute={type:'FeatureCollection',features:[[0,.1],[.2,.5]].map(([start,end],i)=>({type:'Feature',properties:{day:i+1,throughDay:i+1,recording:i},geometry:{type:'LineString',coordinates:Array.from({length:21},(_,n)=>[start+(end-start)*n/20,0])}}))};
const links={type:'FeatureCollection',features:[{type:'Feature',properties:{gap:0,mode:'train',railFrom:0,railTo:1,structures:[]},geometry:{type:'LineString',coordinates:[[.1,0],[.2,0]]}}]};
const testPath=buildJourneyPath(syntheticRoute,2,links),pathBefore=JSON.stringify(testPath.pieces),routeIndex=routePlaceIndex(testPath);
const trainPoint=[.15,0],trainMatch=routeIndex.match(trainPoint,'town');
assert.equal(trainMatch.length,1);assert.equal(trainMatch[0].routeKind,'connection');assert.equal(trainMatch[0].mode,'train');
assert(Math.abs(trainMatch[0].distance-111195*.15)<1,'settlements project onto the original route distance');
assert.equal(routeIndex.match([.15,.04],'city').length,0,'a distant city outside the route corridor is excluded');
const learned=Array.from({length:18},(_,i)=>({...place('Town '+i,i%5?'village':'city',[.01+i*.025,0]),id:i+1}));
const cache=settlementCache(testPath);cache.add([...learned,...learned],0);
assert.equal(cache.status().entries,learned.length,'overlapping source tiles produce one cached settlement');
const firstWindow=cache.window(testPath.total*.5),firstIds=firstWindow.entries.map(e=>e.id);
cache.add([],testPath.total*.5);
assert.deepEqual(cache.window(testPath.total*.5).entries.map(e=>e.id),firstIds,'unloading vector tiles retains the rolling route window');
cache.add(learned.map(f=>({...f,geometry:{type:'Point',coordinates:[f.geometry.coordinates[0]+.00015,0]}})),testPath.total*.5);
assert.equal(cache.status().entries,learned.length,'small label coordinate changes do not duplicate towns');
assert.deepEqual(cache.window(testPath.total*.5).entries.map(e=>e.id),firstIds,'tile refreshes preserve stable settlement identifiers');
const endWindow=cache.window(testPath.total),backWindow=cache.window(0);
assert(endWindow.entries[0].distance>backWindow.entries.at(-1).distance,'seeking selects the correct part of route order');
const duplicates=settlementCache(testPath);
duplicates.add([place('Shared name','village',[.04,0]),place('Shared name','village',[.35,0]),place('Tiny','hamlet',[.25,0]),place('Tiny','city',[.25,0])],0);
assert.equal(duplicates.status().entries,3,'distinct towns with the same name remain distinct while duplicate classes merge');
assert.equal(duplicates.window(.25*111195).entries.find(e=>e.name==='Tiny').kind,'city','the strongest mapped settlement class controls type hierarchy');
const bounded=settlementCache(testPath),many=Array.from({length:900},(_,i)=>place('Mapped '+i,'village',[.001+i*.0005,0]));
for(let i=0;i<5;i++)bounded.add(many,testPath.total*.5);
assert(bounded.status().entries<=512&&bounded.status().rejected<=1024,'settlement memory stays bounded through long playback');
assert.equal(JSON.stringify(testPath.pieces),pathBefore,'settlement projection never rewrites route geometry');

// A continuous strip must retain on-screen names while map tiles and the
// nearest-town window change, and never jump when old rows are recycled.
const roll=rollingPlaces(),screenPositions=state=>new Map(state.entries.map((e,i)=>[e.id,i-state.offset]));
roll.merge(ordered,10000,5);
let prior=screenPositions(roll.state()),moves=0;
for(let frame=1;frame<=360;frame++){
  const progress=10000+frame*110;
  if(frame%20===0){
    const before=screenPositions(roll.state());
    roll.merge(settlementWindow(ordered,progress,null).entries,progress,5);
    const after=screenPositions(roll.state());
    for(const [id,y] of before)if(y>-1&&y<6)assert.equal(after.get(id),y,'map refreshes cannot move or replace a visible name');
  }
  const state=roll.advance(progress,1/60,5,true),positions=screenPositions(state);
  for(const [id,y] of positions)if(prior.has(id)){
    const step=prior.get(id)-y;
    assert(step>=-1e-9&&step<=1.5/60,'every retained name rolls forward by a bounded amount per frame, including row recycling');
    if(step>1e-6)moves++;
  }
  prior=positions;
}
assert(moves>100,'the names move between town-boundary events');
const frozen=roll.state().offset;
roll.advance(70000,1,5,false);assert.equal(roll.state().offset,frozen,'pausing the map also pauses the strip');
const stable=screenPositions(roll.state()),visible=roll.state().entries.find((e,i)=>i>roll.state().offset&&i<roll.state().offset+4);
roll.merge([{...visible,id:'late-label',distance:visible.distance+1},...ordered],70000,5);
for(const [id,y] of stable)if(y>-1&&y<5)assert.equal(screenPositions(roll.state()).get(id),y,'a late-decoded name cannot be inserted into the visible strip');
assert(!roll.state().entries.some(e=>e.id==='late-label'));
roll.merge([{...visible,distance:200000},...ordered],70000,5);
assert.equal(roll.state().entries.filter(e=>e.id===visible.id).length,1,'a second route approach cannot duplicate a name still in the strip');
assert.equal(screenPositions(roll.state()).get(visible.id),stable.get(visible.id));
roll.reset();assert.equal(roll.state().entries.length,0,'a date seek clears the old strip');
roll.merge(ordered.slice(10),60000,5);assert(roll.state().entries.every(e=>e.distance>=50000));
roll.advance(68000,1/60,5,true,true);assert.equal(roll.state().offset%1,0,'reduced motion uses stationary rows');
roll.reset();roll.merge(Array.from({length:200},(_,i)=>({...ordered[0],id:'buffer-'+i,distance:i*1000})),0,5);
assert(roll.state().entries.length<=48,'the offscreen strip stays bounded');

// Exercise the actual callback integration without the removed single-label UI.
const brush=new Proxy({}, {get:()=>()=>{}}),canvas={getContext:()=>brush},handlers=new Map(),updates=[];
const oldDocument=globalThis.document,oldDpr=globalThis.devicePixelRatio;
globalThis.document={createElement:()=>({...canvas})};globalThis.devicePixelRatio=1;
const map={isStyleLoaded:()=>true,querySourceFeatures:()=>[place('Train context','town',trainPoint),...learned],on:(event,handler)=>handlers.set(event,handler),off:event=>handlers.delete(event)};
const wayfinder=create({canvas,flag:null,path:testPath,countries:[],map,landmarks:[],onPlaces:value=>updates.push(value)});
try{
  wayfinder.refresh();wayfinder.update(trainMatch[0].distance,0,true);
  assert.equal(wayfinder.status().place,null,'a connection never triggers a recorded-visit announcement');
  assert.equal(updates.at(-1).context,'train');assert(updates.at(-1).currentId,'nearby names still give geographic context along a train connection');
  const count=updates.length,window=updates.at(-1).entries.map(e=>e.id);
  wayfinder.resetPlace();wayfinder.update(trainMatch[0].distance,0,true);
  assert.equal(updates.length,count+1,'reset forces a fresh callback even when replay starts at the same window');
  assert.deepEqual(updates.at(-1).entries.map(e=>e.id),window);
}finally{wayfinder.destroy();globalThis.document=oldDocument;if(oldDpr===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=oldDpr;}
const rectangle=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const bounds={footprint:rectangle(11.5728,48.1383,11.5744,48.1389)};
const building=(id,rings,type='Polygon')=>({id,geometry:{type,coordinates:rings}});
const contained=rectangle(11.573,48.1384,11.574,48.1388),outside=rectangle(11.576,48.1384,11.577,48.1388);
const buildings=[building(1,[contained]),building(2,[[contained],[contained]],'MultiPolygon'),building(3,[outside]),building(4,[[contained],[outside]],'MultiPolygon')];
assert.deepEqual(landmarkBuildingIds(buildings,[bounds]),[1,2],'replace the complete native body and multi-part towers, preserving adjacent or partly outside buildings');
const generated=JSON.parse(readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8').match(/var DATA = (.*);/)[1]);
assert.deepEqual(generated.landmarks,landmarks,'the published model positions and sources match the owning data');
assert.deepEqual(generated.countryRings,read('data/trek-atlas.json').countries,'the inset uses the sourced regional atlas');
for(const name of ['France','Germany','Austria','Slovenia','Croatia','Republic of Serbia','Bulgaria','Romania','Hungary','Czechia','Slovakia','Poland','Ukraine','Italy','Switzerland'])assert(generated.countryRings.some(c=>c.name===name),'regional atlas must include '+name);
console.log('Wayfinding checks passed: sourced landmarks, grounded meshes, stable route-ordered settlement windows, current/next anchors, bounded cache, tile dedupe/unloads, date seeks, connection context, callback resets, continuous strip motion and country outlines.');
