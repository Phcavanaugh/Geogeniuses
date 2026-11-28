// Tile Tumble: screens, menus, parent area. Kid-facing screens have no links out, no ads, no
// accounts and nothing to buy. Everything is saved on this device.
import { AudioEngine, Sfx } from './audio.js';
import { Game, LANE_COLORS, travelTime } from './game.js';
import { loadCatalog, playableDiffs, visibleToKids, loadAudio, chartFor, forgetAudio } from './songs.js';
import * as store from './store.js';
import { icon, esc, stars, toast, sheet, pickFile } from './ui.js';
import { slugify, emptyChart, chartStats, firstSoundTime } from './chart.js';

const app = document.getElementById('app');
const engine = new AudioEngine();
const sfx = new Sfx(engine);
const S = { catalog: [], settings: store.getSettings(), parent: false };
const DIFF_NAME = { easy: 'Easy', hard: 'Hard' };
// Timing offset in ms: the saved offset for the current output (speaker / Bluetooth) plus any
// output delay the browser itself reports.
// An uncalibrated default (e.g. the 180 ms Bluetooth guess) is skipped when the browser already
// reports a big delay itself, so it isn't counted twice.
export const offsetMs = s => {
  const lat = engine.deviceLatency();
  const saved = (!s.calibrated?.[s.offsetProfile] && lat > 0.08) ? 0 : (s.offsets?.[s.offsetProfile] ?? 0);
  return saved + Math.round(lat * 1000);
};
const savedOffset = s => (s.offsets?.[s.offsetProfile] ?? 0);

window.__tt = { engine, S }; // used by automated tests

function applyVolumes() { try { engine.setVolumes({ music: S.settings.music, sfx: S.settings.sfx }); } catch {} }
async function unlock() { try { await engine.unlock(); applyVolumes(); } catch {} }
function click(kind) { sfx.soft(kind); }

function setScreen(name, html) {
  app.className = 'screen-' + name;
  app.innerHTML = html;
  app.scrollTop = 0;
}

// ---------------------------------------------------------------- home
function home() {
  const p = store.currentProfile();
  setScreen('home', `
    <div class="home">
      <div class="logo" aria-label="Tile Tumble">
        <div class="logo-tiles">${LANE_COLORS.map((c, i) => `<span style="background:${c};animation-delay:${i * 0.15}s"></span>`).join('')}</div>
        <h1>Tile<br>Tumble</h1>
      </div>
      <button class="btn huge primary" data-a="play">${icon('play')} Play</button>
      <button class="player-chip" data-a="players">${icon('user')} <span>${esc(p.name)}</span></button>
      <div class="home-foot">
        <button class="grownup" data-hold="parent" aria-label="Grown-ups: press and hold">
          <span class="hold-ring"></span>${icon('gear')}<span>Grown-ups</span></button>
      </div>
    </div>`);
}

async function songsScreen() {
  const p = store.currentProfile();
  const list = S.catalog.filter(visibleToKids);
  setScreen('songs', `
    <header class="topbar">
      <button class="icon-btn" data-a="home" aria-label="Back">${icon('back')}</button>
      <h2>Pick a song</h2>
      <button class="player-chip small" data-a="players">${icon('user')} <span>${esc(p.name)}</span></button>
    </header>
    <div class="song-list">
      ${list.length ? list.map((s, i) => {
        const diffs = playableDiffs(s);
        return `<button class="song-card" data-a="song" data-id="${esc(s.id)}" style="--accent:${LANE_COLORS[i % 4]}">
          <span class="song-art">${icon('music')}</span>
          <span class="song-meta"><span class="song-title">${esc(s.title)}</span><span class="song-artist">${esc(s.artist || '')}</span></span>
          <span class="song-stars">${diffs.map(d => { const b = store.getBest(p.id, s.id, d); return `<span class="ds"><small>${DIFF_NAME[d]}</small>${stars(b?.stars || 0)}</span>`; }).join('')}</span>
        </button>`;
      }).join('') : '<p class="empty">No songs are ready yet. A grown-up can set them up.</p>'}
    </div>`);
}

