/* A camera rail separate from the recorded path: anticipate bends, then glide. */
(function(host){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const angle=(a,b)=>((b-a+180)%360+360)%360-180;
  const bearing=(a,b)=>Math.atan2((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1])*180/Math.PI;
  const ahead=(p,heading,distance)=>[p[0]+Math.sin(heading*Math.PI/180)*distance/(111195*Math.cos(p[1]*Math.PI/180)),p[1]+Math.cos(heading*Math.PI/180)*distance/111195];
  const metres=(a,b)=>111195*Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1]);
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  function pointAt(path,distance){
    const weights=[1,4,6,4,1],point=[0,0];
    for(let i=0;i<weights.length;i++){
      const p=path.sample(distance+(i-2)*220).point;
      point[0]+=p[0]*weights[i]/16;point[1]+=p[1]*weights[i]/16;
    }
    return point;
  }
  function headingAt(path,distance){
    // Follow the valley's overall direction instead of each short switchback.
    // Keep the eye's tighter rail so the recorded path stays close by.
    const a=pointAt(path,distance-1125),b=pointAt(path,distance+3375);
    return bearing(a,b);
  }
  function terrainFrame(path,distance,heightAt){
    // The cached, fixed-resolution profile is independent of visible DEM tile
    // changes. A one-frame tile seam must never become a camera lift or zoom.
    const ground=(heightAt(distance-100)+2*heightAt(distance)+heightAt(distance+100))/4;
    const heights=[ground,...[-2200,-1000,350,800,1400,2200,3200].map(offset=>heightAt(distance+offset))];
    let winding=0;
    for(const [offset,weight] of [[-500,.25],[250,.5],[1000,.25]]){
      const start=clamp(distance+offset-500,0,path.total),end=clamp(distance+offset+1800,0,path.total);
      const direct=end-start>1?metres(pointAt(path,start),pointAt(path,end))/(end-start):1;
      winding+=smooth((.94-direct)/.6)*weight;
    }
    const lift=1100*winding;
    return {ground,lookHeight:heightAt(distance+1400),height:Math.max(...heights)+850+lift,lift,winding,lookAhead:1400-650*winding};
  }
  function routeFrame(path,distance,heightAt,heading,pitch,viewport,winding=0){
    // Fit the nearby route in the actual viewing window, including the space
    // occupied by the timeline. A loop widens this frame without steering into
    // each zigzag. Work in metres; terrain samples keep steep paths in the fit.
    const origin=pointAt(path,distance),radians=heading*Math.PI/180,s=Math.sin(radians),c=Math.cos(radians);
    const samples=Array.from({length:13},(_,i)=>{
      const d=clamp(distance-200-300*winding+i*(1400+1300*winding)/12,0,path.total),point=path.sample(d).point;
      const x=(point[0]-origin[0])*111195*Math.cos(origin[1]*Math.PI/180),y=(point[1]-origin[1])*111195;
      return {point,height:heightAt(d),side:x*c-y*s,forward:x*s+y*c};
    });
    const bounds=key=>[Math.min(...samples.map(p=>p[key])),Math.max(...samples.map(p=>p[key]))];
    const side=bounds('side').reduce((a,b)=>a+b)/2,forward=bounds('forward').reduce((a,b)=>a+b)/2;
    const focus=[origin[0]+(side*c+forward*s)/(111195*Math.cos(origin[1]*Math.PI/180)),origin[1]+(-side*s+forward*c)/111195];
    const base=heightAt(distance),a=pitch*Math.PI/180,sa=Math.sin(a),ca=Math.cos(a);
    const tan=Math.tan((viewport.width<viewport.height?55:38)*Math.PI/360),aspect=viewport.width/viewport.height;
    const top=1-2*viewport.top/viewport.height,bottom=2*viewport.bottom/viewport.height-1;
    const centre=(top+bottom)/2,bias=centre*tan/(ca*(ca-centre*tan*sa));
    const depth=1/ca+bias*sa,right=Math.max(.45,1-48/viewport.width)*tan*aspect;
    let clearance=850;
    for(const p of samples){
      const f=p.forward-forward,h=p.height-base,z=f*sa-h*ca,u=f*ca+h*sa;
      clearance=Math.max(clearance,(Math.abs(p.side-side)/right-z)/depth,
        (u-top*tan*z)/(top*tan*depth-bias*ca),
        (bottom*tan*z-u)/(bias*ca-bottom*tan*depth));
    }
    return {focus,base,clearance:clearance*1.12,bias,samples};
  }
  function rise(current,velocity,wanted,dt){
    if(current===null)return {height:wanted,velocity:0};
    const error=wanted-current;
    if(Math.abs(error)<.05&&Math.abs(velocity)<.05)return {height:wanted,velocity:0};
    // Ease vertical acceleration too, and release height slowly after a ridge.
    const frequency=error>0?1.25:.65;
    const acceleration=clamp(error*frequency*frequency-2*frequency*velocity,-65,65);
    velocity=clamp(velocity+acceleration*dt,-110,180);
    return {height:current+velocity*dt,velocity};
  }
  function landmarkFrame(landmarks,point,heading){
    const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
    let chosen=null;
    for(const item of landmarks){
      const distance=111195*Math.hypot((item.point[0]-point[0])*Math.cos((item.point[1]+point[1])*Math.PI/360),item.point[1]-point[1]);
      const delta=angle(heading,bearing(point,item.point));
      if(distance>3300||Math.abs(delta)>120)continue;
      const strength=smooth((3300-distance)/1300)*(1-smooth((Math.abs(delta)-50)/70));
      if(strength<.015||chosen&&chosen.strength>=strength)continue;
      chosen={id:item.id,strength,heading:heading+clamp(delta,-42,42)*.85*strength,lift:360*strength,lookAhead:1100+(clamp(distance*.9,550,1500)-1100)*strength};
    }
    return chosen;
  }
  function turn(current,velocity,wanted,dt){
    if(current===null)return {heading:wanted,velocity:0};
    const error=angle(current,wanted);
    if(Math.abs(error)<.015&&Math.abs(velocity)<.02)return {heading:wanted,velocity:0};
    // Damping brakes the turn as the view aligns, without hunting left/right.
    const acceleration=clamp(error*1.44-velocity*2.4,-6,6);
    velocity=clamp(velocity+acceleration*dt,-12,12);
    return {heading:current+velocity*dt,velocity};
  }
  function speedLimit(path,distance,pace,heading){
    const a=headingAt(path,distance);let previous=a,curvature=0;
    const step=Math.max(180,Math.min(1200,pace*.22));
    for(const offset of [step,step*2,step*3,step*4]){
      const next=headingAt(path,distance+offset);
      curvature=Math.max(curvature,Math.abs(angle(previous,next))/step);previous=next;
    }
    // Brake before a bend, leaving room below the camera's maximum turn rate.
    const corner=curvature>0?Math.min(pace,9/curvature):pace;
    const alignment=heading===null?1:clamp(1-Math.abs(angle(heading,a))/60,.16,1);
    return Math.max(35,corner*alignment);
  }
  const api={pointAt,headingAt,terrainFrame,routeFrame,rise,landmarkFrame,turn,speedLimit,ahead};
  if(typeof module!=='undefined')module.exports=api;else host.TrekCamera=api;
})(typeof window==='undefined'?globalThis:window);
