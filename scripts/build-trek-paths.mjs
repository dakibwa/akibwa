#!/usr/bin/env node
// Build the paths-only journey from approved public records and coordinates.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const source=read('data/trek-days.json'),journal=read('data/trek-journal.json');
const photos=read('public/trek/photos/manifest.json'),moments=read('data/trek-moments.json');
const route=read('public/trek/route-detail.json');
if(route.precision!=='recorded')throw Error('The approved recorded Trek paths are required');
for(const chapter of moments.chapters){
  if(!existsSync(new URL('public/trek/photos/'+chapter.photo,root)))chapter.photo=chapter.fallbackPhoto;
  delete chapter.fallbackPhoto;
}
for(const item of [...moments.chapters,...moments.moments])if(!existsSync(new URL('public/trek/photos/'+item.photo,root)))throw Error('Missing photograph '+item.photo);
writeFileSync(new URL('public/trek/moments.json',root),JSON.stringify(moments)+'\n');
const days=source.days.map(d=>({n:d.n,t:d.title,date:d.date,km:d.km||0,min:d.movingMin||0,elev:d.elevM||0,w:d.walked?1:0,c:d.country,s:d.sleeve||null,j:journal.days[d.n]||[]}));
const scale=source.facts.km/days.filter(d=>d.w).reduce((s,d)=>s+d.km,0);
let km=0,ascent=0,minutes=0,walked=0;
for(const day of days){
  const shared=route.features.find(f=>f.properties.day<=day.n&&f.properties.throughDay>=day.n&&f.properties.throughDay>f.properties.day)?.properties;
  const recorded=shared?days.find(d=>d.n===shared.day):day;
  const portions=shared?shared.throughDay-shared.day+1:1;
  if(day.w){km+=recorded.km*scale/portions;ascent+=recorded.elev/portions;minutes+=recorded.min/portions;walked++;}
  Object.assign(day,{cum:+km.toFixed(1),cumElev:ascent,cumMin:minutes,footDays:walked});
}
const scenes=[{t:'start',len:300}];
for(const day of days){const count=photos.filter(p=>p.day===day.n).length;scenes.push({t:'walk',day:day.n,len:day.w?Math.max(600,day.km*16,count*60):260});}
scenes.push({t:'end',day:67,len:500});
let timeline=0;for(const s of scenes){s.at=timeline;timeline+=s.len;}
const data={days,photos,scenes,timeline,total:source.facts.km,colors:Object.fromEntries(source.countries.map(c=>[c.name,c.color])),stats:{days:walked,ascent,minutes,countries:source.facts.countries}};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const list=days.map(d=>`<li>Day ${d.n} · ${esc(d.c)}${d.date?' · '+d.date:''}${d.w?' · '+d.km.toFixed(1)+' km':''}${d.j.length?'<p>'+esc(d.j.map(j=>j.text).join(' '))+'</p>':''}</li>`).join('\n');
const html=readFileSync(new URL('scripts/trek-journey-template.html',root),'utf8').replace('__DATA_JSON__',JSON.stringify(data)).replace('<!--__NOSCRIPT_DAYS__-->',list)
  .replace(/(href|src)="(journey-(?:map|shell|story|clock)\.(?:css|js))"/g,(_,attribute,file)=>{
    const version=createHash('sha256').update(readFileSync(new URL('public/trek/'+file,root))).digest('hex').slice(0,12);
    return `${attribute}="${file}?v=${version}"`;
  });
writeFileSync(new URL('public/trek/index.html',root),html);
console.log(`Built the 3D paths journey: ${days.length} days, ${photos.length} photos, ${Object.values(journal.days).flat().length} factual notes; ${Math.round(html.length/1024)} KB HTML`);
