import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),Prepared=require('../public/trek/journey-prepared.js'),Cache=require('../public/trek/journey-cache.js');
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),manifest=JSON.parse(read('public/trek/prepared/manifest.json'));
for(const [p,expected]of Object.entries(manifest.inputs))assert.equal(createHash('sha256').update(read(p)).digest('hex').slice(0,12),expected,'Regenerate the prepared scene after '+p+' changes');
assert(manifest.tileBytes<12000000,'the pilot must keep its complete geographic package below 12MB');
assert(manifest.sceneBytes<3000000,'finished scenery has a separate 3MB compressed budget');
for(const [key,tile]of Object.entries(manifest.tiles)){
 assert(/^(vector|dem)\/\d+\/\d+\/\d+$/.test(key));assert(!tile.file.includes('/'));
 assert(existsSync(new URL('public/trek/prepared/'+tile.file,root)));
 assert.equal(read('public/trek/prepared/'+tile.file).byteLength,tile.bytes);
 if(key.startsWith('dem/'))assert(+key.split('/')[1]<=12,'fixed terrain avoids resolution seams within the pilot');
}
const bytes=gunzipSync(read('public/trek/prepared/'+manifest.scene)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),scene=Prepared.decode(buffer);
assert(scene.vertices.length>0&&scene.vertices.length%7===0);assert(scene.vertices.every(Number.isFinite));
assert.deepEqual(scene.landmarks,['bad-gastein','bockstein']);assert(scene.roofs>500&&scene.trees===6500);
let trees=0;for(const [key,values]of scene.instances){assert(scene.treeModels.has(key));assert(values.every(Number.isFinite));assert.equal(values.length%5,0);trees+=values.length/5;}
assert.equal(trees,scene.trees);assert.equal(scene.vertices.length/7+scene.treeVertices,manifest.stats.vertices);
assert(Prepared.contains(manifest.core,[13.13,47.11]));assert(!Prepared.contains(manifest.core,[2.35,48.85]));
// Local pilot tiles must supersede an old provider response in persistent cache.
const remote='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2197/1438.png',local='https://akibwa.com/trek/prepared/immutable.webp';let requested;
const storage={open:async()=>({match:async key=>key===remote?new Response('stale'):null,put:async()=>{},keys:async()=>[],delete:async()=>{}})};
const cache=Cache.create({storage,resolveTile:url=>url===remote?local:null,fetcher:async url=>{requested=url;return new Response('prepared');}});
assert.equal(new TextDecoder().decode(await cache.read(remote)),'prepared');assert.equal(requested,local);
await assert.rejects(cache.read('https://example.com/private'),/Not a Trek map tile/);
console.log('Prepared scene checks passed: source freshness, bounded package, finite complete geometry, landmarks, geographic bounds and cache routing.');
const Paper=require('../public/trek/journey-paper.js'),center=Paper.project([13.13,47.112]);
const selected=Prepared.select(scene,center,8700);
assert(selected.trees>0&&selected.trees<scene.trees,'distant stored trees are not sent to the GPU');
assert(selected.vertices.length>0&&selected.vertices.length<=scene.vertices.length,'select complete nearby triangle chunks');
assert.equal(selected.folds,scene.folds,'camera selection reuses the existing terrain overlay');
assert.equal(selected.shadows,scene.shadows,'camera selection reuses the existing shadow overlay');
assert.equal(selected.treeModels,scene.treeModels,'camera selection never rebuilds tree silhouettes');
for(const c of scene.chunks){assert(c.offset>=0&&c.length%21===0&&c.offset+c.length<=scene.vertices.length);}
console.log('Prepared selection checks passed: near-camera geometry, complete triangle chunks and stable shared overlays.');

const edge=Prepared.select(scene,Paper.project([13.28,47.20]),4600);assert(edge.vertices.length<scene.vertices.length,'a distant camera omits stored town geometry');

const missing=Cache.create({storage:null,resolveTile:()=>local,fetcher:async url=>new Response(url===local?'missing':'provider',{status:url===local?404:200})});assert.equal(new TextDecoder().decode(await missing.read(remote)),'provider','old prepared URLs retain a public-provider fallback');
