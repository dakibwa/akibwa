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
console.log('Paper scenery checks passed: mapped fields, valid styles, anchored woodland, holes, stable placement, tile deduplication, bounded density and clear route corridors.');
