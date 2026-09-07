/* An illustrative paper train, anchored to the mapped railway rather than the camera. */
(function(host){
  'use strict';
  const WORLD=40075016.68557849,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const project=([lon,lat])=>[WORLD*(lon/360+.5),WORLD*(.5-Math.asinh(Math.tan(lat*Math.PI/180))/(2*Math.PI))];
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const colors={body:rgb('#f5efd9'),roof:rgb('#ae434b'),red:rgb('#aa3f47'),glass:rgb('#384f4b'),frame:rgb('#757c68'),wheel:rgb('#343f37'),lamp:rgb('#fff3ba')};
  function pose(path,distance){
    const rail=path.pieces.find(p=>p.mode==='train'&&distance>=p.railStart&&distance<=p.railEnd);
    if(!rail)return {active:false,cars:[],opacity:0};
    const cars=[];
    for(let i=0;i<3;i++){
      const d=distance-i*70;if(d<rail.railStart+29||d>rail.railEnd-29)continue;
      const structure=rail.structures.find(s=>d>=s.start&&d<=s.end);
      if(structure?.type==='tunnel')continue;
      const p=path.sample(d).point,a=path.sample(d-24).point,b=path.sample(d+24).point;
      const pa=project(a),pb=project(b),length=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]);
      cars.push({index:i,distance:d,point:p,forward:length?[(pb[0]-pa[0])/length,(pb[1]-pa[1])/length]:[0,-1],structure:structure||null});
    }
    return {active:true,cars,opacity:clamp(Math.min((distance-rail.railStart)/160,(rail.railEnd-distance)/160),0,1),from:rail.railStart,to:rail.railEnd};
  }
  function mesh(cars,heightAt,origin){
    const vertices=[];
    for(const car of cars){
      const p=project(car.point),scale=1/Math.cos(car.point[1]*Math.PI/180),[fx,fy]=car.forward,ground=heightAt(car);
      const vertex=([x,y,z])=>[p[0]-origin[0]+(fx*x-fy*y)*scale,p[1]-origin[1]+(fy*x+fx*y)*scale,(ground+z)*scale];
      function face(points,color,light=1){
        for(let i=1;i<points.length-1;i++)for(const v of [points[0],points[i],points[i+1]])vertices.push(...vertex(v),...color.map(c=>Math.min(1,c*light)));
      }
      function box(x1,y1,z1,x2,y2,z2,color){
        face([[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]],color,1.06);
        face([[x1,y1,z1],[x1,y1,z2],[x2,y1,z2],[x2,y1,z1]],color,.9);
        face([[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]],color,.72);
        face([[x1,y1,z1],[x1,y2,z1],[x1,y2,z2],[x1,y1,z2]],color,.82);
        face([[x2,y1,z1],[x2,y1,z2],[x2,y2,z2],[x2,y2,z1]],color,.96);
      }
      // Three little coaches with bevelled paper roofs, glazing, doors and bogies.
      box(-30,-6,3,30,6,6,colors.frame);box(-29,-7,6,29,7,18,colors.body);
      box(-29,-7.08,7,29,7.08,10,colors.red);
      face([[-29,-7,18],[29,-7,18],[26,-4.5,22],[-26,-4.5,22]],colors.roof,.88);
      face([[-29,7,18],[-26,4.5,22],[26,4.5,22],[29,7,18]],colors.roof,.75);
      face([[-26,-4.5,22],[26,-4.5,22],[26,4.5,22],[-26,4.5,22]],colors.roof,1.05);
      face([[-29,-7,18],[-26,-4.5,22],[-26,4.5,22],[-29,7,18]],colors.roof,.82);
      face([[29,-7,18],[29,7,18],[26,4.5,22],[26,-4.5,22]],colors.roof,.98);
      box(-14,-2,22,14,2,23,colors.body);
      for(const side of [-1,1]){
        const y=side*7.13;
        for(let x=-22;x<=18;x+=10)face([[x,y,12],[x+7,y,12],[x+7,y,16.5],[x,y,16.5]],colors.glass,side<0?1:.8);
        face([[-4,y,6],[-.8,y,6],[-.8,y,17],[-4,y,17]],colors.frame,.8);
        face([[.8,y,6],[4,y,6],[4,y,17],[.8,y,17]],colors.frame,.8);
        for(const x of [-19,19])box(x-4,side<0?-6.9:5,1,x+4,side<0?-5:6.9,5.5,colors.wheel);
      }
      if(car.index===0){
        face([[29.12,-5,12],[29.12,5,12],[29.12,5,16.5],[29.12,-5,16.5]],colors.glass);
        for(const y of [-4.5,3])box(29.1,y,7.5,29.5,y+1.5,9,colors.lamp);
      }
      box(-34,-2,4,-30,2,6,colors.frame);
    }
    return new Float32Array(vertices);
  }
  function create(map,path,terrainHeight){
    let shader,buffer,vao,matrixLocation,opacityLocation,origin=[0,0],count=0,lastDistance=null,current={active:false,cars:[],opacity:0},failed=false,updates=0;
    function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
    function groundAt(d){const h=map.queryTerrainElevation(path.sample(d).point);return Number.isFinite(h)?h:terrainHeight(d);}
    function heightAt(car){
      const structure=car.structure;
      if(structure?.type==='bridge'){
        const a=groundAt(structure.start),b=groundAt(structure.end),t=(car.distance-structure.start)/(structure.end-structure.start||1);
        return a+(b-a)*t+2;
      }
      return groundAt(car.distance)+1;
    }
    const layer={id:'journey-train',type:'custom',renderingMode:'3d',
      onAdd(_,gl){
        try{
          const vertex=compile(gl,gl.VERTEX_SHADER,'#version 300 es\nprecision highp float; uniform mat4 u_matrix; in vec3 a_position; in vec3 a_color; out vec3 v_color; void main(){gl_Position=u_matrix*vec4(a_position,1.0);v_color=a_color;}');
          const fragment=compile(gl,gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float; uniform float u_opacity; in vec3 v_color; out vec4 fragColor; void main(){fragColor=vec4(v_color*u_opacity,u_opacity);}');
          shader=gl.createProgram();gl.attachShader(shader,vertex);gl.attachShader(shader,fragment);gl.linkProgram(shader);gl.deleteShader(vertex);gl.deleteShader(fragment);
          if(!gl.getProgramParameter(shader,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(shader));
          buffer=gl.createBuffer();vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
          for(const [name,offset] of [['a_position',0],['a_color',12]]){const location=gl.getAttribLocation(shader,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,offset);}
          gl.bindVertexArray(null);matrixLocation=gl.getUniformLocation(shader,'u_matrix');opacityLocation=gl.getUniformLocation(shader,'u_opacity');
        }catch(error){failed=true;}
      },
      render(gl,args){
        if(failed||!count||!current.opacity)return;
        const m=args.defaultProjectionData.mainMatrix,matrix=new Float32Array(16);
        for(let i=0;i<12;i++)matrix[i]=m[i]/WORLD;
        for(let i=0;i<4;i++)matrix[12+i]=m[i]*origin[0]/WORLD+m[4+i]*origin[1]/WORLD+m[12+i];
        gl.useProgram(shader);gl.bindVertexArray(vao);gl.uniformMatrix4fv(matrixLocation,false,matrix);gl.uniform1f(opacityLocation,current.opacity);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES,0,count);gl.bindVertexArray(null);
      },
      onRemove(_,gl){gl.deleteBuffer(buffer);gl.deleteProgram(shader);gl.deleteVertexArray(vao);}
    };
    map.addLayer(layer);
    function update(distance){
      if(failed||lastDistance!==null&&Math.abs(distance-lastDistance)<.05)return;
      lastDistance=distance;current=pose(path,distance);
      const wasVisible=count>0;count=0;
      if(current.cars.length&&current.opacity){
        origin=project(current.cars[0].point);
        const data=mesh(current.cars,heightAt,origin),gl=map.getCanvas().getContext('webgl2');
        if(!gl||gl.isContextLost())return;
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);count=data.length/6;updates++;
      }
      if(wasVisible||count)map.triggerRepaint();
    }
    return {update,status:()=>({active:current.active,failed,cars:current.cars.map(c=>({point:c.point,distance:c.distance,index:c.index})),vertices:count,opacity:current.opacity,updates,screen:current.cars.map(c=>{const p=map.project(c.point);return [p.x,p.y];})})};
  }
  const api={pose,mesh,create};if(typeof module!=='undefined')module.exports=api;else host.TrekTrain=api;
})(typeof window==='undefined'?globalThis:window);
