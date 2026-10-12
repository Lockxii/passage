export const normalizeSearch=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function findStops(stops,text,limit=5){
 const words=normalizeSearch(text).split(' ').filter(Boolean);if(!words.length)return [];
 const groups=new Map();
 for(const s of stops){const hay=normalizeSearch(s.name+' '+(s.city||'')+' '+(s.search||''));if(!words.every(w=>hay.includes(w)))continue;const group=s.parent||s.name+':'+(s.city||'')+':'+s.lat.toFixed(3);const old=groups.get(group);if(old){old.lines=[...new Set([...old.lines,...s.lines])];continue;}groups.set(group,{...s,lines:[...s.lines]});}
 return [...groups.values()].sort((a,b)=>Number(normalizeSearch(b.name).startsWith(words[0]))-Number(normalizeSearch(a.name).startsWith(words[0]))).slice(0,limit);
}
