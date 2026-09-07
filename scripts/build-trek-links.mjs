#!/usr/bin/env node
// Explicit maintenance step: reconstruct only gaps between the approved public recordings.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{buildJourneyPath,metres}=require('../public/trek/journey-route.js');
const root=new URL('../',import.meta.url),bytes=readFileSync(new URL('public/trek/route-detail.json',root));
const route=JSON.parse(bytes),original=buildJourneyPath(route),cache='/tmp/trek-walking-routes';
mkdirSync(cache,{recursive:true});
// Dan confirmed walking the remaining gaps on 7 September 2026. The two
// transport boundaries are inferred from the adjacent recordings, not train GPS.
const trains=new Set([15,38]),features=[];
function decode(shape){
  let cursor=0,lat=0,lon=0;const points=[];
  function coordinate(){let result=0,shift=0,b;do{b=shape.charCodeAt(cursor++)-63;result|=(b&31)<<shift;shift+=5;}while(b>=32);return result&1?~(result>>1):result>>1;}
  while(cursor<shape.length){lat+=coordinate();lon+=coordinate();points.push([+(lon/1e6).toFixed(5),+(lat/1e6).toFixed(5)]);}
  return points;
}
for(let gap=0;gap<route.features.length-1;gap++){
  const previous=route.features[gap],next=route.features[gap+1],a=previous.geometry.coordinates.at(-1),b=next.geometry.coordinates[0];
  const mode=trains.has(gap)?'train':'walk';let points,method;
  if(mode==='train'){points=original.connections.features[gap].geometry.coordinates;method='Illustrative transport connection';}
  else if(metres(a,b)<35){points=[a,b];method='Short join between recording endpoints';}
  else{
    const request={locations:[{lon:a[0],lat:a[1]},{lon:b[0],lat:b[1]}],costing:'pedestrian',units:'kilometers',directions_options:{directions_type:'none'}};
    const key=createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0,16),file=join(cache,key+'.json');
    if(!existsSync(file)){
      // FOSSGIS permits at most one request per second. Cache every response;
      // visitors never contact this router and ordinary builds use committed data.
      await new Promise(resolve=>setTimeout(resolve,1200));
      const response=await fetch('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(request)),{headers:{'User-Agent':'akibwa-trek-route-reconstruction/1.0','X-Client-Id':'akibwa.com'},signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw Error('Walking route '+gap+': HTTP '+response.status);
      writeFileSync(file,await response.text());
    }
    const result=JSON.parse(readFileSync(file,'utf8'));
    if(result.trip?.status!==0||result.trip.legs.length!==1)throw Error('Walking route failed: '+gap);
    points=decode(result.trip.legs[0].shape);
    const snap=Math.max(metres(a,points[0]),metres(b,points.at(-1)));
    if(snap>200)throw Error('Review endpoint snap for gap '+gap+': '+Math.round(snap)+' m');
    points=[a,...points,b].filter((p,i,all)=>!i||metres(p,all[i-1])>.05);
    method='Valhalla pedestrian route on current OpenStreetMap';
    console.log(`Gap ${gap}: days ${previous.properties.throughDay}–${next.properties.day}, ${result.trip.summary.length.toFixed(2)} km, endpoint join ${Math.round(snap)} m`);
  }
  features.push({type:'Feature',properties:{gap,fromDay:previous.properties.throughDay,day:next.properties.day,mode,estimated:true,method},geometry:{type:'LineString',coordinates:points}});
}
const links={type:'FeatureCollection',version:1,precision:'estimated',routeHash:createHash('sha256').update(bytes).digest('hex'),generated:new Date().toISOString().slice(0,10),source:'OpenStreetMap contributors; Valhalla / FOSSGIS',sourceUrl:'https://valhalla.openstreetmap.de/',method:'Estimated walking paths between recordings, based on current mapped roads and footpaths. The two reported train transfers stay illustrative. Neither the exact 2019 paths nor transport endpoints are verified. These links add no recorded distance or ascent.',features};
writeFileSync(new URL('public/trek/route-links.json',root),JSON.stringify(links)+'\n');
console.log(`Saved ${features.filter(f=>f.properties.mode==='walk').length} estimated walking links and ${trains.size} train connections.`);
