/* Verify generated relief against the owning public elevation/route data. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {terrainGeometry,fromAtlas,project}=require('../public/trek/relief-map.js');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const data=JSON.parse(read('../public/trek/index.html').match(/  var DATA = (.+);\n  var days = DATA\.days;/)[1]);
const source=JSON.parse(read('../data/trek-terrain.json'));
const relief=data.relief;
assert.equal(relief.points.length,source.cols*source.rows,'retain every cached elevation sample');
assert.deepEqual(relief.points.map(p=>p[1]),source.elev.map(e=>Math.round(e||0)),'heights come from the cached public source');
const mesh=terrainGeometry(relief);
assert.equal(mesh.length,(source.rows-1)*(source.cols-1)*2*3*6,'every terrain cell has two triangles');
assert(mesh.every(Number.isFinite),'terrain vertices and shading are finite');
const xs=relief.points.map(p=>p[0]),zs=relief.points.map(p=>p[2]);
const bounds=[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
for(const ring of relief.rings){
  assert.deepEqual(ring[0],ring.at(-1),'country silhouettes are closed');
  for(const [x,,z] of ring)assert(x>=bounds[0]-.1&&x<=bounds[1]+.1&&z>=bounds[2]-.1&&z<=bounds[3]+.1,'silhouette stays inside sampled elevation coverage');
}
for(const path of Object.values(data.walkPaths))for(const point of path){
  const [x,alt,z]=fromAtlas(point,data);
  assert([x,alt,z].every(Number.isFinite),'route positions remain finite after removing the atlas tilt');
  assert(x>=bounds[0]&&x<=bounds[1]&&z>=bounds[2]&&z<=bounds[3],'route stays inside the relief coverage');
}
assert.deepEqual(relief.towns.map(t=>[t.name,t.day]),data.places.map(t=>[t.name,t.day]),'city targets retain their actual journey day');
for(const aspect of [320/844,390/844,1440/960])for(const yaw of [-Math.PI,0,Math.PI]){
  const view={x:1400,z:650,alt:0,pitch:.72,yaw,width:2800,aspect};
  assert(relief.points.every(p=>project(p,view).every(Number.isFinite)),'projection stays finite at phone and desktop orientations');
}
console.log(`Trek geometry passed: ${source.cols*source.rows} source elevations, ${mesh.length/18} triangles, ${relief.towns.length} city targets and all route points`);
