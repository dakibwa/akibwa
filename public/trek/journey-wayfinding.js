/* A small paper atlas and place names, driven by the existing journey clock. */
(function(host){
  'use strict';
  const R=6378137,project=([lng,lat])=>[R*lng*Math.PI/180,-R*Math.asinh(Math.tan(lat*Math.PI/180))];
  const flags={France:'🇫🇷',Germany:'🇩🇪',Austria:'🇦🇹',Slovenia:'🇸🇮',Croatia:'🇭🇷',Serbia:'🇷🇸',Bulgaria:'🇧🇬'};
  const metres=(a,b)=>111195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
  // Settlement centres are geographic context, not evidence of visiting a building.
  function nearestPlace(features,point,previous=null){
    const limits={city:2200,town:1350,village:750,hamlet:420},places=new Map();
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
  function create({canvas,path,countries,map,landmarks,onPlace}){
    const ctx=canvas.getContext('2d'),atlas=document.createElement('canvas'),ink=atlas.getContext('2d');
    const width=240,height=148,points=path.pieces.flatMap(p=>[project(p.points[0]),project(p.points.at(-1))]);
    const bounds=points.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
    const scale=Math.min((width-40)/(bounds[2]-bounds[0]),(height-42)/(bounds[3]-bounds[1]));
    const xy=p=>[(p[0]-(bounds[0]+bounds[2])/2)*scale+width/2,(p[1]-(bounds[1]+bounds[3])/2)*scale+height/2];
    const at=ll=>xy(project(ll));
    // Decimate only the inset drawing. Main route geometry and timing are untouched.
    const pieces=path.pieces.map(p=>({...p,mini:p.points.map((ll,i)=>({p:at(ll),d:p.start+p.distances[i]})).filter((v,i,a)=>!i||i===a.length-1||Math.hypot(v.p[0]-a[i-1].p[0],v.p[1]-a[i-1].p[1])>.08||i%12===0)}));
    const dpr=Math.min(2,devicePixelRatio||1);
    for(const c of [canvas,atlas]){c.width=width*dpr;c.height=height*dpr;}
    ctx.scale(dpr,dpr);ink.scale(dpr,dpr);
    function line(c,points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));}
    ink.fillStyle='#edeedd';ink.fillRect(0,0,width,height);
    countries.forEach((country,i)=>{
      ink.fillStyle=['#d4ddc1','#dce0c8','#cbd7b9','#e0dfc6'][i%4];ink.strokeStyle='#8c9b7877';ink.lineWidth=.6;
      for(const ring of country.rings){line(ink,ring.map(xy));ink.closePath();ink.fill();ink.stroke();}
    });
    ink.lineCap=ink.lineJoin='round';
    for(const p of pieces){ink.setLineDash(p.kind==='connection'?[1.4,2.2]:[]);ink.strokeStyle=p.kind==='connection'?'#ad967b':'#ac79629c';ink.lineWidth=1.25;line(ink,p.mini.map(v=>v.p));ink.stroke();}
    ink.setLineDash([]);ink.fillStyle='#536348';ink.font='9px Plex, monospace';
    const first=at(path.sample(0).point),last=at(path.sample(path.total).point);
    ink.fillText('Paris',first[0]-10,first[1]-9);ink.fillText('Sofia',last[0]-19,last[1]+15);
    ink.font='8px Plex, monospace';ink.fillText('N',width-16,17);ink.beginPath();ink.moveTo(width-13,23);ink.lineTo(width-13,33);ink.moveTo(width-16,26);ink.lineTo(width-13,23);ink.lineTo(width-10,26);ink.strokeStyle='#536348';ink.stroke();
    let place=null,cached=[],lastScan=-Infinity,lastDraw=-Infinity,lastDistance=0,lastHeading=0,destroyed=false;
    const fallback=landmarks.map(l=>({properties:{name:l.place,class:'city'},geometry:{type:'Point',coordinates:l.point}}));
    function refresh(){
      if(destroyed||!map.isStyleLoaded())return;
      cached=map.querySourceFeatures('openmaptiles',{sourceLayer:'place'});lastScan=-Infinity;
      updatePlaces(lastDistance);
    }
    function updatePlaces(distance){
      if(Math.abs(distance-lastScan)<90)return;lastScan=distance;
      const s=path.sample(distance);
      // Never announce passing through a town on an unrecorded visual connection.
      const next=s.kind==='recorded'?nearestPlace(cached.length?cached:fallback,s.point,place):null;
      if(next?.id!==place?.id){place=next;onPlace(place);}
    }
    function update(distance,heading,force=false){
      lastDistance=distance;lastHeading=heading;updatePlaces(distance);
      const now=performance.now();if(!force&&now-lastDraw<100)return;lastDraw=now;
      ctx.clearRect(0,0,width,height);ctx.drawImage(atlas,0,0,width,height);ctx.lineCap=ctx.lineJoin='round';
      for(const p of pieces){
        if(p.start>distance)break;
        const passed=p.mini.filter(v=>v.d<=distance).map(v=>v.p);
        if(distance<p.end)passed.push(at(path.sample(distance).point));
        line(ctx,passed);ctx.setLineDash(p.kind==='connection'?[1.4,2.2]:[]);ctx.strokeStyle=p.kind==='connection'?'#b78e61':'#bb5935';ctx.lineWidth=1.8;ctx.stroke();
      }
      ctx.setLineDash([]);const p=at(path.sample(distance).point);ctx.save();ctx.translate(...p);ctx.rotate(heading*Math.PI/180);
      ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(4.5,4.5);ctx.lineTo(0,2.5);ctx.lineTo(-4.5,4.5);ctx.closePath();ctx.strokeStyle='#fff9e9';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='#ae482a';ctx.fill();ctx.restore();
    }
    map.on('idle',refresh);update(0,0,true);
    return {update,refresh,resetPlace:()=>{place=null;lastScan=-Infinity;},status:()=>({place:place?.name||null,point:path.sample(lastDistance).point,heading:lastHeading}),destroy:()=>{destroyed=true;map.off('idle',refresh);}};
  }
  const api={create,nearestPlace,flags,project,metres};
  if(typeof module!=='undefined')module.exports=api;host.TrekWayfinding=api;
})(typeof window==='undefined'?globalThis:window);
