import React,{useEffect,useRef,useState} from 'react';
import {LocateFixed,ChevronDown,Bus,RefreshCw,X} from 'lucide-react';
import {Geolocation} from '@capacitor/geolocation';
import {native} from './api';
import {nearbyStops} from './nearby-stops';
import BusDepartures from './BusDepartures';
import './nearby-departures.css';

export default function NearbyDepartures({stops,routes}) {
  const [nearby,setNearby]=useState(null),[opened,setOpened]=useState(null),[line,setLine]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[locatedAt,setLocatedAt]=useState(null);
  const sequence=useRef(0);
  useEffect(()=>()=>{sequence.current++;},[]);
  function select(stop){setOpened(opened===stop.id?null:stop.id);setLine(stop.lines.find(id=>routes.has(id))||null);}
  async function locate(){
    const id=++sequence.current;setBusy(true);setError('');
    try {
      const options={enableHighAccuracy:true,timeout:12000,maximumAge:0};
      const result=native?await Geolocation.getCurrentPosition(options):await new Promise((resolve,reject)=>{
        if(!navigator.geolocation)return reject(Error('La localisation n’est pas disponible sur cet appareil.'));
        navigator.geolocation.getCurrentPosition(resolve,reject,options);
      });
      if(id!==sequence.current)return;
      if(!Number.isFinite(result.coords.accuracy)||result.coords.accuracy>250)throw Error('Position trop imprécise. Rapprochez-vous d’une fenêtre puis réessayez.');
      if(!Number.isFinite(result.timestamp)||Math.abs(Date.now()-result.timestamp)>30000)throw Error('Position trop ancienne. Réessayez pour actualiser les arrêts proches.');
      const found=nearbyStops(stops,{lat:result.coords.latitude,lon:result.coords.longitude});
      setNearby(found);setLocatedAt(new Date());setOpened(found[0]?.id||null);setLine(found[0]?.lines.find(key=>routes.has(key))||null);
    } catch(e) {
      if(id!==sequence.current)return;
      setError(e.code===1||e.code==='OS-PLUG-GLOC-0003'?'Localisation refusée. Autorisez-la dans les réglages pour voir les départs proches.':e.code===3?'La localisation prend trop de temps. Réessayez.':e.message||'Position indisponible. Réessayez.');
    } finally {if(id===sequence.current)setBusy(false);}
  }
  function clear(){sequence.current++;setBusy(false);setNearby(null);setOpened(null);setLine(null);setError('');setLocatedAt(null);}
  const current=nearby?.find(s=>s.id===opened),route=routes.get(line);
  return <section className="nearby-departures" aria-labelledby="nearby-title">
    <header><span className="nearby-symbol"><Bus size={19}/></span><div><h2 id="nearby-title">Départs autour de moi</h2><p>{nearby?'Les quais proches, leurs prochains passages':'Votre prochain bus ou métro, à deux pas'}</p></div>{nearby&&<button type="button" className="nearby-icon" onClick={clear} aria-label="Masquer les départs proches"><X size={18}/></button>}</header>
    {!nearby&&<button type="button" className="nearby-locate" disabled={busy||!stops.length} onClick={locate}><LocateFixed size={18}/>{busy?'Recherche de votre position…':'Voir les arrêts proches'}</button>}
    {error&&<p role="alert" className="nearby-error">{error}</p>}
    {nearby&&<><div className="nearby-status"><span>Position à {locatedAt?.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} · rayon 800 m</span><button type="button" disabled={busy} onClick={locate} aria-label="Actualiser ma position et les arrêts proches"><RefreshCw size={15} className={busy?'spinning':''}/></button></div>
      {!nearby.length&&<p className="nearby-empty">Aucun quai desservi à moins de 800 m dans les données disponibles. Essayez la recherche de destination.</p>}
      <div className="nearby-stops">{nearby.map(stop=><div className="nearby-stop" key={stop.id}>
        <button type="button" className="nearby-stop-toggle" onClick={()=>select(stop)} aria-expanded={opened===stop.id} aria-controls={'nearby-'+stop.id}><span><strong>{stop.name}</strong><small>{stop.city?stop.city+' · ':''}Quai {stop.id}</small></span><span className="nearby-distance">{Math.round(stop.metres/10)*10} m<ChevronDown size={16}/></span></button>
        {opened===stop.id&&<div id={'nearby-'+stop.id} className="nearby-stop-content"><div className="nearby-lines" role="group" aria-label="Choisir une ligne">{stop.lines.filter(id=>routes.has(id)).map(id=>{const r=routes.get(id);return <button type="button" key={id} aria-pressed={line===id} onClick={()=>setLine(id)}>{r.mode==='metro'?'Métro':r.mode==='tram'?'Tram':'Bus'} {r.name}</button>;})}</div>{route&&current&&<BusDepartures key={stop.id+':'+line} compact leg={{from:current,routeId:line,line:route.name,mode:route.mode}}/>}</div>}
      </div>)}</div>
      <p className="nearby-note">Jusqu’à 4 quais · distances à vol d’oiseau. Réactualisez votre position si vous vous déplacez.</p></>}
    {!nearby&&<p className="nearby-note">Localisation à votre demande, sans suivi continu.</p>}
  </section>;
}
