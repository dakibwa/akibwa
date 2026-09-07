/* Whole-journey mapped terrain. Presentation connections stay visibly distinct. */
(function(host){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function pieceAt(profile,distance){
    let lo=0,hi=profile.pieces.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(profile.pieces[mid].end<distance)lo=mid+1;else hi=mid;}
    return profile.pieces[lo];
  }
  function sample(profile,distance,rounded=true){
    const points=pieceAt(profile,distance).samples;
    if(!points.length)return null;
    let lo=1,hi=points.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(points[mid][0]<distance)lo=mid+1;else hi=mid;}
    const a=points[Math.max(0,lo-1)],b=points[lo],t=clamp((distance-a[0])/(b[0]-a[0]||1),0,1);
    // Labels use whole metres; the camera keeps continuous interpolation.
    const height=a[1]+(b[1]-a[1])*t;
    return rounded?Math.round(height):height;
  }
  // One equal-width segment per numbered day. The terrain and scrubber share
  // this axis; physical distance and measured walking totals stay separate.
  function progressAt(path,distance){
    if(distance>=path.total)return 1;
    const at=path.dayAt(distance);return (at.day-1+at.t)/(path.boundaries.length-1);
  }
  function distanceAt(path,progress){
    const count=path.boundaries.length-1,at=clamp(progress,0,1)*count;
    if(at>=count)return path.total;
    return path.dayDistance(Math.floor(at)+1,at%1);
  }
  function dayProfiles(profile,path,days){
    return days.map(day=>{
      const start=path.boundaries[day.n-1],end=path.boundaries[day.n],span=end-start,parts=[];
      if(span){
        for(const p of profile.pieces){
          const a=Math.max(start,p.start),b=Math.min(end,p.end);if(b<=a)continue;
          const points=[[a,sample(profile,a)],...p.samples.filter(([d])=>d>a&&d<b),[b,sample(profile,b)]];
          parts.push({kind:p.kind,points:points.map(([d,h])=>[(d-start)/span,h])});
        }
      }else parts.push({kind:'finish',points:[[0,sample(profile,end)],[1,sample(profile,end)]]});
      return {day:day.n,country:day.c,start,end,parts};
    });
  }
  function create({profile,path,days,colors,canvas,label}){
    const ctx=canvas.getContext('2d'),base=document.createElement('canvas'),passed=document.createElement('canvas');
    const segments=dayProfiles(profile,path,days);
    let width=0,height=0,dpr=1,last=0,position=0,current=null,kind=null,draws=0;
    const ceiling=Math.ceil(profile.max/500)*500;
    const y=h=>height-16-clamp((h||0)/ceiling,0,1)*(height-34);
    function line(c,points,left,step){c.beginPath();points.forEach(([t,h],i)=>{const x=left+t*step;i?c.lineTo(x,y(h)):c.moveTo(x,y(h));});}
    function drawProfile(c,complete){
      c.scale(dpr,dpr);c.lineWidth=1;
      const step=width/segments.length,gap=Math.min(1,step*.2);
      for(const segment of segments){
        const left=(segment.day-1)*step,color=colors[segment.country]||'#657a45';
        c.save();c.beginPath();c.rect(left+gap/2,0,step-gap,height-5);c.clip();
        for(const part of segment.parts){
          const connection=part.kind==='connection';
          line(c,part.points,left,step);c.lineTo(left+part.points.at(-1)[0]*step,height-6);c.lineTo(left+part.points[0][0]*step,height-6);c.closePath();
          c.globalAlpha=(complete ? .66 : .23)*(connection ? .65 : 1);c.fillStyle=color;c.fill();
          c.globalAlpha=complete ? .94 : .55;line(c,part.points,left,step);c.setLineDash(connection?[2,2]:[]);c.strokeStyle=color;c.stroke();c.setLineDash([]);
        }
        c.restore();
      }
      c.globalAlpha=1;c.strokeStyle='#58684925';c.setLineDash([2,4]);c.beginPath();c.moveTo(0,14);c.lineTo(width,14);c.stroke();c.setLineDash([]);
      c.font='8px Plex,monospace';c.fillStyle='#526044';c.fillText(ceiling.toLocaleString('en-GB')+' m',1,9);
    }
    function resize(){
      const r=canvas.getBoundingClientRect();if(!r.width)return false;
      if(r.width===width&&r.height===height&&dpr===Math.min(devicePixelRatio||1,2))return true;
      width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);
      for(const c of [canvas,base,passed]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
      drawProfile(base.getContext('2d'),false);drawProfile(passed.getContext('2d'),true);
      return true;
    }
    function update(distance,force=false){
      position=distance;const time=performance.now();if(!force&&time-last<90)return;last=time;
      if(!resize())return;draws++;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(base,0,0,width,height);
      const x=progressAt(path,distance)*width,handle=clamp(x,5,width-5);
      ctx.save();ctx.beginPath();ctx.rect(0,0,x,height);ctx.clip();ctx.drawImage(passed,0,0,width,height);ctx.restore();
      current=sample(profile,distance);kind=pieceAt(profile,distance).kind;ctx.strokeStyle='#a33443';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(handle,13);ctx.lineTo(handle,height-3);ctx.stroke();
      if(current!==null){ctx.beginPath();ctx.arc(handle,y(current),4.5,0,Math.PI*2);ctx.fillStyle='#a33443';ctx.fill();ctx.strokeStyle='#fff9e9';ctx.lineWidth=2;ctx.stroke();}
      const text=current===null?'Terrain unavailable':'≈ '+current.toLocaleString('en-GB')+' m'+(kind==='connection'?' · connection':'');
      if(label.textContent!==text)label.textContent=text;
      canvas.setAttribute('aria-label','Elevation across 67 days from Paris to Sofia, coloured by country, up to '+ceiling+' metres. '+text+'.');
    }
    const observer=new ResizeObserver(()=>update(position,true));observer.observe(canvas);
    return {update,status:()=>({ready:true,metres:current,kind,position,progress:progressAt(path,position),days:segments.length,draws,samples:profile.pieces.reduce((n,p)=>n+p.samples.length,0)}),destroy:()=>observer.disconnect()};
  }
  const api={sample,progressAt,distanceAt,dayProfiles,create};if(typeof module!=='undefined')module.exports=api;else host.TrekElevation=api;
})(typeof window==='undefined'?globalThis:window);
