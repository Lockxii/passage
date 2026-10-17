export function freshVisits(data,now){
 if(data?.status!=='live')return [];
 return (data.departures||[]).filter(r=>{
  const time=r.cancelled?r.scheduled:r.expected??r.scheduled;
  return r.realtime&&Number.isFinite(r.recorded)&&now-r.recorded<=180&&r.recorded<=now+30&&Number.isFinite(time)&&time>=now-30&&time<=now+7200;
 });
}
export function disruptionContext(data,now,failed=false){
 if(failed||data?.status==='unavailable')return {state:'unavailable'};
 const visits=freshVisits(data,now);
 const cancelled=visits.filter(r=>r.cancelled),delayed=visits.filter(r=>!r.cancelled&&Number.isFinite(r.delaySeconds)&&r.delaySeconds>=60);
 if(cancelled.length||delayed.length)return {state:'affected',cancelled:cancelled.length,delayed:delayed.length,maxDelay:delayed.length?Math.round(Math.max(...delayed.map(r=>r.delaySeconds))/60):0,recorded:Math.min(...[...cancelled,...delayed].map(r=>r.recorded))};
 if(!data)return {state:'loading'};
 if(!visits.length&&(data.departures||[]).some(r=>r.realtime&&Number.isFinite(r.recorded)&&now-r.recorded>180))return {state:'stale'};
 return {state:visits.length?'no_observed_impact':'no_fresh_data'};
}
