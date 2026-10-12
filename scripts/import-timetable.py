"""Compile GTFS into a local, read-only journey-planning database (stdlib only)."""
import csv, io, json, sqlite3, sys, zipfile, pathlib, datetime
root=pathlib.Path(__file__).resolve().parents[1]
target=root/'resources'/'timetable.sqlite'
target.parent.mkdir(exist_ok=True)
temporary=target.with_suffix('.new.sqlite')
if temporary.exists(): temporary.unlink()
z=zipfile.ZipFile(sys.argv[1])
def rows(name):
    return csv.DictReader(io.TextIOWrapper(z.open(name),encoding='utf-8-sig'))
def seconds(text):
    h,m,s=map(int,text.split(':'));return h*3600+m*60+s
db=sqlite3.connect(temporary)
db.executescript('''PRAGMA journal_mode=OFF;
CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT);
CREATE TABLE services(date TEXT,service TEXT,PRIMARY KEY(date,service)) WITHOUT ROWID;
CREATE TABLE trips(id TEXT PRIMARY KEY,route TEXT,headsign TEXT);
CREATE TABLE connections(trip TEXT,service TEXT,seq INTEGER,origin TEXT,destination TEXT,departure INTEGER,arrival INTEGER,pickup INTEGER,dropoff INTEGER);
''')
services=set()
if 'calendar.txt' in z.namelist():
    days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    for r in rows('calendar.txt'):
        d=datetime.datetime.strptime(r['start_date'],'%Y%m%d').date();end=datetime.datetime.strptime(r['end_date'],'%Y%m%d').date()
        while d<=end:
            if r[days[d.weekday()]]=='1': services.add((d.strftime('%Y%m%d'),r['service_id']))
            d+=datetime.timedelta(days=1)
if 'calendar_dates.txt' in z.namelist():
    for r in rows('calendar_dates.txt'):
        key=(r['date'],r['service_id'])
        if r['exception_type']=='1':services.add(key)
        else:services.discard(key)
db.executemany('INSERT INTO services VALUES (?,?)',sorted(services))
trips={r['trip_id']:r for r in rows('trips.txt')}
db.executemany('INSERT INTO trips VALUES (?,?,?)',[(i,r['route_id'],r.get('trip_headsign','')) for i,r in trips.items()])
times={}
for r in rows('stop_times.txt'):
    if not r['arrival_time'] or not r['departure_time']:continue
    times.setdefault(r['trip_id'],[]).append((int(r['stop_sequence']),r['stop_id'],seconds(r['arrival_time']),seconds(r['departure_time']),int(r.get('pickup_type') or 0),int(r.get('drop_off_type') or 0)))
batch=[];count=0
for trip,values in times.items():
    values.sort()
    for a,b in zip(values,values[1:]):
        if b[2]<a[3]:continue
        batch.append((trip,trips[trip]['service_id'],a[0],a[1],b[1],a[3],b[2],int(a[4]==0),int(b[5]==0)))
        count+=1
        if len(batch)>=10000:
            db.executemany('INSERT INTO connections VALUES (?,?,?,?,?,?,?,?,?)',batch);batch=[]
db.executemany('INSERT INTO connections VALUES (?,?,?,?,?,?,?,?,?)',batch)
db.executescript('CREATE INDEX connections_service_time ON connections(service,departure); CREATE INDEX connections_trip_sequence ON connections(trip,seq);')
dates=sorted({d for d,s in services})
metadata={'source':'https://media.ilevia.fr/opendata/gtfs.zip','imported':datetime.date.today().isoformat(),'firstDate':dates[0],'lastDate':dates[-1],'timezone':'Europe/Paris','license':'Licence Ouverte 2.0','connections':count,'scheduledTrips':len(trips),'hasShapes':False}
db.executemany('INSERT INTO metadata VALUES (?,?)',[(k,json.dumps(v)) for k,v in metadata.items()]);db.commit();db.close()
temporary.replace(target)
print(json.dumps(metadata));print(target)
