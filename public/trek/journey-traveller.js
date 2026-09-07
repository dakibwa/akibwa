/* A continuous, forward-facing journey with small photographic keepsakes. */
(function(host){
  'use strict';
  const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t,angle=TrekRoute.headingDelta;
  const loadJSON=async (src,version)=>{const r=await fetch(src+(version?'?v='+version:''),{cache:version?'force-cache':'default',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(src);return r.json();};
  const loadLibrary=version=>new Promise((resolve,reject)=>{const s=document.createElement('script'),timer=setTimeout(()=>reject(Error('Map library timeout')),20000);s.src='vendor/maplibre-gl.js'+(version?'?v='+version:'');s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);reject(Error('Map library unavailable'));};document.head.appendChild(s);});
  host.startTrek=function(data){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const menu=$('journey-menu'),gallery=$('photo-gallery'),flash=$('memory-flash'),progress=$('journey-progress');
    let path=null,route=null,map=null,paper=null,wayfinding=null,elevation=null,metrics=null,terrainHeight=null,tileCache=null,vectorTemplate=null,ready=false,terrainReady=false,failed=false,playing=false,started=false,following=true,warmGeneration=0;
    let distance=0,day=1,fraction=0,frame=0,lastTime=0,lastUI=-1,heading=null,eyeHeight=null;
    let renderedDistance=0,cameraHeading=0,cameraPitch=0,pace=+$('pace').value,galleryIndex=0,galleryPhotos=[];
    let headingVelocity=0,lookHeading=null,lookVelocity=0,cameraLandmark=null,travelSpeed=0,cameraClearance=null,cameraPoint=null,viewPitch=null;
    let heightVelocity=0,cameraLift=0,cameraTerrainClearance=null,routeVisible=null;
    let lastContrast=-Infinity,markLuminance=null,markOnDark=false;
    let flashShown=false,flashPending=false,photoCooldown=0,lastFlashDay=-1,flashGeneration=0,flashTimer=0,flashIndex=0,chapters=[],moments=[];
    let readyTimeout=0,autoBegin=false,uiTime=-Infinity,positionPending=null,swipeX=null,placeTimer=0,placeGeneration=0,lastLandmarkScan=-Infinity;
    let scrubbing=false,scrubChanged=false;
    const namedDay=n=>data.days.find(d=>d.n===n)||data.days[0];
    const photosFor=n=>data.photos.filter(p=>p.day===n);
    const text=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=value;};
    const number=new Intl.NumberFormat('en-GB',{maximumFractionDigits:1});
    function setPace(value){
      const options=[...$('pace').options],selected=options.findIndex(option=>+option.value===value);
      if(selected<0)return;
      pace=value;$('pace').value=value;
      const label=options[selected].dataset.label,next=options[(selected+1)%options.length].dataset.label;
      text('speed-label',label);$('speed-cycle').setAttribute('aria-label','Playback speed '+label+'. Change to '+next+'.');
      $('speed-cycle').title='Speed '+label+' · click for '+next;
    }
    setPace(pace);
    function updateMarkContrast(){
      const now=performance.now();if(now-lastContrast<280)return;lastContrast=now;
      // Read only the small patch beneath the wordmark, during the map render
      // while its drawing buffer is valid. No second canvas or terrain renderer.
      const canvas=map.getCanvas(),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      if(!gl||gl.isContextLost())return;
      const rect=document.querySelector('.mark').getBoundingClientRect(),scale=canvas.width/canvas.clientWidth;
      const x=Math.max(0,Math.floor(rect.left*scale)),y=Math.max(0,Math.floor((canvas.clientHeight-rect.bottom)*scale));
      const width=Math.min(canvas.width-x,Math.ceil(rect.width*scale)),height=Math.min(canvas.height-y,Math.ceil(rect.height*scale));
      if(width<1||height<1)return;
      const pixels=new Uint8Array(width*height*4);gl.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      const light=[];for(let i=0;i<pixels.length;i+=32)if(pixels[i+3])light.push((.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])/255);
      if(!light.length)return;light.sort((a,b)=>a-b);
      // Account for the pale atmospheric wash above the map at this position.
      const wash=.28*Math.max(0,1-(rect.top+rect.height/2)/(innerHeight*.24));
      markLuminance=light[Math.floor(light.length/2)]*(1-wash)+.95*wash;
      // Hold a readable ink at middle brightness; blending the two inks in
      // proportion to the background would leave grey type on grey terrain.
      if(markLuminance<.49)markOnDark=true;else if(markLuminance>.55)markOnDark=false;
      document.querySelector('.mark').style.setProperty('--mark-ink',markOnDark?'#fff9e2':'#1f3124');
    }
    $('journey-day').replaceChildren(...data.days.map(d=>{const o=document.createElement('option');o.value=d.n;o.textContent='Day '+String(d.n).padStart(2,'0')+' · '+d.c;return o;}));
    $('photo-interludes').checked=!reduced;
    text('walk-totals','About '+Math.round(data.total).toLocaleString('en-GB')+' km · '+(Math.round(data.stats.ascent/10)*10).toLocaleString('en-GB')+' m of ascent · 67 numbered days · '+data.photos.length+' photographs.');
    text('walk-recorded',number.format(data.recorded.km)+' km and '+Math.round(data.recorded.ascent).toLocaleString('en-GB')+' m of ascent from the original recordings.');
    text('walk-estimated','Plus about '+Math.round(data.estimated.km).toLocaleString('en-GB')+' km and '+(Math.round(data.estimated.ascent/10)*10).toLocaleString('en-GB')+' m of estimated ascent along the reconstructed walks. Both train transfers are excluded.');
    $('landmark-sources').replaceChildren(...data.landmarks.map(item=>{
      const p=document.createElement('p'),link=document.createElement('a'),small=document.createElement('small');
      link.href=item.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.name+' ↗';
      small.textContent=item.place+' · '+item.country;p.append(link,small);return p;
    }));
    function placeChanged(place){
      clearTimeout(placeTimer);const generation=++placeGeneration,el=$('place-arrival');el.classList.remove('visible');el.setAttribute('aria-hidden','true');
      if(place){text('place-name',place.name);if(started)requestAnimationFrame(()=>{if(generation===placeGeneration){el.classList.add('visible');el.setAttribute('aria-hidden','false');}});placeTimer=setTimeout(()=>{el.classList.remove('visible');el.setAttribute('aria-hidden','true');},10000);}
    }
    function wayfindingUI(force=false){
      if(!wayfinding||!path)return;
      wayfinding.update(distance,heading??TrekCamera.headingAt(path,distance),force,namedDay(day).c);
      const now=performance.now();if(!force&&now-lastLandmarkScan<220)return;lastLandmarkScan=now;
      const at=path.sample(distance).point,shown=paper?.status().landmarks||[];
      const nearby=started&&following&&ready?data.landmarks.filter(item=>shown.includes(item.id)).map(item=>{
        const screen=map.project(item.point);return {item,d:TrekWayfinding.metres(at,item.point),screen};
      }).filter(({d,screen})=>d<2300&&screen.x>12&&screen.x<innerWidth-12&&screen.y>72&&screen.y<innerHeight-150).sort((a,b)=>a.d-b.d)[0]:null;
      $('landmark-caption').hidden=!nearby;
      document.body.classList.toggle('viewing-landmark',!!nearby);
      if(nearby){text('landmark-name',nearby.item.caption||nearby.item.name);text('landmark-place',nearby.item.place+' · '+nearby.item.country);}
    }
    function invalidate(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
    function setPlaying(value){
      if(!value&&flashPending){flashGeneration++;flashPending=false;}
      if(!value){travelSpeed=0;autoBegin=false;}
      playing=value;document.body.classList.toggle('is-playing',value);$('play').setAttribute('aria-label',value?'Pause journey':'Play journey');
      lastTime=0;invalidate();
    }
    function dismissFlash(){
      clearTimeout(flashTimer);
      flashGeneration++;flashShown=false;flashPending=false;flash.classList.remove('visible');
      const generation=flashGeneration;setTimeout(()=>{if(generation===flashGeneration)flash.hidden=true;},reduced?0:1150);
    }
    function begin(){
      if(!ready||failed)return;
      if(!started)wayfinding?.resetPlace();
      if(path&&distance>=path.total-.01){reset();autoBegin=true;return;}
      started=true;following=true;$('journey-minimap').hidden=false;$('opening').hidden=true;$('ending').hidden=true;$('journey-controls').hidden=false;
      document.body.classList.remove('is-exploring');setPlaying(true);updateUI(true);
    }
    function reset(){
      setPlaying(false);dismissFlash();menu.close();started=false;$('journey-minimap').hidden=true;placeChanged(null);wayfinding?.resetPlace();distance=0;renderedDistance=0;heading=null;eyeHeight=null;
      day=1;fraction=0;lastUI=-1;lastFlashDay=-1;photoCooldown=0;following=true;
      $('opening').hidden=false;$('ending').hidden=true;$('journey-controls').hidden=true;document.body.classList.remove('is-exploring');
      history.replaceState(null,'',location.pathname);updateUI(true);prepareCamera();invalidate();
    }
    function visit(n,t=.5){
      n=clamp(n,1,67);setPlaying(false);dismissFlash();started=true;$('journey-minimap').hidden=false;placeChanged(null);wayfinding?.resetPlace();following=true;day=n;fraction=t;
      if(path)distance=path.dayDistance(n,t);else positionPending={day:n,t};
      renderedDistance=distance;heading=null;eyeHeight=null;lastFlashDay=-1;photoCooldown=0;
      $('opening').hidden=true;$('ending').hidden=true;$('journey-controls').hidden=false;document.body.classList.remove('is-exploring');
      history.replaceState(null,'',location.pathname+'?day='+n);updateUI(true);prepareCamera();invalidate();
    }
    function updateUI(force=false){
      const now=performance.now();if(!force&&now-uiTime<90)return;uiTime=now;
      if(path&&started){const at=path.dayAt(distance);day=at.day;fraction=at.t;}
      const d=namedDay(day);
      progress.value=path?TrekElevation.progressAt(path,distance)*1000:0;
      const totals=metrics?.sample(distance)||{km:0,ascent:0,recorded:{km:0,ascent:0},estimated:{km:0,ascent:0}};
      text('readout-day',String(day).padStart(2,'0'));text('readout-distance',number.format(totals.km));
      text('readout-ascent',Math.round(totals.ascent).toLocaleString('en-GB'));
      text('distance-label','km covered'+(totals.estimated.km>0?' · est.':''));
      text('ascent-label','m climbed'+(totals.estimated.ascent>0?' · est.':''));
      $('readout-distance').title=number.format(totals.recorded.km)+' km recorded + '+number.format(totals.estimated.km)+' km estimated';
      $('readout-ascent').title=Math.round(totals.recorded.ascent).toLocaleString('en-GB')+' m recorded + '+Math.round(totals.estimated.ascent).toLocaleString('en-GB')+' m estimated';
      $('menu-open').setAttribute('aria-label','Day '+day+' of 67. Choose a day and journey options');
      text('where',started?d.c:'Paris → Sofia');
      $('minimap-canvas').setAttribute('aria-label','Overview of Paris to Sofia: day '+day+', '+d.c);
      wayfindingUI(force);elevation?.update(distance,force);
      const ground=elevation?.status().metres;text('minimap-height',Number.isFinite(ground)?'≈ '+ground.toLocaleString('en-GB')+' m':'');
      progress.setAttribute('aria-valuetext','Day '+day+' of 67, '+d.c+(Number.isFinite(ground)?', about '+ground.toLocaleString('en-GB')+' metres elevation':'')+(path?.sample(distance).kind==='connection'?(path.sample(distance).mode==='train'?', train connection':', estimated walking path'):''));
      if(!force&&lastUI===day)return;lastUI=day;
      if(lastFlashDay!==day&&(flashShown||flashPending))dismissFlash();
      text('progress-day',d.date?new Date(d.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Day '+day);
      $('journey-day').value=day;$('day-back').disabled=day===1;$('day-forward').disabled=day===67;
      const photos=photosFor(day);$('menu-photos').hidden=!photos.length;
      if(photos.length){$('menu-photo').src='photos/'+photos[Math.floor(photos.length*.45)].src;text('menu-photo-count',photos.length+' photographs ↗');}
      text('day-date',d.date?new Date(d.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'No dated recording.');
      const shared=day===16||day===17;
      text('day-facts',shared?'Recorded: 70.9 km across days 16–17':d.w?'Recorded: '+d.km.toFixed(1)+' km'+(d.elev?' · ↑ '+d.elev.toLocaleString('en-GB')+' m':''):'No recorded daily distance.');
      $('day-estimate').hidden=!d.estimatedKm;
      text('day-estimate','Estimated walking: '+(d.estimatedKm<.05?'less than 0.1':number.format(d.estimatedKm))+' km · ↑ '+Math.round(d.estimatedAscent).toLocaleString('en-GB')+' m.');
      text('day-note',d.j.map(j=>j.text).join(' '));
      text('day-recording',shared?'One shared recording; the division between the two days is approximate.':d.estimatedKm&&!d.w?'No separate recording. These walking totals are reconstructed; the division between missing days is approximate.':!d.w?'Arrival day; no additional distance or ascent.':'');
      $('day-moments').replaceChildren(...moments.filter(m=>m.day===day).map(m=>{const p=document.createElement('p');p.textContent=m.title+' — '+m.position;return p;}));
      $('day-record').hidden=!d.s;if(d.s){$('record-cover').src='covers/'+d.s.slug+'.webp';$('record-cover').alt=d.s.album;text('record-title',d.t);text('record-artist',d.s.artist+' · '+d.s.album);}
      document.querySelectorAll('#chapters button').forEach(b=>{const c=chapters.find(c=>c.id===b.dataset.chapter);b.setAttribute('aria-current',String(day>=c.from&&day<=c.to));});
      const next=photos[0];if(next){const preload=new Image();preload.src='photos/'+next.src;}
    }
    function showGallery(index=0,all=false){
      setPlaying(false);dismissFlash();
      if(!gallery.open){galleryPhotos=all?data.photos:photosFor(day);if(!galleryPhotos.length)galleryPhotos=data.photos;}
      galleryIndex=(index+galleryPhotos.length)%galleryPhotos.length;
      const p=galleryPhotos[galleryIndex];$('gallery-image').src='photos/'+p.src;$('gallery-image').alt=p.alt;
      gallery.querySelector('.memory-backdrop').src='photos/'+p.src;
      text('gallery-place',namedDay(p.day).c+' · day '+p.day);text('gallery-count',(galleryIndex+1)+' / '+galleryPhotos.length);
      if(!gallery.open){menu.close();gallery.showModal();}
      const next=new Image();next.src='photos/'+galleryPhotos[(galleryIndex+1)%galleryPhotos.length].src;
    }
    function showFlash(){
      const photos=photosFor(day);if(!photos.length||flashPending||!started||!ready||reduced||!$('photo-interludes').checked)return;
      const featured=chapters.find(c=>c.day===day),p=photos.find(p=>p.src===featured?.photo)||photos[Math.floor(photos.length*.45)];
      const generation=++flashGeneration,photoDay=day,img=new Image();flashPending=true;
      img.onload=()=>{
        if(generation!==flashGeneration)return;flashPending=false;
        if(menu.open||gallery.open||day!==photoDay)return;
        const picture=flash.querySelector('.memory-image');picture.src=img.src;picture.alt=p.alt;
        flashIndex=photos.indexOf(p);
        flash.style.setProperty('--print-angle',((photoDay%5)-2)*.6-2+'deg');
        flash.setAttribute('aria-label','Open this photograph from day '+photoDay);
        flash.hidden=false;flashShown=true;lastFlashDay=photoDay;photoCooldown=0;
        requestAnimationFrame(()=>{if(generation===flashGeneration)flash.classList.add('visible');});
        clearTimeout(flashTimer);flashTimer=setTimeout(dismissFlash,9500);
      };img.onerror=()=>{if(generation===flashGeneration){flashPending=false;lastFlashDay=photoDay;}};img.src='photos/'+p.src;
    }
    function mapIdle(generation,limit=18000){
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{map.off('idle',done);reject(Error('Landscape loading timed out'));},limit);
        function done(){clearTimeout(timer);map.off('idle',done);resolve(generation===warmGeneration&&!failed);}
        if(map.loaded()&&map.areTilesLoaded())done();else map.on('idle',done);
      });
    }
    async function prepareCamera(){
      if(!terrainReady||failed)return;
      const generation=++warmGeneration,eye=TrekCamera.pointAt(path,distance);
      ready=false;travelSpeed=0;$('begin').disabled=true;$('play').disabled=true;
      $('map-status').hidden=false;$('retry-load').hidden=true;$('loading-progress').hidden=false;
      $('loading-progress').value=5;text('load-message','Preparing this stretch of landscape…');
      let preparationTimer;
      try{
        // Start with known ground before solving the travelling camera. Tile
        // prefetch runs beside the visible map, without another WebGL renderer.
        map.setCenterClampedToGround(true);
        map.jumpTo({center:eye,zoom:11.5,pitch:35,bearing:TrekCamera.headingAt(path,distance)});
        const warm=tileCache.warm(TrekCache.corridor(path,distance-1000,distance+6500,vectorTemplate,13,1200),p=>{
          if(generation!==warmGeneration)return;
          $('loading-progress').value=10+65*p.done/p.total;
          text('load-message','Loading the landscape · '+Math.round(10+65*p.done/p.total)+'%');
        });
        if(!await mapIdle(generation))return;
        eyeHeight=null;heightVelocity=0;heading=null;headingVelocity=0;lookHeading=null;lookVelocity=0;viewPitch=null;
        map.setCenterClampedToGround(false);ready=true;camera(.016,true);ready=false;
        await Promise.race([warm,new Promise((_,reject)=>{preparationTimer=setTimeout(()=>reject(Error('Preparation timeout')),25000);})]);
        clearTimeout(preparationTimer);if(generation!==warmGeneration||failed)return;
        text('load-message','Settling the paper landscape…');$('loading-progress').value=90;
        if(!await mapIdle(generation))return;
        // Give the custom scenery's short build chunks a chance to upload.
        const deadline=performance.now()+4000;
        while(!paper?.status().failed&&(!paper?.status().updates||paper?.status().pending||paper?.status().building)&&performance.now()<deadline){
          await new Promise(resolve=>setTimeout(resolve,80));if(generation!==warmGeneration)return;
        }
        if(!Number.isFinite(map.queryTerrainElevation(eye)))throw Error('Terrain is not ready');
        if(generation!==warmGeneration||failed)return;
        ready=true;$('begin').disabled=false;$('play').disabled=false;$('loading-progress').value=100;
        $('map-status').hidden=true;document.body.classList.remove('is-loading');
        lastTime=0;updateUI(true);invalidate();
        if(started)showFlash();
        tileCache.ahead(path,distance,vectorTemplate,map.getZoom());
        if(autoBegin){autoBegin=false;begin();}
      }catch(error){
        if(generation!==warmGeneration||failed)return;
        tileCache.cancel();ready=false;setPlaying(false);text('load-message','This stretch could not finish loading. Your photographs are still in the menu.');
        $('loading-progress').hidden=true;$('retry-load').hidden=false;
      }finally{clearTimeout(preparationTimer);}
    }
    function camera(dt,snap=false){
      if(!ready||!following||!path||failed)return;
      // Filter one continuous distance and a forward heading, never restart an
      // easeTo animation at a GPS vertex or day boundary.
      const alpha=1-Math.exp(-dt/.6);
      renderedDistance=snap?distance:mix(renderedDistance,distance,alpha);
      const point=TrekCamera.pointAt(path,renderedDistance),wanted=TrekCamera.headingAt(path,renderedDistance);
      const rotation=TrekCamera.turn(heading,headingVelocity,wanted,dt);
      heading=rotation.heading;headingVelocity=rotation.velocity;
      // A gentle glance gives oversized landmarks room on a narrow screen.
      // Keep route heading separate so looking aside does not slow the journey.
      const framing=TrekCamera.landmarkFrame(data.landmarks,point,wanted),wantedLook=framing?.heading??wanted;
      const glance=TrekCamera.turn(lookHeading,lookVelocity,wantedLook,dt);
      lookHeading=glance.heading;lookVelocity=glance.velocity;cameraLandmark=framing?.id||null;
      const terrain=TrekCamera.terrainFrame(path,renderedDistance,terrainHeight),base=terrain.ground;
      const wantedPitch=clamp(54-18*terrain.winding-12*(framing?.strength||0),34,60);
      viewPitch=viewPitch===null?wantedPitch:viewPitch+clamp((wantedPitch-viewPitch)*(1-Math.exp(-dt/1.6)),-3*dt,3*dt);
      const bottom=innerHeight-$('journey-controls').getBoundingClientRect().top+25;
      const fit=TrekCamera.routeFrame(path,renderedDistance,terrainHeight,lookHeading,viewPitch,{width:innerWidth,height:innerHeight,top:90,bottom:started?bottom:240},terrain.winding);
      const wantedEye=Math.max(terrain.height+(framing?.lift||0),fit.base+fit.clearance);
      const vertical=TrekCamera.rise(eyeHeight,heightVelocity,wantedEye,dt);
      eyeHeight=vertical.height;heightVelocity=vertical.velocity;cameraLift=terrain.lift;
      eyeHeight=Math.max(eyeHeight,base+420);
      // Look down gradually over a descent or tight loop, keeping the nearby
      // path in frame while the broad heading follows the valley beyond it.
      // Rebase every frame using the stable mapped profile. A stale mountain
      // reference or a transient visible DEM seam can make the draped map swell.
      const clearance=eyeHeight-fit.base;
      const target=TrekCamera.ahead(fit.focus,lookHeading,-fit.bias*clearance);
      const eye=TrekCamera.ahead(target,lookHeading,-clearance*Math.tan(viewPitch*Math.PI/180));
      const options=map.calculateCameraOptionsFromTo(eye,eyeHeight,target,fit.base);
      // Do not change pitch after solving zoom/centre: that moves the eye too.
      map.jumpTo(options);cameraHeading=lookHeading;cameraPitch=map.getPitch();
      cameraClearance=eyeHeight-base;cameraPoint=eye;
      const renderedGround=map.queryTerrainElevation(eye);
      cameraTerrainClearance=Number.isFinite(renderedGround)?eyeHeight-renderedGround:null;
      const visible=fit.samples.map(p=>map.project(p.point)).filter(p=>p.x>12&&p.x<innerWidth-12&&p.y>75&&p.y<innerHeight-bottom);
      routeVisible=visible.length/fit.samples.length;
      return Math.abs(renderedDistance-distance)>1||Math.abs(angle(heading,wanted))>.1||Math.abs(headingVelocity)>.02||Math.abs(angle(lookHeading,wantedLook))>.1||Math.abs(lookVelocity)>.02||Math.abs(eyeHeight-wantedEye)>.5||Math.abs(heightVelocity)>.05||Math.abs(viewPitch-wantedPitch)>.02;
    }
    function tick(time){
      frame=0;const elapsed=Math.min(1,Math.max(.001,(time-(lastTime||time-16))/1000)),dt=Math.min(.1,elapsed);lastTime=time;
      if(playing&&path&&ready){
        const desired=TrekCamera.speedLimit(path,distance,pace,heading);
        travelSpeed=mix(travelSpeed,desired,1-Math.exp(-dt/.85));
        distance=Math.min(path.total,distance+travelSpeed*dt);photoCooldown+=elapsed;
        if(!flashShown&&photoCooldown>6&&lastFlashDay!==day&&fraction>.12&&fraction<.9)showFlash();
        if(distance>=path.total){setPlaying(false);day=67;$('ending').hidden=false;}
      }
      updateUI();const unsettled=camera(dt);
      if(ready&&playing&&following)tileCache?.ahead(path,distance,vectorTemplate,map.getZoom());
      if(playing||unsettled)invalidate();
    }
    function unavailable(message){failed=true;ready=false;$('begin').disabled=true;$('play').disabled=true;$('loading-progress').hidden=true;$('retry-load').hidden=false;$('map-status').hidden=false;text('load-message',message);setPlaying(false);}
    async function initialize(){
      document.body.classList.add('is-loading');
      try{
        const json=file=>loadJSON(file,data.assets[file]);
        const [r,m,style,profile,links]=await Promise.all([json('route-detail.json'),json('moments.json'),json('journey-style.json'),json('elevation-profile.json'),json('route-links.json'),loadLibrary(data.assets['vendor/maplibre-gl.js'])]);
        tileCache=TrekCache.create();tileCache.install(maplibregl);
        const tiles=await loadJSON(style.sources.openmaptiles.url);
        vectorTemplate=tiles.tiles[0];style.sources.openmaptiles={...style.sources.openmaptiles,...tiles};delete style.sources.openmaptiles.url;
        route=r;path=TrekRoute.buildJourneyPath(route,67,links);chapters=m.chapters;moments=m.moments;
        metrics=TrekMetrics.create(path,links,profile,data.days);
        terrainHeight=distance=>TrekElevation.sample(profile,distance,false);
        elevation=TrekElevation.create({profile,path,days:data.days,colors:data.colors,canvas:$('elevation-canvas'),label:$('elevation-current')});
        $('chapters').replaceChildren(...chapters.map(c=>{const b=document.createElement('button');b.dataset.chapter=c.id;const title=document.createElement('span'),small=document.createElement('small');title.textContent=c.title;small.textContent=String(c.from).padStart(2,'0')+'—'+String(c.to).padStart(2,'0');b.append(title,small);b.addEventListener('click',()=>{visit(c.day,.5);menu.close();});return b;}));
        if(positionPending){distance=path.dayDistance(positionPending.day,positionPending.t);renderedDistance=distance;positionPending=null;}
        // Roads and topography remain; label furniture belongs in the drawer.
        map=new maplibregl.Map({container:'path-map',style:TrekPaper.style(style),center:path.sample(distance).point,zoom:11.5,pitch:60,bearing:140,attributionControl:false,maxPitch:60,maxZoom:17,minZoom:3,renderWorldCopies:false,scrollZoom:false,dragRotate:true,touchZoomRotate:true,canvasContextAttributes:{antialias:true},fadeDuration:0,maxTileCacheSize:128,pixelRatio:Math.min(devicePixelRatio||1,1.5),transformRequest:tileCache.transformRequest});
        map.setVerticalFieldOfView(innerWidth<innerHeight?55:38);
        map.on('render',updateMarkContrast);
        map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
        // Keep the native, source-updated attribution above the landscape wash.
        $('map-credits').append(document.querySelector('.maplibregl-ctrl-attrib'));
        const credits=document.querySelector('.maplibregl-ctrl-attrib-button');
        credits.textContent='Map credits';credits.setAttribute('aria-label','Map credits');credits.title='Map credits';
        for(const event of ['dragstart','zoomstart','rotatestart','pitchstart'])map.on(event,e=>{if(e.originalEvent){setPlaying(false);following=false;document.body.classList.add('is-exploring');}});
        map.on('webglcontextlost',()=>unavailable('The landscape is unavailable. The photographs and days are still here.'));
        map.on('error',()=>{if(!ready)text('load-message','The landscape is taking a little longer. Photographs are ready in the menu.');});
        readyTimeout=setTimeout(()=>{if(!ready){text('load-message','The landscape could not finish loading. Photographs are ready in the menu.');$('retry-load').hidden=false;}},18000);
        map.on('load',()=>{
          if(failed)return;clearTimeout(readyTimeout);
          map.addSource('dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14,attribution:'Terrain © <a href="https://www.mapzen.com/rights/">Mapzen</a>'});
          map.addSource('shade-dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14});
          map.addLayer({id:'terrain-shade',type:'hillshade',source:'shade-dem',paint:{'hillshade-exaggeration':.65,'hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map','hillshade-shadow-color':'#536b43','hillshade-highlight-color':'#fff2d2','hillshade-accent-color':'#849365'}},'waterway_tunnel');
          map.setTerrain({source:'dem',exaggeration:1});map.setCenterClampedToGround(false);
          map.setSky({'sky-color':'#e9e6d3','horizon-color':'#eee9d6','fog-color':'#e1dfc5','sky-horizon-blend':.7,'horizon-fog-blend':.6,'fog-ground-blend':.45});
          map.addSource('journey-recorded',{type:'geojson',data:path.recorded,tolerance:0});
          map.addSource('journey-connections',{type:'geojson',data:path.connections,tolerance:0});
          // A broad paper edge separates the deep red thread from roofs,
          // streams and woodland. Walking estimates have a paler red; trains are dashed.
          for(const [id,source,color,width,opacity,dash,mode] of [['route-outline','journey-recorded','#fff5dc',9.5,1],['route-recorded','journey-recorded','#a33443',5.5,1],['route-walking-outline','journey-connections','#fff5dc',8,1,null,'walk'],['route-walking','journey-connections','#bd6b71',4.5,1,null,'walk'],['route-transport-outline','journey-connections','#fff5dc',6,1,[2,3],'train'],['route-connections','journey-connections','#977c56',3,1,[2,3],'train']]){
            const paint={'line-color':color,'line-width':width,'line-opacity':opacity};if(dash)paint['line-dasharray']=dash;
            map.addLayer({id,type:'line',source,...(mode?{filter:['==',['get','mode'],mode]}:{}),layout:{'line-cap':'round','line-join':'round'},paint});
          }
          try{paper=TrekPaper.create(map,{type:'FeatureCollection',features:[...path.recorded.features,...path.connections.features]},data.landmarks);}
          catch(error){paper={status:()=>({failed:true,trees:0,roofs:0})};}
          wayfinding=TrekWayfinding.create({canvas:$('minimap-canvas'),flag:$('country-flag'),path,countries:data.countryRings,map,landmarks:data.landmarks,onPlace:placeChanged});
          map.on('idle',()=>wayfindingUI(true));
          // Sources have now populated MapLibre's initially expanded disclosure.
          const attribution=document.querySelector('.maplibregl-ctrl-attrib');
          attribution.classList.remove('maplibregl-compact-show');attribution.removeAttribute('open');
          terrainReady=true;prepareCamera();text('load-message','Opening this stretch of landscape…');
          // Elevation arriving after the vector map gets a short settling pass.
          map.on('sourcedata',e=>{if(e.sourceId==='dem'&&e.isSourceLoaded)invalidate();});
          updateUI(true);invalidate();
        });
        updateUI(true);
      }catch(error){unavailable('The landscape could not load. You can still open the photographs and days.');}
    }
    $('retry-load').addEventListener('click',()=>{if(terrainReady&&!failed)prepareCamera();else location.reload();});
    $('begin').addEventListener('click',begin);$('replay').addEventListener('click',()=>{reset();autoBegin=true;});
    $('play').addEventListener('click',()=>{if(playing)setPlaying(false);else begin();});
    for(const id of ['menu-open','opening-days'])$(id).addEventListener('click',()=>{setPlaying(false);dismissFlash();menu.showModal();});$('menu-close').addEventListener('click',()=>menu.close());
    menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left)menu.close();}});
    $('journey-day').addEventListener('change',e=>visit(+e.target.value));
    $('day-back').addEventListener('click',()=>visit(day-1));$('day-forward').addEventListener('click',()=>visit(day+1));
    $('restart').addEventListener('click',reset);$('pace').addEventListener('change',e=>setPace(+e.target.value));
    $('speed-cycle').addEventListener('click',()=>{const options=[...$('pace').options],current=options.findIndex(option=>+option.value===pace);setPace(+options[(current+1)%options.length].value);});
    function seek(next){
      if(!path)return;
      if(scrubbing&&!scrubChanged){++warmGeneration;tileCache?.cancel();ready=false;$('play').disabled=true;}
      scrubChanged=true;setPlaying(false);if(flashShown||flashPending)dismissFlash();started=true;$('journey-minimap').hidden=false;placeChanged(null);wayfinding?.resetPlace();following=true;
      distance=next;renderedDistance=distance;heading=null;eyeHeight=null;document.body.classList.remove('is-exploring');$('opening').hidden=true;$('ending').hidden=distance<path.total;
      updateUI(true);if(!scrubbing)prepareCamera();invalidate();
    }
    progress.addEventListener('pointerdown',e=>{scrubbing=true;scrubChanged=false;setPlaying(false);progress.setPointerCapture(e.pointerId);});
    const finishScrub=()=>{if(!scrubbing)return;scrubbing=false;if(scrubChanged)prepareCamera();scrubChanged=false;};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])progress.addEventListener(event,finishScrub);
    progress.addEventListener('input',()=>{if(path)seek(TrekElevation.distanceAt(path,+progress.value/1000));});
    progress.addEventListener('keydown',e=>{
      if(!path)return;
      const steps={ArrowLeft:-.1,ArrowDown:-.1,ArrowRight:.1,ArrowUp:.1,PageDown:-1,PageUp:1};
      if(e.key!=='Home'&&e.key!=='End'&&!steps[e.key])return;e.preventDefault();
      const step=steps[e.key],target=+progress.value/1000+(step||0)*(e.shiftKey?10:1)/data.days.length;
      let next=e.key==='Home'?0:e.key==='End'?path.total:TrekElevation.distanceAt(path,target);
      // The final numbered day is an arrival, with no additional route length.
      if(step<0&&next===distance&&distance>0)next=Math.max(0,distance-1);
      seek(next);
    });
    $('menu-photos').addEventListener('click',()=>showGallery());$('gallery-close').addEventListener('click',()=>gallery.close());
    $('photo-back').addEventListener('click',()=>showGallery(galleryIndex-1));$('photo-forward').addEventListener('click',()=>showGallery(galleryIndex+1));
    flash.addEventListener('click',()=>showGallery(flashIndex));
    $('photo-interludes').addEventListener('change',()=>{if(!$('photo-interludes').checked)dismissFlash();else showFlash();});
    gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showGallery(galleryIndex+(e.key==='ArrowRight'?1:-1));}});
    gallery.addEventListener('touchstart',e=>{swipeX=e.changedTouches[0].clientX;},{passive:true});
    gallery.addEventListener('touchend',e=>{if(swipeX!==null){const delta=e.changedTouches[0].clientX-swipeX;if(Math.abs(delta)>50)showGallery(galleryIndex+(delta<0?1:-1));}swipeX=null;},{passive:true});
    addEventListener('keydown',e=>{if(e.key==='Escape'){setPlaying(false);dismissFlash();}else if(e.key===' '&&!e.target.closest('button,a,input,select,summary')&&!menu.open&&!gallery.open){e.preventDefault();playing?setPlaying(false):begin();}else if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&!e.target.closest('input,select')&&!menu.open&&!gallery.open){e.preventDefault();visit(day+(e.key==='ArrowRight'?1:-1));}});
    addEventListener('resize',()=>{if(map){map.resize();map.setVerticalFieldOfView(innerWidth<innerHeight?55:38);}invalidate();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){setPlaying(false);dismissFlash();cancelAnimationFrame(frame);frame=0;}else invalidate();});
    host.trekStatus=()=>({ready,failed,playing,started,following,scrubbing,day,t:fraction,distance,renderedDistance,total:path?.total||0,kind:path?.sample(distance).kind,routeLines:route?.features.length||0,connections:path?.connections.features.length||0,bearing:cameraHeading,cameraLandmark,pitch:cameraPitch,eyeHeight,cameraClearance,cameraTerrainClearance,cameraLift,cameraPoint,cameraZoom:map?.getZoom(),routeVisible,markLuminance,mapElevation:map?.getCenterElevation(),headingVelocity,heightVelocity,travelSpeed,pace,reduced,photoInterludes:$('photo-interludes').checked,flash:flashShown,photoCooldown,flashPending,galleryCount:galleryPhotos.length,viewport:[innerWidth,innerHeight],cache:tileCache?.status(),elevation:elevation?.status(),paper:paper?.status(),wayfinding:wayfinding?.status(),landmark:$('landmark-caption').hidden?null:$('landmark-name').textContent});
    const q=new URLSearchParams(location.search),n=+q.get('day');
    if(n>=1&&n<=67)visit(n,.5);else if(location.hash){const d=data.days.find(d=>d.c.toLowerCase()===location.hash.slice(1));if(d)visit(d.n,.2);}
    updateUI(true);initialize();
  };
})(window);
