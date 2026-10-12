import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
const sample = {
  mode: "metro",
  place: "Gare Lille Flandres",
  line: "M1",
  lat: 50.636,
  lon: 3.069,
};
function fixture(t) {
  let now = 1700000000000;
  const store = createStore(":memory:", () => now);
  t.after(() => store.close());
  return { store, advance: (n) => (now += n * 60000) };
}
test("new report is public without owner token and expires after 15 minutes", (t) => {
  const { store, advance } = fixture(t);
  const author = store.issue();
  store.add(author, sample);
  const r = store.list()[0];
  assert.equal(r.place, sample.place);
  assert.equal(r.owner, undefined);
  assert.equal(r.own, false);
  assert.equal(store.list(author)[0].own, true);
  advance(15);
  assert.equal(store.list().length, 0);
});
test("one independent confirmation per session, no own vote, capped lifetime", (t) => {
  const { store, advance } = fixture(t);
  const a = store.issue(),
    b = store.issue(),
    c = store.issue();
  const id = store.add(a, sample);
  assert.throws(() => store.vote(a, id, 1), { status: 409 });
  advance(12);
  store.vote(b, id, 1);
  assert.equal(store.list(b)[0].confirmations, 1);
  assert.throws(() => store.vote(b, id, -1), { status: 409 });
  advance(9);
  store.vote(c, id, 1);
  advance(9);
  assert.equal(store.list().length, 0);
  assert.throws(() => store.vote(store.issue(), id, 1), { status: 404 });
});
test("two independent negative votes remove the report", (t) => {
  const { store } = fixture(t);
  const id = store.add(store.issue(), sample);
  store.vote(store.issue(), id, -1);
  assert.equal(store.list().length, 1);
  store.vote(store.issue(), id, -1);
  assert.equal(store.list().length, 0);
});
test("only owner may remove, invalid values and flood rejected", (t) => {
  const { store } = fixture(t);
  const a = store.issue();
  assert.throws(() => store.add("forged", sample), { status: 401 });
  assert.throws(() => store.add(a, { ...sample, lat: Infinity }), {
    status: 400,
  });
  assert.throws(() => store.add(a, { ...sample, mode: "invalid" }), {
    status: 400,
  });
  const id = store.add(a, sample);
  assert.throws(() => store.add(a, sample), { status: 429 });
  assert.throws(() => store.remove(store.issue(), id), { status: 404 });
  assert.throws(() => store.vote(store.issue(), id, 0), { status: 400 });
  store.remove(a, id);
  assert.equal(store.list().length, 0);
});
test("SQLite persistence survives a server restart and bbox filters", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "passage-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "test.sqlite");
  let store = createStore(path);
  const token = store.issue();
  store.add(token, sample);
  store.close();
  store = createStore(path);
  assert.equal(store.list(token)[0].own, true);
  assert.equal(store.list(token, [0, 0, 1, 1]).length, 0);
  store.close();
});

import { distance } from "../src/distance.js";
test("adapted Turf distance handles local and antipodal coordinates", () => {
  assert.equal(distance(sample, sample), 0);
  assert.ok(
    Math.abs(distance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111195) < 2,
  );
  assert.ok(
    Number.isFinite(distance({ lat: 90, lon: 0 }, { lat: -90, lon: 180 })),
  );
});
test('account report ownership cannot be reassigned or removed by another account',t=>{const {store}=fixture(t),guest=store.issue();const id=store.add(guest,sample);assert.equal(store.linkAccount(guest,'account-a'),true);assert.equal(store.linkAccount(guest,'account-b'),false);assert.equal(store.mine('account-a').length,1);assert.equal(store.mine('account-b').length,0);assert.throws(()=>store.removeAccount('account-b',id),{status:404});store.removeAccount('account-a',id);assert.equal(store.mine('account-a')[0].closed,1);assert.equal(store.list().length,0);});
