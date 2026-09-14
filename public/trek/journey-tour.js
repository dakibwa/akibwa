/* Short, chronological viewing windows on the unchanged walking route. */
(function(host){
  'use strict';
  const stops=[
    {day:1,at:0,seconds:14},
    {day:14,at:.5,seconds:18},
    {day:25,at:.5,seconds:18},
    {day:30,at:.5,seconds:24},
    {day:36,at:.65,seconds:18},
    {day:42,at:.5,seconds:18},
    {day:53,at:.65,seconds:18},
    {day:66,at:1,seconds:22}
  ];
  function create(path){
    const stages=stops.map((stop,i)=>({...stop,start:i===stops.length-1?Math.max(0,path.total-1600):path.dayDistance(stop.day,stop.at)}));
    let index=0,elapsed=0,finished=false;
    function seek(distance){
      index=0;while(index+1<stages.length&&stages[index+1].start<=distance)index++;
      elapsed=0;finished=false;
    }
    function advance(seconds){
      if(finished)return null;
      elapsed+=Math.max(0,seconds);
      if(elapsed<stages[index].seconds)return null;
      elapsed=0;
      if(index+1<stages.length){index++;return {distance:stages[index].start,final:false};}
      finished=true;return {distance:path.total,final:true};
    }
    return {stages,seek,advance,boundary:()=>index+1<stages.length?stages[index+1].start-1:path.total,
      status:()=>({stage:index+1,stages:stages.length,elapsed,finished,seconds:stops.reduce((sum,s)=>sum+s.seconds,0)})};
  }
  const api={create};if(typeof module!=='undefined')module.exports=api;else host.TrekTour=api;
})(typeof window==='undefined'?globalThis:window);
