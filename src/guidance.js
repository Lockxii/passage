export const timeLabel=s=>new Date(s*1000).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});
const side={left:'à gauche',right:'à droite','slight left':'légèrement à gauche','slight right':'légèrement à droite','sharp left':'franchement à gauche','sharp right':'franchement à droite',straight:'tout droit',uturn:'demi-tour'};
export function walkingInstruction(step){
 const m=step.maneuver||{}, direction=side[m.modifier]||'tout droit';
 let text;
 if(m.type==='arrive')return 'Vous êtes arrivé à la fin de cette portion à pied';
 if(m.type==='depart')text='Avancez';
 else if(m.modifier==='uturn')text='Faites demi-tour';
 else if(['roundabout','rotary','roundabout turn'].includes(m.type))text=m.exit?`Au rond-point, prenez la sortie ${m.exit}`:'Traversez le rond-point';
 else if(['exit roundabout','exit rotary'].includes(m.type))text='Quittez le rond-point';
 else if(m.type==='fork')text=`À la bifurcation, restez ${direction}`;
 else if(m.type==='end of road')text=`Au bout de la rue, tournez ${direction}`;
 else if(['turn','merge','on ramp','off ramp'].includes(m.type))text=`Tournez ${direction}`;
 else text=`Continuez ${direction}`;
 return text+(step.name?` sur ${step.name}`:' sur le chemin piéton');
}
export function guidanceSteps(route,from,to){
 if(!route)return [];
 const steps=[];
 route.legs.forEach((leg,legIndex)=>{
  const start=leg.from||from,end=leg.to||to;
  if(leg.kind==='walk'){
   const moves=(leg.steps||[]).filter(s=>s.maneuver?.type!=='arrive'&&s.distance>0);
   if(moves.length)for(const move of moves)steps.push({kind:'walk',legIndex,title:walkingInstruction(move),detail:`${Math.round(move.distance)} m · Vers ${end?.name||'la destination'}`,geometry:move.geometry||leg.geometry,coordinate:move.maneuver?.location,action:'Instruction suivante'});
   else if(leg.distance>0)steps.push({kind:'walk',legIndex,title:`Marchez jusqu’à ${end?.name||'votre destination'}`,detail:`${Math.round(leg.distance)} m · ${Math.max(1,Math.ceil(leg.duration/60))} min`,geometry:leg.geometry,action:'J’y suis'});
  }else{
   const mode=leg.mode==='metro'?'métro':leg.mode==='tram'?'tram':'bus';
   steps.push({kind:'board',legIndex,title:`Prenez le ${mode} ${leg.line}`,detail:`À ${start?.name} · direction ${leg.headsign}`,departure:leg.start,place:start,coordinate:start?[start.lon,start.lat]:null,action:'Je suis monté'});
   steps.push({kind:'ride',legIndex,title:`Restez à bord jusqu’à ${end?.name}`,detail:`${leg.stopCount} arrêt${leg.stopCount>1?'s':''} · direction ${leg.headsign}`,stops:leg.viaStops||[],geometry:leg.geometry,action:'Arrêt de descente atteint'});
   steps.push({kind:'alight',legIndex,title:`Descendez à ${end?.name}`,detail:legIndex<route.legs.length-1?'Poursuivez avec la prochaine étape.':'Vous approchez de votre destination.',place:end,coordinate:end?[end.lon,end.lat]:null,action:'Je suis descendu'});
  }
 });
 steps.push({kind:'arrival',legIndex:route.legs.length-1,title:'Vous êtes arrivé',detail:to?.name||'Votre destination',coordinate:to?[to.lon,to.lat]:null,action:'Terminer le trajet'});
 return steps;
}
export function departurePassed(step,now){return step?.kind==='board'&&Number.isFinite(step.departure)&&now>step.departure+60;}
