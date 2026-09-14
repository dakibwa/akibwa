/* A small paper atlas and place names, driven by the existing journey clock. */
(function(host){
  'use strict';
  const R=6378137,project=([lng,lat])=>[R*lng*Math.PI/180,-R*Math.asinh(Math.tan(lat*Math.PI/180))];
  const flags={France:'fr',Germany:'de',Austria:'at',Slovenia:'si',Croatia:'hr',Serbia:'rs',Bulgaria:'bg'};
  const metres=(a,b)=>111195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
  const limits={city:2200,town:1350,village:750,hamlet:420},importance={city:4,town:3,village:2,hamlet:1};
  // Settlement centres are geographic context, not evidence of visiting a building.
  function nearestPlace(features,point,previous=null){
    const places=new Map();
    for(const f of features){
      const p=f.properties||{},kind=p.class||p.place,name=p['name:en']||p.name_en||p['name:latin']||p.name;
      if(!name||!limits[kind]||f.geometry?.type!=='Point')continue;
      const at=f.geometry.coordinates,d=metres(point,at),id=name+':'+at.map(n=>n.toFixed(3)).join(':');
      if(d>limits[kind]*(id===previous?.id?1.2:1))continue;
      places.set(id,{id,name,point:at,d,kind,score:d/limits[kind]});
    }
    const sorted=[...places.values()].sort((a,b)=>a.score-b.score),held=places.get(previous?.id);
    return held&&(!sorted[0]||held.score<sorted[0].score+.22)?held:sorted[0]||null;
  }
  // Index short spans, retaining their original segments for the final
  // projection. A place lookup never scans the complete Paris–Sofia route.
  function routePlaceIndex(path){
    const cells=new Map(),size=2048;let groups=0;
    for(const piece of path.pieces){
      const xy=new Float64Array(piece.points.length*2);
      piece.points.forEach((p,i)=>xy.set(project(p),i*2));
      let first=0,bounds=[xy[0],xy[1],xy[0],xy[1]];
      for(let i=1;i<piece.points.length;i++){
        const x=xy[i*2],y=xy[i*2+1];bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];
        if(piece.distances[i]-piece.distances[first]<200&&i<piece.points.length-1)continue;
        const group={piece,xy,first,last:i,bounds};groups++;
        for(let x=Math.floor(bounds[0]/size);x<=Math.floor(bounds[2]/size);x++)for(let y=Math.floor(bounds[1]/size);y<=Math.floor(bounds[3]/size);y++){
          const key=x+':'+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(group);
        }
        first=i;bounds=[x,y,x,y];
      }
    }
    function match(point,kind){
      const p=project(point),radius=limits[kind]/Math.cos(point[1]*Math.PI/180),near=new Set(),matches=[];
      if(!Number.isFinite(radius))return [];
      for(let x=Math.floor((p[0]-radius)/size);x<=Math.floor((p[0]+radius)/size);x++)for(let y=Math.floor((p[1]-radius)/size);y<=Math.floor((p[1]+radius)/size);y++)for(const group of cells.get(x+':'+y)||[])near.add(group);
      for(const {piece,xy,first,last,bounds} of near){
        if(Math.hypot(Math.max(bounds[0]-p[0],0,p[0]-bounds[2]),Math.max(bounds[1]-p[1],0,p[1]-bounds[3]))>radius)continue;
        let best=null;
        for(let i=first+1;i<=last;i++){
          const x=xy[(i-1)*2],y=xy[(i-1)*2+1],dx=xy[i*2]-x,dy=xy[i*2+1]-y;
          const t=Math.max(0,Math.min(1,((p[0]-x)*dx+(p[1]-y)*dy)/(dx*dx+dy*dy||1)));
          const ll=piece.points[i-1].map((v,k)=>v+(piece.points[i][k]-v)*t),proximity=metres(point,ll);
          if(proximity<=limits[kind]&&(!best||proximity<best.proximity))best={distance:piece.start+piece.distances[i-1]+(piece.distances[i]-piece.distances[i-1])*t,proximity,routeKind:piece.kind,mode:piece.mode||'walk'};
        }
        if(best)matches.push(best);
      }
      // One position per continuous approach; retain distinct later passes so
      // a date seek does not attach a town to a different nearby route leg.
      matches.sort((a,b)=>a.distance-b.distance);const approaches=[];let last=-Infinity;
      for(const item of matches){
        if(item.distance-last>Math.max(1500,limits[kind]*2))approaches.push(item);
        else if(item.proximity<approaches.at(-1).proximity)approaches[approaches.length-1]=item;
        last=item.distance;
      }
      return approaches.sort((a,b)=>a.proximity-b.proximity).slice(0,8).sort((a,b)=>a.distance-b.distance);
    }
    return {match,status:()=>({groups,cells:cells.size})};
  }
  const placeName=p=>p?.['name:en']||p?.name_en||p?.['name:latin']||p?.name;
  const normalName=name=>name.normalize('NFKC').trim().toLowerCase();
  function settlementWindow(entries,distance,point,previousId=null,context='recorded'){
    const ordered=entries.filter(e=>Math.abs(e.distance-distance)<=100000).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
    const near=point?ordered.map(entry=>({entry,d:metres(point,entry.point)})).filter(({entry,d})=>d<=limits[entry.kind]*(entry.id===previousId?1.2:1)).sort((a,b)=>a.d/limits[a.entry.kind]-b.d/limits[b.entry.kind]):[];
    const held=near.find(e=>e.entry.id===previousId),current=held&&(!near[0]||held.d/limits[held.entry.kind]<near[0].d/limits[near[0].entry.kind]+.22)?held.entry:near[0]?.entry;
    let anchor=current?ordered.indexOf(current):ordered.findIndex(e=>e.distance>=distance);
    if(anchor<0)anchor=ordered.length-1;
    const start=Math.max(0,anchor-2),window=ordered.slice(start,start+9).map(entry=>({...entry,offset:entry.distance-distance,state:entry.id===current?.id?'current':entry.distance<distance?'passed':'upcoming'}));
    return {entries:window,currentId:current?.id||null,currentIndex:anchor<0?-1:anchor-start,distance,context};
  }
  function settlementCache(path){
    const index=routePlaceIndex(path),records=new Map(),rejected=new Map(),names=new Map(),providers=new Map();let currentId=null;
    const remember=entry=>{
      for(const [lookup,key] of [[names,entry.canonical],[providers,entry.providerId]])if(key!==null){if(!lookup.has(key))lookup.set(key,[]);lookup.get(key).push(entry);}
    };
    const known=(canonical,providerId,point)=>{
      for(const group of [names.get(canonical),providerId===null?null:providers.get(providerId)])for(const entry of group||[])if(metres(entry.point,point)<250)return entry;
      return null;
    };
    function add(features,distance){
      const point=path.sample(distance).point,newPlaces=[];
      for(const feature of features){
        const p=feature.properties||{},kind=p.class||p.place,name=placeName(p),at=feature.geometry?.coordinates;
        if(!limits[kind]||typeof name!=='string'||!name.trim()||feature.geometry?.type!=='Point'||!Array.isArray(at)||!at.slice(0,2).every(Number.isFinite))continue;
        const canonical=normalName(name),key=canonical+':'+kind+':'+at.map(n=>n.toFixed(4)).join(':'),providerId=feature.id===undefined?null:String(feature.id);
        if(rejected.has(key))continue;
        const found=known(canonical,providerId,at);
        if(found){
          if(importance[kind]>importance[found.kind]){found.kind=kind;found.matches=index.match(found.point,kind);}
          if((p['name:en']||p.name_en)&&!found.english){found.name=name.trim();found.english=true;}
          continue;
        }
        newPlaces.push({key,providerId,canonical,name:name.trim(),kind,point:at.slice(0,2),english:!!(p['name:en']||p.name_en),near:metres(point,at)});
      }
      // Loaded tiles can include far-ahead labels. Bound new geometric work
      // and give the current landscape first choice; the next refresh continues.
      newPlaces.sort((a,b)=>a.near-b.near);
      for(const item of newPlaces.slice(0,256)){
        const matches=index.match(item.point,item.kind);
        if(!matches.length){rejected.set(item.key,true);continue;}
        const found=known(item.canonical,item.providerId,item.point);
        if(!found){const id=item.canonical+':'+item.point.map(n=>n.toFixed(3)).join(':'),entry={...item,id,matches};records.set(id,entry);remember(entry);}
        else{
          if(importance[item.kind]>importance[found.kind]){found.kind=item.kind;found.matches=index.match(found.point,item.kind);}
          if(item.english&&!found.english){found.name=item.name;found.english=true;}
        }
      }
      while(rejected.size>1024)rejected.delete(rejected.keys().next().value);
      const proximity=e=>Math.min(...e.matches.map(m=>Math.abs(m.distance-distance)));
      const keep=[...records.values()].filter(e=>proximity(e)<=160000).sort((a,b)=>proximity(a)-proximity(b)).slice(0,512),ids=new Set(keep.map(e=>e.id));
      for(const id of records.keys())if(!ids.has(id))records.delete(id);
      names.clear();providers.clear();for(const entry of records.values())remember(entry);
    }
    function window(distance){
      const entries=[...records.values()].map(({id,name,kind,point,matches})=>({id,name,kind,point,...matches.reduce((best,m)=>Math.abs(m.distance-distance)<Math.abs(best.distance-distance)?m:best,matches[0])}));
      const at=path.sample(distance),context=at.kind==='recorded'?'recorded':at.mode==='train'?'train':at.mode==='walk'?'estimated walk':'connection';
      const result=settlementWindow(entries,distance,at.point,currentId,context);currentId=result.currentId;return result;
    }
    return {add,window,reset:()=>{currentId=null;},status:()=>({entries:records.size,rejected:rejected.size,...index.status()})};
  }
  function create({canvas,flag,path,countries,map,landmarks,onPlace,onPlaces}){
    const ctx=canvas.getContext('2d'),atlas=document.createElement('canvas'),ink=atlas.getContext('2d');
    const width=240,height=148,points=path.pieces.flatMap(p=>[project(p.points[0]),project(p.points.at(-1))]);
    const bounds=points.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
    const scale=Math.min((width-40)/(bounds[2]-bounds[0]),(height-42)/(bounds[3]-bounds[1]));
    const xy=p=>[(p[0]-(bounds[0]+bounds[2])/2)*scale+width/2,(p[1]-(bounds[1]+bounds[3])/2)*scale+height/2];
    const at=ll=>xy(project(ll));
    const outlines=countries.map(country=>({...country,mini:country.rings.map(ring=>ring.map(xy))}));
    // Decimate only the inset drawing. Main route geometry and timing are untouched.
    const pieces=path.pieces.map(p=>({...p,mini:p.points.map((ll,i)=>({p:at(ll),d:p.start+p.distances[i]})).filter((v,i,a)=>!i||i===a.length-1||Math.hypot(v.p[0]-a[i-1].p[0],v.p[1]-a[i-1].p[1])>.08||i%12===0)}));
    const dpr=Math.min(2,devicePixelRatio||1);
    for(const c of [canvas,atlas]){c.width=width*dpr;c.height=height*dpr;}
    ctx.scale(dpr,dpr);ink.scale(dpr,dpr);
    function line(c,points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));}
    function drawAtlas(){
      ink.fillStyle='#edeedd';ink.fillRect(0,0,width,height);ink.setLineDash([]);
      outlines.forEach((country,i)=>{
        ink.fillStyle='#dce1cc';ink.strokeStyle='#8c9b7877';ink.lineWidth=.6;
        for(const ring of country.mini){line(ink,ring);ink.closePath();ink.fill();ink.stroke();}
      });
      ink.lineCap=ink.lineJoin='round';
      for(const p of pieces){ink.setLineDash(p.mode==='train'?[1.4,2.2]:[]);ink.strokeStyle=p.mode==='train'?'#ad967b':'#ac79629c';ink.lineWidth=1.25;line(ink,p.mini.map(v=>v.p));ink.stroke();}
      ink.setLineDash([]);ink.fillStyle='#536348';ink.font='9px Plex, monospace';
      const first=at(path.sample(0).point),last=at(path.sample(path.total).point);
      ink.fillText('Paris',first[0]-10,first[1]-9);ink.fillText('Sofia',last[0]-19,last[1]+15);
    }
    drawAtlas();
    let place=null,cached=[],lastScan=-Infinity,lastDraw=-Infinity,lastDistance=0,lastHeading=0,lastCountry='',destroyed=false,lastRefresh=-Infinity,refreshTimer=0,placesSignature='',lastPlaces=null;
    const settlements=onPlaces?settlementCache(path):null;
    function loadFlag(country){
      if(!flag)return;
      flag.hidden=!flags[country];
      if(flags[country]&&flag.dataset.country!==country){flag.dataset.country=country;flag.src='flags/'+flags[country]+'.svg';}
    }
    const fallback=landmarks.map(l=>({properties:{name:l.place,class:'city'},geometry:{type:'Point',coordinates:l.point}}));
    function refresh(){
      if(destroyed||!map.isStyleLoaded())return;
      const wait=1000-(performance.now()-lastRefresh);
      if(wait>0){if(!refreshTimer)refreshTimer=setTimeout(()=>{refreshTimer=0;refresh();},wait);return;}
      lastRefresh=performance.now();
      // Materialise each point once. MapLibre's feature geometry is a lazy
      // decoder; reading it again for every moving frame creates avoidable work.
      cached=map.querySourceFeatures('openmaptiles',{sourceLayer:'place'}).map(f=>({id:f.id,properties:f.properties,geometry:f.geometry}));lastScan=-Infinity;
      settlements?.add(cached,lastDistance);
      updatePlaces(lastDistance);
    }
    function updatePlaces(distance){
      if(Math.abs(distance-lastScan)<90)return;lastScan=distance;
      const s=path.sample(distance);
      // Never announce passing through a town on an unrecorded visual connection.
      const next=s.kind==='recorded'?nearestPlace(cached.length?cached:fallback,s.point,place):null;
      if(next?.id!==place?.id){place=next;onPlace?.(place);}
      if(settlements){
        lastPlaces=settlements.window(distance);
        const signature=JSON.stringify([lastPlaces.currentId,lastPlaces.currentIndex,lastPlaces.context,lastPlaces.entries.map(e=>[e.id,e.name,e.kind,e.state,e.distance])]);
        if(signature!==placesSignature){placesSignature=signature;onPlaces(lastPlaces);}
      }
    }
    function update(distance,heading,force=false,country=lastCountry){
      lastDistance=distance;lastHeading=heading;lastCountry=country;updatePlaces(distance);
      loadFlag(country);
      const now=performance.now();if(!force&&now-lastDraw<100)return;lastDraw=now;
      ctx.clearRect(0,0,width,height);ctx.drawImage(atlas,0,0,width,height);ctx.lineCap=ctx.lineJoin='round';
      for(const p of pieces){
        if(p.start>distance)break;
        const passed=p.mini.filter(v=>v.d<=distance).map(v=>v.p);
        if(distance<p.end)passed.push(at(path.sample(distance).point));
        line(ctx,passed);ctx.setLineDash(p.mode==='train'?[1.4,2.2]:[]);ctx.strokeStyle=p.mode==='train'?'#b78e61':'#a33443';ctx.lineWidth=1.8;ctx.stroke();
      }
      ctx.setLineDash([]);const p=at(path.sample(distance).point);ctx.save();ctx.translate(...p);
      ctx.scale(.72,.72);
      ctx.rotate(heading*Math.PI/180);
      ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(4.5,4.5);ctx.lineTo(0,2.5);ctx.lineTo(-4.5,4.5);ctx.closePath();ctx.strokeStyle='#fff9e9';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='#a33443';ctx.fill();ctx.restore();
    }
    map.on('idle',refresh);update(0,0,true);
    return {update,refresh,resetPlace:()=>{place=null;lastScan=-Infinity;placesSignature='';settlements?.reset();},status:()=>({place:place?.name||null,places:lastPlaces,placeCache:settlements?.status(),point:path.sample(lastDistance).point,heading:lastHeading,country:lastCountry,flag:flags[lastCountry]||null,flagReady:!!flag?.complete&&!!flag?.naturalWidth}),destroy:()=>{destroyed=true;clearTimeout(refreshTimer);map.off('idle',refresh);}};
  }
  const api={create,nearestPlace,routePlaceIndex,settlementWindow,settlementCache,flags,project,metres};
  if(typeof module!=='undefined')module.exports=api;host.TrekWayfinding=api;
})(typeof window==='undefined'?globalThis:window);
