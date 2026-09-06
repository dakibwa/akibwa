/* A continuous, forward-facing journey. Photographs interrupt it like memories. */
(function(host){
  'use strict';
  const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t,angle=TrekRoute.headingDelta;
  const loadJSON=async src=>{const r=await fetch(src);if(!r.ok)throw Error(src);return r.json();};
  const loadLibrary=()=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/maplibre-gl.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  host.startTrek=function(data){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const menu=$('journey-menu'),gallery=$('photo-gallery'),flash=$('memory-flash'),progress=$('journey-progress');
    let path=null,route=null,map=null,paper=null,ready=false,terrainReady=false,failed=false,playing=false,started=false,following=true,warmGeneration=0;
    let distance=0,day=1,fraction=0,frame=0,lastTime=0,lastUI=-1,heading=null,eyeHeight=null;
    let renderedDistance=0,cameraHeading=0,cameraPitch=0,pace=450,galleryIndex=0,galleryPhotos=[];
    let headingVelocity=0,travelSpeed=0,cameraClearance=null,cameraPoint=null,viewPitch=null;
    let flashTime=0,flashShown=false,flashPending=false,photoCooldown=0,lastFlashDay=-1,flashGeneration=0,chapters=[],moments=[];
    let readyTimeout=0,positionPending=null,swipeX=null;
    const namedDay=n=>data.days.find(d=>d.n===n)||data.days[0];
    const photosFor=n=>data.photos.filter(p=>p.day===n);
    const text=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=value;};
    const number=new Intl.NumberFormat('en-GB',{maximumFractionDigits:1});
    $('journey-day').replaceChildren(...data.days.map(d=>{const o=document.createElement('option');o.value=d.n;o.textContent='Day '+String(d.n).padStart(2,'0')+' · '+d.c;return o;}));
    $('photo-interludes').checked=!reduced;
    text('walk-totals','1,982 km · 67 numbered days · '+data.photos.length+' photographs · '+Math.round(data.stats.ascent).toLocaleString()+' m of ascent.');
    function invalidate(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
    function setPlaying(value){
      if(!value&&flashPending){flashGeneration++;flashPending=false;}
      if(!value)travelSpeed=0;
      playing=value;document.body.classList.toggle('is-playing',value);$('play').setAttribute('aria-label',value?'Pause journey':'Play journey');
      lastTime=0;invalidate();
    }
    function dismissFlash(){
      flashGeneration++;flashTime=0;flashShown=false;flashPending=false;flash.classList.remove('visible');document.body.classList.remove('in-memory');
      const generation=flashGeneration;setTimeout(()=>{if(generation===flashGeneration)flash.hidden=true;},reduced?0:950);
    }
    function begin(){
      if(path&&distance>=path.total-.01)distance=0;
      started=true;following=true;$('opening').hidden=true;$('ending').hidden=true;$('journey-controls').hidden=false;
      document.body.classList.remove('is-exploring');setPlaying(true);updateUI(true);
    }
    function reset(){
      setPlaying(false);dismissFlash();menu.close();started=false;distance=0;renderedDistance=0;heading=null;eyeHeight=null;
      day=1;fraction=0;lastUI=-1;lastFlashDay=-1;photoCooldown=0;following=true;
      $('opening').hidden=false;$('ending').hidden=true;$('journey-controls').hidden=true;document.body.classList.remove('is-exploring');
      history.replaceState(null,'',location.pathname);updateUI(true);prepareCamera();invalidate();
    }
    function visit(n,t=.5){
      n=clamp(n,1,67);setPlaying(false);dismissFlash();started=true;following=true;day=n;fraction=t;
      if(path)distance=path.dayDistance(n,t);else positionPending={day:n,t};
      renderedDistance=distance;heading=null;eyeHeight=null;lastFlashDay=-1;photoCooldown=0;
      $('opening').hidden=true;$('ending').hidden=true;$('journey-controls').hidden=false;document.body.classList.remove('is-exploring');
      history.replaceState(null,'',location.pathname+'?day='+n);updateUI(true);prepareCamera();invalidate();
    }
    function updateUI(force=false){
      if(path&&started){const at=path.dayAt(distance);day=at.day;fraction=at.t;}
      const d=namedDay(day),percent=path?distance/path.total*100:0;
      progress.value=percent*10;progress.style.setProperty('--progress',percent+'%');
      progress.setAttribute('aria-valuetext','Day '+day+' of 67, '+d.c);
      const previous=data.days.find(record=>record.n===day-1);
      const measured=path?path.recordedFraction(day,distance):0;
      const km=mix(previous?.cum||0,d.cum,measured),ascent=mix(previous?.cumElev||0,d.cumElev,measured);
      text('readout-day',String(day).padStart(2,'0'));text('readout-distance',number.format(km));
      text('readout-ascent',Math.round(ascent).toLocaleString('en-GB'));
      text('where',started?d.c:'Paris → Sofia');
      if(!force&&lastUI===day)return;lastUI=day;
      text('progress-day',d.date?new Date(d.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Day '+day);
      $('journey-day').value=day;$('day-back').disabled=day===1;$('day-forward').disabled=day===67;
      const photos=photosFor(day);$('photos-open').disabled=false;$('menu-photos').hidden=!photos.length;
      if(photos.length){$('menu-photo').src='photos/'+photos[Math.floor(photos.length*.45)].src;text('menu-photo-count',photos.length+' photographs ↗');}
      text('day-date',d.date?new Date(d.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'No dated recording.');
      const shared=day===16||day===17;
      text('day-facts',shared?'70.9 km across days 16–17':d.w?d.km.toFixed(1)+' km'+(d.elev?' · ↑ '+d.elev.toLocaleString()+' m':''):'A pause between recordings.');
      text('day-note',d.j.map(j=>j.text).join(' '));
      text('day-recording',shared?'One shared recording; the division between the two days is approximate.':route&&!route.features.some(f=>day>=f.properties.day&&day<=f.properties.throughDay)?'No separate recording. The moving view follows a visual connection.':'');
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
      const photos=photosFor(day);if(!photos.length||flashPending)return;
      const featured=chapters.find(c=>c.day===day),p=featured?{src:featured.photo}:photos[Math.floor(photos.length*.45)];
      const generation=++flashGeneration,photoDay=day,img=new Image();flashPending=true;
      img.onload=()=>{
        if(generation!==flashGeneration)return;flashPending=false;
        if(!playing||menu.open||gallery.open||day!==photoDay)return;
        flash.querySelectorAll('img').forEach(el=>el.src=img.src);flash.querySelector('.memory-location').textContent=namedDay(photoDay).c+' · day '+photoDay;
        flash.hidden=false;flashShown=true;flashTime=0;lastFlashDay=photoDay;photoCooldown=0;travelSpeed=0;
        requestAnimationFrame(()=>{if(generation===flashGeneration){flash.classList.add('visible');document.body.classList.add('in-memory');}});
      };img.onerror=()=>{if(generation===flashGeneration){flashPending=false;lastFlashDay=photoDay;}};img.src='photos/'+p.src;
    }
    function prepareCamera(){
      if(!terrainReady||failed)return;
      const generation=++warmGeneration,eye=TrekCamera.pointAt(path,distance);
      ready=false;map.setCenterClampedToGround(true);
      // Load the destination's elevation with a ground-clamped camera before
      // placing the travelling camera there. Sea-level guesses can put it inside a mountain.
      map.jumpTo({center:eye,zoom:11.5,pitch:35,bearing:TrekCamera.headingAt(path,distance)});
      map.once('idle',()=>{
        if(generation!==warmGeneration||failed)return;
        eyeHeight=null;heading=null;headingVelocity=0;viewPitch=null;
        map.setCenterClampedToGround(false);ready=true;camera(.016,true);$('map-status').hidden=true;invalidate();
      });
    }
    function camera(dt,snap=false){
      if(!ready||!following||!path||failed)return;
      // Filter one continuous distance and a forward heading, never restart an
      // easeTo animation at a GPS vertex or day boundary.
      const alpha=1-Math.exp(-dt/.6);
      renderedDistance=snap?distance:mix(renderedDistance,distance,alpha);
      const eye=TrekCamera.pointAt(path,renderedDistance),wanted=TrekCamera.headingAt(path,renderedDistance);
      const rotation=TrekCamera.turn(heading,headingVelocity,wanted,dt);
      heading=rotation.heading;headingVelocity=rotation.velocity;
      const ground=map.queryTerrainElevation(eye);
      const base=Number.isFinite(ground)?ground:eyeHeight===null?(map.getCenterElevation()||0):eyeHeight-720;
      // See an approaching ridge before reaching it. A broad, higher camera
      // avoids the near-horizontal terrain stretching and sudden vertical lifts.
      const heights=[base];let lookHeight=base;
      for(const offset of [300,650,1000]){
        const height=map.queryTerrainElevation(TrekCamera.pointAt(path,renderedDistance+offset));
        if(Number.isFinite(height)){heights.push(height);if(offset===1000)lookHeight=height;}
      }
      const wantedEye=Math.max(...heights)+720;
      const zAlpha=1-Math.exp(-dt/(eyeHeight!==null&&wantedEye>eyeHeight?1.3:3));
      eyeHeight=eyeHeight===null?wantedEye:mix(eyeHeight,wantedEye,zAlpha);
      eyeHeight=Math.max(eyeHeight,base+420);
      // A descent needs a gradual downward glance to keep the path in view.
      const wantedPitch=clamp(Math.atan2(1100,eyeHeight-lookHeight)*180/Math.PI,42,60);
      viewPitch=viewPitch===null?wantedPitch:viewPitch+clamp((wantedPitch-viewPitch)*(1-Math.exp(-dt/1.6)),-3*dt,3*dt);
      // Rebase the zoom reference onto the local ground on every frame. A stale
      // mountain reference can end up above the camera during a descent and
      // make the draped map texture swell, even when the physical eye is right.
      const target=TrekCamera.ahead(eye,heading,(eyeHeight-base)*Math.tan(viewPitch*Math.PI/180));
      const options=map.calculateCameraOptionsFromTo(eye,eyeHeight,target,base);
      // Do not change pitch after solving zoom/centre: that moves the eye too.
      map.jumpTo(options);cameraHeading=heading;cameraPitch=map.getPitch();
      cameraClearance=eyeHeight-base;cameraPoint=eye;
      return Math.abs(renderedDistance-distance)>1||Math.abs(angle(heading,wanted))>.1||Math.abs(headingVelocity)>.02||Math.abs(eyeHeight-wantedEye)>.5||Math.abs(viewPitch-wantedPitch)>.02;
    }
    function tick(time){
      frame=0;const elapsed=Math.min(1,Math.max(.001,(time-(lastTime||time-16))/1000)),dt=Math.min(.05,elapsed);lastTime=time;
      if(playing&&path&&ready){
        if(flashShown){flashTime+=elapsed;if(flashTime>=5.5)dismissFlash();}
        else{
          const desired=TrekCamera.speedLimit(path,distance,pace,heading);
          travelSpeed=mix(travelSpeed,desired,1-Math.exp(-dt/1.2));
          distance=Math.min(path.total,distance+travelSpeed*dt);photoCooldown+=elapsed;
          if($('photo-interludes').checked&&!reduced&&photoCooldown>14&&lastFlashDay!==day&&fraction>.28&&fraction<.9)showFlash();
          if(distance>=path.total){setPlaying(false);day=67;$('ending').hidden=false;}
        }
      }
      updateUI();const unsettled=camera(dt);
      if(playing||unsettled)invalidate();
    }
    function unavailable(message){failed=true;ready=false;$('map-status').hidden=false;text('map-status',message);setPlaying(false);}
    async function initialize(){
      document.body.classList.add('is-loading');
      try{
        const [r,m,style]=await Promise.all([loadJSON('route-detail.json'),loadJSON('moments.json'),loadJSON('journey-style.json'),loadLibrary()]);
        route=r;path=TrekRoute.buildJourneyPath(route);chapters=m.chapters;moments=m.moments;
        $('chapters').replaceChildren(...chapters.map(c=>{const b=document.createElement('button');b.dataset.chapter=c.id;const title=document.createElement('span'),small=document.createElement('small');title.textContent=c.title;small.textContent=String(c.from).padStart(2,'0')+'—'+String(c.to).padStart(2,'0');b.append(title,small);b.addEventListener('click',()=>{visit(c.day,.5);menu.close();});return b;}));
        if(positionPending){distance=path.dayDistance(positionPending.day,positionPending.t);renderedDistance=distance;positionPending=null;}
        // Roads and topography remain; label furniture belongs in the drawer.
        map=new maplibregl.Map({container:'path-map',style:TrekPaper.style(style),center:path.sample(distance).point,zoom:11.5,pitch:60,bearing:140,attributionControl:false,maxPitch:60,maxZoom:17,minZoom:3,renderWorldCopies:false,scrollZoom:false,dragRotate:true,touchZoomRotate:true,canvasContextAttributes:{antialias:true},fadeDuration:0});
        map.setVerticalFieldOfView(innerWidth<innerHeight?55:38);
        map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
        for(const event of ['dragstart','zoomstart','rotatestart','pitchstart'])map.on(event,e=>{if(e.originalEvent){setPlaying(false);following=false;document.body.classList.add('is-exploring');}});
        map.on('webglcontextlost',()=>unavailable('The landscape is unavailable. The photographs and days are still here.'));
        map.on('error',()=>{if(!ready)text('map-status','The landscape is taking a little longer. Photographs are ready in the menu.');});
        readyTimeout=setTimeout(()=>{if(!ready)text('map-status','The landscape could not finish loading. Photographs are ready in the menu.');},18000);
        map.on('load',()=>{
          if(failed)return;clearTimeout(readyTimeout);
          map.addSource('dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14,attribution:'Terrain © <a href="https://www.mapzen.com/rights/">Mapzen</a>'});
          map.addSource('shade-dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14});
          map.addLayer({id:'terrain-shade',type:'hillshade',source:'shade-dem',paint:{'hillshade-exaggeration':.65,'hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map','hillshade-shadow-color':'#536b43','hillshade-highlight-color':'#fff2d2','hillshade-accent-color':'#849365'}},'water');
          map.setTerrain({source:'dem',exaggeration:1});map.setCenterClampedToGround(false);
          map.setSky({'sky-color':'#e9e6d3','horizon-color':'#eee9d6','fog-color':'#e1dfc5','sky-horizon-blend':.7,'horizon-fog-blend':.6,'fog-ground-blend':.45});
          map.addSource('journey-recorded',{type:'geojson',data:path.recorded,tolerance:0});
          map.addSource('journey-connections',{type:'geojson',data:path.connections,tolerance:0});
          for(const [id,source,color,width,opacity,dash] of [['route-outline','journey-recorded','#fff3d8',4.5,.7],['route-recorded','journey-recorded','#c2693d',2.5,1],['route-connections','journey-connections','#b99461',2,.7,[2,3]]]){
            const paint={'line-color':color,'line-width':width,'line-opacity':opacity};if(dash)paint['line-dasharray']=dash;
            map.addLayer({id,type:'line',source,layout:{'line-cap':'round','line-join':'round'},paint});
          }
          try{paper=TrekPaper.create(map,{type:'FeatureCollection',features:[...path.recorded.features,...path.connections.features]});}
          catch(error){paper={status:()=>({failed:true,trees:0,roofs:0})};}
          // Sources have now populated MapLibre's initially expanded disclosure.
          document.querySelector('.maplibregl-ctrl-attrib').classList.remove('maplibregl-compact-show');
          terrainReady=true;prepareCamera();text('map-status','Opening this stretch of landscape…');
          // Elevation arriving after the vector map gets a short settling pass.
          map.on('sourcedata',e=>{if(e.sourceId==='dem'&&e.isSourceLoaded)invalidate();});
          document.body.classList.remove('is-loading');updateUI(true);invalidate();
        });
        updateUI(true);
      }catch(error){unavailable('The landscape could not load. You can still open the photographs and days.');}
    }
    $('begin').addEventListener('click',begin);$('replay').addEventListener('click',()=>{reset();begin();});
    $('play').addEventListener('click',()=>{if(flashShown){dismissFlash();setPlaying(false);}else if(playing)setPlaying(false);else begin();});
    $('menu-open').addEventListener('click',()=>{setPlaying(false);dismissFlash();menu.showModal();});$('menu-close').addEventListener('click',()=>menu.close());
    menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left)menu.close();}});
    $('journey-day').addEventListener('change',e=>visit(+e.target.value));
    $('day-back').addEventListener('click',()=>visit(day-1));$('day-forward').addEventListener('click',()=>visit(day+1));
    $('restart').addEventListener('click',reset);$('pace').addEventListener('change',e=>pace=+e.target.value);
    progress.addEventListener('input',()=>{if(!path)return;setPlaying(false);dismissFlash();started=true;following=true;distance=+progress.value/1000*path.total;renderedDistance=distance;heading=null;eyeHeight=null;document.body.classList.remove('is-exploring');$('ending').hidden=distance<path.total;updateUI(true);prepareCamera();invalidate();});
    $('photos-open').addEventListener('click',()=>showGallery(Math.floor(photosFor(day).length*fraction)));
    $('menu-photos').addEventListener('click',()=>showGallery());$('gallery-close').addEventListener('click',()=>gallery.close());
    $('photo-back').addEventListener('click',()=>showGallery(galleryIndex-1));$('photo-forward').addEventListener('click',()=>showGallery(galleryIndex+1));
    flash.addEventListener('click',dismissFlash);
    gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showGallery(galleryIndex+(e.key==='ArrowRight'?1:-1));}});
    gallery.addEventListener('touchstart',e=>{swipeX=e.changedTouches[0].clientX;},{passive:true});
    gallery.addEventListener('touchend',e=>{if(swipeX!==null){const delta=e.changedTouches[0].clientX-swipeX;if(Math.abs(delta)>50)showGallery(galleryIndex+(delta<0?1:-1));}swipeX=null;},{passive:true});
    addEventListener('keydown',e=>{if(e.key==='Escape'){setPlaying(false);dismissFlash();}else if(e.key===' '&&!e.target.closest('button,a,input,select,summary')&&!menu.open&&!gallery.open){e.preventDefault();playing?setPlaying(false):begin();}else if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&!e.target.closest('input,select')&&!menu.open&&!gallery.open){e.preventDefault();visit(day+(e.key==='ArrowRight'?1:-1));}});
    addEventListener('resize',()=>{if(map){map.resize();map.setVerticalFieldOfView(innerWidth<innerHeight?55:38);}invalidate();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){setPlaying(false);dismissFlash();cancelAnimationFrame(frame);frame=0;}else invalidate();});
    host.trekStatus=()=>({ready,failed,playing,started,following,day,t:fraction,distance,renderedDistance,total:path?.total||0,kind:path?.sample(distance).kind,routeLines:route?.features.length||0,connections:path?.connections.features.length||0,bearing:cameraHeading,pitch:cameraPitch,eyeHeight,cameraClearance,cameraPoint,cameraZoom:map?.getZoom(),mapElevation:map?.getCenterElevation(),headingVelocity,travelSpeed,reduced,photoInterludes:$('photo-interludes').checked,flash:flashShown,photoCooldown,flashPending,galleryCount:galleryPhotos.length,viewport:[innerWidth,innerHeight],paper:paper?.status()});
    const q=new URLSearchParams(location.search),n=+q.get('day');
    if(n>=1&&n<=67)visit(n,.5);else if(location.hash){const d=data.days.find(d=>d.c.toLowerCase()===location.hash.slice(1));if(d)visit(d.n,.2);}
    updateUI(true);initialize();
  };
})(window);
