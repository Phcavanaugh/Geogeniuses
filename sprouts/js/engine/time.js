// Elapsed-time simulation. Time keeps passing while the game is closed: on every load (and every
// few seconds while open) the game calls advance(profile, Date.now()).
//
// Robustness rules:
//  * Time is ACCUMULATED (stageMs, plot.growMs) rather than compared against old timestamps,
//    so a device clock that jumps backwards never un-grows anything; it just counts as 0 time.
//  * Needs never fall below NEED_FLOOR; nothing dies or disappears.
//  * A sleeping pet wakes up on its own once energy is full, even mid-absence.
import * as N from '../../config/needs.js';
import { STAGE_HOURS, GROWTH_SPEED } from '../../config/stages.js';

const HOUR = 3600 * 1000;

export const DEFAULT_TIME_CONFIG = {
  awake: N.DECAY_PER_HOUR_AWAKE,
  asleep: N.DECAY_PER_HOUR_ASLEEP,
  sleepEnergy: N.SLEEP_ENERGY_PER_HOUR,
  floor: N.NEED_FLOOR,
  stageHours: STAGE_HOURS,
  growthSpeed: GROWTH_SPEED,
};

function drop(value, amount, floor) {
  if (value <= floor) return value;          // already at/below the floor: leave it
  return Math.max(floor, value - amount);
}

/** Apply `hours` of need change to a pet (mutates). Returns { wokeUp: boolean }. */
export function applyNeeds(pet, hours, cfg = DEFAULT_TIME_CONFIG) {
  if (!pet || !pet.needs || hours <= 0) return { wokeUp: false };
  const n = pet.needs;
  let remaining = hours, wokeUp = false;
  if (pet.asleep) {
    const toFull = Math.max(0, (100 - n.energy) / cfg.sleepEnergy);
    const slept = Math.min(remaining, toFull);
    for (const k of ['hunger', 'happiness', 'hygiene']) n[k] = drop(n[k], (cfg.asleep[k] || 0) * slept, cfg.floor);
    n.energy = Math.min(100, n.energy + cfg.sleepEnergy * slept);
    remaining -= slept;
    if (remaining > 0 || n.energy >= 100) { pet.asleep = false; wokeUp = true; n.energy = Math.min(100, n.energy); }
  }
  if (remaining > 0) {
    for (const k of ['hunger', 'happiness', 'hygiene', 'energy']) n[k] = drop(n[k], (cfg.awake[k] || 0) * remaining, cfg.floor);
  }
  return { wokeUp };
}

/** Milliseconds a stage lasts (null for stages that don't time out: egg, adult). */
export function stageDurationMs(stage, cfg = DEFAULT_TIME_CONFIG) {
  const h = cfg.stageHours[stage];
  return h == null ? null : h * HOUR;
}

/** Add growth time to the pet (mutates). Returns true if the pet just became ready to grow. */
export function applyGrowth(pet, ms, cfg = DEFAULT_TIME_CONFIG) {
  if (!pet || pet.readyToGrow) return false;
  const dur = stageDurationMs(pet.stage, cfg);
  if (dur == null) return false;
  pet.stageMs = Math.min(dur, (pet.stageMs || 0) + ms * (cfg.growthSpeed || 1));
  if (pet.stageMs >= dur) { pet.readyToGrow = true; return true; }
  return false;
}

/**
 * Advance a whole profile to `now` (mutates). Returns a summary of what happened.
 */
export function advance(profile, now, cfg = DEFAULT_TIME_CONFIG) {
  const last = Number(profile.lastTick);
  let elapsed = Number.isFinite(last) ? now - last : 0;
  if (!(elapsed > 0)) elapsed = 0;           // first run, clock moved backwards, or bad data
  profile.lastTick = now;
  const summary = { elapsedMs: elapsed, becameReady: false, wokeUp: false };
  if (elapsed === 0) return summary;
  const pet = profile.pet;
  if (pet && pet.stage !== 'egg') {
    summary.wokeUp = applyNeeds(pet, elapsed / HOUR, cfg).wokeUp;
    summary.becameReady = applyGrowth(pet, elapsed, cfg);
  }
  for (const plot of (profile.farm && profile.farm.plots) || []) {
    if (plot && plot.crop) plot.growMs = (plot.growMs || 0) + elapsed;
  }
  return summary;
}

/** Progress (0..1) through the current stage, for the growth bar. */
export function stageProgress(pet, cfg = DEFAULT_TIME_CONFIG) {
  const dur = stageDurationMs(pet.stage, cfg);
  if (dur == null) return pet.stage === 'adult' ? 1 : 0;
  return pet.readyToGrow ? 1 : Math.min(1, (pet.stageMs || 0) / dur);
}

/** Milliseconds left until the pet is ready to grow (0 if ready, null if it never times out). */
export function stageTimeLeft(pet, cfg = DEFAULT_TIME_CONFIG) {
  const dur = stageDurationMs(pet.stage, cfg);
  if (dur == null) return null;
  return pet.readyToGrow ? 0 : Math.max(0, (dur - (pet.stageMs || 0)) / (cfg.growthSpeed || 1));
}

export { HOUR };
