import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {configureGoogle} from './configure-trek-google.mjs';

// These are contract checks, not evidence of a working Google account or imagery.
// Actual Google rendering must pass desktop/phone inspection before activation.
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const route=JSON.parse(read('public/trek/route-detail.json'));
const original=JSON.stringify(route),maps=[],scripts=[];
class Element extends EventTarget{
  constructor(options={}){super();Object.assign(this,options);this.children=[];}
  appendChild(child){this.children.push(child);return child;}
  remove(){this.removed=true;}
}
class Map3D extends Element{
  constructor(options){super(options);maps.push(this);this.frames=[];}
  flyCameraTo(options){
    this.frames.push(options);Object.assign(this,options.endCamera);
    queueMicrotask(()=>{
      this.dispatchEvent(new Event('gmp-animationend'));
      const steady=new Event('gmp-steadychange');steady.isSteady=true;this.dispatchEvent(steady);
    });
  }
  stopCameraAnimation(){this.stopped=true;}
}
const altitude={CLAMP_TO_GROUND:'test-ground',RELATIVE_TO_GROUND:'test-relative'};
const context=vm.createContext({URL,URLSearchParams,setTimeout,clearTimeout,
  google:{maps:{importLibrary:async name=>{
    assert.equal(name,'maps3d');return {Map3DElement:Map3D,Polyline3DElement:Element,
      MapMode:{SATELLITE:'test-satellite'},AltitudeMode:altitude};
  }}},
  document:{createElement:()=>({}),head:{appendChild(script){scripts.push(script);queueMicrotask(()=>context.__trekGoogleReady());}}},
});
vm.runInContext(read('public/trek/journey-route.js'),context);
vm.runInContext(read('public/trek/journey-google.js'),context);
const path=context.TrekRoute.buildJourneyPath(route),google=context.TrekGoogle;
for(const feature of path.connections.features){
  const coordinates=feature.geometry.coordinates,dashes=google.dashedPaths(coordinates);
  assert(dashes.length>=1&&dashes.length<=49,'bound connection draw calls');
  for(const dash of dashes){assert(dash.length>=2);assert(dash.flat().every(Number.isFinite));}
  assert.deepEqual(Array.from(dashes[0][0]),Array.from(coordinates[0]),'first connection dash begins at the recording endpoint');
}
assert.equal(google.dashedPaths([[2,48],[2,48]]).length,0,'coincident points do not loop');
const container=new Element(),point=path.sample(path.dayDistance(30,.5)).point;
let explored=0,errors=0;
const adapter=await google.create({apiKey:'TEST_BROWSER_IDENTIFIER_NOT_A_CREDENTIAL',container,path,point,heading:370,
  onExplore:()=>explored++,onError:()=>errors++});
assert.equal(maps.length,1,'one map instance for the whole journey');
assert.equal(scripts.length,1);assert.equal(new URL(scripts[0].src).origin,'https://maps.googleapis.com');
const map=maps[0];assert.equal(map.mode,'test-satellite');assert.equal(map.defaultUIHidden,true);
assert.equal(map.children.filter(line=>line.strokeWidth===4).length,57,'every recorded line is rendered');
assert(map.children.length>57,'visual gaps retain distinct dashed geometry');
for(const line of map.children){assert.equal(line.altitudeMode,altitude.CLAMP_TO_GROUND);assert.equal(line.geodesic,true);}
assert(await adapter.prepare(point,370));
for(let n=0;n<120;n++)adapter.update(path.sample(path.dayDistance(30,.5)+n*15).point,370+n*.1);
assert.equal(maps.length,1,'camera movement never reloads the map');
for(const frame of map.frames){
  assert.equal(frame.durationMillis,0,'the shared clock owns interpolation');
  assert.equal(frame.endCamera.altitudeMode,altitude.RELATIVE_TO_GROUND,'never place the alpine camera relative to sea level');
  assert.equal(frame.endCamera.cameraPosition.altitude,420);
  assert(frame.endCamera.heading>=0&&frame.endCamera.heading<360);
  assert(!('center' in frame.endCamera),'avoid conflicting camera and center updates');
}
map.dispatchEvent(new Event('gmp-centerchange'));assert.equal(explored,0);
map.dispatchEvent(new Event('pointerdown'));assert.equal(explored,1);
map.dispatchEvent(new Event('gmp-error'));assert.equal(errors,1);
adapter.destroy();assert(map.removed&&map.stopped);
assert.equal(JSON.stringify(route),original,'the Google renderer does not alter the approved route');
const template=read('scripts/trek-journey-template.html'),marker='<meta name="trek-google-maps-key" content="">';
assert(template.includes(marker));assert.equal(configureGoogle(template,''),template);
const example='TEST_BROWSER_IDENTIFIER_NOT_A_CREDENTIAL';
assert(configureGoogle(template,example).includes(`content="${example}"`));
assert.throws(()=>configureGoogle(template,'\"><script>alert(1)</script>'),/invalid format/);
assert.throws(()=>configureGoogle('<html></html>',example),/marker is missing/);
console.log('Google renderer contracts passed: 57 recorded paths, bounded dashed joins, one ground-relative camera, gesture pause and deployment-only configuration; live Google imagery still requires account verification.');
