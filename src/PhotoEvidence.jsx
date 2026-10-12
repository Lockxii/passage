import React,{useRef,useState,useEffect} from 'react';
import {Camera,Images,Trash2,Check} from 'lucide-react';
export default function PhotoEvidence({value,onChange,onBusy,disabled}){
 const camera=useRef(),gallery=useRef();
 const [error,setError]=useState('');const seq=useRef(0),busyCallback=useRef(onBusy);busyCallback.current=onBusy;
 useEffect(()=>()=>{seq.current++;busyCallback.current(false);},[]);
 async function choose(e){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  const id=++seq.current;setError('');onBusy(true);
  let bitmap;
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15000000)throw Error('Choisissez une photo JPEG, PNG ou WebP de moins de 15 Mo.');
   bitmap=await createImageBitmap(file);
   const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',.78);if(data.length>1400000)throw Error('Photo trop volumineuse. Choisissez une image plus petite.');
   if(seq.current===id)onChange(data);
  }catch(err){if(seq.current===id)setError(err.message||'Photo illisible.');}
  finally{bitmap?.close();if(seq.current===id)onBusy(false);}
 }
 return <section className="photo-evidence" aria-label="Photo du signalement">
  <div className="photo-title"><span className="photo-title-icon"><Camera size={20}/></span><div><strong>Une photo à partager ?</strong><span>Ajoutez du contexte à votre signalement</span></div><small>Facultatif</small></div>
  <input hidden ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} disabled={disabled}/>
  <input hidden ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={disabled}/>
  <div className="photo-actions"><button className="photo-camera" type="button" disabled={disabled} onClick={()=>camera.current.click()}><Camera size={22}/><span>Prendre une photo</span></button><button className="photo-gallery" type="button" disabled={disabled} onClick={()=>gallery.current.click()}><Images size={22}/><span>Galerie</span></button></div>
  {value&&<div className="photo-preview"><img src={value} alt="Aperçu de la photo jointe"/><span className="photo-ready"><Check size={14}/>Photo ajoutée</span><button className="photo-remove" aria-label="Retirer la photo" type="button" disabled={disabled} onClick={()=>{seq.current++;onChange(null);onBusy(false);}}><Trash2 size={17}/></button></div>}
  <p>La photo sera visible avec le signalement. Évitez les visages et les informations personnelles. Une photo ne certifie pas le signalement.</p>
  {error&&<p role="alert" className="inline-error">{error}</p>}
 </section>;
}
