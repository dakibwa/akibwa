#!/usr/bin/env python3
"""Explicit maintenance: the mapped Wörthersee crossing, not a recorded sailing."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
way_ids = [245847688, 245844736, 234804187, 234804186, 234803985, 234804265, 234805086]
cache = Path(os.environ.get('TREK_BOAT_CACHE', '/tmp/trek-boat-osm.json'))
if not cache.exists():
    query = '[out:json][timeout:60];way(id:' + ','.join(map(str, way_ids)) + ');out geom;'
    request = Request('https://overpass-api.de/api/interpreter', data=query.encode(), headers={'User-Agent': 'akibwa-trek-boat/1.0'})
    with urlopen(request, timeout=75) as response:
        cache.write_bytes(response.read())
source = json.loads(cache.read_text())
ways = {w['id']: w for w in source['elements'] if w['type'] == 'way'}
points = []
for way_id in way_ids:
    way = ways[way_id]
    assert way['tags'].get('route') == 'ferry', f'Way {way_id} is no longer a ferry route; review it'
    part = [[p['lon'], p['lat']] for p in reversed(way['geometry'])]
    if points:
        assert points[-1] == part[0], f'Disconnected ferry way {way_id}; review the route'
        part = part[1:]
    points.extend(part)
assert points[0] == [14.0443204, 46.611876] and points[-1] == [14.2524683, 46.6221666]
result = {
    'type': 'FeatureCollection', 'source': 'OpenStreetMap contributors',
    'sourceUrl': 'https://www.openstreetmap.org/copyright',
    'snapshot': source['osm3s']['timestamp_osm_base'],
    'method': 'Mapped ferry ways through the operator’s published stops. The Wörthersee crossing is inferred from adjacent recordings and the traveller’s qualified recollection. Exact 2019 service, stops and vessel are unverified.',
    'operatorRoute': 'https://www.woertherseeschifffahrt.at/wp-content/uploads/2026/03/Timetable-2026.pdf',
    'features': [{'type': 'Feature', 'properties': {
        'gap': 31, 'from': 'Velden', 'to': 'Klagenfurt/See',
        'via': ['Dellach', 'Pörtschach/Werzer', 'Pörtschach/Landspitz', 'Maria Wörth', 'Reifnitz', 'Krumpendorf'],
        'wayIds': way_ids,
    }, 'geometry': {'type': 'LineString', 'coordinates': points}}],
}
(root / 'data/trek-boat-routes.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Saved {len(points)} mapped ferry points, Velden to Klagenfurt/See; sailing remains estimated.')
