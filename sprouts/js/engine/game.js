// Game rules: creating players and pets, care actions, growing up, the farm and rewards.
// Every function mutates the profile it is given and returns a small result object; the UI
// saves right after each call.
import { HATCH_TAPS } from '../../config/stages.js';
import * as N from '../../config/needs.js';
import { FOODS } from '../../config/foods.js';
import { CROPS, PLOT_COUNT, START_SEEDS, GROWTH_STAGE_AT } from '../../config/crops.js';
import { FORMS } from '../../config/evolution.js';
import { DECORATIONS, ADULT_GOAL } from '../../config/rewards.js';
import { addFeedingScore, chooseNextForm, nextStage } from './evolution.js';

export const SCHEMA_VERSION = 1;
const MIN = 60 * 1000;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const clamp = v => Math.max(0, Math.min(100, v));

export function newPet(now) {
  return {
    id: uid(), name: '', stage: 'egg', form: 'egg', hatchTaps: 0,
    needs: { ...N.START_NEEDS }, asleep: false,
    stageMs: 0, readyToGrow: false, evoScores: {},
    goal: {}, eaten: {}, history: [], createdAt: now, hatchedAt: null,
  };
}

export function newProfile(name, avatar, now) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid(), name: String(name || 'Player').slice(0, 16), avatar: avatar | 0, createdAt: now,
    lastTick: now, lastSeen: now,
    pet: newPet(now),
    farm: { plots: Array.from({ length: PLOT_COUNT }, () => ({ crop: null, growMs: 0 })), decorations: [] },
    inventory: { seeds: { ...START_SEEDS }, food: {}, stars: 0 },
    collection: [], discovered: [],
  };
}

// ---------- pet ----------

export function hatchTap(profile, now) {
  const pet = profile.pet;
  if (!pet || pet.stage !== 'egg') return { hatched: false };
  pet.hatchTaps = (pet.hatchTaps || 0) + 1;
  if (pet.hatchTaps < HATCH_TAPS) return { hatched: false, taps: pet.hatchTaps };
  const form = chooseNextForm(pet, ctxFor(profile)) || 'puffkin';
  becomeForm(profile, form, now);
  pet.hatchedAt = now;
  return { hatched: true, form };
}

export function nameOk(name) {
  return String(name || '').trim().length > 0;
}

export function setPetName(profile, name) {
  if (profile.pet) profile.pet.name = String(name || '').trim().slice(0, 14);
}

function becomeForm(profile, form, now) {
  const pet = profile.pet;
  pet.stage = FORMS[form] ? FORMS[form].stage : nextStage(pet.stage);
  pet.form = form;
  pet.stageMs = 0;
  pet.readyToGrow = false;
  pet.evoScores = {};
  pet.history.push({ stage: pet.stage, form, at: now });
  if (!profile.discovered.includes(form)) profile.discovered.push(form);
  if (pet.stage === 'adult') pet.goal = {};
}

export function ctxFor(profile) {
  return { decorations: profile.farm.decorations.slice(), raised: profile.collection.length };
}

/** Grow into the next stage (only when ready). Returns { from, to } or null. */
export function growUp(profile, now, rng = Math.random) {
  const pet = profile.pet;
  if (!pet || !pet.readyToGrow) return null;
  const to = chooseNextForm(pet, ctxFor(profile), rng);
  if (!to) return null;
  const from = pet.form;
  becomeForm(profile, to, now);
  return { from, to };
}

function canAct(pet) {
  return pet && pet.stage !== 'egg';
}

export function feed(profile, foodId) {
  const pet = profile.pet, food = FOODS[foodId];
  if (!canAct(pet) || !food) return { ok: false, reason: 'cannot' };
  if (pet.asleep) return { ok: false, reason: 'asleep' };
  const have = food.unlimited ? Infinity : (profile.inventory.food[foodId] || 0);
  if (have <= 0) return { ok: false, reason: 'none' };
  const restored = Math.max(0, Math.min(food.hunger, 100 - pet.needs.hunger));
  if (restored <= 0) return { ok: false, reason: 'full' };
  if (!food.unlimited) profile.inventory.food[foodId] = have - 1;
  pet.needs.hunger = clamp(pet.needs.hunger + restored);
  pet.needs.happiness = clamp(pet.needs.happiness + (food.happiness || 0));
  addFeedingScore(pet, foodId, restored);
  pet.eaten[foodId] = (pet.eaten[foodId] || 0) + 1;
  bumpGoal(pet, 'feed');
  return { ok: true, restored };
}

export function play(profile) {
  const pet = profile.pet;
  if (!canAct(pet)) return { ok: false, reason: 'cannot' };
  if (pet.asleep) return { ok: false, reason: 'asleep' };
  if (pet.needs.energy < N.PLAY.minEnergy) return { ok: false, reason: 'tired' };
  pet.needs.happiness = clamp(pet.needs.happiness + N.PLAY.happiness);
  pet.needs.energy = clamp(pet.needs.energy + N.PLAY.energy);
  pet.needs.hygiene = Math.max(N.NEED_FLOOR, pet.needs.hygiene + N.PLAY.hygiene);
  bumpGoal(pet, 'play');
  return { ok: true };
}

