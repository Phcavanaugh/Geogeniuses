// Saving and loading. Everything lives in this device's localStorage:
//   sproutpals.index          -> { schemaVersion, profileIds: [...], settings: {...} }
//   sproutpals.profile.<id>   -> one child's whole game (pet, farm, inventory, collection)
// Each child is stored under its own key, so one damaged save can't affect the others.
//
// Loading always goes through migrateProfile(), which upgrades older save formats step by step
// and repairs missing or bad fields with safe defaults. A save written by a NEWER version of
// the game is left untouched (never overwritten) and reported instead.
import { SCHEMA_VERSION, newProfile, newPet } from './game.js';
import { PLOT_COUNT, CROPS } from '../../config/crops.js';
import { FORMS } from '../../config/evolution.js';
import { NEEDS, START_NEEDS } from '../../config/needs.js';
import { STAGE_ORDER } from '../../config/stages.js';
import { FOODS } from '../../config/foods.js';
import { DECORATIONS } from '../../config/rewards.js';

export const PREFIX = 'sproutpals.';
const INDEX_KEY = PREFIX + 'index';
const profileKey = id => PREFIX + 'profile.' + id;
export const DEFAULT_SETTINGS = { muted: false, volume: 0.7 };

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ---------- migrations ----------
// MIGRATIONS[n] upgrades a save from version n to n+1.
// Version 0 = any save without a schemaVersion (pre-release builds / hand-edited files).
// Pre-release saves kept seeds/food at the top level and used a stage start timestamp.
const MIGRATIONS = {
  0(p) {
    if (!isObj(p.inventory)) p.inventory = { seeds: p.seeds || {}, food: p.food || {}, stars: p.stars || 0 };
    delete p.seeds; delete p.food; delete p.stars;
    if (isObj(p.pet) && p.pet.stageMs == null && p.pet.stageStartedAt != null) {
      const ref = num(p.lastTick, Date.now());
      p.pet.stageMs = Math.max(0, ref - num(p.pet.stageStartedAt, ref));
      delete p.pet.stageStartedAt;
    }
    p.schemaVersion = 1;
    return p;
  },
};

export class NewerSaveError extends Error {}

/** Upgrade + repair one profile object. Throws NewerSaveError for saves from a newer game. */
export function migrateProfile(raw, now = Date.now()) {
  if (!isObj(raw)) throw new Error('not a profile');
  let p = JSON.parse(JSON.stringify(raw));
  let v = num(p.schemaVersion, 0);
  if (v > SCHEMA_VERSION) throw new NewerSaveError(`save version ${v} is newer than ${SCHEMA_VERSION}`);
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error('no migration from v' + v);
    p = step(p);
    v = num(p.schemaVersion, v + 1);
  }
  return repairProfile(p, now);
}

/** Fill in anything missing or invalid with safe defaults (current version shape). */
export function repairProfile(p, now = Date.now()) {
  const fresh = newProfile(p.name || 'Player', p.avatar, now);
  p.schemaVersion = SCHEMA_VERSION;
  p.id = typeof p.id === 'string' && p.id ? p.id : fresh.id;
  p.name = String(p.name || 'Player').slice(0, 16);
  p.avatar = num(p.avatar, 0) | 0;
  p.createdAt = num(p.createdAt, now);
  p.lastTick = num(p.lastTick, now);
  p.lastSeen = num(p.lastSeen, p.lastTick);

  // inventory
  const inv = isObj(p.inventory) ? p.inventory : fresh.inventory;
  const cleanCounts = (o, valid) => {
    const out = {};
    for (const [k, v] of Object.entries(isObj(o) ? o : {})) if (valid[k]) out[k] = Math.max(0, num(v, 0) | 0);
    return out;
  };
  p.inventory = { seeds: cleanCounts(inv.seeds, CROPS), food: cleanCounts(inv.food, FOODS), stars: Math.max(0, num(inv.stars, 0) | 0) };

  // farm
  const farm = isObj(p.farm) ? p.farm : {};
  const plots = Array.isArray(farm.plots) ? farm.plots : [];
  p.farm = {
    plots: Array.from({ length: PLOT_COUNT }, (_, i) => {
      const pl = plots[i];
      return isObj(pl) && CROPS[pl.crop] ? { crop: pl.crop, growMs: Math.max(0, num(pl.growMs, 0)) } : { crop: null, growMs: 0 };
    }),
    decorations: (Array.isArray(farm.decorations) ? farm.decorations : []).filter((d, i, a) => DECORATIONS[d] && a.indexOf(d) === i),
  };

  p.collection = (Array.isArray(p.collection) ? p.collection : []).filter(c => isObj(c) && FORMS[c.form]);
  p.discovered = (Array.isArray(p.discovered) ? p.discovered : []).filter(f => FORMS[f]);
  for (const c of p.collection) for (const f of c.path || [c.form]) if (FORMS[f] && !p.discovered.includes(f)) p.discovered.push(f);

  // pet
  p.pet = repairPet(p.pet, now);
  return p;
}

