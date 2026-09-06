// Precompute mapped ground heights; no private activity channels are published.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(import.meta.url),sharp=require('sharp');
const {buildJourneyPath}=require('../public/trek/journey-route.js');
const root=new URL('../',import.meta.url),routeBytes=readFileSync(new URL('public/trek/route-detail.json',root));
const path=buildJourneyPath(JSON.parse(routeBytes)),zoom=11,step=200;
const cache=process.env.TREK_DEM_CACHE||'/tmp/trek-profile-dem';mkdirSync(cache,{recursive:true});
const samples=path.pieces.map(p=>{
  if(p.kind!=='recorded')return {kind:p.kind,start:Math.round(p.start),end:Math.round(p.end),samples:[]};
  const count=Math.ceil((p.end-p.start)/step);
  return {kind:p.kind,start:Math.round(p.start),end:Math.round(p.end),samples:Array.from({length:count+1},(_,i)=>{
    const d=p.start+(p.end-p.start)*i/count,[lon,lat]=path.sample(d).point,n=2**zoom;
    const x=(lon+180)/360*n,y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;
    return {d:Math.round(d),tile:`${zoom}/${Math.floor(x)}/${Math.floor(y)}`,x:(x%1)*256,y:(y%1)*256};
  })};
});
const keys=[...new Set(samples.flatMap(p=>p.samples.map(s=>s.tile)))],decoded=new Map;
let next=0,done=0;
await Promise.all(Array.from({length:4},async()=>{
 while(next<keys.length){const tile=keys[next++],file=join(cache,tile.replaceAll('/','-')+'.png');
  if(!existsSync(file)){
   let response;
   for(let attempt=0;attempt<3;attempt++){
    try{response=await fetch('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+tile+'.png',{signal:AbortSignal.timeout(15000)});if(response.ok)break;}catch(e){if(attempt===2)throw e;}
   }
   if(!response?.ok)throw Error('Elevation tile unavailable: '+tile);
   writeFileSync(file,Buffer.from(await response.arrayBuffer()));
  }
  const {data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==256||info.height!==256||info.channels!==3)throw Error('Unexpected DEM tile '+tile);
  decoded.set(tile,data);if(++done%40===0)console.log(`Elevation tiles ${done}/${keys.length}`);
 }
}));
const terrain=(s)=>{const data=decoded.get(s.tile),x=Math.min(255,Math.floor(s.x)),y=Math.min(255,Math.floor(s.y)),i=(y*256+x)*3;return Math.round(data[i]*256+data[i+1]+data[i+2]/256-32768);};
const pieces=samples.map(p=>({...p,samples:p.samples.map(s=>[s.d,terrain(s)])}));
const heights=pieces.flatMap(p=>p.samples.map(s=>s[1]));
const profile={version:1,source:'Mapzen terrain tiles',sourceUrl:'https://www.mapzen.com/rights/',method:'Mapped ground elevation, sampled about every 200 m; not recorded GPS altitude. Gaps have no elevation profile.',zoom,step,routeHash:createHash('sha256').update(routeBytes).digest('hex'),total:Math.round(path.total),min:Math.min(...heights),max:Math.max(...heights),pieces};
writeFileSync(new URL('public/trek/elevation-profile.json',root),JSON.stringify(profile)+'\n');
console.log(`Elevation profile: ${heights.length} ground heights, ${keys.length} tiles, ${profile.min}–${profile.max} m`);
