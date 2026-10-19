import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankJourneys,readPreference} from '../src/journey-preferences.js';
const routes=[{id:'fast',arrival:1000,walking:600,changes:2},{id:'walk',arrival:1200,walking:60,changes:1},{id:'direct',arrival:1500,walking:300,changes:0}];
test('preferences sort measured properties without mutating source',()=>{assert.equal(rankJourneys(routes)[0].id,'fast');assert.equal(rankJourneys(routes,'walking')[0].id,'walk');assert.equal(rankJourneys(routes,'transfers')[0].id,'direct');assert.equal(routes[0].id,'fast');});
test('ties prefer earlier arrival and preserve fastest comparison',()=>{const result=rankJourneys([...routes,{id:'walk-early',arrival:1100,walking:60,changes:1}],'walking');assert.equal(result[0].id,'walk-early');assert.equal(rankJourneys(result)[0].id,'fast');});
test('invalid or unavailable storage falls back safely',()=>{assert.equal(readPreference({getItem:()=> 'walking'}),'walking');assert.equal(readPreference({getItem:()=> '__proto__'}),'fastest');assert.equal(readPreference({getItem(){throw Error();}}),'fastest');assert.deepEqual(rankJourneys([]),[]);});
