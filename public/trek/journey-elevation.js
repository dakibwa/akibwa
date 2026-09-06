/* Whole-journey terrain profile. Connections stay visibly unmeasured. */
(function(host){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function sample(profile,distance){
    let lo=0,hi=profile.pieces.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(profile.pieces[mid].end<distance)lo=mid+1;else hi=mid;}
    const piece=profile.pieces[lo],points=piece.samples;
    if(piece.kind!=='recorded'||!points.length)return null;
    lo=1;hi=points.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(points[mid][0]<distance)lo=mid+1;else hi=mid;}
    const a=points[Math.max(0,lo-1)],b=points[lo],t=clamp((distance-a[0])/(b[0]-a[0]||1),0,1);
    return Math.round(a[1]+(b[1]-a[1])*t);
  }
  function create({profile,canvas,label}){
    const ctx=canvas.getContext('2d'),base=document.createElement('canvas');
    let width=0,height=0,dpr=1,last=0,position=0,current=null,draws=0;
    const ceiling=Math.ceil(profile.max/500)*500;
    const y=h=>height-6-clamp(h/ceiling,0,1)*(height-19);
    function line(c,p){c.beginPath();p.samples.forEach(([d,h],i)=>{const x=d/profile.total*width;i?c.lineTo(x,y(h)):c.moveTo(x,y(h));});}
    function resize(){
      const r=canvas.getBoundingClientRect();if(!r.width)return false;
      if(r.width===width&&r.height===height&&dpr===Math.min(devicePixelRatio||1,2))return true;
      width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);
      for(const c of [canvas,base]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
      const c=base.getContext('2d');c.scale(dpr,dpr);c.lineWidth=1;
      c.strokeStyle='#58684925';c.setLineDash([2,4]);
      for(const h of [0,ceiling]){c.beginPath();c.moveTo(0,y(h));c.lineTo(width,y(h));c.stroke();}
      c.font='8px Plex,monospace';c.fillStyle='#526044';c.fillText(ceiling.toLocaleString('en-GB')+' m',1,9);
      c.setLineDash([]);
      for(const p of profile.pieces){
        if(!p.samples.length){c.setLineDash([2,4]);c.strokeStyle='#967c575e';c.beginPath();c.moveTo(p.start/profile.total*width,height-6);c.lineTo(p.end/profile.total*width,height-6);c.stroke();c.setLineDash([]);continue;}
        line(c,p);c.lineTo(p.end/profile.total*width,height-6);c.lineTo(p.start/profile.total*width,height-6);c.closePath();c.fillStyle='#6d825d45';c.fill();
        line(c,p);c.strokeStyle='#536b41ee';c.stroke();
      }
      return true;
    }
    function update(distance,force=false){
      position=distance;const time=performance.now();if(!force&&time-last<90)return;last=time;
      if(!resize())return;draws++;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(base,0,0,width,height);
      const x=clamp(distance/profile.total,0,1)*width;
      ctx.save();ctx.beginPath();ctx.rect(0,0,x,height);ctx.clip();ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#ab6f3645';ctx.fillRect(0,0,width,height);ctx.restore();
      current=sample(profile,distance);ctx.strokeStyle='#a35731';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,13);ctx.lineTo(x,height-3);ctx.stroke();
      if(current!==null){ctx.beginPath();ctx.arc(x,y(current),3,0,Math.PI*2);ctx.fillStyle='#a35731';ctx.fill();}
      const text=current===null?'Connection · no recorded path':'Elevation ≈ '+current.toLocaleString('en-GB')+' m';
      if(label.textContent!==text)label.textContent=text;
      canvas.setAttribute('aria-label','Terrain elevation from Paris to Sofia, up to '+ceiling+' metres. '+text+'.');
    }
    const observer=new ResizeObserver(()=>update(position,true));observer.observe(canvas);
    return {update,status:()=>({ready:true,metres:current,position,draws,samples:profile.pieces.reduce((n,p)=>n+p.samples.length,0)}),destroy:()=>observer.disconnect()};
  }
  const api={sample,create};if(typeof module!=='undefined')module.exports=api;else host.TrekElevation=api;
})(typeof window==='undefined'?globalThis:window);
