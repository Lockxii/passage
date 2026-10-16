const prefix='passage-offline-reference:';
const text=value=>typeof value==='string'?value.slice(0,500):'';
export function createOfflineReference(storage,session,scope=''){
 const key=prefix+scope,ownerKey=key+':owner';
 function clear(){storage.removeItem(key);session.removeItem(ownerKey);}
 function connect(owner){if(session.getItem(ownerKey)!==owner){storage.removeItem(key);session.setItem(ownerKey,owner);}}
 function read(){
  try{
   const raw=storage.getItem(key);if(!raw||raw.length>250000)return null;
   const value=JSON.parse(raw),validText=v=>typeof v==='string'&&v.length<=500;
   if(value?.version!==1||!value.owner||value.owner!==session.getItem(ownerKey)||!Number.isFinite(value.savedAt)||!Array.isArray(value.favorites)||value.favorites.length>30||!value.favorites.every(f=>f&&validText(f.label)&&validText(f.from)&&validText(f.to)))return null;
   const j=value.journey;if(j&&(!validText(j.from)||!validText(j.to)||!Number.isFinite(j.savedAt)||!Array.isArray(j.steps)||j.steps.length>200||!j.steps.every(s=>s&&validText(s.title)&&validText(s.detail))))return null;
   return value;
  }catch{return null;}
 }

 function save(owner,favorites,trip,now=Date.now()){
  if(!owner||session.getItem(ownerKey)!==owner)throw Error('Reconnectez-vous avant de sauvegarder.');
  if(!Array.isArray(favorites)||favorites.length>30)throw Error('Liste de favoris invalide.');
  const previous=read();
  let journey=previous?.journey||null;
  if(trip?.steps?.length){
   if(trip.steps.length>200)throw Error('Ce trajet contient trop d’étapes pour être sauvegardé.');
   journey={from:text(trip.from?.name),to:text(trip.to?.name),savedAt:now,steps:trip.steps.map(s=>({title:text(s.title),detail:text(s.detail)}))};
  }
  const value={version:1,owner,savedAt:now,favorites:favorites.map(f=>({label:text(f.label),from:text(f.from?.name),to:text(f.to?.name)})),journey};
  try{storage.setItem(key,JSON.stringify(value));}catch{throw Error('Stockage indisponible ou plein. Aucune nouvelle copie enregistrée.');}
  return value;
 }
 return {clear,connect,read,save};
}
