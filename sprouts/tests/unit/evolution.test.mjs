import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addFeedingScore, chooseNextForm, candidateForms, isUnlocked } from '../../js/engine/evolution.js';
import { newProfile, hatchTap, feed, growUp } from '../../js/engine/game.js';
import { HATCH_TAPS } from '../../config/stages.js';
import { FORMS, FOOD_SCORES } from '../../config/evolution.js';

// A tiny made-up tree so the tests don't depend on the real tuning.
const forms = {
  kid:   { stage: 'toddler', from: ['egg'] },
  red:   { stage: 'teen', from: ['kid'] },
  green: { stage: 'teen', from: ['kid'] },
  gold:  { stage: 'teen', from: ['kid'], unlock: { decoration: 'fountain' } },
  other: { stage: 'teen', from: ['nobody'] },
};
const scores = {
  apple: { red: 3, green: 1, gold: 10 },
  leaf:  { red: 0, green: 2 },
  plain: {},
};
const pet = () => ({ stage: 'toddler', form: 'kid', evoScores: {} });

test('candidates are next-stage forms that grow from the current form', () => {
  assert.deepEqual(candidateForms(pet(), forms).sort(), ['gold', 'green', 'red']);
});

test('feeding adds foodScore × hunger actually restored to each candidate', () => {
  const p = pet();
  const added = addFeedingScore(p, 'apple', 20, forms, scores);
  assert.deepEqual(added, { red: 60, green: 20, gold: 200 });
  addFeedingScore(p, 'leaf', 5, forms, scores);
  assert.deepEqual(p.evoScores, { red: 60, green: 30, gold: 200 });
  assert.equal(p.evoScores.other, undefined, 'non-candidates never score');
});

test('feeding that restores nothing adds nothing', () => {
  const p = pet();
  addFeedingScore(p, 'apple', 0, forms, scores);
  assert.deepEqual(p.evoScores, {});
});

test('unknown foods and missing table entries count as zero', () => {
  const p = pet();
  addFeedingScore(p, 'plain', 30, forms, scores);
  addFeedingScore(p, 'mystery', 30, forms, scores);
  assert.deepEqual(p.evoScores, { red: 0, green: 0, gold: 0 });
});

test('highest eligible score wins; locked rare forms are skipped', () => {
  const p = pet();
  p.evoScores = { red: 50, green: 40, gold: 999 };
  assert.equal(chooseNextForm(p, { decorations: [] }, () => 0, forms), 'red');
  assert.equal(chooseNextForm(p, { decorations: ['fountain'] }, () => 0, forms), 'gold');
});

test('ties are resolved randomly among the tied forms only', () => {
  const p = pet();
  p.evoScores = { red: 10, green: 10, gold: 0 };
  assert.equal(chooseNextForm(p, {}, () => 0, forms), 'red');
  assert.equal(chooseNextForm(p, {}, () => 0.99, forms), 'green');
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(chooseNextForm(p, {}, Math.random, forms));
  assert.deepEqual([...seen].sort(), ['green', 'red']);
});

test('no food at all = everything tied at 0 = random eligible pick', () => {
  const picks = new Set();
  for (let i = 0; i < 200; i++) picks.add(chooseNextForm(pet(), {}, Math.random, forms));
  assert.deepEqual([...picks].sort(), ['green', 'red']);
});

test('unlock conditions: decoration and raised count', () => {
  assert.equal(isUnlocked({ unlock: { decoration: 'x' } }, { decorations: ['x'] }), true);
  assert.equal(isUnlocked({ unlock: { decoration: 'x' } }, { decorations: [] }), false);
  assert.equal(isUnlocked({ unlock: { raised: 2 } }, { raised: 1 }), false);
  assert.equal(isUnlocked({ unlock: { raised: 2 } }, { raised: 2 }), true);
  assert.equal(isUnlocked({}, {}), true);
});

test('real config: every form is reachable and every food row names real forms', () => {
  for (const [food, row] of Object.entries(FOOD_SCORES)) {
    for (const f of Object.keys(row)) assert.ok(FORMS[f], `${food} names unknown form ${f}`);
  }
  for (const [id, f] of Object.entries(FORMS)) {
    for (const parent of f.from) assert.ok(parent === 'egg' || FORMS[parent], `${id} grows from unknown ${parent}`);
  }
  const adults = Object.keys(FORMS).filter(id => FORMS[id].stage === 'adult');
  assert.ok(adults.length >= 3, 'at least three adult outcomes');
});

test('real game: feeding choices steer the result and it is saved on the pet', () => {
  const now = 1_000_000;
  const p = newProfile('Ada', 0, now);
  for (let i = 0; i < HATCH_TAPS; i++) hatchTap(p, now);
  assert.equal(p.pet.stage, 'baby');
  p.inventory.food.carrot = 5;
  p.pet.needs.hunger = 20;
  const r = feed(p, 'carrot');
  assert.equal(r.restored, 25);
  assert.equal(p.pet.evoScores.pebblepup, 75);   // carrot→pebblepup score 3 × 25
  p.pet.readyToGrow = true;
  const g = growUp(p, now + 1, () => 0);
  assert.deepEqual(g, { from: 'puffkin', to: 'pebblepup' });
  assert.equal(p.pet.form, 'pebblepup');
  assert.equal(p.pet.stage, 'toddler');
  assert.deepEqual(p.pet.evoScores, {}, 'scores reset for the next stage');
  assert.ok(p.discovered.includes('pebblepup'));
});

test('feeding a full pet restores 0 and is refused (adds no score)', () => {
  const p = newProfile('Ada', 0, 0);
  for (let i = 0; i < HATCH_TAPS; i++) hatchTap(p, 0);
  p.pet.needs.hunger = 100;
  p.inventory.food.carrot = 1;
  assert.equal(feed(p, 'carrot').reason, 'full');
  assert.equal(p.inventory.food.carrot, 1);
  assert.deepEqual(p.pet.evoScores, {});
});

test('partial fill only counts the points actually restored', () => {
  const p = newProfile('Ada', 0, 0);
  for (let i = 0; i < HATCH_TAPS; i++) hatchTap(p, 0);
  p.pet.needs.hunger = 90;
  p.inventory.food.pumpkin = 1;          // pumpkin fills up to 40, but only 10 fit
  assert.equal(feed(p, 'pumpkin').restored, 10);
  assert.equal(p.pet.evoScores.pebblepup, 20);   // 2 × 10
});
