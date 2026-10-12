import PersonalSpace from './PersonalSpace.jsx';
import React,{useEffect,useState} from 'react';
import {UserRound,Mail,LockKeyhole,Eye,EyeOff,LogOut,LoaderCircle,ArrowRight,KeyRound,Copy,Download,Check} from 'lucide-react';
import {request,serverURL,resetGuestSession} from './api';
const key=()=> 'passage-account:'+serverURL;
export default function Account({onGuard=()=>{},renderSearch,onLaunch,currentTrip}){
 const [mode,setMode]=useState('login'),[user,setUser]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[show,setShow]=useState(false);
 const [recovery,setRecovery]=useState(''),[notice,setNotice]=useState(''),[saved,setSaved]=useState(false),[rotate,setRotate]=useState(false);
 useEffect(()=>{onGuard(busy||!!recovery);},[busy,recovery,onGuard]);
 useEffect(()=>{if(!recovery)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[recovery]);
 useEffect(()=>{let active=true;const token=sessionStorage.getItem(key());if(!token){setLoading(false);return;}request('/account/me',{accountToken:token},false).then(r=>{if(active)setUser(r.user);}).catch(e=>{if(e.status===401)sessionStorage.removeItem(key());if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function submit(e){
  e.preventDefault();if(busy)return;const data=Object.fromEntries(new FormData(e.currentTarget));
  if(mode==='recover'&&data.password!==data.confirm){setError('Les deux mots de passe doivent être identiques.');return;}
  setBusy(true);setError('');
  try{
   const path=rotate?'recovery-key':mode;
   const r=await request('/account/'+path,{method:'POST',body:data,...(rotate?{accountToken:sessionStorage.getItem(key())}:{})},false);
   if(r.token){sessionStorage.setItem(key(),r.token);setUser(r.user);}
   if(r.recoveryKey){setRecovery(r.recoveryKey);setSaved(false);setNotice('');setRotate(false);}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function logout(){setBusy(true);setError('');try{await request('/account/logout',{method:'POST',body:{},accountToken:sessionStorage.getItem(key())},false);sessionStorage.removeItem(key());await resetGuestSession();setUser(null);setMode('login');setRotate(false);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(recovery);setNotice('Clé copiée.');}catch{setNotice('Copie indisponible : sélectionnez la clé pour la copier, ou téléchargez-la.');}}
 async function download(){
  const text=`Passage — clé de récupération\nCompte : ${user.email}\nServeur : ${serverURL||location.origin}\n\n${recovery}\n\nGardez ce fichier dans un endroit privé. Cette clé permet de changer votre mot de passe. Elle sera remplacée après utilisation.\n`;
  const file=new File([text],'passage-cle-recuperation.txt',{type:'text/plain;charset=utf-8'});
  try{
   if(navigator.canShare?.({files:[file]})&&/Android|iPhone|iPad/i.test(navigator.userAgent)){await navigator.share({files:[file],title:'Enregistrer ma clé Passage'});setNotice('Fichier transmis à l’application choisie.');return;}
   const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);setNotice('Téléchargement demandé. Vérifiez que le fichier est enregistré.');
  }catch(e){setNotice(e.name==='AbortError'?'Enregistrement annulé.':'Enregistrement indisponible. Utilisez Copier.');}
 }
 function switchMode(next){setMode(next);setError('');setShow(false);}
 if(loading)return <div className="account-loading" role="status"><LoaderCircle className="spin"/>Chargement du compte…</div>;
 const passwordField=(label='Mot de passe',name='password')=><label>{label}<div className="account-input"><LockKeyhole size={18}/><input aria-label={label} name={name} type={show?'text':'password'} autoComplete={mode==='login'||rotate?'current-password':'new-password'} required minLength={12} maxLength={128} placeholder="12 caractères minimum" disabled={busy}/>{name==='password'&&<button type="button" aria-label={show?'Masquer le mot de passe':'Afficher le mot de passe'} aria-pressed={show} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</div></label>;
 return <div className="account-panel">
  {recovery?<section className="recovery-card" aria-label="Votre clé de récupération"><div className="account-avatar"><KeyRound size={28}/></div><h2>Gardez votre clé</h2><p>Elle permet de récupérer votre compte sans e-mail. Elle ne sera plus affichée après cet écran. Gardez-la privée.</p><code className="recovery-code" tabIndex={0}>{recovery}</code><div className="recovery-actions"><button onClick={copy}><Copy size={17}/>Copier</button><button onClick={download}><Download size={17}/>Télécharger</button></div><p role="status" className="recovery-notice">{notice}</p><label className="recovery-saved"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>J’ai enregistré ma clé en lieu sûr</label><button className="primary account-submit" disabled={!saved} onClick={()=>{setRecovery('');setMode('login');}}><Check size={18}/>Terminer</button></section>
  :user?<><div className="account-avatar"><UserRound size={30}/></div><h2>Bonjour {user.name}</h2><p className="account-email">{user.email}</p><span className="account-connected">Compte connecté</span><PersonalSpace renderSearch={renderSearch} onLaunch={onLaunch} currentTrip={currentTrip}/>{rotate?<form onSubmit={submit} className="account-form"><p className="recovery-help">La nouvelle clé remplacera votre ancienne clé.</p>{passwordField('Mot de passe actuel')}<button className="primary account-submit" disabled={busy}>Générer une nouvelle clé</button><button type="button" disabled={busy} onClick={()=>{setRotate(false);setError('');}}>Annuler</button></form>:<button className="account-logout" onClick={()=>{setRotate(true);setError('');}}><KeyRound size={18}/>Clé de récupération</button>}<button className="account-logout" disabled={busy} onClick={logout}><LogOut size={18}/>Se déconnecter</button></>
  :<>{mode==='recover'?<><button className="account-back" disabled={busy} onClick={()=>switchMode('login')}>← Retour à la connexion</button><h2>Retrouver mon compte</h2><p className="recovery-help">Saisissez la clé enregistrée à l’inscription. Une nouvelle clé remplacera celle-ci après utilisation.</p></>:<div className="account-tabs" role="group" aria-label="Accès au compte">{[['login','Connexion'],['register','Créer un compte']].map(([id,label])=><button key={id} aria-pressed={mode===id} disabled={busy} onClick={()=>switchMode(id)}>{label}</button>)}</div>}
  <form key={mode} onSubmit={submit} className="account-form">
   {mode==='register'&&<label>Prénom ou pseudo<div className="account-input"><UserRound size={18}/><input name="name" autoComplete="nickname" required minLength={2} maxLength={40} placeholder="Votre pseudo" disabled={busy}/></div></label>}
   <label>E-mail<div className="account-input"><Mail size={18}/><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="vous@exemple.fr" disabled={busy}/></div></label>
   {mode==='recover'&&<label>Clé de récupération<div className="account-input"><KeyRound size={18}/><input name="recoveryKey" autoComplete="off" spellCheck={false} required maxLength={100} placeholder="Collez votre clé" disabled={busy}/></div></label>}
   {passwordField(mode==='recover'?'Nouveau mot de passe':'Mot de passe')}
   {mode==='recover'&&passwordField('Confirmer le nouveau mot de passe','confirm')}
   {mode==='login'&&<button type="button" className="account-forgot" disabled={busy} onClick={()=>switchMode('recover')}>Mot de passe oublié ?</button>}
   <button className="primary account-submit" disabled={busy}>{busy?<LoaderCircle size={18} className="spin"/>:<ArrowRight size={18}/>} {busy?'Un instant…':mode==='login'?'Se connecter':mode==='recover'?'Réinitialiser le mot de passe':'Créer mon compte'}</button>
  </form></>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
 </div>;
}
