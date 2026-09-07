/* A camera rail separate from the recorded path: anticipate bends, then glide. */
(function(host){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const angle=(a,b)=>((b-a+180)%360+360)%360-180;
  const bearing=(a,b)=>Math.atan2((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1])*180/Math.PI;
  const ahead=(p,heading,distance)=>[p[0]+Math.sin(heading*Math.PI/180)*distance/(111195*Math.cos(p[1]*Math.PI/180)),p[1]+Math.cos(heading*Math.PI/180)*distance/111195];
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
    const a=pointAt(path,distance-500),b=pointAt(path,distance+1800);
    return bearing(a,b);
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
    for(const offset of [180,360,540,720]){
      const next=headingAt(path,distance+offset);
      curvature=Math.max(curvature,Math.abs(angle(previous,next))/180);previous=next;
    }
    // Brake before a bend, leaving room below the camera's maximum turn rate.
    const corner=curvature>0?Math.min(pace,9/curvature):pace;
    const alignment=heading===null?1:clamp(1-Math.abs(angle(heading,a))/60,.16,1);
    return Math.max(35,corner*alignment);
  }
  const api={pointAt,headingAt,landmarkFrame,turn,speedLimit,ahead};
  if(typeof module!=='undefined')module.exports=api;else host.TrekCamera=api;
})(typeof window==='undefined'?globalThis:window);
