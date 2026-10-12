import React,{useState} from 'react';
import {ChevronLeft,ChevronRight,Clock,Check,CalendarDays,ChevronDown} from 'lucide-react';
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export default function DeparturePicker({value,onChange,onNow}){
 const initial=value?new Date(value):new Date();
 const [day,setDay]=useState(iso(initial)),[month,setMonth]=useState(new Date(initial.getFullYear(),initial.getMonth(),1)),[time,setTime]=useState(`${String(initial.getHours()).padStart(2,'0')}:${String(initial.getMinutes()).padStart(2,'0')}`);
 const [expanded,setExpanded]=useState(false);
 const offset=(month.getDay()+6)%7,count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const valid=/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
 return <section className="custom-calendar" aria-label="Choisir le départ">
  <button className="calendar-date-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><CalendarDays size={18}/><span>{new Date(day+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</span><ChevronDown size={16}/></button>
  {expanded&&<div className="calendar-month"><div className="calendar-heading"><button aria-label="Mois précédent" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={18}/></button><strong>{month.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</strong><button aria-label="Mois suivant" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={18}/></button></div>
  <div className="calendar-grid">{['L','M','M','J','V','S','D'].map((v,i)=><span key={'w'+i}>{v}</span>)}{Array.from({length:offset},(_,i)=><span key={'p'+i}/>)}{Array.from({length:count},(_,i)=>{const d=new Date(month.getFullYear(),month.getMonth(),i+1),id=iso(d);return <button key={id} aria-label={d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})} aria-pressed={day===id} onClick={()=>{setDay(id);setExpanded(false);}}>{i+1}</button>})}</div></div>}
  <label className="calendar-time"><Clock size={18}/><span>Départ à</span><input aria-label="Heure de départ, format HH:MM" value={time} maxLength={5} placeholder="14:30" onChange={e=>setTime(e.target.value)} aria-invalid={!valid}/></label>
  {!valid&&<p role="status" className="inline-error">Saisissez une heure au format 14:30.</p>}
  <div className="calendar-actions"><button onClick={onNow}>Partir maintenant</button><button className="primary" disabled={!valid} onClick={()=>onChange(day+'T'+time)}><Check size={17}/>Valider</button></div>
 </section>;
}
