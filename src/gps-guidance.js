// Local metre projection is sufficient for individual pedestrian instructions.
const xy=(p,origin)=>[(p[0]-origin[0])*111320*Math.cos(origin[1]*Math.PI/180),(p[1]-origin[1])*111320];
const coordinates=g=>g?.type==='Feature'?coordinates(g.geometry):g?.type==='LineString'?g.coordinates:[];
export function lineDistance(position,geometry){
 const points=coordinates(geometry),origin=[position.lon,position.lat];
 let nearest=Infinity;
 for(let i=1;i<points.length;i++){
  const a=xy(points[i-1],origin),b=xy(points[i],origin),dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy||1)));
  nearest=Math.min(nearest,Math.hypot(a[0]+t*dx,a[1]+t*dy));
 }
 return nearest;
}
export function validFix(p,now=Date.now()){
 return !!p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=25&&Number.isFinite(p.timestamp)&&now-p.timestamp>=-2000&&now-p.timestamp<=10000;
}
export function gpsDecision(steps,index,p,state={},now=Date.now()){
 const next={...state},step=steps[index];
 if(!validFix(p,now)||step?.kind!=='walk')return {state:{index,lastTimestamp:p?.timestamp},action:null};
 if(state.index!==index){next.nearSince=null;next.offSince=null;next.nearCount=0;next.offCount=0;next.previous=null;}
 next.index=index;
 if(p.timestamp<=(state.lastTimestamp||0))return {state,action:null};
 next.lastTimestamp=p.timestamp;
 // Reject teleporting fixes; don't let one bad sample trigger a reroute.
 if(next.previous){const elapsed=(p.timestamp-next.previous.timestamp)/1000;if(elapsed>15){next.nearSince=null;next.offSince=null;next.nearCount=0;next.offCount=0;}const delta=xy([p.lon,p.lat],[next.previous.lon,next.previous.lat]);if(elapsed>0&&Math.hypot(...delta)>elapsed*12+p.accuracy+next.previous.accuracy)return {state:{index,lastTimestamp:p.timestamp},action:null};}
 next.previous=p;
 const points=coordinates(step.geometry),end=points.at(-1);
 if(!end)return {state:next,action:null};
 const distance=Math.hypot(...xy(end,[p.lon,p.lat]));
 const near=distance<=Math.max(8,Math.min(15,p.accuracy));
 next.nearCount=near?(next.nearCount||0)+1:0;
 next.nearSince=near?(next.nearSince??p.timestamp):null;
 if(next.nearCount>=2&&p.timestamp-next.nearSince>=3000)return {state:{index:index+1,lastTimestamp:p.timestamp},action:'advance'};
 // Compare with the remaining walking leg, never the schematic transit line.
 const remaining=steps.slice(index).filter(s=>s.kind==='walk'&&s.legIndex===step.legIndex);
 const off=Math.min(...remaining.map(s=>lineDistance(p,s.geometry)))>Math.max(45,p.accuracy*2);
 next.offCount=off?(next.offCount||0)+1:0;
 next.offSince=off?(next.offSince??p.timestamp):null;
 if(next.offCount>=3&&p.timestamp-next.offSince>=12000)return {state:{index,lastTimestamp:p.timestamp},action:'replan'};
 return {state:next,action:null};
}
