import './check-trek-continuity.mjs';
import './check-trek-camera.mjs';
import './check-trek-paper.mjs';
import './check-trek-wayfinding.mjs';
import './check-trek-elevation-cache.mjs';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const route=read('public/trek/route-detail.json'),source=read('data/trek-days.json'),moments=read('public/trek/moments.json');
// Dan explicitly approved publication of this 2019 route on 5 September 2026.
// Keep the exception confined to coordinates and recording/day grouping.
assert.deepEqual(Object.keys(route).sort(),['features','originalPoints','precision','recordings','source','type']);
assert.equal(route.type,'FeatureCollection');
assert.equal(route.precision,'recorded');
assert.equal(route.recordings,52);
assert.equal(new Set(route.features.map(f=>f.properties.recording)).size,source.tracks.length);
assert.equal(route.features.length,57,'retain all split recording segments');
assert.equal(route.features.reduce((n,f)=>n+f.geometry.coordinates.length,0),14338,'retain the reviewed route projection');
const parts=new Set();
route.features.forEach(f=>{
  assert.deepEqual(Object.keys(f).sort(),['geometry','properties','type']);
  assert.deepEqual(Object.keys(f.geometry).sort(),['coordinates','type']);
  assert.deepEqual(Object.keys(f.properties).sort(),['day','part','recording','throughDay']);
  const p=f.properties;
  for(const v of Object.values(p))assert(Number.isInteger(v));
  assert(p.day>=1&&p.day<=p.throughDay&&p.throughDay<=67);
  assert(p.recording>=1&&p.recording<=52&&p.part>=0);
  const key=p.recording+':'+p.part;assert(!parts.has(key));parts.add(key);
  assert.equal(f.geometry.type,'LineString');
  assert(f.geometry.coordinates.length>=2);
  f.geometry.coordinates.forEach(point=>{
    assert.equal(point.length,2,'no sample times, altitude or biometric channels');
    const [lon,lat]=point;assert(Number.isFinite(lon)&&Number.isFinite(lat));
    assert(lon>=2&&lon<=24&&lat>=42&&lat<=50,'only the approved Paris-to-Sofia corridor');
    for(const v of point)assert(Math.abs(v*1e5-Math.round(v*1e5))<1e-6,'five-decimal coordinate projection');
  });
});
// Day 13 has two source activities. A day-key overwrite previously kept only
// the second activity's metrics even though both routes were drawn.
const splitDay=source.days.find(d=>d.n===13);
assert.equal(new Set(route.features.filter(f=>f.properties.day===13).map(f=>f.properties.recording)).size,2);
assert.deepEqual([splitDay.km,splitDay.movingMin,splitDay.elevM],[42.9,372,856],'day 13 includes both recorded halves');
const shared=route.features.filter(f=>f.properties.day===16);
assert(shared.length&&shared.every(f=>f.properties.throughDay===17),'preserve the shared days 16–17 recording');
for(let i=0;i<source.tracks.length;i++){
  const fs=route.features.filter(f=>f.properties.recording===i+1);
  const ends=[fs[0].geometry.coordinates[0],fs.at(-1).geometry.coordinates.at(-1)];
  ends.forEach(([lon,lat],end)=>{
    const x=lon*Math.PI/180*6378137,y=-Math.asinh(Math.tan(lat*Math.PI/180))*6378137;
    const expected=end?source.tracks[i].at(-1):source.tracks[i][0];
    assert(Math.hypot(x-expected[0],y-expected[1])<20,'recording endpoints match the owning public route, allowing its coarse grid');
  });
}
const generated=readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8');
const generatedData=JSON.parse(generated.match(/var DATA = (.*);/)[1]);
for(const [file,version] of Object.entries(generatedData.assets)){
  assert.equal(version,createHash('sha256').update(readFileSync(new URL('../public/trek/'+file,import.meta.url))).digest('hex').slice(0,12),`The cached ${file} must match this release`);
}
const runtimeAssets=[...generated.matchAll(/(?:href|src)="(journey-[\w-]+\.(?:css|js))(?:\?v=([a-f0-9]+))?"/g)];
assert.deepEqual(runtimeAssets.map(a=>a[1]).sort(),['journey-cache.js','journey-camera.js','journey-elevation.js','journey-landmarks.js','journey-paper.js','journey-route.js','journey-traveller.css','journey-traveller.js','journey-wayfinding.js'],'the generated page references the complete traveller runtime');
for(const [,file,version] of runtimeAssets){
  const expected=createHash('sha256').update(readFileSync(new URL('../public/trek/'+file,import.meta.url))).digest('hex').slice(0,12);
  assert.equal(version,expected,`Run npm run trek:build after changing ${file}; cached controls must match the page`);
}
assert(!/id="(?:view-atlas|view-relief|relief-map|atlas)"/.test(generated),'only the Paths view is reachable');
const mapSource=readFileSync(new URL('../public/trek/journey-traveller.js',import.meta.url),'utf8');
assert(mapSource.includes("map.setTerrain({source:'dem',exaggeration:1})"),'real-scale 3D terrain applies to the whole map');
assert.equal(moments.chapters.length,6);
assert.deepEqual(moments,read('data/trek-moments.json'),'the generated chapter and moment projection is current');
assert.equal(moments.moments.length,9);
for(const m of [...moments.chapters,...moments.moments]){
  assert(m.day>=1&&m.day<=67);
  assert(existsSync(new URL('../public/trek/photos/'+m.photo,import.meta.url)),m.photo);
}
for(const m of moments.moments){assert(m.evidence&&m.position,'every landmark needs evidence and an honest location qualification');assert(m.at>=0&&m.at<=1);}
console.log('Journey checks passed: 52 approved recordings, 57 separate paths, 14338 coordinates, unaltered source gaps, six chapters and nine evidenced moments');
