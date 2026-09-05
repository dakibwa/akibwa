/* The rhythm of the days and the story's quieter, cumulative details. */
(function(host){
  'use strict';
  host.createTrekStory=function(data,options){
    const stage=document.getElementById('stage'),card=document.getElementById('journey-card');
    const scrub=document.getElementById('journey-scrub'),caption=document.getElementById('rhythm-caption');
    const bars=document.getElementById('rhythm-bars'),summary=document.getElementById('walk-summary');
    const expand=document.getElementById('journal-expand');let lastDay=0,currentDay=1,hovering=false;
    const distance=day=>day.n===16||day.n===17?data.days[15].km/2:day.km;
    const max=Math.max(...data.days.map(distance));
    const marks=data.days.map(day=>{
      const mark=document.createElement('i');mark.style.setProperty('--height',Math.max(5,distance(day)/max*100)+'%');
      if(!day.w)mark.className='is-pause';bars.append(mark);return mark;
    });
    function dayCaption(n){
      const d=data.days[n-1];
      return 'Day '+d.n+' · '+d.c+' · '+(d.n===16||d.n===17?'70.9 km shared across days 16–17':d.w?d.km.toFixed(1)+' km':'no separate recording');
    }
    function toggleJournal(open){
      stage.classList.toggle('journal-expanded',open);expand.setAttribute('aria-expanded',String(open));expand.textContent=open?'Back to the landscape ↙':'Read the day ↗';
      const record=document.getElementById('journey-record-button');
      if(open)card.append(record);else stage.insertBefore(record,document.querySelector('.journey-footer'));
      if(open)options.pause();else card.scrollTop=0;
    }
    expand.addEventListener('click',()=>toggleJournal(expand.getAttribute('aria-expanded')!=='true'));
    addEventListener('keydown',e=>{if(e.key==='Escape')toggleJournal(false);});
    scrub.addEventListener('input',e=>{options.pause();options.follow();options.visit(+e.target.value,.5);});
    scrub.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=scrub.getBoundingClientRect();hovering=true;caption.textContent=dayCaption(Math.max(1,Math.min(67,1+Math.floor((e.clientX-r.left)/r.width*67))));});
    scrub.addEventListener('pointerleave',()=>{hovering=false;caption.textContent=dayCaption(currentDay);});
    document.getElementById('journey-about').addEventListener('click',()=>{options.pause();summary.showModal();});
    document.getElementById('summary-close').addEventListener('click',()=>summary.close());
    summary.addEventListener('click',e=>{if(e.target===summary)summary.close();});
    const totals=[['67','numbered days'],[data.photos.length,'photographs'],[Math.round(data.stats.ascent).toLocaleString(),'metres of recorded ascent'],[(data.stats.minutes/60).toFixed(0),'hours moving']];
    document.getElementById('summary-totals').replaceChildren(...totals.map(([value,label])=>{const p=document.createElement('p'),b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;p.append(b,span);return p;}));
    return {update({day,km,type}){
      currentDay=day;
      document.getElementById('distance-remaining').textContent=type==='end'?'Sofia. At last.':Math.max(0,Math.round(data.total-km)).toLocaleString()+' km ahead';
      if(document.activeElement!==scrub)scrub.value=day;
      scrub.setAttribute('aria-valuetext',dayCaption(day));
      if(day!==lastDay){
        lastDay=day;card.scrollTop=0;marks.forEach((mark,index)=>{mark.classList.toggle('is-past',index<day-1);mark.classList.toggle('is-current',index===day-1);});
        if(!hovering)caption.textContent=type==='start'?'67 numbered days · each mark is a day’s distance':dayCaption(day);
      }
    }};
  };
})(window);
