/* Real browser regression checks for the single 3D Paths journey. */
import {readFileSync} from 'node:fs';

export async function checkTrekPaths({cdp,evaluate,goto,setDesktop,sleep,check,section}){
  const html=readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8');
  const data=JSON.parse(html.match(/  var DATA = (.+);\n  var days = DATA\.days;/)[1]);
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const choose=n=>evaluate(`(() => {const s=document.querySelector('#journey-day');s.value=${n};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const state=()=>evaluate(`(() => ({...window.trekStatus?.(),scroll:scrollY,
    overflow:document.documentElement.scrollWidth-innerWidth,
    km:Number(document.querySelector('#hud-km').textContent),
    photo:document.querySelector('#journey-photo').naturalWidth>0,
    photoSrc:document.querySelector('#journey-photo').getAttribute('src'),
    note:document.querySelector('#journey-note').textContent,
    card:document.querySelector('#journey-card').getBoundingClientRect().toJSON(),
    controlsFit:[...document.querySelectorAll('.map-tools button,.path-tools button')].filter(e=>!e.hidden).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})
  }))()`);
  const until=async(predicate,limit=15000)=>{const end=Date.now()+limit;while(Date.now()<end){if(await predicate())return true;await sleep(100);}return false;};
  const day=async n=>until(async()=>((await state()).day===n));
  await setDesktop(1440,900);
  await goto('/trek/?day=30');
  section('Trek paths and day navigation');
  check(await until(async()=>(await state()).ready,25000),'the 3D map loads');
  await day(30);await sleep(1200);
  let current=await state();
  check(current.day===30&&current.precision==='recorded'&&current.routeLines===57&&current.pitch>45,'the requested mountain day uses the recorded paths in 3D');
  check(current.photo&&current.note.includes('Tauern')&&current.controlsFit&&current.overflow<=1,'the day note, photograph and desktop controls are usable');
  check(await evaluate('!document.querySelector("#view-atlas,#view-relief,#atlas,#relief-map")'),'the former map views are removed from the page');
  await click('#day-forward');check(await day(31),'Next day reaches day 31');
  await click('#day-back');check(await day(30),'Previous day returns to day 30');
  const beforePhoto=await state();await click('#photo-forward');current=await state();
  check(current.photoSrc!==beforePhoto.photoSrc&&current.scroll===beforePhoto.scroll,'photo browsing preserves the exact journey position');
  await click('#day-moments button');
  check(await evaluate('document.querySelector("#moment-dialog").open&&document.querySelector("#moment-title").textContent.includes("ridges")'),'the mountain moment opens its photograph and context');
  await click('#moment-close');await click('#journey-record-button');
  check(await evaluate('document.querySelector("#spot").open&&document.querySelector("#spot-record").textContent.includes("Brian Eno")'),'the day opens its actual record');
  await click('#spot-close');
  await click('#path-zoom-in');await sleep(400);current=await state();
  check(!current.following&&await evaluate('!document.querySelector("#path-follow").hidden'),'manual zoom exposes Follow again');
  const position=current.scroll;await click('#path-day-fit');await until(async()=>(await state()).moving===false);current=await state();
  check(current.scroll===position&&current.zoom<12,`Whole day changes the camera without changing the route position [${current.scroll}/${position}, zoom ${current.zoom}]`);
  await click('#path-follow');await sleep(1100);current=await state();
  check(current.following&&current.scroll===position,'Follow again preserves the route position');
  await click('[data-chapter="belgrade"]');check(await day(53),'the Belgrade chapter reaches day 53');
  await click('#day-moments button');
  check(await evaluate('document.querySelector("#moment-dialog").open&&document.querySelector("#moment-position").textContent.includes("not been confirmed")'),'monument photographs disclose their unconfirmed exact location');
  await click('#moment-close');
  await choose(17);await day(17);
  check(await evaluate('document.querySelector("#day-recording-note").textContent.includes("share one recording")&&document.querySelector("#journey-day-facts").textContent.includes("70.9 km across days 16–17")'),'the shared recording is disclosed without inventing daily metrics');
  await choose(5);await day(5);
  check(await evaluate('document.querySelector("#day-recording-note").textContent.includes("No separate recording")'),'unrecorded days are labelled');

  section('Trek playback and finish');
  await click('#journey-reset');await until(async()=>(await state()).type==='start');current=await state();
  check(current.scroll===0&&current.km===0,'Reset restores the opening journey');
  await click('#walkbtn');await until(async()=>(await state()).playing);await sleep(300);current=await state();
  check(current.playing&&current.scroll>300,'Walk from Paris begins playback');
  await click('#journey-pause');const paused=await state();await sleep(300);current=await state();
  check(!current.playing&&current.scroll===paused.scroll,'Pause holds the route position');
  await click('#journey-pause');
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await sleep(100);check(!(await state()).playing,'Escape pauses playback');
  await click('#country-nav a[href="#bulgaria"]');await until(async()=>(await state()).day===65);
  check((await state()).km>1800,'country navigation reaches Bulgaria');
  await evaluate(`scrollTo(0,${data.timeline})`);await until(async()=>(await state()).type==='end');current=await state();
  check(current.type==='end'&&Math.abs(current.km-1982)<.1&&await evaluate('document.querySelector("#journey-pause").textContent==="Replay"'),'the journey finishes at Sofia with Replay');
  await click('#journey-pause');await sleep(250);current=await state();
  check(current.playing&&current.day===1,'Replay restarts from Paris');await click('#journey-pause');

  section('Trek phone layout');
  for(const width of [390,320]){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
    await goto('/trek/?day=30');await until(async()=>(await state()).ready);await day(30);await sleep(500);current=await state();
    check(current.photo&&current.controlsFit&&current.overflow<=1&&current.card.left>=0&&current.card.right<=width,`day, photograph and map controls fit ${width}px`);
    await click('#journey-record-button');
    check(await evaluate('document.querySelector("#spot").open'),`the record remains reachable at ${width}px`);await click('#spot-close');
    await click('#journey-photo-open');
    check(await evaluate('document.querySelector("#moment-dialog").open'),`the photo opens at ${width}px`);await click('#moment-close');
  }
  const errors=cdp.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error'));
  check(errors.length===0,`healthy journeys report no runtime errors [${errors.length}]`);
  if(errors.length)process.stdout.write(JSON.stringify(errors.map(e=>e.params))+'\n');

  section('Trek graphics failure');
  await evaluate('document.querySelector("#path-map canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()');await sleep(150);
  check(await evaluate('!document.querySelector("#path-status").hidden&&document.querySelector("#path-status").textContent.includes("unavailable")'),'context loss gives a readable fallback');
  await choose(53);check(await day(53),'the day controls survive graphics loss');
  await click('#day-moments button');check(await evaluate('document.querySelector("#moment-dialog").open'),'photographs survive graphics loss');await click('#moment-close');
}
