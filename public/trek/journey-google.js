/* Google Maps' native photorealistic renderer. No imagery or elevation is cached. */
(function(host){
  'use strict';
  const radians=Math.PI/180;
  const metres=(a,b)=>Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])*radians/2),b[1]-a[1])*111195;
  const interpolate=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const latLng=p=>({lat:p[1],lng:p[0]});

  // Google 3D polylines do not have a dash style. Split only the presentation
  // connections, with a bounded number of pieces even across the longest gap.
  function dashedPaths(coordinates){
    const lengths=coordinates.slice(1).map((p,i)=>metres(coordinates[i],p));
    const total=lengths.reduce((sum,n)=>sum+n,0),period=Math.max(90,total/48);
    const paths=[];let walked=0,current=[];
    for(let i=0;i<lengths.length;i++){
      const length=lengths[i];if(length<.001)continue;
      let used=0;
      while(used<length-.000001){
        const phase=(walked+used)%period,on=phase<period*.58;
        const step=Math.min(length-used,(on?period*.58:period)-phase);
        if(step<.000001){used+=.000001;continue;}
        const a=interpolate(coordinates[i],coordinates[i+1],used/length);
        const b=interpolate(coordinates[i],coordinates[i+1],(used+step)/length);
        if(on){if(!current.length)current.push(a);current.push(b);}
        used+=step;
        if(on&&phase+step>=period*.58-.000001){if(current.length>1)paths.push(current);current=[];}
      }
      walked+=length;
    }
    if(current.length>1)paths.push(current);
    return paths;
  }

  let libraryPromise;
  function load(apiKey){
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      let timer;const callback='__trekGoogleReady';
      const finish=(error)=>{
        clearTimeout(timer);delete host[callback];
        if(error){reject(error);return;}
        host.google.maps.importLibrary('maps3d').then(resolve,reject);
      };
      host[callback]=()=>finish();
      const script=document.createElement('script');
      const url=new URL('https://maps.googleapis.com/maps/api/js');
      url.search=new URLSearchParams({key:apiKey,v:'weekly',loading:'async',libraries:'maps3d',callback});
      script.src=url.href;script.async=true;
      script.onerror=()=>finish(Error('Google imagery could not load'));
      timer=setTimeout(()=>finish(Error('Google imagery did not respond')),18000);
      document.head.appendChild(script);
    });
    return libraryPromise;
  }

  function cameraOptions(point,heading,altitudeMode){
    return {
      cameraPosition:{...latLng(point),altitude:420},
      altitudeMode,
      heading:((heading%360)+360)%360,tilt:74,range:1520,roll:0,fov:46,
    };
  }

  async function create({apiKey,container,path,point,heading,onExplore,onError}){
    const {Map3DElement,Polyline3DElement,MapMode,AltitudeMode}=await load(apiKey);
    // Start well above any mountain while Google resolves the ground-relative
    // camera. The travelling camera uses Google's own terrain, at real scale.
    const map=new Map3DElement({center:{...latLng(point),altitude:0},range:22000,tilt:0,
      heading,mode:MapMode.SATELLITE,defaultUIHidden:true,minAltitude:160,maxTilt:83,
      description:'Satellite imagery and 3D landscape along the walk from Paris to Sofia'});
    let disposed=false,pending=null,lastSteady=false;
    const finish=()=>{
      if(!pending||!pending.positioned||!lastSteady)return;
      clearTimeout(pending.timer);const resolve=pending.resolve;pending=null;resolve(true);
    };
    map.addEventListener('gmp-steadychange',event=>{lastSteady=event.isSteady;finish();});
    map.addEventListener('gmp-animationend',()=>{if(pending){pending.positioned=true;finish();}});
    map.addEventListener('gmp-error',()=>{
      if(pending){clearTimeout(pending.timer);pending.reject(Error('Google imagery could not initialize'));pending=null;}
      else if(!disposed)onError();
    });
    // Only real gestures interrupt following; camera-change events also fire
    // during playback and must not pause the journey.
    map.addEventListener('pointerdown',onExplore,{passive:true});
    map.addEventListener('wheel',onExplore,{passive:true});
    const addLine=(coordinates,connection=false)=>{
      const line=new Polyline3DElement({altitudeMode:AltitudeMode.CLAMP_TO_GROUND,
        path:coordinates.map(latLng),geodesic:true,drawsOccludedSegments:false,
        strokeColor:connection?'#f3d49eaa':'#ed9b59',strokeWidth:connection?3:4,
        outerColor:connection?'#40372588':'#352c22aa',outerWidth:.25,zIndex:connection?1:2});
      map.appendChild(line);
    };
    for(const feature of path.recorded.features)addLine(feature.geometry.coordinates);
    for(const feature of path.connections.features)for(const dash of dashedPaths(feature.geometry.coordinates))addLine(dash,true);
    container.appendChild(map);
    const adapter={
      async prepare(position,direction){
        if(disposed)return false;
        if(pending){clearTimeout(pending.timer);pending.resolve(false);pending=null;}
        return new Promise((resolve,reject)=>{
          pending={resolve,reject,positioned:false,timer:setTimeout(()=>{
            pending=null;reject(Error('Google imagery could not finish rendering'));
          },20000)};
          lastSteady=false;
          map.flyCameraTo({endCamera:cameraOptions(position,direction,AltitudeMode.RELATIVE_TO_GROUND),durationMillis:0});
        });
      },
      update(position,direction){
        if(disposed)return;
        // Position and heading have already been filtered by the shared clock.
        // Duration zero applies that frame without stacking fly animations.
        map.flyCameraTo({endCamera:cameraOptions(position,direction,AltitudeMode.RELATIVE_TO_GROUND),durationMillis:0});
      },
      status(){return {pitch:map.tilt,eyeHeight:map.cameraPosition?.altitude??null};},
      destroy(){
        disposed=true;
        if(pending){clearTimeout(pending.timer);pending.resolve(false);pending=null;}
        map.stopCameraAnimation();map.remove();
      },
    };
    return adapter;
  }
  host.TrekGoogle={create,cameraOptions,dashedPaths};
})(typeof window==='undefined'?globalThis:window);