async function chooseDiff(song) {
  const p = store.currentProfile();
  const diffs = playableDiffs(song);
  let relaxed = p.relaxed !== false;
  const v = await sheet(`
    <h2>${esc(song.title)}</h2>
    <p class="muted">${esc(song.artist || '')}</p>
    <div class="diff-row">${diffs.map(d => { const b = store.getBest(p.id, song.id, d); return `<button class="btn big diff ${d}" data-v="${d}"><span>${DIFF_NAME[d]}</span>${stars(b?.stars || 0)}${b ? `<small>Best ${b.score.toLocaleString()}</small>` : ''}</button>`; }).join('')}</div>
    <div class="listen-row"><small class="muted">Listening with</small>
      <div class="seg">${['speaker', 'headphones'].map(k => `<button class="seg-btn ${S.settings.offsetProfile === k ? 'on' : ''}" data-listen="${k}" data-v="" data-keep="1">${k === 'speaker' ? 'Speaker' : 'AirPods / Bluetooth'}</button>`).join('')}</div></div>
    <label class="switch-row"><span><b>Relaxed mode</b><br><small>Bigger timing window, never runs out of energy</small></span>
      <input type="checkbox" class="switch" id="relaxed" ${relaxed ? 'checked' : ''}></label>
    <button class="btn ghost" data-v="">Cancel</button>`, {
    onOpen: m => {
      m.querySelector('#relaxed').addEventListener('change', e => { relaxed = e.target.checked; });
      m.querySelectorAll('[data-listen]').forEach(b => b.addEventListener('click', () => {
        S.settings.offsetProfile = b.dataset.listen; store.saveSettings(S.settings);
        m.querySelectorAll('[data-listen]').forEach(x => x.classList.toggle('on', x === b));
      }));
    },
  });
  if (!v) return;
  const prof = store.getProfiles(); const me = prof.list.find(x => x.id === p.id); if (me) { me.relaxed = relaxed; store.saveProfiles(prof); }
  play(song, v, relaxed);
}

async function play(song, diff, relaxed, { autoplay = false } = {}) {
  setScreen('loading', `<div class="loading-box"><div class="spinner"></div><p id="load-msg">Getting the music ready…</p></div>`);
  try {
    await unlock();
    const a = await loadAudio(engine, song, m => { const el = document.getElementById('load-msg'); if (el) el.textContent = m; });
    engine.buffer = a.buffer; engine.shift = a.shift;
  } catch (e) {
    setScreen('loading', `<div class="loading-box"><p>${esc(e.message || 'Could not load the music.')}</p><button class="btn big" data-a="songs">${icon('back')} Back</button></div>`);
    return;
  }
  const chart = chartFor(song);
  setScreen('game', '');
  const game = new Game({
    root: app, engine, sfx, notes: chart.difficulties[diff].notes, settings: S.settings, relaxed,
    offsetMs: offsetMs(S.settings), autoplay: autoplay || /[?&]autoplay=1/.test(location.search),
    onDone: r => results(song, diff, relaxed, r),
    onQuit: () => songsScreen(),
    onRetry: rel => play(song, diff, rel),
  });
  window.__tt.game = game;
  game.start();
}

