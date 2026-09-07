/* Real browser checks for the continuous traveller view. */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildJourneyPath,metres}=require('../public/trek/journey-route.js');
const {progressAt}=require('../public/trek/journey-elevation.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const path=buildJourneyPath(route,67,JSON.parse(readFileSync(new URL('../public/trek/route-links.json',import.meta.url),'utf8')));


const atPoint=point=>{let best={metres:Infinity,distance:0};for(const p of path.pieces.filter(p=>p.kind==='recorded'))for(let i=0;i<p.points.length;i++){const m=metres(point,p.points[i]);if(m<best.metres)best={metres:m,distance:p.start+p.distances[i]};}return best.distance;};

export async function checkTrekPaths({cdp,evaluate,goto,setDesktop,sleep,check,section,capture}){
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const choose=n=>evaluate(`(() => {const e=document.querySelector('#journey-day');e.value=${n};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const setPace=value=>evaluate(`(()=>{const e=document.querySelector('#pace');e.value=${value};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const scrub=distance=>evaluate(`(() => {const e=document.querySelector('#journey-progress');e.value=${progressAt(path,distance)*1000};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const state=()=>evaluate(`({...window.trekStatus?.(),sampleTime:performance.now(),overflow:document.documentElement.scrollWidth-innerWidth,menu:document.querySelector('#journey-menu').open,gallery:document.querySelector('#photo-gallery').open,photo:document.querySelector('#gallery-image').getAttribute('src'),photoLoaded:document.querySelector('#gallery-image').naturalWidth>0,creditsExpanded:document.querySelector('.maplibregl-ctrl-attrib')?.classList.contains('maplibregl-compact-show'),controlsFit:[...document.querySelectorAll('.masthead button,.journey-controls button,.journey-controls input')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})})`);
  const until=async(predicate,limit=20000)=>{const end=Date.now()+limit;while(Date.now()<end){if(await predicate())return true;await sleep(120);}return false;};
  const settled=()=>until(async()=>(await state()).ready,30000);
  const openPhotos=async()=>{await click('#menu-open');if(await evaluate("document.querySelector('#menu-photos').hidden")){await choose(30);await settled();}await click('#menu-photos');};
  await cdp.send('Runtime.enable');const startEvents=cdp.events.length;
  if(process.env.CHECK_TREK_PACE_ONLY==='1'){
    section('Automatic pace across open country, a city and the Alpine pass');
    // Preparing distant scenes has several sequential tile-loading phases;
    // their existing deadlines exceed the generic 30-second interaction wait.
    const prepared=()=>until(async()=>(await state()).ready,60000);
    await setDesktop(1440,900);await goto('/trek/?day=61');check(await prepared(),'the automatic journey prepares');
    check((await state()).pace===0&&await evaluate("document.querySelector('#speed-label').textContent==='Auto'&&+document.querySelector('#pace').value===0"),'Auto is the default in both pace controls');
    await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=false;p.dispatchEvent(new Event('change',{bubbles:true}));})()");
    const measurements=[];
    for(const [label,distance] of [['open-country',path.dayDistance(61,.8)],['city',atPoint([4.02376,49.251785])],['mountains',path.dayDistance(30,.65)]]){
      await scrub(distance);check(await prepared(),`${label} prepares at its requested route position`);await sleep(1800);
      const before=await state();console.log('  scene '+JSON.stringify({label,distance:before.distance,pacing:before.pacing}));
      check(before.pacing?.places+before.pacing?.shapes>0,'automatic pace reads the loaded public map context');
      if(label==='city')check(before.pacing.scores.settlement>.5&&before.pacing.target<500,'the actual city receives a slower viewing pace');
      if(label==='mountains')check(before.pacing.scores.mountain>.4&&before.pacing.target<700,'the actual Alpine pass receives a slower viewing pace');
      await evaluate(`window.__paceFrames=[];window.__paceCapture=true;document.querySelector('#play').click();requestAnimationFrame(function sample(time){if(!window.__paceCapture)return;const s=window.trekStatus();window.__paceFrames.push({time,distance:s.distance,speed:s.travelSpeed,target:s.pacing.target,anticipating:s.pacing.anticipating,reason:s.pacing.reason,clearance:s.cameraTerrainClearance,visible:s.routeVisible});requestAnimationFrame(sample);});`);
      await sleep(12000);
      const samples=await evaluate(`(()=>{document.querySelector('#play').click();window.__paceCapture=false;const frames=window.__paceFrames;delete window.__paceFrames;delete window.__paceCapture;return frames;})()`);
      const intervals=samples.slice(1).map((s,i)=>s.time-samples[i].time).sort((a,b)=>a-b),p95=intervals[Math.floor(intervals.length*.95)];
      const rates=samples.slice(1).map((s,i)=>(s.speed-samples[i].speed)/Math.min(.1,(s.time-samples[i].time)/1000));
      const measured={label,frames:samples.length,p95,travelled:Math.round(samples.at(-1).distance-samples[0].distance),peak:Math.round(Math.max(...samples.map(s=>s.speed))),targets:[Math.round(Math.min(...samples.map(s=>s.target))),Math.round(Math.max(...samples.map(s=>s.target)))],anticipating:samples.filter(s=>s.anticipating).length};measurements.push(measured);console.log('  playback '+JSON.stringify(measured));
      check(samples.length>120&&measured.travelled>400&&p95<85,'ordinary playback advances without recurring long frames');
      check(Math.max(...rates)<660&&Math.min(...rates)>-1510,'automatic acceleration and braking remain bounded during real playback');
      check(samples.every(s=>s.visible>0&&s.clearance>200),'the travel line stays in view and the camera remains above the terrain');
      const paused=await state();await sleep(400);check((await state()).distance===paused.distance,'pausing holds the automatically paced journey');
      await capture?.(`trek-auto-${label}`);
    }
    check(measurements[0].peak>measurements[1].peak*2&&measurements[0].peak>measurements[2].peak*2,'open-country playback runs materially faster than the city and mountains');
    const held=(await state()).distance;
    for(const [value,label] of [[400,'¼×'],[1600,'1×'],[3200,'2×'],[6400,'4×'],[12800,'8×'],[0,'Auto']]){
      await click('#speed-cycle');check((await state()).pace===value&&(await state()).distance===held&&await evaluate(`document.querySelector('#speed-label').textContent===${JSON.stringify(label)}`),`${label} remains available without moving a paused journey`);
    }
    await setPace(12800);await click('#play');await sleep(1200);await setPace(0);check((await state()).playing&&(await state()).pace===0,'switching from a fixed speed to Auto preserves playback');await sleep(1200);await click('#play');
    await choose(8);check(await prepared()&&(await state()).day===8&&(await state()).pace===0,'a backward day change retains Auto');
    for(const [width,height] of [[390,844],[320,844],[844,390]]){await setDesktop(width,height);const s=await state();check(s.controlsFit&&s.overflow<=1,`the Auto control fits at ${width}×${height}`);await capture?.(`trek-auto-${width}`);}
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');if(errors.length)console.error(errors.map(e=>e.params.exceptionDetails.exception?.description));check(!errors.length,'automatic pace, manual overrides and resizes have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_REFINEMENT_ONLY==='1'){
    section('Simple controls, passive prints and a train on the mapped railway');
    await setDesktop(1440,900);await goto('/trek/?day=2');check(await settled(),'the revised journey prepares');
    check((await state()).pace===0&&await evaluate("document.querySelector('#speed-label').textContent==='Auto'"),'Auto is the initial speed in both controls');await setPace(6400);
    check(await evaluate("!document.querySelector('#readout-day,#elevation-current,#minimap-height,.timeline-heading')"),'the extra day count and height labels are removed');
    const showPrint=async()=>{await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=true;p.dispatchEvent(new Event('change',{bubbles:true}));})()");return until(async()=>(await state()).flash,5000);};
    const shape=async()=>evaluate(`(()=>{const p=document.querySelector('#memory-flash'),i=p.querySelector('img'),s=getComputedStyle(i),c=getComputedStyle(p);return {passive:p.tagName==='FIGURE'&&!p.querySelector('a,button')&&c.pointerEvents==='none',aspect:Math.abs(parseFloat(s.width)/parseFloat(s.height)-i.naturalWidth/i.naturalHeight)<.01,natural:[i.naturalWidth,i.naturalHeight]};})()`);
    check(await showPrint(),'the landscape print appears');await sleep(1700);
    let print=await shape();check(print.passive&&print.aspect&&print.natural[0]>print.natural[1],'the landscape photograph keeps its full aspect ratio and has no link');
    await click('#memory-flash');check(!(await state()).gallery,'clicking a print cannot open the gallery');
    const held=(await state()).distance;await click('#speed-cycle');check((await state()).pace===12800&&(await state()).distance===held,'the speed button cycles from 4× to 8× without moving a paused journey');
    await click('#menu-open');check((await state()).menu,'the date opens journey options');
    await evaluate("(()=>{const p=document.querySelector('#pace');p.value=6400;p.dispatchEvent(new Event('change',{bubbles:true}));})()");await click('#menu-close');
    for(const [width,height] of [[1440,900],[390,844],[320,844],[844,390]]){
      await setDesktop(width,height);await showPrint();await sleep(1700);
      const fit=await evaluate(`(()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),p=box('#memory-flash'),r=box('.journey-controls'),f=box('#country-flag'),m=box('#minimap-canvas'),label=box('.minimap-country'),b=box('.mark'),apart=(a,b)=>a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right;return p.left>=0&&p.right<=innerWidth&&p.top>=0&&apart(p,r)&&apart(p,b)&&f.top>=m.top&&f.bottom<m.bottom&&label.right<=m.right&&label.left>m.left+m.width*.4&&box('#menu-open').height>=44&&[...document.querySelectorAll('.journey-readout dd,.journey-readout dt')].every(e=>e.scrollWidth<=e.clientWidth+1);})()`);
      const s=await state();check(fit&&s.controlsFit&&s.overflow<=1,`${width}×${height} fits the print, date button and country inside the atlas`);
      await capture?.(`trek-simple-${width}-${height}`);
    }
    await setDesktop(1440,900);await choose(30);check(await settled()&&await showPrint(),'the portrait photograph prepares');await sleep(1700);print=await shape();check(print.passive&&print.aspect&&print.natural[1]>print.natural[0],'portrait photos retain their shape without empty side bands');await capture?.('trek-print-portrait-desktop');
    await setDesktop(390,844);await showPrint();await sleep(1700);await capture?.('trek-print-portrait-phone');
    await openPhotos();check(await until(async()=>(await state()).photoLoaded)&&(await state()).galleryCount===37,'the original day gallery remains available in the menu');await click('#gallery-close');
    await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=false;p.dispatchEvent(new Event('change',{bubbles:true}));})()");
    const totals=()=>evaluate("[document.querySelector('#readout-distance').textContent,document.querySelector('#readout-ascent').textContent]");
    for(const [index,rail] of path.pieces.filter(p=>p.mode==='train').entries()){
      for(const [width,height] of [[1440,900],[390,844]]){
        await setDesktop(width,height);await scrub(rail.railStart+(rail.railEnd-rail.railStart)*.46);check(await settled(),'the mapped train section prepares');
        let s=await state();check(s.mode==='train'&&s.train?.active&&!s.train.failed&&s.train.cars.length===3&&s.train.vertices>1000,'three paper coaches appear on the railway');
        const before=await totals();await capture?.(`trek-train-${index}-${width}`);
        await evaluate(`window.__trainFrames=[];window.__trainCapture=true;document.querySelector('#play').click();requestAnimationFrame(function sample(time){if(!window.__trainCapture)return;const s=window.trekStatus();window.__trainFrames.push({time,distance:s.renderedDistance,active:s.train.active,cars:s.train.cars,screen:s.train.screen,visible:s.routeVisible});requestAnimationFrame(sample);});`);
        await sleep(width===1440?8500:4500);
        const samples=await evaluate(`(()=>{document.querySelector('#play').click();window.__trainCapture=false;const result=window.__trainFrames;delete window.__trainFrames;delete window.__trainCapture;return result;})()`);
        check(samples.length>60&&samples.at(-1).distance>samples[0].distance+250,'the train advances during ordinary playback');
        const shown=samples.filter(s=>s.cars.length);check(shown.every(s=>s.screen.some(([x,y])=>x>10&&x<width-10&&y>70&&y<height-200)),'the moving train stays in the visible landscape above the controls');
        check(shown.every(s=>s.cars.every(c=>metres(c.point,path.sample(c.distance).point)<.02)),'every rendered coach remains on its mapped track during curves');
        check((await totals()).join('|')===before.join('|'),'the whole train animation leaves walking totals unchanged');
        const paused=await state();await sleep(700);const still=await state();
        check(still.distance===paused.distance&&JSON.stringify(still.train.cars)===JSON.stringify(paused.train.cars),'pausing holds the train while the camera may finish easing');
        await capture?.(`trek-train-${index}-${width}-moving`);
        console.log('  train playback '+JSON.stringify({route:index,width,frames:samples.length,metres:Math.round(samples.at(-1).distance-samples[0].distance),shown:shown.length}));
      }
      await scrub(rail.end+30);check(await settled()&&!(await state()).train.active,'leaving the station restores the walk without a train');
    }
    await choose(31);check(await settled()&&!(await state()).train.active,'returning to the Alpine walk clears the train');await capture?.('trek-simple-alpine-phone');
    await scrub(path.total);check((await state()).day===67&&!(await state()).train.active,'Sofia keeps its arrival state');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');if(errors.length)console.error(errors.map(e=>e.params.exceptionDetails.exception?.description));check(!errors.length,'the revised journey has no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_FINISHES_ONLY==='1'){
    section('Static atlas fills and smoothly contrasting shared wordmark');
    await setDesktop(1440,900);await goto('/trek/?day=2');check(await settled(),'the finished presentation prepares');
    for(const [day,country] of [[3,'France'],[17,'Germany'],[30,'Austria'],[36,'Slovenia'],[42,'Croatia'],[53,'Serbia'],[65,'Bulgaria']]){
      await choose(day);check(await until(async()=>{const w=(await state()).wayfinding;return w?.country===country&&w.flagReady;},5000),`${country} retains its name and small flag`);
      check(await evaluate(`(()=>{const c=document.querySelector('#minimap-canvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<a.length;i+=4)if(a[i]===216&&a[i+1]===200&&a[i+2]===150)return false;return true;})()`),`${country} has no current-country highlight`);
    }
    await choose(31);check(await settled(),'the camera returns after all country changes');
    // Simulate only the small pixel sample read by the mark. Do not change the
    // graphics buffer or terrain reads; restore the method before leaving.
    await evaluate(`(()=>{const gl=document.querySelector('.maplibregl-canvas').getContext('webgl2'),original=gl.readPixels;window.__markShade=.02;window.__restoreMark=()=>{gl.readPixels=original;delete window.__markShade;delete window.__restoreMark;};gl.readPixels=function(x,y,w,h,format,type,pixels,...rest){if(w>70&&h>20&&h<100){const shade=Math.round(window.__markShade*255);for(let i=0;i<pixels.length;i+=4){pixels[i]=pixels[i+1]=pixels[i+2]=shade;pixels[i+3]=255;}return;}return original.call(gl,x,y,w,h,format,type,pixels,...rest);};document.querySelector('#photo-interludes').checked=false;document.querySelector('#play').click();})()`);
    for(const [shade,expected] of [[.02,'rgb(255, 249, 226)'],[.38,'rgb(255, 249, 226)'],[.95,'rgb(31, 49, 36)'],[.38,'rgb(31, 49, 36)']]){
      await evaluate(`window.__markShade=${shade}`);
      check(await until(()=>evaluate(`(()=>{const m=document.querySelector('.mark'),s=getComputedStyle(m),y=getComputedStyle(m.querySelector('small'));return s.color===${JSON.stringify(expected)}&&y.color===s.color&&y.fontFamily===s.fontFamily&&parseFloat(s.transitionDuration)>0;})()`),5000),'trek and 2019 ease together to readable ink, retaining contrast at middle brightness');
    }
    await evaluate(`window.__restoreMark();if(window.trekStatus().playing)document.querySelector('#play').click();`);
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');if(errors.length)console.error(errors.map(e=>e.params.exceptionDetails.exception?.description));check(!errors.length,'country and contrast updates have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_WALKING_ONLY==='1'){
    section('Estimated walking paths, photographic prints and continuously visible route');
    await setDesktop(1440,900);await goto('/trek/?day=2');check(await settled(),'the walking reconstruction prepares');
    check(await until(async()=>(await state()).flash,10000),'the small photograph appears');
    check(await evaluate(`(()=>{const p=document.querySelector('#memory-flash'),mark=document.querySelector('.mark'),year=mark.querySelector('small');return p.textContent.trim()===''&&!p.querySelector('.memory-location')&&p.querySelector('img').naturalWidth>0&&getComputedStyle(mark).fontFamily===getComputedStyle(year).fontFamily&&getComputedStyle(year).backgroundColor==='rgba(0, 0, 0, 0)';})()`),'the print has no caption and trek / 2019 share their typeface');
    await capture?.('trek-walking-print-desktop');
    const photo=await evaluate(`document.querySelector('#memory-flash img').getAttribute('src')`);
    await click('#memory-flash');check(!(await state()).gallery,'the automatic print is passive');await openPhotos();check(await until(async()=>(await state()).photoLoaded),'the menu opens the original photo gallery');
    check(await evaluate(`document.querySelector('#memory-flash img').getAttribute('src')===${JSON.stringify(photo)}`),'the print preserves its original image');await click('#gallery-close');
    await evaluate(`document.querySelector('#photo-interludes').checked=false;(()=>{const p=document.querySelector('#pace');p.value=12800;p.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    check((await state()).pace===12800,'8× is available in the running journey');
    for(const [width,height,day,from,to] of [[1440,900,31,.64,.85],[390,844,31,.64,.85],[320,844,30,.23,.34],[844,390,17,.94,.99]]){
      await setDesktop(width,height);await scrub(path.dayDistance(day,from));check(await settled(),`day ${day} prepares at ${width}×${height}`);
      await evaluate(`window.__walkingSamples=[];window.__walkingCapture=true;document.querySelector('#play').click();requestAnimationFrame(function sample(t){if(!window.__walkingCapture)return;const s=window.trekStatus();window.__walkingSamples.push({distance:s.renderedDistance,visible:s.routeVisible,clearance:s.cameraTerrainClearance,zoom:s.cameraZoom,height:s.eyeHeight,pitch:s.pitch,bearing:s.bearing,t});requestAnimationFrame(sample);});`);
      const completed=await until(async()=>(await state()).renderedDistance>=path.dayDistance(day,to),90000);
      const samples=await evaluate(`(()=>{if(window.trekStatus().playing)document.querySelector('#play').click();window.__walkingCapture=false;return window.__walkingSamples;})()`);
      check(completed&&samples.length>50,'the accelerated journey completes its bends');
      check(samples.every(s=>s.visible>0),'some of the nearby travel line remains in the usable camera window on every frame');
      check(samples.filter(s=>s.visible>=.5).length/samples.length>.95,'at least half the nearby line stays framed throughout almost all playback');
      check(samples.every(s=>s.clearance>200),'the fitted camera remains clear of rendered terrain');
      const changes=samples.slice(1).map((s,i)=>({zoom:Math.abs(s.zoom-samples[i].zoom),height:Math.abs(s.height-samples[i].height)/((s.t-samples[i].t)/1000)}));
      check(Math.max(...changes.map(s=>s.zoom))<.18&&Math.max(...changes.map(s=>s.height))<181,'pulling out and returning remain smooth at 8×');
      const held=await state();check(held.controlsFit&&held.overflow<=1,'camera framing retains the readable controls');
      console.log('  fitted route '+JSON.stringify({width,height,day,minimumVisible:Math.min(...samples.map(s=>s.visible)),minimumClearance:Math.round(Math.min(...samples.map(s=>s.clearance))),maxZoomStep:Math.max(...changes.map(s=>s.zoom)).toFixed(4)}));
      await capture?.(`trek-walking-bends-${width}`);
    }
    const walking=path.pieces.filter(p=>p.mode==='walk'&&p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await setDesktop(1440,900);await scrub(walking.start+(walking.end-walking.start)*.45);check(await settled(),'the longest missing walking section follows its reconstructed path');
    const before=await evaluate(`[Number(document.querySelector('#readout-distance').textContent.replaceAll(',','')),Number(document.querySelector('#readout-ascent').textContent.replaceAll(',',''))]`);
    await scrub(walking.start+(walking.end-walking.start)*.55);check(await settled(),'the reconstructed walk remains traversable');
    const after=await evaluate(`[Number(document.querySelector('#readout-distance').textContent.replaceAll(',','')),Number(document.querySelector('#readout-ascent').textContent.replaceAll(',',''))]`);
    check((await state()).kind==='connection'&&after[0]>before[0]&&after[1]>=before[1],'reconstructed walking advances the estimated distance and uphill climb');
    await capture?.('trek-walking-reconstruction');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the changed journey has no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_TERRAIN_CAMERA_ONLY==='1'){
    section('Stable terrain framing through day 31 and the Alpine descent');
    await setDesktop(1440,900);await goto('/trek/?day=31');check(await settled(),'day 31 prepares at its requested position');
    check((await state()).day===31,'the reported day remains selected after terrain preparation');
    await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=false;p.dispatchEvent(new Event('change',{bubbles:true}));})()");
    for(const [width,day,from,to,marks] of [[1440,31,.001,.999,[.135,.47,.75,.948]],[1440,30,.55,.995,[.76]],[390,31,.68,.84,[.75]]]){
      await setDesktop(width,width>650?900:844);await scrub(path.dayDistance(day,from));check(await settled(),`day ${day} prepares at ${width}px`);
      const initial=await state();check(initial.day===day&&Math.abs(initial.t-from)<.002,'the camera replay starts on the intended route stretch');
      await evaluate(`window.__trekCameraSamples=[];window.__trekCaptureCamera=true;document.querySelector('#play').click();requestAnimationFrame(function sample(sampleTime){if(!window.__trekCaptureCamera)return;const s=window.trekStatus();window.__trekCameraSamples.push({distance:s.renderedDistance,bearing:s.bearing,height:s.eyeHeight,clearance:s.cameraClearance,terrainClearance:s.cameraTerrainClearance,lift:s.cameraLift,zoom:s.cameraZoom,pitch:s.pitch,sampleTime});requestAnimationFrame(sample);});`);
      for(const mark of marks){
        check(await until(async()=>(await state()).renderedDistance>=path.dayDistance(day,mark),60000),`continuous playback reaches day ${day} at ${Math.round(mark*100)}%`);
        await capture?.(`trek-terrain-${width}-day-${day}-${Math.round(mark*100)}`);
      }
      const completed=await until(async()=>(await state()).renderedDistance>=path.dayDistance(day,to),60000);
      const samples=await evaluate(`(()=>{if(window.trekStatus().playing)document.querySelector('#play').click();window.__trekCaptureCamera=false;const samples=window.__trekCameraSamples;delete window.__trekCameraSamples;return samples;})()`);
      const delta=(a,b)=>((b-a+540)%360)-180;
      const changes=samples.slice(1).map((s,i)=>{const p=samples[i],dt=(s.sampleTime-p.sampleTime)/1000;return {turn:Math.abs(delta(p.bearing,s.bearing)),rise:Math.abs(s.height-p.height)/dt,zoom:Math.abs(s.zoom-p.zoom),pitch:Math.abs(s.pitch-p.pitch)/dt};});
      const variation=changes.reduce((sum,s)=>sum+s.turn,0),maxZoomStep=Math.max(...changes.map(s=>s.zoom));
      check(completed&&samples.length>100,'the camera completes the continuous replay');
      check(Math.max(...changes.map(s=>s.rise))<181&&maxZoomStep<.16,'DEM tile changes cannot cause a sudden camera lift or zoom');
      check(samples.every(s=>s.clearance>750&&s.terrainClearance>200&&s.pitch>=33.95&&s.pitch<=60.05),'the camera clears both the planned profile and the rendered terrain throughout playback');
      if(day===31&&from===.001)check(variation<330,'the full day-31 camera avoids circling with the tight local route');
      if(day===31)check(Math.max(...samples.map(s=>s.lift))>350,'the winding section receives extra camera height');
      const held=await state();check(held.controlsFit&&held.overflow<=1,'continuous camera movement preserves the timeline and controls');
      console.log('  terrain camera '+JSON.stringify({width,day,from,metres:Math.round(samples.at(-1).distance-samples[0].distance),seconds:((samples.at(-1).sampleTime-samples[0].sampleTime)/1000).toFixed(1),turning:variation.toFixed(1),maxZoomStep:maxZoomStep.toFixed(4),minimumTerrainClearance:Math.round(Math.min(...samples.map(s=>s.terrainClearance)))}));
    }
    const held=(await state()).distance;
    for(const [width,height] of [[320,844],[844,390]]){
      await setDesktop(width,height);await sleep(700);const s=await state();
      check(s.distance===held&&s.controlsFit&&s.overflow<=1&&s.cameraTerrainClearance>200,`${width}×${height} retains the exact position and visible camera framing`);
      await capture?.(`trek-terrain-${width}-${height}`);
    }
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the continuous terrain camera has no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_ZIGZAGS_ONLY==='1'){
    section('Calmer switchbacks and an unhighlighted atlas');
    await setDesktop(1440,900);await goto('/trek/?day=30');check(await settled(),'the Alpine comparison scene prepares');
    await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=false;p.dispatchEvent(new Event('change',{bubbles:true}));})()");
    const wash=()=>evaluate(`(()=>{const c=document.querySelector('#minimap-canvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0,x=0,y=0;for(let i=0;i<a.length;i+=4)if(a[i]===216&&a[i+1]===200&&a[i+2]===150){pixels++;x+=(i/4)%c.width;y+=Math.floor(i/4/c.width);}return {pixels,x:x/pixels/c.width,y:y/pixels/c.height};})()`);
    const regions=[];
    for(const [day,country] of [[3,'France'],[17,'Germany'],[30,'Austria'],[36,'Slovenia'],[42,'Croatia'],[53,'Serbia'],[65,'Bulgaria']]){
      await choose(day);
      check(await until(async()=>{const w=(await state()).wayfinding;return w?.country===country&&w.flagReady;},5000),`${country} updates the country name and quiet flag`);
      const region=await wash();regions.push(region);
      check(region.pixels===0,`${country} leaves the atlas free of the removed highlight`);
    }
    check(regions.every(r=>r.pixels===0),'country changes never repaint a highlighted region');
    await choose(30);check(await settled(),'the camera returns to Austria');
    const returned=await wash();check(Math.abs(returned.pixels-regions[2].pixels)<3,'seeking back clears the later country highlights');
    for(const width of [1440,390,320]){
      await setDesktop(width,width>650?900:844);await sleep(400);
      const fit=await evaluate(`(()=>{const c=document.querySelector('#minimap-canvas').getBoundingClientRect(),f=document.querySelector('#country-flag').getBoundingClientRect();return c.right<=innerWidth&&c.top>=0&&f.top>=c.top&&f.bottom<c.bottom&&document.querySelectorAll('#journey-minimap img').length===1;})()`);
      const s=await state();check(fit&&s.controlsFit&&s.overflow<=1,`${width}px fits the country name, position marker and controls`);
      await capture?.(`trek-zigzag-country-${width}`);
    }
    await setDesktop(1440,900);
    for(const [day,from,to] of [[30,.23,.34],[30,.45,.7],[17,.94,.999]]){
      await scrub(path.dayDistance(day,from));check(await settled(),`day ${day} at ${Math.round(from*100)}% prepares`);
      // Read after each animation frame, so a slow tile upload cannot make two
      // off-frame CDP reads look like a sudden camera jump.
      await evaluate(`window.__trekCameraSamples=[];window.__trekCaptureCamera=true;document.querySelector('#play').click();requestAnimationFrame(function sample(t){if(!window.__trekCaptureCamera)return;const s=window.trekStatus();window.__trekCameraSamples.push({distance:s.distance,bearing:s.bearing,cameraClearance:s.cameraClearance,pitch:s.pitch,sampleTime:t});requestAnimationFrame(sample);});`);
      const completed=await until(async()=>(await state()).distance>=path.dayDistance(day,to),60000);
      const samples=await evaluate(`(()=>{document.querySelector('#play').click();window.__trekCaptureCamera=false;const samples=window.__trekCameraSamples;delete window.__trekCameraSamples;return samples;})()`);
      const delta=(a,b)=>((b-a+540)%360)-180;
      const turns=samples.slice(1).map((s,i)=>Math.abs(delta(samples[i].bearing,s.bearing))/((s.sampleTime-samples[i].sampleTime)/1000));
      const variation=samples.slice(1).reduce((sum,s,i)=>sum+Math.abs(delta(samples[i].bearing,s.bearing)),0);
      check(completed&&Math.max(...turns)<=12.5&&samples.every(s=>s.cameraClearance>=419.9&&s.pitch>=33.95&&s.pitch<=60.05),`day ${day} traverses its bends with gradual turns and ground clearance`);
      if(day===30&&from===.23)check(variation<65,'the town zigzags do not make the rendered camera swing repeatedly');
      console.log('  rendered bends '+JSON.stringify({day,from,metres:Math.round(samples.at(-1).distance-samples[0].distance),seconds:((samples.at(-1).sampleTime-samples[0].sampleTime)/1000).toFixed(1),turning:variation.toFixed(1),peakRate:Math.max(...turns).toFixed(1)}));
      await capture?.(`trek-zigzag-day-${day}-${Math.round(from*100)}`);
    }
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the changed camera and inset have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_CONTROLS_ONLY==='1'||process.env.CHECK_TREK_TIMELINE_ONLY==='1'){
    section('One draggable timeline for the days, country colours and elevation');
    await setDesktop(1440,900);await goto('/trek/?day=30');check(await settled(),'the updated journey prepares');
    const ribbon=()=>evaluate(`({count:window.trekStatus().elevation.days,day:window.trekStatus().day,fraction:window.trekStatus().t,progress:+document.querySelector('#journey-progress').value/1000})`);
    let b=await ribbon();check(b.count===67&&b.day===30&&Math.abs(b.fraction-.5)<.01&&Math.abs(b.progress-29.5/67)<.0001,'the elevation and playhead share the same day scale');
    check(await evaluate(`(()=>{const a=document.querySelector('#journey-progress').getBoundingClientRect(),b=document.querySelector('#elevation-canvas').getBoundingClientRect();return !document.querySelector('#day-blocks')&&document.querySelectorAll('input[type=range]').length===1&&['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<1);})()`),'one draggable elevation replaces the separate day blocks and progress line');
    check(await evaluate(`(()=>{const c=document.querySelector('#elevation-canvas'),ctx=c.getContext('2d'),scale=c.width/c.getBoundingClientRect().width,colors=[10,20,30,37,45,55,65].map(day=>[...ctx.getImageData(Math.floor((day-.5)/67*c.width),Math.floor(c.height-9*scale),1,1).data].join(','));return new Set(colors).size===7;})()`),'the visible ribbon has distinct country colours');
    await evaluate("document.querySelector('#journey-progress').focus()");
    const key=async key=>{await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key});};
    await key('End');check((await state()).distance===path.total,'End reaches Sofia');
    await key('ArrowLeft');check((await state()).distance<path.total&&(await state()).day===66,'the arrow key can leave the zero-distance arrival day');
    await key('Home');check((await state()).distance===0,'Home returns to the first route point');
    await choose(30);check(await settled(),'the timeline returns to the mountains');
    const box=await evaluate(`(()=>{const r=document.querySelector('#journey-progress').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`),startX=box.x+29.5/67*box.width,y=box.y+box.height*.6;
    await click('#play');await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:startX,y,button:'left',clickCount:1});
    for(const day of [35,42,53])await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x+(day-.5)/67*box.width,y,button:'left',buttons:1});
    const dragged=await state();check(dragged.scrubbing&&!dragged.playing&&dragged.day===53&&!dragged.ready&&Math.abs(dragged.elevation.progress-52.5/67)<.005,'dragging the elevation previews the matching day and pauses playback');
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x+52.5/67*box.width,y,button:'left',clickCount:1});
    check(await settled()&&!(await state()).scrubbing&&(await state()).day===53,'releasing the handle prepares the final landscape');
    await choose(30);check(await settled(),'the chosen day and date reset together');
    check(await evaluate("!document.querySelector('#photos-open')&&document.querySelector('#speed-cycle').textContent.includes('Auto')"),'the photograph button is replaced by a visible speed control');await setPace(6400);
    const held=(await state()).distance;
    for(const [pace,label] of [[12800,'8×'],[0,'Auto'],[400,'¼×'],[1600,'1×'],[3200,'2×'],[6400,'4×']]){
      await click('#speed-cycle');const s=await state();
      check(s.pace===pace&&!s.playing&&s.distance===held&&await evaluate(`document.querySelector('#speed-label').textContent===${JSON.stringify(label)}&&+document.querySelector('#pace').value===${pace}`),`${label} updates both speed controls without moving a paused journey`);
    }
    await click('#menu-open');await evaluate("(()=>{const e=document.querySelector('#pace');e.value=400;e.dispatchEvent(new Event('change',{bubbles:true}));})()");
    check((await state()).pace===400&&await evaluate("document.querySelector('#speed-label').textContent==='¼×'"),'changing speed in the menu updates the visible control');await click('#menu-close');await click('#speed-cycle');
    await click('#play');await sleep(500);await click('#speed-cycle');const moving=await state();await sleep(1800);await click('#play');
    check(moving.playing&&moving.pace===3200&&(await state()).distance>moving.distance,'fast-forward changes pace during playback without interrupting travel');
    await choose(6);check(await settled(),'a backward day change prepares');b=await ribbon();check(b.day===6&&Math.abs(b.progress-5.5/67)<.0001,'seeking backwards moves the filled profile to the earlier day');
    await scrub(187340);await settled();await capture?.('trek-controls-town');
    await scrub(path.dayDistance(5,.2));await settled();const metrics=()=>evaluate("[Number(document.querySelector('#readout-distance').textContent.replaceAll(',','')),Number(document.querySelector('#readout-ascent').textContent.replaceAll(',',''))]");
    const before=await metrics();await scrub(path.dayDistance(5,.8));await settled();const after=await metrics();
    check((await state()).kind==='connection'&&after[0]>before[0]&&after[1]>=before[1],'day progress across a missing recording includes its estimated walk');
    await scrub(path.total);b=await ribbon();check(b.day===67&&b.progress===1,'Sofia completes the full 67-day ribbon');
    await click('#menu-open');await click('#restart');b=await ribbon();check(b.day===1&&b.progress===0,'restarting clears the filled profile');
    await choose(30);check(await settled(),'the photo day prepares again');
    const showPrint=async()=>{await evaluate("(()=>{const e=document.querySelector('#photo-interludes');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));})()");return until(async()=>(await state()).flash,5000);};
    for(const [width,height] of [[1440,900],[390,844],[320,844],[844,390]]){
      await setDesktop(width,height);check(await showPrint(),'an original photograph appears automatically');await sleep(500);
      const fit=await evaluate(`(()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),p=box('#memory-flash'),r=box('.journey-controls'),brand=box('.mark'),f=box('#country-flag'),m=box('#minimap-canvas'),year=getComputedStyle(document.querySelector('.mark small')),apart=(a,b)=>a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right;return {photo:p.top>=0&&apart(p,r)&&apart(p,brand),year:year.display!=='none'&&+year.opacity===1&&parseFloat(year.fontSize)>=10,labels:[...document.querySelectorAll('.journey-readout dt')].every(e=>parseFloat(getComputedStyle(e).fontSize)>=9),flag:f.width<=16&&f.top>=m.top&&f.bottom<m.bottom&&f.right<innerWidth,ribbon:box('#journey-progress').height>=44&&box('#elevation-canvas').width/67>=2.5,metricFit:[...document.querySelectorAll('.journey-readout dd')].every(e=>e.scrollWidth<=e.clientWidth+1)};})()`);
      const s=await state();check(s.controlsFit&&s.overflow<=1&&Object.values(fit).every(Boolean),`${width}×${height} fits the segmented elevation, counters, photograph and controls`);
      await capture?.(`trek-controls-${width}-${height}`);
    }
    await setDesktop(390,844);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    const touchBox=await evaluate(`(()=>{const r=document.querySelector('#journey-progress').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`),touchY=touchBox.y+touchBox.height*.35;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBox.x+29.5/67*touchBox.width,y:touchY}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchBox.x+35.5/67*touchBox.width,y:touchY}]});
    check((await state()).day===36&&(await state()).scrubbing,'a finger can drag anywhere across the elevation to another day');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check(await settled()&&!(await state()).scrubbing,'lifting the finger finishes the seek without resuming playback');
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await choose(30);await settled();
    await setDesktop(390,844);await showPrint();await click('#memory-flash');check(!(await state()).gallery,'the automatic print has no link');
    await openPhotos();check(await until(async()=>(await state()).photoLoaded)&&(await state()).galleryCount===37,'the original day gallery remains reachable from the menu');await click('#gallery-close');
    await click('.maplibregl-ctrl-attrib-button');await sleep(100);
    check(await evaluate("document.querySelector('.maplibregl-ctrl-attrib').open&&document.querySelector('.maplibregl-ctrl-attrib-inner').textContent.includes('OpenStreetMap')&&document.querySelector('.maplibregl-ctrl-attrib-inner').textContent.includes('Mapzen')"),'Map credits opens the native provider attribution');
    await capture?.('trek-controls-credits');await click('.maplibregl-ctrl-attrib-button');await sleep(100);
    check(await evaluate("!document.querySelector('.maplibregl-ctrl-attrib').open"),'the text disclosure closes cleanly');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');if(errors.length)console.error(JSON.stringify(errors.map(e=>e.params.exceptionDetails),null,2));check(!errors.length,'the changed controls and responsive states have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_LANDMARKS_ONLY==='1'){
    section('Oversized paper cathedrals along the real route');
    await setDesktop(1440,900);await goto('/trek/?day=4');await settled();
    await evaluate("document.querySelector('#photo-interludes').checked=false");
    for(const [id,distance] of [['reims',atPoint([4.02376,49.251785])],['nancy',atPoint([6.170667,48.682927])]]){
      await scrub(distance);check(await settled(),`${id} approach prepares`);
      check(await until(async()=>(await state()).paper?.landmarks.includes(id)),`${id} renders its architectural model beside the route`);
      for(const width of [1440,390,320]){
        await setDesktop(width,width>650?900:844);await sleep(950);
        const s=await state();check(s.landmark&&s.controlsFit&&s.overflow<=1&&s.paper.vertices<=2400000&&s.cameraClearance>=419.9,`${id} has a visible landmark caption and clear controls at ${width}px`);
        await capture?.(`trek-landmark-${id}-${width}`);
      }
      await setDesktop(1440,900);await click('#play');const start=await state();await sleep(6500);await click('#play');
      const after=await state();check(after.distance>start.distance+500&&after.cameraClearance>=419.9&&after.paper.landmarks.includes(id),`${id} remains grounded and visible during continuous approach`);
      await capture?.(`trek-landmark-${id}-passing`);
    }
    await choose(25);await settled();await scrub(atPoint([11.569563,48.139847]));await settled();
    check(await until(async()=>(await state()).paper?.landmarks.includes('munich')),'the larger style also reaches the existing Munich landmark');
    await capture?.('trek-landmark-munich');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the landmark approaches and phone resizes have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_FLOW_ONLY==='1'){
    section('Faster flow, paper photographs and the country atlas');
    await setDesktop(1440,900);await goto('/trek/?day=30');check(await settled(),'the Alpine scene prepares');
    check(await evaluate("!document.querySelector('.masthead button')&&document.querySelector('.journey-controls #menu-open')"),'the day selector replaces the top-right menu button');
    check((await state()).pace===0,'Flow starts with automatic pace');await setPace(6400);
    const showPrint=async()=>{
      await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=true;p.dispatchEvent(new Event('change',{bubbles:true}));})()");
      return until(async()=>(await state()).flash,6000);
    };
    for(const width of [1440,390,320]){
      const before=(await state()).distance;await setDesktop(width,width>650?900:844);
      check(await showPrint(),'an original day-30 print appears beside the landscape');await sleep(850);
      const fit=await evaluate(`(()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),p=box('#memory-flash'),m=box('#journey-minimap'),r=box('.journey-readout'),b=box('.mark');return {photo:p.left>=0&&p.right<innerWidth&&p.top>0&&p.bottom<r.top&&p.width<innerWidth*.44,minimap:m.left>b.right&&m.right<=innerWidth&&m.top>=0,elevation:getComputedStyle(document.querySelector('.elevation-profile')).visibility==='visible'};})()`);
      const view=await state();check(fit.photo&&fit.minimap&&fit.elevation&&view.controlsFit&&view.overflow<=1&&view.distance===before,`${width}px fits the print, atlas, elevation and controls without moving the route`);
      await capture?.(`trek-flow-${width}`);
    }
    await setDesktop(1440,900);await showPrint();await click('#play');
    const photoAt=(await state()).distance;await sleep(1400);
    check((await state()).playing&&(await state()).flash&&(await state()).distance>photoAt,'the automatic print leaves playback moving');
    const source=await evaluate("document.querySelector('#memory-flash .memory-image').getAttribute('src')");
    await click('#memory-flash');check(!(await state()).gallery,'the print has no navigation');await openPhotos();check(await until(async()=>(await state()).photoLoaded),'the menu opens the original photographs');
    const opened=await state();check(opened.gallery&&!opened.playing&&opened.galleryCount===37,'the gallery opens all 37 pictures from that day');
    await sleep(250);check((await state()).distance===opened.distance,'the opened photograph holds the exact journey position');await click('#gallery-close');
    await click('#menu-open');check((await state()).menu,'the date opens all journey options');
    await evaluate("(()=>{const p=document.querySelector('#photo-interludes');p.checked=false;p.dispatchEvent(new Event('change',{bubbles:true}));})()");await click('#menu-close');
    await click('#play');const samples=[await state()];
    for(let i=0;i<24;i++){await sleep(500);samples.push(await state());}
    await click('#play');
    const moved=samples.at(-1).distance-samples[0].distance;
    const turns=samples.slice(1).map((s,i)=>Math.abs(((s.bearing-samples[i].bearing+540)%360)-180)/((s.sampleTime-samples[i].sampleTime)/1000));
    check(moved>1500&&samples.every(s=>s.cameraClearance>=419.9&&s.pitch>=33.95&&s.pitch<=60.05)&&Math.max(...turns)<14.5,'sustained faster playback covers ground while retaining safe, gradual camera motion');
    console.log('  flow measurements '+JSON.stringify({metres:Math.round(moved),seconds:(samples.at(-1).sampleTime-samples[0].sampleTime)/1000,maxTurn:Math.max(...turns),minimumClearance:Math.min(...samples.map(s=>s.cameraClearance))}));
    for(const [day,country,flag] of [[3,'France','fr'],[17,'Germany','de'],[30,'Austria','at'],[36,'Slovenia','si'],[42,'Croatia','hr'],[54,'Serbia','rs'],[65,'Bulgaria','bg']]){
      await choose(day);check(await settled(),`${country} terrain prepares`);
      check(await until(async()=>{const s=await state();return s.wayfinding?.country===country&&s.wayfinding.flag===flag&&s.wayfinding.flagReady;},5000),`${country} has its flag beside the atlas country name`);
      const s=await state();check(s.elevation.samples>11000&&Number.isFinite(s.elevation.metres)&&Number.isFinite(s.mapElevation)&&s.mapElevation>0&&s.cameraClearance>=419.9,`${country} has a mapped profile and rendered terrain height`);
      console.log('  country terrain '+JSON.stringify({country,profile:s.elevation.metres,ground:s.mapElevation}));
    }
    const link=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await scrub((link.start+link.end)/2);check(await settled(),'the longest connection has a prepared landscape');
    const connection=await state();check(connection.kind==='connection'&&connection.elevation.kind==='connection'&&Number.isFinite(connection.elevation.metres)&&await evaluate("document.querySelector('#journey-progress').getAttribute('aria-valuetext').includes('connection')"),'visual links have mapped ground with a distinct connection label');
    await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await goto('/trek/?day=30');await settled();
    check((await state()).reduced&&!(await state()).photoInterludes&&!(await state()).flash,'reduced motion keeps automatic prints off');
    await cdp.send('Emulation.setEmulatedMedia',{features:[]});await goto('/trek/');
    await click('#opening-days');check((await state()).menu,'the quiet opening retains day and photo access while terrain loads');await click('#menu-close');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the updated journey and responsive states have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_ELEVATION_ONLY==='1'){
    section('Elevation profile, prepared playback and persistent tiles');
    await setDesktop(1440,900);const coldStart=Date.now();await goto('/trek/?day=30');
    check(await evaluate("document.querySelector('#play').disabled&&!window.trekStatus().playing"),'a cold journey waits for its landscape before allowing playback');
    check(await settled(),'the mountain scene and look-ahead tiles finish preparing');
    const coldMs=Date.now()-coldStart;let s=await state();
    check(s.elevation?.samples>11000&&s.elevation.metres>1100&&s.elevation.metres<1400,'the entire mapped elevation profile is loaded and the Alpine position matches');
    check(s.cache?.persistent&&s.cache.network>0,'the map uses a persistent cache on the first visit');
    await until(async()=>(await state()).cache.pending===0,30000);const coldCache=(await state()).cache;
    const oldCanvas=await evaluate("document.querySelector('#elevation-canvas').toDataURL()");
    await evaluate(`window.__trekPerf={intervals:[],longTasks:[],last:0,running:true};window.__trekPerf.observe=new PerformanceObserver(l=>window.__trekPerf.longTasks.push(...l.getEntries().map(e=>e.duration)));window.__trekPerf.observe.observe({entryTypes:['longtask']});requestAnimationFrame(function sample(t){const p=window.__trekPerf;if(!p?.running)return;if(p.last)p.intervals.push(t-p.last);p.last=t;requestAnimationFrame(sample);});document.querySelector('#photo-interludes').checked=false;`);
    check(s.pace===0,'Flow starts with automatic pace');
    await setPace(3200);
    check((await state()).pace===3200,'Fly selects the faster optional pace');
    await click('#play');await sleep(25000);await click('#play');
    const perf=await evaluate(`(()=>{const p=window.__trekPerf;p.running=false;p.observe.disconnect();const a=p.intervals.slice(2).sort((x,y)=>x-y);const value={frames:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],over100:a.filter(x=>x>100).length,longTasks:p.longTasks};delete window.__trekPerf;return value;})()`);
    s=await state();check(s.distance>1109065+200,'playback moves along the terrain after preparation');
    check((await evaluate("document.querySelector('#elevation-canvas').toDataURL()"))!==oldCanvas,'the elevation marker follows playback');
    check(perf.frames>500&&perf.p95<80&&perf.over100<=5,'sustained playback avoids recurring long frames');
    console.log('  measurements '+JSON.stringify({coldMs,coldCache,playback:{...perf,travelled:s.distance-1109065.0493459906,cache:s.cache}}));
    const warmStart=Date.now();await goto('/trek/?day=30');check(await settled(),'a return visit opens the cached landscape');
    await until(async()=>(await state()).cache.pending===0,30000);const warmCache=(await state()).cache;
    check(warmCache.hits>40&&warmCache.network<coldCache.network*.4,'a new page reuses stored tiles instead of downloading the landscape again');
    console.log('  cache revisit '+JSON.stringify({warmMs:Date.now()-warmStart,cache:warmCache}));
    for(const width of [390,320]){
      const before=(await state()).distance;await setDesktop(width,844);await sleep(350);
      const fit=await evaluate(`(()=>{const p=document.querySelector('.elevation-profile').getBoundingClientRect(),r=document.querySelector('.journey-readout').getBoundingClientRect();return {width:p.width,height:p.height,inside:p.left>=0&&p.right<=innerWidth&&p.bottom<innerHeight,above:r.bottom<=p.top}})()`);
      s=await state();check(fit.inside&&fit.above&&fit.width>160&&fit.height>=50&&s.controlsFit&&s.overflow<=1&&s.distance===before,`${width}px keeps the elevation, larger totals and controls legible without moving the route`);
    }
    const link=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await scrub((link.start+link.end)/2);check(await settled(),'an unrecorded connection can be prepared');
    check(Number.isFinite((await state()).elevation.metres)&&(await state()).elevation.kind==='connection'&&await evaluate("document.querySelector('#journey-progress').getAttribute('aria-valuetext').includes('connection')"),'a connection shows mapped ground with its distinct provenance');
    await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:3000000,uploadThroughput:1000000});
    await choose(17);await choose(49);await choose(30);check(await settled(),'rapid day changes discard superseded preparation work');
    check((await state()).day===30&&!await evaluate("document.querySelector('#play').disabled"),'only the final chosen destination becomes ready');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await openPhotos();check(await until(async()=>(await state()).photoLoaded),'photographs still open over the cached map');await click('#gallery-close');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'loading, cached returns, playback and resizes have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_WAYFINDING_ONLY==='1'){
    section('Minimap, town names and landmark models');
    await setDesktop(1440,900);await goto('/trek/?day=25');check(await settled(),'the updated journey loads');
    await scrub(atPoint([11.569563,48.139847]));check(await settled(),'the recorded Munich approach loads');
    check(await until(async()=>(await state()).wayfinding?.place==='Munich'),'the current map tiles announce Munich beside the route');
    check(await evaluate("window.trekStatus().wayfinding.flag==='de'&&window.trekStatus().wayfinding.flagReady&&document.querySelector('#place-arrival').classList.contains('visible')"),'the German flag and place arrival appear');
    check(await until(async()=>{const p=(await state()).paper;return p?.landmarks.includes('munich')&&p.hiddenBuildings>=4;},30000),'the Frauenkirche replaces the native body and multi-part towers');
    const markerBefore=(await state()).wayfinding.point,canvasBefore=await evaluate("document.querySelector('#minimap-canvas').toDataURL()");
    await click('#play');await sleep(900);await click('#play');
    check(JSON.stringify((await state()).wayfinding.point)!==JSON.stringify(markerBefore),'the inset marker follows actual playback');
    check((await evaluate("document.querySelector('#minimap-canvas').toDataURL()"))!==canvasBefore,'the visible inset updates as the traveller moves');
    const at=(await state()).distance;await openPhotos();
    check(await until(async()=>(await state()).photoLoaded),'the original photographs load over the updated landscape');
    await click('#gallery-close');check((await state()).distance===at,'photographs preserve the exact route position');
    for(const [name,distance,flag] of [['reims',atPoint([4.02376,49.251785]),'fr'],['ptuj',atPoint([15.861039,46.413737]),'si'],['sofia',path.total-600,'bg']]){
      await scrub(distance);check(await settled(),`${name} approach loads`);
      check(await until(async()=>(await state()).paper?.landmarks.includes(name),30000),`${name} has its distinct paper model`);
      check(await until(async()=>{const w=(await state()).wayfinding;return w.flag===flag&&w.flagReady;}),`${name} shows its country flag on the minimap`);
    }
    for(const width of [390,320]){
      const before=(await state()).distance;
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);
      const fit=await evaluate(`(()=>{const mini=document.querySelector('#journey-minimap').getBoundingClientRect(),header=document.querySelector('.masthead').getBoundingClientRect();return {inside:mini.left>=0&&mini.right<=innerWidth&&mini.top>=0&&mini.left>document.querySelector('.mark').getBoundingClientRect().right,small:mini.width<=150,stats:[...document.querySelectorAll('.journey-readout dd,.journey-readout dt')].every(e=>e.scrollWidth<=e.clientWidth+1),type:parseFloat(getComputedStyle(document.querySelector('.journey-readout dd')).fontSize)}})()`);
      const s=await state();check(fit.inside&&fit.small&&fit.stats&&fit.type>=27&&s.controlsFit&&s.overflow<=1&&s.distance===before,`${width}px fits the inset, larger progress and controls without moving the route`);
    }
    const link=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await scrub((link.start+link.end)/2);await settled();check((await state()).wayfinding.place===null,'a visual connection never claims a town visit');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'wayfinding, model replacement and phone resizes have no runtime errors');
    return;
  }
  if(process.env.CHECK_TREK_PROGRESS_ONLY==='1'){
    section('Recorded and estimated walking progress');
    const data=JSON.parse(readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8').match(/var DATA = (.*);/)[1]);
    const links=JSON.parse(readFileSync(new URL('../public/trek/route-links.json',import.meta.url),'utf8')),profile=JSON.parse(readFileSync(new URL('../public/trek/elevation-profile.json',import.meta.url),'utf8'));
    const metrics=require('../public/trek/journey-metrics.js').create(path,links,profile,data.days);
    const readout=()=>evaluate(`({day:String(window.trekStatus().day),km:document.querySelector('#readout-distance').textContent,ascent:document.querySelector('#readout-ascent').textContent,labels:[...document.querySelectorAll('.journey-readout dt')].map(e=>e.textContent),fit:[...document.querySelectorAll('.journey-readout dd,.journey-readout dt')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1}),top:document.querySelector('.journey-readout').getBoundingClientRect().top})`);
    await setDesktop(1440,900);await goto('/trek/?day=30');check(await settled(),'the mountain view loads with visible progress');
    let values=await readout(),s=await state();
    const expected=metrics.sample(s.distance);
    check(values.day==='30'&&Math.abs(Number(values.km.replaceAll(',',''))-expected.km)<.06,'distance combines recorded progress with completed walking estimates');
    check(Number(values.ascent.replaceAll(',',''))===Math.round(expected.ascent),'ascent combines the original climb with estimated uphill terrain');
    check(values.labels.every(s=>s.includes('est.')),'the visible labels identify totals containing estimates');
    check(values.fit&&values.top>900*.7,'the readable desktop counters and day strip stay in the lower part of the landscape');
    for(const train of path.pieces.filter(p=>p.mode==='train')){
      await scrub(train.start+(train.end-train.start)*.2);check(await settled(),'the train section prepares');const first=await readout();
      await scrub(train.start+(train.end-train.start)*.8);check(await settled(),'the later train position prepares');values=await readout();
      check(values.km===first.km&&values.ascent===first.ascent,'the train transfer adds neither walking distance nor ascent');
    }
    const walking=path.pieces.filter(p=>p.mode==='walk'&&p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await scrub(walking.start+(walking.end-walking.start)*.2);await settled();const first=await readout();
    await scrub(walking.start+(walking.end-walking.start)*.7);check(await settled(),'a previously unrecorded walking day prepares');values=await readout();
    check(Number(values.km.replaceAll(',',''))>Number(first.km.replaceAll(',',''))&&Number(values.ascent.replaceAll(',',''))>Number(first.ascent.replaceAll(',','')),'both counters advance along the reconstructed Serbian walk');
    await click('#menu-open');
    const details=await evaluate(`(()=>{const day=document.querySelector('#day-estimate');return {estimated:!day.hidden&&day.textContent.includes('Estimated walking:'),original:document.querySelector('#walk-recorded').textContent,extra:document.querySelector('#walk-estimated').textContent};})()`);
    check(details.estimated&&details.original.includes('1,982 km')&&details.extra.includes('260 km')&&details.extra.includes('train transfers are excluded'),'daily details and the full-journey breakdown retain the sources and train exclusion');
    await evaluate("[...document.querySelectorAll('#journey-menu summary')].filter(e=>['This day','About this journey'].includes(e.textContent)).forEach(e=>e.click());document.querySelector('#walk-totals').scrollIntoView({block:'start'});");
    await capture?.('trek-estimates-menu');await click('#menu-close');
    for(const [width,height] of [[1440,900],[390,844],[320,844],[844,390]]){
      const beforeResize=await state();
      await setDesktop(width,height);await sleep(250);
      values=await readout();s=await state();
      check(values.fit&&s.controlsFit&&s.overflow<=1&&s.distance===beforeResize.distance,`${width}×${height} fits the enlarged totals and estimate labels without moving the route`);
      await capture?.(`trek-estimates-${width}-${height}`);
    }
    await scrub(path.total);values=await readout();
    check(values.day==='67'&&values.km===new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(data.total)&&values.ascent===Math.round(data.stats.ascent).toLocaleString('en-GB'),'Sofia includes all estimated walking distance and ascent');
    await scrub(0);values=await readout();check(values.km==='0'&&values.ascent==='0'&&values.labels.every(s=>!s.includes('est.')),'seeking back to Paris clears the totals and estimate labels');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the progress overlay reports no runtime errors');
    return;
  }
  section('Paper details on a fresh, paused visit');
  await setDesktop(390,844);await goto('/trek/?day=17');
  check(await settled(),'a fresh woodland visit loads its terrain');
  check(await until(async()=>{const s=await state();return s.paper?.trees>0&&s.paper?.roofs>0;},30000),'paper details appear without playing or changing days');
  const cold=await state();await sleep(1200);
  const still=await state();
  check(still.paper.trees<=6500&&still.paper.roofs<=1800&&still.paper.vertices<=2400000,'the detailed paper scene stays within its tree, roof and vertex limits');
  check(!still.playing&&still.distance===cold.distance&&still.paper.updates<=cold.paper.updates+1,'the paused view settles without rebuilding its scenery in an idle loop');
  if(process.env.CHECK_TREK_PAPER_ONLY==='1'){
    for(const width of [1440,320,390]){
      await setDesktop(width,width>650?900:844);await sleep(650);
      const view=await state();check(view.overflow<=1&&view.controlsFit,`the paper view and controls fit at ${width}px`);
      await capture?.(`trek-paper-woodland-${width}`);
    }
    check((await state()).paper.trees>0,'paper scenery survives desktop and phone resizes');
    await openPhotos();check(await until(async()=>(await state()).photoLoaded),'the original photographs open from the detailed paper view');await click('#gallery-close');
    await choose(30);check(await settled(),'the detailed Alpine landscape prepares after leaving the woodland');
    for(const width of [1440,390]){
      await setDesktop(width,width>650?900:844);await sleep(650);
      const view=await state();check(view.paper.trees>0&&view.cameraClearance>=419.9&&view.controlsFit&&view.overflow<=1,`the Alpine detail and ground clearance hold at ${width}px`);
      await capture?.(`trek-paper-alps-${width}`);
    }
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the fresh paper view and resizes have no JavaScript errors');
    return;
  }
  section('Traveller landscape and quiet controls');
  await setDesktop(1440,900);await goto('/trek/?day=30');
  check(await settled(),'the mountain camera loads its destination elevation');
  let s=await state();
  check(s.day===30&&s.routeLines===57&&s.connections===56&&s.pitch>=42&&s.eyeHeight>1000,'the traveller is above the mountain terrain with all recordings and connections');
  check(!s.creditsExpanded&&s.controlsFit&&s.overflow<=1,'credits are collapsed and desktop controls fit');
  check(await evaluate('!document.querySelector("#journey-card,#journey-reset,#path-tools,#journey-footer")'),'the landscape has no permanent photo card or redundant map controls');
  section('Mapped paper landscape');
  await choose(17);check(await settled(),'the German woodland and village stretch loads');
  check(await until(async()=>{const p=(await state()).paper;return p?.trees>0&&p?.roofs>0;},30000),'mapped woods have paper canopies and small buildings have folded roofs');
  s=await state();
  check(s.paper.trees<=6500&&s.paper.roofs<=1800&&s.paper.vertices<=2400000,'paper scenery keeps a bounded geometry budget');
  const paperBefore=s.distance;
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);
  s=await state();check(s.overflow<=1&&s.controlsFit&&s.distance===paperBefore,'the paper landscape and original progress controls fit the phone without moving the route');
  await openPhotos();check(await until(async()=>(await state()).photoLoaded),'original photographs still open over the paper landscape');await click('#gallery-close');
  await setDesktop(1440,900);await choose(30);check(await settled(),'the Alpine landscape loads after the woodland view');
  check(await until(async()=>(await state()).paper?.updates>0,30000),'paper detail also renders in the Alpine terrain');
  section('Calm camera through steep terrain');
  for(const fraction of [.25,.5,.74,.9]){
    await scrub(path.dayDistance(30,fraction));check(await settled(),`the Alpine camera loads at ${(fraction*100).toFixed(0)}% of the day`);
    s=await state();check(s.pitch<=60.05&&s.pitch>=33.95&&s.cameraClearance>=419.9,'the view keeps a controlled tilt and clears the actual mountain ground');
  }
  await scrub(path.dayDistance(30,.74));await settled();
  await click('#menu-open');await click('#photo-interludes');await click('#menu-close');await click('#play');
  const mountainSamples=[await state()];
  for(let i=0;i<20;i++){await sleep(500);mountainSamples.push(await state());}
  await click('#play');
  check(mountainSamples.at(-1).distance>mountainSamples[0].distance,'playback advances from the mountain viewpoint');
  check(mountainSamples.every(s=>s.cameraClearance>=419.9&&s.pitch>=33.95&&s.pitch<=60.05),'playback keeps the camera out of the terrain without pitching toward the horizon');
  check(mountainSamples.every(s=>Math.abs(s.mapElevation-(s.eyeHeight-s.cameraClearance))<.01),'the zoom reference follows local ground rather than retaining the old mountain altitude');
  const turns=mountainSamples.slice(1).map((s,i)=>Math.abs(((s.bearing-mountainSamples[i].bearing+540)%360)-180)/((s.sampleTime-mountainSamples[i].sampleTime)/1000));
  check(Math.max(...turns)<14.5,'actual rendered turns stay below 14.5 degrees per second');
  const tilts=mountainSamples.slice(1).map((s,i)=>Math.abs(s.pitch-mountainSamples[i].pitch)/((s.sampleTime-mountainSamples[i].sampleTime)/1000));
  check(Math.max(...tilts)<3.5,'the camera tilts gradually as the ground falls away');
  process.stdout.write(`  measured maximum turn ${Math.max(...turns).toFixed(2)}°/s; minimum ground clearance ${Math.min(...mountainSamples.map(s=>s.cameraClearance)).toFixed(0)} m; travelled ${(mountainSamples.at(-1).distance-mountainSamples[0].distance).toFixed(1)} m\n`);
  await click('#menu-open');await click('#photo-interludes');await click('#menu-close');
  await scrub(path.dayDistance(30,.5));await settled();
  if(process.env.CHECK_TREK_CAMERA_ONLY==='1'){
    for(const width of [390,320]){
      const before=(await state()).distance;
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);s=await state();
      check(s.distance===before&&s.controlsFit&&s.overflow<=1&&s.pitch<=60.05&&s.cameraClearance>=419.9,`${width}px preserves the route and safe camera framing`);
    }
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the camera reports no runtime errors');
    return;
  }
  await click('#menu-open');check((await state()).menu,'the additional controls open in one menu');
  check(await evaluate('document.querySelectorAll("#journey-day option").length===67&&document.querySelectorAll("#chapters button").length===6'),'all days and chapters remain reachable');
  check(await evaluate('document.querySelector("#day-note").textContent.includes("Tauern")&&document.querySelector("#record-artist").textContent.includes("Brian Eno")'),'the original mountain note and its actual record remain available');

  section('Immersive photographs preserve route position');
  await click('#menu-photos');check(await until(async()=>(await state()).photoLoaded),'the photograph loads');
  const photoStart=await state();
  check(photoStart.gallery&&photoStart.galleryCount===37,'all 37 photographs from the mountain day open full-screen');
  await click('#photo-forward');s=await state();check(s.photo!==photoStart.photo&&s.distance===photoStart.distance,'browsing photographs leaves the journey exactly in place');
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft'});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft'});
  check((await state()).photo===photoStart.photo,'arrow keys browse the full-screen photographs');
  await click('#gallery-close');check(!(await state()).gallery,'the photograph closes back to the landscape');
  await click('#menu-open');await choose(17);check(await settled(),'the shared recording can be opened');
  check(await evaluate('document.querySelector("#day-recording").textContent.includes("shared recording")&&document.querySelector("#day-facts").textContent.includes("70.9 km")'),'the approximate shared day and original combined distance remain disclosed');
  await choose(5);await settled();check(await evaluate('document.querySelector("#day-recording").textContent.includes("No separate recording")'),'an unrecorded day identifies its visual connection');
  await click('[data-chapter="belgrade"]');await settled();
  check((await state()).day===53&&!(await state()).menu,'chapter navigation returns to the traveller view');

  section('Continuous playback and camera motion');
  const link=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
  await scrub((link.start+link.end)/2);check(await settled(),'the largest unrecorded connection loads');
  check((await state()).kind==='connection','the 94 km connection is traversable and remains classified separately');
  await click('#play');const samples=[];
  for(let i=0;i<10;i++){await sleep(120);samples.push(await state());}
  await click('#play');
  check(samples.at(-1).distance>samples[0].distance&&samples.every(s=>s.kind==='connection'),'playback flows forward through the formerly disjoint section');
  const jumps=samples.slice(1).map((s,i)=>Math.abs(((s.bearing-samples[i].bearing+540)%360)-180));
  check(Math.max(...jumps)<18,'the camera turns smoothly without a heading snap');
  const held=(await state()).distance;await sleep(300);check((await state()).distance===held,'Pause holds the route position');
  await scrub(path.dayDistance(30,.5));check(await settled(),'the camera returns from the gap to the mountain recording');await click('#play');
  const sawFlash=await until(async()=>(await state()).flash,35000);
  check(sawFlash,'a photograph appears as a small automatic paper print');if(!sawFlash)process.stdout.write(JSON.stringify(await state())+'\n');
  const memoryAt=(await state()).distance;await sleep(300);check(sawFlash&&(await state()).distance>memoryAt,'the paper print keeps the journey moving');
  await click('#memory-flash');check(!(await state()).gallery,'the print never opens a link');await openPhotos();check((await state()).gallery&&!(await state()).playing,'the menu opens the gallery and pauses the journey');await click('#gallery-close');

  section('Phone layouts and exact position preservation');
  for(const width of [390,320]){
    const before=(await state()).distance;
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);s=await state();
    check(s.distance===before&&s.controlsFit&&s.overflow<=1,`${width}px leaves the landscape clear and preserves the route position`);
    await openPhotos();check((await state()).gallery,'the phone photograph opens');
    check(await evaluate('(()=>{const r=document.querySelector("#photo-gallery").getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight})()'),'the photograph fills the phone without an inset card');
    await click('#gallery-close');await click('#menu-open');check(await evaluate('document.querySelector("#journey-menu").getBoundingClientRect().width<=innerWidth'),'the day menu fits the phone');await click('#menu-close');
  }
  section('Finish, replay and reduced motion');
  await scrub(path.total);check(await evaluate('!document.querySelector("#ending").hidden'),'the continuous journey ends in Sofia');
  await click('#replay');check(await settled()&&(await state()).playing&&(await state()).day===1,'Replay prepares Paris and then starts automatically');
  await click('#menu-open');await click('#restart');check(!(await state()).started&&!(await state()).playing,'Back to Paris returns to the quiet opening');
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await goto('/trek/?day=30');await settled();
  check((await state()).reduced&&!(await state()).photoInterludes,'reduced motion disables automatic photographic prints');
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
  section('Graphics fallback and runtime errors');
  await evaluate('document.querySelector(".maplibregl-canvas").dispatchEvent(new Event("webglcontextlost"))');
  check((await state()).failed&&!(await state()).playing&&await evaluate('!document.querySelector("#map-status").hidden'),'graphics loss pauses and explains the unavailable landscape');
  await openPhotos();check((await state()).gallery,'photographs remain available after graphics loss');
  const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');
  check(errors.length===0,`the traveller runtime reports no JavaScript errors [${errors.length}]`);
  if(errors.length)process.stdout.write(JSON.stringify(errors.map(e=>e.params))+'\n');
}
