import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizePhoto} from '../server/photo.mjs';
import {createStore} from '../server/store.mjs';
const sample={mode:'bus',place:'Lille Flandres',line:'C1',lat:50.63,lon:3.06};
test('photo is decoded, resized, reencoded as JPEG and stripped of metadata',async()=>{const original=await sharp({create:{width:1600,height:900,channels:3,background:'#10aadd'}}).withMetadata().jpeg().toBuffer();const out=await normalizePhoto('data:image/jpeg;base64,'+original.toString('base64'));const m=await sharp(out).metadata();assert.equal(m.format,'jpeg');assert.equal(m.width,1280);assert.equal(m.exif,undefined)});
test('invalid photo, SVG and oversized input are rejected; missing photo remains optional',async()=>{assert.equal(await normalizePhoto(undefined),null);for(const value of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,YmFk', 'x'.repeat(1400001)])await assert.rejects(normalizePhoto(value),e=>e.status===400)});
test('photo follows report ownership, removal and expiry without inflating report list',async()=>{let now=1700000000000;const s=createStore(':memory:',()=>now);try{const owner=s.issue(),other=s.issue();const image=await sharp({create:{width:4,height:4,channels:3,background:'#ffffff'}}).jpeg().toBuffer();const id=s.add(owner,sample,image);assert.equal(s.list()[0].hasPhoto,1);assert.equal(s.list()[0].image,undefined);assert.deepEqual(Buffer.from(s.photo(id)),image);assert.throws(()=>s.remove(other,id));assert.ok(s.photo(id));s.remove(owner,id);assert.throws(()=>s.photo(id));now+=61000;const id2=s.add(owner,sample,image);now+=900000;assert.throws(()=>s.photo(id2));s.clean();}finally{s.close()}});
