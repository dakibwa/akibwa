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
  const state=()=>evaluate(`({...window.trekStatus?.(),overflow:document.documentElement.scrollWidth-innerWidth,menu:document.querySelector('#journey-menu').open,gallery:document.querySelector('#photo-gallery').open,photo:document.querySelector('#gallery-image').getAttribute('src'),photoLoaded:document.querySelector('#gallery-image').naturalWidth>0,creditsExpanded:document.querySelector('.maplibregl-ctrl-attrib')?.classList.contains('maplibregl-compact-show'),controlsFit:[...document.querySelectorAll('.masthead button,.journey-controls button,.journey-controls input')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})})`);
  const until=async(predicate,limit=20000)=>{const end=Date.now()+limit;while(Date.now()<end){if(await predicate())return true;await sleep(120);}return false;};
  const settled=()=>until(async()=>(await state()).ready,30000);
  await cdp.send('Runtime.enable');const startEvents=cdp.events.length;
  section('Traveller landscape and quiet controls');
  await setDesktop(1440,900);await goto('/trek/?day=30');
  check(await settled(),'the mountain camera loads its destination elevation');
  let s=await state();
  check(s.day===30&&s.routeLines===57&&s.connections===56&&s.pitch>=52&&s.eyeHeight>1000,'the traveller is above the mountain terrain with all recordings and connections');
  check(!s.creditsExpanded&&s.controlsFit&&s.overflow<=1,'credits are collapsed and desktop controls fit');
  check(await evaluate('!document.querySelector("#journey-card,#journey-reset,#path-tools,#journey-footer")'),'the landscape has no permanent photo card or redundant map controls');
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
  await click('#replay');check((await state()).playing&&(await state()).day===1,'Replay starts again from Paris');
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
