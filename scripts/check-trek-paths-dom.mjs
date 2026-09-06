/* Real browser checks for the continuous traveller view. */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildJourneyPath}=require('../public/trek/journey-route.js');
const route=JSON.parse(readFileSync(new URL('../public/trek/route-detail.json',import.meta.url),'utf8'));
const path=buildJourneyPath(route);

export async function checkTrekPaths({cdp,evaluate,goto,setDesktop,sleep,check,section}){
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const choose=n=>evaluate(`(() => {const e=document.querySelector('#journey-day');e.value=${n};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const scrub=distance=>evaluate(`(() => {const e=document.querySelector('#journey-progress');e.value=${distance/path.total*1000};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const state=()=>evaluate(`({...window.trekStatus?.(),sampleTime:performance.now(),overflow:document.documentElement.scrollWidth-innerWidth,menu:document.querySelector('#journey-menu').open,gallery:document.querySelector('#photo-gallery').open,photo:document.querySelector('#gallery-image').getAttribute('src'),photoLoaded:document.querySelector('#gallery-image').naturalWidth>0,creditsExpanded:document.querySelector('.maplibregl-ctrl-attrib')?.classList.contains('maplibregl-compact-show'),controlsFit:[...document.querySelectorAll('.masthead button,.journey-controls button,.journey-controls input')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})})`);
  const until=async(predicate,limit=20000)=>{const end=Date.now()+limit;while(Date.now()<end){if(await predicate())return true;await sleep(120);}return false;};
  const settled=()=>until(async()=>(await state()).ready,30000);
  await cdp.send('Runtime.enable');const startEvents=cdp.events.length;
  if(process.env.CHECK_TREK_ELEVATION_ONLY==='1'){
    section('Elevation profile, prepared playback and persistent tiles');
    await setDesktop(1440,900);const coldStart=Date.now();await goto('/trek/?day=30');
    check(await evaluate("document.querySelector('#play').disabled&&!window.trekStatus().playing"),'a cold journey waits for its landscape before allowing playback');
    check(await settled(),'the mountain scene and look-ahead tiles finish preparing');
    const coldMs=Date.now()-coldStart;let s=await state();
    check(s.elevation?.samples===9820&&s.elevation.metres>1100&&s.elevation.metres<1400,'the entire mapped elevation profile is loaded and the Alpine position matches');
    check(s.cache?.persistent&&s.cache.network>0,'the map uses a persistent cache on the first visit');
    await until(async()=>(await state()).cache.pending===0,30000);const coldCache=(await state()).cache;
    const oldCanvas=await evaluate("document.querySelector('#elevation-canvas').toDataURL()");
    await evaluate(`window.__trekPerf={intervals:[],longTasks:[],last:0,running:true};window.__trekPerf.observe=new PerformanceObserver(l=>window.__trekPerf.longTasks.push(...l.getEntries().map(e=>e.duration)));window.__trekPerf.observe.observe({entryTypes:['longtask']});requestAnimationFrame(function sample(t){const p=window.__trekPerf;if(!p?.running)return;if(p.last)p.intervals.push(t-p.last);p.last=t;requestAnimationFrame(sample);});document.querySelector('#photo-interludes').checked=false;`);
    await evaluate("document.querySelector('#pace').value='1000';document.querySelector('#pace').dispatchEvent(new Event('change',{bubbles:true}));");
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
    check((await state()).elevation.metres===null&&await evaluate("document.querySelector('#elevation-current').textContent.includes('Connection')"),'a connection never invents a recorded elevation');
    await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:3000000,uploadThroughput:1000000});
    await choose(17);await choose(49);await choose(30);check(await settled(),'rapid day changes discard superseded preparation work');
    check((await state()).day===30&&!await evaluate("document.querySelector('#play').disabled"),'only the final chosen destination becomes ready');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await click('#photos-open');check(await until(async()=>(await state()).photoLoaded),'photographs still open over the cached map');await click('#gallery-close');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'loading, cached returns, playback and resizes have no JavaScript exceptions');
    return;
  }
  if(process.env.CHECK_TREK_WAYFINDING_ONLY==='1'){
    section('Minimap, town names and landmark models');
    await setDesktop(1440,900);await goto('/trek/?day=25');check(await settled(),'the updated journey loads');
    await scrub(863400);check(await settled(),'the recorded Munich approach loads');
    check(await until(async()=>(await state()).wayfinding?.place==='Munich'),'the current map tiles announce Munich beside the route');
    check(await evaluate("document.querySelector('#country-flag').textContent==='🇩🇪'&&document.querySelector('#place-arrival').classList.contains('visible')"),'the German flag and place arrival appear');
    check(await until(async()=>{const p=(await state()).paper;return p?.landmarks.includes('munich')&&p.hiddenBuildings>=4;},30000),'the Frauenkirche replaces the native body and multi-part towers');
    const markerBefore=(await state()).wayfinding.point,canvasBefore=await evaluate("document.querySelector('#minimap-canvas').toDataURL()");
    await click('#play');await sleep(900);await click('#play');
    check(JSON.stringify((await state()).wayfinding.point)!==JSON.stringify(markerBefore),'the inset marker follows actual playback');
    check((await evaluate("document.querySelector('#minimap-canvas').toDataURL()"))!==canvasBefore,'the visible inset updates as the traveller moves');
    const at=(await state()).distance;await click('#photos-open');
    check(await until(async()=>(await state()).photoLoaded),'the original photographs load over the updated landscape');
    await click('#gallery-close');check((await state()).distance===at,'photographs preserve the exact route position');
    for(const [name,distance,flag] of [['reims',136600,'🇫🇷'],['ptuj',1408700,'🇸🇮'],['sofia',path.total-600,'🇧🇬']]){
      await scrub(distance);check(await settled(),`${name} approach loads`);
      check(await until(async()=>(await state()).paper?.landmarks.includes(name),30000),`${name} has its distinct paper model`);
      check(await evaluate(`document.querySelector('#country-flag').textContent===${JSON.stringify(flag)}`),`${name} shows its country flag`);
    }
    for(const width of [390,320]){
      const before=(await state()).distance;
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);
      const fit=await evaluate(`(()=>{const mini=document.querySelector('#journey-minimap').getBoundingClientRect(),header=document.querySelector('.masthead').getBoundingClientRect();return {inside:mini.left>=0&&mini.right<=innerWidth&&mini.top>=header.bottom,small:mini.width<=150,stats:[...document.querySelectorAll('.journey-readout dd,.journey-readout dt')].every(e=>e.scrollWidth<=e.clientWidth+1),type:parseFloat(getComputedStyle(document.querySelector('.journey-readout dd')).fontSize)}})()`);
      const s=await state();check(fit.inside&&fit.small&&fit.stats&&fit.type>=27&&s.controlsFit&&s.overflow<=1&&s.distance===before,`${width}px fits the inset, larger progress and controls without moving the route`);
    }
    const link=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await scrub((link.start+link.end)/2);await settled();check((await state()).wayfinding.place===null,'a visual connection never claims a town visit');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'wayfinding, model replacement and phone resizes have no runtime errors');
    return;
  }
  if(process.env.CHECK_TREK_PROGRESS_ONLY==='1'){
    section('Journey progress overlay');
    const data=JSON.parse(readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8').match(/var DATA = (.*);/)[1]);
    const readout=()=>evaluate(`({day:document.querySelector('#readout-day').textContent,km:document.querySelector('#readout-distance').textContent,ascent:document.querySelector('#readout-ascent').textContent,fit:[...document.querySelectorAll('.journey-readout dd,.journey-readout dt')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1}),top:document.querySelector('.journey-readout').getBoundingClientRect().top})`);
    await setDesktop(1440,900);await goto('/trek/?day=30');check(await settled(),'the mountain view loads with visible progress');
    let values=await readout(),s=await state();
    const expected=path.recordedFraction(30,s.distance),before=data.days[28],after=data.days[29];
    check(values.day==='30'&&Math.abs(Number(values.km.replaceAll(',',''))-(before.cum+(after.cum-before.cum)*expected))<.06,'distance uses the original daily totals and recorded progress');
    check(Number(values.ascent.replaceAll(',',''))===Math.round(before.cumElev+(after.cumElev-before.cumElev)*expected),'ascent is the original accumulated climb, independent of camera height');
    check(values.fit&&values.top>900*.75,'the desktop readout leaves the landscape open');
    const link=path.pieces.filter(p=>p.kind==='connection').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
    await scrub((link.start+link.end)/2);await settled();const first=await readout();await click('#play');await sleep(900);await click('#play');values=await readout();
    check(values.km===first.km&&values.ascent===first.ascent,'the long visual connection adds neither distance nor ascent');
    await scrub(path.dayDistance(30,.5));await settled();
    for(const width of [390,320]){
      const beforeResize=await state();
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(180);
      values=await readout();s=await state();
      check(values.fit&&values.top>844*.75&&s.controlsFit&&s.overflow<=1&&s.distance===beforeResize.distance,`${width}px fits the numbers and controls without moving the route`);
    }
    await scrub(path.total);values=await readout();
    check(values.day==='67'&&values.km==='1,982'&&values.ascent===Math.round(data.stats.ascent).toLocaleString('en-GB'),'Sofia shows the exact journey totals');
    const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');check(!errors.length,'the progress overlay reports no runtime errors');
    return;
  }
  section('Paper details on a fresh, paused visit');
  await setDesktop(390,844);await goto('/trek/?day=17');
  check(await settled(),'a fresh woodland visit loads its terrain');
  check(await until(async()=>{const s=await state();return s.paper?.trees>0&&s.paper?.roofs>0;},30000),'paper details appear without playing or changing days');
  const cold=await state();await sleep(1200);
  const still=await state();
  check(!still.playing&&still.distance===cold.distance&&still.paper.updates<=cold.paper.updates+1,'the paused view settles without rebuilding its scenery in an idle loop');
  if(process.env.CHECK_TREK_PAPER_ONLY==='1'){
    for(const width of [1440,320,390]){await setDesktop(width,width>650?900:844);await sleep(650);}
    check((await state()).paper.trees>0,'paper scenery survives desktop and phone resizes');
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
  check(s.paper.trees<=6500&&s.paper.roofs<=1800&&s.paper.vertices<405000,'paper scenery keeps a bounded geometry budget');
  const paperBefore=s.distance;
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);
  s=await state();check(s.overflow<=1&&s.controlsFit&&s.distance===paperBefore,'the paper landscape and original progress controls fit the phone without moving the route');
  await click('#photos-open');check(await until(async()=>(await state()).photoLoaded),'original photographs still open over the paper landscape');await click('#gallery-close');
  await setDesktop(1440,900);await choose(30);check(await settled(),'the Alpine landscape loads after the woodland view');
  check(await until(async()=>(await state()).paper?.updates>0,30000),'paper detail also renders in the Alpine terrain');
  section('Calm camera through steep terrain');
  for(const fraction of [.25,.5,.74,.9]){
    await scrub(path.dayDistance(30,fraction));check(await settled(),`the Alpine camera loads at ${(fraction*100).toFixed(0)}% of the day`);
    s=await state();check(s.pitch<=60.05&&s.pitch>=41.95&&s.cameraClearance>=419.9,'the view keeps a controlled tilt and clears the actual mountain ground');
  }
  await scrub(path.dayDistance(30,.74));await settled();
  await click('#menu-open');await click('#photo-interludes');await click('#menu-close');await click('#play');
  const mountainSamples=[await state()];
  for(let i=0;i<20;i++){await sleep(500);mountainSamples.push(await state());}
  await click('#play');
  check(mountainSamples.at(-1).distance>mountainSamples[0].distance,'playback advances from the mountain viewpoint');
  check(mountainSamples.every(s=>s.cameraClearance>=419.9&&s.pitch>=41.95&&s.pitch<=60.05),'playback keeps the camera out of the terrain without pitching toward the horizon');
  check(mountainSamples.every(s=>Math.abs(s.mapElevation-(s.eyeHeight-s.cameraClearance))<.01),'the zoom reference follows local ground rather than retaining the old mountain altitude');
  const turns=mountainSamples.slice(1).map((s,i)=>Math.abs(((s.bearing-mountainSamples[i].bearing+540)%360)-180)/((s.sampleTime-mountainSamples[i].sampleTime)/1000));
  check(Math.max(...turns)<9.5,'actual rendered turns stay below 9.5 degrees per second');
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
  check(sawFlash,'a photograph appears as an automatic full-screen interlude');if(!sawFlash)process.stdout.write(JSON.stringify(await state())+'\n');
  const memoryAt=(await state()).distance;await sleep(300);check(sawFlash&&(await state()).distance===memoryAt,'the interlude holds the journey without skipping a stretch');
  await click('#play');check(!(await state()).flash&&!(await state()).playing,'the single play control dismisses and pauses the interlude');

  section('Phone layouts and exact position preservation');
  for(const width of [390,320]){
    const before=(await state()).distance;
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);s=await state();
    check(s.distance===before&&s.controlsFit&&s.overflow<=1,`${width}px leaves the landscape clear and preserves the route position`);
    await click('#photos-open');check((await state()).gallery,'the phone photograph opens');
    check(await evaluate('(()=>{const r=document.querySelector("#photo-gallery").getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight})()'),'the photograph fills the phone without an inset card');
    await click('#gallery-close');await click('#menu-open');check(await evaluate('document.querySelector("#journey-menu").getBoundingClientRect().width<=innerWidth'),'the day menu fits the phone');await click('#menu-close');
  }
  section('Finish, replay and reduced motion');
  await scrub(path.total);check(await evaluate('!document.querySelector("#ending").hidden'),'the continuous journey ends in Sofia');
  await click('#replay');check(await settled()&&(await state()).playing&&(await state()).day===1,'Replay prepares Paris and then starts automatically');
  await click('#menu-open');await click('#restart');check(!(await state()).started&&!(await state()).playing,'Back to Paris returns to the quiet opening');
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await goto('/trek/?day=30');await settled();
  check((await state()).reduced&&!(await state()).photoInterludes,'reduced motion disables automatic photographic interludes');
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
  section('Graphics fallback and runtime errors');
  await evaluate('document.querySelector(".maplibregl-canvas").dispatchEvent(new Event("webglcontextlost"))');
  check((await state()).failed&&!(await state()).playing&&await evaluate('!document.querySelector("#map-status").hidden'),'graphics loss pauses and explains the unavailable landscape');
  await click('#photos-open');check((await state()).gallery,'photographs remain available after graphics loss');
  const errors=cdp.events.slice(startEvents).filter(e=>e.method==='Runtime.exceptionThrown');
  check(errors.length===0,`the traveller runtime reports no JavaScript errors [${errors.length}]`);
  if(errors.length)process.stdout.write(JSON.stringify(errors.map(e=>e.params))+'\n');
}
