import { DatabaseSync } from 'node:sqlite';

import { distance } from '../src/distance.js';

import { ApiError } from './store.mjs';



const paris=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});

export function parisDate(epoch){const p=Object.fromEntries(paris.formatToParts(epoch).map(p=>[p.type,p.value]));return p.year+p.month+p.day;}

export function shiftDate(date,days){const d=new Date(Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8)+days));return d.toISOString().slice(0,10).replaceAll('-','');}

// GTFS service-day times are measured from local noon minus twelve hours (DST safe).

export function serviceEpoch(date){const noon=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8),12);const offset=new Intl.DateTimeFormat('en',{timeZone:'Europe/Paris',timeZoneName:'longOffset'}).formatToParts(noon).find(p=>p.type==='timeZoneName').value;const m=offset.match(/GMT([+-])(\d{2}):(\d{2})/);return (noon-(m?(m[1]==='+'?1:-1)*(+m[2]*60+ +m[3])*60000:0))/1000-43200;}



// Connection Scan with one label per stop and boarding count. Keeping onboard

// labels separate permits staying on a vehicle at stops closed for boarding.

export function scanConnections({connections,access,egress,transfers=new Map(),departure,maxBoardings=3,allowedModes=null}){

 const labels=Array.from({length:maxBoardings+1},()=>new Map()),aboard=Array.from({length:maxBoardings+1},()=>new Map());

 for(const [stop,walk]of access)labels[0].set(stop,{time:departure+walk.duration,legs:[{kind:'walk',from:null,to:stop,start:departure,end:departure+walk.duration,...walk}]});

 const offer=(k,stop,label)=>{const old=labels[k].get(stop);if(!old||label.time<old.time)labels[k].set(stop,label);};

 for(const c of connections){if(c.departure<departure||allowedModes&&!allowedModes.has(c.mode))continue;

  for(let k=1;k<=maxBoardings;k++){

   let on=aboard[k].get(c.trip);const at=labels[k-1].get(c.origin);

   const buffer=k===1?30:90;

   if(!on&&c.pickup&&at&&at.time+buffer<=c.departure){on={before:at.legs,board:c.origin,start:c.departure,seq:c.seq,coordinates:[c.origin]};aboard[k].set(c.trip,on);}

   if(!on)continue;

   on.coordinates.push(c.destination);

   if(!c.dropoff)continue;

   const leg={kind:'transit',mode:c.mode,routeId:c.routeId,line:c.line,color:c.color,headsign:c.headsign,trip:c.trip,from:on.board,to:c.destination,start:on.start,end:c.arrival,stops:[...on.coordinates]};

   const label={time:c.arrival,legs:[...on.before,leg]};offer(k,c.destination,label);

   for(const transfer of transfers.get(c.destination)||[]){if(transfer.duration===Infinity)continue;offer(k,transfer.to,{time:c.arrival+transfer.duration,legs:[...label.legs,{kind:'walk',from:c.destination,to:transfer.to,start:c.arrival,end:c.arrival+transfer.duration,duration:transfer.duration,distance:transfer.distance,transfer:true}]});}

  }

 }

 const candidates=[];

 for(let k=1;k<=maxBoardings;k++)for(const [stop,walk]of egress){const label=labels[k].get(stop);if(!label)continue;candidates.push({arrival:label.time+walk.duration,boardings:k,legs:[...label.legs,{kind:'walk',from:stop,to:null,start:label.time,end:label.time+walk.duration,...walk}]});}

 candidates.sort((a,b)=>a.arrival-b.arrival||a.boardings-b.boardings);

 const signatures=new Set();return candidates.filter(c=>{if(candidates.some(other=>other.arrival<=c.arrival&&other.boardings<c.boardings))return false;const key=c.legs.filter(l=>l.kind==='transit').map(l=>l.routeId+':'+l.headsign).join('|');if(signatures.has(key))return false;signatures.add(key);return true;}).slice(0,5);

}



