import React,{useEffect,useState} from 'react';
import {request} from './api';
import {timeLabel} from './guidance';
export default function BusDepartures({leg}){
 const [data,setData]=useState(null),[failed,setFailed]=useState(false),[now,setNow]=useState(Date.now()/1000);
 const stop=leg.from?.id,line=leg.routeId;
 useEffect(()=>{
  let ended=false,busy=false;setData(null);setFailed(false);
  async function refresh(){if(ended||busy||document.hidden||!stop||!line)return;busy=true;
   try{const result=await request(`/departures?stop=${encodeURIComponent(stop)}&line=${encodeURIComponent(line)}`,{},false);if(!ended){setData(result);setFailed(false);}}
   catch{if(!ended){setData(null);setFailed(true);}}finally{busy=false;}
  }
  refresh();const timer=setInterval(refresh,60000);const tick=setInterval(()=>setNow(Date.now()/1000),15000);
  document.addEventListener('visibilitychange',refresh);
  return()=>{ended=true;clearInterval(timer);clearInterval(tick);document.removeEventListener('visibilitychange',refresh);};
 },[stop,line]);
 if(!stop||!line)return null;
 const fresh=(data?.departures||[]).filter(r=>r.realtime&&now-r.recorded<=180&&r.recorded<=now+30&&(r.expected??r.scheduled)>=now-30);
 const live=fresh.length>0;
 const entries=live?fresh:(data?.scheduledDepartures||[{scheduled:leg.start,destination:leg.headsign}]).filter(r=>r.scheduled>=now-30).map(r=>({...r,realtime:false}));
 return <section className="bus-departures" aria-label={`Prochains bus ${leg.line}`}>
  <div className="bus-departures-heading"><strong>Bus {leg.line} · prochains passages</strong><span className={live?'live-badge':''}>{live?'En direct':'Théorique'}</span></div>
  <p>{leg.from.name} · toutes les destinations de ce quai</p>
  <ul>{entries.slice(0,4).map((r,i)=>{const realtime=r.realtime,at=realtime?r.expected??r.scheduled:r.scheduled;return <li key={(r.journey||r.trip||'')+':'+i}>
   <div><strong>{Number.isFinite(at)?timeLabel(at):'Horaire indisponible'}</strong><span>{r.destination}</span></div>
   <small>{realtime&&r.cancelled?'Supprimé':realtime?(r.delaySeconds===null?'Prévision actualisée':Math.abs(r.delaySeconds)<60?'À l’heure':r.delaySeconds>0?`Retard +${Math.round(r.delaySeconds/60)} min`:`Avance ${Math.round(-r.delaySeconds/60)} min`):'Horaire théorique'}{realtime&&Number.isFinite(r.scheduled)&&r.expected!==r.scheduled&&!r.cancelled?` · prévu ${timeLabel(r.scheduled)}`:''}</small>
  </li>})}</ul>
  {!entries.length&&<p>{data?"Aucun départ prévu dans les deux prochaines heures.":"Prochains passages indisponibles. Consultez l’horaire théorique du trajet."}</p>}
  <p className="bus-source">{live?'Ilévia / MEL · actualisation chaque minute':failed||data?.status==='unavailable'?'Temps réel indisponible · horaires théoriques conservés':data?'Pas de donnée récente pour ce bus · horaires théoriques': 'Recherche des prochains passages…'}</p>
  <p className="bus-source">Le trajet et son arrivée restent calculés sur les horaires théoriques.</p>
 </section>;
}
