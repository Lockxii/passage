import {remainingWalk,transitHint} from './live-navigation';
import BusDepartures from './BusDepartures.jsx';

import React,{useEffect,useState,useRef} from 'react';

import {Footprints,TrainFront,MapPin,Check,ChevronLeft,ChevronRight,LocateFixed,Square,RefreshCw,ArrowUp,CornerUpLeft,CornerUpRight,Volume2,VolumeX} from 'lucide-react';

import {Geolocation} from '@capacitor/geolocation';

import {gpsDecision} from './gps-guidance';

import {native} from './api';

import {departurePassed,timeLabel} from './guidance';

export default function Guidance({steps,index,onIndex,onStop,onPosition,onReplan,route,canAutoReplan}){

 const [tracking,setTracking]=useState(true),[position,setPosition]=useState(null),[error,setError]=useState(''),[now,setNow]=useState(Date.now()/1000);

 const step=steps[index];

 const gpsState=useRef({}),busState=useRef({});
 const [busMessage,setBusMessage]=useState(null),[voice,setVoice]=useState(false);
 const fresh=position&&now-position.timestamp/1000<=10&&position.accuracy<=25;
 const remaining=fresh&&step?.kind==='walk'?remainingWalk(position,step.geometry):null;
 const turn=steps[index+1]?.kind==='walk'?steps[index+1]:null;
 useEffect(()=>{const r=transitHint(step,route.legs[step?.legIndex],position,busState.current);busState.current=r.state;setBusMessage(r.message);},[position,index,steps]);
 useEffect(()=>{if(!voice||!window.speechSynthesis)return;const text=(fresh&&busMessage)||step?.title;if(!text)return;const utterance=new SpeechSynthesisUtterance(text);utterance.lang='fr-FR';window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);return()=>window.speechSynthesis.cancel();},[voice,index,busMessage]);

 const [gpsStatus,setGpsStatus]=useState('Recherche de votre position…');

 useEffect(()=>{

  if(!tracking||!position||document.hidden){gpsState.current={};return;}

  const result=gpsDecision(steps,index,position,gpsState.current);gpsState.current=result.state;

  if(result.action==='advance'){setGpsStatus('Étape atteinte · instruction suivante');onIndex(Math.min(index+1,steps.length-1));}

  else if(result.action==='replan'&&canAutoReplan()){setGpsStatus('Écart confirmé · recalcul du trajet…');onReplan(position,null,true);}

  else setGpsStatus(position.accuracy>25?'GPS imprécis · progression automatique suspendue':step?.kind==='walk'?'Suivi automatique à pied actif':'Confirmez votre montée ou descente du transport');

 },[position,tracking,index,steps]);

 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()/1000),15000);return()=>clearInterval(t)},[]);

 useEffect(()=>{

  if(!tracking)return;

  let ended=false,watch;

  const update=(p,e)=>{if(ended)return;if(e||!p){setError('Position indisponible. Vous pouvez avancer manuellement.');gpsState.current={};setPosition(null);onPosition(null);if(e?.code===1)setTracking(false);return;}if(!Number.isFinite(p.coords.latitude)||!Number.isFinite(p.coords.longitude))return;const v={lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp||Date.now(),name:'Ma position'};setPosition(v);onPosition(v);setError('');};

  if(native)Geolocation.watchPosition({enableHighAccuracy:true,timeout:12000,maximumAge:5000},update).then(id=>{if(ended)Geolocation.clearWatch({id});else watch=id;}).catch(()=>{if(!ended){setError('Autorisez la localisation pour afficher votre position.');setTracking(false);}});

  else if(navigator.geolocation)watch=navigator.geolocation.watchPosition(update,e=>update(null,e),{enableHighAccuracy:true,timeout:12000,maximumAge:5000});

  else {setError('La localisation n’est pas disponible.');setTracking(false);}

  return()=>{ended=true;onPosition(null);if(watch!==undefined){if(native)Geolocation.clearWatch({id:watch});else navigator.geolocation.clearWatch(watch);}};

 },[tracking,onPosition]);

 if(!step)return null;

 const usablePosition=tracking&&position&&position.accuracy<=100&&now-position.timestamp/1000<60;

 const Icon=step.kind==='walk'?(step.title.includes('droite')?CornerUpRight:step.title.includes('gauche')?CornerUpLeft:ArrowUp):step.kind==='arrival'?Check:step.kind==='alight'?MapPin:TrainFront;

 return <section className="guidance" aria-label="Guidage étape par étape">

  <div className="guidance-heading"><span>ÉTAPE {index+1} / {steps.length}</span><button onClick={onStop} aria-label="Arrêter le guidage"><Square size={15}/>Arrêter</button></div>

  <div className="guidance-trip"><div><strong>{timeLabel(route.arrival)}</strong><span>ARRIVÉE THÉORIQUE</span></div><div><strong>{step.kind==='arrival'?0:route.arrival>now?Math.ceil((route.arrival-now)/60):'—'} <small>min</small></strong><span>RESTANT · THÉORIQUE</span></div></div>

  <progress value={index+1} max={steps.length} aria-label="Progression du trajet"/>

  <div className="guidance-current" aria-live="polite"><span className="guidance-icon"><Icon size={27}/></span><h2>{step.title}</h2><p>{remaining!==null?`${remaining} m sur cette portion`:step.detail}</p>{remaining!==null&&turn&&<strong className="live-turn">{remaining<=20?"Ensuite : ":`Dans ${remaining} m : `}{turn.title}</strong>}{step.kind==='board'&&<strong className="departure-time">Départ théorique à {timeLabel(step.departure)}</strong>}</div>

  {fresh&&busMessage&&<p className="bus-guidance-hint" role="status">{busMessage}</p>}

  {['board','ride'].includes(step.kind)&&route.legs[step.legIndex]?.mode==='bus'&&<BusDepartures leg={route.legs[step.legIndex]}/>}

  {departurePassed(step,now)&&<p className="journey-warning" role="status">L’heure de départ théorique est passée. Si vous n’avez pas embarqué, recherchez un nouveau trajet.</p>}

  {step.stops?.length>2&&<details className="ride-stops"><summary>{step.stops.length-2} arrêt{step.stops.length>3?'s':''} intermédiaire{step.stops.length>3?'s':''}</summary><ol>{step.stops.slice(1).map((s,i)=><li key={s.id+':'+i}>{s.name}{i===step.stops.length-2&&<strong> · Descendre ici</strong>}</li>)}</ol></details>}

  {steps[index+1]&&<p className="next-instruction"><span>ENSUITE</span>{steps[index+1].title}</p>}

  <div className="guidance-actions"><button aria-label="Étape précédente" onClick={()=>onIndex(index-1)} disabled={index===0}><ChevronLeft size={20}/></button><button className="primary" onClick={()=>step.kind==='arrival'?onStop():onIndex(index+1)}>{step.action}<ChevronRight size={18}/></button></div>

  <details className="guidance-settings"><summary>Options du guidage</summary><div className="guidance-tools">{typeof window!=='undefined'&&'speechSynthesis' in window&&<button aria-pressed={voice} onClick={()=>setVoice(v=>!v)}>{voice?<Volume2 size={17}/>:<VolumeX size={17}/>}Voix {voice?'activée':'désactivée'}</button>}<button aria-pressed={tracking} onClick={()=>{setTracking(v=>!v);gpsState.current={};setPosition(null);setGpsStatus('Recherche de votre position…');setError('');}}><LocateFixed size={17}/>{tracking?'Arrêter le GPS':'Activer le suivi GPS'}</button><button onClick={()=>onReplan(usablePosition?position:null,step.place)}><RefreshCw size={16}/>{usablePosition?'Recalculer depuis ma position':step.place?'Repartir de cet arrêt':'Modifier mon départ'}</button></div>

  <p className="gps-status" role="status">{tracking?(position&&now-position.timestamp/1000>10?'Signal GPS ancien · progression suspendue':gpsStatus):"Suivi GPS désactivé · avancez manuellement"}</p>

  {error&&<p className="inline-error" role="alert">{error}</p>}

  {tracking&&position&&<p className="guidance-note">Précision GPS : ±{Math.round(position.accuracy)} m{position.accuracy>100?' · Position trop imprécise pour recalculer.':''}</p>}

  <p className="guidance-note">À pied : étapes et recalcul automatiques avec un GPS précis. Confirmez la montée et la descente des transports. Gardez cette vue ouverte. Horaires théoriques.</p></details>

 </section>

}





