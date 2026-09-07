/* Recorded walking totals plus explicitly estimated missing walks. */
(function(host){
  'use strict';
  const Route=typeof module!=='undefined'?require('./journey-route.js'):host.TrekRoute;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  function create(path,links,profile,days){
    let gap=0,km=0,ascent=0;
    const walks=[];
    path.pieces.forEach((piece,index)=>{
      if(piece.kind!=='connection')return;
      const link=links.features[gap++];
      const terrain=profile.pieces[index];
      function addWalk(start,end,points,heights,from=start,to=end){
        if(end<=start||points.length<2)return;
        const samples=[];let climb=0;
        for(let i=0;i<heights.length;i++){
          const [distance,height]=heights[i];
          if(i)climb+=Math.max(0,height-heights[i-1][1]);
          samples.push([(distance-from)/(to-from||1),climb]);
        }
        // Original reconstructed geometry, before display corner rounding.
        const length=Route.length(points)/1000;
        walks.push({start,end,km:length,ascent:climb,beforeKm:km,beforeAscent:ascent,samples});
        km+=length;ascent+=climb;
      }
      if(link.properties.mode==='walk')addWalk(piece.start,piece.end,link.geometry.coordinates,terrain.samples,terrain.start,terrain.end);
      if(link.properties.mode==='boat'){
        const height=d=>{
          const ps=terrain.samples;
          if(d<=ps[0][0])return ps[0][1];
          for(let i=1;i<ps.length;i++)if(d<=ps[i][0])return mix(ps[i-1][1],ps[i][1],(d-ps[i-1][0])/(ps[i][0]-ps[i-1][0]||1));
          return ps.at(-1)[1];
        };
        const clipped=(a,b)=>[[a,height(a)],...terrain.samples.filter(p=>p[0]>a&&p[0]<b),[b,height(b)]];
        addWalk(piece.start,piece.boatStart,link.geometry.coordinates.slice(0,link.properties.boatFrom+1),clipped(piece.start,piece.boatStart));
        addWalk(piece.boatEnd,piece.end,link.geometry.coordinates.slice(link.properties.boatTo),clipped(piece.boatEnd,piece.end));
      }
    });
    const estimated={km,ascent};
    const recorded={km:days.at(-1).cum,ascent:days.at(-1).cumElev};
    const total={km:recorded.km+km,ascent:recorded.ascent+ascent};
    function estimatedAt(distance){
      for(const walk of walks){
        if(distance>=walk.end)continue;
        if(distance<=walk.start)return {km:walk.beforeKm,ascent:walk.beforeAscent};
        const t=(distance-walk.start)/(walk.end-walk.start),samples=walk.samples;
        let lo=1,hi=samples.length-1;
        while(lo<hi){const mid=(lo+hi)>>1;if(samples[mid][0]<t)lo=mid+1;else hi=mid;}
        const a=samples[lo-1],b=samples[lo],part=clamp((t-a[0])/(b[0]-a[0]||1),0,1);
        return {km:walk.beforeKm+walk.km*t,ascent:walk.beforeAscent+mix(a[1],b[1],part)};
      }
      return {...estimated};
    }
    function sample(distance){
      const at=path.dayAt(distance),day=days[at.day-1],previous=days[at.day-2];
      const fraction=path.recordedFraction(at.day,distance);
      const original={km:mix(previous?.cum||0,day.cum,fraction),ascent:mix(previous?.cumElev||0,day.cumElev,fraction)};
      const extra=estimatedAt(distance);
      return {km:original.km+extra.km,ascent:original.ascent+extra.ascent,recorded:original,estimated:extra};
    }
    function day(n){
      const before=estimatedAt(path.dayDistance(n,0)),after=estimatedAt(path.dayDistance(n,1));
      return {km:after.km-before.km,ascent:after.ascent-before.ascent};
    }
    return {recorded,estimated,total,sample,day};
  }
  const api={create};if(typeof module!=='undefined')module.exports=api;else host.TrekMetrics=api;
})(typeof window==='undefined'?globalThis:window);
