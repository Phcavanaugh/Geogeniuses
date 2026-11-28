import test from 'node:test';
import assert from 'node:assert/strict';
import { Judge, WINDOWS, starsFor } from '../../js/judge.js';

const notes = [{ t: 1, lane: 0, d: 0 }, { t: 1, lane: 3, d: 0 }, { t: 2, lane: 1, d: 1 }, { t: 3.5, lane: 2, d: 0 }];

test('perfect play: every grade perfect, full combo, 3 stars', () => {
  const j = new Judge(notes);
  j.press(0, 1); j.press(3, 1.01); j.press(1, 2); j.update(2.5); j.release(1, 3); j.press(2, 3.5); j.update(5);
  assert.equal(j.counts.perfect, 4); assert.equal(j.counts.holdsDone, 1);
  assert.equal(j.fullCombo(), true); assert.equal(j.stars(), 3); assert.equal(j.maxCombo, 5);
});

test('timing windows grade early and late taps', () => {
  const w = WINDOWS.normal;
  const grade = dt => { const j = new Judge([{ t: 1, lane: 0, d: 0 }]); return j.press(0, 1 + dt)?.grade ?? 'none'; };
  assert.equal(grade(0.03), 'perfect'); assert.equal(grade(-0.07), 'great'); assert.equal(grade(0.12), 'good');
  assert.equal(grade(-(w.good + 0.05)), 'none'); // too early: ignored, no penalty
});

test('missed notes break combo and drain energy (normal), not in relaxed mode', () => {
  const j = new Judge(notes); j.press(0, 1); j.update(10);
  assert.equal(j.counts.miss, 3); assert.equal(j.combo, 0); assert.ok(j.energy < 1);
  const r = new Judge(notes, { relaxed: true }); r.press(0, 1); r.update(10);
  assert.equal(r.counts.miss, 3); assert.equal(r.combo, 1); assert.equal(r.energy, 1); assert.equal(r.failed, false);
});

test('relaxed mode accepts a tap normal mode rejects', () => {
  assert.equal(new Judge([{ t: 1, lane: 0, d: 0 }]).press(0, 1.18), null);
  assert.equal(new Judge([{ t: 1, lane: 0, d: 0 }], { relaxed: true }).press(0, 1.18).grade, 'good');
});

test('letting go of a hold early breaks it; holding to the end completes it automatically', () => {
  const j = new Judge([{ t: 1, lane: 0, d: 2 }]);
  j.press(0, 1); assert.equal(j.release(0, 1.5).type, 'holdBroken'); assert.equal(j.combo, 0);
  const k = new Judge([{ t: 1, lane: 0, d: 2 }]);
  k.press(0, 1); const ev = k.update(3.01); assert.equal(ev[0].type, 'holdDone'); assert.equal(k.fullCombo(), true);
});

test('chords: each lane judged on its own', () => {
  const j = new Judge([{ t: 1, lane: 0, d: 0 }, { t: 1, lane: 2, d: 0 }]);
  assert.equal(j.press(1, 1), null);
  assert.equal(j.press(0, 1).grade, 'perfect'); assert.equal(j.press(2, 1.02).grade, 'perfect');
});

test('enough misses in normal mode fail the song', () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ t: i * 0.5 + 1, lane: i % 4, d: 0 }));
  const j = new Judge(many); j.update(100); assert.equal(j.failed, true);
});

test('stars thresholds', () => { assert.equal(starsFor(0.49), 0); assert.equal(starsFor(0.5), 1); assert.equal(starsFor(0.8), 2); assert.equal(starsFor(0.95), 3); });
