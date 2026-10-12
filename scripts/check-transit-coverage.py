"""Compare every served stop and line in an official local GTFS archive with the app."""
import csv,io,json,zipfile,sqlite3,collections,sys,pathlib,unicodedata
root=pathlib.Path(__file__).resolve().parents[1]
z=zipfile.ZipFile(sys.argv[1])
def rows(name):return csv.DictReader(io.TextIOWrapper(z.open(name),encoding='utf-8-sig'))
trips={r['trip_id']:r['route_id'] for r in rows('trips.txt')};served=collections.defaultdict(set)
for r in rows('stop_times.txt'):served[r['stop_id']].add(trips[r['trip_id']])
j=json.loads((root/'public/transit.json').read_text(encoding='utf-8'));stops={s['id']:s for s in j['stops']};routes={r['id']:r for r in j['routes']}
missing=sorted(set(served)-set(stops));wrong=[id for id in served if id in stops and set(stops[id]['lines'])!=served[id]]
db=sqlite3.connect(root/'resources/timetable.sqlite');refs={r[0] for r in db.execute('select origin from connections union select destination from connections')};db.close()
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if c.isalnum())
cities={}
for city in ['Loos','Tourcoing','Lille','Haubourdin','Roubaix',"Villeneuve d'Ascq"]:
 matched=[s for s in stops.values() if norm(s['city'])==norm(city)]
 cities[city]={'quais':len(matched),'quaisBus':sum(any(routes[r]['mode']=='bus' for r in s['lines']) for s in matched)}
result={'source':j['source'],'servedGTFS':len(served),'imported':len(stops),'routes':len(routes),'busRoutes':sum(r['mode']=='bus' for r in routes.values()),'busStops':sum(any(routes[r]['mode']=='bus' for r in s['lines']) for s in stops.values()),'missingStops':missing,'lineMismatches':wrong,'missingPlannerStops':sorted(refs-set(stops)),'withoutCity':sum(not s['city'] for s in stops.values()),'cities':cities}
(root/'evidence/stop-coverage.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
assert not missing and not wrong and not result['missingPlannerStops']
