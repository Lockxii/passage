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
    proc.kill();
    await new Promise((r) => proc.on("exit", r));
    rmSync(temp, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    proc.stdout.once("data", resolve);
    proc.once("error", reject);
    proc.once("exit", (c) => reject(Error("Server exit " + c)));
  });
  const call = async (path, method = "GET", body, token, origin) => {
    const r = await fetch("http://127.0.0.1:4399/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(origin ? { Origin: origin } : {}),
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
  const created = await call("/reports", "POST", payload, a);
  assert.equal(created.status, 201);
  const id = created.data.id;
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
  assert.equal((await fetch("http://127.0.0.1:4399/api/reports/"+id+"/photo")).status,404);
});