export function wash(profile) {
  const pet = profile.pet;
  if (!canAct(pet)) return { ok: false, reason: 'cannot' };
  if (pet.asleep) return { ok: false, reason: 'asleep' };
  pet.needs.hygiene = clamp(pet.needs.hygiene + N.WASH.hygiene);
  pet.needs.happiness = clamp(pet.needs.happiness + N.WASH.happiness);
  bumpGoal(pet, 'wash');
  return { ok: true };
}

export function toggleSleep(profile) {
  const pet = profile.pet;
  if (!canAct(pet)) return { ok: false };
  pet.asleep = !pet.asleep;
  return { ok: true, asleep: pet.asleep };
}

export function minigamePlayed(profile) {
  const pet = profile.pet;
  if (!canAct(pet)) return;
  pet.needs.happiness = clamp(pet.needs.happiness + N.MINIGAME_PLAY.happiness);
  pet.needs.energy = Math.max(N.NEED_FLOOR, pet.needs.energy + N.MINIGAME_PLAY.energy);
}

// ---------- grown-up goal & collection ----------

function bumpGoal(pet, action) {
  if (pet.stage !== 'adult') return;
  pet.goal[action] = (pet.goal[action] || 0) + 1;
}

export function goalProgress(pet) {
  return ADULT_GOAL.steps.map(s => ({ ...s, done: Math.min(s.count, (pet.goal || {})[s.action] || 0) }));
}

export function goalComplete(pet) {
  return !!pet && pet.stage === 'adult' && goalProgress(pet).every(s => s.done >= s.count);
}

/** Move a grown-up whose goal is finished into the collection and start a new egg. */
export function sendToMeadow(profile, now) {
  const pet = profile.pet;
  if (!goalComplete(pet)) return null;
  const fav = Object.entries(pet.eaten || {}).sort((a, b) => b[1] - a[1])[0];
  const entry = {
    id: pet.id, name: pet.name || FORMS[pet.form].name, form: pet.form,
    hatchedAt: pet.hatchedAt, grownAt: now, favoriteFood: fav ? fav[0] : null,
    path: pet.history.map(h => h.form),
  };
  profile.collection.push(entry);
  profile.inventory.stars += ADULT_GOAL.rewardStars;
  profile.pet = newPet(now);
  return entry;
}

// ---------- farm ----------

export function cropStage(plot) {
  if (!plot || !plot.crop) return -1;
  const crop = CROPS[plot.crop];
  const frac = (plot.growMs || 0) / (crop.growMinutes * MIN);
  let stage = 0;
  GROWTH_STAGE_AT.forEach((at, i) => { if (frac >= at) stage = i; });
  return stage;
}

export function cropReady(plot) {
  return cropStage(plot) === GROWTH_STAGE_AT.length - 1;
}

export function cropTimeLeft(plot) {
  if (!plot || !plot.crop) return 0;
  return Math.max(0, CROPS[plot.crop].growMinutes * MIN - (plot.growMs || 0));
}

export function plant(profile, plotIndex, cropId) {
  const plot = profile.farm.plots[plotIndex];
  if (!plot || plot.crop || !CROPS[cropId]) return { ok: false };
  const seeds = profile.inventory.seeds[cropId] || 0;
  if (seeds <= 0) return { ok: false, reason: 'no-seeds' };
  profile.inventory.seeds[cropId] = seeds - 1;
  plot.crop = cropId;
  plot.growMs = 0;
  return { ok: true };
}

export function harvest(profile, plotIndex) {
  const plot = profile.farm.plots[plotIndex];
  if (!cropReady(plot)) return { ok: false };
  const crop = CROPS[plot.crop];
  const inv = profile.inventory;
  inv.food[crop.food] = (inv.food[crop.food] || 0) + crop.harvest;
  inv.seeds[plot.crop] = (inv.seeds[plot.crop] || 0) + crop.seedsBack;
  const got = { crop: plot.crop, food: crop.food, amount: crop.harvest, seeds: crop.seedsBack };
  plot.crop = null;
  plot.growMs = 0;
  return { ok: true, ...got };
}

export function buildDecoration(profile, id) {
  const d = DECORATIONS[id];
  if (!d || profile.farm.decorations.includes(id)) return { ok: false };
  if (profile.inventory.stars < d.stars) return { ok: false, reason: 'stars' };
  profile.inventory.stars -= d.stars;
  profile.farm.decorations.push(id);
  return { ok: true };
}

export function addRewards(profile, { seeds = {}, stars = 0 }) {
  for (const [k, v] of Object.entries(seeds)) {
    if (CROPS[k]) profile.inventory.seeds[k] = (profile.inventory.seeds[k] || 0) + v;
  }
  profile.inventory.stars += stars;
}

// ---------- mood ----------

/** Which face to show, from the needs (lowest need wins when anything is low). */
export function mood(pet) {
  if (!pet || pet.stage === 'egg') return 'egg';
  if (pet.asleep) return 'sleeping';
  const n = pet.needs;
  const low = Object.entries(n).filter(([, v]) => v < N.LOW).sort((a, b) => a[1] - b[1]);
  if (low.length) return { hunger: 'hungry', happiness: 'sad', hygiene: 'dirty', energy: 'sleepy' }[low[0][0]];
  const avg = (n.hunger + n.happiness + n.hygiene + n.energy) / 4;
  return avg >= 75 ? 'happy' : 'content';
}