function results(song, diff, relaxed, r) {
  const p = store.currentProfile();
  const best = store.recordResult(p.id, song.id, diff, r);
  click('win');
  const c = r.counts;
  setScreen('results', `
    <div class="results">
      <h2>${r.stars === 3 ? 'Amazing!' : r.stars === 2 ? 'Great job!' : r.stars === 1 ? 'Nice!' : 'Good try!'}</h2>
      <p class="muted">${esc(song.title)} · ${DIFF_NAME[diff]}${relaxed ? ' · Relaxed' : ''}</p>
      ${stars(r.stars, 3, 'big pop')}
      <div class="score-big">${r.score.toLocaleString()}</div>
      ${best ? '<div class="badge">New best!</div>' : ''}
      ${r.fullCombo ? '<div class="badge gold">Full combo!</div>' : ''}
      <div class="tally">
        <span><b>${c.perfect}</b> Perfect</span><span><b>${c.great}</b> Great</span><span><b>${c.good}</b> Good</span><span><b>${c.miss}</b> Miss</span>
      </div>
      <p class="muted small">Best combo ${r.maxCombo} · Accuracy ${Math.round(r.accuracy * 100)}%</p>
      <div class="row">
        <button class="btn big primary" data-a="again">${icon('restart')} Play again</button>
        <button class="btn big" data-a="songs">${icon('music')} Songs</button>
      </div>
    </div>`);
  window.__tt.lastResult = { ...r, meanErrorMs: Math.round(r.meanError * 1000) };
  app.querySelector('[data-a="again"]').onclick = () => play(song, diff, relaxed);
}

async function players() {
  const prof = store.getProfiles();
  const v = await sheet(`
    <h2>Who is playing?</h2>
    <div class="player-list">${prof.list.map((p, i) => `<button class="btn big player ${p.id === prof.current ? 'on' : ''}" data-v="${esc(p.id)}" style="--accent:${LANE_COLORS[i % 4]}">${icon('user')} ${esc(p.name)}</button>`).join('')}</div>
    <p class="muted small">Grown-ups can add players in the Grown-ups area.</p>`);
  if (v) { prof.current = v; store.saveProfiles(prof); }
  if (app.className === 'screen-songs') songsScreen(); else home();
}

// ---------------------------------------------------------------- parent gate
function holdToOpen(btn) {
  btn.classList.add('holding');
  const t = setTimeout(() => { btn.classList.remove('holding'); parentGate(); }, 1500);
  const cancel = () => { clearTimeout(t); btn.classList.remove('holding'); };
  btn.addEventListener('pointerup', cancel, { once: true });
  btn.addEventListener('pointerleave', cancel, { once: true });
  btn.addEventListener('pointercancel', cancel, { once: true });
}

async function parentGate() {
  const a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 7);
  const v = await sheet(`
    <h2>Grown-ups only</h2>
    <p>What is ${a} × ${b}?</p>
    <input id="gate" class="input big" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Answer">
    <div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary" data-v="ok" id="gate-ok">Open</button></div>`, {
    onOpen: (m, done) => {
      const i = m.querySelector('#gate'); setTimeout(() => i.focus(), 50);
      i.addEventListener('keydown', e => { if (e.key === 'Enter') done('ok'); });
      m.querySelector('#gate-ok').addEventListener('click', () => { S._gate = i.value; });
      i.addEventListener('input', () => { S._gate = i.value; });
    },
  });
  if (v === 'ok' && Number(S._gate) === a * b) { S.parent = true; parentHome('songs'); }
  else if (v === 'ok') toast('Not quite. Ask a grown-up!');
  S._gate = '';
}

// ---------------------------------------------------------------- parent area
async function parentHome(tab = 'songs') {
  if (!S.parent) return home();
  S.catalog = await loadCatalog();
  const tabs = [['songs', 'Songs'], ['players', 'Players'], ['sound', 'Sound & timing'], ['help', 'Help']];
  setScreen('parent', `
    <header class="topbar">
      <button class="icon-btn" data-a="leave-parent" aria-label="Done">${icon('back')}</button>
      <h2>Grown-ups</h2><span></span>
    </header>
    <nav class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</nav>
    <div class="parent-body">${parentTab(tab)}</div>`);
  bindParent(tab);
}

