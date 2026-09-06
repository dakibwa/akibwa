/* Small architectural paper models. Dimensions and details are illustrative. */
(function(host){
  'use strict';
  const TAU=Math.PI*2;
  function mesh(item){
    const triangles=[],wall=item.wall||'#e7d9b6',roof=item.roof||'#718577',trim='#f7ebcf',glass='#526e70',gold='#c7a358';
    const {width:w,length:l,height:h,tower:t}=item.model;
    const tri=(a,b,c,color)=>triangles.push({a,b,c,color});
    const quad=(a,b,c,d,color)=>{tri(a,b,c,color);tri(a,c,d,color);};
    function box(x,y,z,w,d,h,color=wall){
      const a=[x-w/2,y-d/2,z],b=[x+w/2,y-d/2,z],c=[x+w/2,y+d/2,z],e=[x-w/2,y+d/2,z],up=p=>[p[0],p[1],z+h];
      for(const [p,q] of [[a,b],[b,c],[c,e],[e,a]])quad(p,q,up(q),up(p),color);
      quad(up(a),up(b),up(c),up(e),color);
    }
    function gable(x,y,z,w,d,rise,color=roof){
      const a=[x-w/2,y-d/2,z],b=[x+w/2,y-d/2,z],c=[x+w/2,y+d/2,z],e=[x-w/2,y+d/2,z],u=[x,y-d/2,z+rise],v=[x,y+d/2,z+rise];
      quad(a,e,v,u,color);quad(b,u,v,c,color);tri(a,u,b,wall);tri(e,c,v,wall);
    }
    function round(x,y,z,r,height,color=roof,profile=[[0,1],[.35,1],[.75,.7],[1,0]]){
      const sides=12;
      for(let j=1;j<profile.length;j++)for(let i=0;i<sides;i++){
        const p=(band,n)=>[x+Math.cos(n/sides*TAU)*r*profile[band][1],y+Math.sin(n/sides*TAU)*r*profile[band][1],z+height*profile[band][0]];
        quad(p(j-1,i),p(j-1,i+1),p(j,i+1),p(j,i),color);
      }
    }
    function cross(x,y,z,size=3){box(x,y,z,.65,.65,size*2,trim);box(x,y,z+size*1.2,size,.65,.65,trim);}
    function windowAt(x,y,z,width,height,side=false){
      const point=(a,b)=>side?[x,y+a,z+b]:[x+a,y,z+b];
      quad(point(-width/2,0),point(width/2,0),point(width/2,height*.72),point(-width/2,height*.72),glass);
      tri(point(-width/2,height*.72),point(width/2,height*.72),point(0,height),glass);
      if(!side)box(x,y-.07,z+height*.42,.5,.3,height*.7,trim);
    }
    function rose(y,z,r){
      for(let i=0;i<16;i++){const a=i/16*TAU,b=(i+1)/16*TAU;tri([0,y,z],[Math.cos(a)*r,y,z+Math.sin(a)*r],[Math.cos(b)*r,y,z+Math.sin(b)*r],i%2?glass:'#ae956c');}
      box(0,y-.15,z-r,.65,.5,r*2,trim);box(0,y-.15,z,r*2,.5,.65,trim);
    }
    function tower(x,y,size,top,cap){
      const capHeight=cap==='spire'?top*.36:cap==='onion'?size*1.05:cap==='dome'?size*.7:2;
      const body=top-capHeight;box(x,y,0,size,size,body);box(x,y,body-3,size+1.2,size+1.2,2,trim);
      const openingHeight=Math.min(10,body*.45),openingBase=Math.max(2,body-openingHeight-5);
      for(const dx of [-.22,.22])windowAt(x+size*dx,y-size/2-.12,openingBase,size*.18,openingHeight);
      for(const side of [-1,1])windowAt(x+side*(size/2+.1),y,openingBase,size*.3,openingHeight,true);
      if(cap==='spire'){gable(x,y,body,size*1.12,size*1.12,capHeight,roof);round(x,y,body,size*.66,capHeight,roof,[[0,1],[1,0]]);}
      else if(cap==='onion')round(x,y,body,size*.61,capHeight,roof,[[0,.78],[.15,1],[.45,1],[.76,.65],[1,.05]]);
      else if(cap==='dome')round(x,y,body,size*.58,capHeight,roof,[[0,1],[.4,.95],[.75,.65],[1,0]]);
      else{for(const dx of [-.39,.39])for(const dy of [-.39,.39])box(x+dx*size,y+dy*size,body,2,2,4,trim);}
      cross(x,y,top,2.4);
    }
    // A narrow, stepped paper plinth and cornices give each building a grounded edge.
    box(0,0,0,w+4,l+4,1.5,'#c6bea1');
    if(item.kind==='palace'||item.kind==='castle'){
      if(item.kind==='palace'){
        box(0,0,1.5,w,l,h);gable(0,0,h+1.5,w,l,w*.13,roof);
        for(const x of [-w*.43,0,w*.43]){box(x,-l*.08,1.5,w*.14,l*1.12,h+2);gable(x,-l*.08,h+3.5,w*.16,l*1.17,6,roof);}
        for(let x=-w*.39;x<=w*.4;x+=7)for(let z=5;z<h-1;z+=6)windowAt(x,-l*.56-.1,z,2.8,4);
      }else{
        const wing=Math.min(w,l)*.24;
        for(const x of [-w/2+wing/2,w/2-wing/2]){box(x,0,1.5,wing,l,h);gable(x,0,h+1.5,wing,l,8,roof);}
        for(const y of [-l/2+wing/2,l/2-wing/2]){box(0,y,1.5,w,wing,h);gable(0,y,h+1.5,w,wing,8,roof);}
        tower(-w*.35,-l*.37,wing*1.25,h*1.45,'dome');
        for(let x=-w*.34;x<w*.4;x+=7)windowAt(x,-l/2-.15,h*.5,2.5,4);
      }
    }else if(item.kind==='orthodox'){
      box(0,0,1.5,w*.62,l,h*.58);box(0,0,1.5,w,l*.54,h*.58);
      round(0,0,h*.58,w*.28,h*.32,wall,[[0,1],[1,1]]);
      round(0,0,h*.9,w*.31,h*.45,item.gold?gold:roof,[[0,1],[.38,.93],[.72,.7],[1,0]]);cross(0,0,h*1.35,3.5);
      for(const x of [-w*.33,w*.33])for(const y of [-l*.3,l*.3]){
        box(x,y,0,w*.22,w*.22,h*.6);round(x,y,h*.6,w*.15,h*.25,roof,[[0,1],[.4,.92],[.8,.55],[1,0]]);cross(x,y,h*.85,2);
      }
      if(item.gold)tower(0,-l*.4,w*.24,t,'dome');
      for(const x of [-w*.2,0,w*.2])windowAt(x,-l/2-.1,3,w*.11,h*.37);
      for(const side of [-1,1])for(const y of [-l*.17,0,l*.17])windowAt(side*(w/2+.1),y,h*.16,4,h*.24,true);
    }else{
      box(0,0,1.5,w*.62,l,h);gable(0,0,h+1.5,w*.65,l+2,w*.36);
      for(const side of [-1,1]){
        box(side*w*.4,0,1.5,w*.2,l*.87,h*.57);gable(side*w*.4,0,h*.57+1.5,w*.24,l*.89,4);
        for(let y=-l*.33;y<l*.42;y+=Math.max(9,l/9)){
          box(side*w*.5,y,1.5,2.2,2.2,h*.68,trim);
          windowAt(side*(w*.51),y+3,h*.19,3,h*.29,true);
        }
      }
      const twin=['gothic-twin','onion-twin'].includes(item.kind),size=twin?w*.31:w*.38;
      for(const x of twin?[-w*.33,w*.33]:[0])tower(x,-l*.4,size,t,item.kind==='onion-twin'?'onion':item.kind==='gothic-twin'?'flat':'spire');
      if(twin)rose(-l/2-.15,h*.7,w*.12);
      for(const x of twin?[-w*.23,0,w*.23]:[-w*.25,w*.25])windowAt(x,-l/2-.2,2,w*.1,h*.3);
      if(item.kind==='gothic-twin'){box(0,l*.1,h,w*1.12,l*.19,h*.09);gable(0,l*.1,h*1.09,w*1.12,l*.2,8);}
    }
    const angle=(item.bearing||0)*Math.PI/180;
    const rotate=([x,y,z])=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle),z];
    return triangles.map(({a,b,c,color})=>({a:rotate(a),b:rotate(b),c:rotate(c),color}));
  }
  const api={mesh};if(typeof module!=='undefined')module.exports=api;host.TrekLandmarks=api;
})(typeof window==='undefined'?globalThis:window);
