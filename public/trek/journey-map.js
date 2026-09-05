/* The recorded paths, 3D terrain and a readable story for each day. */
(function(host){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const distance=(a,b)=>Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1]);
  const empty=()=>({type:'FeatureCollection',features:[]});
  const feature=(coordinates,properties={})=>({type:'Feature',properties,geometry:{type:'LineString',coordinates}});
  function pathAt(features,t){
    const lengths=features.map(f=>f.geometry.coordinates.slice(1).reduce((n,p,i)=>n+distance(f.geometry.coordinates[i],p),0));
    const total=lengths.reduce((a,b)=>a+b,0);let remaining=clamp(t,0,1)*total;
    for(let f=0;f<features.length;f++){
      const points=features[f].geometry.coordinates;
      if(remaining>lengths[f]&&f<features.length-1){remaining-=lengths[f];continue;}
      for(let i=1;i<points.length;i++){
        const span=distance(points[i-1],points[i]);
        if(remaining<=span||i===points.length-1){const u=span?clamp(remaining/span,0,1):0;return {point:points[i].map((v,j)=>mix(points[i-1][j],v,u)),feature:f,index:i};}
        remaining-=span;
      }
    }
    return {point:features.at(-1)?.geometry.coordinates.at(-1)||[2.55,49.01],feature:features.length-1,index:1};
  }
  if(typeof module!=='undefined')module.exports={pathAt};
  if(typeof document==='undefined')return;
  const icon={mountain:'△',river:'≈',trail:'↗',aircraft:'✦',monument:'▱',finish:'◉'};
  const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  host.createTrekJourney=function(data,options){
    const stage=document.getElementById('stage');
    const container=document.getElementById('path-map');
    const card=document.getElementById('journey-card');
    const chaptersEl=document.getElementById('journey-chapters');
    const picker=document.getElementById('journey-day');
    const status=document.getElementById('path-status');
    const follow=document.getElementById('path-follow');
    const picture=document.getElementById('journey-photo');
    const caption=document.getElementById('journey-photo-caption');
    const momentList=document.getElementById('day-moments');
    const momentDialog=document.getElementById('moment-dialog');
    const sourceText=document.getElementById('route-source');
    let map=null,loading=null,ready=false,enabled=false,following=true,removed=false;
    let route=null,chapters=[],moments=[],state={day:1,t:0,type:'start'};
    let lastDay=-1,lastPhoto=-1,photoOffset=0,manualPhoto=false,lastCamera=0,lastPoint=null;
    let cameraKey='',lastDraw=-1,renderState=null,settleTimer=0;
    const byDay=new Map();
    const namedDay=n=>data.days.find(d=>d.n===n)||data.days[0];
    const cameraPadding=()=>innerWidth<760?{top:Math.min(card.getBoundingClientRect().bottom+22,innerHeight*.52),bottom:244,left:20,right:20}:{top:100,bottom:185,left:card.getBoundingClientRect().right+38,right:45};
    const photoSet=n=>data.photos.filter(p=>p.day===n);
    const photoDay=()=>state.type==='end'?66:state.day;
    const text=(id,value)=>{const el=document.getElementById(id);if(el.textContent!==value)el.textContent=value;};
    const allDays=data.days;
    picker.replaceChildren(...allDays.map(d=>{const o=document.createElement('option');o.value=d.n;o.textContent='Day '+d.n+' · '+(d.w?d.c:'off the route');return o;}));
    function dayFeatures(day){
      if(byDay.has(day))return byDay.get(day);
      for(let n=day-1;n>0;n--)if(byDay.has(n))return byDay.get(n);
      return route?.features.slice(0,1)||[];
    }
    function sharedFraction(day,t){
      if(!byDay.has(day))return 1;
      const fs=dayFeatures(day),p=fs[0]?.properties;
      return p&&p.throughDay>p.day?(day-p.day+t)/(p.throughDay-p.day+1):t;
    }
    function setFollowing(value){following=value;follow.hidden=value;stage.classList.toggle('is-exploring',!value);}
    function jump(n,t=.5){options.pause();setFollowing(true);cameraKey='';options.visit(n,t);}
    function setEnabled(value){
      enabled=value;stage.classList.toggle('is-detail',value);
      container.hidden=!value;card.hidden=!value;document.getElementById('path-tools').hidden=!value;
      if(map&&value){map.resize();cameraKey='';draw(true);}
    }
    async function initialize(){
      await loadScript('vendor/maplibre-gl.js');
      if(removed)return;
      const style=await fetch('journey-style.json').then(r=>{if(!r.ok)throw Error('Map style unavailable');return r.json();});
      map=new maplibregl.Map({container,style,center:[13.18,47.05],zoom:9,pitch:58,bearing:-12,attributionControl:false,maxPitch:75,maxZoom:17,minZoom:2,renderWorldCopies:false,dragPan:true,scrollZoom:false,touchZoomRotate:true,canvasContextAttributes:{antialias:true},fadeDuration:0});
      map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
      map.addControl(new maplibregl.ScaleControl({maxWidth:110,unit:'metric'}),'bottom-right');
      map.on('dragstart',e=>{if(e.originalEvent){options.pause();setFollowing(false);}});
      map.on('zoomstart',e=>{if(e.originalEvent){options.pause();setFollowing(false);}});
      map.on('rotatestart',e=>{if(e.originalEvent){options.pause();setFollowing(false);}});
      map.on('error',()=>{if(!ready)status.textContent='The landscape is taking a little longer to load. The days and photographs are ready.';});
      map.on('webglcontextlost',()=>{removed=true;ready=false;status.textContent='The terrain view is unavailable. You can still explore the days and photographs.';status.hidden=false;});
      const timeout=setTimeout(()=>{if(!ready&&enabled){status.hidden=false;status.textContent='Map tiles are unavailable. You can still explore the days and photographs.';}},18000);
      map.on('load',()=>{
        clearTimeout(timeout);if(removed)return;
        map.addSource('dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14,attribution:'Terrain © <a href="https://www.mapzen.com/rights/">Mapzen</a>'});
        map.addSource('shade-dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14});
        map.addLayer({id:'terrain-shade',type:'hillshade',source:'shade-dem',paint:{'hillshade-exaggeration':.38,'hillshade-shadow-color':'#52634f','hillshade-highlight-color':'#f5edda','hillshade-accent-color':'#60715b'}},'water');
        map.setTerrain({source:'dem',exaggeration:1.35});
        map.addSource('journey-route',{type:'geojson',data:route,tolerance:0});
        map.addSource('journey-active',{type:'geojson',data:empty(),tolerance:0});
        map.addSource('journey-walked',{type:'geojson',data:empty(),tolerance:0});
        map.addSource('journey-passed',{type:'geojson',data:empty(),tolerance:0});
        const before=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
        for(const [id,source,color,width,opacity] of [['route-outline','journey-route','#f8f3e6',6,.9],['route-all','journey-route','#8f8c7b',2.2,.65],['route-passed','journey-passed','#d88455',2.5,1],['route-day-outline','journey-active','#fff9ea',8,1],['route-day','journey-active','#b6603f',4,1],['route-walked','journey-walked','#e76635',5,1]]){
          map.addLayer({id,type:'line',source,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':color,'line-width':width,'line-opacity':opacity}},before);
        }
        map.addLayer({id:'route-hit',type:'line',source:'journey-route',paint:{'line-color':'#000','line-width':22,'line-opacity':0}});
        map.on('click','route-hit',e=>{const f=e.features?.[0];if(f)jump(+f.properties.day,.5);});
        map.on('mouseenter','route-hit',()=>map.getCanvas().style.cursor='pointer');
        map.on('mouseleave','route-hit',()=>map.getCanvas().style.cursor='');
        // Keep the traveller and photo-day markers in the terrain renderer.
        map.addSource('journey-position',{type:'geojson',data:empty()});
        map.addSource('journey-moments',{type:'geojson',data:empty()});
        map.addLayer({id:'moment-dots',type:'circle',source:'journey-moments',paint:{'circle-radius':8,'circle-color':'#f8f3e5','circle-stroke-color':'#9a734c','circle-stroke-width':2}});
        map.addLayer({id:'moment-labels',type:'symbol',source:'journey-moments',layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular'],'text-size':12,'text-anchor':'top','text-offset':[0,1.3],'text-max-width':16,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},paint:{'text-color':'#536148','text-halo-color':'#faf5e6','text-halo-width':2}});
        map.addLayer({id:'walking-position',type:'circle',source:'journey-position',paint:{'circle-radius':6,'circle-color':'#ed713c','circle-stroke-color':'#fff9e9','circle-stroke-width':3}});
        for(const layer of ['moment-dots','moment-labels']){
          map.on('click',layer,e=>{const moment=moments.find(m=>m.id===e.features?.[0]?.properties.id);if(moment)showMoment(moment);});
          map.on('mouseenter',layer,()=>map.getCanvas().style.cursor='pointer');
          map.on('mouseleave',layer,()=>map.getCanvas().style.cursor='');
        }
        ready=true;status.textContent='Loading this stretch of landscape…';cameraKey='';draw(true);
        map.on('idle',()=>{
          status.hidden=true;
          // DEM tiles can arrive after the camera animation. Keep its target
          // at the route's ground height, not the initial sea-level estimate.
          if(following&&lastPoint&&state.type!=='start'){
            const elevation=map.queryTerrainElevation(lastPoint);
            if(Number.isFinite(elevation)&&Math.abs(elevation-map.getCenterElevation())>2)map.setCenterElevation(elevation);
          }
        });
      });
    }
    async function open(){
      setEnabled(true);setFollowing(true);
      if(!loading){status.hidden=false;status.textContent='Opening the paths…';loading=Promise.all([readyData,initializeLibrary()]).catch(()=>{status.hidden=false;status.textContent='The 3D map could not load. You can still explore the days and photographs.';});}
      await loading;
      draw(true);
    }
    async function initializeLibrary(){await readyData;await initialize();}
    function photoAt(index){
      const photos=photoSet(photoDay());picture.closest('figure').hidden=!photos.length;if(!photos.length)return;
      index=((index%photos.length)+photos.length)%photos.length;
      if(index===lastPhoto)return;lastPhoto=index;photoOffset=index;
      const photo=photos[index];picture.src='photos/'+photo.src;picture.alt=photo.alt||'Photograph from day '+photoDay();
      if(!options.reduced)picture.animate([{opacity:.35,transform:'scale(1.025)'},{opacity:1,transform:'scale(1)'}],{duration:450,easing:'ease-out'});
      caption.textContent=String(index+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0')+' · DAY '+photoDay();
      document.getElementById('photo-back').disabled=document.getElementById('photo-forward').disabled=photos.length<2;
    }
    function updateCard(){
      const day=namedDay(photoDay()),chapter=chapters.find(c=>day.n>=c.from&&day.n<=c.to)||chapters[0];
      if(!chapter)return;
      const cardKey=day.n+(state.type==='start'?100:state.type==='end'?200:0);
      if(lastDay!==cardKey){
        lastDay=cardKey;lastPhoto=-1;manualPhoto=false;picker.value=day.n;
        text('journey-chapter',state.type==='start'?'A WALK ACROSS EUROPE · AUTUMN 2019':state.type==='end'?'THE LAST PAGE · BULGARIA':String(chapters.indexOf(chapter)+1).padStart(2,'0')+' / '+chapter.place);
        text('journey-title',state.type==='start'?'Paris\nto Sofia.':state.type==='end'?'Sofia.\nAt last.':chapter.title);
        text('journey-date',day.date?new Date(day.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'Between the recorded days');
        text('journey-note',state.type==='start'?'River paths, mountain ridges and the long roads between. 1,982 kilometres on foot, through seven countries.':state.type==='end'?'On 28 November, the route reached Sofia. The walk from Paris was complete.':day.j.length?day.j.map(j=>j.text).join(' '):chapter.text);
        text('journey-day-facts',day.w?[day.km.toFixed(1)+' km',day.elev?'↑ '+day.elev.toLocaleString()+' m':null,day.min?Math.floor(day.min/60)+'h '+String(day.min%60).padStart(2,'0')+'m':null].filter(Boolean).join(' · '):'A pause in the journey');
        text('journey-record-title',day.t||'');
        text('journey-record-label',day.s?day.s.artist+' · '+day.s.album:'');
        if(day.s)document.getElementById('journey-record-cover').src='covers/'+day.s.slug+'.webp';
        document.getElementById('journey-record-button').hidden=!day.s;document.getElementById('journey-record-button').dataset.day=day.n;
        const fs=dayFeatures(day.n);const shared=fs[0]?.properties.throughDay>fs[0]?.properties.day;
        if(shared){const recorded=namedDay(fs[0].properties.day);text('journey-day-facts',recorded.km.toFixed(1)+' km across days 16–17 · ↑ '+recorded.elev.toLocaleString()+' m');}
        text('day-recording-note',!byDay.has(day.n)?'No separate recording for this day.':shared?'Days 16–17 share one recording; the day division is approximate.':'');
        momentList.replaceChildren(...moments.filter(m=>m.day===day.n).map(moment=>{const b=document.createElement('button');b.type='button';b.className='day-moment';b.textContent=icon[moment.kind]+' '+moment.title;b.addEventListener('click',()=>showMoment(moment));return b;}));
        chaptersEl.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.chapter===chapter.id)));
        const selected=chaptersEl.querySelector('[aria-current="true"]');
        if(selected){const r=selected.getBoundingClientRect(),p=chaptersEl.getBoundingClientRect();if(r.left<p.left||r.right>p.right)chaptersEl.scrollLeft=selected.offsetLeft-chaptersEl.clientWidth/2+selected.clientWidth/2;}
        document.getElementById('day-back').disabled=day.n===1;document.getElementById('day-forward').disabled=day.n===67;
        if(!options.reduced){for(const id of ['journey-title','journey-note'])document.getElementById(id).animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'ease-out'});}
      }
      const range=document.getElementById('day-progress');if(document.activeElement!==range)range.value=Math.round(state.t*100);
      if(!manualPhoto)photoAt(Math.floor(clamp(state.t,0,.999)*photoSet(day.n).length));
    }
    function draw(force=false){
      if(!enabled||!ready||document.hidden||!route)return;
      const now=performance.now();if(!force&&now-lastDraw<70)return;lastDraw=now;
      if(state.type==='start'){
        if(cameraKey!=='overview'){
          const bounds=new maplibregl.LngLatBounds();route.features.forEach(f=>f.geometry.coordinates.forEach(p=>bounds.extend(p)));
          // Fit from a neutral camera so padding from a close day cannot be
          // applied twice. Leave room for the perspective at the eastern end.
          map.setPadding({top:0,bottom:0,left:0,right:0});
          const camera=map.cameraForBounds(bounds,{padding:cameraPadding(),bearing:-8});
          map.easeTo({...camera,zoom:camera.zoom-.3,pitch:30,elevation:0,duration:options.reduced?0:1000});
          map.setPaintProperty('route-all','line-color','#b6603f');
          map.setPaintProperty('route-all','line-width',3);
          map.setPaintProperty('route-all','line-opacity',1);
          for(const source of ['journey-active','journey-walked','journey-position','journey-moments','journey-passed'])map.getSource(source).setData(empty());
          cameraKey='overview';renderState=null;
        }
        return;
      }
      const day=state.day,fs=dayFeatures(day),t=sharedFraction(day,state.t),at=pathAt(fs,t);
      if(renderState!==day){
        map.setPaintProperty('route-all','line-color','#8f8c7b');
        map.setPaintProperty('route-all','line-width',2.2);
        map.setPaintProperty('route-all','line-opacity',.65);
        renderState=day;map.getSource('journey-active').setData({type:'FeatureCollection',features:fs});
        map.getSource('journey-passed').setData({type:'FeatureCollection',features:route.features.filter(f=>f.properties.throughDay<day)});
        map.getSource('journey-moments').setData({type:'FeatureCollection',features:moments.filter(m=>m.day===day).map(m=>({type:'Feature',properties:{id:m.id,label:m.title+' · day '+m.day},geometry:{type:'Point',coordinates:pathAt(dayFeatures(m.day),sharedFraction(m.day,m.at)).point}}))});
      }
      const completed=fs.slice(0,at.feature).concat(feature(fs[at.feature]?.geometry.coordinates.slice(0,at.index).concat([at.point])||[at.point,at.point]));
      map.getSource('journey-walked').setData({type:'FeatureCollection',features:completed});
      map.getSource('journey-position').setData({type:'Feature',properties:{},geometry:{type:'Point',coordinates:at.point}});
      const key=day+':'+(innerWidth<760?'mobile':'desktop');
      if(following&&(force||key!==cameraKey||now-lastCamera>130)){
        const mountain=day>=26&&day<=36;
        const zoom=mountain?12:11.6;
        // Padding moves the visual centre without moving the geographic centre
        // onto a different mountain, where terrain clamping would hide the path.
        map.easeTo({center:at.point,elevation:map.queryTerrainElevation(at.point)||0,zoom,pitch:innerWidth<760?45:mountain?58:52,bearing:mountain?-22:-8,padding:cameraPadding(),duration:force||key!==cameraKey?(options.reduced?0:1000):180,essential:false});
        cameraKey=key;lastCamera=now;lastPoint=at.point;
      }
    }
    function showMoment(moment){
      options.pause();jump(moment.day,moment.at);
      momentDialog.classList.remove('is-photo');
      document.getElementById('photo-dialog-nav').hidden=true;document.getElementById('moment-filmstrip').hidden=true;
      const img=document.getElementById('moment-photo');img.src='photos/'+moment.photo;img.alt=moment.title;
      text('moment-place',moment.place+' · day '+moment.day);text('moment-title',moment.title);text('moment-text',moment.text);text('moment-evidence',moment.evidence);text('moment-position',moment.position);
      if(!momentDialog.open)momentDialog.showModal();
    }
    const readyData=Promise.all([fetch('route-detail.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('moments.json').then(r=>{if(!r.ok)throw Error();return r.json();})]).then(([r,m])=>{
      route=r;chapters=m.chapters;moments=m.moments;
      for(const f of route.features)for(let d=f.properties.day;d<=f.properties.throughDay;d++){if(!byDay.has(d))byDay.set(d,[]);byDay.get(d).push(f);}
      sourceText.textContent='Recorded paths · gaps are unrecorded · terrain ×1.35';
      stage.dataset.routePrecision=route.precision;
      chaptersEl.replaceChildren(...chapters.map((chapter,i)=>{
        const b=document.createElement('button');b.type='button';b.dataset.chapter=chapter.id;
        const img=document.createElement('img');img.src='photos/'+chapter.photo;img.alt='';img.width=64;img.height=54;img.loading='lazy';
        const copy=document.createElement('span'),small=document.createElement('small'),title=document.createElement('b');small.textContent=String(i+1).padStart(2,'0')+' / DAYS '+chapter.from+'–'+chapter.to;title.textContent=chapter.title;copy.append(small,title);b.append(img,copy);
        b.addEventListener('click',()=>{jump(chapter.day,.5);open();});return b;
      }));
      updateCard();
    }).catch(()=>{chaptersEl.hidden=true;throw Error('Journey data unavailable');});
    // The initial card remains readable if map metadata is unavailable.
    readyData.catch(()=>{});
    picker.addEventListener('change',()=>jump(+picker.value,.2));
    document.getElementById('day-back').addEventListener('click',()=>jump(Math.max(1,state.day-1),.2));
    document.getElementById('day-forward').addEventListener('click',()=>jump(Math.min(67,state.day+1),.2));
    document.getElementById('day-progress').addEventListener('input',e=>jump(state.day,+e.target.value/100));
    document.getElementById('photo-back').addEventListener('click',()=>{manualPhoto=true;photoAt(photoOffset-1);});
    document.getElementById('photo-forward').addEventListener('click',()=>{manualPhoto=true;photoAt(photoOffset+1);});
    let galleryDay=1;
    function showPhoto(){
      const photos=photoSet(galleryDay),p=photos[photoOffset];if(!p)return;
      const day=namedDay(galleryDay),img=document.getElementById('moment-photo');img.src='photos/'+p.src;img.alt=p.alt||'Photograph from day '+galleryDay;
      text('moment-place',day.c+' · day '+galleryDay);text('moment-title',chapters.find(c=>day.n>=c.from&&day.n<=c.to)?.title||'From the walk.');
      text('moment-text',day.j.map(j=>j.text).join(' ')||p.caption||'A photograph from this day of the trek.');
      text('moment-evidence',day.date?new Date(day.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'From the original photographs');
      text('moment-position','Grouped by day; no precise photo location is recorded.');text('moment-photo-count',String(photoOffset+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0'));
      document.getElementById('moment-photo-back').disabled=photoOffset===0;document.getElementById('moment-photo-forward').disabled=photoOffset===photos.length-1;
      document.getElementById('moment-filmstrip').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===photoOffset)));
      if(!momentDialog.open)momentDialog.showModal();
      const strip=document.getElementById('moment-filmstrip'),selected=strip.querySelector('[aria-current="true"]');
      if(selected)strip.scrollLeft=selected.offsetLeft-strip.offsetLeft-strip.clientWidth/2+selected.clientWidth/2;
    }
    document.getElementById('journey-photo-open').addEventListener('click',()=>{
      options.pause();galleryDay=photoDay();const photos=photoSet(galleryDay);if(!photos.length)return;
      momentDialog.classList.add('is-photo');document.getElementById('photo-dialog-nav').hidden=false;
      const filmstrip=document.getElementById('moment-filmstrip');filmstrip.hidden=false;
      filmstrip.replaceChildren(...photos.map((p,index)=>{const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.setAttribute('aria-label','Photograph '+(index+1)+' of '+photos.length);img.src='photos/'+p.src;img.alt='';img.loading='lazy';b.append(img);b.addEventListener('click',()=>{manualPhoto=true;photoAt(index);showPhoto();});return b;}));
      showPhoto();
    });
    const browsePhoto=delta=>{const photos=photoSet(galleryDay),next=clamp(photoOffset+delta,0,photos.length-1);manualPhoto=true;photoAt(next);showPhoto();};
    document.getElementById('moment-photo-back').addEventListener('click',()=>browsePhoto(-1));
    document.getElementById('moment-photo-forward').addEventListener('click',()=>browsePhoto(1));
    momentDialog.addEventListener('keydown',e=>{if(!momentDialog.classList.contains('is-photo'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();browsePhoto(e.key==='ArrowLeft'?-1:1);}});
    document.getElementById('moment-close').addEventListener('click',()=>momentDialog.close());
    momentDialog.addEventListener('click',e=>{if(e.target===momentDialog)momentDialog.close();});
    follow.addEventListener('click',()=>{setFollowing(true);cameraKey='';draw(true);});
    document.getElementById('path-zoom-in').addEventListener('click',()=>{if(map){options.pause();setFollowing(false);map.zoomIn();}});
    document.getElementById('path-zoom-out').addEventListener('click',()=>{if(map){options.pause();setFollowing(false);map.zoomOut();}});
    document.getElementById('path-day-fit').addEventListener('click',()=>{
      if(!ready)return;options.pause();setFollowing(false);const points=dayFeatures(state.day).flatMap(f=>f.geometry.coordinates);
      const bounds=new maplibregl.LngLatBounds();points.forEach(p=>bounds.extend(p));map.fitBounds(bounds,{padding:cameraPadding(),pitch:45,bearing:-8,duration:options.reduced?0:900,maxZoom:13});
    });
    addEventListener('resize',()=>{if(map&&enabled){map.resize();cameraKey='';draw(true);}});
    let overviewCache=null,overviewKey='';
    function overviewBounds(){
      if(!ready||state.type!=='start'||map.isMoving())return null;
      const center=map.getCenter(),key=[innerWidth,innerHeight,center.lng,center.lat,map.getZoom(),map.getPitch(),map.getBearing(),map.getCenterElevation()].join(':');
      if(key===overviewKey)return overviewCache;
      const box={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
      for(const f of route.features)for(const p of f.geometry.coordinates){const point=map.project(p);box.left=Math.min(box.left,point.x);box.right=Math.max(box.right,point.x);box.top=Math.min(box.top,point.y);box.bottom=Math.max(box.bottom,point.y);}
      overviewKey=key;overviewCache=box;return box;
    }
    return {open,follow(){setFollowing(true);cameraKey='';},update(value){const changed=state.day!==value.day||state.type!==value.type;state=value;updateCard();draw(changed);clearTimeout(settleTimer);settleTimer=setTimeout(()=>draw(true),90);},getState(){return {ready,enabled,following,day:state.day,fraction:state.t,precision:route?.precision,zoom:map?.getZoom(),pitch:map?.getPitch(),center:map?.getCenter(),elevation:map?.getCenterElevation(),padding:map?.getPadding(),pointScreen:lastPoint&&map?.project(lastPoint),moving:map?.isMoving(),routeLines:route?.features.length,overviewBounds:overviewBounds()};}};
  };
})(typeof window!=='undefined'?window:globalThis);
