export const preferenceKey='passage.journey-preference';
export const preferences={fastest:'Plus rapide',walking:'Moins de marche',transfers:'Moins de changements'};
export function readPreference(storage){try{const value=(storage??globalThis.localStorage).getItem(preferenceKey);return Object.hasOwn(preferences,value)?value:'fastest';}catch{return 'fastest';}}
export function rankJourneys(journeys,preference='fastest'){
 const metric=j=>preference==='walking'?j.walking:preference==='transfers'?j.changes:0;
 return [...journeys].sort((a,b)=>(metric(a)-metric(b))||(a.arrival-b.arrival)||(a.walking-b.walking));
}
