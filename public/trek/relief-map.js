/* A small WebGL relief renderer. Geography and heights come only from the
   existing public Trek build. The SVG atlas remains the no-WebGL fallback. */
(function (host) {
  "use strict";
  const HEIGHT = 0.045;
  const mix = (a, b, t) => a + (b - a) * t;
  const rgb = (hex) => hex.replace("#", "").match(/../g).map(v => parseInt(v, 16) / 255);
  function fromAtlas(point, data) {
    const alt = point.alt || 0;
    return [point.x, alt, (point.y + alt * data.relief.atlasLift - data.vb[1] / 2) / data.relief.atlasTilt + data.vb[1] / 2];
  }
  function project(point, view) {
    const x = point[0] - view.x, y = point[1] * HEIGHT - view.alt, z = point[2] - view.z;
    const h = x * Math.cos(view.yaw) - z * Math.sin(view.yaw);
    const d = x * Math.sin(view.yaw) + z * Math.cos(view.yaw);
    return [h * 2 / view.width, (y * Math.cos(view.pitch) - d * Math.sin(view.pitch)) * 2 * view.aspect / view.width - .035];
  }
  function terrainGeometry(data) {
    const {cols, rows, points} = data;
    const vertices = [];
    const palette = [[0, rgb("#d7d7b5")], [400, rgb("#bbc399")], [1000, rgb("#96a57b")], [1850, rgb("#879277")], [2800, rgb("#ece6cf")]];
    function triangle(a,b,c) {
      const u=[b[0]-a[0],(b[1]-a[1])*HEIGHT,b[2]-a[2]],v=[c[0]-a[0],(c[1]-a[1])*HEIGHT,c[2]-a[2]];
      let normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if(normal[1]<0)normal=normal.map(x=>-x);
      const length=Math.hypot(...normal)||1;
      const light=.73+.27*Math.max(0,(-.45*normal[0]+.8*normal[1]-.38*normal[2])/length);
      const altitude=(a[1]+b[1]+c[1])/3;
      let color=palette[palette.length-1][1];
      for(let i=1;i<palette.length;i++)if(altitude<=palette[i][0]){
        const t=Math.max(0,(altitude-palette[i-1][0])/(palette[i][0]-palette[i-1][0]));
        color=palette[i][1].map((v,j)=>mix(palette[i-1][1][j],v,t));break;
      }
      for(const point of [a,b,c])vertices.push(...point,...color.map(c=>c*light));
    }
    for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){
      const a=points[r*cols+c],b=points[r*cols+c+1],d=points[(r+1)*cols+c],e=points[(r+1)*cols+c+1];
      triangle(a,b,e);triangle(a,e,d);
    }
    return new Float32Array(vertices);
  }
  // Exposed only to the owning Node geometry check, never as browser controls.
  if(typeof module!=="undefined")module.exports={fromAtlas,project,terrainGeometry,HEIGHT};
  if(typeof document==="undefined")return;

  host.createTrekRelief = function(data, options) {
    if(!data.relief)return null;
    const canvas=document.getElementById("relief-map"),labels=document.getElementById("relief-labels");
    const gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
    if(!gl)return null;
    let lost=false,view=null,lastState=null,enabled=true,yaw=-.12,pitch=.72;
    const resources=[];
    const transform=`
      uniform vec4 uView; uniform vec4 uOrbit;
      vec4 projected(vec3 p) {
        float x=p.x-uView.x, y=p.y*${HEIGHT}-uOrbit.z, z=p.z-uView.y;
        float h=x*cos(uOrbit.x)-z*sin(uOrbit.x);
        float d=x*sin(uOrbit.x)+z*cos(uOrbit.x);
        return vec4(h*2.0/uView.z,(y*cos(uOrbit.y)-d*sin(uOrbit.y))*2.0*uView.w/uView.z-.035,-(y*sin(uOrbit.y)+d*cos(uOrbit.y))/12000.0,1.0);
      }`;
    function program(vertex,fragment){
      const p=gl.createProgram();
      for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(p,shader);gl.deleteShader(shader);
      }
      gl.bindAttribLocation(p,0,"aPosition");gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const info=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw new Error("Relief shader could not be linked: "+info);}
      resources.push(["program",p]);return p;
    }
    let surface,line;
    try {
      surface=program(`attribute vec3 aPosition;attribute vec3 aColor;varying vec3 vColor;varying vec2 vMap;uniform lowp float uShadow;${transform}
        void main(){vec3 p=aPosition;if(uShadow>0.0){p.y=-500.0;p.x+=14.0;p.z+=20.0;}vMap=aPosition.xz;vColor=aColor;gl_Position=projected(p);}`,
        `precision highp float;varying vec3 vColor;varying vec2 vMap;uniform sampler2D uLand;uniform vec4 uBounds;uniform float uMask;uniform lowp float uShadow;
        void main(){float alpha=1.0;if(uMask>0.0){alpha=texture2D(uLand,(vMap-uBounds.xy)/uBounds.zw).a;if(alpha<.02)discard;}gl_FragColor=vec4(uShadow>0.0?vec3(.37,.39,.31):vColor,uShadow>0.0?alpha*.16:alpha);}`);
      line=program(`attribute vec3 aPosition;attribute vec3 aEnd;attribute vec3 aColor;attribute float aSide;varying vec3 vColor;uniform vec2 uPixels;uniform float uWidth;${transform}
        void main(){vec4 a=projected(aPosition),b=projected(aEnd);vec2 d=(b.xy-a.xy)*uPixels;vec2 n=vec2(-d.y,d.x)/max(1.0,length(d));a.xy+=n*aSide*uWidth/uPixels;gl_Position=a;vColor=aColor;}`,
        `precision highp float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}`);
    }catch(error){console.warn(error);for(const [kind,r] of resources)if(kind==="program")gl.deleteProgram(r);return null;}
    function locs(p,names){return Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]));}
    const su=locs(surface,["uView","uOrbit","uShadow","uLand","uBounds","uMask"]),lu=locs(line,["uView","uOrbit","uPixels","uWidth"]);
    const sc=gl.getAttribLocation(surface,"aColor"),le=gl.getAttribLocation(line,"aEnd"),lc=gl.getAttribLocation(line,"aColor"),ls=gl.getAttribLocation(line,"aSide");
    function buffer(values){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);resources.push(["buffer",b]);return {buffer:b,count:values.length};}
    const terrain=buffer(terrainGeometry(data.relief));
    const xs=data.relief.points.map(p=>p[0]),zs=data.relief.points.map(p=>p[2]);
    const bounds=[Math.min(...xs),Math.min(...zs),Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs)];
    const mask=document.createElement("canvas");mask.width=2048;mask.height=1024;
    const ctx=mask.getContext("2d");ctx.fillStyle="#fff";ctx.strokeStyle="#fff";ctx.lineWidth=1.25;
    for(const ring of data.relief.rings){ctx.beginPath();ring.forEach((p,i)=>ctx[i?"lineTo":"moveTo"]((p[0]-bounds[0])/bounds[2]*mask.width,(p[2]-bounds[1])/bounds[3]*mask.height));ctx.closePath();ctx.fill();ctx.stroke();}
    const texture=gl.createTexture();resources.push(["texture",texture]);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    function heightAt(x,z) {
      const {points,cols,rows}=data.relief;
      let row=0;while(row<rows-2 && points[(row+1)*cols][2]<z)row++;
      let col=Math.max(0,Math.min(cols-2,Math.floor((x-points[0][0])/(points[1][0]-points[0][0]))));
      const a=points[row*cols+col],b=points[row*cols+col+1],d=points[(row+1)*cols+col],e=points[(row+1)*cols+col+1];
      const u=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0]))),v=Math.max(0,Math.min(1,(z-a[2])/(d[2]-a[2])));
      return v<=u?a[1]*(1-u)+b[1]*(u-v)+e[1]*v:a[1]*(1-v)+e[1]*u+d[1]*(v-u);
    }
    function onTerrain(p){return [p[0],heightAt(p[0],p[2])+2,p[2]];}
    function drape(points){
      const out=[];
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[2]-b[2])/12));
        for(let n=0;n<steps;n++)out.push(onTerrain([mix(a[0],b[0],n/steps),0,mix(a[2],b[2],n/steps)]));
      }
      if(points.length)out.push(onTerrain(points[points.length-1]));return out;
    }
    function onLand(x,z) {
      return data.relief.rings.some(ring=>{
        let inside=false;
        for(let i=0,j=ring.length-1;i<ring.length;j=i++){
          const a=ring[i],b=ring[j];
          if((a[2]>z)!==(b[2]>z)&&x<(b[0]-a[0])*(z-a[2])/(b[2]-a[2])+a[0])inside=!inside;
        }
        return inside;
      });
    }
    const walls=[];
    for(const ring of data.relief.rings.map(drape))for(let i=1;i<ring.length;i++){
      const a=ring[i-1],b=ring[i];
      const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1,mx=(a[0]+b[0])/2,mz=(a[2]+b[2])/2;
      if(onLand(mx-dz/length*3,mz+dx/length*3)&&onLand(mx+dz/length*3,mz-dx/length*3))continue;
      const bottomA=[a[0],-350,a[2]],bottomB=[b[0],-350,b[2]];
      for(const point of [a,b,bottomB,a,bottomB,bottomA])walls.push(...point,...rgb("#abae90"));
    }
    const wall=buffer(new Float32Array(walls));
    function lineVertices(points,color,clip=false){
      const out=[];
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];
        if(clip&&!onLand((a[0]+b[0])/2,(a[2]+b[2])/2))continue;
        for(const [p,q,side] of [[a,b,-1],[a,b,1],[b,a,1],[b,a,1],[a,b,1],[b,a,-1]])out.push(...p,...q,...color,side);
      }
      return out;
    }
    const route=[],routeEdge=[];
    for(const day of data.days){
      const points=drape((data.walkPaths[day.n]||[]).map(p=>fromAtlas(p,data)));
      if(points.length>1){route.push(...lineVertices(points,rgb(data.colors[day.c])));routeEdge.push(...lineVertices(points,rgb("#f5efda")));}
    }
    const routeBuffer=buffer(new Float32Array(route)),edgeBuffer=buffer(new Float32Array(routeEdge));
    const seams=buffer(new Float32Array(data.relief.rings.flatMap(r=>lineVertices(drape(r),rgb("#89947c")))));
    const rivers=buffer(new Float32Array(data.relief.rivers.flatMap(r=>lineVertices(drape(r),rgb("#9ab9c0"),true))));
    const towns=data.relief.towns.map(town=>{
      const button=document.createElement("button");button.type="button";button.className="relief-town";
      button.textContent=town.name;button.setAttribute("aria-label","Visit "+town.name);
      button.addEventListener("click",()=>options.visit(town.day));labels.appendChild(button);return {...town,button};
    });
    const walker=document.createElement("span");walker.className="relief-walker";walker.setAttribute("aria-hidden","true");labels.appendChild(walker);
    function uniforms(p,u){gl.useProgram(p);gl.uniform4f(u.uView,view.x,view.z,view.width,view.aspect);gl.uniform4f(u.uOrbit,view.yaw,view.pitch,view.alt,0);}
    function drawSurface(mesh,shadow,masked){
      uniforms(surface,su);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(sc);gl.vertexAttribPointer(sc,3,gl.FLOAT,false,24,12);
      gl.uniform1f(su.uShadow,shadow);gl.uniform1f(su.uMask,masked);gl.uniform4fv(su.uBounds,bounds);gl.uniform1i(su.uLand,0);
      gl.drawArrays(gl.TRIANGLES,0,mesh.count/6);gl.disableVertexAttribArray(sc);
    }
    function drawLines(mesh,width){
      if(!mesh.count)return;
      uniforms(line,lu);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      for(const [loc,size,offset] of [[0,3,0],[le,3,12],[lc,3,24],[ls,1,36]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset);}
      gl.uniform2f(lu.uPixels,canvas.width,canvas.height);gl.uniform1f(lu.uWidth,width*Math.min(devicePixelRatio||1,1.5));
      gl.drawArrays(gl.TRIANGLES,0,mesh.count/10);
      for(const loc of [le,lc,ls])gl.disableVertexAttribArray(loc);
    }
    const landPoints=data.relief.rings.flat();
    const landBounds=[Math.min(...landPoints.map(p=>p[0])),Math.max(...landPoints.map(p=>p[0])),Math.min(...landPoints.map(p=>p[2])),Math.max(...landPoints.map(p=>p[2]))];
    const baseX=(landBounds[0]+landBounds[1])/2,baseZ=(landBounds[2]+landBounds[3])/2;
    function draw(state){
      lastState=state;if(lost||!enabled||document.hidden)return;
      const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
      const ratio=Math.min(devicePixelRatio||1,1.5);
      if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
      view={x:state.cam.x,z:(state.cam.y+(state.point?.alt||0)*data.relief.atlasLift-data.vb[1]/2)/data.relief.atlasTilt+data.vb[1]/2,alt:(state.point?.alt||0)*HEIGHT,width:state.cam.w*1.9,aspect:width/height,yaw,pitch};
      if(state.overview){
        view.x=baseX;view.z=baseZ;view.alt=0;view.width=1;
        const projected=landPoints.map(p=>project(p,view));
        const maxX=Math.max(...projected.map(p=>Math.abs(p[0]))),maxY=Math.max(...projected.map(p=>Math.abs(p[1]+.035)));
        view.width=Math.max(maxX,maxY)*1.17;
      }
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
      drawSurface(terrain,1,1);gl.enable(gl.DEPTH_TEST);drawSurface(wall,0,0);drawSurface(terrain,0,1);
      gl.disable(gl.DEPTH_TEST);drawLines(rivers,.9);drawLines(seams,.55);drawLines(edgeBuffer,4.7);drawLines(routeBuffer,2.8);
      const taken=[];
      for(const town of towns){
        const p=project(onTerrain(town.point),view),x=(p[0]+1)*width/2,y=(1-p[1])*height/2;
        const labelWidth=town.name.length*6.5+14;
        const visible=x>22&&x<width-labelWidth-12&&y>85&&y<height-75&&!taken.some(r=>Math.abs(r.y-y)<24&&x<r.x+r.width&&x+labelWidth>r.x);
        town.button.hidden=!visible;
        if(visible){town.button.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;taken.push({x,y,width:labelWidth});}
      }
      walker.hidden=state.overview;
      if(state.point){const p=project(onTerrain(fromAtlas(state.point,data)),view);walker.style.transform=`translate(${((p[0]+1)*width/2).toFixed(1)}px,${((1-p[1])*height/2).toFixed(1)}px)`;}
    }
    canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();lost=true;options.fallback();});
    let dragging=null;
    canvas.addEventListener("pointerdown",event=>{if(event.button===0)dragging={x:event.clientX,y:event.clientY,yaw,id:event.pointerId,active:false};});
    canvas.addEventListener("pointermove",event=>{
      if(!dragging)return;
      const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
      if(!dragging.active&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){dragging.active=true;canvas.setPointerCapture(event.pointerId);options.pause();}
      if(dragging.active){yaw=dragging.yaw+dx*.003;options.invalidate();}
    });
    for(const name of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(name,()=>{dragging=null;});
    return {
      draw,
      turn(delta){yaw+=delta;options.invalidate();},
      reset(){yaw=-.12;pitch=.72;options.invalidate();},
      setEnabled(value){enabled=value;canvas.hidden=!value;labels.hidden=!value;if(value&&lastState)draw(lastState);},
      get available(){return !lost;},
    };
  };
})(typeof window!=="undefined"?window:globalThis);
