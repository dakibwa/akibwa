/* The walk's sketchbook margin: tally marks for the days walked, the day's
   song, a title card as each chapter begins, and a caption on the photograph
   that drops in. It only reads the traveller's public status, so the walk,
   its camera and its pacing stay exactly as the traveller drives them. */
(function(host){
  'use strict';
  const SVG='http://www.w3.org/2000/svg';
  const jitter=[0,.6,-.4,.5,-.3];
  // Four strokes and a gate, a little uneven, as in the reference film.
  function tallies(count){
    const groups=[];
    for(let left=count,group=0;left>0;left-=5,group++){
      const size=Math.min(5,left),svg=document.createElementNS(SVG,'svg'),path=document.createElementNS(SVG,'path');
      svg.setAttribute('viewBox','0 0 26 24');svg.setAttribute('width','26');svg.setAttribute('height','24');
      let d='';
      for(let i=0;i<Math.min(size,4);i++){const x=3+i*5.4+jitter[(i+group)%5];d+='M'+x.toFixed(1)+' 3.5l'+(jitter[(i+group+2)%5]*.6).toFixed(1)+' 17';}
      if(size===5)d+='M0.5 16.5L23.5 7';
      path.setAttribute('d',d);svg.append(path);groups.push(svg);
    }
    return groups;
  }
  host.startTally=function(data){
    const $=id=>document.getElementById(id);
    const panel=$('journey-tally'),marks=$('tally-marks'),dayText=$('tally-day'),song=$('tally-song');
    const card=$('chapter-card'),flash=$('memory-flash');
    let chapters=[],shownDay=-1,lastChapter=null,cardTimer=0;
    fetch('moments.json'+(data.assets?.['moments.json']?'?v='+data.assets['moments.json']:''),{cache:'force-cache'})
      .then(r=>r.ok?r.json():null).then(m=>{chapters=m?.chapters||[];}).catch(()=>{});
    function showChapter(chapter){
      lastChapter=chapter.id;
      $('chapter-place').textContent=chapter.place;
      $('chapter-title').textContent=chapter.title;
      $('chapter-text').textContent=chapter.text;
      card.hidden=false;card.classList.remove('is-leaving');
      clearTimeout(cardTimer);
      cardTimer=setTimeout(()=>{card.classList.add('is-leaving');cardTimer=setTimeout(()=>{card.hidden=true;},600);},6200);
    }
    function update(){
      const s=host.trekStatus?.();
      const visible=Boolean(s&&s.started&&$('ending').hidden);
      if(panel.hidden===visible)panel.hidden=!visible;
      if(!s||!s.started)return;
      if(s.day!==shownDay){
        const moved=shownDay>0&&Math.abs(s.day-shownDay)===1;
        shownDay=s.day;
        const day=data.days[s.day-1];
        marks.replaceChildren(...tallies(s.day-1));
        dayText.textContent='day '+s.day;
        song.textContent=day?.t?day.t.replace(/^\((.*)\)$/,'$1'):day&&!day.w?(s.day===data.days.length?'arrived':'a day off the path'):'';
        // A chapter opens with its card when the walk reaches its first day.
        const chapter=chapters.find(c=>c.from===s.day);
        if(chapter&&chapter.id!==lastChapter&&s.playing&&(moved||s.day===1))showChapter(chapter);
      }
    }
    // Give the photograph its day, written along the bottom of the print.
    new MutationObserver(()=>{
      const label=flash.getAttribute('aria-label')||'';
      const match=label.match(/day (\d+)/i);
      flash.querySelector('.memory-sheet')?.setAttribute('data-caption',match?'day '+match[1]+(data.days[match[1]-1]?.c?' · '+data.days[match[1]-1].c:''):'');
    }).observe(flash,{attributes:true,attributeFilter:['aria-label']});
    // Chapters begin on the first press of play too.
    document.getElementById('begin')?.addEventListener('click',()=>{lastChapter=null;shownDay=-1;});
    setInterval(update,250);update();
  };
})(window);
