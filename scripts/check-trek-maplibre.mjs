// Exercise the vendored retention routine with the mixed tile zooms produced
// by terrain during a phone/desktop resize. This crashed before the local fix.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/trek/vendor/maplibre-gl.js',import.meta.url),'utf8');
const start=source.indexOf('_updateRetainedTiles(e,t){'),end=source.indexOf('_updateLoadedParentTileCache(){',start);
assert(start>0&&end>start,'review this regression when replacing MapLibre');
const update=new Function('xe','return function'+source.slice(start+'_updateRetainedTiles'.length,end))({maxOverzooming:10,maxUnderzooming:3});
for(const [zoom,tileZoom,maxZoom] of [[12,14,14],[14,14,14],[12,12,14]]){
  const children=Array.from({length:tileZoom>=maxZoom?1:4},(_,i)=>({key:'child-'+i}));
  const id={key:'ideal',overscaledZ:tileZoom,children:()=>children};
  const tiles={ideal:{hasData:()=>false,wasRequested:()=>true}};
  for(const child of children)tiles[child.key]={hasData:()=>true};
  const cache={_source:{minzoom:0,maxzoom:maxZoom},_tiles:tiles,_addTile:()=>tiles.ideal,getTile:id=>tiles[id.key],
    _retainLoadedChildren:(missing,z,max,retain)=>{for(const child of children)retain[child.key]=child;}};
  const kept=update.call(cache,[id],zoom);
  assert.equal(kept.ideal,id);
  for(const child of children)assert.equal(kept[child.key],child,'loaded children cover both normal and overzoomed terrain tiles');
}
console.log('MapLibre retention check passed: mixed terrain zooms retain one overzoomed child or four normal children without crashing.');
