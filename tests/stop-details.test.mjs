import {test} from 'node:test';import assert from 'node:assert/strict';import {physicalStops} from '../src/stop-details.js';
const stops=[{id:'a',name:'Mairie',city:'Loos',lines:['L5']},{id:'b',name:'Mairie',city:'Loos',lines:['L5']},{id:'c',name:'École',city:'Tourcoing',lines:['M2']},{id:'d',name:'Mairie',city:'Loos',lines:[]}];
test('physical search retains separate platforms and excludes unserved points',()=>{assert.deepEqual(physicalStops(stops,'mairie loos').map(s=>s.id),['a','b']);});
test('physical search supports accents, city and empty states',()=>{assert.equal(physicalStops(stops,'ecole tourcoing')[0].id,'c');assert.deepEqual(physicalStops(stops,''),[]);assert.deepEqual(physicalStops(stops,'missing'),[]);});
