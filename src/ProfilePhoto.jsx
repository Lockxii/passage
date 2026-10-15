import React,{useRef,useState} from 'react';
import {Camera,Trash2,LoaderCircle,UserRound} from 'lucide-react';
import {request,serverURL} from './api';
export default function ProfilePhoto({user,onChange,busy,onBusy}){
 const input=useRef(),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function update(file){
  if(busy)return;onBusy(true);setError('');setNotice('');let bitmap;
  try{
   let avatar;
   if(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15000000)throw Error('Choisissez une image JPEG, PNG ou WebP de moins de 15 Mo.');
    bitmap=await createImageBitmap(file);
    const size=Math.min(bitmap.width,bitmap.height),canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256);
    avatar=canvas.toDataURL('image/jpeg',.85);
   }
   const r=await request('/account/avatar',{method:file?'PUT':'DELETE',...(file?{body:{avatar}}:{}),accountToken:sessionStorage.getItem('passage-account:'+serverURL)},false);
   onChange(r.user);setNotice(file?'Photo mise à jour.':'Photo supprimée.');
  }catch(e){setError(e.message||'Impossible de modifier la photo.');}
  finally{bitmap?.close();onBusy(false);}
 }
 return <section className="profile-photo" aria-label="Photo de profil">
  <div className="profile-photo-preview">{user.avatar?<img src={user.avatar} alt="Votre photo de profil"/>:<UserRound size={32}/>}</div>
  <div className="profile-photo-actions"><button disabled={busy} onClick={()=>input.current.click()}>{busy?<LoaderCircle size={17} className="spin"/>:<Camera size={17}/>} {user.avatar?'Changer la photo':'Ajouter une photo'}</button>{user.avatar&&<button disabled={busy} aria-label="Supprimer la photo de profil" onClick={()=>update(null)}><Trash2 size={17}/></button>}</div>
  <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)update(file);}} disabled={busy}/>
  <p>Votre pseudo et votre photo sont publics sur vos signalements. Choisissez une image sans information privée.</p>
  {notice&&<small role="status">{notice}</small>}{error&&<p role="alert" className="inline-error">{error}</p>}
 </section>;
}