function parentTab(tab) {
  if (tab === 'songs') {
    return `<div class="plist">${S.catalog.map(s => {
      const c = s.chartData;
      const e = c?.difficulties.easy.notes.length || 0, h = c?.difficulties.hard.notes.length || 0;
      const audio = s.deviceAudio ? 'Audio on this device' : s.audio ? 'Audio on site' : 'Needs audio';
      const chartSrc = s.localChart ? (s.siteChart ? 'Edited on this device' : 'Made on this device') : s.siteChart ? 'Site chart' : 'No chart yet';
      return `<div class="pcard" data-id="${esc(s.id)}">
        <div class="pcard-head"><div><b>${esc(s.title)}</b><br><small class="muted">${esc(s.artist || '')}${s.note ? ' · ' + esc(s.note) : ''}</small></div>
          <label class="switch-row compact"><small>Kids can play</small><input type="checkbox" class="switch" data-pub="${esc(s.id)}" ${c?.published ? 'checked' : ''} ${!c || !s.hasAudio || (!e && !h) ? 'disabled' : ''}></label></div>
        <div class="chips"><span class="chip ${s.hasAudio ? 'ok' : 'warn'}">${audio}</span><span class="chip">${chartSrc}</span>
          <span class="chip">Easy ${e}</span><span class="chip">Hard ${h}</span>
          ${c ? `<span class="chip ${c.status === 'reviewed' ? 'ok' : 'warn'}">${c.status === 'reviewed' ? 'Reviewed' : 'Draft, needs review'}</span>` : ''}</div>
        <div class="row wrap">
          <button class="btn small primary" data-p="edit" ${s.hasAudio ? '' : 'disabled'}>${icon('edit')} Edit chart</button>
          <button class="btn small" data-p="audio">${icon('file')} ${s.hasAudio ? 'Replace audio' : 'Add audio file'}</button>
          ${s.deviceAudio ? `<button class="btn small ghost" data-p="rmaudio">Remove device audio</button>` : ''}
          ${s.localChart && s.siteChart ? `<button class="btn small ghost" data-p="revert">Use site chart</button>` : ''}
          ${s.origin === 'device' ? `<button class="btn small ghost danger" data-p="delsong">${icon('trash')} Delete song</button>` : ''}
        </div></div>`;
    }).join('')}
    <button class="btn big" data-p="new">${icon('plus')} Add a new song from a file</button></div>`;
  }
  if (tab === 'players') {
    const prof = store.getProfiles();
    return `<div class="plist">${prof.list.map((p, i) => `
      <div class="pcard row between" data-pid="${esc(p.id)}">
        <span class="pname" style="--accent:${LANE_COLORS[i % 4]}">${icon('user')} ${esc(p.name)}</span>
        <span class="row"><label class="switch-row compact"><small>Relaxed</small><input type="checkbox" class="switch" data-relaxed="${esc(p.id)}" ${p.relaxed !== false ? 'checked' : ''}></label>
        <button class="btn small" data-pl="rename">Rename</button>
        <button class="btn small ghost" data-pl="clear">Clear scores</button>
        ${prof.list.length > 1 ? `<button class="icon-btn small danger" data-pl="delete" aria-label="Delete">${icon('trash')}</button>` : ''}</span>
      </div>`).join('')}
      <button class="btn big" data-pl="add">${icon('plus')} Add player</button></div>`;
  }
  if (tab === 'sound') {
    const s = S.settings;
    return `<div class="plist form">
      <label>Music volume <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-set="music"></label>
      <label>Tap sounds volume <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-set="sfx"></label>
      <label class="switch-row"><span>Tap sounds</span><input type="checkbox" class="switch" data-set="hitSounds" ${s.hitSounds ? 'checked' : ''}></label>
      <label>Tile speed <span class="val" id="speed-val">${s.speed}</span><input type="range" min="1" max="10" step="1" value="${s.speed}" data-set="speed"></label>
      <h3>Timing</h3>
      <p class="muted small">Bluetooth headphones and speakers play sound a little late. Run the timing check once for each, so taps line up with the music.</p>
      <div class="seg">${['speaker', 'headphones'].map(k => `<button class="seg-btn ${s.offsetProfile === k ? 'on' : ''}" data-oprof="${k}">${k === 'speaker' ? 'Device speaker / wired' : 'Bluetooth'}</button>`).join('')}</div>
      <label>Timing offset <span class="val" id="off-val">${savedOffset(s)} ms</span><input type="range" min="-150" max="450" step="5" value="${savedOffset(s)}" data-set="offset"></label>
      ${engine.deviceLatency() ? `<p class="muted small">This device also reports ${Math.round(engine.deviceLatency() * 1000)} ms of sound delay, which is added automatically.</p>` : ''}
      <button class="btn big primary" data-p="calibrate">${icon('music')} Timing check</button>
      <h3>Reset</h3>
      <button class="btn small ghost danger" data-p="reset">Erase everything on this device</button>
    </div>`;
  }
  return `<div class="plist help">
    <h3>Setting up a song</h3>
    <ol>
      <li>On the <b>Songs</b> tab, tap <b>Add audio file</b> and pick the song from the Files app (an MP3 or M4A you bought).</li>
      <li>Tap <b>Edit chart</b>. Use <b>Auto draft</b> in the menu for a starting point, or tap along in <b>Record</b> mode.</li>
      <li>Play it through in <b>Edit</b> mode with the clap track on. Move, delete or add tiles until it feels right. Do Hard first, then use <b>Make Easy from Hard</b> and tidy it.</li>
      <li>Use <b>Playtest</b> to try it for real, then mark it <b>Reviewed</b> and turn on <b>Kids can play</b>.</li>
      <li>Charts save on this device automatically. Use <b>Export</b> to save the chart file, so it can be added to the website for every device.</li>
    </ol>
    <h3>Good to know</h3>
    <ul>
      <li>If the phone's ring/silent switch is on silent, iPhone may mute the game. Flip it to ring.</li>
      <li>Add the game to the Home Screen (Share, then Add to Home Screen) for full screen play.</li>
      <li>Auto draft listens for beats and sudden sounds. It often misses the tune and adds drum hits, so always review it.</li>
    </ul></div>`;
}

