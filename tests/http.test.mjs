import sharp from 'sharp';
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("HTTP authorization, origin, canonical transit data and community round trip", async (t) => {
  const temp = mkdtempSync(join(tmpdir(), "passage-http-"));
  const proc = spawn(process.execPath, ["server/index.mjs"], {
    env: { ...process.env, PORT: "4399", DB_PATH: join(temp, "test.sqlite") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if(proc.exitCode===null && proc.signalCode===null){const exited=new Promise(r=>proc.once('exit',r));proc.kill();await exited;}
    rmSync(temp, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    proc.stdout.once("data", resolve);
    proc.once("error", reject);
    proc.once("exit", (c) => reject(Error("Server exit " + c)));
  });
  const call = async (path, method = "GET", body, token, origin, accountToken) => {
    const r = await fetch("http://127.0.0.1:4399/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(origin ? { Origin: origin } : {}),
        ...(accountToken ? { "X-Account-Token":accountToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  };
  assert.equal(
    (
      await call(
        "/reports",
        "GET",
        undefined,
        undefined,
        "https://untrusted.example",
      )
    ).status,
    403,
  );
  assert.equal((await call("/reports?bbox=bad")).status, 400);
  assert.equal((await call("/departures?stop=unknown&line=unknown")).status,400);
  assert.equal(
    (
      await call("/route", "POST", {
        from: { lat: 999, lon: 0 },
        to: { lat: 0, lon: 0 },
      })
    ).status,
    400,
  );
  const credentials={name:'Camille',email:'qa@example.org',password:'Long-test-password-123'};
  const account=await call('/account/register','POST',credentials);
  assert.equal(account.status,200);
  assert.equal((await call('/account/me','GET',undefined,account.data.token)).data.user.name,'Camille');
  assert.equal((await call('/account/login','POST',{...credentials,password:'Wrong-test-password'})).status,401);
  const login=await call('/account/login','POST',credentials);
  assert.equal(login.status,200);
  assert.equal((await call('/account/logout','POST',{},login.data.token)).status,200);
  assert.equal((await call('/account/me','GET',undefined,login.data.token)).status,401);
  assert.equal((await call('/account/register','POST',credentials,undefined,'https://untrusted.example')).status,403);
  const recovered=await call('/account/recover','POST',{email:credentials.email,recoveryKey:account.data.recoveryKey,password:'Replacement-password-456'});
  assert.equal(recovered.status,200);
  assert.equal((await call('/account/me','GET',undefined,account.data.token)).status,401);
  assert.equal((await call('/account/recover','POST',{...credentials,recoveryKey:account.data.recoveryKey})).status,401);
  assert.equal((await call('/account/recovery-key','POST',{password:'Replacement-password-456'},recovered.data.token)).status,200);
  assert.equal((await call('/account/favorites','POST',{id:'home',label:'Domicile',to:{name:'Test',lat:50.6,lon:3}},recovered.data.token)).status,200);
  assert.equal((await call('/account/workspace','GET',undefined,recovered.data.token)).data.favorites.length,1);
  assert.equal((await call('/account/favorites','GET',undefined,recovered.data.token)).data.favorites[0].id,'home');
  assert.equal((await call('/account/favorites')).status,401);
  assert.equal((await call('/account/workspace')).status,401);
  assert.equal((await call('/account/favorites/home','DELETE',undefined,recovered.data.token)).status,200);
  const a = (await call("/session", "POST", {})).data.token,
    b = (await call("/session", "POST", {})).data.token;
  const gtfs = JSON.parse(readFileSync("public/transit.json", "utf8"));
  const route = gtfs.routes.find((r) => r.name === "M2");
  const stop = gtfs.stops.find(
    (s) => s.name === "Gare Lille Flandres" && s.lines.includes(route.id),
  );
  const picture=await sharp({create:{width:8,height:8,channels:3,background:"#00aadd"}}).jpeg().toBuffer();
  const payload = {
    photo:"data:image/jpeg;base64,"+picture.toString("base64"),
    mode: "metro",
    stopId: stop.id,
    routeId: route.id,
    place: "forged",
    lat: 0,
    lon: 0,
    line: "wrong",
  };
  assert.equal((await call("/reports", "POST", payload, "forged")).status, 401);
  for(const accountToken of [undefined,'forged',login.data.token,account.data.token]) {
    const denied=await call('/reports','POST',{...payload,photo:'invalid-photo'},a,undefined,accountToken);
    assert.equal(denied.status,401);
    assert.equal(denied.data.code,'ACCOUNT_REQUIRED');
  }
  assert.equal((await call('/reports')).data.reports.length,0);
  assert.equal((await call('/reports','POST',payload,'forged',undefined,recovered.data.token)).status,401);
  assert.equal((await call('/reports','POST',{...payload,photo:'invalid-photo'},a,undefined,recovered.data.token)).status,400);
  const created = await call("/reports", "POST", payload, a,undefined,recovered.data.token);
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.ok((await call('/account/workspace','GET',undefined,recovered.data.token)).data.reports.some(r=>r.id===id));
  const preflight=await fetch('http://127.0.0.1:4399/api/account/avatar',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'PUT'}});
  assert.equal(preflight.status,204);assert.ok(preflight.headers.get('access-control-allow-methods').includes('PUT'));
  const avatarInput='data:image/png;base64,'+(await sharp({create:{width:480,height:300,channels:3,background:'#00b5d8'}}).png().withMetadata().toBuffer()).toString('base64');
  assert.equal((await call('/account/avatar','PUT',{avatar:avatarInput})).status,401);
  assert.equal((await call('/account/avatar','PUT',{avatar:avatarInput},account.data.token)).status,401);
  assert.equal((await call('/account/avatar','PUT',{avatar:'data:image/svg+xml;base64,PHN2Zz4='},recovered.data.token)).status,400);
  assert.equal((await call('/account/avatar','PUT',{},recovered.data.token)).status,400);
  const avatarSaved=await call('/account/avatar','PUT',{avatar:avatarInput},recovered.data.token);
  assert.equal(avatarSaved.status,200);
  const avatarMeta=await sharp(Buffer.from(avatarSaved.data.user.avatar.split(',')[1],'base64')).metadata();
  assert.equal(avatarMeta.width,256);assert.equal(avatarMeta.height,256);assert.equal(avatarMeta.exif,undefined);
  assert.deepEqual((await call('/reports')).data.reports[0].author,{name:'Camille',hasAvatar:true});
  const avatarResponse=await fetch('http://127.0.0.1:4399/api/reports/'+id+'/avatar');
  assert.equal(avatarResponse.status,200);assert.equal(avatarResponse.headers.get('cache-control'),'no-store');
  const originalAvatar=Buffer.from(await avatarResponse.arrayBuffer());
  const replacement='data:image/png;base64,'+(await sharp({create:{width:100,height:100,channels:3,background:'#ff9900'}}).png().toBuffer()).toString('base64');
  assert.equal((await call('/account/avatar','PUT',{avatar:replacement},recovered.data.token)).status,200);
  assert.notDeepEqual(Buffer.from(await (await fetch('http://127.0.0.1:4399/api/reports/'+id+'/avatar')).arrayBuffer()),originalAvatar);
  const other=await call('/account/register','POST',{...credentials,email:'other@example.org',name:'Other'});
  assert.equal(other.status,200);
  assert.equal((await call('/account/avatar','DELETE',undefined,other.data.token)).status,200);
  assert.equal((await fetch('http://127.0.0.1:4399/api/reports/'+id+'/avatar')).status,200);
  assert.equal((await call('/account/avatar','DELETE',undefined,recovered.data.token)).data.user.avatar,null);
  assert.equal((await fetch('http://127.0.0.1:4399/api/reports/'+id+'/avatar')).status,404);
  assert.deepEqual((await call('/reports')).data.reports[0].author,{name:'Camille',hasAvatar:false});

  const conflict=await call('/reports','POST',payload,a,undefined,other.data.token);
  assert.equal(conflict.status,409);assert.equal(conflict.data.code,'REPORT_SESSION_CONFLICT');
  assert.equal((await call('/account/reports/'+id,'DELETE',undefined,other.data.token)).status,404);
  const publicReports=(await call('/reports')).data.reports;
  assert.equal(publicReports.length,1);assert.equal(publicReports[0].email,undefined);assert.equal(publicReports[0].account,undefined);
  const report = (await call("/reports", "GET", undefined, b)).data.reports[0];
  assert.equal(report.place, stop.name);
  assert.equal(report.lat, stop.lat);
  assert.equal(report.line, "M2");
  assert.equal(report.owner, undefined);
  assert.equal(report.hasPhoto,1);
  const photo=await fetch("http://127.0.0.1:4399/api/reports/"+id+"/photo");
  assert.equal(photo.status,200);assert.equal(photo.headers.get("content-type"),"image/jpeg");assert.equal(photo.headers.get("cache-control"),"no-store");assert.equal((await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).format,"jpeg");
  assert.equal(
    (await call("/reports/" + id + "/votes", "POST", { value: 1 }, b)).status,
    200,
  );
  assert.equal(
    (await call("/reports/" + id + "/votes", "POST", { value: 1 }, b)).status,
    409,
  );
  assert.equal(
    (await call("/reports/" + id, "DELETE", undefined, b)).status,
    404,
  );
  assert.equal(
    (await call("/reports/" + id, "DELETE", undefined, a)).status,
    200,
  );
  assert.equal((await call("/reports")).data.reports.length, 0);
  const c=(await call('/session','POST',{})).data.token;
  const another=await call('/reports','POST',payload,c,undefined,recovered.data.token);
  assert.equal(another.status,201);
  assert.equal((await call('/account/reports/'+another.data.id,'DELETE',undefined,recovered.data.token)).status,200);
  assert.equal((await call('/reports')).data.reports.length,0);
  assert.equal((await fetch("http://127.0.0.1:4399/api/reports/"+id+"/photo")).status,404);
});
