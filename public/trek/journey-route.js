/* Presentation geometry only. The approved recordings remain untouched. */
(function(host){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const point=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
  const metres=(a,b)=>111195*Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1]);
  const length=ps=>ps.slice(1).reduce((n,p,i)=>n+metres(ps[i],p),0);
  const headingDelta=(a,b)=>((b-a+180)%360+360)%360-180;
  const line=(ps,properties)=>({type:'Feature',properties,geometry:{type:'LineString',coordinates:ps}});
  const collection=features=>({type:'FeatureCollection',features});
  function rounded(ps){
    const out=[ps[0].slice()];
    for(let i=1;i<ps.length-1;i++){
      const a=ps[i-1],b=ps[i],c=ps[i+1],ab=metres(a,b),bc=metres(b,c);
      if(ab<1||bc<1){out.push(b.slice());continue;}
      // A bounded 18 m corner treatment, not an invented replacement trail.
      const cut=Math.min(18,ab*.24,bc*.24),enter=point(b,a,cut/ab),leave=point(b,c,cut/bc);
      out.push(enter);
      for(let j=1;j<=4;j++){const t=j/4;out.push(point(point(enter,b,t),point(b,leave,t),t));}
    }
    out.push(ps.at(-1).slice());return out;
  }
  function connection(previous,next){
    const a=previous.at(-1),b=next[0],gap=metres(a,b);
    const tail=previous[Math.max(0,previous.length-3)],head=next[Math.min(2,next.length-1)];
    const handle=Math.min(gap*.18,1500);
    const c=point(a,tail,-handle/Math.max(1,metres(a,tail)));
    const d=point(b,head,-handle/Math.max(1,metres(b,head)));
    const count=clamp(Math.ceil(gap/200),12,512),out=[];
    for(let i=0;i<=count;i++){
      const t=i/count,u=1-t;out.push([0,1].map(k=>u*u*u*a[k]+3*u*u*t*c[k]+3*u*t*t*d[k]+t*t*t*b[k]));
    }
    out[0]=a.slice();out[out.length-1]=b.slice();return out;
  }
  function buildJourneyPath(route,dayCount=67){
    const pieces=[],records=[],links=[],groups=[];let total=0;
    function add(ps,properties){
      const distances=[0];for(let i=1;i<ps.length;i++)distances.push(distances.at(-1)+metres(ps[i-1],ps[i]));
      const part={start:total,end:total+distances.at(-1),points:ps,distances,...properties};
      pieces.push(part);total=part.end;return part;
    }
    route.features.forEach((f,i)=>{
      const p=f.properties;
      if(i){const ps=connection(route.features[i-1].geometry.coordinates,f.geometry.coordinates);const properties={kind:'connection',day:p.day,fromDay:route.features[i-1].properties.throughDay};links.push(line(ps,properties));add(ps,properties);}
      const ps=rounded(f.geometry.coordinates),properties={...p,kind:'recorded'};
      records.push(line(ps,properties));const part=add(ps,properties);
      let group=groups.at(-1);if(!group||group.recording!==p.recording){group={...p,start:part.start,end:part.end};groups.push(group);}else group.end=part.end;
    });
    // Every day meets the next at the same distance. Missing days share the
    // connection to the next recording; the shared 16–17 split is approximate.
    const boundaries=Array(dayCount+1).fill(null);boundaries[0]=0;let lastDay=0,lastEnd=0;
    for(const g of groups){
      const missing=g.day-lastDay-1;
      for(let j=1;j<=missing;j++)boundaries[lastDay+j]=mix(lastEnd,g.start,j/missing);
      const from=boundaries[g.day-1]??lastEnd,count=g.throughDay-g.day+1;
      for(let j=1;j<=count;j++)boundaries[g.day+j-1]=mix(from,g.end,j/count);
      lastDay=g.throughDay;lastEnd=g.end;
    }
    for(let n=lastDay+1;n<=dayCount;n++)boundaries[n]=total;
    function sample(distance){
      distance=clamp(distance,0,total);let lo=0,hi=pieces.length-1;
      while(lo<hi){const m=(lo+hi)>>1;if(pieces[m].end<distance)lo=m+1;else hi=m;}
      const p=pieces[lo],offset=distance-p.start;let a=1,b=p.distances.length-1;
      while(a<b){const m=(a+b)>>1;if(p.distances[m]<offset)a=m+1;else b=m;}
      const span=p.distances[a]-p.distances[a-1],t=span?clamp((offset-p.distances[a-1])/span,0,1):0;
      return {point:point(p.points[a-1],p.points[a],t),kind:p.kind,day:p.day,distance};
    }
    function dayAt(distance){
      let n=1;while(n<dayCount&&distance>=boundaries[n])n++;
      const span=boundaries[n]-boundaries[n-1];return {day:n,t:span?clamp((distance-boundaries[n-1])/span,0,1):1};
    }
    return {total,pieces,boundaries,recorded:collection(records),connections:collection(links),sample,dayAt,
      dayDistance:(n,t=0)=>mix(boundaries[clamp(n,1,dayCount)-1],boundaries[clamp(n,1,dayCount)],clamp(t,0,1))};
  }
  const api={buildJourneyPath,metres,length,headingDelta};
  if(typeof module!=='undefined')module.exports=api;else host.TrekRoute=api;
})(typeof window==='undefined'?globalThis:window);
