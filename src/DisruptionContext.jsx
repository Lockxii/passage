import React from 'react';
import {TriangleAlert,Info,ArrowUpRight} from 'lucide-react';
import {disruptionContext} from './disruption-context';
import {timeLabel} from './guidance';
export default function DisruptionContext({data,now,failed,line}){
 const info=disruptionContext(data,now,failed),affected=info.state==='affected';
 const message={loading:'Vérification des passages en cours…',unavailable:'Perturbations non vérifiables : temps réel indisponible.',stale:'Données temps réel périmées : perturbations à revérifier.',no_fresh_data:'Aucune donnée récente pour vérifier les perturbations.',no_observed_impact:'Aucun retard ni suppression observé dans les passages reçus. Cela ne garantit pas un trafic normal.'}[info.state];
 return <aside className={'disruption-context'+(affected?' affected':'')} aria-label={'État des passages '+line}>
  <div className="disruption-title">{affected?<TriangleAlert size={18}/>:<Info size={18}/>}<strong>{affected?'Passages perturbés':'État des passages'} · {line}</strong></div>
  {affected?<><div className="disruption-chips">{!!info.cancelled&&<span>{info.cancelled} passage{info.cancelled>1?'s':''} supprimé{info.cancelled>1?'s':''}</span>}{!!info.delayed&&<span>{info.delayed} passage{info.delayed>1?'s':''} en retard · jusqu’à +{info.maxDelay} min</span>}</div><p>Information reçue à {timeLabel(info.recorded)} · Ilévia / MEL</p></>:<p>{message}</p>}
  <p>Couverture partielle : cet arrêt et cette ligne uniquement. Déviations, interruptions du réseau et bouchons non couverts.</p>
  <a href="https://www.ilevia.fr/cms/institutionnel/info-trafic-application-ilevia" target="_blank" rel="noopener noreferrer">Infos trafic officielles Ilévia <ArrowUpRight size={15}/></a>
 </aside>;
}