function repairPet(pet, now) {
  if (!isObj(pet)) return newPet(now);
  const out = { ...newPet(now), ...pet };
  if (!STAGE_ORDER.includes(out.stage)) return newPet(now);
  if (out.stage === 'egg') out.form = 'egg';
  else if (!FORMS[out.form] || FORMS[out.form].stage !== out.stage) {
    // Unknown form (e.g. renamed in config): keep the stage, pick the first form of that stage.
    const alt = Object.keys(FORMS).find(id => FORMS[id].stage === out.stage);
    if (!alt) return newPet(now);
    out.form = alt;
  }
  const needs = isObj(out.needs) ? out.needs : {};
  out.needs = {};
  for (const k of NEEDS) out.needs[k] = Math.max(0, Math.min(100, num(needs[k], START_NEEDS[k])));
  out.asleep = !!out.asleep;
  out.readyToGrow = !!out.readyToGrow;
  out.stageMs = Math.max(0, num(out.stageMs, 0));
  out.hatchTaps = Math.max(0, num(out.hatchTaps, 0) | 0);
  out.name = String(out.name || '').slice(0, 14);
  const scores = {};
  for (const [k, v] of Object.entries(isObj(out.evoScores) ? out.evoScores : {})) if (FORMS[k]) scores[k] = num(v, 0);
  out.evoScores = scores;
  out.goal = isObj(out.goal) ? out.goal : {};
  out.eaten = isObj(out.eaten) ? out.eaten : {};
  out.history = Array.isArray(out.history) ? out.history.filter(isObj) : [];
  return out;
}

// ---------- storage ----------

export class SaveStore {
  /** storage: anything with getItem/setItem/removeItem (localStorage, or a Map-backed fake in tests). */
  constructor(storage) {
    this.s = storage;
    this.lastError = null;
    this.problems = [];          // human-readable notes for the parent area
    this.lockedIds = new Set();  // profiles we must not overwrite (newer version)
  }

  _get(key) { try { return this.s.getItem(key); } catch (e) { this.lastError = e; return null; } }
  _set(key, value) {
    try { this.s.setItem(key, value); this.lastError = null; return true; }
    catch (e) { this.lastError = e; return false; }
  }

  loadIndex() {
    let idx = null;
    try { idx = JSON.parse(this._get(INDEX_KEY) || 'null'); } catch { idx = null; }
    if (!isObj(idx)) idx = {};
    return {
      schemaVersion: SCHEMA_VERSION,
      profileIds: (Array.isArray(idx.profileIds) ? idx.profileIds : []).filter(x => typeof x === 'string'),
      settings: { ...DEFAULT_SETTINGS, ...(isObj(idx.settings) ? idx.settings : {}) },
    };
  }

  saveIndex(index) {
    return this._set(INDEX_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, profileIds: index.profileIds, settings: index.settings }));
  }

  /** Load every profile listed in the index. Damaged ones are backed up and skipped. */
  loadAll(now = Date.now()) {
    const index = this.loadIndex();
    const profiles = [];
    for (const id of index.profileIds) {
      const p = this.loadProfile(id, now);
      if (p) profiles.push(p);
    }
    return { index, profiles };
  }

  loadProfile(id, now = Date.now()) {
    const text = this._get(profileKey(id));
    if (text == null) return null;
    let raw;
    try { raw = JSON.parse(text); }
    catch {
      this._set(PREFIX + 'damaged.' + id + '.' + now, text);
      this.problems.push(`A saved game (${id}) was damaged and could not be opened. A copy was kept.`);
      return null;
    }
    try {
      const p = migrateProfile(raw, now);
      if (num(raw.schemaVersion, 0) !== SCHEMA_VERSION) this.saveProfile(p);   // write the upgraded version back
      return p;
    } catch (e) {
      if (e instanceof NewerSaveError) {
        this.lockedIds.add(id);
        this.problems.push(`${raw.name || 'A player'}'s game was saved by a newer version of Sprout Pals. Reload to update.`);
      } else {
        this._set(PREFIX + 'damaged.' + id + '.' + now, text);
        this.problems.push(`A saved game (${raw && raw.name || id}) could not be repaired. A copy was kept.`);
      }
      return null;
    }
  }

  saveProfile(p) {
    if (this.lockedIds.has(p.id)) return false;
    return this._set(profileKey(p.id), JSON.stringify(p));
  }

  deleteProfile(index, id) {
    try { this.s.removeItem(profileKey(id)); } catch { /* ignore */ }
    index.profileIds = index.profileIds.filter(x => x !== id);
    this.saveIndex(index);
  }
}

// ---------- export / import (parent area) ----------

export const EXPORT_APP = 'sprout-pals';

export function exportData(index, profiles, now = Date.now()) {
  return {
    app: EXPORT_APP, schemaVersion: SCHEMA_VERSION, exportedAt: new Date(now).toISOString(),
    settings: index.settings, profiles,
  };
}

/** Parse an export file. Returns { profiles, settings } with every profile migrated, or throws. */
export function parseImport(text, now = Date.now()) {
  let data;
  try { data = typeof text === 'string' ? JSON.parse(text) : text; }
  catch { throw new Error("That file isn't a Sprout Pals backup."); }
  if (!isObj(data) || data.app !== EXPORT_APP || !Array.isArray(data.profiles)) {
    throw new Error("That file isn't a Sprout Pals backup.");
  }
  const profiles = data.profiles.map(p => migrateProfile(p, now));
  return { profiles, settings: isObj(data.settings) ? data.settings : null };
}
