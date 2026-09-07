import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Route=require('../public/trek/journey-route.js'),Metrics=require('../public/trek/journey-metrics.js');
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const line=()=>({properties:{mode:'walk'},geometry:{coordinates:[[0,0],[0,1000/111195]]}});
const pieces=['recorded','connection','connection','connection','recorded'].map((kind,i)=>({kind,start:i*1000,end:(i+1)*1000}));
const fixturePath={pieces,dayAt:d=>({day:d<2500?1:2}),dayDistance:(day,t)=>((day-1)+t)*2500,recordedFraction:(day,d)=>Math.max(0,Math.min(1,(d-(day===1?0:4000))/1000))};
const fixtureLinks={features:[line(),{...line(),properties:{mode:'train'}},line()]};
const fixtureProfile={pieces:pieces.map(p=>({...p,samples:[[p.start,100],[p.end,100]]}))};
fixtureProfile.pieces[1].samples=[[1000,100],[1250,110],[1500,90],[2000,120]];
fixtureProfile.pieces[2].samples=[[2000,120],[3000,1120]];
fixtureProfile.pieces[3].samples=[[3000,100],[4000,120]];
const fixtureDays=[{cum:1,cumElev:100},{cum:2,cumElev:150}];
const fixture=Metrics.create(fixturePath,fixtureLinks,fixtureProfile,fixtureDays);
assert.equal(fixture.sample(500).km,.5,'recorded progress still uses the source daily total');
assert.equal(fixture.sample(1250).estimated.ascent,10);
assert.equal(fixture.sample(1500).estimated.ascent,10,'descending never removes accumulated ascent');
assert.equal(fixture.sample(1750).estimated.ascent,25,'partial ascent follows the uphill terrain, not elapsed day fraction');
assert.deepEqual(fixture.sample(2000),fixture.sample(3000),'a train adds neither walking distance nor climb, including across a day boundary');
assert.deepEqual(fixture.total,{km:4,ascent:210});
assert.deepEqual(fixture.sample(5000).estimated,{km:2,ascent:60});
assert.deepEqual(fixture.sample(0),{km:0,ascent:0,recorded:{km:0,ascent:0},estimated:{km:0,ascent:0}},'seeking back to Paris clears both kinds of progress');
const route=read('public/trek/route-detail.json'),links=read('public/trek/route-links.json'),profile=read('public/trek/elevation-profile.json');
const data=JSON.parse(readFileSync(new URL('../public/trek/index.html',import.meta.url),'utf8').match(/var DATA = (.*);/)[1]);
const source=JSON.stringify([route,links,profile,data.days]);
const path=Route.buildJourneyPath(route,67,links),metrics=Metrics.create(path,links,profile,data.days);
assert.deepEqual(metrics.recorded,{km:1982,ascent:50339},'the original recordings remain separately recoverable');
assert.equal(metrics.estimated.km,links.features.filter(f=>f.properties.mode==='walk').reduce((sum,f)=>sum+Route.length(f.geometry.coordinates)/1000,0),'display rounding does not reduce estimated walking distance');
assert.deepEqual(data.recorded,metrics.recorded);assert.deepEqual(data.estimated,metrics.estimated);
assert.equal(data.total,metrics.total.km);assert.equal(data.stats.ascent,metrics.total.ascent);
assert(metrics.estimated.km>250&&metrics.estimated.km<270&&metrics.estimated.ascent>1000&&metrics.estimated.ascent<2000,'the estimates remain consistent with the reconstructed corridor');
let last=metrics.sample(0);
for(let d=0;d<=path.total;d+=997){const now=metrics.sample(d);assert(now.km>=last.km&&now.ascent>=last.ascent,'both counters progress monotonically');last=now;}
for(const p of path.pieces.filter(p=>p.mode==='train'))assert.deepEqual(metrics.sample(p.start),metrics.sample(p.end),'neither actual train section advances either counter');
for(const day of data.days){
  const estimate=metrics.day(day.n);assert.equal(day.estimatedKm,estimate.km);assert.equal(day.estimatedAscent,estimate.ascent);
  if(day.n>1){const before=metrics.sample(path.dayDistance(day.n-1,1)),after=metrics.sample(path.dayDistance(day.n,0));assert.deepEqual(before,after,'daily boundaries have no counter jump');}
}
assert(data.days[59].estimatedKm>40&&data.days[60].estimatedKm>40,'the missing Serbian days receive their walking estimates');
assert.deepEqual(metrics.day(67),{km:0,ascent:0},'the arrival day adds no further walk');
assert.deepEqual(metrics.sample(path.total).estimated,metrics.estimated);
assert.equal(JSON.stringify([route,links,profile,data.days]),source,'metric calculations leave their sources unchanged');
console.log(`Walking metrics passed: ${metrics.recorded.km} recorded + ${metrics.estimated.km.toFixed(1)} estimated km; ${metrics.recorded.ascent} recorded + ${metrics.estimated.ascent} estimated metres climbed; trains excluded, reversible continuous counters.`);
