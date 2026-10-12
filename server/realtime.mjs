import {parseStringPromise,processors} from 'xml2js';
export const SIRI_URL='https://proxy.transport.data.gouv.fr/resource/ilevia-lille-siri-sm';
const value=(o,k)=>o?.[k]?.[0];
const epoch=s=>Date.parse(s)/1000;
const ref=(s,kind)=>typeof s==='string'?s.match(kind==='stop'?/^ILEVIA:StopPoint:BP:([^:]+):LOC$/:/^ILEVIA:Line::([^:]+):LOC$/)?.[1]:undefined;
export async function parseSiri(xml){
 if(xml.length>12000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid XML');
 const doc=await parseStringPromise(xml,{tagNameProcessors:[processors.stripPrefix],explicitArray:true,trim:true,strict:true});
 const service=value(value(doc.Envelope,'Body'),'GetSiriResponse');
 const delivery=value(service,'ServiceDelivery');
 if(!delivery)throw Error('Missing SIRI delivery');
 const rows=[];
 for(const group of delivery.StopMonitoringDelivery||[]){
  if(value(group,'Status')!=='true')continue;
  for(const visit of group.MonitoredStopVisit||[]){
   const journey=value(visit,'MonitoredVehicleJourney'),call=value(journey,'MonitoredCall');
   const row={stop:ref(value(call,'StopPointRef'),'stop'),line:ref(value(journey,'LineRef'),'line'),destination:value(journey,'DestinationName')||'',journey:value(value(journey,'FramedVehicleJourneyRef'),'DatedVehicleJourneyRef')||'',recorded:epoch(value(visit,'RecordedAtTime')),scheduled:epoch(value(call,'AimedDepartureTime')),expected:epoch(value(call,'ExpectedDepartureTime')),cancelled:['cancelled','canceled'].includes(value(call,'DepartureStatus')),monitored:value(journey,'Monitored')==='true'};
   if(row.stop&&row.line&&Number.isFinite(row.recorded)&&(Number.isFinite(row.expected)||row.cancelled&&Number.isFinite(row.scheduled)))rows.push(row);
  }
 }
 return rows;
}
export function mergeDepartures(scheduled,rows,{stop,line,now}){
 const live=rows.filter(r=>r.stop===stop&&r.line===line&&r.monitored&&now-r.recorded<=180&&r.recorded<=now+30&&(r.cancelled?r.scheduled:r.expected)>=now-30&&(r.cancelled?r.scheduled:r.expected)<=now+7200);
 const seen=new Set(),result=[];
 for(const r of live.sort((a,b)=>b.recorded-a.recorded)){
  const key=r.journey?`${r.journey}:${r.scheduled}`:`${r.destination}:${r.scheduled}:${r.expected}`;
  if(seen.has(key))continue;seen.add(key);
  result.push({...r,realtime:true,scheduled:Number.isFinite(r.scheduled)?r.scheduled:null,expected:Number.isFinite(r.expected)?r.expected:null,delaySeconds:Number.isFinite(r.scheduled)&&Number.isFinite(r.expected)?Math.round(r.expected-r.scheduled):null});
 }
 // SIRI and GTFS schedules can differ by seconds and have incompatible trip
 // identifiers. Don't show the same bus twice or invent a cross-feed match.
 if(!result.length)for(const s of scheduled)result.push({...s,realtime:false,expected:null,delaySeconds:null});
 return result.sort((a,b)=>(a.expected??a.scheduled)-(b.expected??b.scheduled)).slice(0,6);
}
export function createRealtime({fetcher=fetch,clock=Date.now,schedule}){
 let rows=[],checked=-Infinity,available=false,pending;
 async function refresh(){
  if(clock()-checked<60000)return;
  if(pending)return pending;
  pending=(async()=>{try{
   const response=await fetcher(SIRI_URL,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/xml'}});
   if(!response.ok)throw Error('Unavailable');
   if(Number(response.headers.get('content-length'))>12000000)throw Error('Oversized');
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>12000000)throw Error('Oversized');chunks.push(chunk);}
   rows=await parseSiri(Buffer.concat(chunks).toString('utf8'));available=true;
  }catch{rows=[];available=false;}finally{checked=clock();pending=null;}})();
  return pending;
 }
 return {async departures(stop,line){
  await refresh();const now=clock()/1000;
  const planned=schedule(stop,line,now);
  const departures=mergeDepartures(planned,rows,{stop,line,now});
  return {stop,line,checkedAt:checked/1000,status:!available?'unavailable':departures.some(r=>r.realtime)?'live':'no_fresh_data',departures,scheduledDepartures:planned,source:'Ilévia / MEL · SIRI',scheduleOnlyRouting:true};
 }};
}