function bindParent(tab) {
  const body = app.querySelector('.parent-body');
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => parentHome(b.dataset.tab));
  body.querySelectorAll('[data-pub]').forEach(i => i.onchange = () => {
    const s = S.catalog.find(x => x.id === i.dataset.pub);
    const c = structuredClone(chartFor(s)); c.published = i.checked;
    store.saveLocalChart(s.id, c);
    toast(i.checked ? 'Kids can play this song on this device' : 'Hidden from kids');
    parentHome('songs');
  });
  body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => parentAction(b.dataset.p, b.closest('[data-id]')?.dataset.id, tab));
  body.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => playerAction(b.dataset.pl, b.closest('[data-pid]')?.dataset.pid));
  body.querySelectorAll('[data-relaxed]').forEach(i => i.onchange = () => { const p = store.getProfiles(); p.list.find(x => x.id === i.dataset.relaxed).relaxed = i.checked; store.saveProfiles(p); });
  body.querySelectorAll('[data-oprof]').forEach(b => b.onclick = () => { S.settings.offsetProfile = b.dataset.oprof; store.saveSettings(S.settings); parentHome('sound'); });
  body.querySelectorAll('[data-set]').forEach(i => i.oninput = () => {
    const k = i.dataset.set, s = S.settings;
    if (k === 'hitSounds') s.hitSounds = i.checked;
    else if (k === 'offset') { s.offsets = { ...s.offsets, [s.offsetProfile]: Number(i.value) }; s.calibrated = { ...s.calibrated, [s.offsetProfile]: true }; document.getElementById('off-val').textContent = i.value + ' ms'; }
    else { s[k] = Number(i.value); if (k === 'speed') document.getElementById('speed-val').textContent = i.value; }
    store.saveSettings(s); applyVolumes();
    if (k === 'sfx' || k === 'music') { unlock().then(() => sfx.blip(2)); }
  });
}

