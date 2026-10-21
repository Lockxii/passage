import React from 'react';
import {Star,X,ChevronRight} from 'lucide-react';
export default function FavoriteStops({ids,stops,onOpen,onToggle,error}){
 if(!ids.length&&!error)return null;
 return <section className="favorite-stops" aria-label="Mes arrêts favoris"><h2><Star size={18}/>Mes arrêts favoris</h2><p>Enregistrés sur cet appareil · accès aux passages</p>{error&&<p role="alert">{error}</p>}{ids.map(id=>{const stop=stops.find(s=>s.id===id);return <div className="favorite-stop-row" key={id}><button disabled={!stop} onClick={()=>onOpen(stop)}><span><strong>{stop?.name||'Quai indisponible'}</strong><small>{stop?.city?stop.city+' · ':''}Quai {id}</small></span><ChevronRight size={17}/></button><button aria-label={'Retirer '+(stop?.name||id)+' des arrêts favoris'} onClick={()=>onToggle(id)}><X size={18}/></button></div>;})}</section>;
}
