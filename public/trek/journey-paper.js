/* Paper scenery follows current mapped land cover and building footprints.
 * Individual trees and roof forms are illustrative; the terrain and route stay real. */
(function (host) {
  'use strict';
  const WORLD = 40075016.68557849, TAU = Math.PI * 2;
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
  function routeIndex(route) {
    const cells = new Map(), size = 240;
    for (const feature of route.features) {
      const lines = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [];
      for (const line of lines) {
        const points = line.map(project);
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          for (let x = Math.floor((Math.min(a[0], b[0]) - 55) / size); x <= Math.floor((Math.max(a[0], b[0]) + 55) / size); x++) {
            for (let y = Math.floor((Math.min(a[1], b[1]) - 55) / size); y <= Math.floor((Math.max(a[1], b[1]) + 55) / size); y++) {
              const key = x + ':' + y; if (!cells.has(key)) cells.set(key, []); cells.get(key).push([a, b]);
            }
          }
        }
      }
    }
    return (p, width) => (cells.get(Math.floor(p[0] / size) + ':' + Math.floor(p[1] / size)) || []).some(([a, b]) => segmentDistance(p, a, b) < width);
  }
  function plantWoodland(features, center, excluded, radius = 4600, limit = 6500) {
    const trees = new Map(), step = 72;
    for (const feature of features) for (const coordinates of polygons(feature.geometry)) {
      const rings = coordinates.map(r => r.map(project)), ring = rings[0]; if (!ring?.length) continue;
      const bounds = ring.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
      const left = Math.floor(Math.max(bounds[0], center[0] - radius) / step), right = Math.ceil(Math.min(bounds[2], center[0] + radius) / step);
      const top = Math.floor(Math.max(bounds[1], center[1] - radius) / step), bottom = Math.ceil(Math.min(bounds[3], center[1] + radius) / step);
      for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) {
        const p = [(x + .2 + random(x, y) * .6) * step, (y + .2 + random(x, y, 19) * .6) * step];
        const d = Math.hypot(p[0] - center[0], p[1] - center[1]), key = x + ':' + y;
        if (d > radius || trees.has(key) || !inPolygon(p, rings) || excluded(p)) continue;
        trees.set(key, {p, seed: random(x, y, 87), d});
      }
    }
    return [...trees.values()].sort((a, b) => a.d - b.d).slice(0, limit);
  }
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const greens = ['#73875c', '#819468', '#607a54', '#91a175', '#6c8258'].map(rgb);
  const roofs = ['#af7353', '#a78868', '#bf8f6e', '#7e8774', '#b17b5f'].map(rgb);
  const patch = ['%', ['floor', ['/', ['to-number', ['id'], 0], 10]], 5];

  function style(base) {
    const copy = JSON.parse(JSON.stringify(base));
    copy.name = 'Trek paper landscape';
    for (const layer of copy.layers) {
      const id = layer.id, paint = layer.paint || (layer.paint = {});
      if (layer.type === 'symbol' || /boundary|park_outline|natural_earth/.test(id)) layer.layout = {...layer.layout, visibility: 'none'};
      if (id === 'background') paint['background-color'] = '#d6d7b6';
      if (id === 'park') Object.assign(paint, {'fill-color': '#a6b68b', 'fill-opacity': .25, 'fill-outline-color': '#a6b68b'});
      if (id === 'landcover_wood') Object.assign(paint, {'fill-color': ['match', patch, 0, '#91a377', 1, '#9caa7e', 2, '#899f74', 3, '#a2ae81', '#91a477'], 'fill-opacity': .9, 'fill-antialias': true});
      if (id === 'landcover_grass') Object.assign(paint, {'fill-color': ['match', patch, 0, '#bcc79c', 1, '#c7caa0', 2, '#b5c292', 3, '#d1d0a7', '#c1c99b'], 'fill-opacity': .85, 'fill-antialias': true});
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
      filter: ['match', ['get', 'class'], ['farmland', 'farm', 'orchard', 'vineyard'], true, false],
      paint: {'fill-color': ['match', patch, 0, '#cab886', 1, '#d8c798', 2, '#b5bf8d', 3, '#e0ce9e', '#c5c599'], 'fill-opacity': .85, 'fill-outline-color': '#e9dec0'}
    }, {
      id: 'paper-rock', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'rock'],
      paint: {'fill-color': ['match', patch, 0, '#c2be9f', 1, '#d3cdb3', 2, '#bcbda4', 3, '#ddd6bc', '#cec9ad'], 'fill-opacity': .95}
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

  function create(map, route, landmarks = []) {
    const nearRoute = routeIndex(route), radius = 4600;
    let origin = [0, 0], lastCenter = null, generation = 0, timer = 0, pending = false, destroyed = false;
    let landmarkNames = []; const hiddenBuildings = new Set(), originalBuildingFilter = map.getFilter('building-3d');
    let buffer, shader, vao, matrixLocation, centerLocation, opacityLocation, appeared = 0, count = 0, treeCount = 0, roofCount = 0, updates = 0, buildMs = 0;
    const shaderSource = {
      vertex: `#version 300 es
        precision highp float;
        uniform mat4 u_matrix;
        uniform vec2 u_center;
        uniform float u_opacity;
        in vec3 a_position;
        in vec3 a_color;
        out vec3 v_color;
        out float v_fade;
        void main() {
          gl_Position = u_matrix * vec4(a_position, 1.0);
          v_color = a_color;
          v_fade = u_opacity * (1.0 - smoothstep(3400.0, 4550.0, distance(a_position.xy, u_center)));
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
    const layer = {
      id: 'paper-scenery', type: 'custom', renderingMode: '3d',
      onAdd(_, gl) {
        const vertex = compile(gl, gl.VERTEX_SHADER, shaderSource.vertex), fragment = compile(gl, gl.FRAGMENT_SHADER, shaderSource.fragment);
        shader = gl.createProgram(); gl.attachShader(shader, vertex); gl.attachShader(shader, fragment); gl.linkProgram(shader);
        gl.deleteShader(vertex); gl.deleteShader(fragment);
        if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(shader));
        buffer = gl.createBuffer(); vao = gl.createVertexArray(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        for (const [name, offset] of [['a_position', 0], ['a_color', 12]]) {
          const location = gl.getAttribLocation(shader, name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
        }
        gl.bindVertexArray(null); matrixLocation = gl.getUniformLocation(shader, 'u_matrix'); centerLocation = gl.getUniformLocation(shader, 'u_center'); opacityLocation = gl.getUniformLocation(shader, 'u_opacity');
      },
      render(gl, args) {
        if (!count) return;
        const m = args.defaultProjectionData.mainMatrix, matrix = new Float32Array(16);
        for (let i = 0; i < 12; i++) matrix[i] = m[i] / WORLD;
        for (let i = 0; i < 4; i++) matrix[12 + i] = m[i] * origin[0] / WORLD + m[4 + i] * origin[1] / WORLD + m[12 + i];
        const center = project(map.getCenter().toArray());
        gl.useProgram(shader); gl.bindVertexArray(vao); gl.uniformMatrix4fv(matrixLocation, false, matrix); gl.uniform2f(centerLocation, center[0] - origin[0], center[1] - origin[1]);
        const opacity = clamp((performance.now() - appeared) / 850, 0, 1);
        gl.uniform1f(opacityLocation, opacity * opacity * (3 - 2 * opacity));
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, count); gl.bindVertexArray(null);
        if (opacity < 1) map.triggerRepaint();
      },
      onRemove(_, gl) { gl.deleteBuffer(buffer); gl.deleteProgram(shader); gl.deleteVertexArray(vao); }
    };

    function build() {
      if (destroyed) return;
      if (!map.getTerrain() || !map.isSourceLoaded('openmaptiles') || !map.isSourceLoaded('dem')) { pending = true; return; }
      const started = performance.now(), center = project(map.getCenter().toArray()), nextGeneration = ++generation;
      lastCenter = center; pending = false;
      const woodland = map.querySourceFeatures('openmaptiles', {sourceLayer: 'landcover', filter: ['==', ['get', 'class'], 'wood']});
      const buildings = map.querySourceFeatures('openmaptiles', {sourceLayer: 'building'});
      const nearRoad = routeIndex(collection(map.querySourceFeatures('openmaptiles', {sourceLayer: 'transportation'})));
      const nearWater = routeIndex(collection(map.querySourceFeatures('openmaptiles', {sourceLayer: 'waterway', filter: ['!=', ['get', 'brunnel'], 'tunnel']})));
      const nearbyLandmarks = landmarks.filter(item => Math.hypot(...project(item.point).map((v, i) => v - center[i])) < radius - 250);
      const withinLandmark = p => nearbyLandmarks.some(item => inPolygon(p, [item.footprint.map(project)]));
      const candidates = plantWoodland(woodland, center, p => nearRoute(p, 46) || nearRoad(p, 32) || nearWater(p, 32) || withinLandmark(p)), houses = new Map();
      for (const feature of buildings) for (const polygon of polygons(feature.geometry)) {
        if (polygon.length !== 1) continue;
        const ring = polygon[0].slice(0, -1).map(project);
        if (ring.length !== 4) continue;
        const p = [ring.reduce((a, v) => a + v[0], 0) / 4, ring.reduce((a, v) => a + v[1], 0) / 4], d = Math.hypot(p[0] - center[0], p[1] - center[1]);
        if (d > radius || withinLandmark(p) || ring.some((a, i) => Math.hypot(a[0] - ring[(i + 1) % 4][0], a[1] - ring[(i + 1) % 4][1]) > 90)) continue;
        const key = p.map(n => Math.round(n)).join(':');
        if (!houses.has(key)) houses.set(key, {ring, p, d, height: Math.max(9, 1.2 * (+feature.properties.render_height || 6))});
      }
      // Build in short chunks. No per-frame terrain sampling or feature queries.
      const roofCandidates = [...houses.values()].sort((a, b) => a.d - b.d).slice(0, 1800);
      const vertices = [], shadows = [], nextOrigin = center;
      let madeTrees = 0, madeRoofs = 0, index = 0; const madeLandmarks = [];
      const heightAt = p => map.queryTerrainElevation(unproject(p));
      const vertex = (p, height) => {
        const cos = Math.cos(unproject(p)[1] * Math.PI / 180);
        return [p[0] - nextOrigin[0], p[1] - nextOrigin[1], height / cos];
      };
      function triangle(a, b, c, color, fixedLight) {
        const u = b.map((v, i) => v - a[i]), v = c.map((n, i) => n - a[i]);
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        if (n[2] < 0) n.forEach((_, i) => n[i] *= -1);
        const light = fixedLight || .68 + .35 * Math.max(0, (-n[0] * .45 - n[1] * .55 + n[2] * .7) / (Math.hypot(...n) || 1));
        for (const p of [a, b, c]) vertices.push(...p, ...color.map(x => Math.min(1, x * light)));
      }
      function tree({p, seed}) {
        const ground = heightAt(p); if (!Number.isFinite(ground)) return;
        const scale = 1 / Math.cos(unproject(p)[1] * Math.PI / 180), size = 12 + seed * 8, h = 27 + seed * 17;
        const color = greens[Math.floor(seed * greens.length)], pine = seed < .72;
        const trunk = Array.from({length: 4}, (_, i) => vertex([p[0] + Math.cos(i * TAU / 4) * scale, p[1] + Math.sin(i * TAU / 4) * scale], ground));
        const trunkTop = vertex(p, ground + h * .65);
        for (let i = 0; i < 4; i++) triangle(trunk[i], trunk[(i + 1) % 4], trunkTop, rgb('#8d8160'), .78);
        for (const [base, peak, width] of pine ? [[.17, .8, 1], [.4, .94, .79], [.64, 1.1, .52]] : [[.55, 1, 1]]) {
          const tip = vertex(p, ground + h * peak), bottom = vertex(p, ground + h * .22);
          const ring = Array.from({length: pine ? 5 : 6}, (_, i) => {
            const a = i / (pine ? 5 : 6) * TAU + seed * TAU;
            return vertex([p[0] + Math.cos(a) * size * width * scale, p[1] + Math.sin(a) * size * width * scale], ground + h * base);
          });
          for (let i = 0; i < ring.length; i++) {
            triangle(ring[i], ring[(i + 1) % ring.length], tip, color);
            if (!pine) triangle(ring[(i + 1) % ring.length], ring[i], bottom, color, .72);
          }
        }
        const shadow = [[p[0] - size * scale, p[1]], [p[0], p[1] - size * .5 * scale], [p[0] + h * .8 * scale, p[1] + h * .9 * scale], [p[0], p[1] + size * .6 * scale]];
        shadows.push({type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[...shadow.map(unproject), unproject(shadow[0])]]}});
        madeTrees++;
      }
      function roof({ring, p, height}) {
        const ground = heightAt(p); if (!Number.isFinite(ground)) return;
        const sides = ring.map((a, i) => Math.hypot(a[0] - ring[(i + 1) % 4][0], a[1] - ring[(i + 1) % 4][1]));
        if (Math.min(...sides) < 4 || Math.max(...sides) / Math.min(...sides) > 5) return;
        // Reject skew/concavity: only simple, nearly rectangular footprints get gables.
        const area = Math.abs(ring.reduce((a, v, i) => a + v[0] * ring[(i + 1) % 4][1] - v[1] * ring[(i + 1) % 4][0], 0)) / 2;
        if (area / (sides[0] * sides[1]) < .86) return;
        const start = sides[0] < sides[1] ? 0 : 1, a = ring[start], b = ring[(start + 1) % 4], c = ring[(start + 2) % 4], d = ring[(start + 3) % 4];
        const top = ground + height, peak = top + clamp(Math.min(...sides) * Math.cos(unproject(p)[1] * Math.PI / 180) * .36, 3, 9);
        const u = vertex([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], peak), v = vertex([(c[0] + d[0]) / 2, (c[1] + d[1]) / 2], peak);
        const [av, bv, cv, dv] = [a, b, c, d].map(p => vertex(p, top));
        const color = roofs[Math.floor(random(Math.floor(p[0]), Math.floor(p[1])) * roofs.length)];
        triangle(av, dv, u, color); triangle(dv, v, u, color); triangle(bv, u, cv, color); triangle(cv, u, v, color);
        triangle(av, u, bv, rgb('#eee4c9')); triangle(dv, cv, v, rgb('#eee4c9')); madeRoofs++;
      }
      function landmark(item) {
        const p = project(item.point), ground = heightAt(p); if (!Number.isFinite(ground)) return;
        const scale = 1 / Math.cos(item.point[1] * Math.PI / 180);
        const positioned = ([x, y, z]) => vertex([p[0] + x * scale, p[1] + y * scale], ground + z);
        for (const face of TrekLandmarks.mesh(item)) triangle(positioned(face.a), positioned(face.b), positioned(face.c), rgb(face.color));
        shadows.push({type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [item.footprint]}});
        madeLandmarks.push(item.id);
      }
      const totalCandidates = candidates.length + roofCandidates.length + nearbyLandmarks.length;
      function chunk() {
        if (destroyed || generation !== nextGeneration) return;
        const until = performance.now() + 6;
        while (index < totalCandidates && performance.now() < until) {
          if (index < candidates.length) tree(candidates[index]); else if (index < candidates.length + roofCandidates.length) roof(roofCandidates[index - candidates.length]); else landmark(nearbyLandmarks[index - candidates.length - roofCandidates.length]); index++;
        }
        if (index < totalCandidates) { setTimeout(chunk, 0); return; }
        const gl = map.getCanvas().getContext('webgl2'); if (!gl || gl.isContextLost()) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        if (!count || Math.hypot(nextOrigin[0] - origin[0], nextOrigin[1] - origin[1]) > radius) appeared = performance.now();
        origin = nextOrigin; count = vertices.length / 6; treeCount = madeTrees; roofCount = madeRoofs; landmarkNames = madeLandmarks; updates++;
        const previousHidden = hiddenBuildings.size;
        for (const id of landmarkBuildingIds(buildings, nearbyLandmarks.filter(item => madeLandmarks.includes(item.id)))) hiddenBuildings.add(id);
        if (hiddenBuildings.size !== previousHidden) {
          const outside = ['!', ['in', ['id'], ['literal', [...hiddenBuildings]]]];
          map.setFilter('building-3d', originalBuildingFilter ? ['all', originalBuildingFilter, outside] : outside);
        }
        map.getSource('paper-shadows').setData(collection(shadows));
        makeFolds(center); buildMs = performance.now() - started; map.triggerRepaint();
      }
      chunk();
    }
    function makeFolds(center) {
      const step = 210, reach = 4500, nodes = new Map(), folds = [];
      function node(x, y) {
        const key = x + ':' + y;
        if (!nodes.has(key)) {
          const p = [(x + (random(x, y, 42) - .5) * .42) * step, (y + (random(x, y, 98) - .5) * .42) * step];
          const ll = unproject(p), z = map.queryTerrainElevation(ll);
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
      }
      map.getSource('paper-folds').setData(collection(folds));
    }
    function schedule() {
      if (timer || destroyed) return;
      timer = setTimeout(() => { timer = 0; build(); }, 550);
    }
    const moved = () => {
      const center = project(map.getCenter().toArray());
      if (!lastCenter || Math.hypot(center[0] - lastCenter[0], center[1] - lastCenter[1]) > 500) schedule();
    };
    const loaded = event => { if (['dem', 'openmaptiles'].includes(event.sourceId) && event.isSourceLoaded) { pending = true; schedule(); } };
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
    map.addLayer({id: 'paper-fibre', type: 'background', paint: {'background-pattern': 'paper-fibre', 'background-opacity': .6}}, 'waterway_tunnel');
    map.addSource('paper-shadows', {type: 'geojson', data: collection([]), tolerance: 1, maxzoom: 18});
    map.addLayer({id: 'paper-tree-shadows', type: 'fill', source: 'paper-shadows', paint: {'fill-color': '#425c38', 'fill-opacity': .17, 'fill-antialias': true}}, 'route-outline');
    // Model builds replace only fully contained native building features by ID.
    // MapLibre's `within` expression evaluates points and lines, not polygons.
    map.addLayer(layer);
    function destroy() { destroyed = true; generation++; clearTimeout(timer); map.off('moveend', moved); map.off('sourcedata', loaded); map.off('idle', settled); map.off('remove', destroy); }
    map.on('moveend', moved); map.on('sourcedata', loaded); map.on('idle', settled); map.on('remove', destroy); schedule();
    return {
      status: () => ({trees: treeCount, roofs: roofCount, vertices: count, landmarks: landmarkNames, hiddenBuildings: hiddenBuildings.size, updates, buildMs: Math.round(buildMs), pending}),
      refresh: schedule,
      destroy
    };
  }
  const api = {style, create, project, unproject, random, inPolygon, routeIndex, plantWoodland, landmarkBuildingIds};
  if (typeof module !== 'undefined') module.exports = api;
  host.TrekPaper = api;
})(typeof window === 'undefined' ? globalThis : window);
