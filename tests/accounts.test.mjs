import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccounts} from '../server/accounts.mjs';
test('accounts: registration, normalization, login, revocation, expiry and validation',async()=>{
 let now=Date.now();const a=createAccounts(':memory:',()=>now);
 try{
 const p={email:' Test@example.org ',name:'Camille',password:'A-long-test-password'};
 const created=await a.authenticate(p,true);
 assert.equal(created.user.email,'test@example.org');assert.equal(a.me(created.token).name,'Camille');assert.equal(created.user.password,undefined);
 await assert.rejects(a.authenticate(p,true),{status:409});
 await assert.rejects(a.authenticate({...p,password:'Wrong-long-password'}),{status:401});
 await assert.rejects(a.authenticate({...p,email:'nobody@example.org'}),{status:401});
 await assert.rejects(a.authenticate({...p,password:'short'},true),{status:400});
 const logged=await a.authenticate(p);a.logout(created.token);assert.throws(()=>a.me(created.token),{status:401});assert.equal(a.me(logged.token).email,'test@example.org');
 now+=8*86400000;assert.throws(()=>a.me(logged.token),{status:401});assert.throws(()=>a.me('invalid'),{status:401});
 }finally{a.close();}
});
test('recovery keys are one-use, rotate and revoke every prior session',async()=>{
 const a=createAccounts(':memory:');
 const p={email:'recovery@example.org',name:'Camille',password:'Original-password-123'};
 try{
 const first=await a.authenticate(p,true),second=await a.authenticate(p);
 assert.match(first.recoveryKey,/^(?:[A-F0-9]{6}-){7}[A-F0-9]{6}$/);
 assert.equal(second.recoveryKey,undefined);assert.equal(a.me(first.token).recovery,undefined);
 await assert.rejects(a.recover({...p,recoveryKey:'bad'}),{status:401});
 await assert.rejects(a.rotateRecovery(first.token,{password:'Wrong-password-123'}),{status:401});
 const rotated=await a.rotateRecovery(first.token,{password:p.password});
 await assert.rejects(a.recover({...p,recoveryKey:first.recoveryKey}),{status:401});
 const next={...p,password:'Changed-password-456',recoveryKey:rotated.recoveryKey.toLowerCase().replaceAll('-',' ')};
 const results=await Promise.allSettled([a.recover(next),a.recover(next)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const restored=results.find(r=>r.status==='fulfilled').value;
 assert.notEqual(restored.recoveryKey,rotated.recoveryKey);
 for(const token of [first.token,second.token])assert.throws(()=>a.me(token),{status:401});
 assert.equal(a.me(restored.token).email,p.email);
 await assert.rejects(a.authenticate(p),{status:401});
 assert.equal((await a.authenticate(next)).user.email,p.email);
 await assert.rejects(a.recover(next),{status:401});
 assert.ok((await a.recover({...next,recoveryKey:restored.recoveryKey})).token);
 }finally{a.close();}
});
test('favorites stay private, validate points and replace home',async()=>{
 const a=createAccounts(':memory:');try{const p={email:'one@example.org',name:'One',password:'Password-test-123'},x=await a.authenticate(p,true),y=await a.authenticate({...p,email:'two@example.org'},true);
 const f={id:'home',label:'Domicile',to:{name:'Mairie',lat:50.61,lon:2.98}};a.saveFavorite(x.token,f);a.saveFavorite(x.token,{...f,to:{...f.to,name:'Mairie Haubourdin'}});assert.equal(a.favorites(x.token).length,1);assert.equal(a.favorites(y.token).length,0);a.deleteFavorite(y.token,'home');assert.equal(a.favorites(x.token).length,1);assert.throws(()=>a.saveFavorite(x.token,{...f,to:{...f.to,lat:999}}),{status:400});a.deleteFavorite(x.token,'home');assert.equal(a.favorites(x.token).length,0);
 }finally{a.close();}
});
