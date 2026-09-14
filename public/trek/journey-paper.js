/* Paper scenery follows current mapped land cover and building footprints.
 * Individual trees and roof forms are illustrative; the terrain and route stay real. */
(function (host) {
  'use strict';
  const WORLD = 40075016.68557849, TAU = Math.PI * 2, MAX_VERTICES = 2400000;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const collection = features => ({type: 'FeatureCollection', features});
  const project = ([lng, lat]) => [WORLD * (lng / 360 + .5), WORLD * (.5 - Math.asinh(Math.tan(lat * Math.PI / 180)) / TAU)];
  const unproject = ([x, y]) => [(x / WORLD - .5) * 360, Math.atan(Math.sinh((.5 - y / WORLD) * TAU)) * 180 / Math.PI];
  const random = (x, y, salt = 0) => {
    let h = Math.imul(x ^ 0x45d9f3b, 374761393) ^ Math.imul(y ^ salt, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const inRing = (p, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  };
  const inPolygon = (p, rings) => inRing(p, rings[0]) && !rings.slice(1).some(r => inRing(p, r));
  const polygons = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const segmentDistance = (p, a, b) => {
    const x = b[0] - a[0], y = b[1] - a[1], t = clamp(((p[0] - a[0]) * x + (p[1] - a[1]) * y) / (x * x + y * y || 1), 0, 1);
    return Math.hypot(p[0] - a[0] - t * x, p[1] - a[1] - t * y);
  };
  function* routeIndexSteps(route) {
    const cells = new Map(), size = 240; let checked = 0;
    for (const feature of route.features) {
      const lines = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [];
      for (const line of lines) {
        const points = line.map(project);
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          for (let x = Math.floor((Math.min(a[0], b[0]) - 55) / size); x <= Math.floor((Math.max(a[0], b[0]) + 55) / size); x++) {
            for (let y = Math.floor((Math.min(a[1], b[1]) - 55) / size); y <= Math.floor((Math.max(a[1], b[1]) + 55) / size); y++) {
              if (++checked % 256 === 0) yield;
              const key = x + ':' + y; if (!cells.has(key)) cells.set(key, []); cells.get(key).push([a, b]);
            }
          }
        }
      }
    }
    return (p, width) => (cells.get(Math.floor(p[0] / size) + ':' + Math.floor(p[1] / size)) || []).some(([a, b]) => segmentDistance(p, a, b) < width);
  }
  function routeIndex(route) {
    const work = routeIndexSteps(route); let next;
    do { next = work.next(); } while (!next.done);
    return next.value;
  }
  // Keep a nested geographic grid: every distant tree is also present in the
  // close grid. Share the allowance across the woodland instead of filling a
  // dense disk at the camera and cutting off everything beyond it.
  function* woodlandSteps(features, center, excluded, radius = 4600, limit = 6500) {
    const trees = new Map(), step = 32, farStride = 4;
    let checked = 0;
    for (const feature of features) for (const coordinates of polygons(feature.geometry)) {
      const rings = coordinates.map(r => r.map(project)), ring = rings[0]; if (!ring?.length) continue;
      const bounds = ring.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
      for (const [stride, reach] of [[farStride, radius], [1, Math.min(2000, radius)]]) {
        const left = Math.floor(Math.max(bounds[0], center[0] - reach) / (step * stride)) * stride, right = Math.ceil(Math.min(bounds[2], center[0] + reach) / step);
        const top = Math.floor(Math.max(bounds[1], center[1] - reach) / (step * stride)) * stride, bottom = Math.ceil(Math.min(bounds[3], center[1] + reach) / step);
        for (let x = left; x <= right; x += stride) for (let y = top; y <= bottom; y += stride) {
          if (++checked % 128 === 0) yield;
          const p = [(x + .2 + random(x, y) * .6) * step, (y + .2 + random(x, y, 19) * .6) * step];
          const d = Math.hypot(p[0] - center[0], p[1] - center[1]), key = x + ':' + y;
          if (d > reach || trees.has(key) || !inPolygon(p, rings) || excluded(p)) continue;
          trees.set(key, {p, seed: random(x, y, 87), d, priority: random(x, y, 773)});
        }
      }
    }
    return [...trees.values()].sort((a, b) => a.priority - b.priority).slice(0, limit).sort((a, b) => a.d - b.d);
  }
  function plantWoodland(features, center, excluded, radius = 4600, limit = 6500) {
    const work = woodlandSteps(features, center, excluded, radius, limit);
    let next; do { next = work.next(); } while (!next.done);
    return next.value;
  }
  const sceneryRadius = zoom => clamp(4600 * 2 ** ((13.4 - zoom) * .65), 4600, 14000);
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const greens = ['#546d48', '#667d52', '#405e43', '#7c8d5f', '#4e6846'].map(rgb);
  const roofs = ['#af7353', '#a78868', '#bf8f6e', '#7e8774', '#b17b5f'].map(rgb);
  const patch = ['%', ['floor', ['/', ['to-number', ['id'], 0], 10]], 5];
  const crops = ['any',
    ['match', ['get', 'class'], ['farmland', 'farm', 'orchard', 'vineyard'], true, false],
    ['match', ['get', 'subclass'], ['farmland', 'farm', 'orchard', 'vineyard', 'plant_nursery'], true, false]];
  const pasture = ['all', ['==', ['get', 'class'], 'grass'],
    ['match', ['get', 'subclass'], ['grass', 'grassland', 'meadow', 'pasture'], true, false]];
  const fields = ['any', crops, pasture];
  const orchard = properties => ['orchard', 'plant_nursery'].includes(properties?.subclass || properties?.class);

  // Small crowns illustrate only explicitly mapped orchards and nurseries.
  // The fixed geographic rows and clipped holes survive tile/view changes.
  function* orchardSteps(features, center, excluded, radius = 4600, limit = 500) {
    const trees = new Map(), step = 44; let checked = 0;
    for (const feature of features.filter(item => orchard(item.properties))) for (const coordinates of polygons(feature.geometry)) {
      const rings = coordinates.map(r => r.map(project)), ring = rings[0]; if (!ring?.length) continue;
      const bounds = ring.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
      for (let x = Math.floor(Math.max(bounds[0], center[0] - radius) / step); x <= Math.ceil(Math.min(bounds[2], center[0] + radius) / step); x++) {
        for (let y = Math.floor(Math.max(bounds[1], center[1] - radius) / step); y <= Math.ceil(Math.min(bounds[3], center[1] + radius) / step); y++) {
          if (++checked % 128 === 0) yield;
          const p = [(x + .5) * step, (y + .5) * step], d = Math.hypot(p[0] - center[0], p[1] - center[1]), key = x + ':' + y;
          if (d > radius || trees.has(key) || !inPolygon(p, rings) || excluded(p)) continue;
          trees.set(key, {p, d, seed: .7 + random(x, y, 601) * .28, sizeScale: .48 + random(x, y, 619) * .14});
        }
      }
    }
    return [...trees.values()].sort((a, b) => a.d - b.d).slice(0, limit);
  }
  function plantOrchards(features, center, excluded, radius = 4600, limit = 500) {
    const work = orchardSteps(features, center, excluded, radius, limit); let next;
    do { next = work.next(); } while (!next.done);
    return next.value;
  }

  // Geometry is made in metres before placement. Each tree keeps its seeded
  // silhouette and fold detail, even when the camera crosses a rebuild boundary.
  function treeMesh(seed, detailed = true) {
    const faces = [], pine = seed < .68, height = 18 + seed * 13, width = 10 + seed * 5.5;
    const face = (a, b, c, tone = 1, bark = false) => faces.push({a, b, c, tone, bark});
    const ring = (x, y, z, radius, sides, angle = seed * TAU) => Array.from({length: sides}, (_, i) => {
      const a = angle + i * TAU / sides, varied = radius * (i % 2 ? .92 : 1.04);
      return [x + Math.cos(a) * varied, y + Math.sin(a) * varied, z];
    });
    const trunk = ring(0, 0, 0, .65, 4), trunkTop = [0, 0, height * .8];
    for (let i = 0; i < 4; i++) face(trunk[i], trunk[(i + 1) % 4], trunkTop, .78, true);
    if (pine) {
      const tiers = [[.13, .59, 1], [.31, .76, .88], [.49, .9, .69], [.67, 1, .46], [.83, 1.07, .25]];
      const sides = detailed ? 7 : 5;
      for (const [base, peak, spread] of tiers) {
        const skirt = ring(0, 0, height * base, width * spread, sides), tip = [width * (seed - .34) * .16, 0, height * peak];
        for (let i = 0; i < sides; i++) {
          face(skirt[i], skirt[(i + 1) % sides], tip, 1);
          if (detailed) face(skirt[(i + 1) % sides], skirt[i], [0, 0, height * (base + .06)], .66);
        }
      }
    } else {
      const lobes = [[0, 0, .71, 1], [-.43, .18, .62, .72], [.38, -.18, .85, .65]];
      const sides = detailed ? 6 : 5;
      for (const [x, y, z, scale] of lobes) {
        const lower = ring(x * width, y * width, height * (z - .2 * scale), width * .55 * scale, sides);
        const middle = ring(x * width, y * width, height * z, width * scale, sides);
        const upper = ring(x * width, y * width, height * (z + .16 * scale), width * .6 * scale, sides);
        for (let i = 0; i < sides; i++) {
          const j = (i + 1) % sides;
          face(lower[i], lower[j], middle[i], .85); face(lower[j], middle[j], middle[i], .85);
          face(middle[i], middle[j], upper[i]); face(middle[j], upper[j], upper[i]);
          face(upper[i], upper[j], [x * width, y * width, height * (z + .25 * scale)]);
          if (detailed) face(lower[j], lower[i], [x * width, y * width, height * (z - .31 * scale)], .67);
        }
      }
    }
    return {faces, height, width, pine};
  }

  function cleanBuildingRing(points) {
    const ring = points.map(p => [...p]);
    if (ring.length > 1 && Math.hypot(ring[0][0] - ring.at(-1)[0], ring[0][1] - ring.at(-1)[1]) < .01) ring.pop();
    let changed = true;
    while (changed && ring.length > 3) {
      changed = false;
      for (let i = 0; i < ring.length; i++) {
        if (segmentDistance(ring[i], ring[(i + ring.length - 1) % ring.length], ring[(i + 1) % ring.length]) < .18) {
          ring.splice(i, 1); changed = true; break;
        }
      }
    }
    return ring;
  }
  function faceLight(a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nz < 0) { nx *= -1; ny *= -1; nz *= -1; }
    return .68 + .35 * Math.max(0, (-nx * .45 - ny * .55 + nz * .7) / (Math.hypot(nx, ny, nz) || 1));
  }

  function style(base) {
    const copy = JSON.parse(JSON.stringify(base));
    copy.name = 'Trek paper landscape';
    for (const layer of copy.layers) {
      const id = layer.id, paint = layer.paint || (layer.paint = {});
      if (layer.type === 'symbol' || /boundary|park_outline|natural_earth/.test(id)) layer.layout = {...layer.layout, visibility: 'none'};
      if (id === 'background') paint['background-color'] = '#d6d7b6';
      if (id === 'park') Object.assign(paint, {'fill-color': '#a6b68b', 'fill-opacity': .25, 'fill-outline-color': '#a6b68b'});
      if (id === 'landcover_wood') Object.assign(paint, {'fill-color': ['match', patch, 0, '#7e9268', 1, '#89996e', 2, '#768d65', 3, '#91a176', '#80956b'], 'fill-opacity': .94, 'fill-antialias': true});
      if (id === 'landcover_grass') Object.assign(paint, {'fill-color': ['match', ['get', 'subclass'], 'meadow', '#b4bd8e', 'grassland', '#c2c698', 'heath', '#aaa97e', 'scrub', '#a5b183', ['match', patch, 0, '#b8c493', 1, '#c8c89b', 2, '#aebb87', 3, '#cdcca3', '#b8c295']], 'fill-opacity': .94, 'fill-antialias': true});
      if (id === 'landcover_ice') Object.assign(paint, {'fill-color': '#f1eddb', 'fill-opacity': .95});
      if (id === 'landcover_sand') paint['fill-color'] = '#dbca9b';
      if (id === 'landcover_wetland') { delete paint['fill-pattern']; paint['fill-color'] = '#afbea2'; }
      if (/landuse_/.test(id)) paint['fill-color'] = /residential|hospital|school/.test(id) ? '#e0d8be' : '#c5cba6';
      if (id === 'water') Object.assign(paint, {'fill-color': '#8bb6bd', 'fill-outline-color': '#70999e'});
      if (layer['source-layer'] === 'waterway' && layer.type === 'line') paint['line-color'] = '#7aa7b3';
      if (layer['source-layer'] === 'transportation' && layer.type === 'line') {
        const small = /path_pedestrian|service_track/.test(id), casing = /casing/.test(id);
        delete paint['line-dasharray']; delete paint['line-gap-width'];
        Object.assign(paint, {
          'line-color': casing ? '#bfbca0' : '#f2ebd1',
          'line-opacity': /rail/.test(id) ? .16 : casing ? .24 : small ? .34 : .85,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, small ? .3 : .6, 15, small ? .7 : casing ? 2.8 : 1.7, 18, small ? 1.4 : casing ? 5 : 3.7]
        });
      }
      if (id === 'building') Object.assign(paint, {'fill-color': '#ded6bb', 'fill-outline-color': '#bcb59a'});
      if (id === 'building-3d') {
        layer.minzoom = 12;
        Object.assign(paint, {'fill-extrusion-color': '#eee4c9', 'fill-extrusion-height': ['max', 9, ['*', 1.2, ['coalesce', ['get', 'render_height'], 6]]], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': false});
      }
    }
    // The native extrusion pipeline anchors this thin roof material to exactly
    // the same terrain samples as its walls, including complex outlines/holes.
    const building = copy.layers.find(l => l.id === 'building-3d'), wallHeight = building.paint['fill-extrusion-height'];
    copy.layers.splice(copy.layers.indexOf(building) + 1, 0, {
      ...JSON.parse(JSON.stringify(building)), id: 'paper-building-caps',
      paint: {...building.paint, 'fill-extrusion-color': ['match', patch, 0, '#af7353', 1, '#a78868', 2, '#bf8f6e', 3, '#7e8774', '#b17b5f'],
        'fill-extrusion-base': wallHeight, 'fill-extrusion-height': ['+', wallHeight, .3]}
    });
    // Keep streams above all paper ground treatments. Their width is a visual
    // aid at the travelling camera height, not a surveyed channel measurement.
    copy.layers = copy.layers.flatMap(layer => {
      if (layer['source-layer'] !== 'waterway' || layer.type !== 'line' || layer.id.includes('tunnel')) return [layer];
      const river = layer.id === 'waterway_river';
      const width = (scale = 1, margin = 0) => ['interpolate', ['linear'], ['zoom'],
        10, (river ? 1 : .5) * scale + margin,
        13, (river ? 3.8 : 2.2) * scale + margin,
        15, (river ? 7 : 4.4) * scale + margin,
        18, (river ? 14 : 8) * scale + margin];
      layer.layout = {...layer.layout, 'line-cap': 'round', 'line-join': 'round'};
      Object.assign(layer.paint, {'line-color': '#7aa7b3', 'line-opacity': 1, 'line-width': width()});
      const bank = {...layer, id: 'paper-' + layer.id + '-bank', paint: {'line-color': '#d4cfb1', 'line-opacity': .95, 'line-width': width(1, 2.2)}};
      const light = {...layer, id: 'paper-' + layer.id + '-light', paint: {'line-color': '#c3ddda', 'line-opacity': .5, 'line-width': width(.22)}};
      return [bank, layer, light];
    });
    const lake = copy.layers.find(l => l.id === 'water');
    copy.layers.splice(copy.layers.indexOf(lake), 0, {
      id: 'paper-water-bank', type: 'line', source: lake.source, 'source-layer': lake['source-layer'], filter: lake.filter,
      layout: {'line-join': 'round'}, paint: {'line-color': '#d4cfb1', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, .7, 15, 3, 18, 5], 'line-opacity': .85}
    });
    copy.layers.splice(copy.layers.findIndex(l => l.id === 'waterway_tunnel'), 0, {
      id: 'paper-fields', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
      filter: crops,
      paint: {'fill-color': ['match', ['get', 'subclass'], 'orchard', '#a4b082', 'vineyard', '#adb58b', ['match', patch, 0, '#c6ad77', 1, '#d5c28b', 2, '#a9b481', 3, '#decb98', '#bdc090']], 'fill-opacity': .95, 'fill-outline-color': '#e4d6b0'}
    }, {
      id: 'paper-rock', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'rock'],
      paint: {'fill-color': ['match', patch, 0, '#c2be9f', 1, '#d3cdb3', 2, '#bcbda4', 3, '#ddd6bc', '#cec9ad'], 'fill-opacity': .95}
    });
    const fieldEdge = copy.layers.findIndex(l => l.id === 'paper-rock');
    copy.layers.splice(fieldEdge, 0, {
      id: 'paper-field-edge-shadow', type: 'line', source: 'openmaptiles', 'source-layer': 'landcover', filter: fields,
      layout: {'line-join': 'round'}, paint: {'line-color': '#727c52', 'line-opacity': .34, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, .5, 15, 2.9, 18, 5.2], 'line-offset': .9}
    }, {
      id: 'paper-field-edge', type: 'line', source: 'openmaptiles', 'source-layer': 'landcover', filter: fields,
      layout: {'line-join': 'round'}, paint: {'line-color': '#f1e6c4', 'line-opacity': .82, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, .35, 15, 1.25, 18, 2.2]}
    });
    copy.light = {anchor: 'map', color: '#fff5df', intensity: .35, position: [1.5, 315, 45]};
    return copy;
  }

  function landmarkBuildingIds(features, landmarks) {
    return features.filter(feature => feature.id !== undefined && landmarks.some(item => {
      const parts = polygons(feature.geometry), ring = item.footprint.map(project);
      return parts.length && parts.every(part => part[0].every(point => inPolygon(project(point), [ring])));
    })).map(feature => feature.id);
  }

  // Shared by the browser fallback and the offline scene build. No DOM or GPU work.
  function* compileScene({center, radius, features, heightAt, nearRoute, landmarks = [], landmarkAPI = host.TrekLandmarks, treeModels = new Map(), births = new Map(), started = 0, solidBuildings = false, triangulate = null}) {
      let buildings = [], nearbyLandmarks = [], candidates = [], roofCandidates = [], coverCounts = {}, coverWithIds = 0;
      function* prepareSteps() {
        const landcover = features('landcover'); yield;
        const woodland = landcover.filter(feature => feature.properties?.class === 'wood' && !orchard(feature.properties));
        coverCounts = {}; coverWithIds = 0;
        for (const feature of landcover) {
          const key = feature.properties?.class + '/' + (feature.properties?.subclass || '');
          coverCounts[key] = (coverCounts[key] || 0) + 1; if (feature.id !== undefined) coverWithIds++;
        }
        buildings = features('building'); yield;
        const roads = features('transportation'); yield;
        const nearRoad = yield* routeIndexSteps(collection(roads));
        const waterways = features('waterway').filter(f => f.properties?.brunnel !== 'tunnel'); yield;
        const nearWater = yield* routeIndexSteps(collection(waterways));
        nearbyLandmarks = landmarks.filter(item => Math.hypot(...project(item.point).map((v, i) => v - center[i])) < radius - 250);
        const landmarkGround = nearbyLandmarks.map(item => landmarkAPI.displayFootprint(item).map(project));
        const withinLandmark = p => landmarkGround.some(ring => inPolygon(p, [ring]));
        const excluded = p => nearRoute(p, 46) || nearRoad(p, 32) || nearWater(p, 32) || withinLandmark(p);
        const orchardCandidates = yield* orchardSteps(landcover, center, excluded);
        const woodlandCandidates = yield* woodlandSteps(woodland, center, excluded, radius, 6500 - orchardCandidates.length);
        candidates = [...woodlandCandidates, ...orchardCandidates].sort((a, b) => a.d - b.d);
        const houses = new Map(); let checked = 0;
        for (const feature of buildings) for (const polygon of polygons(feature.geometry)) {
          if (++checked % 32 === 0) yield;
          const ring = cleanBuildingRing(polygon[0].map(project));
          if (ring.length < 3 || ring.length > 80) continue;
          const p = [ring.reduce((a, v) => a + v[0], 0) / ring.length, ring.reduce((a, v) => a + v[1], 0) / ring.length], d = Math.hypot(p[0] - center[0], p[1] - center[1]);
          if (d > radius || withinLandmark(p) || ring.some(a => Math.hypot(a[0] - p[0], a[1] - p[1]) > 180)) continue;
          const key = p.map(n => Math.round(n)).join(':');
          if (!houses.has(key)) houses.set(key, {ring, rings: polygon.map(r => cleanBuildingRing(r.map(project))), p, d, courtyard: polygon.length > 1, height: Math.max(9, 1.2 * (+feature.properties.render_height || 6))});
        }
        roofCandidates = [...houses.values()].sort((a, b) => a.d - b.d).slice(0, 1800);
      }
      // Feature preparation, terrain work and geometry all share short chunks.
      // Native source queries run once per refresh, never during camera frames.
      yield* prepareSteps();
      const vertices = [], shadows = [], instances = new Map(), nextOrigin = center;
      let madeTrees = 0, madeTreeVertices = 0, madeRoofs = 0, madeOrchards = 0, vertexLimit = (MAX_VERTICES - 30000) * 7, activeBirth = started; const madeLandmarks = [], nextBirths = new Map();
      function reveal(key) {
        activeBirth = births.get(key) ?? started; nextBirths.set(key, activeBirth);
      }
      const vertex = (p, height) => {
        const cos = Math.cos(unproject(p)[1] * Math.PI / 180);
        return [p[0] - nextOrigin[0], p[1] - nextOrigin[1], height / cos];
      };
      function triangle(a, b, c, color, fixedLight) {
        if (vertices.length + madeTreeVertices * 7 + 21 > vertexLimit) return;
        const light = fixedLight || faceLight(a, b, c);
        for (const p of [a, b, c]) vertices.push(...p, ...color.map(x => Math.min(1, x * light)), activeBirth);
      }
      function tree({p, seed, sizeScale = 1}) {
        const ground = heightAt(p); if (!Number.isFinite(ground)) return;
        reveal('tree:' + p.join(':'));
        const scale = 1 / Math.cos(unproject(p)[1] * Math.PI / 180), variant = Math.floor(seed * 96), detailed = random(Math.floor(p[0]), Math.floor(p[1]), 119) > .5, key = variant * 2 + Number(detailed);
        if (!treeModels.has(key)) {
          const model = treeMesh((variant + .5) / 96, detailed), color = greens[Math.floor((variant + .5) / 96 * greens.length)], bark = rgb('#827557'), data = [];
          for (const face of model.faces) {
            const light = faceLight(face.a, face.b, face.c) * face.tone, tint = (face.bark ? bark : color).map(c => Math.min(1, c * light));
            for (const v of [face.a, face.b, face.c]) data.push(...v, ...tint);
          }
          treeModels.set(key, {width: model.width, height: model.height, data: new Float32Array(data)});
        }
        const mesh = treeModels.get(key), size = mesh.width * sizeScale, h = mesh.height * sizeScale, data = mesh.data, x = p[0] - nextOrigin[0], y = p[1] - nextOrigin[1];
        if (vertices.length + (madeTreeVertices + data.length / 6) * 7 > vertexLimit) return;
        if (!instances.has(key)) instances.set(key, []);
        instances.get(key).push(x, y, ground * scale, scale * sizeScale, activeBirth);
        madeTreeVertices += data.length / 6;
        const shadow = [[p[0] - size * scale, p[1]], [p[0], p[1] - size * .5 * scale], [p[0] + h * .8 * scale, p[1] + h * .9 * scale], [p[0], p[1] + size * .6 * scale]];
        shadows.push({type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[...shadow.map(unproject), unproject(shadow[0])]]}});
        madeTrees++; if (sizeScale < 1) madeOrchards++;
      }
      function roof({ring, rings, p, height, d: distance, courtyard}) {
        const ground = heightAt(p); if (!Number.isFinite(ground)) return;
        reveal('roof:' + p.map(n => Math.round(n)).join(':'));
        const sides = ring.map((a, i) => Math.hypot(a[0] - ring[(i + 1) % ring.length][0], a[1] - ring[(i + 1) % ring.length][1]));
        const local = ring.map(v => [v[0] - p[0], v[1] - p[1]]);
        const area = local.reduce((n, v, i) => n + v[0] * local[(i + 1) % local.length][1] - v[1] * local[(i + 1) % local.length][0], 0) / 2;
        if (Math.abs(area) < 16) return;
        const scale = 1 / Math.cos(unproject(p)[1] * Math.PI / 180), top = ground + height + .12;
        const color = roofs[Math.floor(random(Math.floor(p[0]), Math.floor(p[1])) * roofs.length)];
        if (solidBuildings) {
          const tint = rgb('#c3b59b');
          for (const boundary of rings) for (let i = 0; i < boundary.length; i++) {
            const a = boundary[i], b = boundary[(i + 1) % boundary.length], za = heightAt(a), zb = heightAt(b);
            if (!Number.isFinite(za) || !Number.isFinite(zb)) continue;
            const av = vertex(a, Math.min(za, ground) - 2), bv = vertex(b, Math.min(zb, ground) - 2), at = vertex(a, top), bt = vertex(b, top);
            triangle(av, bv, at, tint); triangle(bv, bt, at, tint);
          }
          if (triangulate) {
            const flat = rings.flat(), holes = []; let offset = rings[0].length;
            for (const hole of rings.slice(1)) { holes.push(offset); offset += hole.length; }
            const indices = triangulate(flat.flat(), holes, 2);
            for (let i = 0; i < indices.length; i += 3) triangle(...indices.slice(i, i + 3).map(n => vertex(flat[n], top)), color);
          }
        }
        // A simplified rectangle can carry a gable. The native roof material
        // follows every other mapped outline, including courtyard holes.
        if (!courtyard && ring.length === 4 && height < 25 && Math.min(...sides) >= 4 && Math.max(...sides) / Math.min(...sides) <= 5 && Math.abs(area) / (sides[0] * sides[1]) >= .86) {
          const start = sides[0] < sides[1] ? 0 : 1, a = ring[start], b = ring[(start + 1) % 4], c = ring[(start + 2) % 4], d = ring[(start + 3) % 4];
          const peak = top + clamp(Math.min(...sides) / scale * .36, 3, 9);
          const u = vertex([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], peak), v = vertex([(c[0] + d[0]) / 2, (c[1] + d[1]) / 2], peak);
          const [av, bv, cv, dv] = [a, b, c, d].map(p => vertex(p, top));
          triangle(av, dv, u, color); triangle(dv, v, u, color); triangle(bv, u, cv, color); triangle(cv, u, v, color);
          triangle(av, u, bv, rgb('#eee4c9')); triangle(dv, cv, v, rgb('#eee4c9')); madeRoofs++;
        }
        if (distance > 1750) return;
        const wall = rgb('#c0ae89'), window = rgb('#7e8b80');
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], b = ring[(i + 1) % ring.length], length = sides[i]; if (length < 3) continue;
          const dx = (b[0] - a[0]) / length, dy = (b[1] - a[1]) / length, sign = area > 0 ? 1 : -1;
          const at = (along, h) => vertex([a[0] + dx * along + dy * sign * .12 * scale, a[1] + dy * along - dx * sign * .12 * scale], ground + h);
          const panel = (left, right, low, high, tint) => {
            const v = [at(left, low), at(right, low), at(right, high), at(left, high)];
            triangle(v[0], v[1], v[2], tint); triangle(v[0], v[2], v[3], tint);
          };
          panel(0, length, height - .4, height + .12, wall);
          const bays = Math.min(8, Math.floor(length / scale / 5)), floors = Math.min(3, Math.floor(height / 4));
          for (let row = 0; row < floors; row++) for (let bay = 0; bay < bays; bay++) {
            const middle = (bay + .5) * length / bays, h = 2 + row * 3.1;
            panel(middle - .55 * scale, middle + .55 * scale, h, h + 1.45, window);
          }
        }
      }
      function landmark(item) {
        const p = project(item.point), ground = heightAt(p); if (!Number.isFinite(ground)) return;
        vertexLimit = MAX_VERTICES * 7; reveal('landmark:' + item.id);
        const scale = 1 / Math.cos(item.point[1] * Math.PI / 180);
        const positioned = ([x, y, z]) => vertex([p[0] + x * scale, p[1] + y * scale], ground + z);
        for (const face of landmarkAPI.mesh(item)) triangle(positioned(face.a), positioned(face.b), positioned(face.c), rgb(face.color));
        shadows.push({type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [landmarkAPI.displayFootprint(item)]}});
        madeLandmarks.push(item.id);
      }
      for (const candidate of candidates) { tree(candidate); yield; }
      for (const candidate of roofCandidates) { roof(candidate); yield; }
      for (const item of nearbyLandmarks) { landmark(item); yield; }
      const folds = yield* foldSteps(center, radius, heightAt);
      return {vertices: new Float32Array(vertices), instances, treeModels, shadows: collection(shadows), folds, origin: center, radius, trees: madeTrees, treeVertices: madeTreeVertices, roofs: madeRoofs, orchards: madeOrchards, births: nextBirths, landmarks: madeLandmarks, hiddenBuildings: landmarkBuildingIds(buildings, nearbyLandmarks.filter(item => madeLandmarks.includes(item.id))), coverCounts, coverWithIds};
  }
    function* foldSteps(center, reach, heightAt) {
      const step = reach > 6500 ? 420 : 210, nodes = new Map(), folds = [];
      function node(x, y) {
        const key = x + ':' + y;
        if (!nodes.has(key)) {
          const p = [(x + (random(x, y, 42) - .5) * .42) * step, (y + (random(x, y, 98) - .5) * .42) * step];
          const ll = unproject(p), z = heightAt(p);
          nodes.set(key, Number.isFinite(z) ? {p, ll, z: z / Math.cos(ll[1] * Math.PI / 180)} : null);
        }
        return nodes.get(key);
      }
      function fold(a, b, c) {
        if (!a || !b || !c) return;
        const ux = b.p[0] - a.p[0], uy = b.p[1] - a.p[1], uz = b.z - a.z, vx = c.p[0] - a.p[0], vy = c.p[1] - a.p[1], vz = c.z - a.z;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (nz < 0) { nx *= -1; ny *= -1; nz *= -1; }
        const shade = (-nx * .45 - ny * .55 + nz * .7) / Math.hypot(nx, ny, nz) - .7;
        const d = Math.hypot((a.p[0] + b.p[0] + c.p[0]) / 3 - center[0], (a.p[1] + b.p[1] + c.p[1]) / 3 - center[1]);
        const opacity = clamp(Math.abs(shade) * .42, 0, .22) * clamp((reach - d) / 900, 0, 1);
        if (opacity < .008) return;
        folds.push({type: 'Feature', properties: {color: shade < 0 ? '#526544' : '#fff0cf', opacity}, geometry: {type: 'Polygon', coordinates: [[a.ll, b.ll, c.ll, a.ll]]}});
      }
      for (let x = Math.floor((center[0] - reach) / step); x < Math.ceil((center[0] + reach) / step); x++) {
        for (let y = Math.floor((center[1] - reach) / step); y < Math.ceil((center[1] + reach) / step); y++) {
          const a = node(x, y), b = node(x + 1, y), c = node(x + 1, y + 1), d = node(x, y + 1);
          if ((x + y) % 2) { fold(a, b, d); fold(b, c, d); } else { fold(a, b, c); fold(a, c, d); }
        }
        yield;
      }
      return collection(folds);
    }
  function create(map, route, landmarks = [], prepared = null) {
    const nearRoute = routeIndex(route);
    let origin = [0, 0], lastCenter = null, generation = 0, timer = 0, pending = false, building = false, destroyed = false;
    let preparedActive = false, preparedKey = null, compilations = 0, lastShadows = null, lastFolds = null;
    let sceneRadius = 4600, lastBuildAt = -Infinity, lastZoom = 0, maxChunkMs = 0;
    let landmarkNames = []; const hiddenBuildings = new Set(), originalBuildingFilter = map.getFilter('building-3d'), treeModels = new Map();
    let buffer, shader, treeShader, vao, appeared = 0, count = 0, treeVertices = 0, treeCount = 0, roofCount = 0, orchardCount = 0, updates = 0, buildMs = 0, uploadBytes = 0;
    let births = new Map(), fadeUntil = 0, coverCounts = {}, coverWithIds = 0;
    const shaderSource = {
      vertex: (instanced = false) => `#version 300 es
        precision highp float;
        uniform mat4 u_matrix;
        uniform vec2 u_center;
        uniform float u_radius;
        uniform float u_opacity;
        uniform float u_time;
        in float a_birth;
        in vec3 a_position;
        in vec3 a_color;
        ${instanced ? 'in vec4 a_placement;' : ''}
        out vec3 v_color;
        out float v_fade;
        void main() {
          vec3 position = ${instanced ? 'a_placement.xyz + a_position * a_placement.w' : 'a_position'};
          gl_Position = u_matrix * vec4(position, 1.0);
          v_color = a_color;
          float reveal = clamp((u_time - a_birth) / 700.0, 0.0, 1.0);
          v_fade = u_opacity * reveal * reveal * (3.0 - 2.0 * reveal) * (1.0 - smoothstep(u_radius * .74, u_radius * .99, distance(position.xy, u_center)));
        }`,
      fragment: `#version 300 es
        precision highp float;
        in vec3 v_color;
        in float v_fade;
        out vec4 fragColor;
        void main() {
          if (v_fade < 0.015) discard;
          fragColor = vec4(v_color * v_fade, v_fade);
        }`
    };
    function compile(gl, type, code) {
      const result = gl.createShader(type); gl.shaderSource(result, code); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(result));
      return result;
    }
    function program(gl, instanced = false) {
      const vertex = compile(gl, gl.VERTEX_SHADER, shaderSource.vertex(instanced)), fragment = compile(gl, gl.FRAGMENT_SHADER, shaderSource.fragment);
      const handle = gl.createProgram(); gl.attachShader(handle, vertex); gl.attachShader(handle, fragment); gl.linkProgram(handle);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(handle));
      return {handle, matrix: gl.getUniformLocation(handle, 'u_matrix'), center: gl.getUniformLocation(handle, 'u_center'), radius: gl.getUniformLocation(handle, 'u_radius'), opacity: gl.getUniformLocation(handle, 'u_opacity'), time: gl.getUniformLocation(handle, 'u_time')};
    }
    function attribute(gl, program, name, size, stride, offset, divisor = 0) {
      const location = gl.getAttribLocation(program.handle, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset); gl.vertexAttribDivisor(location, divisor);
    }
    function uploadTrees(gl, instances) {
      let bytes = 0;
      for (const [key, mesh] of treeModels) {
        const placements = instances.get(key);
        mesh.count = placements ? placements.length / 5 : 0;
        if (!mesh.count) continue;
        // Keep every seeded silhouette on the GPU. Moving the camera uploads
        // only terrain position, scale and entrance time for each tree.
        if (!mesh.buffer) {
          mesh.buffer = gl.createBuffer(); mesh.instances = gl.createBuffer(); mesh.vao = gl.createVertexArray();
          gl.bindVertexArray(mesh.vao); gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer); gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
          bytes += mesh.data.byteLength;
          attribute(gl, treeShader, 'a_position', 3, 24, 0); attribute(gl, treeShader, 'a_color', 3, 24, 12);
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instances);
          attribute(gl, treeShader, 'a_placement', 4, 20, 0, 1); attribute(gl, treeShader, 'a_birth', 1, 20, 16, 1);
        }
        const data = new Float32Array(placements);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instances); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); bytes += data.byteLength;
      }
      gl.bindVertexArray(null);
      return bytes;
    }
    const layer = {
      id: 'paper-scenery', type: 'custom', renderingMode: '3d',
      onAdd(_, gl) {
        shader = program(gl); treeShader = program(gl, true);
        buffer = gl.createBuffer(); vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        for (const [name, offset] of [['a_position', 0], ['a_color', 12], ['a_birth', 24]]) {
          attribute(gl, shader, name, name === 'a_birth' ? 1 : 3, 28, offset);
        }
        gl.bindVertexArray(null);
      },
      render(gl, args) {
        if (!count && !treeCount) return;
        const m = args.defaultProjectionData.mainMatrix, matrix = new Float32Array(16);
        for (let i = 0; i < 12; i++) matrix[i] = m[i] / WORLD;
        for (let i = 0; i < 4; i++) matrix[12 + i] = m[i] * origin[0] / WORLD + m[4 + i] * origin[1] / WORLD + m[12 + i];
        const center = project(map.getCenter().toArray());
        const opacity = clamp((performance.now() - appeared) / 850, 0, 1);
        const use = program => {
          gl.useProgram(program.handle); gl.uniformMatrix4fv(program.matrix, false, matrix); gl.uniform2f(program.center, center[0] - origin[0], center[1] - origin[1]);
          gl.uniform1f(program.radius, sceneRadius);
          gl.uniform1f(program.opacity, opacity * opacity * (3 - 2 * opacity)); gl.uniform1f(program.time, performance.now());
        };
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        if (treeCount) {
          use(treeShader);
          for (const mesh of treeModels.values()) if (mesh.count) {
            gl.bindVertexArray(mesh.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, mesh.data.length / 6, mesh.count);
          }
        }
        if (count) { use(shader); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, count); }
        gl.bindVertexArray(null);
        if (opacity < 1 || performance.now() < fadeUntil) map.triggerRepaint();
      },
      onRemove(_, gl) {
        gl.deleteBuffer(buffer); gl.deleteProgram(shader.handle); gl.deleteProgram(treeShader.handle); gl.deleteVertexArray(vao);
        for (const mesh of treeModels.values()) if (mesh.buffer) { gl.deleteBuffer(mesh.buffer); gl.deleteBuffer(mesh.instances); gl.deleteVertexArray(mesh.vao); }
      }
    };

    function build() {
      if (destroyed) return;
      if (building) { pending = true; return; }
      // A moving map can always have another tile in flight. Build the loaded
      // foreground once its terrain exists; later content is coalesced below.
      if (!map.getTerrain() || !Number.isFinite(map.queryTerrainElevation(map.getCenter().toArray()))) { pending = true; return; }
      const started = performance.now(), center = project(map.getCenter().toArray()), nextGeneration = ++generation, zoom = map.getZoom?.() ?? 14;
      const finished = prepared?.at(map.getCenter().toArray(), sceneryRadius(zoom));
      if (finished) {
        pending = false; lastCenter = center; lastZoom = zoom;
        if (!preparedActive || preparedKey !== finished.key) {
          for (const [key, model] of finished.treeModels) if (!treeModels.has(key)) treeModels.set(key, model);
          applyScene(finished, started); preparedActive = true; preparedKey = finished.key;
          for (const id of ['building-3d', 'paper-building-caps']) map.setLayoutProperty(id, 'visibility', 'none'); buildMs = performance.now() - started; maxChunkMs = buildMs;
        }
        return;
      }
      if (preparedActive) for (const id of ['building-3d', 'paper-building-caps']) map.setLayoutProperty(id, 'visibility', 'visible');
      preparedActive = false;
      const radius = sceneryRadius(zoom);
      lastCenter = center; lastBuildAt = started; lastZoom = zoom; maxChunkMs = 0; pending = false; building = true;
      compilations++;
      const work = compileScene({center, radius, features: sourceLayer => map.querySourceFeatures('openmaptiles', {sourceLayer}), heightAt: p => map.queryTerrainElevation(unproject(p)), nearRoute, landmarks, treeModels, births, started});
      function chunk() {
        if (destroyed || generation !== nextGeneration) return;
        const chunkStarted = performance.now(); let next;
        do { next = work.next(); } while (!next.done && performance.now() - chunkStarted < 5);
        maxChunkMs = Math.max(maxChunkMs, performance.now() - chunkStarted);
        if (!next.done) { setTimeout(chunk, 0); return; }
        applyScene(next.value, started);
        building = false; buildMs = performance.now() - started;
        if (pending) schedule();
      }
      chunk();
    }
    function applyScene(scene, started) {
      const gl = map.getCanvas().getContext('webgl2'); if (!gl || gl.isContextLost()) { building = false; pending = true; return; }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, scene.vertices, gl.DYNAMIC_DRAW);
      uploadBytes = scene.vertices.byteLength + uploadTrees(gl, scene.instances);
      if ((!count && !treeCount) || Math.hypot(scene.origin[0] - origin[0], scene.origin[1] - origin[1]) > scene.radius) appeared = performance.now();
      origin = scene.origin; sceneRadius = scene.radius; count = scene.vertices.length / 7; treeVertices = scene.treeVertices; treeCount = scene.trees; roofCount = scene.roofs; orchardCount = scene.orchards; births = scene.births; fadeUntil = Math.max(0, ...births.values()) + 700; landmarkNames = scene.landmarks; coverCounts = scene.coverCounts; coverWithIds = scene.coverWithIds; updates++;
      const previousHidden = hiddenBuildings.size;
      for (const id of scene.hiddenBuildings) hiddenBuildings.add(id);
      if (hiddenBuildings.size !== previousHidden) {
        const outside = ['!', ['in', ['id'], ['literal', [...hiddenBuildings]]]];
        for (const id of ['building-3d', 'paper-building-caps']) map.setFilter(id, originalBuildingFilter ? ['all', originalBuildingFilter, outside] : outside);
      }
      if (lastShadows !== scene.shadows) { map.getSource('paper-shadows').setData(scene.shadows); lastShadows = scene.shadows; }
      if (lastFolds !== scene.folds) { map.getSource('paper-folds').setData(scene.folds); lastFolds = scene.folds; }
      map.triggerRepaint();
    }
    function schedule(delay = 320) {
      if (destroyed) return;
      pending = true;
      if (timer || building) return;
      // Tile arrivals are a stream during playback. Coalesce them into one
      // rebuild per 1.2 seconds; preparation still builds a requested day now.
      timer = setTimeout(() => { timer = 0; build(); }, Math.max(delay, lastBuildAt + 1200 - performance.now()));
    }
    function prepare() {
      clearTimeout(timer); timer = 0; pending = true;
      const center = project(map.getCenter().toArray());
      if (building && lastCenter && Math.hypot(center[0] - lastCenter[0], center[1] - lastCenter[1]) > 500) { generation++; building = false; }
      build();
    }
    const moved = () => {
      const center = project(map.getCenter().toArray());
      if (!lastCenter || Math.hypot(center[0] - lastCenter[0], center[1] - lastCenter[1]) > Math.max(800, sceneRadius * .16) || Math.abs((map.getZoom?.() ?? 14) - lastZoom) > .4) schedule();
    };
    const loaded = event => { if (['dem', 'openmaptiles'].includes(event.sourceId) && (event.sourceDataType === 'content' || event.isSourceLoaded)) schedule(); };
    // Source events can precede the destination camera's last tile request.
    // Retry at idle rather than leaving a paused, first visit without scenery.
    const settled = () => { if (pending || !updates) schedule(); };
    // Transparent fibres are printed onto the land, so they travel with the map.
    // This is a small procedural material, independent of imagery or credentials.
    const texture = document.createElement('canvas'); texture.width = texture.height = 128;
    const ink = texture.getContext('2d');
    for (let i = 0; i < 4800; i++) {
      const x = random(i, 19) * 128, y = random(i, 71) * 128;
      ink.strokeStyle = i % 3 ? 'rgba(75,64,36,.13)' : 'rgba(255,250,226,.3)';
      ink.lineWidth = .35 + random(i, 51) * .5;
      ink.beginPath(); ink.moveTo(x, y); ink.lineTo(x + random(i, 97) * 2.7, y + random(i, 38) * 1.2); ink.stroke();
    }
    // Keep dynamic source zooms above the map's view cap. MapLibre 5.6.2's
    // terrain tile retention can request four children from an overscaled tile
    // when a lower GeoJSON cap is crossed during a viewport resize.
    map.addSource('paper-folds', {type: 'geojson', data: collection([]), tolerance: 0, maxzoom: 18});
    map.addLayer({id: 'paper-folds', type: 'fill', source: 'paper-folds', paint: {'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacity'], 'fill-antialias': false}}, 'waterway_tunnel');
    map.addImage('paper-fibre', ink.getImageData(0, 0, 128, 128));
    map.addLayer({id: 'paper-fibre', type: 'background', paint: {'background-pattern': 'paper-fibre', 'background-opacity': .38}}, 'waterway_tunnel');
    // Directional paper grain is clipped to actual farm polygons. Woodland
    // receives a fine canopy print so distant forest remains a continuous mass.
    for (const material of ['crop-0', 'crop-1', 'pasture', 'orchard', 'canopy']) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const brush = canvas.getContext('2d');
      if (material === 'canopy') {
        for (let i = 0; i < 95; i++) {
          const x = random(i, 301) * 128, y = random(i, 311) * 128, size = 2 + random(i, 317) * 5;
          for (const sx of [-128, 0, 128]) for (const sy of [-128, 0, 128]) {
            brush.fillStyle = i % 3 ? 'rgba(38,65,38,.20)' : 'rgba(229,226,173,.22)';
            brush.beginPath(); brush.moveTo(x + sx, y + sy - size); brush.lineTo(x + sx + size, y + sy + size * .65); brush.lineTo(x + sx - size, y + sy + size * .65); brush.fill();
          }
        }
      } else if (material === 'pasture') {
        // Tiny separated fibre strokes leave grazing land open and distinguish
        // it from the ordered rows of cultivated ground.
        for (let i = 0; i < 660; i++) {
          const x = random(i, 401) * 128, y = random(i, 409) * 128;
          brush.strokeStyle = i % 3 ? 'rgba(75,91,46,.18)' : 'rgba(255,247,215,.28)';
          brush.lineWidth = .65 + random(i, 419) * .4;
          brush.beginPath(); brush.moveTo(x, y); brush.lineTo(x + 1 + random(i, 421) * 2, y - 1.4); brush.stroke();
        }
      } else if (material === 'orchard') {
        for (let x = 8; x < 128; x += 16) for (let y = 8; y < 128; y += 16) {
          brush.fillStyle = 'rgba(61,86,46,.22)'; brush.beginPath(); brush.arc(x + 1, y + 1, 2.6, 0, TAU); brush.fill();
          brush.fillStyle = 'rgba(242,231,190,.24)'; brush.beginPath(); brush.arc(x, y - 1, 1.8, 0, TAU); brush.fill();
        }
      } else {
        const direction = material === 'crop-0' ? 1 : -1;
        for (let x = -128; x < 256; x += 8) {
          brush.strokeStyle = 'rgba(84,88,44,.23)'; brush.lineWidth = 1.05;
          brush.beginPath(); brush.moveTo(x, 0); brush.lineTo(x + direction * 128, 128); brush.stroke();
          brush.strokeStyle = 'rgba(255,247,211,.34)';
          brush.beginPath(); brush.moveTo(x + 1, 0); brush.lineTo(x + 1 + direction * 128, 128); brush.stroke();
        }
      }
      map.addImage('paper-' + material, brush.getImageData(0, 0, 128, 128));
    }
    map.addLayer({id: 'paper-crop-grain', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', filter: crops,
      paint: {'fill-pattern': ['match', ['get', 'subclass'], ['orchard', 'plant_nursery'], 'paper-orchard', ['match', patch, 0, 'paper-crop-0', 2, 'paper-crop-0', 'paper-crop-1']], 'fill-opacity': .8}}, 'paper-field-edge-shadow');
    map.addLayer({id: 'paper-pasture-grain', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', filter: pasture,
      paint: {'fill-pattern': 'paper-pasture', 'fill-opacity': .75}}, 'paper-field-edge-shadow');
    map.addLayer({id: 'paper-canopy-grain', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'],
      paint: {'fill-pattern': 'paper-canopy', 'fill-opacity': .55}}, 'waterway_tunnel');
    map.addSource('paper-shadows', {type: 'geojson', data: collection([]), tolerance: 1, maxzoom: 18});
    map.addLayer({id: 'paper-tree-shadows', type: 'fill', source: 'paper-shadows', paint: {'fill-color': '#425c38', 'fill-opacity': .17, 'fill-antialias': true}}, 'route-outline');
    // Model builds replace only fully contained native building features by ID.
    // MapLibre's `within` expression evaluates points and lines, not polygons.
    map.addLayer(layer);
    function destroy() { destroyed = true; generation++; clearTimeout(timer); map.off('moveend', moved); map.off('sourcedata', loaded); map.off('idle', settled); map.off('remove', destroy); }
    map.on('moveend', moved); map.on('sourcedata', loaded); map.on('idle', settled); map.on('remove', destroy); schedule();
    return {
      status: () => ({prepared: preparedActive, compilations, trees: treeCount, roofs: roofCount, orchards: orchardCount, radius: Math.round(sceneRadius), vertices: count + treeVertices, uploadBytes, treeModels: treeModels.size, landmarks: landmarkNames, hiddenBuildings: hiddenBuildings.size, updates, buildMs: Math.round(buildMs), maxChunkMs: Math.round(maxChunkMs), pending, building, fading: (count > 0 || treeCount > 0) && performance.now() < Math.max(fadeUntil, appeared + 850), landcover: {...coverCounts}, coverWithIds}),
      refresh: schedule, prepare,
      destroy
    };
  }
  const api = {style, create, compileScene, project, unproject, random, inPolygon, routeIndex, plantWoodland, plantOrchards, sceneryRadius, landmarkBuildingIds, treeMesh, cleanBuildingRing};
  if (typeof module !== 'undefined') module.exports = api;
  host.TrekPaper = api;
})(typeof window === 'undefined' ? globalThis : window);
