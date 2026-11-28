import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAudio, draftChart } from '../../js/beats.js';

// Synthetic click track at a known tempo: the detector should find the tempo and the clicks.
function clicks(bpm, seconds, sr = 22050, phase = 0.2) {
  const x = new Float32Array(Math.floor(seconds * sr));
  const times = [];
  for (let t = phase; t < seconds - 0.2; t += 60 / bpm) {
    times.push(t);
    const i0 = Math.floor(t * sr);
    for (let k = 0; k < 600; k++) x[i0 + k] += Math.sin(2 * Math.PI * 880 * k / sr) * Math.exp(-k / 120);
  }
  return { x, times, sr };
}

test('finds tempo and onsets of a click track', async () => {
  const { x, times, sr } = clicks(120, 20);
  const an = await analyzeAudio([x], sr);
  assert.ok(Math.abs(an.bpm - 120) < 0.6, `bpm ${an.bpm}`);
  const found = times.filter(t => an.onsets.some(o => Math.abs(o.t - t) < 0.03)).length;
  assert.ok(found / times.length > 0.9, `found ${found}/${times.length}`);
  const beat = 0.5, ph = ((an.beatOffset - 0.2) % beat + beat) % beat;
  assert.ok(Math.min(ph, beat - ph) < 0.03, `phase off by ${ph}`);
});

test('draft chart is valid, unpublished-shaped data with an easier Easy', async () => {
  const { x, sr } = clicks(100, 20);
  const an = await analyzeAudio([x], sr);
  const { hard, easy, report } = draftChart(an, { duration: 20 });
  assert.ok(hard.length > 10); assert.ok(easy.length <= hard.length);
  assert.ok(hard.every(n => n.lane >= 0 && n.lane < 4));
  assert.equal(report.snapped, true);
});