async function readAudioFile(file) {
  const buf = await file.arrayBuffer();
  await unlock();
  const decoded = await engine.decode(buf.slice(0)); // proves the device can play it
  return { buf, decoded };
}

async function parentAction(act, id, tab) {
  const song = S.catalog.find(s => s.id === id);
  if (act === 'edit') return openEditor(song);
  if (act === 'audio' || act === 'new') {
    const f = await pickFile('audio/*,.mp3,.m4a,.aac,.wav');
    if (!f) return;
    toast('Reading the audio file…', 6000);
    let r;
    try { r = await readAudioFile(f); } catch { toast('This device could not read that file. Try an MP3 or M4A.'); return; }
    if (act === 'new') {
      const base = f.name.replace(/\.[^.]+$/, '');
      const v = await sheet(`<h2>New song</h2>
        <label>Title<input class="input" id="ns-title" value="${esc(base)}"></label>
        <label>Artist<input class="input" id="ns-artist" value=""></label>
        <div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary" data-v="ok">Add</button></div>`, {
        onOpen: m => { const upd = () => { S._ns = { title: m.querySelector('#ns-title').value, artist: m.querySelector('#ns-artist').value }; }; m.oninput = upd; upd(); },
      });
      if (v !== 'ok') return;
      const title = S._ns.title.trim() || base;
      let sid = slugify(title); const taken = new Set(S.catalog.map(s => s.id));
      while (taken.has(sid)) sid = slugify(title) + '-' + Math.floor(Math.random() * 1000);
      try { await store.putAudio(sid, r.buf, f.name, f.type); } catch { toast('Not enough storage space on this device.'); return; }
      store.saveLocalSongs([...store.getLocalSongs(), { id: sid, title, artist: S._ns.artist.trim(), file: f.name }]);
      const c = emptyChart({ songId: sid, title, artist: S._ns.artist.trim(), file: f.name, duration: r.decoded.duration, firstSound: fs(r.decoded) });
      store.saveLocalChart(sid, c);
    } else {
      try { await store.putAudio(id, r.buf, f.name, f.type); } catch { toast('Not enough storage space on this device.'); return; }
      const c = chartFor(song);
      if (c.audio.duration && Math.abs(c.audio.duration - r.decoded.duration) > 1) toast(`Heads up: this file is ${Math.round(r.decoded.duration)}s long but the chart was made for a ${Math.round(c.audio.duration)}s file. It may be a different version.`, 7000);
      else toast('Audio saved on this device');
      if (!c.audio.duration || !song.chartData) { const cc = structuredClone(c); cc.audio = { file: f.name, duration: r.decoded.duration, firstSound: fs(r.decoded) }; store.saveLocalChart(id, cc); }
    }
    forgetAudio();
    return parentHome('songs');
  }
  if (act === 'rmaudio') { await store.deleteAudio(id); forgetAudio(); return parentHome('songs'); }
  if (act === 'revert') { if ((await sheet(`<h2>Use the site chart?</h2><p>Your edits on this device for “${esc(song.title)}” will be deleted.</p><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary danger" data-v="ok">Delete my edits</button></div>`)) === 'ok') { store.deleteLocalChart(id); parentHome('songs'); } return; }
  if (act === 'delsong') {
    if ((await sheet(`<h2>Delete “${esc(song.title)}”?</h2><p>This removes the song, its chart and its audio from this device.</p><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary danger" data-v="ok">Delete</button></div>`)) !== 'ok') return;
    await store.deleteAudio(id); store.deleteLocalChart(id); store.saveLocalSongs(store.getLocalSongs().filter(s => s.id !== id));
    return parentHome('songs');
  }
  if (act === 'calibrate') return calibrate();
  if (act === 'reset') {
    if ((await sheet(`<h2>Erase everything?</h2><p>Players, scores, settings, chart edits and audio files on this device will be deleted. Songs on the website stay.</p><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary danger" data-v="ok">Erase</button></div>`)) !== 'ok') return;
    store.resetAll(); S.settings = store.getSettings(); forgetAudio(); return parentHome('songs');
  }
}
const fs = buf => { const chs = []; for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c)); return Math.round(firstSoundTime(chs, buf.sampleRate) * 10000) / 10000; };

