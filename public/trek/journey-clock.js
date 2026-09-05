/* One journey clock for scrolling, playback, country jumps and day controls. */
(function(host){
  'use strict';
  host.startTrek=function(data){
    const days=data.days,scenes=data.scenes,stage=document.getElementById('stage');
    const experience=document.getElementById('experience'),pause=document.getElementById('journey-pause');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let playing=false,frame=0,previous=0,position=-1,day=1,fraction=0,type='start';
    const set=(id,value)=>{const e=document.getElementById(id);if(e.textContent!==String(value))e.textContent=value;};
    const progress=document.getElementById('journey-progress');
    function pauseWalk(){playing=false;pause.textContent=type==='end'?'Replay':'Resume';}
    function invalidate(){if(!frame)frame=requestAnimationFrame(tick);}
    function visit(n,t=.2){
      const scene=scenes.find(s=>s.t==='walk'&&s.day===n);
      if(scene){scrollTo({top:scene.at+scene.len*Math.max(.002,Math.min(.998,t)),behavior:'auto'});invalidate();}
    }
    const journey=host.createTrekJourney(data,{reduced,pause:pauseWalk,visit});
    // A read-only status accessor is also used by the rendered regression check.
    host.trekStatus=()=>({...journey.getState(),playing,position,type});
    function update(){
      const p=Math.max(0,Math.min(data.timeline,scrollY));
      if(position===p)return;position=p;
      let s=scenes[0];for(const candidate of scenes){if(candidate.at>p)break;s=candidate;}
      type=s.t;day=s.day||1;fraction=type==='walk'?Math.max(0,Math.min(1,(p-s.at)/s.len)):type==='end'?1:0;
      const current=days.find(d=>d.n===day),prev=days.find(d=>d.n===day-1);
      const started=type!=='start';stage.classList.toggle('has-started',started);stage.classList.toggle('is-finished',type==='end');
      pause.hidden=!started;if(!playing)pause.textContent=type==='end'?'Replay':'Resume';
      const mix=(a,b,t)=>a+(b-a)*t;
      const km=type==='start'?0:type==='end'?data.total:mix(prev?.cum||0,current.cum,fraction);
      const elev=type==='start'?0:mix(prev?.cumElev||0,current.cumElev,fraction);
      const minutes=type==='start'?0:mix(prev?.cumMin||0,current.cumMin,fraction);
      set('hud-km',km.toFixed(1));set('hud-ascent',Math.round(elev).toLocaleString());set('hud-hours',(minutes/60).toFixed(1));set('hud-days',type==='start'?0:current.footDays);
      const date=current.date?new Date(current.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
      set('hud-position',type==='start'?'Paris · 24 Sep 2019':type==='end'?'Sofia · journey complete':['Day '+day,date,current.c].filter(Boolean).join(' · '));
      progress.setAttribute('aria-valuenow',String(Math.round(km)));progress.querySelector('i').style.width=(km/data.total*100)+'%';
      for(const a of document.querySelectorAll('#country-nav a'))a.setAttribute('aria-current',String(a.hash.slice(1)===current.c.toLowerCase()));
      journey.update({day,t:fraction,type});
    }
    function tick(time){
      frame=0;
      if(playing){const delta=Math.min(60,Math.max(0,time-(previous||time)));scrollTo(0,Math.min(data.timeline,scrollY+delta*.14));if(scrollY>=data.timeline-2)pauseWalk();}
      previous=time;update();if(playing)invalidate();
    }
    function play(){
      if(type==='end')scrollTo(0,scenes.find(s=>s.t==='walk').at+1);
      else if(type==='start')visit(1,0);
      playing=true;previous=0;pause.hidden=false;pause.textContent='Pause';invalidate();
    }
    document.getElementById('walkbtn').addEventListener('click',play);
    pause.addEventListener('click',()=>playing?pauseWalk():play());
    document.getElementById('journey-reset').addEventListener('click',()=>{pauseWalk();journey.follow();scrollTo(0,0);history.replaceState(null,'',location.pathname);position=-1;invalidate();});
    addEventListener('scroll',invalidate,{passive:true});
    addEventListener('wheel',pauseWalk,{passive:true});addEventListener('touchstart',pauseWalk,{passive:true});
    addEventListener('keydown',e=>{if(e.key==='Escape'){pauseWalk();}else if(e.key===' '&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();playing?pauseWalk():play();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseWalk();else invalidate();});
    function resize(){experience.style.height=(data.timeline+innerHeight)+'px';position=-1;invalidate();}
    addEventListener('resize',resize);resize();
    document.querySelectorAll('#country-nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();pauseWalk();journey.follow();const target=days.find(d=>d.c.toLowerCase()===a.hash.slice(1));if(target)visit(target.n,.15);history.replaceState(null,'',a.hash);}));
    const query=new URLSearchParams(location.search),initialDay=+query.get('day');
    if(initialDay>=1&&initialDay<=67)visit(initialDay,.5);
    else if(location.hash){const target=days.find(d=>d.c.toLowerCase()===location.hash.slice(1));if(target)visit(target.n,.15);}
    update();journey.open();
    const records=days.filter(d=>d.s),dialog=document.getElementById('spot');let recordIndex=0;
    function showRecord(index){
      recordIndex=index;const d=records[index],s=d.s;pauseWalk();
      const img=document.getElementById('spot-img');img.src='covers/'+s.slug+'.webp';img.alt=s.artist+' — '+s.album;
      set('spot-facts','Day '+d.n+' · '+d.c);set('spot-title',d.t);set('spot-record',s.artist+' · '+s.album);set('spot-note',s.note||'');
      document.getElementById('spot-prev').disabled=index===0;document.getElementById('spot-next').disabled=index===records.length-1;
      if(!dialog.open)dialog.showModal();
    }
    document.addEventListener('click',e=>{const button=e.target.closest('.album-open');if(!button)return;const index=records.findIndex(d=>d.n===+button.dataset.day);if(index>=0)showRecord(index);});
    document.getElementById('spot-close').addEventListener('click',()=>dialog.close());
    document.getElementById('spot-prev').addEventListener('click',()=>{if(recordIndex>0)showRecord(recordIndex-1);});
    document.getElementById('spot-next').addEventListener('click',()=>{if(recordIndex<records.length-1)showRecord(recordIndex+1);});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'&&recordIndex>0)showRecord(recordIndex-1);if(e.key==='ArrowRight'&&recordIndex<records.length-1)showRecord(recordIndex+1);});
  };
})(window);
