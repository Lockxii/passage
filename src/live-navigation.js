import {distance} from './distance.js';
import {validFix} from './gps-guidance.js';
export function remainingWalk(position,geometry){
 const points=geometry?.coordinates;if(!points?.length||!position)return null;
 const scale=111320,cos=Math.cos(position.lat*Math.PI/180);let nearest=Infinity,remaining=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],ax=(a[0]-position.lon)*scale*cos,ay=(a[1]-position.lat)*scale,bx=(b[0]-position.lon)*scale*cos,by=(b[1]-position.lat)*scale,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(ax+t*dx,ay+t*dy);
  if(d<nearest){nearest=d;remaining=Math.hypot(dx,dy)*(1-t);for(let k=i+1;k<points.length;k++)remaining+=distance({lon:points[k-1][0],lat:points[k-1][1]},{lon:points[k][0],lat:points[k][1]});}
 }
 return Number.isFinite(nearest)&&nearest<=45?Math.round(remaining):null;
}
export function transitHint(step,leg,p,state={},now=Date.now()){
 if(!validFix(p,now)||leg?.mode!=='bus'||!['board','ride'].includes(step?.kind))return {state:{},message:null};
 const key=step.kind+':'+step.legIndex;
 if(state.key!==key)state={key};
 if(p.timestamp<=(state.last?.timestamp||0))return {state,message:state.message||null};
 let next={...state,last:p};
 if(state.last){const dt=(p.timestamp-state.last.timestamp)/1000,speed=distance(state.last,p)/dt;if(dt>20||speed>45)return {state:{key,last:p},message:null};}
 if(step.kind==='board'){
  if(leg.from&&distance(p,leg.from)<70)next.sawBoarding=true;
  const dt=state.last?(p.timestamp-state.last.timestamp)/1000:0,speed=dt>0?distance(state.last,p)/dt:0;
  if(next.sawBoarding&&speed>3&&speed<35){next.movingSince=state.movingSince??p.timestamp;next.samples=(state.samples||0)+1;}else{next.movingSince=null;next.samples=0;}
  next.message=next.samples>=3&&p.timestamp-next.movingSince>=15000?'Vous semblez être dans le bus. Confirmez votre montée.':null;
 }else{
  const near=leg.to&&distance(p,leg.to)<100;next.near=near?(state.near||0)+1:0;
  next.message=next.near>=2?'Votre arrêt approche : '+leg.to.name+'. Préparez-vous à descendre.':null;
 }
 return {state:next,message:next.message};
}
