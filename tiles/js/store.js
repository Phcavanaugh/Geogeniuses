// Everything is stored on this device only: settings, players, best scores and chart edits in
// localStorage; audio files a parent adds on this device in IndexedDB. No accounts, no server.
import { normalizeChart } from './chart.js';

const P = 'tiles.';
const ls = {
  get(k, d) { try { const v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(P + k); } catch {} },
};

export const DEFAULT_SETTINGS = { music: 0.7, sfx: 0.35, hitSounds: true, speed: 5, offsetMs: 0, offsetProfile: 'speaker', offsets: { speaker: 0, headphones: 0 } };

export function getSettings() { return { ...DEFAULT_SETTINGS, ...ls.get('settings', {}) }; }
export function saveSettings(s) { ls.set('settings', s); }

export function getProfiles() {
  let p = ls.get('profiles', null);
  if (!p || !p.list?.length) { p = { list: [{ id: 'p1', name: 'Player 1', color: 0, relaxed: true }], current: 'p1' }; ls.set('profiles', p); }
  return p;
}
export function saveProfiles(p) { ls.set('profiles', p); }
export function currentProfile() { const p = getProfiles(); return p.list.find(x => x.id === p.current) || p.list[0]; }

export function getBest(profileId, songId, diff) { return ls.get('scores', {})[`${profileId}|${songId}|${diff}`] || null; }
export function recordResult(profileId, songId, diff, r) {
  const all = ls.get('scores', {});
  const k = `${profileId}|${songId}|${diff}`;
  const old = all[k];
  const isBest = !old || r.score > old.score;
  all[k] = {
    score: Math.max(r.score, old?.score || 0), stars: Math.max(r.stars, old?.stars || 0),
    fullCombo: !!(r.fullCombo || old?.fullCombo), plays: (old?.plays || 0) + 1,
  };
  ls.set('scores', all);
  return isBest;
}
export function clearScoresFor(profileId) {
  const all = ls.get('scores', {});
  for (const k of Object.keys(all)) if (k.startsWith(profileId + '|')) delete all[k];
  ls.set('scores', all);
}

// Chart edits made on this device (override the site's chart for that song on this device).
export function getLocalChart(songId) { const c = ls.get('chart.' + songId, null); try { return c ? normalizeChart(c) : null; } catch { return null; } }
export function saveLocalChart(songId, chart) { return ls.set('chart.' + songId, chart); }
export function deleteLocalChart(songId) { ls.del('chart.' + songId); }

// Songs added on this device (metadata; audio lives in IndexedDB).
export function getLocalSongs() { return ls.get('localSongs', []); }
export function saveLocalSongs(list) { ls.set('localSongs', list); }

// ---- IndexedDB for audio blobs
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('tile-tumble', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('audio');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('audio', mode);
    const req = fn(t.objectStore('audio'));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Storage is full or blocked.'));
  });
}
// Stored as ArrayBuffer + type (Safari has had bugs storing Blobs in IndexedDB).
export async function putAudio(songId, buf, name, type) { return tx('readwrite', s => s.put({ buf, name, type, added: Date.now() }, songId)); }
export async function getAudio(songId) { try { return await tx('readonly', s => s.get(songId)); } catch { return null; } }
export async function deleteAudio(songId) { try { return await tx('readwrite', s => s.delete(songId)); } catch {} }
export async function hasAudio(songId) { try { return !!(await tx('readonly', s => s.getKey(songId))); } catch { return false; } }

export function resetAll() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(P)) localStorage.removeItem(k);
  try { indexedDB.deleteDatabase('tile-tumble'); } catch {}
  dbp = null;
}
