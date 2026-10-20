import {normalizeSearch} from './stop-search.js';
export function physicalStops(stops,text){const words=normalizeSearch(text).split(' ').filter(Boolean);return words.length?stops.filter(s=>s.lines?.length&&words.every(w=>normalizeSearch(`${s.name} ${s.city||''} ${s.id}`).includes(w))).slice(0,12):[];}