async function playerAction(act, pid) {
  const prof = store.getProfiles();
  const p = prof.list.find(x => x.id === pid);
  const ask = async (title, val = '') => {
    const v = await sheet(`<h2>${title}</h2><input class="input big" id="pn" maxlength="16" value="${esc(val)}"><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary" data-v="ok">Save</button></div>`,
      { onOpen: m => { const i = m.querySelector('#pn'); i.oninput = () => { S._pn = i.value; }; S._pn = val; setTimeout(() => i.focus(), 50); } });
    return v === 'ok' ? (S._pn || '').trim() : null;
  };
  if (act === 'add') { const n = await ask('New player'); if (n) { const id = 'p' + Date.now().toString(36); prof.list.push({ id, name: n, relaxed: true }); store.saveProfiles(prof); } }
  else if (act === 'rename') { const n = await ask('Rename player', p.name); if (n) { p.name = n; store.saveProfiles(prof); } }
  else if (act === 'clear') { if ((await sheet(`<h2>Clear ${esc(p.name)}'s scores?</h2><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary danger" data-v="ok">Clear</button></div>`)) === 'ok') store.clearScoresFor(pid); }
  else if (act === 'delete') {
    if ((await sheet(`<h2>Delete ${esc(p.name)}?</h2><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary danger" data-v="ok">Delete</button></div>`)) === 'ok') {
      prof.list = prof.list.filter(x => x.id !== pid); if (prof.current === pid) prof.current = prof.list[0].id; store.saveProfiles(prof); store.clearScoresFor(pid);
    }
  }
  parentHome('players');
}

// ---------------------------------------------------------------- timing check
async function calibrate() {
  await unlock();
  const BEAT = 0.6, COUNT = 16;
  setScreen('calibrate', `
    <header class="topbar"><button class="icon-btn" data-a="cal-done" aria-label="Back">${icon('back')}</button><h2>Timing check</h2><span></span></header>
    <div class="cal">
      <p>Use the speaker or headphones you play with. Tap the big button <b>exactly on each click</b>. There are ${COUNT} clicks.</p>
      <button class="cal-pad" id="cal-pad">Tap on the click</button>
      <p class="cal-status" id="cal-status">Tap Start when ready.</p>
      <button class="btn big primary" id="cal-start">${icon('play')} Start</button>
    </div>`);
  const pad = document.getElementById('cal-pad'), status = document.getElementById('cal-status'), startBtn = document.getElementById('cal-start');
  let clicks = [], taps = [];
  startBtn.onclick = async () => {
    await unlock();
    startBtn.disabled = true; taps = [];
    const t0 = engine.ctx.currentTime + 0.8;
    clicks = Array.from({ length: COUNT }, (_, i) => t0 + i * BEAT);
    clicks.forEach((t, i) => sfx.click(t, i % 4 === 0, 1));
    window.__tt.calClicks = clicks;
    status.textContent = 'Listen… then tap along';
    setTimeout(finish, (0.8 + COUNT * BEAT + 0.6) * 1000);
  };
  pad.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!clicks.length) return;
    const lag = (performance.now() - e.timeStamp) / 1000;
    taps.push(engine.now() - (lag > 0 && lag < 0.1 ? lag : 0));
    pad.classList.remove('flash'); void pad.offsetWidth; pad.classList.add('flash');
  });
  function finish() {
    const diffs = taps.map(t => { let best = Infinity; for (const c of clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c; return best; })
      .filter(d => Math.abs(d) < BEAT / 2);
    clicks = [];
    startBtn.disabled = false;
    if (diffs.length < 8) { status.textContent = `Only ${diffs.length} taps counted. Try again and tap on every click.`; return; }
    const use = diffs.slice(2).sort((a, b) => a - b);
    const med = use[Math.floor(use.length / 2)];
    const spread = use[Math.floor(use.length * 0.85)] - use[Math.floor(use.length * 0.15)];
    const ms = Math.round((med - engine.deviceLatency()) * 1000 / 5) * 5;
    S.settings.offsets = { ...S.settings.offsets, [S.settings.offsetProfile]: Math.max(-150, Math.min(450, ms)) };
    S.settings.calibrated = { ...S.settings.calibrated, [S.settings.offsetProfile]: true };
    store.saveSettings(S.settings);
    status.innerHTML = `Offset set to <b>${ms} ms</b> for ${S.settings.offsetProfile === 'speaker' ? 'speaker' : 'Bluetooth'}.` + (spread > 0.08 ? ' Your taps were a bit uneven, so you may want to run it again.' : ' Looks steady.');
  }
}

