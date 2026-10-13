import {distance} from './distance.js';

// Keep physical platforms separate: opposite directions can have different departures.
export function nearbyStops(stops, position) {
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lon) || Math.abs(position.lat)>90 || Math.abs(position.lon)>180) return [];
  return stops.filter(s=>s.lines?.length && Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map(s=>({...s, metres:distance(position,s)}))
    .filter(s=>s.metres<=800).sort((a,b)=>a.metres-b.metres || a.id.localeCompare(b.id)).slice(0,4);
}
