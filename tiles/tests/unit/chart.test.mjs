import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeChart, normalizeNotes, validateNotes, easyFromHard, snapTime, upsertNote, decoderShift, groupChords } from '../../js/chart.js';

test('normalizeNotes sorts, clamps, drops junk and duplicates', () => {
  const n = normalizeNotes([{ t: 2, lane: 1 }, { t: 1, lane: 9 }, { t: -1, lane: 0 }, { t: 1, lane: 0, d: 0.05 }, { t: 1.01, lane: 0 }, null, { t: 'x', lane: 0 }]);
  assert.deepEqual(n, [{ t: 1, lane: 0, d: 0 }, { t: 2, lane: 1, d: 0 }]);
});

test('normalizeChart accepts a bare array as Hard and rejects garbage', () => {
  const c = normalizeChart([{ t: 1, lane: 0 }]);
  assert.equal(c.difficulties.hard.notes.length, 1); assert.equal(c.difficulties.easy.notes.length, 0);
  assert.throws(() => normalizeChart({ hello: 1 }));
  assert.equal(c.published, false); assert.equal(c.status, 'draft');
});

test('validate flags notes inside holds and 3-finger chords', () => {
  const v = validateNotes([{ t: 1, lane: 0, d: 1 }, { t: 1.5, lane: 0, d: 0 }, { t: 3, lane: 0, d: 0 }, { t: 3, lane: 1, d: 0 }, { t: 3, lane: 2, d: 0 }], { duration: 2.5 });
  assert.equal(v.errors.length, 4); // note inside hold + three notes past the end
  assert.ok(v.warnings.some(w => /3 notes at once/.test(w.msg)));
});

test('easyFromHard: single notes, spaced out, holds shortened', () => {
  const hard = [];
  for (let i = 0; i < 64; i++) hard.push({ t: 1 + i * 0.25, lane: i % 4, d: 0 });
  hard.push({ t: 1, lane: 3, d: 0 }); hard.push({ t: 20, lane: 1, d: 4 });
  const easy = easyFromHard(hard, { bpm: 120, beatOffset: 0 });
  assert.ok(easy.length <= hard.length / 2);
  assert.equal(groupChords(easy).every(g => g.length === 1), true);
  for (let i = 1; i < easy.length; i++) assert.ok(easy[i].t - easy[i - 1].t >= 0.47);
  assert.ok(easy.find(n => n.t === 20).d <= 1.0);
});

test('snapTime and upsertNote', () => {
  assert.equal(snapTime(1.13, 120, 0.1, 2), 1.1);
  assert.equal(snapTime(1.13, null, 0, 2), 1.13);
  const n = upsertNote([{ t: 1, lane: 0, d: 0 }], { t: 1.03, lane: 0, d: 0.5 });
  assert.deepEqual(n, [{ t: 1.03, lane: 0, d: 0.5 }]);
});

test('decoder shift is used only when small', () => {
  const c = { audio: { firstSound: 0.0 } };
  assert.equal(decoderShift(c, 0.026), 0.026); assert.equal(decoderShift(c, 3), 0); assert.equal(decoderShift({ audio: { firstSound: null } }, 0.02), 0);
});

test('the shipped demo chart is valid and playable', () => {
  const c = normalizeChart(readFileSync(new URL('../../songs/starlight-skip.chart.json', import.meta.url), 'utf8'));
  for (const d of ['easy', 'hard']) {
    assert.ok(c.difficulties[d].notes.length > 20);
    assert.equal(validateNotes(c.difficulties[d].notes, { duration: c.audio.duration }).errors.length, 0);
  }
  assert.equal(c.published, true); assert.equal(c.status, 'reviewed');
  const songs = JSON.parse(readFileSync(new URL('../../songs/songs.json', import.meta.url), 'utf8')).songs;
  assert.ok(songs.find(s => s.id === 'starlight-skip'));
});
