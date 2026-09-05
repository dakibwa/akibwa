import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {pathAt}=require('../public/trek/journey-map.js');
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const route=read('public/trek/route-detail.json'),source=read('data/trek-days.json'),moments=read('public/trek/moments.json');
const f=points=>({geometry:{coordinates:points}});
const separated=[f([[0,0],[1,0]]),f([[10,0],[11,0]])];
assert.deepEqual(pathAt(separated,0).point,[0,0]);
assert.deepEqual(pathAt(separated,1).point,[11,0]);
for(let t=0;t<=1;t+=.001){const p=pathAt(separated,t).point;assert(p[0]<=1||p[0]>=10,'the walking point must not bridge unrecorded gaps');}
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
assert(!/id="(?:view-atlas|view-relief|relief-map|atlas)"/.test(generated),'only the Paths view is reachable');
const mapSource=readFileSync(new URL('../public/trek/journey-map.js',import.meta.url),'utf8');
assert(mapSource.includes("map.setTerrain({source:'dem',exaggeration:1.35})"),'3D terrain applies to the whole map');
assert.equal(moments.chapters.length,6);
assert.deepEqual(moments,read('data/trek-moments.json'),'the generated chapter and moment projection is current');
assert.equal(moments.moments.length,9);
for(const m of [...moments.chapters,...moments.moments]){
  assert(m.day>=1&&m.day<=67);
  assert(existsSync(new URL('../public/trek/photos/'+m.photo,import.meta.url)),m.photo);
}
for(const m of moments.moments){assert(m.evidence&&m.position,'every landmark needs evidence and an honest location qualification');assert(m.at>=0&&m.at<=1);}
console.log('Journey checks passed: 52 approved recordings, 57 separate paths, 14338 coordinates, no invented gap links, six chapters and nine evidenced moments');
