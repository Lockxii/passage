import React,{useEffect,useRef,useState} from 'react';
import {Bell,BellRing} from 'lucide-react';
import {alightingDecision} from './alighting-reminder';
import {validFix} from './gps-guidance';
export default function AlightingReminder({route,step,position,tracking,now}){
 const [enabled,setEnabled]=useState(false),[visible,setVisible]=useState(!document.hidden),[notice,setNotice]=useState(null);
 const state=useRef({});
 useEffect(()=>{const changed=()=>{state.current={seen:state.current.seen||[]};setVisible(!document.hidden);};document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed);},[]);
 useEffect(()=>{state.current={};setNotice(null);},[route]);
 useEffect(()=>{setNotice(null);},[step?.legIndex,step?.kind]);
 useEffect(()=>{
  const result=alightingDecision({enabled,visible:visible&&!document.hidden,tracking,step,leg:route.legs[step?.legIndex],position},state.current);state.current=result.state;
  if(result.notify){setNotice({name:route.legs[step.legIndex].to.name,at:Date.now()});try{navigator.vibrate?.([180,100,180]);}catch{}}
 },[enabled,visible,tracking,position,step,route,now]);
 if(!route.legs.some(l=>['bus','metro','tram'].includes(l.mode)))return null;
 const status=notice||state.current.seen?.includes(step?.legIndex)?'Rappel déjà déclenché pour cet arrêt.':step?.kind==='alight'?'Confirmez votre descente pour poursuivre.':!visible?'Rappel suspendu lorsque l’application est masquée.':!tracking?'Activez le suivi GPS pour recevoir le rappel.':step?.kind!=='ride'?'Le rappel surveillera l’arrêt après votre confirmation de montée.':!validFix(position)?'En attente d’un GPS récent et précis.':'Rappel armé pour votre arrêt de descente.';
 return <section className="alighting-reminder" aria-label="Rappel de descente">
  <button role="switch" aria-checked={enabled} onClick={()=>{setEnabled(v=>!v);setNotice(null);}}><Bell size={19}/><span><strong>Me rappeler de descendre</strong><small>{enabled?'Activé pour ce guidage':'Facultatif · désactivé'}</small></span><i aria-hidden="true"/></button>
  {enabled&&<><p>{status}</p><small>Gardez cette vue ouverte. Vibration si compatible. Le GPS peut manquer en métro ; vérifiez les annonces et confirmez votre descente.</small></>}
  {enabled&&notice&&<div className="alighting-notice" role="status"><BellRing size={21}/><div><strong>Préparez-vous à descendre</strong><span>{notice.name}</span><small>Rappel déclenché à {new Date(notice.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} · proximité GPS estimée</small></div></div>}
 </section>;
}

