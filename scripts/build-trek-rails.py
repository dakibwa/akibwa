#!/usr/bin/env python3
"""Explicit maintenance: derive the two railway alignments from cached public OSM ways."""
import json, math, heapq, os, urllib.request, urllib.parse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cache=Path(os.environ.get('TREK_RAIL_CACHE','/tmp/trek-rail-osm'));cache.mkdir(parents=True,exist_ok=True)
bounds={'germany':'48.74,8.66,48.98,9.23','croatia':'45.44,17.16,46.02,18.35'}
def metres(a,b):return 111195*math.hypot((b[0]-a[0])*math.cos((a[1]+b[1])*math.pi/360),b[1]-a[1])
features=[]
for region,gap,names in [('germany',15,['Pforzheim Hauptbahnhof','Mühlacker','Vaihingen (Enz)','Bietigheim-Bissingen','Ludwigsburg','Stuttgart Hauptbahnhof']),('croatia',38,['Pitomača','Virovitica','Slatina','Čačinci','Đurđenovac','Našice','Koška'])]:
 file=cache/(region+'-current.json')
 if not file.exists():
  bbox=bounds[region];query=f'[out:json][timeout:35];(way[railway=rail]({bbox});node[railway=station]({bbox}););out body geom;'
  request=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'AkibwaTrek/1.0 (railway illustration)'})
  with urllib.request.urlopen(request,timeout=50) as response:payload=json.load(response)
  assert payload.get('elements') and not payload.get('remark'), 'Incomplete railway response'
  file.write_text(json.dumps(payload))
 data=json.loads(file.read_text());points={};graph={};ways={}
 stations={e['tags']['name']:e for e in data['elements'] if e['type']=='node' and e.get('tags',{}).get('name')}
 for w in data['elements']:
  if w['type']!='way':continue
  tags=w.get('tags',{});ways[w['id']]=w
  penalty=6 if tags.get('service') in ['siding','yard','spur'] else 1
  for i,n in enumerate(w['nodes']):points[n]=[w['geometry'][i]['lon'],w['geometry'][i]['lat']]
  for a,b in zip(w['nodes'],w['nodes'][1:]):
   length=metres(points[a],points[b]);weight=length*penalty
   graph.setdefault(a,[]).append((b,weight,w['id']));graph.setdefault(b,[]).append((a,weight,w['id']))
 def nearest(name):
  s=stations[name];p=[s['lon'],s['lat']]
  candidates=sorted((metres(p,coord),n) for n,coord in points.items() if n in graph and any(ways[w].get('tags',{}).get('service') not in ['siding','yard','spur'] for _,_,w in graph[n]))
  d,n=candidates[0]
  assert d<220,(name,d)
  print(name,'snap',round(d),n,flush=True);return n
 def solve(start,goal):
  todo=[(0,start)];cost={start:0};parents={}
  while todo:
   dist,node=heapq.heappop(todo)
   if dist!=cost[node]:continue
   if node==goal:break
   for target,weight,way in graph[node]:
    next=dist+weight
    if next<cost.get(target,math.inf):cost[target]=next;parents[target]=(node,way);heapq.heappush(todo,(next,target))
  assert goal in parents,('No railway path',start,goal)
  nodes=[goal];edges=[]
  while nodes[-1]!=start:
   parent,way=parents[nodes[-1]];edges.append(way);nodes.append(parent)
  return nodes[::-1],edges[::-1]
 anchors=[nearest(name) for name in names];route=[];edges=[]
 for a,b in zip(anchors,anchors[1:]):
  nodes,segment=solve(a,b);route.extend(nodes if not route else nodes[1:]);edges.extend(segment)
 coords=[points[n] for n in route];length=sum(metres(a,b) for a,b in zip(coords,coords[1:]));assert 40000<length<145000,(region,length)
 assert len(set(route))==len(route),(region,'Loop/backtrack')
 structures=[]
 for i,wid in enumerate(edges):
  tags=ways[wid].get('tags',{});kind='tunnel' if tags.get('tunnel') not in [None,'no'] else 'bridge' if tags.get('bridge') not in [None,'no'] else None
  if kind:
   if structures and structures[-1]['type']==kind and structures[-1]['to']==i:structures[-1]['to']=i+1
   else:structures.append({'from':i,'to':i+1,'type':kind})
 features.append({'type':'Feature','properties':{'gap':gap,'from':names[0],'to':names[-1],'via':names[1:-1],'snapshot':data['osm3s']['timestamp_osm_base'],'wayIds':list(dict.fromkeys(edges)),'structures':structures},'geometry':{'type':'LineString','coordinates':coords}})
 print(region,round(length/1000,2),'km',len(coords),'points',len(structures),'structures',flush=True)
result={'type':'FeatureCollection','version':1,'source':'© OpenStreetMap contributors','sourceUrl':'https://www.openstreetmap.org/copyright','method':'Paths along connected mapped railway ways through the named regional stations. Station choices are inferred from the adjacent approved 2019 recordings; they do not identify the exact service taken. Track geometry is from the stated map snapshots.','features':features}
(root/'data/trek-rail-routes.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
