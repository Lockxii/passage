import {createAccounts} from './accounts.mjs';
import {normalizePhoto} from './photo.mjs';
import {createRealtime} from './realtime.mjs';

import http from "node:http";

import {

  mkdirSync,

  readFileSync,

  existsSync,

  statSync,

  createReadStream,

} from "node:fs";

import { resolve, extname, dirname, sep } from "node:path";

import { fileURLToPath } from "node:url";

import { createStore, ApiError, point } from "./store.mjs";

import { createPlanner } from "./transit-planner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

mkdirSync(resolve(root, "data"), { recursive: true });

const store = createStore(

  process.env.DB_PATH || resolve(root, "data/passage.sqlite"),

);

const accounts=createAccounts(process.env.DB_PATH || resolve(root, 'data/passage.sqlite'));

const transit = JSON.parse(

  readFileSync(resolve(root, "public/transit.json"), "utf8"),

);

const stops = new Map(transit.stops.map((s) => [s.id, s]));

const routes = new Map(transit.routes.map((s) => [s.id, s]));

const allowed = new Set(

  (

    process.env.ALLOWED_ORIGINS ||

    "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4311,http://localhost:4311,https://localhost,capacitor://localhost"

  ).split(","),

);

const limits = new Map(),

  cache = new Map();

let nextExternal = {};

function limit(key, n, ms) {

  const now = Date.now();

  let a = limits.get(key);

  if (!a || a.until < now) a = { count: 0, until: now + ms };

  if (++a.count > n)

    throw new ApiError(429, "Trop de demandes. Réessayez dans un instant.");

  limits.set(key, a);

}

setInterval(() => {

  for (const [k, v] of limits) if (v.until < Date.now()) limits.delete(k);

  store.clean();

}, 60000).unref();

async function external(kind, url) {

  if (cache.has(url) && cache.get(url).until > Date.now())

    return cache.get(url).data;

  const slot = Math.max(nextExternal[kind] || 0, Date.now());

  if (slot - Date.now() > 15000) throw new ApiError(429, "Le calcul est très demandé. Réessayez dans un instant.");

  nextExternal[kind] = slot + 1100;

  if (slot > Date.now()) await new Promise(resolve => setTimeout(resolve, slot - Date.now()));

  let response;

  try {

    response = await fetch(url, {

      headers: {

        "User-Agent":

          process.env.MAPS_USER_AGENT || "Passage/0.1 (local development)",

        "Accept-Language": "fr",

      },

      signal: AbortSignal.timeout(14000),

    });

  } catch {

    throw new ApiError(

      503,

      "Le service cartographique est indisponible. Réessayez.",

    );

  }

  if (!response.ok)

    throw new ApiError(

      503,

      "Le service cartographique est indisponible. Réessayez.",

    );

  const data = await response.json();

  if (cache.size > 500) cache.delete(cache.keys().next().value);

  cache.set(url, { data, until: Date.now() + 3600000 });

  return data;

}

async function body(req, maxBytes=4096) {

  if (!req.headers["content-type"]?.startsWith("application/json"))

    throw new ApiError(415, "JSON attendu.");

  let text = "";

  for await (const chunk of req) {

    text += chunk;

    if (Buffer.byteLength(text) > maxBytes)

      throw new ApiError(413, "Demande trop volumineuse.");

  }

  try {

    return JSON.parse(text);

  } catch {

    throw new ApiError(400, "Demande invalide.");

  }

}

const planner = createPlanner({path:resolve(root,'resources/timetable.sqlite'),transit,external});

const realtime=createRealtime({schedule:planner.departures});

