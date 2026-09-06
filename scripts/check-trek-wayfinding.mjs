import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {mesh}=require('../public/trek/journey-landmarks.js');
const {nearestPlace,metres,flags}=require('../public/trek/journey-wayfinding.js');
const {landmarkBuildingIds}=require('../public/trek/journey-paper.js');
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const landmarks=read('data/trek-landmarks.json').landmarks,route=read('public/trek/route-detail.json');
const before=JSON.stringify(landmarks);
assert.equal(landmarks.length,9);
assert.deepEqual(new Set(landmarks.map(l=>l.country)),new Set(Object.keys(flags)),'landmarks cover the seven countries on this walk');
for(const item of landmarks){
  assert(item.source.startsWith('https://')&&/^https:\/\/www.openstreetmap.org\/way\/\d+$/.test(item.mapSource),'retain public name and coordinate provenance');
  const closest=Math.min(...route.features.flatMap(f=>f.geometry.coordinates.map(p=>metres(p,item.point))));
  assert(closest<1250,`${item.name} must remain near an actual recording, not just a connection`);
  const faces=mesh(item);
  assert(faces.length>80&&faces.length<2200,'recognisable models keep a small geometry budget');
  for(const face of faces){
    assert(/^#[0-9a-f]{6}$/i.test(face.color));
    for(const p of [face.a,face.b,face.c])assert(p.length===3&&p.every(Number.isFinite)&&p[2]>=0&&Math.abs(p[0])<150&&Math.abs(p[1])<150&&p[2]<150,'geometry stays finite, grounded and at building scale');
  }
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
const rectangle=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const bounds={footprint:rectangle(11.5728,48.1383,11.5744,48.1389)};
const building=(id,rings,type='Polygon')=>({id,geometry:{type,coordinates:rings}});
const contained=rectangle(11.573,48.1384,11.574,48.1388),outside=rectangle(11.576,48.1384,11.577,48.1388);
const buildings=[building(1,[contained]),building(2,[[contained],[contained]],'MultiPolygon'),building(3,[outside]),building(4,[[contained],[outside]],'MultiPolygon')];
assert.deepEqual(landmarkBuildingIds(buildings,[bounds]),[1,2],'replace the complete native body and multi-part towers, preserving adjacent or partly outside buildings');
const generated=JSON.parse(readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8').match(/var DATA = (.*);/)[1]);
assert.deepEqual(generated.landmarks,landmarks,'the published model positions and sources match the owning data');
assert.deepEqual(generated.countryRings,read('data/trek-days.json').countryRings.map(({name,rings})=>({name,rings})),'the inset uses existing geographic outlines');
console.log('Wayfinding checks passed: nine sourced landmarks, bounded meshes, true route proximity, native building replacement, stable town labels and the existing country outlines.');
