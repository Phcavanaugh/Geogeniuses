// Song catalog: songs listed in songs/songs.json on the site, plus songs a parent added on this
// device. A chart edited on this device takes priority over the site's copy (on this device only).
import { normalizeChart, emptyChart, firstSoundTime, decoderShift } from './chart.js';
import * as store from './store.js';

export async function loadCatalog() {
  let site = [];
  try {
    const r = await fetch('songs/songs.json', { cache: 'no-cache' });
    if (r.ok) site = (await r.json()).songs || [];
  } catch {}
  const out = [];
  for (const s of site) {
    let siteChart = null;
    if (s.chart) {
      try { const r = await fetch(s.chart, { cache: 'no-cache' }); if (r.ok) siteChart = normalizeChart(await r.json()); } catch {}
    }
    out.push({ ...s, origin: 'site', siteChart });
  }
  for (const s of store.getLocalSongs()) out.push({ ...s, origin: 'device', audio: null, siteChart: null });
  for (const s of out) {
    s.localChart = store.getLocalChart(s.id);
    s.chartData = s.localChart || s.siteChart;
    s.deviceAudio = await store.hasAudio(s.id);
    s.hasAudio = s.deviceAudio || !!s.audio;
  }
  return out;
}

export function playableDiffs(song) {
  const c = song.chartData;
  if (!c || !song.hasAudio) return [];
  return ['easy', 'hard'].filter(d => c.difficulties[d].notes.length > 0);
}
export function visibleToKids(song) { return !!song.chartData?.published && playableDiffs(song).length > 0; }

export function chartFor(song) {
  return song.chartData || emptyChart({ songId: song.id, title: song.title, artist: song.artist });
}

const bufferCache = new Map();
// Loads and decodes the song's audio; returns { buffer, shift, firstSound }.
export async function loadAudio(engine, song, onProgress) {
  const key = song.id + (song.deviceAudio ? ':device' : ':site');
  let buf = bufferCache.get(key);
  if (!buf) {
    let ab;
    if (song.deviceAudio) {
      const rec = await store.getAudio(song.id);
      if (!rec) throw new Error('The audio for this song is missing on this device.');
      ab = rec.buf.slice(0);
    } else if (song.audio) {
      onProgress?.('Downloading music…');
      const r = await fetch(song.audio);
      if (!r.ok) throw new Error(`Could not download the music (${r.status}).`);
      ab = await r.arrayBuffer();
    } else throw new Error('This song has no audio yet.');
    onProgress?.('Getting the music ready…');
    buf = await engine.decode(ab);
    bufferCache.clear(); // keep only one decoded song in memory (phones have little)
    bufferCache.set(key, buf);
  }
  const chs = []; for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c));
  const first = firstSoundTime(chs, buf.sampleRate);
  return { buffer: buf, firstSound: first, shift: decoderShift(song.chartData, first) };
}
export function forgetAudio() { bufferCache.clear(); }
