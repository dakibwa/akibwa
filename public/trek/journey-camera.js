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
    const a=pointAt(path,distance-150),b=pointAt(path,distance+950);
    return bearing(a,b);
  }
  function turn(current,velocity,wanted,dt){
    if(current===null)return {heading:wanted,velocity:0};
    const error=angle(current,wanted),desired=clamp(error/.9,-9,9);
    if(Math.abs(error)<.015&&Math.abs(velocity)<.02)return {heading:wanted,velocity:0};
    velocity+=clamp(desired-velocity,-6*dt,6*dt);
    return {heading:current+velocity*dt,velocity};
  }
  function speedLimit(path,distance,pace,heading){
    const a=headingAt(path,distance);let previous=a,curvature=0;
    for(const offset of [180,360,540,720]){
      const next=headingAt(path,distance+offset);
      curvature=Math.max(curvature,Math.abs(angle(previous,next))/180);previous=next;
    }
    // Brake before a bend, leaving room below the camera's maximum turn rate.
    const corner=curvature>0?Math.min(pace,5.5/curvature):pace;
    const alignment=heading===null?1:clamp(1-Math.abs(angle(heading,a))/50,.08,1);
    return Math.max(20,corner*alignment);
  }
  const api={pointAt,headingAt,turn,speedLimit,ahead};
  if(typeof module!=='undefined')module.exports=api;else host.TrekCamera=api;
})(typeof window==='undefined'?globalThis:window);
