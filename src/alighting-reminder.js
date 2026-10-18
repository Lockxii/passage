import {distance} from './distance.js';
import {validFix} from './gps-guidance.js';
export function alightingDecision({enabled,visible,tracking,step,leg,position,now=Date.now()},state={}){
 const seen=state.seen||[],key=step?.legIndex;
 const reset=()=>({state:{seen},notify:false});
 if(!enabled||!visible||!tracking||step?.kind!=='ride'||!['bus','metro','tram'].includes(leg?.mode)||!validFix(position,now)||!Number.isFinite(leg.to?.lat)||!Number.isFinite(leg.to?.lon))return reset();
 if(seen.includes(key))return {state:{seen},notify:false};
 if(state.key===key&&position.timestamp<=state.lastTimestamp)return {state,notify:false};
 if(distance(position,leg.to)>100)return {state:{seen,key,lastTimestamp:position.timestamp},notify:false};
 const continuous=state.key===key&&state.nearSince!=null&&position.timestamp-state.lastTimestamp<=10000;
 const nearSince=continuous?state.nearSince:position.timestamp;
 const notify=continuous&&position.timestamp-nearSince>=2000;
 return {state:{seen:notify?[...seen,key]:seen,key,lastTimestamp:position.timestamp,nearSince},notify};
}