export function createPlanner({path,transit,external,routerURL=process.env.ROUTER_URL||'https://routing.openstreetmap.de/routed-foot/route/v1/foot'}){

 const db=new DatabaseSync(path,{readOnly:true});

 const metadata=Object.fromEntries(db.prepare('SELECT * FROM metadata').all().map(r=>[r.key,JSON.parse(r.value)]));

 const stops=new Map(transit.stops.map(s=>[s.id,s])),routes=new Map(transit.routes.map(r=>[r.id,r]));

 const query=db.prepare(`SELECT c.trip,c.seq,c.origin,c.destination,c.departure,c.arrival,c.pickup,c.dropoff,t.route,t.headsign FROM services s JOIN connections c ON c.service=s.service JOIN trips t ON t.id=c.trip WHERE s.date=? AND c.departure>=? AND c.departure<=? ORDER BY c.departure,c.seq`);

 const transfers=new Map();

 for(const a of transit.stops){const list=[];for(const b of transit.stops){if(a.id===b.id||Math.abs(a.lat-b.lat)>.0025||Math.abs(a.lon-b.lon)>.004)continue;const d=distance(a,b);if(d<=220)list.push({to:b.id,duration:Math.ceil(d*1.4/1.25)+30,distance:d*1.4});}if(list.length)transfers.set(a.id,list);}

 const coord=p=>`${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;

 function candidates(p){const sorted=transit.stops.map(s=>({...s,d:distance(p,s)})).filter(s=>s.d<=1200).sort((a,b)=>a.d-b.d);const selected=sorted.slice(0,20);for(const mode of ['metro','tram'])for(const s of sorted.filter(s=>s.lines.some(id=>routes.get(id)?.mode===mode)).slice(0,4))if(!selected.some(x=>x.id===s.id))selected.push(s);return selected.slice(0,28);}

 async function walk(a,b){if(distance(a,b)<3)return {duration:0,distance:0,geometry:{type:'LineString',coordinates:[[a.lon,a.lat],[b.lon,b.lat]]},steps:[]};const data=await external('route',`${routerURL}/${coord(a)};${coord(b)}?overview=full&geometries=geojson&steps=true`);if(data.code!=='Ok'||!data.routes?.[0])throw new ApiError(404,'Aucun accès piéton trouvé.');const r=data.routes[0];const gap=(data.waypoints||[]).reduce((sum,p)=>sum+(p.distance||0),0);if((data.waypoints||[]).some(p=>p.distance>200))throw new ApiError(404,'Ce point est trop éloigné d’un chemin accessible à pied.');return {duration:Math.ceil(r.duration+gap/1.25),distance:Math.round(r.distance+gap),geometry:r.geometry,steps:r.legs.flatMap(l=>l.steps)};}

 async function table(point,list,reverse=false){if(!list.length)return new Map();const coords=[point,...list];const indices=list.map((_,i)=>i+1).join(';');const url=`${routerURL.replace('/route/','/table/')}/${coords.map(coord).join(';')}?sources=${reverse?indices:'0'}&destinations=${reverse?'0':indices}&annotations=duration,distance`;const data=await external('route',url);if(data.code!=='Ok'||!data.durations)throw new ApiError(503,'Le calcul des accès à pied est indisponible.');const result=new Map();list.forEach((s,i)=>{const t=reverse?data.durations[i]?.[0]:data.durations[0]?.[i];const d=reverse?data.distances?.[i]?.[0]:data.distances?.[0]?.[i];const a=reverse?data.sources?.[i]:data.sources?.[0],b=reverse?data.destinations?.[0]:data.destinations?.[i];if(t!==null&&Number.isFinite(t)&&Number.isFinite(d)&&d<=1800&&(a?.distance||0)<200&&(b?.distance||0)<200){const gap=(a?.distance||0)+(b?.distance||0);result.set(s.id,{duration:Math.ceil(t+gap/1.25),distance:Math.round(d+gap)});}});return result;}

 function connections(departure){const date=parisDate(departure*1000),all=[];for(const day of [shiftDate(date,-1),date,shiftDate(date,1)]){const epoch=serviceEpoch(day);for(const c of query.all(day,Math.max(0,departure-epoch),departure+4*3600-epoch)){const r=routes.get(c.route);if(!r)continue;all.push({...c,trip:day+':'+c.trip,departure:epoch+c.departure,arrival:epoch+c.arrival,mode:r.mode,routeId:r.id,line:r.name,color:r.color});}}return all.sort((a,b)=>a.departure-b.departure||a.seq-b.seq);}

 function enrich(candidate,departure){return {...candidate,duration:Math.ceil(candidate.arrival-departure),departure,walking:Math.ceil(candidate.legs.filter(l=>l.kind==='walk').reduce((n,l)=>n+l.duration,0)),changes:Math.max(0,candidate.boardings-1),legs:candidate.legs.map(l=>({...l,from:l.from?stops.get(l.from):null,to:l.to?stops.get(l.to):null,...(l.kind==='transit'?{geometry:{type:'LineString',coordinates:l.stops.map(id=>{const s=stops.get(id);return[s.lon,s.lat];})},viaStops:l.stops.map(id=>{const s=stops.get(id);return {id:s.id,name:s.name,lat:s.lat,lon:s.lon};}),stopCount:l.stops.length-1}:{} )}))};}

 return {metadata,close:()=>db.close(),departures(stop,line,now){

 const result=[];

 const q=db.prepare(`SELECT c.trip,c.departure,t.headsign FROM connections c JOIN services s ON s.service=c.service JOIN trips t ON t.id=c.trip WHERE s.date=? AND c.origin=? AND t.route=? AND c.pickup=1 AND c.departure>=? AND c.departure<=? ORDER BY c.departure LIMIT 6`);

 const day=parisDate(now*1000);

 for(const date of [shiftDate(day,-1),day,shiftDate(day,1)]){const base=serviceEpoch(date);for(const row of q.all(date,stop,line,now-base,now+7200-base))result.push({trip:row.trip,scheduled:base+row.departure,destination:row.headsign,stop,line});}

 return result.sort((a,b)=>a.scheduled-b.scheduled).slice(0,6);

 },async plan({from,to,departure=Date.now(),mode='all'}){

  const start=Math.floor(departure/1000),date=parisDate(departure);let direct;try{const w=await walk(from,to);direct=enrich({arrival:start+w.duration,boardings:0,legs:[{kind:'walk',from:null,to:null,start,end:start+w.duration,...w}]},start);}catch(e){if(mode==='walk')throw e;}

  if(mode==='walk')return {journeys:[{...direct,id:'walk',label:'À pied'}],schedule:metadata};

  if(date<metadata.firstDate||date>metadata.lastDate){if(direct)return{journeys:[{...direct,id:'walk',label:'À pied'}],warning:'Les horaires Ilévia ne couvrent pas cette date. Seule la marche est disponible.',schedule:metadata};throw new ApiError(404,'Les horaires Ilévia ne couvrent pas cette date.');}

  let access,egress,cs;try{access=await table(from,candidates(from));egress=await table(to,candidates(to),true);cs=connections(start);}catch(e){if(direct)return{journeys:[{...direct,id:'walk',label:'À pied'}],warning:'Transports non calculés : '+e.message,schedule:metadata};throw e;}

  const localTransfers=new Map([...transfers].map(([k,v])=>[k,v.map(t=>({...t}))]));let confirmed=[];const exact=new Map();let scans=0;let verificationError=false;

  // Verify every walking leg of the selected journeys against OSRM. If its real

  // duration misses a vehicle, update the access/transfer graph and scan again.

  while(scans++<6){confirmed=[];let choices=scanConnections({connections:cs,access,egress,transfers:localTransfers,departure:start,allowedModes:mode==='bus'?new Set(['bus']):null}).slice(0,3);
   if(mode!=='bus'&&!choices.some(c=>c.legs.some(l=>l.mode==='metro'))){
    const metroAccess=new Map([...access].filter(([id])=>stops.get(id)?.lines.some(r=>routes.get(r)?.mode==='metro')));
    const metro=scanConnections({connections:cs,access:metroAccess,egress,transfers:localTransfers,departure:start})[0];
    if(metro){choices=choices.slice(0,2);choices.push(metro);}
   }
   let changed=false;

   for(const candidate of choices.slice(0,3)){

    let valid=true;

    for(const leg of candidate.legs.filter(l=>l.kind==='walk')){const a=leg.from?stops.get(leg.from):from,b=leg.to?stops.get(leg.to):to,key=coord(a)+';'+coord(b);let w=exact.get(key);if(!w){try{w=await walk(a,b);exact.set(key,w);}catch(e){if(e.status!==404)verificationError=true;w={duration:Infinity};exact.set(key,w);}}

     if(w.duration!==leg.duration){changed=true;valid=false;if(!leg.from){if(Number.isFinite(w.duration))access.set(leg.to,w);else access.delete(leg.to);}else if(!leg.to){if(Number.isFinite(w.duration))egress.set(leg.from,w);else egress.delete(leg.from);}else{const t=localTransfers.get(leg.from)?.find(t=>t.to===leg.to);if(t)Object.assign(t,w);}}

     Object.assign(leg,w);

    }

    if(valid&&!confirmed.some(c=>JSON.stringify(c.legs.filter(l=>l.kind==='transit').map(l=>l.trip))===JSON.stringify(candidate.legs.filter(l=>l.kind==='transit').map(l=>l.trip))))confirmed.push(candidate);

   }

   if(!changed)break;

  }

  const journeys=confirmed.map((c,i)=>({...enrich(c,start),id:'transit-'+i,label:'Transports + marche'}));if(direct)journeys.push({...direct,id:'walk',label:'À pied'});journeys.sort((a,b)=>a.arrival-b.arrival||a.changes-b.changes);

  if(!journeys.length)throw new ApiError(404,'Aucun trajet trouvé à cette heure. Essayez un autre départ.');

  return {journeys,schedule:metadata,warning:confirmed.length?(scans>6?'Certaines alternatives n’ont pas pu être vérifiées.':null):'Aucun transport trouvé dans les 4 prochaines heures avec les accès à pied disponibles.',realtime:false,limits:{maxChanges:2,maxAccessDistance:1800}};

 }};

}