const server = http.createServer(async (req, res) => {

  try {

    const origin = req.headers.origin;

    if (origin && !allowed.has(origin))

      throw new ApiError(403, "Origine non autorisée.");

    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);

    res.setHeader("Vary", "Origin");

    res.setHeader("X-Content-Type-Options", "nosniff");

    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    if (req.method === "OPTIONS") {

      res.writeHead(204, {

        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Account-Token, X-Guest-Token",

        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",

      });

      return res.end();

    }

    const url = new URL(req.url, "http://localhost");

    const token = req.headers.authorization?.replace(/^Bearer /, "");

    const ip = req.socket.remoteAddress;

    const send = (data, status = 200) => {

      res.writeHead(status, {

        "Content-Type": "application/json; charset=utf-8",

        "Cache-Control": "no-store",

      });

      res.end(JSON.stringify(data));

    };

    if (url.pathname.startsWith("/api/")) {

      limit(ip + ":all", 240, 60000);

      if(url.pathname.startsWith('/api/account/')){
        if(url.pathname==='/api/account/workspace'&&req.method==='GET'){
          const user=accounts.me(token);if(req.headers['x-guest-token']){try{if(!store.linkAccount(req.headers['x-guest-token'],user.id))return send({resetGuest:true});}catch(e){if(e.status===401)return send({resetGuest:true});throw e;}}
          return send({favorites:accounts.favorites(token),reports:store.mine(user.id)});
        }
        if(url.pathname==='/api/account/favorites'&&req.method==='GET')return send({favorites:accounts.favorites(token)});
        if(url.pathname==='/api/account/favorites'&&req.method==='POST')return send(accounts.saveFavorite(token,await body(req)));
        const favorite=url.pathname.match(/^\/api\/account\/favorites\/([a-zA-Z0-9-]+)$/);
        if(favorite&&req.method==='DELETE'){accounts.deleteFavorite(token,favorite[1]);return send({ok:true});}
        const report=url.pathname.match(/^\/api\/account\/reports\/([a-zA-Z0-9-]+)$/);
        if(report&&req.method==='DELETE'){store.removeAccount(accounts.me(token).id,report[1]);return send({ok:true});}
        if(req.method==='POST'&&['/api/account/register','/api/account/login'].includes(url.pathname)){
          limit(ip+':account-auth',10,900000);
          return send(await accounts.authenticate(await body(req),url.pathname.endsWith('/register')));
        }
        if(req.method==='POST'&&['/api/account/recover','/api/account/recovery-key'].includes(url.pathname)){
          limit(ip+':account-auth',10,900000);
          const p=await body(req);
          return send(url.pathname.endsWith('/recover')?await accounts.recover(p):await accounts.rotateRecovery(token,p));
        }
        if(req.method==='GET'&&url.pathname==='/api/account/me')return send({user:accounts.me(token)});
        if(req.method==='POST'&&url.pathname==='/api/account/logout'){accounts.logout(token);return send({ok:true});}
      }

      if(url.pathname==='/api/departures'&&req.method==='GET'){

        const stop=url.searchParams.get('stop'),line=url.searchParams.get('line');

        if(!stops.has(stop)||!routes.has(line)||!stops.get(stop).lines.includes(line))throw new ApiError(400,'Arrêt ou ligne invalide.');

        limit(ip+':departures',60,60000);

        return send(await realtime.departures(stop,line));

      }

      if (url.pathname === "/api/health" && req.method === "GET")

        return send({ ok: true });

      if (url.pathname === "/api/session" && req.method === "POST") {

        await body(req);

        limit(ip + ":session", 15, 3600000);

        return send({ token: store.issue() });

      }

      if (url.pathname === "/api/reports" && req.method === "GET") {

        let bbox;

        if (url.searchParams.has("bbox")) {

          bbox = url.searchParams.get("bbox").split(",").map(Number);

          if (

            bbox.length !== 4 ||

            bbox.some((x) => !Number.isFinite(x)) ||

            bbox[0] > bbox[2] ||

            bbox[1] > bbox[3] ||

            Math.abs(bbox[0]) > 180 ||

            Math.abs(bbox[2]) > 180 ||

            Math.abs(bbox[1]) > 90 ||

            Math.abs(bbox[3]) > 90

          )

            throw new ApiError(400, "Zone invalide.");

        }

        return send({ reports: store.list(token, bbox), now: Date.now() });

      }

      if (url.pathname === "/api/reports" && req.method === "POST") {

        limit(ip + ":create", 12, 3600000);

        const p = await body(req,1450000);

        if (typeof p.stopId !== "string" || typeof p.routeId !== "string")

          throw new ApiError(400, "Choisissez un arrêt et une ligne.");

        if (p.stopId) {

          const s = stops.get(p.stopId);

          const r = routes.get(p.routeId);

          if (!s || !r || !s.lines.includes(r.id) || r.mode !== p.mode)

            throw new ApiError(400, "Arrêt ou ligne invalide.");

          Object.assign(p, {

            lat: s.lat,

            lon: s.lon,

            place: s.name,

            line: r.name,

          });

        }

        store.session(token);
        if(req.headers['x-account-token']&&!store.linkAccount(token,accounts.me(req.headers['x-account-token']).id))throw new ApiError(409,'Ouvrez Mon compte pour actualiser votre session.');
        return send({ id: store.add(token, p, await normalizePhoto(p.photo)) }, 201);

      }

      const photoMatch=url.pathname.match(/^\/api\/reports\/([a-f0-9-]{36})\/photo$/);
      if(photoMatch&&req.method==='GET'){
        const bytes=store.photo(photoMatch[1]);res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':bytes.length,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'"});return res.end(bytes);
      }
      const match = url.pathname.match(

        /^\/api\/reports\/([a-f0-9-]{36})(\/votes)?$/,

      );

      if (match && req.method === "POST" && match[2]) {

        limit(ip + ":vote", 40, 60000);

        store.vote(token, match[1], (await body(req)).value);

        return send({ ok: true });

      }

      if (match && req.method === "DELETE" && !match[2]) {

        store.remove(token, match[1]);

        return send({ ok: true });

      }

      if (url.pathname === "/api/search" && req.method === "GET") {

        const q = url.searchParams.get("q")?.trim();

        if (!q || q.length < 3 || q.length > 120)

          throw new ApiError(400, "Saisissez au moins 3 caractères.");

        const data = await external(

          "search",

          `${process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org/search"}?format=jsonv2&countrycodes=fr&limit=5&q=${encodeURIComponent(q)}`,

        );

        return send(

          data.map((p) => ({

            id: String(p.place_id),

            name: p.display_name,

            lat: Number(p.lat),

            lon: Number(p.lon),

          })),

        );

      }

      if (url.pathname === "/api/route" && req.method === "POST") {

        const p = await body(req);

        if (!point(p.from) || !point(p.to))

          throw new ApiError(400, "Choisissez un départ et une destination.");

        const url = `${process.env.ROUTER_URL || "https://routing.openstreetmap.de/routed-foot/route/v1/foot"}/${p.from.lon},${p.from.lat};${p.to.lon},${p.to.lat}?overview=full&geometries=geojson&steps=true`;

        const data = await external("route", url);

        if (data.code !== "Ok" || !data.routes?.length)

          throw new ApiError(404, "Aucun itinéraire piéton trouvé.");

        return send(data.routes[0]);

      }

      if (url.pathname === "/api/journeys" && req.method === "POST") {

        limit(ip+':journeys',12,60000);

        const p=await body(req);

        if(!point(p.from)||!point(p.to))throw new ApiError(400,'Choisissez un départ et une destination.');

        if(p.mode!==undefined&&!['all','walk','bus'].includes(p.mode))throw new ApiError(400,'Mode de trajet invalide.');

        const departure=p.departAt===undefined?Date.now():typeof p.departAt==='string'?Date.parse(p.departAt):NaN;

        if(!Number.isFinite(departure)||departure<Date.now()-60000||departure>Date.now()+30*86400000)throw new ApiError(400,'Choisissez un départ maintenant ou dans les 30 prochains jours.');

        return send(await planner.plan({from:p.from,to:p.to,departure,mode:p.mode||'all'}));

      }

      throw new ApiError(404, "Service introuvable.");

    }

    if (req.method !== "GET" && req.method !== "HEAD")

      throw new ApiError(405, "Méthode non autorisée.");

    const base = resolve(root, "dist/client");

    let path = resolve(base, "." + decodeURIComponent(url.pathname));

    if (path !== base && !path.startsWith(base + sep))

      throw new ApiError(403, "Accès refusé.");

    if (!existsSync(path) || !statSync(path).isFile())

      path = resolve(base, "index.html");

    if (!existsSync(path)) throw new ApiError(503, "Exécutez npm run build.");

    res.setHeader(

      "Content-Type",

      {

        ".html": "text/html; charset=utf-8",

        ".js": "text/javascript",

        ".css": "text/css",

        ".json": "application/json",

        ".svg": "image/svg+xml",

        ".png": "image/png",

        ".woff2": "font/woff2",

        ".webmanifest": "application/manifest+json",

      }[extname(path)] || "application/octet-stream",

    );

    res.setHeader(

      "Cache-Control",

      path.includes(`${sep}assets${sep}`)

        ? "public,max-age=31536000,immutable"

        : "no-cache",

    );

    if (req.method === "HEAD") return res.end();

    createReadStream(path).pipe(res);

  } catch (error) {

    if (!res.headersSent) {

      res.writeHead(error.status || 500, {

        "Content-Type": "application/json; charset=utf-8",

      });

      res.end(

        JSON.stringify({

          error: error.status

            ? error.message

            : "Une erreur est survenue. Réessayez.",

        }),

      );

    } else res.end();

    if (!error.status) console.error(error.message);

  }

});

server.listen(

  Number(process.env.PORT || 4311),

  process.env.HOST || "127.0.0.1",

  () => console.log("Passage http://127.0.0.1:" + (process.env.PORT || 4311)),

);

for (const s of ["SIGINT", "SIGTERM"])

  process.on(s, () =>

    server.close(() => {

      planner.close();

      store.close();

      process.exit();

    }),

  );

