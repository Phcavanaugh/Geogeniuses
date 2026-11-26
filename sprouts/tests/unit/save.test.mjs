import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore, migrateProfile, exportData, parseImport, NewerSaveError, PREFIX } from '../../js/engine/save.js';
import { newProfile, hatchTap, plant, SCHEMA_VERSION } from '../../js/engine/game.js';
import { HATCH_TAPS } from '../../config/stages.js';
import { PLOT_COUNT } from '../../config/crops.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.full = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.full) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

function sample(now = 1000) {
  const p = newProfile('Mia', 2, now);
  for (let i = 0; i < HATCH_TAPS; i++) hatchTap(p, now);
  p.pet.name = 'Bean';
  plant(p, 0, 'strawberry');
  p.inventory.food.peas = 4;
  p.collection.push({ id: 'x', name: 'Old', form: 'honeyhorn', path: ['puffkin', 'berrybun', 'jellyhop', 'honeyhorn'] });
  return p;
}

test('save → load round trip keeps profiles, pet, crops, inventory and collection', () => {
  const st = new FakeStorage(), store = new SaveStore(st);
  const a = sample(), b = newProfile('Leo', 1, 1000);
  const index = store.loadIndex();
  index.profileIds.push(a.id, b.id);
  index.settings.muted = true;
  store.saveIndex(index); store.saveProfile(a); store.saveProfile(b);

  const again = new SaveStore(st).loadAll(2000);
  assert.equal(again.profiles.length, 2);
  assert.equal(again.index.settings.muted, true);
  const a2 = again.profiles.find(p => p.id === a.id);
  assert.equal(a2.pet.name, 'Bean');
  assert.equal(a2.pet.stage, 'baby');
  assert.equal(a2.farm.plots[0].crop, 'strawberry');
  assert.equal(a2.inventory.food.peas, 4);
  assert.equal(a2.collection[0].form, 'honeyhorn');
  assert.ok(a2.discovered.includes('jellyhop'), 'discovered list rebuilt from collection paths');
});

test('each child is stored under its own key', () => {
  const st = new FakeStorage(), store = new SaveStore(st);
  const a = sample(), b = newProfile('Leo', 1, 1000);
  store.saveProfile(a); store.saveProfile(b);
  assert.ok(st.getItem(PREFIX + 'profile.' + a.id));
  assert.ok(st.getItem(PREFIX + 'profile.' + b.id));
});

test('migration from an unversioned (v0) save', () => {
  const v0 = {
    id: 'old1', name: 'Zoe', lastTick: 50_000,
    seeds: { carrot: 3, bogus: 9 }, food: { strawberry: 2 }, stars: 4,
    pet: { stage: 'toddler', form: 'leafling', stageStartedAt: 20_000, needs: { hunger: 50, happiness: 60, hygiene: 70, energy: 80 } },
    farm: { plots: [{ crop: 'peas', growMs: 1000 }] },
  };
  const p = migrateProfile(v0, 60_000);
  assert.equal(p.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(p.inventory, { seeds: { carrot: 3 }, food: { strawberry: 2 }, stars: 4 });
  assert.equal(p.pet.stageMs, 30_000);
  assert.equal(p.pet.stageStartedAt, undefined);
  assert.equal(p.farm.plots.length, PLOT_COUNT);
  assert.equal(p.farm.plots[0].crop, 'peas');
  assert.equal(p.seeds, undefined);
});

test('repair: missing and bad fields get safe defaults', () => {
  const p = migrateProfile({ schemaVersion: 1, id: 'r', name: 'Ray',
    pet: { stage: 'teen', form: 'renamedForm', needs: { hunger: 'abc', energy: 500 } },
    farm: { plots: [{ crop: 'not-a-crop' }], decorations: ['windmill', 'windmill', 'castle'] },
    collection: [{ form: 'nope' }, { form: 'mossdrake', name: 'M' }] }, 0);
  assert.equal(p.pet.stage, 'teen');
  assert.ok(['jellyhop', 'fernfox', 'burrowbear'].includes(p.pet.form));
  assert.equal(p.pet.needs.energy, 100);
  assert.equal(typeof p.pet.needs.hunger, 'number');
  assert.equal(p.farm.plots[0].crop, null);
  assert.deepEqual(p.farm.decorations, ['windmill']);
  assert.equal(p.collection.length, 1);
});

test('a save from a newer game version is not loaded and never overwritten', () => {
  const st = new FakeStorage(), store = new SaveStore(st);
  const future = { ...sample(), schemaVersion: SCHEMA_VERSION + 1 };
  st.setItem(PREFIX + 'profile.' + future.id, JSON.stringify(future));
  st.setItem(PREFIX + 'index', JSON.stringify({ profileIds: [future.id] }));
  assert.throws(() => migrateProfile(future), NewerSaveError);
  const { profiles } = store.loadAll();
  assert.equal(profiles.length, 0);
  assert.equal(store.problems.length, 1);
  assert.equal(store.saveProfile({ ...future, name: 'clobber' }), false);
  assert.equal(JSON.parse(st.getItem(PREFIX + 'profile.' + future.id)).name, 'Mia');
});

test('damaged JSON is backed up, skipped, and does not affect other children', () => {
  const st = new FakeStorage(), store = new SaveStore(st);
  const good = sample();
  store.saveProfile(good);
  st.setItem(PREFIX + 'profile.bad', '{not json');
  st.setItem(PREFIX + 'index', JSON.stringify({ profileIds: ['bad', good.id] }));
  const { profiles } = store.loadAll(5);
  assert.deepEqual(profiles.map(p => p.id), [good.id]);
  assert.equal(st.getItem(PREFIX + 'damaged.bad.5'), '{not json');
});

test('old-version saves are written back upgraded on load', () => {
  const st = new FakeStorage(), store = new SaveStore(st);
  st.setItem(PREFIX + 'profile.o', JSON.stringify({ id: 'o', name: 'Old' }));
  st.setItem(PREFIX + 'index', JSON.stringify({ profileIds: ['o'] }));
  store.loadAll();
  assert.equal(JSON.parse(st.getItem(PREFIX + 'profile.o')).schemaVersion, SCHEMA_VERSION);
});

test('storage full: save reports failure instead of throwing', () => {
  const st = new FakeStorage(), store = new SaveStore(st);
  st.full = true;
  assert.equal(store.saveProfile(sample()), false);
  assert.ok(store.lastError);
});

test('export → import round trip', () => {
  const a = sample();
  const text = JSON.stringify(exportData({ settings: { muted: false, volume: 0.5 } }, [a], 0));
  const { profiles, settings } = parseImport(text, 10);
  assert.equal(profiles[0].id, a.id);
  assert.equal(profiles[0].pet.name, 'Bean');
  assert.equal(settings.volume, 0.5);
});

test('import rejects files that are not Sprout Pals backups', () => {
  assert.throws(() => parseImport('hello'), /isn't a Sprout Pals backup/);
  assert.throws(() => parseImport(JSON.stringify({ app: 'other', profiles: [] })), /isn't a Sprout Pals backup/);
});
