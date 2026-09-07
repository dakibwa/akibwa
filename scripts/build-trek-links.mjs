#!/usr/bin/env node
// Explicit maintenance step: reconstruct only gaps between the approved public recordings.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{metres}=require('../public/trek/journey-route.js');
const root=new URL('../',import.meta.url),bytes=readFileSync(new URL('public/trek/route-detail.json',root));
const route=JSON.parse(bytes),cache='/tmp/trek-walking-routes';
mkdirSync(cache,{recursive:true});
// Dan reported two trains and recalled a probable Wörthersee boat crossing on
// 7 September 2026. Transport boundaries are inferred, not recorded vehicle GPS.
const trains=new Set([15,38]),features=[];
const rails=JSON.parse(readFileSync(new URL('data/trek-rail-routes.json',root),'utf8'));
const boats=JSON.parse(readFileSync(new URL('data/trek-boat-routes.json',root),'utf8'));
function decode(shape){
  let cursor=0,lat=0,lon=0;const points=[];
  function coordinate(){let result=0,shift=0,b;do{b=shape.charCodeAt(cursor++)-63;result|=(b&31)<<shift;shift+=5;}while(b>=32);return result&1?~(result>>1):result>>1;}
  while(cursor<shape.length){lat+=coordinate();lon+=coordinate();points.push([+(lon/1e6).toFixed(5),+(lat/1e6).toFixed(5)]);}
  return points;
}
async function walking(a,b,label){
    if(metres(a,b)<35)return {points:[a,b],method:'Short join between recording endpoints'};
    const request={locations:[{lon:a[0],lat:a[1]},{lon:b[0],lat:b[1]}],costing:'pedestrian',units:'kilometers',directions_options:{directions_type:'none'}};
    const key=createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0,16),file=join(cache,key+'.json');
    if(!existsSync(file)){
      // FOSSGIS permits at most one request per second. Cache every response;
      // visitors never contact this router and ordinary builds use committed data.
      await new Promise(resolve=>setTimeout(resolve,1200));
      const response=await fetch('https://valhalla1.openstreetmap.de/route?json='+encodeURIComponent(JSON.stringify(request)),{headers:{'User-Agent':'akibwa-trek-route-reconstruction/1.0','X-Client-Id':'akibwa.com'},signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw Error('Walking route '+label+': HTTP '+response.status);
      writeFileSync(file,await response.text());
    }
    const result=JSON.parse(readFileSync(file,'utf8'));
    if(result.trip?.status!==0||result.trip.legs.length!==1)throw Error('Walking route failed: '+label);
    let points=decode(result.trip.legs[0].shape);
    const snap=Math.max(metres(a,points[0]),metres(b,points.at(-1)));
    if(snap>200)throw Error('Review endpoint snap for gap '+label+': '+Math.round(snap)+' m');
    points=[a,...points,b].filter((p,i,all)=>!i||metres(p,all[i-1])>.05);
    return {points,method:'Valhalla pedestrian route on current OpenStreetMap'};
}
for(let gap=0;gap<route.features.length-1;gap++){
  const previous=route.features[gap],next=route.features[gap+1],a=previous.geometry.coordinates.at(-1),b=next.geometry.coordinates[0];
  const boat=boats.features.find(f=>f.properties.gap===gap);
  const mode=trains.has(gap)?'train':boat?'boat':'walk';let points,method,transportProperties={};
  if(mode==='train'){
    const rail=rails.features.find(f=>f.properties.gap===gap);if(!rail)throw Error('Missing railway alignment '+gap);
    points=[a,...rail.geometry.coordinates,b];
    transportProperties={railFrom:1,railTo:points.length-2,structures:rail.properties.structures.map(s=>({...s,from:s.from+1,to:s.to+1}))};
    method='Mapped railway: '+rail.properties.from+' → '+rail.properties.to+'. Stations and service are inferred; exact 2019 travel is unverified.';
  }else if(boat){
    const water=boat.geometry.coordinates,before=await walking(a,water[0],'boat approach'),after=await walking(water.at(-1),b,'boat departure');
    points=[...before.points,...water.slice(1),...after.points.slice(1)];
    transportProperties={boatFrom:before.points.length-1,boatTo:before.points.length+water.length-2};
    method='Estimated Wörthersee boat crossing: Velden → Klagenfurt/See on mapped ferry ways, with pedestrian routes to the adjacent recordings. Exact 2019 sailing and stops are unverified.';
  }else{
    ({points,method}=await walking(a,b,gap));
  }
  features.push({type:'Feature',properties:{gap,fromDay:previous.properties.throughDay,day:next.properties.day,mode,estimated:true,method,...transportProperties},geometry:{type:'LineString',coordinates:points}});
}
const links={type:'FeatureCollection',version:1,precision:'estimated',routeHash:createHash('sha256').update(bytes).digest('hex'),generated:new Date().toISOString().slice(0,10),source:'OpenStreetMap contributors; Valhalla / FOSSGIS; mapped railway and ferry ways',sourceUrl:'https://valhalla.openstreetmap.de/',method:'Estimated walking paths between recordings, based on current mapped roads and footpaths. Two reported train transfers and the probable Wörthersee boat crossing follow mapped transport ways. Stations, docks and service are inferred from adjacent recordings; pedestrian access remains separate from the vehicle animations. Neither the exact 2019 paths nor transport endpoints are verified. These links add no recorded distance or ascent.',features};
writeFileSync(new URL('public/trek/route-links.json',root),JSON.stringify(links)+'\n');
console.log(`Saved ${features.filter(f=>f.properties.mode==='walk').length} estimated walking links, ${trains.size} train connections and ${boats.features.length} boat crossing.`);
