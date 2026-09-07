/* An illustrative paper passenger boat on the estimated Wörthersee crossing. */
(function(host){
  'use strict';
  const Train=typeof module!=='undefined'?require('./journey-train.js'):host.TrekTrain;
  const WORLD=40075016.68557849,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const project=([lon,lat])=>[WORLD*(lon/360+.5),WORLD*(.5-Math.asinh(Math.tan(lat*Math.PI/180))/(2*Math.PI))];
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const colors={hull:rgb('#315f6b'),cream:rgb('#fff4d9'),deck:rgb('#d7bd88'),glass:rgb('#385e67'),red:rgb('#b54b47'),wake:rgb('#c1dcce')};
  function pose(path,distance){
    const water=path.pieces.find(p=>p.mode==='boat'&&distance>=p.boatStart&&distance<=p.boatEnd);
    if(!water)return {active:false,cars:[],opacity:0};
    const start=water.boatStart+60,end=water.boatEnd-60;
    if(distance<start||distance>end)return {active:true,cars:[],opacity:0};
    const a=project(path.sample(distance-50).point),b=project(path.sample(distance+50).point),length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    return {active:true,opacity:clamp(Math.min((distance-start)/80,(end-distance)/80),0,1),from:water.boatStart,to:water.boatEnd,
      cars:[{index:0,distance,point:path.sample(distance).point,forward:length?[(b[0]-a[0])/length,(b[1]-a[1])/length]:[1,0],wake:clamp(distance-start,0,160),structure:{type:'water'}}]};
  }
  function mesh(boats,heightAt,origin){
    const vertices=[];
    for(const boat of boats){
      const p=project(boat.point),scale=1/Math.cos(boat.point[1]*Math.PI/180),[fx,fy]=boat.forward,ground=heightAt(boat);
      const vertex=([x,y,z])=>[p[0]-origin[0]+(fx*x-fy*y)*scale,p[1]-origin[1]+(fy*x+fx*y)*scale,(ground+z)*scale];
      function face(points,color,light=1){
        const ink=color.map(c=>Math.min(1,c*light));
        for(let i=1;i<points.length-1;i++)for(const v of [points[0],points[i],points[i+1]])vertices.push(...vertex(v),...ink);
      }
      function box(x1,y1,z1,x2,y2,z2,color){
        face([[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]],color,1.04);
        face([[x1,y1,z1],[x1,y1,z2],[x2,y1,z2],[x2,y1,z1]],color,.93);
        face([[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]],color,.8);
        face([[x1,y1,z1],[x1,y2,z1],[x1,y2,z2],[x1,y1,z2]],color,.86);
        face([[x2,y1,z1],[x2,y1,z2],[x2,y2,z2],[x2,y2,z1]],color,.96);
      }
      // A narrow paper wake, cut hull, two decks and a little wheelhouse.
      for(const side of [-1,1])face([[-36,side*9,.1],[-50-boat.wake,side*34,.1],[-48-boat.wake,side*27,.1],[-46,side*8,.1]],colors.wake);
      const rim=[[-47,-10],[-47,10],[32,12],[58,0],[32,-12]];
      face(rim.map(([x,y])=>[x,y,10]),colors.deck);
      for(let i=0;i<rim.length;i++){
        const a=rim[i],b=rim[(i+1)%rim.length];
        face([[a[0]*.94,a[1]*.7,1],[b[0]*.94,b[1]*.7,1],[...b,10],[...a,10]],colors.hull,i%2?.86:1);
      }
      box(-32,-9,10,32,9,22,colors.cream);box(-34,-10,22,35,10,24,colors.cream);
      box(15,-7,24,31,7,32,colors.cream);box(14,-8,32,33,8,33.5,colors.cream);
      face([[31.1,-6,26],[31.1,6,26],[31.1,6,30.5],[31.1,-6,30.5]],colors.glass);
      for(const side of [-1,1]){
        for(let x=-27;x<=22;x+=9)face([[x,side*9.1,14],[x+6,side*9.1,14],[x+6,side*9.1,20],[x,side*9.1,20]],colors.glass,side<0?1:.85);
        box(-30,side*9.6-.35,27,12,side*9.6+.35,27.6,colors.cream);
        for(let x=-29;x<=11;x+=10)box(x,side*9.6-.3,24,x+.6,side*9.6+.3,27,colors.cream);
        box(-18,side*9.6-.45,16,-14,side*9.6+.45,20,colors.red);
      }
      box(-10,-3,24,-3,3,33,colors.cream);box(-10.2,-3.2,30,-2.8,3.2,33,colors.red);
      box(35,-.45,10,35.8,.45,27,colors.cream);
    }
    return new Float32Array(vertices);
  }
  const create=(map,path,heightAt)=>Train.create(map,path,heightAt,{id:'journey-boat',pose,mesh});
  const api={pose,mesh,create};if(typeof module!=='undefined')module.exports=api;else host.TrekBoat=api;
})(typeof window==='undefined'?globalThis:window);
