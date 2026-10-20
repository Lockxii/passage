import React,{useState} from 'react';
import {Footprints,MapPin} from 'lucide-react';
import {physicalStops} from './stop-details';
import BusDepartures from './BusDepartures';
export default function StopDetails({stops,routes,initial,from,onWalk,renderSearch}){
 const [text,setText]=useState(''),[stop,setStop]=useState(initial||null),[line,setLine]=useState(initial?.lines.find(id=>routes.has(id))),[start,setStart]=useState(from);
 const route=routes.get(line);
 function choose(s){setStop(s);setLine(s.lines.find(id=>routes.has(id)));}
 return <section className="stop-details"><label htmlFor="physical-stop-search">Rechercher un arrêt ou une ville</label><input id="physical-stop-search" value={text} onChange={e=>setText(e.target.value)} placeholder="Ex. Loos, Tourcoing…"/>{text.trim()&&<div className="physical-stop-results">{physicalStops(stops,text).map(s=><button key={s.id} onClick={()=>{choose(s);setText('');}}><MapPin size={17}/><span><strong>{s.name}</strong><small>{s.city} · Quai {s.id}</small></span></button>)}{!physicalStops(stops,text).length&&<p>Aucun quai trouvé.</p>}</div>}
 {stop&&<><h3>{stop.name}</h3><p>{stop.city} · Quai {stop.id}</p><div className="nearby-lines" role="group" aria-label="Lignes de ce quai">{stop.lines.filter(id=>routes.has(id)).map(id=><button key={id} aria-pressed={line===id} onClick={()=>setLine(id)}>{routes.get(id).name}</button>)}</div>{route&&<BusDepartures key={stop.id+':'+line} leg={{from:stop,routeId:line,line:route.name,mode:route.mode}}/>}<h3>Rejoindre ce quai</h3>{renderSearch({label:'Point de départ à pied',value:start,onSelect:setStart})}<button className="primary" disabled={!start} onClick={()=>onWalk(start,stop)}><Footprints size={18}/>Itinéraire à pied vers ce quai</button><p className="bus-source">Position du quai issue du catalogue Ilévia / MEL. Vérifiez la destination affichée sur le véhicule.</p></>}
 </section>;
}
