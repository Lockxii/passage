export const recentKey='passage.recent-stops.v1';
export function cleanRecent(value){return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&id.length>0&&id.length<=100))].slice(0,5):[];}
export function readRecent(storage){try{return cleanRecent(JSON.parse((storage??globalThis.localStorage).getItem(recentKey)||'[]'));}catch{return [];}}
export function addRecent(ids,point,stops){if(!point||!stops.some(s=>s.id===point.id))return cleanRecent(ids);return cleanRecent([point.id,...ids.filter(id=>id!==point.id)]);}
export function saveRecent(ids,storage){const next=cleanRecent(ids);const target=storage??globalThis.localStorage;if(next.length)target.setItem(recentKey,JSON.stringify(next));else target.removeItem(recentKey);return next;}