// ---------------------------------------------------------------- editor
async function openEditor(song) {
  setScreen('loading', `<div class="loading-box"><div class="spinner"></div><p id="load-msg">Loading the editor…</p></div>`);
  let a;
  try { await unlock(); a = await loadAudio(engine, song, m => { const el = document.getElementById('load-msg'); if (el) el.textContent = m; }); }
  catch (e) { toast(e.message || 'Could not load the audio'); return parentHome('songs'); }
  engine.buffer = a.buffer; engine.shift = a.shift;
  const { Editor } = await import('./editor.js');
  setScreen('editor', '');
  const ed = new Editor({
    root: app, engine, sfx, song, chart: structuredClone(chartFor(song)), settings: S.settings, firstSound: a.firstSound,
    offsetMs: offsetMs(S.settings),
    onExit: () => parentHome('songs'),
    onPlaytest: (chart, diff, from) => playtest(song, chart, diff, from, ed),
  });
  window.__tt.editor = ed;
}

function playtest(song, chart, diff, from, ed) {
  ed.hide();
  const notes = chart.difficulties[diff].notes.filter(n => n.t >= from - 0.01);
  const host = document.createElement('div'); host.className = 'playtest-host'; document.body.appendChild(host);
  const back = () => { host.remove(); ed.show(); };
  const game = new Game({
    root: host, engine, sfx, notes, settings: S.settings, relaxed: false, offsetMs: offsetMs(S.settings),
    fromPos: from > 0 ? from - travelTime(S.settings.speed, false) - 0.6 : undefined,
    onDone: r => { back(); toast(`Playtest: ${r.counts.perfect} perfect, ${r.counts.great} great, ${r.counts.good} good, ${r.counts.miss} missed. Your taps averaged ${Math.round(r.meanError * 1000)} ms ${r.meanError >= 0 ? 'late' : 'early'}.`, 6000); },
    onQuit: back, onRetry: () => { back(); },
  });
  game.start();
}

// ---------------------------------------------------------------- events
app.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a;
  unlock();
  if (a === 'play') { click(); S.catalog = await loadCatalog(); songsScreen(); }
  else if (a === 'home') { click('back'); home(); }
  else if (a === 'songs') { click('back'); S.catalog = await loadCatalog(); songsScreen(); }
  else if (a === 'song') { click(); chooseDiff(S.catalog.find(s => s.id === b.dataset.id)); }
  else if (a === 'players') players();
  else if (a === 'leave-parent') { S.parent = false; home(); }
  else if (a === 'cal-done') parentHome('sound');
});
app.addEventListener('pointerdown', e => { const b = e.target.closest('[data-hold="parent"]'); if (b) holdToOpen(b); });
// Stop iOS double-tap zoom and long-press menus on game surfaces.
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw=1/.test(location.search)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
S.catalog = await loadCatalog();
home();
export { play };
