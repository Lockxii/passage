import React from 'react';
import {History,X} from 'lucide-react';
export default function RecentStops({ids,stops,onSelect,onRemove,onClear,error}){
 if(!ids.length&&!error)return null;
 return <section className="favorite-stops recent-stops" aria-label="Destinations récentes"><header><h2><History size={18}/>Destinations récentes</h2>{ids.length>0&&<button onClick={onClear}>Tout effacer</button>}</header><p>5 arrêts publics maximum · sur cet appareil</p>{error&&<p role="alert">{error}</p>}{ids.map(id=>{const stop=stops.find(s=>s.id===id);return <div className="favorite-stop-row" key={id}><button disabled={!stop} onClick={()=>onSelect(stop)}><span><strong>{stop?.name||'Arrêt indisponible'}</strong><small>{stop?.city||id}</small></span></button><button aria-label={'Effacer '+(stop?.name||id)+' des destinations récentes'} onClick={()=>onRemove(id)}><X size={18}/></button></div>;})}</section>;
}
