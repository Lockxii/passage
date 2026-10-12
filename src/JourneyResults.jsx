import BusDepartures from './BusDepartures.jsx';

import React, {useState} from 'react';

import {walkingInstruction} from './guidance';

import {Navigation,Footprints, Bus, TrainFront, TramFront, Clock, ChevronDown, ChevronRight, Map, RefreshCw, Check} from 'lucide-react';

const minutes=s=>Math.max(1,Math.ceil(s/60));

const time=s=>new Date(s*1000).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});

const icons={bus:Bus,metro:TrainFront,tram:TramFront};

export default function JourneyResults({journeys,route,onSelect,onMap,onRefresh,onStart,to,warning}){

 const [expanded,setExpanded]=useState(false);

 return <section className="route-result" aria-label="Itinéraires proposés">

  <div className="results-heading"><span>{journeys.length} trajet{journeys.length>1?'s':''} proposé{journeys.length>1?'s':''}</span><button onClick={onRefresh} aria-label="Actualiser les itinéraires"><RefreshCw size={16}/></button></div>

  <div className="journey-options">{journeys.map((j,i)=><button key={j.id} className={'journey-option '+(j.id===route.id?'chosen':'')} aria-pressed={j.id===route.id} onClick={()=>{onSelect(j);setExpanded(false);}}>

   <div className="option-top"><span className={'option-label '+(i===0?'recommended':'')}>{i===0?<><Check size={13}/>Le plus rapide</>:j.boardings?(j.legs.some(l=>l.mode==='metro')?'Via métro':'Autre possibilité'):'Tout à pied'}</span><strong>{minutes(j.duration)} <small>min</small></strong></div>

   <div className="option-bottom"><span className="leg-icons"><Footprints size={17}/>{j.legs.filter(l=>l.kind==='transit').map((l,k)=>{const Icon=icons[l.mode]||Bus;return <React.Fragment key={k}><ChevronRight size={12}/><span className="transit-chip"><Icon size={15}/>{l.line}</span></React.Fragment>})}</span><span className="arrival-time">{time(j.departure)} — {time(j.arrival)}</span></div>

   <small className="option-meta">{Math.ceil(j.walking/60)} min à pied{j.boardings?` · ${j.changes===0?'Sans correspondance':j.changes+' correspondance'+(j.changes>1?'s':'')}`:''}</small>

  </button>)}</div>

  {warning&&<p className="journey-warning" role="status">{warning}</p>}

  {route.legs.filter(l=>l.kind==='transit'&&l.mode==='bus').map((leg,i)=><BusDepartures key={leg.from?.id+':'+leg.routeId+':'+i} leg={leg}/>)}

  <button className="primary start-guidance" onClick={onStart}><Navigation size={19}/>Démarrer le guidage<ChevronRight size={18}/></button>

  <div className="itinerary-actions"><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded} aria-controls="journey-steps">{expanded?'Masquer les étapes':'Étapes du trajet'}<ChevronDown size={17} style={{transform:expanded?'rotate(180deg)':undefined}}/></button><button onClick={onMap}><Map size={17}/>Carte</button></div>

  {expanded&&<div id="journey-steps"><div className="journey-arrival">Arrivée à <strong>{time(route.arrival)}</strong><span>{to?.name}</span></div>

  <ol className="journey-timeline">{route.legs.map((leg,i)=>{const Icon=leg.kind==='walk'?Footprints:(icons[leg.mode]||Bus);const wait=i?leg.start-route.legs[i-1].end:0;return <React.Fragment key={i}>{wait>30&&<li className="wait-leg"><Clock size={15}/><span>Attendre {minutes(wait)} min · départ {time(leg.start)}</span></li>}<li className="journey-leg"><span className={'timeline-icon '+leg.kind}><Icon size={18}/></span><div><strong>{leg.kind==='walk'?(leg.duration===0?'Vous êtes sur place':`Marcher ${minutes(leg.duration)} min`):`${leg.mode==='metro'?'Métro':leg.mode==='tram'?'Tram':'Bus'} ${leg.line} · ${minutes(leg.end-leg.start)} min`}</strong><p>{leg.kind==='walk'?`Jusqu’à ${leg.to?.name||to?.name}`:`${leg.from?.name} → ${leg.to?.name}`}</p><small>{time(leg.start)} – {time(leg.end)} · {leg.kind==='walk'?`${Math.round(leg.distance)} m`:`Direction ${leg.headsign} · ${leg.stopCount} arrêt${leg.stopCount>1?'s':''}`}</small>{leg.kind==='transit'&&leg.viaStops?.length>2&&<details className="ride-stops"><summary>Voir les arrêts</summary><ol>{leg.viaStops.map((stop,i)=><li key={stop.id+':'+i}>{stop.name}{i===leg.viaStops.length-1?' · Descendre ici':''}</li>)}</ol></details>}{leg.kind==='walk'&&leg.steps?.length>1&&<details><summary>Rues à suivre</summary><ul>{leg.steps.filter(s=>s.distance>0).map((s,k)=><li key={k}>{walkingInstruction(s)} · {Math.round(s.distance)} m</li>)}</ul></details>}</div></li></React.Fragment>})}</ol></div>}

  <p className="journey-notice">Itinéraire calculé sur horaires théoriques{route.boardings?' · Tracé des transports schématique':''}</p>

 </section>

}

