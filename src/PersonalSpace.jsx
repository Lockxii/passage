import React,{useEffect,useState} from 'react';
import {Home,Briefcase,Star,Trash2,ArrowUpRight,Plus,Flag} from 'lucide-react';
import {request,serverURL} from './api';
export default function PersonalSpace({renderSearch,onLaunch,currentTrip}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[edit,setEdit]=useState(null),[destination,setDestination]=useState(null),[label,setLabel]=useState(''),[busy,setBusy]=useState(false);
 const call=(path,options={})=>request('/account/'+path,{...options,accountToken:sessionStorage.getItem('passage-account:'+serverURL)},false);
 async function load(){try{setData(await call('workspace'));}catch(e){setError(e.message);setData(null);}}
 useEffect(()=>{load();},[]);
 async function save(e){e.preventDefault();if(!destination||busy)return;setBusy(true);setError('');try{await call('favorites',{method:'POST',body:{id:edit.id,label,to:destination,from:edit.from||null}});setEdit(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(kind,id){setBusy(true);setError('');try{await call(kind+'/'+id,{method:'DELETE'});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 function begin(id,title,from=null,to=null){setEdit({id,from});setLabel(title);setDestination(to);setError('');}
 return <section className="personal-space" aria-label="Mes lieux et signalements">
 <h3>Mes favoris</h3><div className="quick-places">{[['home','Domicile',Home],['work','Travail',Briefcase]].map(([id,title,Icon])=>{const f=data?.favorites.find(f=>f.id===id);return <div key={id}><button disabled={!data||busy} onClick={()=>f?onLaunch(f):begin(id,title)}><Icon size={21}/><strong>{title}</strong><small>{f?f.to.name:'Ajouter une adresse'}</small></button>{f&&<button className="place-edit" onClick={()=>begin(id,title,null,f.to)} aria-label={'Modifier '+title}>Modifier</button>}</div>;})}</div>
 {data?.favorites.filter(f=>!['home','work'].includes(f.id)).map(f=><div className="favorite-row" key={f.id}><button onClick={()=>onLaunch(f)}><Star size={18}/><span><strong>{f.label}</strong><small>{f.from?f.from.name+' → ':''}{f.to.name}</small></span><ArrowUpRight size={17}/></button><button disabled={busy} aria-label={'Supprimer '+f.label} onClick={()=>remove('favorites',f.id)}><Trash2 size={17}/></button></div>)}
 <div className="favorite-actions"><button disabled={!data||busy} onClick={()=>begin(null,'')}><Plus size={16}/>Ajouter un favori</button>{currentTrip?.from&&currentTrip?.to&&<button disabled={!data||busy} onClick={()=>begin(null,currentTrip.to.name.slice(0,60),currentTrip.from,currentTrip.to)}><Star size={16}/>Enregistrer ce trajet</button>}</div>
 {edit&&<form className="account-form favorite-editor" onSubmit={save}><label>Nom du favori<div className="account-input"><input aria-label="Nom du favori" value={label} onChange={e=>setLabel(e.target.value)} required minLength={2} maxLength={60}/></div></label>{renderSearch({label:'Adresse du favori',value:destination,onSelect:setDestination})}<div className="recovery-actions"><button type="button" disabled={busy} onClick={()=>setEdit(null)}>Annuler</button><button className="primary" disabled={busy||!destination}>Enregistrer</button></div></form>}
 <h3>Mes signalements</h3><p className="personal-caption">Actifs et récents · conservés jusqu’à 24 h après expiration.</p>
 {!data?<p role="status">Chargement…</p>:!data.reports.length?<div className="personal-empty"><Flag size={20}/>Aucun signalement récent.</div>:data.reports.map(r=><div className="personal-report" key={r.id}><span className="transit-chip">{r.line}</span><span><strong>{r.place}</strong><small>{r.closed?'Retiré':r.expires<Date.now()?'Expiré':'Actif'} · {new Date(r.created).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small></span>{!r.closed&&r.expires>Date.now()&&<button disabled={busy} aria-label={'Retirer le signalement '+r.place} onClick={()=>remove('reports',r.id)}><Trash2 size={17}/></button>}</div>)}
 {error&&<p className="inline-error" role="alert">{error}</p>}
 </section>;
}
