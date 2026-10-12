"""Import a local Ilévia GTFS archive; no live vehicle/inspector data."""
import csv, io, json, sys, zipfile, pathlib, datetime, re
z = zipfile.ZipFile(sys.argv[1])
def rows(name):
    return csv.DictReader(io.TextIOWrapper(z.open(name), encoding='utf-8-sig'))
routes = {r['route_id']: {'id':r['route_id'], 'name':r['route_short_name'], 'title':r['route_long_name'], 'mode':'metro' if r['route_type']=='1' else 'tram' if r['route_type']=='0' else 'bus', 'color':r.get('route_color','')} for r in rows('routes.txt')}
trips = {t['trip_id']: t['route_id'] for t in rows('trips.txt')}
serves = {}
for t in rows('stop_times.txt'):
    serves.setdefault(t['stop_id'],set()).add(trips[t['trip_id']])
stops=[]
for s in rows('stops.txt'):
    if s['stop_id'] not in serves: continue
    city_match=re.search(r'\b\d{4,5}\s+(.+?)(?:\s+-|$)',s.get('stop_desc',''))
    city=city_match.group(1).strip().title() if city_match else ''
    stops.append({'city':city,'parent':s.get('parent_station',''),'search':s.get('stop_desc',''),'id':s['stop_id'],'name':s['stop_name'],'lat':float(s['stop_lat']),'lon':float(s['stop_lon']), 'lines':sorted(serves[s['stop_id']])})
out=pathlib.Path(__file__).resolve().parents[1]/'public'/'transit.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'source':'https://media.ilevia.fr/opendata/gtfs.zip','imported':datetime.date.today().isoformat(),'routes':list(routes.values()),'stops':stops},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(stops)} stops / {len(routes)} routes -> {out}')
