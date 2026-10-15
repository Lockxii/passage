import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {ApiError} from './store.mjs';
const scrypt=promisify(derive),hash=t=>createHash('sha256').update(t).digest('hex');
export function createAccounts(path,clock=Date.now){
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS account_sessions(id TEXT PRIMARY KEY,account TEXT NOT NULL,expires INTEGER NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(accounts)').all().some(c=>c.name==='recovery'))db.exec('ALTER TABLE accounts ADD COLUMN recovery TEXT');
 db.exec('CREATE TABLE IF NOT EXISTS favorites(account TEXT NOT NULL,id TEXT NOT NULL,label TEXT NOT NULL,origin TEXT,destination TEXT NOT NULL,PRIMARY KEY(account,id))');
 if(!db.prepare('PRAGMA table_info(accounts)').all().some(c=>c.name==='avatar'))db.exec('ALTER TABLE accounts ADD COLUMN avatar BLOB');
 const newRecovery=()=>randomBytes(24).toString('hex').toUpperCase().match(/.{6}/g).join('-');
 const recoveryHash=value=>hash(typeof value==='string'?value.replace(/[\s-]/g,'').toUpperCase():'');
 const profile=a=>({id:a.id,email:a.email,name:a.name,avatar:a.avatar?`data:image/jpeg;base64,${Buffer.from(a.avatar).toString('base64')}`:null});
 function issue(a){db.prepare('DELETE FROM account_sessions WHERE expires<=?').run(clock());const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO account_sessions VALUES(?,?,?)').run(hash(token),a.id,clock()+7*86400000);return {user:profile(a),token};}
 return {
 async authenticate(p,register=false){
  const email=typeof p?.email==='string'?p.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof p.password!=='string'||p.password.length<12||p.password.length>128)throw new ApiError(400,'Utilisez une adresse e-mail valide et un mot de passe de 12 à 128 caractères.');
  const a=db.prepare('SELECT * FROM accounts WHERE email=?').get(email);
  if(register){
   const name=typeof p.name==='string'?p.name.trim():'';
   if(name.length<2||name.length>40)throw new ApiError(400,'Choisissez un prénom ou pseudo de 2 à 40 caractères.');
   const salt=randomBytes(16).toString('hex'),password=(await scrypt(p.password,salt,64)).toString('hex');
   if(a)throw new ApiError(409,'Impossible de créer ce compte. Essayez de vous connecter.');
   const user={id:randomUUID(),email,name};
   const recoveryKey=newRecovery();
   try{db.prepare('INSERT INTO accounts(id,email,name,salt,password,recovery) VALUES(?,?,?,?,?,?)').run(user.id,email,name,salt,password,recoveryHash(recoveryKey));}catch(e){if(e.code?.includes('SQLITE'))throw new ApiError(409,'Impossible de créer ce compte. Essayez de vous connecter.');throw e;}
   return {...issue(user),recoveryKey};
  }
  const computed=await scrypt(p.password,a?.salt||'00000000000000000000000000000000',64);
  if(!a||!timingSafeEqual(computed,Buffer.from(a.password,'hex'))||db.prepare('SELECT password FROM accounts WHERE id=?').get(a.id)?.password!==a.password)throw new ApiError(401,'E-mail ou mot de passe incorrect.');
  return issue(a);
 },
 async recover(p){
  const email=typeof p?.email==='string'?p.email.trim().toLowerCase():'';
  if(typeof p?.password!=='string'||p.password.length<12||p.password.length>128)throw new ApiError(400,'Le nouveau mot de passe doit contenir de 12 à 128 caractères.');
  const a=db.prepare('SELECT * FROM accounts WHERE email=?').get(email);
  const supplied=recoveryHash(p.recoveryKey);
  if(!a?.recovery||!timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(a.recovery,'hex')))throw new ApiError(401,'E-mail ou clé de récupération incorrecte.');
  const salt=randomBytes(16).toString('hex'),password=(await scrypt(p.password,salt,64)).toString('hex'),recoveryKey=newRecovery();
  db.exec('BEGIN IMMEDIATE');
  try{
   const changed=db.prepare('UPDATE accounts SET salt=?,password=?,recovery=? WHERE id=? AND recovery=?').run(salt,password,recoveryHash(recoveryKey),a.id,supplied);
   if(changed.changes!==1)throw new ApiError(401,'Cette clé a déjà été utilisée.');
   db.prepare('DELETE FROM account_sessions WHERE account=?').run(a.id);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {...issue(a),recoveryKey};
 },
 async rotateRecovery(token,p){
  const user=this.me(token),a=db.prepare('SELECT * FROM accounts WHERE id=?').get(user.id);
  if(typeof p?.password!=='string'||p.password.length>128)throw new ApiError(400,'Saisissez votre mot de passe actuel.');
  const computed=await scrypt(p.password,a.salt,64);
  if(!timingSafeEqual(computed,Buffer.from(a.password,'hex')))throw new ApiError(401,'Mot de passe incorrect.');
  this.me(token);
  const recoveryKey=newRecovery();
  const changed=db.prepare('UPDATE accounts SET recovery=? WHERE id=? AND password=?').run(recoveryHash(recoveryKey),a.id,a.password);
  if(changed.changes!==1)throw new ApiError(401,'Votre mot de passe a changé. Reconnectez-vous.');
  return {recoveryKey};
 },
 me(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new ApiError(401,'Connectez-vous à votre compte.');const a=db.prepare('SELECT a.* FROM accounts a JOIN account_sessions s ON s.account=a.id WHERE s.id=? AND s.expires>?').get(hash(token),clock());if(!a)throw new ApiError(401,'Votre session a expiré. Reconnectez-vous.');return profile(a);},
 setAvatar(token,image){const user=this.me(token);db.prepare('UPDATE accounts SET avatar=? WHERE id=?').run(image,user.id);return this.me(token);},
 reportAuthor(id){const a=db.prepare('SELECT a.name,a.avatar FROM reports r JOIN account_report_owners o ON o.owner=r.owner JOIN accounts a ON a.id=o.account WHERE r.id=? AND r.closed=0 AND r.expires>?').get(id,clock());return a?{name:a.name,hasAvatar:!!a.avatar}:null;},
 reportAvatar(id){return db.prepare('SELECT a.avatar FROM reports r JOIN account_report_owners o ON o.owner=r.owner JOIN accounts a ON a.id=o.account WHERE r.id=? AND r.closed=0 AND r.expires>?').get(id,clock())?.avatar;},
 logout(token){if(typeof token==='string')db.prepare('DELETE FROM account_sessions WHERE id=?').run(hash(token));},
 favorites(token){const user=this.me(token);return db.prepare('SELECT id,label,origin,destination FROM favorites WHERE account=? ORDER BY rowid').all(user.id).map(f=>({...f,from:f.origin?JSON.parse(f.origin):null,to:JSON.parse(f.destination)}));},
 saveFavorite(token,p){
  const user=this.me(token);
  const place=v=>v&&typeof v.name==='string'&&v.name.length>=2&&v.name.length<=250&&typeof v.lat==='number'&&Number.isFinite(v.lat)&&v.lat>=-90&&v.lat<=90&&typeof v.lon==='number'&&Number.isFinite(v.lon)&&v.lon>=-180&&v.lon<=180;
  if(!place(p?.to)||(p.from!=null&&!place(p.from))||typeof p.label!=='string'||p.label.trim().length<2||p.label.length>60)throw new ApiError(400,'Choisissez un nom et une destination valide.');
  const id=['home','work'].includes(p.id)?p.id:randomUUID();
  if(!['home','work'].includes(id)&&db.prepare('SELECT count(*) n FROM favorites WHERE account=?').get(user.id).n>=30)throw new ApiError(400,'Vous pouvez enregistrer 30 favoris.');
  const clean=v=>JSON.stringify({name:v.name,lat:v.lat,lon:v.lon});
  db.prepare('INSERT INTO favorites VALUES(?,?,?,?,?) ON CONFLICT(account,id) DO UPDATE SET label=excluded.label,origin=excluded.origin,destination=excluded.destination').run(user.id,id,p.label.trim(),p.from?clean(p.from):null,clean(p.to));return {id};
 },
 deleteFavorite(token,id){const user=this.me(token);db.prepare('DELETE FROM favorites WHERE account=? AND id=?').run(user.id,id);},
 close(){db.close();}
 };
}
