/* Geographic and stability regressions for illustrative paper scenery. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const paper = require('../public/trek/journey-paper.js');
const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const base = read('public/trek/journey-style.json'), original = JSON.stringify(base), style = paper.style(base);
assert.equal(JSON.stringify(base), original, 'paper styling must not alter the owning vector style');
assert.deepEqual(style.sources, base.sources, 'use the existing public map providers');
assert.equal(style.layers.find(l => l.id === 'paper-fields')['source-layer'], 'landcover', 'OpenFreeMap farmland is land cover, not residential land use');
for (const layer of style.layers) {
  for (const key of Object.keys(layer.paint || {})) assert(layer.type === 'symbol' ? /^(text|icon)-/.test(key) : key.startsWith(layer.type + '-'), `${layer.id} has a paint property for the wrong layer type`);
}
for (const point of [[2.35, 48.85], [8.53, 48.91], [13.15, 47.07], [23.32, 42.7]]) {
  const back = paper.unproject(paper.project(point));
  assert(back.every((v, i) => Math.abs(v - point[i]) < 1e-10), 'paper objects must stay anchored in geographic space');
}
const center = paper.project([8.53, 48.91]);
const square = (x, y, size) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]].map(p => paper.unproject([p[0] + center[0], p[1] + center[1]]));
const woodland = {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [square(-1000, -1000, 2000), square(-200, -200, 400)]}};
const source = JSON.stringify(woodland), plant = (features, at = center, limit = 6500) => paper.plantWoodland(features, at, p => Math.abs(p[0] - center[0] - 400) < 46, 4600, limit);
const trees = plant([woodland]);
assert(trees.length > 500, 'a substantial mapped forest must receive scenery');
for (const {p} of trees) {
  assert(paper.inPolygon(p, woodland.geometry.coordinates.map(r => r.map(paper.project))), 'keep trees inside woodland and outside holes such as lakes');
  assert(Math.abs(p[0] - center[0] - 400) >= 46, 'keep the route corridor open');
}
assert.deepEqual(plant([woodland, woodland]), trees, 'overlapping vector tiles must not duplicate trees');
const positions = list => list.map(t => t.p.join(':') + ':' + t.seed).sort();
assert.deepEqual(positions(plant([woodland], [center[0] + 200, center[1] - 150])), positions(trees), 'moving the camera must not shuffle an existing forest');
assert.equal(plant([woodland], center, 20).length, 20, 'honour the geometry budget even in a dense forest');
assert.equal(JSON.stringify(woodland), source, 'never rewrite mapped source geometry');
for (const seed of [.01, .35, .67, .7, .89, .99]) for (const detailed of [false, true]) {
  const mesh = paper.treeMesh(seed, detailed);
  assert(mesh.faces.length > 25 && mesh.faces.length <= 112, 'layered canopies must keep a bounded per-tree mesh');
  for (const face of mesh.faces) for (const v of [face.a, face.b, face.c]) {
    assert(v.every(Number.isFinite), 'canopy vertices must be finite');
    assert(v[2] >= 0 && v[2] <= mesh.height * 1.1, 'canopies must stay grounded at their intended scale');
    assert(Math.hypot(v[0], v[1]) <= mesh.width * 1.3, 'folds must stay within the canopy envelope');
  }
  assert.deepEqual(paper.treeMesh(seed, detailed), mesh, 'rebuilds must preserve each tree silhouette');
}
const orchard = {...woodland, properties: {class: 'grass', subclass: 'orchard'}};
const orchardTrees = paper.plantOrchards([orchard], center, p => Math.abs(p[0] - center[0] - 400) < 46);
assert(orchardTrees.length > 200, 'mapped orchard subclasses must receive their own small broadleaf rows');
assert.equal(paper.plantOrchards([woodland, {...orchard, properties: {class: 'grass', subclass: 'meadow'}}], center, () => false).length, 0, 'open pasture must not become an invented orchard or forest');
for (const tree of orchardTrees) {
  assert(paper.inPolygon(tree.p, woodland.geometry.coordinates.map(r => r.map(paper.project))), 'orchard crowns respect mapped boundaries and holes');
  assert(tree.seed >= .7 && tree.sizeScale >= .48 && tree.sizeScale <= .62, 'orchards use smaller broadleaf crowns rather than forest conifers');
  assert(Math.abs(tree.p[0] - center[0] - 400) >= 46, 'orchards keep the travel corridor open');
}
assert.deepEqual(paper.plantOrchards([orchard, orchard], center, () => false), paper.plantOrchards([orchard], center, () => false), 'overlapping tiles must not duplicate orchard rows');
assert.deepEqual(positions(paper.plantOrchards([orchard], [center[0] + 100, center[1]], () => false, 4600, 3000)), positions(paper.plantOrchards([orchard], center, () => false, 4600, 3000)), 'camera movement preserves geographic orchard rows');
assert.equal(paper.plantOrchards([orchard], center, () => false, 4600, 20).length, 20, 'orchard detail has a separate bounded allowance within the scenery budget');
const detailedRectangle = [[0, 0], [10, 0], [20, 0], [20, 10], [0, 10], [0, 0]];
const originalRectangle = JSON.stringify(detailedRectangle);
assert.deepEqual(paper.cleanBuildingRing(detailedRectangle), [[0, 0], [20, 0], [20, 10], [0, 10]], 'collinear map vertices must not prevent rectangular roof modelling');
assert.equal(JSON.stringify(detailedRectangle), originalRectangle, 'roof preparation must preserve its mapped source');
const walls = style.layers.find(l => l.id === 'building-3d'), caps = style.layers.find(l => l.id === 'paper-building-caps');
for (const key of ['source', 'source-layer', 'filter']) assert.deepEqual(caps[key], walls[key], 'roof material must use the exact native footprint, including courtyards');
assert.deepEqual(caps.paint['fill-extrusion-base'], walls.paint['fill-extrusion-height'], 'roof material must meet the native walls at their terrain-adjusted top');
assert.deepEqual(caps.paint['fill-extrusion-height'], ['+', walls.paint['fill-extrusion-height'], .3], 'roof material must remain a thin cap rather than a second building');
for (const id of ['paper-fields', 'paper-field-edge-shadow', 'paper-field-edge', 'paper-rock']) {
  assert(style.layers.findIndex(l => l.id === id) < style.layers.findIndex(l => l.id === 'waterway_tunnel'), 'paper ground detail must not paint over streams');
}
const lines = {type: 'FeatureCollection', features: [{type: 'Feature', properties: {}, geometry: {type: 'MultiLineString', coordinates: [[paper.unproject([center[0] - 500, center[1]]), paper.unproject([center[0] + 500, center[1]])]]}}]};
const near = paper.routeIndex(lines);
assert(near(center, 46) && near([center[0] + 501, center[1]], 46), 'include segment interiors and endpoints');
assert(!near([center[0], center[1] + 100], 46), 'a road must not remove woodland outside its corridor');
const route = read('public/trek/route-detail.json'), routeBefore = JSON.stringify(route), recorded = paper.routeIndex(route);
for (const feature of route.features) for (const point of feature.geometry.coordinates.filter((_, i) => i % 100 === 0)) assert(recorded(paper.project(point), 46), 'every sampled recorded path keeps its open corridor');
assert.equal(JSON.stringify(route), routeBefore, 'paper scenery must preserve the approved GPS file');
// Foreground scenery must prepare even while unrelated look-ahead tiles are
// still loading. Exercise the actual scheduling and uploaded vertex format.
let boundBuffer, boundVao, sceneryLayer, modelUploads = 0; const buffers = new Map(), draws = [];
const sceneFeatures = [{...woodland, properties: {class: 'wood', subclass: 'forest'}, geometry: {type: 'Polygon', coordinates: [square(200, 200, 80)]}}];
const gl = new Proxy({STATIC_DRAW: 35044, DYNAMIC_DRAW: 35048,
  getShaderParameter: () => true, getProgramParameter: () => true, isContextLost: () => false,
  createBuffer: () => ({}), bindBuffer: (_target, buffer) => { boundBuffer = buffer; },
  createVertexArray: () => new Map(), bindVertexArray: vao => { boundVao = vao; }, getAttribLocation: (_program, name) => name,
  vertexAttribPointer: (name, size, _type, _normal, stride, offset) => boundVao.set(name, {buffer: boundBuffer, size, stride, offset}),
  vertexAttribDivisor: (name, divisor) => { boundVao.get(name).divisor = divisor; },
  bufferData: (_target, data, usage) => { buffers.set(boundBuffer, {data, usage}); if (usage === gl.STATIC_DRAW) modelUploads++; },
  drawArraysInstanced: (_mode, _first, vertices, instances) => {
    const position = boundVao.get('a_position'), placement = boundVao.get('a_placement'), birth = boundVao.get('a_birth');
    assert.equal(position.divisor, 0, 'model positions advance once per vertex');
    assert.deepEqual([placement.size, placement.stride, placement.offset, placement.divisor], [4, 20, 0, 1], 'position and scale advance once per instance');
    assert.deepEqual([birth.size, birth.stride, birth.offset, birth.divisor], [1, 20, 16, 1], 'each tree retains its own reveal clock');
    assert.equal(buffers.get(position.buffer).data.length, vertices * 6, 'the draw uses the full cached model');
    assert.equal(buffers.get(placement.buffer).data.length, instances * 5, 'instance counts cannot read beyond the uploaded buffer');
    draws.push({vertices, instances});
  },
  deleteBuffer: buffer => buffers.delete(buffer)}, {get: (target, key) => key in target ? target[key] : () => 0});
const placements = () => [...buffers.values()].filter(buffer => buffer.usage === gl.DYNAMIC_DRAW && buffer.data.length).flatMap(buffer => [...buffer.data]);
const brush = new Proxy({getImageData: () => ({width: 128, height: 128, data: new Uint8ClampedArray(128 * 128 * 4)})}, {get: (target, key) => key in target ? target[key] : () => {}});
const oldDocument = globalThis.document;
globalThis.document = {createElement: () => ({getContext: () => brush})};
const handlers = new Map();
const map = {getFilter: () => null, getTerrain: () => ({}), isSourceLoaded: () => false,
  getCenter: () => ({toArray: () => paper.unproject(center)}), queryTerrainElevation: () => 100,
  querySourceFeatures: (_source, options) => options.sourceLayer === 'landcover' ? sceneFeatures : [],
  getCanvas: () => ({getContext: () => gl}), getSource: () => ({setData: () => {}}),
  addLayer: layer => { if (layer.onAdd) { sceneryLayer = layer; layer.onAdd(map, gl); } }, addSource: () => {}, addImage: () => {}, triggerRepaint: () => {},
  on: (event, handler) => handlers.set(event, handler), off: event => handlers.delete(event)};
const scenery = paper.create(map, {type: 'FeatureCollection', features: []});
try {
  scenery.prepare();
  for (let i = 0; scenery.status().building && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
  const first = scenery.status();
  assert(first.updates === 1 && first.trees > 0 && !first.pending && !first.building, 'loaded foreground prepares without waiting for all future source tiles');
  assert.equal(placements().length, first.trees * 5, 'upload one position, scale and reveal clock per tree, rather than expanded geometry');
  for (const {data} of buffers.values()) assert([...data].every(Number.isFinite), 'model vertices, colour, positions and reveal clocks must all remain finite');
  const firstPlacements = placements(), firstBirth = firstPlacements[4], firstModels = modelUploads;
  for (let i = 0; i < firstPlacements.length; i += 5) {
    const [x, y, z, scale] = firstPlacements.slice(i, i + 4);
    const latitude = paper.unproject([center[0] + x, center[1] + y])[1];
    assert(Math.abs(scale - 1 / Math.cos(latitude * Math.PI / 180)) < 1e-6, 'instances retain the original geographic tree scale');
    assert(Math.abs(z - 100 * scale) < 1e-4, 'instances remain rooted at the sampled terrain height');
  }
  sceneryLayer.render(gl, {defaultProjectionData: {mainMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]}});
  assert.equal(draws.reduce((sum, draw) => sum + draw.instances, 0), first.trees, 'draw every planted tree exactly once');
  assert.equal(draws.reduce((sum, draw) => sum + draw.vertices * draw.instances, 0), first.vertices, 'instancing retains the full seeded geometry, without thinning the forest');
  scenery.prepare();
  for (let i = 0; scenery.status().building && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(placements(), firstPlacements, 'rebuilding visible trees must preserve their positions, scale and entrance clocks');
  assert.equal(modelUploads, firstModels, 'moving scenery reuses the uploaded tree models');
  assert.equal(scenery.status().uploadBytes, first.trees * 20, 'a woodland refresh uploads only twenty bytes per tree');
  assert.equal(scenery.status().trees, first.trees, 'a source refresh must not shuffle foreground woodland');
  assert(scenery.status().fading, 'preparation exposes any remaining entrance fade to the playback gate');
  sceneFeatures.push({...sceneFeatures[0], geometry: {type: 'Polygon', coordinates: [square(500, 500, 80)]}});
  scenery.prepare();
  for (let i = 0; scenery.status().building && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
  const birthTimes = placements().filter((_, i) => i % 5 === 4);
  assert.equal(Math.min(...birthTimes), firstBirth, 'new tiles preserve the old scene entrance times');
  assert(Math.max(...birthTimes) > firstBirth && scenery.status().trees > first.trees, 'newly loaded trees receive a later soft entrance rather than appearing fully opaque');
  sceneFeatures.length = 0; scenery.prepare();
  for (let i = 0; scenery.status().building && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
  draws.length = 0;
  sceneryLayer.render(gl, {defaultProjectionData: {mainMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]}});
  assert.equal(scenery.status().trees, 0, 'seeking out of woodland removes the previous trees');
  assert.equal(draws.length, 0, 'unused cached models must never draw stale instances');
} finally { scenery.destroy(); sceneryLayer.onRemove(map, gl); globalThis.document = oldDocument; }
assert.equal(buffers.size, 0, 'removing the scenery releases both model and instance buffers');
console.log('Paper scenery checks passed: mapped fields, valid styles, anchored woodland, stable instanced geometry, reused GPU models, bounded density, mapped orchard rows, clear route corridors and nonblocking foreground preparation.');
