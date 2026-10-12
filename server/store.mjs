import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash, randomUUID } from "node:crypto";
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function point(p) {
  return (
    p &&
    typeof p.lat === "number" &&
    typeof p.lon === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );
}
export function createStore(path, clock = Date.now) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, owner TEXT NOT NULL, mode TEXT NOT NULL, place TEXT NOT NULL, line TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL, closed INTEGER DEFAULT 0);
 CREATE INDEX IF NOT EXISTS active_reports ON reports(expires,closed);
 CREATE TABLE IF NOT EXISTS votes (report TEXT REFERENCES reports(id) ON DELETE CASCADE, voter TEXT, value INTEGER NOT NULL, PRIMARY KEY(report,voter));`);
  db.exec("CREATE TABLE IF NOT EXISTS report_photos(report TEXT PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE, image BLOB NOT NULL)");
  db.exec('CREATE TABLE IF NOT EXISTS account_report_owners(owner TEXT PRIMARY KEY, account TEXT NOT NULL)');
  const hash = (t) => createHash("sha256").update(t).digest("hex");
  function session(token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new ApiError(401, "Session expirée. Réessayez.");
    const id = hash(token);
    if (
      !db
        .prepare("SELECT id FROM sessions WHERE id=? AND expires>?")
        .get(id, clock())
    )
      throw new ApiError(401, "Session expirée. Réessayez.");
    return id;
  }
  function clean() {
    db.prepare("DELETE FROM report_photos WHERE report IN (SELECT id FROM reports WHERE closed=1 OR expires<=?)").run(clock());
    db.prepare("DELETE FROM reports WHERE expires<?").run(clock() - 86400000);
    db.prepare("DELETE FROM sessions WHERE expires<?").run(clock());
  }
  return {
    close: () => db.close(),
    clean,
    issue() {
      clean();
      const token = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions VALUES (?,?)").run(
        hash(token),
        clock() + 30 * 86400000,
      );
      return token;
    },
    session,
    linkAccount(token,account){const owner=session(token);db.prepare('INSERT OR IGNORE INTO account_report_owners VALUES(?,?)').run(owner,account);return db.prepare('SELECT account FROM account_report_owners WHERE owner=?').get(owner).account===account;},
    mine(account){return db.prepare(`SELECT r.id,r.mode,r.place,r.line,r.created,r.expires,r.closed FROM reports r JOIN account_report_owners o ON o.owner=r.owner WHERE o.account=? ORDER BY r.created DESC LIMIT 100`).all(account);},
    removeAccount(account,id){const r=db.prepare('SELECT r.id FROM reports r JOIN account_report_owners o ON o.owner=r.owner WHERE r.id=? AND o.account=?').get(id,account);if(!r)throw new ApiError(404,'Signalement introuvable.');db.prepare('UPDATE reports SET closed=1 WHERE id=?').run(id);clean();},
    list(token, bbox) {
      const me = token ? session(token) : "";
      let rows = db
        .prepare(
          `SELECT r.id,r.mode,r.place,r.line,r.lat,r.lon,r.created,r.expires,r.owner,EXISTS(SELECT 1 FROM report_photos p WHERE p.report=r.id) hasPhoto,COALESCE(SUM(CASE WHEN v.value=1 THEN 1 ELSE 0 END),0) confirmations FROM reports r LEFT JOIN votes v ON v.report=r.id WHERE r.closed=0 AND r.expires>? ${bbox ? "AND r.lon>=? AND r.lat>=? AND r.lon<=? AND r.lat<=?" : ""} GROUP BY r.id ORDER BY r.created DESC LIMIT 500`,
        )
        .all(clock(), ...(bbox || []));
      return rows.map(({ owner, ...r }) => ({
        ...r,
        own: owner === me,
        vote:
          db
            .prepare("SELECT value FROM votes WHERE report=? AND voter=?")
            .get(r.id, me)?.value ?? null,
      }));
    },
    photo(id) {
      const row=db.prepare("SELECT p.image FROM report_photos p JOIN reports r ON r.id=p.report WHERE r.id=? AND r.closed=0 AND r.expires>?").get(id,clock());
      if(!row)throw new ApiError(404,"Photo indisponible.");return row.image;
    },
    add(token, p, photo=null) {
      const owner = session(token);
      if (
        !point(p) ||
        !["bus", "metro", "tram"].includes(p.mode) ||
        typeof p.place !== "string" ||
        p.place.trim().length < 2 ||
        p.place.length > 100 ||
        typeof p.line !== "string" ||
        p.line.length > 24
      )
        throw new ApiError(400, "Vérifiez le lieu, le transport et la ligne.");
      if (
        db
          .prepare("SELECT id FROM reports WHERE owner=? AND created>?")
          .get(owner, clock() - 60000)
      )
        throw new ApiError(
          429,
          "Attendez une minute avant un autre signalement.",
        );
      const id = randomUUID();
      db.exec("BEGIN IMMEDIATE");
      try {
      db.prepare(
        "INSERT INTO reports(id,owner,mode,place,line,lat,lon,created,expires) VALUES (?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        owner,
        p.mode,
        p.place.trim(),
        p.line.trim(),
        p.lat,
        p.lon,
        clock(),
        clock() + 15 * 60000,
      );
      if(photo)db.prepare("INSERT INTO report_photos(report,image) VALUES (?,?)").run(id,photo);
      db.exec("COMMIT");
      return id;
      }catch(error){db.exec("ROLLBACK");throw error;}
    },
    vote(token, id, value) {
      const voter = session(token);
      if (value !== 1 && value !== -1)
        throw new ApiError(400, "Confirmation invalide.");
      const r = db
        .prepare("SELECT * FROM reports WHERE id=? AND closed=0 AND expires>?")
        .get(id, clock());
      if (!r) throw new ApiError(404, "Ce signalement a expiré.");
      if (r.owner === voter)
        throw new ApiError(
          409,
          "Vous ne pouvez pas confirmer votre propre signalement.",
        );
      if (
        db
          .prepare("SELECT 1 FROM votes WHERE report=? AND voter=?")
          .get(id, voter)
      )
        throw new ApiError(409, "Votre avis a déjà été enregistré.");
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("INSERT INTO votes VALUES (?,?,?)").run(id, voter, value);
        if (value === 1)
          db.prepare("UPDATE reports SET expires=? WHERE id=?").run(
            Math.max(
              r.expires,
              Math.min(r.created + 30 * 60000, clock() + 10 * 60000),
            ),
            id,
          );
        const n = db
          .prepare("SELECT COUNT(*) n FROM votes WHERE report=? AND value=-1")
          .get(id).n;
        if (n >= 2)
          db.prepare("UPDATE reports SET closed=1 WHERE id=?").run(id);
        db.exec("COMMIT");
        clean();
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    remove(token, id) {
      const owner = session(token);
      if (
        !db
          .prepare(
            "UPDATE reports SET closed=1 WHERE id=? AND owner=? AND closed=0",
          )
          .run(id, owner).changes
      )
        throw new ApiError(404, "Signalement introuvable.");
      clean();
    },
  };
}
