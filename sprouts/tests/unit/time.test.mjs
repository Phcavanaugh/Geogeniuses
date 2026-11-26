import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, applyNeeds, applyGrowth, stageTimeLeft, HOUR, DEFAULT_TIME_CONFIG } from '../../js/engine/time.js';
import { newProfile, hatchTap, plant, cropReady, cropStage } from '../../js/engine/game.js';
import { HATCH_TAPS } from '../../config/stages.js';

const cfg = {
  awake: { hunger: 10, happiness: 5, hygiene: 4, energy: 5 },
  asleep: { hunger: 2, happiness: 1, hygiene: 1 },
  sleepEnergy: 20, floor: 15,
  stageHours: { baby: 4, toddler: 36, teen: 72 }, growthSpeed: 1,
};
const pet = (needs = {}) => ({ stage: 'baby', form: 'puffkin', asleep: false, stageMs: 0, readyToGrow: false,
  needs: { hunger: 80, happiness: 80, hygiene: 80, energy: 80, ...needs } });

function hatched(now) {
  const p = newProfile('Kid', 0, now);
  for (let i = 0; i < HATCH_TAPS; i++) hatchTap(p, now);
  return p;
}

test('needs drop by rate × hours while awake', () => {
  const p = pet();
  applyNeeds(p, 2, cfg);
  assert.deepEqual(p.needs, { hunger: 60, happiness: 70, hygiene: 72, energy: 70 });
});

test('needs never fall below the floor, even after a month away', () => {
  const p = pet();
  applyNeeds(p, 24 * 30, cfg);
  for (const v of Object.values(p.needs)) assert.equal(v, 15);
});

test('a need already under the floor is not pushed lower or raised', () => {
  const p = pet({ hunger: 5 });
  applyNeeds(p, 10, cfg);
  assert.equal(p.needs.hunger, 5);
});

test('sleep restores energy, then the pet wakes and awake decay resumes', () => {
  const p = pet({ energy: 40 });
  p.asleep = true;
  // 3h to full energy (60 / 20), then 2h awake
  const r = applyNeeds(p, 5, cfg);
  assert.equal(r.wokeUp, true);
  assert.equal(p.asleep, false);
  assert.equal(p.needs.energy, 90);                 // 100 - 5×2
  assert.equal(p.needs.hunger, 80 - 2 * 3 - 10 * 2); // 54
});

test('short nap keeps the pet asleep', () => {
  const p = pet({ energy: 40 });
  p.asleep = true;
  const r = applyNeeds(p, 1, cfg);
  assert.equal(r.wokeUp, false);
  assert.equal(p.asleep, true);
  assert.equal(p.needs.energy, 60);
});

test('growth accumulates and stops at "ready" (waits for the child)', () => {
  const p = pet();
  assert.equal(applyGrowth(p, 3 * HOUR, cfg), false);
  assert.equal(stageTimeLeft(p, cfg), 1 * HOUR);
  assert.equal(applyGrowth(p, 50 * HOUR, cfg), true);
  assert.equal(p.readyToGrow, true);
  assert.equal(p.stageMs, 4 * HOUR, 'capped at the stage length; no skipping stages');
  assert.equal(applyGrowth(p, 50 * HOUR, cfg), false);
});

test('growth speed multiplier', () => {
  const p = pet();
  applyGrowth(p, 2 * HOUR, { ...cfg, growthSpeed: 2 });
  assert.equal(p.readyToGrow, true);
});

test('advance(): elapsed time between visits applies to needs, growth and crops', () => {
  const t0 = 1_700_000_000_000;
  const p = hatched(t0);
  plant(p, 0, 'strawberry');
  const s = advance(p, t0 + 5 * HOUR, DEFAULT_TIME_CONFIG);
  assert.equal(s.elapsedMs, 5 * HOUR);
  assert.equal(s.becameReady, true);           // baby stage is 4h by default
  assert.equal(p.lastTick, t0 + 5 * HOUR);
  assert.ok(cropReady(p.farm.plots[0]));
  assert.ok(p.pet.needs.hunger < 60);
});

test('advance(): the clock going backwards counts as no time (nothing un-grows)', () => {
  const t0 = 1_700_000_000_000;
  const p = hatched(t0);
  plant(p, 0, 'pumpkin');
  advance(p, t0 + 30 * 60 * 1000);
  const grown = p.farm.plots[0].growMs, needs = { ...p.pet.needs };
  const s = advance(p, t0 - 10 * HOUR);
  assert.equal(s.elapsedMs, 0);
  assert.equal(p.farm.plots[0].growMs, grown);
  assert.deepEqual(p.pet.needs, needs);
  // and time resumes counting from the new (earlier) clock
  advance(p, t0 - 10 * HOUR + 60 * 1000);
  assert.equal(p.farm.plots[0].growMs, grown + 60 * 1000);
});

test('advance(): an egg does not lose needs or grow while unhatched', () => {
  const t0 = 0;
  const p = newProfile('Kid', 0, t0);
  const before = JSON.stringify(p.pet);
  advance(p, t0 + 100 * HOUR);
  assert.equal(JSON.stringify(p.pet), before);
});

test('advance(): missing or garbage lastTick is treated as no time passed', () => {
  const p = hatched(0);
  p.lastTick = 'nonsense';
  assert.equal(advance(p, 123456).elapsedMs, 0);
  assert.equal(p.lastTick, 123456);
});

test('crop growth pictures move through stages 0→3', () => {
  const p = hatched(0);
  plant(p, 0, 'carrot');                   // 5 minutes
  const plot = p.farm.plots[0];
  assert.equal(cropStage(plot), 0);
  plot.growMs = 1.5 * 60 * 1000; assert.equal(cropStage(plot), 1);
  plot.growMs = 3.5 * 60 * 1000; assert.equal(cropStage(plot), 2);
  plot.growMs = 5 * 60 * 1000;   assert.equal(cropStage(plot), 3);
});
