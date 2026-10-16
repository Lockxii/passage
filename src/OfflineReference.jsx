import React,{useState} from 'react';
import {Download,WifiOff,RefreshCw,Bookmark,Route} from 'lucide-react';
import {request,serverURL} from './api';
import {createOfflineReference} from './offline-reference';
export const offlineReference=()=>createOfflineReference(localStorage,sessionStorage,serverURL);
export default function OfflineReference({user,currentTrip,busy=false,onBusy=()=>{}}){
 const [copy,setCopy]=useState(()=>{const value=offlineReference().read();return user&&value?.owner!==user.id?null:value;}),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const date=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
 async function save(){
  if(!user||busy)return;onBusy(true);setError('');setNotice('');
  try{
   const result=await request('/account/favorites',{accountToken:sessionStorage.getItem('passage-account:'+serverURL)},false);
   const store=offlineReference();store.connect(user.id);setCopy(store.save(user.id,result.favorites,currentTrip));setNotice('Copie enregistrée sur cet appareil.');
  }catch(e){setError(e.message);}finally{onBusy(false);}
 }
 function disable(){try{offlineReference().clear();setCopy(null);setNotice('Copie locale effacée.');setError('');}catch{setError('Impossible d’effacer le stockage local. Réessayez.');}}
 if(!user&&!copy)return null;
 return <section className="offline-reference" aria-label="Consultation hors connexion">
  <div className="offline-heading"><span><WifiOff size={21}/></span><div><h3>À garder hors connexion</h3><small>Une copie sur cet appareil uniquement</small></div></div>
  <p>Favoris et étapes à consulter, même sans réseau dans l’application déjà ouverte. Pas de carte, de calcul, de guidage GPS ni de passages en direct hors connexion.</p>
  <p className="offline-privacy">Cette copie peut contenir vos adresses. Elle est effacée à la déconnexion ou si vous désactivez l’option.</p>
  <button className="offline-switch" role="switch" aria-checked={!!copy} disabled={busy||(!user&&!copy)} onClick={()=>copy?disable():save()}><span>Conserver une copie locale</span><span className="offline-toggle" aria-hidden="true"/></button>
  {copy&&<>
   <div className="offline-saved"><Bookmark size={16}/><span>Copie du {date(copy.savedAt)}<small>Référence sauvegardée · aucune donnée en direct</small></span></div>
   <details><summary>Mes favoris sauvegardés ({copy.favorites.length})</summary>{copy.favorites.length?copy.favorites.map((f,i)=><div className="offline-favorite" key={i}><strong>{f.label}</strong><span>{f.from?f.from+' → ':''}{f.to}</span></div>):<p>Aucun favori au moment de la sauvegarde.</p>}</details>
   {copy.journey?<details open><summary>Étapes sauvegardées</summary><div className="offline-trip"><Route size={17}/><strong>{copy.journey.from} → {copy.journey.to}</strong></div><small>Trajet enregistré le {date(copy.journey.savedAt)} · à vérifier avant de partir</small><ol>{copy.journey.steps.map((s,i)=><li key={i}><strong>{s.title}</strong><span>{s.detail}</span></li>)}</ol></details>:<p>Calculez un itinéraire, puis actualisez la copie ici pour conserver ses étapes.</p>}
   {user&&<button className="offline-save" disabled={busy} onClick={save}><RefreshCw size={17}/>{busy?'Enregistrement…':'Actualiser la copie'}</button>}
  </>}
  {!copy&&user&&<small><Download size={13}/> Désactivé par défaut. L’activation enregistre vos favoris et le trajet affiché.</small>}
  {notice&&<p role="status">{notice}</p>}{error&&<p className="inline-error" role="alert">{error}</p>}
 </section>;
}
