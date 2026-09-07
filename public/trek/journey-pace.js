/* Automatic presentation pace from the existing terrain and public map context. */
(function(host){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  const project=([lon,lat])=>[6378137*lon*Math.PI/180,-6378137*Math.asinh(Math.tan(lat*Math.PI/180))];
  const metres=(a,b)=>111195*Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1]);
  function inRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function segmentDistance(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],t=clamp(((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1),0,1);return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);}
  function geometry(feature,kind){
    const g=feature.geometry;if(!g)return null;
    const polygon=g.type==='Polygon'||g.type==='MultiPolygon';
    const groups=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:g.type==='LineString'?[[g.coordinates]]:g.type==='MultiLineString'?[g.coordinates]:[];
    const parts=groups.map(part=>part.map(ring=>ring.map(project))),points=parts.flat(2);if(!points.length)return null;
    const bounds=points.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
    return {kind,polygon,parts,bounds};
  }
  function near(shape,p,radius){
    const b=shape.bounds;if(p[0]<b[0]-radius||p[0]>b[2]+radius||p[1]<b[1]-radius||p[1]>b[3]+radius)return false;
    for(const rings of shape.parts){
      if(shape.polygon&&inRing(p,rings[0])&&!rings.slice(1).some(r=>inRing(p,r)))return true;
      for(const ring of rings)for(let i=1;i<ring.length;i++)if(segmentDistance(p,ring[i-1],ring[i])<=radius)return true;
    }
    return false;
  }
  function context(features){
    const places=new Map(),shapes=[];
    for(const f of features){
      const props=f.properties||{},kind=props.class||props.place,layer=f.sourceLayer||f.layer?.['source-layer'];
      if(f.geometry?.type==='Point'&&['city','town','village','hamlet'].includes(kind)){
        const point=f.geometry.coordinates;places.set(kind+':'+point.map(n=>n.toFixed(4)).join(':'),{kind,point});
      }else{
        const use=layer==='landuse'&&kind==='residential'?'town':layer==='landcover'&&kind==='wood'?'woodland':layer==='water'||layer==='waterway'&&kind==='river'?'water':null;
        if(use&&props.brunnel!=='tunnel'){const item=geometry(f,use);if(item)shapes.push(item);}
      }
    }
    return {places:[...places.values()],shapes};
  }
  function terrain(heightAt,distance){
    const heights=Array.from({length:13},(_,i)=>heightAt(distance-1800+i*300)).filter(Number.isFinite);
    if(!heights.length)return {strength:0,height:0,relief:0};
    const height=heightAt(distance),relief=Math.max(...heights)-Math.min(...heights);
    return {strength:Math.max(smooth((height-700)/1100),smooth((relief-140)/520)),height,relief};
  }
  function scene(point,mountain,features,landmarks=[]){
    let cap=7200,reason='open country';const scores={mountain:mountain.strength,settlement:0,water:0,woodland:0,landmark:0};
    const limit=(speed,label)=>{if(speed<cap){cap=speed;reason=label;}};
    // Reciprocal blending gives a mountain foothill a useful slowdown without
    // keeping the same low pace across an entire country or numbered day.
    limit(1/(1/7200+mountain.strength*(1/280-1/7200)),'mountains');
    const radii={city:3200,town:1900,village:850,hamlet:420};
    for(const place of features.places){
      const strength=1-smooth((metres(point,place.point)-radii[place.kind]*.3)/(radii[place.kind]*.7));
      scores.settlement=Math.max(scores.settlement,strength);
      limit(1/(1/7200+strength*(1/(place.kind==='city'?220:place.kind==='town'?300:500)-1/7200)),place.kind==='city'?'city':place.kind==='town'?'town':'village');
    }
    const p=project(point),scale=1/Math.cos(point[1]*Math.PI/180);
    for(const shape of features.shapes){
      const radius=(shape.kind==='water'?260:shape.kind==='woodland'?110:100)*scale;
      if(!near(shape,p,radius))continue;
      const kind=shape.kind==='town'?'settlement':shape.kind;scores[kind]=1;
      limit(shape.kind==='town'?340:shape.kind==='water'?650:1100,shape.kind==='water'?'waterside':shape.kind==='town'?'town':'woodland');
    }
    for(const landmark of landmarks){
      const strength=1-smooth((metres(point,landmark.point)-350)/1500);scores.landmark=Math.max(scores.landmark,strength);
      limit(1/(1/7200+strength*(1/150-1/7200)),'landmark');
    }
    return {cap,reason,scores};
  }
  function advance(speed,wanted,dt){
    // Gentle acceleration out of quiet sections and firmer, bounded braking.
    const change=(wanted-speed)*(1-Math.exp(-dt/(wanted<speed ? .65 : 2.8)));
    return Math.max(0,speed+clamp(change,-1500*dt,650*dt));
  }
  function create({map,path,heightAt,landmarks=[]}){
    let features={places:[],shapes:[]},dirty=true,revision=0,lastRefresh=-Infinity,lastUpdate=-Infinity,current=null,timer=null,removed=false;
    const samples=new Map(),mountains=new Map();
    function schedule(){
      if(removed||timer!==null)return;
      timer=setTimeout(()=>{timer=null;refresh(performance.now());},Math.ceil(Math.max(0,1200-(performance.now()-lastRefresh))));
    }
    function changed(e){if(e.sourceId==='openmaptiles'){dirty=true;schedule();}}
    map.on('sourcedata',changed);
    function refresh(now){
      if(!dirty||removed)return;
      if(now-lastRefresh<1200){schedule();return;}
      lastRefresh=now;dirty=false;
      const found=[];
      for(const [layer,filter] of [['place',['match',['get','class'],['city','town','village','hamlet'],true,false]],['landuse',['==',['get','class'],'residential']],['landcover',['==',['get','class'],'wood']],['water',null],['waterway',['==',['get','class'],'river']]]){
        for(const f of map.querySourceFeatures('openmaptiles',{sourceLayer:layer,...(filter?{filter}:{})}))found.push({properties:f.properties,geometry:f.geometry,sourceLayer:layer});
      }
      // Retain the last coherent neighbourhood during a partial tile arrival.
      if(found.length){features=context(found);revision++;samples.clear();lastUpdate=-Infinity;}else{dirty=true;schedule();}
    }
    function at(distance){
      distance=clamp(distance,0,path.total);const cell=Math.round(distance/180),key=cell+':'+revision;
      if(samples.has(key))return samples.get(key);
      const d=clamp(cell*180,0,path.total);
      if(!mountains.has(cell))mountains.set(cell,terrain(heightAt,d));
      const position=path.sample(d),result=scene(position.point,mountains.get(cell),features,landmarks);
      if(position.mode==='boat'&&result.cap>280){result.cap=280;result.reason='boat crossing';}
      samples.set(key,result);
      if(samples.size>128)samples.delete(samples.keys().next().value);
      if(mountains.size>512)mountains.delete(mountains.keys().next().value);
      return result;
    }
    function update(distance,force=false){
      const now=performance.now();
      if(!force&&current&&now-lastUpdate<240)return current;
      lastUpdate=now;
      const here=at(distance);let cap=here.cap,reason=here.reason,anticipating=false;
      // Anticipate the next interesting section and brake before reaching it.
      // Limit speed to what can decelerate to that section's viewing pace.
      for(const offset of [450,1000,2000,3500,5500,8000]){
        const next=at(distance+offset),approach=Math.sqrt(next.cap*next.cap+2*650*offset);
        if(approach<cap){cap=approach;reason=next.reason;anticipating=true;}
      }
      if(!map.areTilesLoaded()&&cap>1400){cap=1400;reason='preparing scenery';}
      current={target:cap,reason,anticipating,scores:here.scores,places:features.places.length,shapes:features.shapes.length};return current;
    }
    const destroy=()=>{removed=true;clearTimeout(timer);map.off('sourcedata',changed);map.off('remove',destroy);};map.on('remove',destroy);schedule();
    return {update,status:()=>current,destroy};
  }
  const api={context,near,terrain,scene,advance,create};if(typeof module!=='undefined')module.exports=api;else host.TrekPace=api;
})(typeof window==='undefined'?globalThis:window);
