import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nearbyStops} from '../src/nearby-stops.js';
const position={lat:50.63,lon:3.06};
const stop=(id,offset,extra={})=>({id,name:'Same station',lat:50.63+offset,lon:3.06,lines:['L1'],...extra});
test('nearby stops retain physical platforms, sort by distance and cap at four within 800m',()=>{
 const found=nearbyStops([stop('far',.02),stop('opposite',.001),stop('here',0),stop('third',.002),stop('fourth',.003),stop('fifth',.004),stop('unserved',0,{lines:[]})],position);
 assert.deepEqual(found.map(s=>s.id),['here','opposite','third','fourth']);assert.equal(found[0].metres,0);assert.ok(found[1].metres>100);
});
test('invalid coordinates and areas without service return no invented stops',()=>{
 assert.deepEqual(nearbyStops([stop('x',0)],{lat:NaN,lon:3}),[]);
 assert.deepEqual(nearbyStops([stop('x',0)],{lat:91,lon:3}),[]);
 assert.deepEqual(nearbyStops([stop('x',0)],{lat:0,lon:0}),[]);
});
