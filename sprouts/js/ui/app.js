// Sprout Pals — screens and interaction. Game rules live in js/engine; numbers in config/.
import * as G from '../engine/game.js';
import { advance, stageTimeLeft, stageProgress, HOUR } from '../engine/time.js';
import { SaveStore, exportData, parseImport } from '../engine/save.js';
import { FORMS } from '../../config/evolution.js';
import { STAGE_LABELS } from '../../config/stages.js';
import { NEEDS, NEED_INFO, LOW, GOOD, WELCOME_BACK_HOURS } from '../../config/needs.js';
import { FOODS, FOOD_ORDER } from '../../config/foods.js';
import { CROPS, CROP_ORDER } from '../../config/crops.js';
import { DECORATIONS, DECORATION_ORDER, BUBBLE_POP, ADULT_GOAL } from '../../config/rewards.js';
import { Art } from './art.js';
import { icon } from './icons.js';
import { petHtml, petThumb, react } from './pet-view.js';
import { foodSvg, cropSvg, seedPacketSvg, decorSvg, avatarSvg, logoSvg, STAR_SVG, FX } from './placeholders.js';
import { sfx, unlockAudio, setMuted, setVolume, isMuted } from './sound.js';

// ---------- state ----------
const store = new SaveStore(safeStorage());
const S = { index: null, profiles: [], cur: null, tab: 'pet', modal: null, bubble: null, lastMood: null };
const $app = document.getElementById('app');
const $modal = document.getElementById('modal');
const $toast = document.getElementById('toast');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();

function safeStorage() {
  try { const k = '__sp_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; }
  catch {
    const m = new Map();   // private browsing etc.: keep playing, warn the parent area
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), memoryOnly: true };
  }
}

// ---------- art helpers ----------
const A = {
  star: () => `<span class="i-star">${Art.html('ui.star', STAR_SVG)}</span>`,
  food: id => Art.html(`food.${id}`, foodSvg(id, CROPS[id]?.color)),
  crop: (id, st) => Art.html(`crop.${id}.${st}`, cropSvg(id, st, CROPS[id].color)),
  seeds: id => Art.html(`seed.${id}`, seedPacketSvg(id, CROPS[id].color)),
  decor: id => Art.html(`decor.${id}`, decorSvg(id)),
  avatar: i => Art.html(`ui.avatar-${i}`, avatarSvg(i)),
  ui: name => Art.html(`ui.${name}`, icon(name), 'ico'),
};
const bg = key => (Art.has(key) ? `style="background-image:url('${Art.url(key)}')"` : '');

// ---------- persistence ----------
let saveWarned = false;
function persist() {
  if (!S.cur) return;
  S.cur.lastSeen = now();
  const ok = store.saveProfile(S.cur);
  if (!ok && !saveWarned) { saveWarned = true; toast("Couldn't save on this device. Ask a grown-up to check storage."); }
}
function persistIndex() { store.saveIndex(S.index); }

// ---------- boot ----------
function boot() {
  const { index, profiles } = store.loadAll(now());
  S.index = index;
  S.profiles = profiles;
  setMuted(index.settings.muted);
  setVolume(index.settings.volume);
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  document.addEventListener('click', onClick);
  document.addEventListener('submit', e => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { tick(); persist(); } else { tick(true); } });
  window.addEventListener('pagehide', () => { tick(); persist(); });
  setInterval(() => tick(), 1000);
  setInterval(() => persist(), 10000);
  Art.onChange(() => render());
  Art.init();
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ---------- time ----------
function tick(returning = false) {
  if (!S.cur) return;
  const sum = advance(S.cur, now());
  if (returning && sum.elapsedMs >= WELCOME_BACK_HOURS * HOUR) { persist(); welcomeBack(sum); }
  if (S.bubble) return;
  liveUpdate();
}

// ---------- rendering ----------
function render() {
  if (!S.cur) { $app.innerHTML = homeHtml(); $app.className = 'screen-home'; return; }
  $app.className = 'screen-game tab-' + S.tab;
  $app.innerHTML = `${topbarHtml()}<main id="main" class="main">${tabHtml()}</main>${navHtml()}`;
  S.lastMood = S.cur.pet ? G.mood(S.cur.pet) : null;
}

function tabHtml() {
  switch (S.tab) {
    case 'farm': return farmHtml();
    case 'game': return gameHtml();
    case 'meadow': return meadowHtml();
    default: return petTabHtml();
  }
}

function soundBtn() {
  const m = isMuted();
  return `<button class="btn-icon sound${m ? ' is-muted' : ''}" data-act="mute" aria-label="${m ? 'Turn sound on' : 'Mute sound'}" aria-pressed="${m}">${icon(m ? 'sound-off' : 'sound-on')}</button>`;
}

function topbarHtml() {
  const p = S.cur;
  return `<header class="topbar">
    <button class="who" data-act="home" aria-label="Back to players"><span class="avatar">${A.avatar(p.avatar)}</span><span class="who-name">${esc(p.name)}</span></button>
    <div class="topbar-right"><div class="stars" aria-label="${p.inventory.stars} stars">${A.star()}<b id="star-count">${p.inventory.stars}</b></div>${soundBtn()}</div>
  </header>`;
}

function navHtml() {
  const tabs = [['pet', 'Pet', 'tab-pet'], ['farm', 'Farm', 'tab-farm'], ['game', 'Bubbles', 'tab-game'], ['meadow', 'Meadow', 'tab-meadow']];
  const farmReady = S.cur.farm.plots.some(G.cropReady);
  return `<nav class="nav">${tabs.map(([id, label, ic]) => `<button class="nav-btn${S.tab === id ? ' on' : ''}" data-act="tab" data-tab="${id}" aria-label="${label}">${icon(ic)}<span>${label}</span>${id === 'farm' && farmReady ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>`;
}

// ---------- home ----------
function homeHtml() {
  const tiles = S.profiles.map(p => `
    <button class="player" data-act="open" data-id="${p.id}">
      <span class="avatar big">${A.avatar(p.avatar)}</span>
      <span class="player-name">${esc(p.name)}</span>
      <span class="player-pet">${p.pet.stage === 'egg' ? 'Egg waiting to hatch' : esc(p.pet.name || FORMS[p.pet.form].name) + ' · ' + STAGE_LABELS[p.pet.stage]}</span>
    </button>`).join('');
  const problems = store.problems.length ? `<p class="home-note">Some saved games need a grown-up: open Grown-ups.</p>` : '';
  return `<div class="home" ${bg('bg.home')}>
    <div class="home-top">${soundBtn()}</div>
    <div class="logo">${Art.html('ui.logo', logoSvg())}</div>
    <h2 class="home-q">${S.profiles.length ? "Who's playing?" : 'Hi! Make a player to start.'}</h2>
    <div class="players">${tiles}
      ${S.profiles.length < 8 ? `<button class="player add" data-act="new-player"><span class="avatar big add-plus">${icon('plus')}</span><span class="player-name">New player</span></button>` : ''}
    </div>
    ${problems}
    <button class="parents" data-act="parent-gate">${icon('gear')} Grown-ups</button>
  </div>`;
}

// ---------- pet tab ----------
function needsHtml(pet) {
  return NEEDS.map(k => {
    const v = Math.round(pet.needs[k]), info = NEED_INFO[k];
    const level = v < LOW ? 'low' : v < GOOD ? 'mid' : 'high';
    return `<div class="need need-${k} ${level}" data-need="${k}" style="--c:${info.color}" role="meter" aria-label="${info.label}" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100">
      <span class="need-ico">${A.ui('need-' + k)}</span>
      <span class="need-bar"><span class="need-fill" style="width:${v}%"></span></span>
      <span class="need-label">${info.label}</span>
    </div>`;
  }).join('');
}

function growthHtml(pet) {
  if (pet.stage === 'egg') return `<div class="growth"><p class="hint big">Tap the egg to help it hatch!</p></div>`;
  const title = `<div class="pet-title"><b>${esc(pet.name || FORMS[pet.form].name)}</b><span>${STAGE_LABELS[pet.stage]} ${esc(FORMS[pet.form].name)}</span></div>`;
  if (pet.stage === 'adult') return `<div class="growth">${title}</div>`;
  if (pet.readyToGrow) return `<div class="growth">${title}<button class="btn grow-btn" data-act="grow">${icon('tab-meadow')} Ready to grow!</button></div>`;
  const left = stageTimeLeft(pet), pct = Math.round(stageProgress(pet) * 100);
  return `<div class="growth">${title}
    <div class="grow-bar" title="Grows up in ${fmtDur(left)}"><span style="width:${pct}%"></span></div>
    <div class="grow-left">Grows up in <span id="grow-left">${fmtDur(left)}</span></div></div>`;
}

function goalHtml(pet) {
  if (pet.stage !== 'adult') return '';
  const steps = G.goalProgress(pet);
  const done = G.goalComplete(pet);
  return `<div class="goal card">
    <h3>${esc(ADULT_GOAL.title)}</h3>
    <p class="goal-sub">All grown up! Finish these, then ${esc(pet.name)} can move to the Meadow.</p>
    <ul>${steps.map(s => `<li class="${s.done >= s.count ? 'done' : ''}"><i></i>${esc(s.label)} <b>${s.done}/${s.count}</b></li>`).join('')}</ul>
    ${done ? `<button class="btn btn-go" data-act="meadow-send">Move to the Meadow</button>` : ''}
  </div>`;
}

function petTabHtml() {
  const pet = S.cur.pet, mood = G.mood(pet), egg = pet.stage === 'egg';
  const night = pet.asleep;
  const actions = egg ? '' : `<div class="actions">
      <button class="act act-feed" data-act="feed-open" ${night ? 'disabled' : ''}>${A.ui('action-feed')}<span>Feed</span></button>
      <button class="act act-play" data-act="play" ${night ? 'disabled' : ''}>${A.ui('action-play')}<span>Play</span></button>
      <button class="act act-wash" data-act="wash" ${night ? 'disabled' : ''}>${A.ui('action-wash')}<span>Wash</span></button>
      <button class="act act-sleep" data-act="sleep">${A.ui(night ? 'action-wake' : 'action-sleep')}<span>${night ? 'Wake up' : 'Sleep'}</span></button>
    </div>`;
  return `<section class="pet-tab${night ? ' night' : ''}">
    ${egg ? '' : `<div class="needs" id="needs">${needsHtml(pet)}</div>`}
    <div class="stage" id="stage" ${bg(night ? 'bg.room-night' : 'bg.room')}>
      ${night ? '<div class="night-sky"></div>' : ''}
      <button class="pet-hit" data-act="${egg ? 'hatch' : 'pet-tap'}" aria-label="${egg ? 'Tap the egg' : 'Pet your pal'}">${petHtml(pet, mood)}</button>
      <div class="say" id="say" hidden></div>
    </div>
    <div class="below" id="growth-wrap">${growthHtml(pet)}${goalHtml(pet)}</div>
    ${actions}
  </section>`;
}

// ---------- farm ----------
function plotHtml(plot, i) {
  const st = G.cropStage(plot);
  if (st < 0) return `<button class="plot empty" data-act="plot" data-i="${i}" data-sig="empty" aria-label="Empty plot, tap to plant">
    <span class="soil">${Art.html('farm.plot', '')}</span><span class="plot-plus">${icon('plus')}</span><span class="plot-label">Plant</span></button>`;
  const ready = G.cropReady(plot);
  return `<button class="plot${ready ? ' ready' : ''}" data-act="plot" data-i="${i}" data-sig="${plot.crop}-${st}" aria-label="${CROPS[plot.crop].label}${ready ? ' ready to pick' : ' growing'}">
    <span class="soil">${Art.html('farm.plot', '')}</span>
    <span class="crop">${A.crop(plot.crop, st)}</span>
    <span class="plot-label">${ready ? 'Pick me!' : `<span class="plot-time">${fmtDur(G.cropTimeLeft(plot))}</span>`}</span></button>`;
}

function farmHtml() {
  const p = S.cur;
  const seeds = CROP_ORDER.map(c => `<span class="chip">${A.seeds(c)}<b>${p.inventory.seeds[c] || 0}</b></span>`).join('');
  const food = CROP_ORDER.map(c => `<span class="chip">${A.food(c)}<b>${p.inventory.food[c] || 0}</b></span>`).join('');
  const decor = p.farm.decorations.map(d => `<div class="decor">${A.decor(d)}</div>`).join('');
  return `<section class="farm" ${bg('bg.farm')}>
    <div class="decor-row">${decor || '<p class="hint">Build things for your farm with stars from Bubbles!</p>'}</div>
    <div class="plots" id="plots">${p.farm.plots.map(plotHtml).join('')}</div>
    <div class="farm-bottom">
      <div class="bag card"><h4>Seeds</h4><div class="chips">${seeds}</div><h4>Food basket</h4><div class="chips">${food}</div></div>
      <button class="btn btn-build" data-act="build-open">${icon('build')} Build</button>
    </div>
  </section>`;
}

// ---------- minigame ----------
function gameHtml() {
  return `<section class="bubble-intro" ${bg('bg.bubbles')}>
    <h2>Bubble Pop</h2>
    <p>Pop the bubbles before they float away!<br>Seed bubbles give seeds. Star bubbles give stars for building.</p>
    <div class="intro-bubbles"><span>${FX.bubble}</span><span class="b2">${A.star()}</span><span class="b3">${A.seeds('strawberry')}</span></div>
    <button class="btn btn-go big" data-act="bubble-start">Play!</button>
  </section>`;
}

function weightedCrop() {
  const entries = Object.entries(BUBBLE_POP.seedWeights);
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [c, w] of entries) { r -= w; if (r <= 0) return c; }
  return entries[0][0];
}

function startBubbles() {
  const main = document.getElementById('main');
  main.innerHTML = `<section class="bubble-game" ${bg('bg.bubbles')}>
    <div class="bubble-hud"><div class="timebar"><span id="timebar"></span></div>
      <div class="bubble-score"><span>${A.seeds('peas')}<b id="b-seeds">0</b></span><span>${A.star()}<b id="b-stars">0</b></span></div></div>
    <div class="bubble-area" id="bubble-area"></div></section>`;
  const area = document.getElementById('bubble-area');
  const B = S.bubble = { seeds: {}, seedCount: 0, stars: 0, start: now(), end: now() + BUBBLE_POP.seconds * 1000, timers: [] };
  const spawn = () => {
    if (!S.bubble || now() > B.end) return;
    const isStar = Math.random() < BUBBLE_POP.starChance;
    const crop = isStar ? null : weightedCrop();
    const el = document.createElement('button');
    el.className = 'bubble' + (isStar ? ' star' : '');
    el.dataset.kind = isStar ? 'star' : crop;
    el.setAttribute('aria-label', isStar ? 'Star bubble' : CROPS[crop].label + ' seed bubble');
    const [a, b] = BUBBLE_POP.riseSeconds;
    el.style.setProperty('--x', `${6 + Math.random() * 74}%`);
    el.style.setProperty('--dur', `${a + Math.random() * (b - a)}s`);
    el.style.setProperty('--size', `${Math.round(78 + Math.random() * 34)}px`);
    el.innerHTML = `<span class="bubble-skin">${FX.bubble}</span><span class="bubble-in">${isStar ? A.star() : A.seeds(crop)}</span>`;
    el.addEventListener('pointerdown', e => { e.preventDefault(); popBubble(el); }, { once: true });
    el.addEventListener('animationend', () => el.remove());
    area.appendChild(el);
  };
  spawn();
  B.timers.push(setInterval(spawn, BUBBLE_POP.spawnEveryMs));
  B.timers.push(setInterval(() => {
    const left = Math.max(0, B.end - now());
    const bar = document.getElementById('timebar');
    if (bar) bar.style.width = (left / (BUBBLE_POP.seconds * 1000) * 100) + '%';
    if (left <= 0) endBubbles();
  }, 100));
}

function popBubble(el) {
  const B = S.bubble;
  if (!B || el.classList.contains('popped')) return;
  el.classList.add('popped');
  const kind = el.dataset.kind;
  if (kind === 'star') { B.stars++; sfx('star'); }
  else { B.seeds[kind] = (B.seeds[kind] || 0) + 1; B.seedCount++; sfx('pop'); }
  const s = document.getElementById('b-seeds'), t = document.getElementById('b-stars');
  if (s) s.textContent = B.seedCount;
  if (t) t.textContent = B.stars;
  setTimeout(() => el.remove(), 260);
}

function endBubbles() {
  const B = S.bubble;
  if (!B) return;
  B.timers.forEach(clearInterval);
  S.bubble = null;
  G.addRewards(S.cur, { seeds: B.seeds, stars: B.stars });
  G.minigamePlayed(S.cur);
  persist();
  sfx('fanfare');
  const got = Object.entries(B.seeds).map(([c, n]) => `<span class="chip">${A.seeds(c)}<b>+${n}</b></span>`).join('');
  openModal(`<div class="dialog reward">
    <h2>${B.seedCount + B.stars ? 'Great popping!' : 'Nice try!'}</h2>
    <div class="chips center">${got}${B.stars ? `<span class="chip">${A.star()}<b>+${B.stars}</b></span>` : ''}</div>
    ${B.seedCount + B.stars ? '' : '<p>Tap the bubbles as they float up.</p>'}
    <p class="small">${esc(S.cur.pet.stage === 'egg' ? '' : (S.cur.pet.name || 'Your pal') + ' had fun watching!')}</p>
    <div class="row"><button class="btn" data-act="bubble-again">Play again</button><button class="btn btn-go" data-act="close-modal">Done</button></div>
  </div>`, { onClose: () => render() });
}

function stopBubblesQuietly() {
  if (S.bubble) { S.bubble.timers.forEach(clearInterval); S.bubble = null; }
}

// ---------- meadow (collection) ----------
function meadowHtml() {
  const p = S.cur;
  const cards = p.collection.slice().reverse().map(c => `
    <div class="mcard card">${petThumb(c.form)}<b>${esc(c.name)}</b><span>${esc(FORMS[c.form].name)}</span>
      ${c.favoriteFood ? `<span class="fav">Loved ${esc(FOODS[c.favoriteFood].label)}</span>` : ''}
      <span class="date">${c.grownAt ? new Date(c.grownAt).toLocaleDateString() : ''}</span></div>`).join('');
  const adults = Object.keys(FORMS).filter(id => FORMS[id].stage === 'adult');
  const others = Object.keys(FORMS).filter(id => FORMS[id].stage !== 'adult');
  const guide = list => list.map(id => {
    const known = p.discovered.includes(id);
    return `<div class="gcard${known ? '' : ' unknown'}">${petThumb(id, { silhouette: !known })}<span>${known ? esc(FORMS[id].name) : '???'}</span>
      ${known ? '' : FORMS[id].rare ? '<em>Rare!</em>' : ''}</div>`;
  }).join('');
  return `<section class="meadow" ${bg('bg.meadow')}>
    <h2>The Meadow</h2>
    ${cards ? `<div class="mgrid">${cards}</div>` : `<p class="hint card">When your pal grows all the way up, it can come live here. Then a new egg appears!</p>`}
    <h3>Grown-up guide <small>${adults.filter(id => p.discovered.includes(id)).length}/${adults.length} found</small></h3>
    <div class="ggrid">${guide(adults)}</div>
    <h3>Little ones</h3>
    <div class="ggrid small">${guide(others)}</div>
  </section>`;
}

// ---------- live updates (every second) ----------
function liveUpdate() {
  const p = S.cur, pet = p.pet;
  if (S.tab === 'pet' && pet && pet.stage !== 'egg') {
    const m = G.mood(pet);
    if (m !== S.lastMood) { S.lastMood = m; const st = document.querySelector('#stage .pet-hit'); if (st) st.innerHTML = petHtml(pet, m); }
    for (const k of NEEDS) {
      const el = document.querySelector(`[data-need="${k}"]`);
      if (!el) continue;
      const v = Math.round(pet.needs[k]);
      el.querySelector('.need-fill').style.width = v + '%';
      el.setAttribute('aria-valuenow', v);
      el.classList.toggle('low', v < LOW); el.classList.toggle('mid', v >= LOW && v < GOOD); el.classList.toggle('high', v >= GOOD);
    }
    const gl = document.getElementById('grow-left');
    if (pet.readyToGrow && !document.querySelector('.grow-btn')) { document.getElementById('growth-wrap').innerHTML = growthHtml(pet) + goalHtml(pet); sfx('star'); }
    else if (gl) { gl.textContent = fmtDur(stageTimeLeft(pet)); const bar = document.querySelector('.grow-bar span'); if (bar) bar.style.width = Math.round(stageProgress(pet) * 100) + '%'; }
    if (!pet.asleep && document.querySelector('.pet-tab.night')) render();   // woke up on its own
  }
  if (S.tab === 'farm') {
    p.farm.plots.forEach((plot, i) => {
      const el = document.querySelector(`.plot[data-i="${i}"]`);
      if (!el) return;
      const st = G.cropStage(plot), sig = st < 0 ? 'empty' : `${plot.crop}-${st}`;
      if (el.dataset.sig !== sig) { el.outerHTML = plotHtml(plot, i); if (G.cropReady(plot)) sfx('star'); }
      else { const t = el.querySelector('.plot-time'); if (t) t.textContent = fmtDur(G.cropTimeLeft(plot)); }
    });
  }
  const dotWanted = p.farm.plots.some(G.cropReady);
  const farmBtn = document.querySelector('.nav-btn[data-tab="farm"]');
  if (farmBtn && !!farmBtn.querySelector('.dot') !== dotWanted) {
    if (dotWanted) farmBtn.insertAdjacentHTML('beforeend', '<i class="dot"></i>'); else farmBtn.querySelector('.dot').remove();
  }
}

// ---------- modals & toasts ----------
let modalOnClose = null;
function openModal(html, { onClose = null, dismissable = true } = {}) {
  modalOnClose = onClose;
  $modal.innerHTML = `<div class="scrim" ${dismissable ? 'data-act="close-modal"' : ''}></div><div class="sheet" role="dialog" aria-modal="true">${dismissable ? `<button class="btn-icon close" data-act="close-modal" aria-label="Close">${icon('close')}</button>` : ''}${html}</div>`;
  $modal.hidden = false;
  S.modal = true;
  const first = $modal.querySelector('input:not([type=hidden]), .sheet button:not(.close)');
  if (first && first.tagName === 'INPUT' && matchMedia('(pointer:fine)').matches) first.focus();
}
function closeModal() {
  $modal.hidden = true; $modal.innerHTML = ''; S.modal = null;
  const fn = modalOnClose; modalOnClose = null;
  if (fn) fn();
}
let toastTimer;
function toast(text) {
  $toast.textContent = text; $toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $toast.hidden = true; }, 3200);
}
function say(text) {
  const el = document.getElementById('say');
  if (!el) return;
  el.textContent = text; el.hidden = false;
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 2000);
}

function welcomeBack(sum) {
  const p = S.cur, pet = p.pet;
  const ready = p.farm.plots.filter(G.cropReady).length;
  const name = pet.stage === 'egg' ? 'Your egg' : esc(pet.name || 'Your pal');
  const tips = [];
  if (pet.stage !== 'egg') {
    if (pet.readyToGrow) tips.push(`${name} is ready to grow up!`);
    const low = NEEDS.filter(k => pet.needs[k] < LOW).map(k => NEED_INFO[k].label.toLowerCase());
    if (low.length) tips.push(`A little care will help: ${low.join(', ')}.`);
  }
  if (ready) tips.push(`${ready} crop${ready > 1 ? 's are' : ' is'} ready on the farm.`);
  sfx('wake');
  openModal(`<div class="dialog welcome">${pet.stage !== 'egg' ? petThumb(pet.form) : ''}
    <h2>Welcome back!</h2><p>${name} missed you${pet.stage === 'egg' ? ' (it’s still waiting to hatch)' : ''}!</p>
    ${tips.map(t => `<p class="tip">${t}</p>`).join('')}
    <button class="btn btn-go" data-act="close-modal">Let's go!</button></div>`, { onClose: () => render() });
}

// ---------- dialogs ----------
const NAME_IDEAS = ['Pip', 'Bean', 'Mochi', 'Sunny', 'Waffles', 'Bubbles', 'Ziggy', 'Pickle', 'Nugget', 'Coco', 'Biscuit', 'Peaches', 'Dot', 'Taco', 'Noodle', 'Maple', 'Jellybean', 'Sprinkles'];

function nameDialog() {
  const ideas = NAME_IDEAS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  openModal(`<div class="dialog name-dialog">${petThumb(S.cur.pet.form)}
    <h2>It hatched!</h2><p>What will you call your new pal?</p>
    <div class="row wrap">${ideas.map(n => `<button class="btn chip-btn" data-act="name-pick" data-name="${n}">${n}</button>`).join('')}</div>
    <form class="row" data-form="name"><input id="pet-name" maxlength="14" placeholder="Or type a name" autocomplete="off" enterkeyhint="done">
    <button class="btn btn-go" data-act="name-ok">OK</button></form></div>`, { dismissable: false });
}

function setName(name) {
  if (!G.nameOk(name)) { sfx('no'); return; }
  G.setPetName(S.cur, name);
  persist(); closeModal(); render();
  sfx('fanfare');
  setTimeout(() => say(`Hi! I'm ${S.cur.pet.name}!`), 300);
}

function newPlayerDialog(sel = 0) {
  openModal(`<div class="dialog">
    <h2>New player</h2>
    <form data-form="player"><label class="field">Name<input id="player-name" maxlength="16" placeholder="Your name" autocomplete="off" enterkeyhint="done"></label></form>
    <p>Pick a picture</p>
    <div class="avatars">${[0, 1, 2, 3, 4, 5].map(i => `<button class="avatar-pick${i === sel ? ' on' : ''}" data-act="avatar-pick" data-i="${i}" aria-label="Picture ${i + 1}">${A.avatar(i)}</button>`).join('')}</div>
    <button class="btn btn-go big" data-act="player-create">Start!</button></div>`);
}

function feedDialog() {
  const p = S.cur;
  const items = FOOD_ORDER.map(id => {
    const f = FOODS[id], n = f.unlimited ? null : (p.inventory.food[id] || 0);
    const off = n === 0;
    return `<button class="food${off ? ' off' : ''}" data-act="feed" data-food="${id}" ${off ? 'aria-disabled="true"' : ''}>
      ${A.food(id)}<span>${esc(f.label)}</span><b>${n === null ? 'Always' : n === 0 ? 'Grow it!' : '×' + n}</b></button>`;
  }).join('');
  openModal(`<div class="dialog"><h2>What's for lunch?</h2><div class="foods">${items}</div>
    <p class="small">Different foods help your pal grow in different ways.</p></div>`);
}

function seedDialog(i) {
  const p = S.cur;
  const items = CROP_ORDER.map(c => {
    const n = p.inventory.seeds[c] || 0;
    return `<button class="food${n ? '' : ' off'}" data-act="plant" data-i="${i}" data-crop="${c}">${A.seeds(c)}<span>${esc(CROPS[c].label)}</span><b>${n ? '×' + n : 'No seeds'}</b><em>${fmtDur(CROPS[c].growMinutes * 60000)}</em></button>`;
  }).join('');
  const none = CROP_ORDER.every(c => !(p.inventory.seeds[c] > 0));
  openModal(`<div class="dialog"><h2>Plant a seed</h2><div class="foods">${items}</div>
    ${none ? `<p class="tip">Out of seeds! Pop some bubbles to get more.</p><button class="btn btn-go" data-act="tab" data-tab="game">Go to Bubbles</button>` : ''}</div>`);
}

function buildDialog() {
  const p = S.cur;
  const items = DECORATION_ORDER.map(d => {
    const info = DECORATIONS[d], have = p.farm.decorations.includes(d), can = p.inventory.stars >= info.stars;
    return `<button class="food decor-item${have ? ' have' : can ? '' : ' off'}" data-act="build" data-id="${d}">${A.decor(d)}<span>${esc(info.label)}</span>
      <b>${have ? 'Built!' : `${A.star()} ${info.stars}`}</b>${info.hint && !have ? `<em>${esc(info.hint)}</em>` : ''}</button>`;
  }).join('');
  openModal(`<div class="dialog"><h2>Build for your farm</h2><p class="small">You have ${A.star()} <b>${p.inventory.stars}</b> stars.</p><div class="foods">${items}</div></div>`);
}

function evolveCelebration(res) {
  const p = S.cur, pet = p.pet, form = FORMS[res.to];
  const isNew = p.collection.every(c => !(c.path || []).includes(res.to)) && pet.history.filter(h => h.form === res.to).length === 1;
  sfx('fanfare');
  openModal(`<div class="dialog celebrate">
    <div class="sparkles">${FX.sparkle}${FX.sparkle}${FX.sparkle}</div>
    ${petThumb(res.to)}
    <h2>${esc(pet.name)} grew into a ${esc(form.name)}!</h2>
    ${isNew ? '<p class="new-badge">New in your guide!</p>' : ''}
    <p>${esc(form.blurb)}</p>
    ${pet.stage === 'adult' ? `<p class="tip">All grown up! Finish the Meadow party list on the Pet screen.</p>` : ''}
    <button class="btn btn-go" data-act="close-modal">Yay!</button></div>`, { onClose: () => render() });
}

// ---------- parent area ----------
function parentGate() {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  openModal(`<div class="dialog"><h2>Grown-ups only</h2><p>What is ${a} × ${b}?</p>
    <form class="row" data-form="gate"><input id="gate-answer" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-want="${a * b}" enterkeyhint="go">
    <button class="btn btn-go" data-act="gate-ok">Enter</button></form></div>`);
}

function parentPanel() {
  const rows = S.profiles.map(p => `<li><span class="avatar">${A.avatar(p.avatar)}</span><b>${esc(p.name)}</b>
    <span class="small">${p.pet.stage === 'egg' ? 'egg' : esc(FORMS[p.pet.form].name) + ' (' + STAGE_LABELS[p.pet.stage] + ')'} · ${p.collection.length} raised</span>
    <button class="btn small danger" data-act="del-player" data-id="${p.id}">Delete</button></li>`).join('');
  const memOnly = store.s.memoryOnly ? '<p class="tip">This browser is not allowing saved data (private browsing?). Progress will be lost when the page closes.</p>' : '';
  const problems = store.problems.map(t => `<p class="tip">${esc(t)}</p>`).join('');
  openModal(`<div class="dialog parent">
    <h2>Grown-ups</h2>${memOnly}${problems}
    <h3>Players on this device</h3><ul class="plist">${rows || '<li>No players yet.</li>'}</ul>
    <h3>Back up &amp; restore</h3>
    <p class="small">Progress is saved automatically on this device only. Download a backup to keep it safe or move it to another device.</p>
    <div class="row wrap"><button class="btn" data-act="export-file">Download backup</button><button class="btn" data-act="export-copy">Copy backup text</button></div>
    <div class="row wrap"><label class="btn file-btn">Restore from file<input type="file" id="import-file" accept=".json,application/json"></label></div>
    <textarea id="import-text" rows="3" placeholder="…or paste backup text here"></textarea>
    <button class="btn" data-act="import-text">Restore pasted text</button>
    <p class="small">Restoring adds the players in the backup. A player that already exists here is replaced by the backup's copy.</p>
    <h3>Sound</h3><label class="field">Volume <input type="range" id="volume" min="0" max="1" step="0.05" value="${S.index.settings.volume}"></label>
    <p class="small muted">Sprout Pals · save format v${G.SCHEMA_VERSION}${Art.count() ? ` · ${Art.count()} art files loaded` : ' · placeholder art'}</p>
  </div>`);
  const vol = document.getElementById('volume');
  vol.addEventListener('input', () => { S.index.settings.volume = +vol.value; setVolume(+vol.value); persistIndex(); });
  vol.addEventListener('change', () => sfx('tap'));
  document.getElementById('import-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (f) doImport(await f.text());
  });
}

function doImport(text) {
  let data;
  try { data = parseImport(text, now()); }
  catch (e) { toast(e.message || 'Could not read that backup.'); return; }
  for (const p of data.profiles) {
    const i = S.profiles.findIndex(x => x.id === p.id);
    if (i >= 0) S.profiles[i] = p; else S.profiles.push(p);
    if (!S.index.profileIds.includes(p.id)) S.index.profileIds.push(p.id);
    store.lockedIds.delete(p.id);
    store.saveProfile(p);
  }
  persistIndex();
  closeModal(); render();
  toast(`Restored ${data.profiles.length} player${data.profiles.length === 1 ? '' : 's'}.`);
}

function backupText() {
  return JSON.stringify(exportData(S.index, S.profiles, now()), null, 1);
}

// ---------- actions ----------
function openProfile(id) {
  const p = S.profiles.find(x => x.id === id);
  if (!p) return;
  S.cur = p; S.tab = 'pet';
  const sum = advance(p, now());
  persist();
  render();
  if (sum.elapsedMs >= WELCOME_BACK_HOURS * HOUR) welcomeBack(sum);
  else if (p.pet.stage !== 'egg' && !p.pet.name) nameDialog();
}

function goHome() {
  stopBubblesQuietly();
  if (S.cur) { advance(S.cur, now()); persist(); }
  S.cur = null; render();
}

const ACT = {
  'mute'() {
    const m = !isMuted(); setMuted(m);
    S.index.settings.muted = m; persistIndex();
    document.querySelectorAll('[data-act="mute"]').forEach(b => { b.outerHTML = soundBtn(); });
    if (!m) sfx('tap');
  },
  'home': goHome,
  'open': el => { sfx('tap'); openProfile(el.dataset.id); },
  'new-player': () => { sfx('tap'); newPlayerDialog(S.profiles.length % 6); },
  'avatar-pick': el => { sfx('tap'); document.querySelectorAll('.avatar-pick').forEach(b => b.classList.toggle('on', b === el)); },
  'player-create'() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) { sfx('no'); document.getElementById('player-name').focus(); toast('Type a name first.'); return; }
    const pick = document.querySelector('.avatar-pick.on');
    const p = G.newProfile(name, pick ? +pick.dataset.i : 0, now());
    S.profiles.push(p); S.index.profileIds.push(p.id);
    store.saveProfile(p); persistIndex();
    closeModal(); sfx('fanfare'); openProfile(p.id);
  },
  'tab': el => {
    if (S.modal) closeModal();
    stopBubblesQuietly();
    S.tab = el.dataset.tab; sfx('tap'); render();
  },
  'hatch'() {
    const r = G.hatchTap(S.cur, now());
    persist();
    if (r.hatched) {
      render();
      sfx('fanfare');
      react(document.getElementById('stage'), 'love');
      setTimeout(nameDialog, 700);
    } else {
      sfx('crack');
      document.querySelector('#stage .pet-hit').innerHTML = petHtml(S.cur.pet, 'egg');
      react(document.getElementById('stage'), 'tap');
    }
  },
  'pet-tap'() {
    const pet = S.cur.pet;
    if (pet.asleep) { say('Zzz...'); return; }
    sfx('tap'); react(document.getElementById('stage'), 'love');
  },
  'name-pick': el => setName(el.dataset.name),
  'name-ok': () => setName(document.getElementById('pet-name').value),
  'feed-open': () => { sfx('tap'); feedDialog(); },
  'feed': el => {
    const r = G.feed(S.cur, el.dataset.food);
    if (!r.ok) {
      sfx('no');
      if (r.reason === 'none') toast('None yet. Grow some on the Farm!');
      else { closeModal(); say(r.reason === 'full' ? "I'm full!" : 'Shh... sleeping'); }
      return;
    }
    persist(); closeModal(); render(); sfx('eat');
    react(document.getElementById('stage'), 'eat');
    say('Yum!');
  },
  'play'() {
    const r = G.play(S.cur);
    if (!r.ok) { sfx('no'); say(r.reason === 'tired' ? "Too sleepy... let's nap!" : '...'); return; }
    persist(); render(); sfx('play'); react(document.getElementById('stage'), 'play');
  },
  'wash'() {
    const r = G.wash(S.cur);
    if (!r.ok) { sfx('no'); return; }
    persist(); render(); sfx('wash'); react(document.getElementById('stage'), 'wash');
    say('Squeaky clean!');
  },
  'sleep'() {
    const r = G.toggleSleep(S.cur);
    persist(); render(); sfx(r.asleep ? 'sleep' : 'wake');
  },
  'grow'() {
    const res = G.growUp(S.cur, now());
    if (!res) return;
    persist();   // the chosen form is saved immediately
    render();
    react(document.getElementById('stage'), 'love');
    evolveCelebration(res);
  },
  'meadow-send'() {
    const pet = S.cur.pet;
    const entry = G.sendToMeadow(S.cur, now());
    if (!entry) return;
    persist(); sfx('fanfare');
    openModal(`<div class="dialog celebrate">${petThumb(entry.form)}
      <h2>${esc(entry.name)} moved to the Meadow!</h2><p>You can visit any time. You got ${A.star()} ${ADULT_GOAL.rewardStars} stars.</p>
      <p class="tip">Look, a new egg!</p><button class="btn btn-go" data-act="close-modal">See the egg</button></div>`,
      { onClose: () => { S.tab = 'pet'; render(); } });
    void pet;
  },
  'plot': el => {
    const i = +el.dataset.i, plot = S.cur.farm.plots[i];
    if (!plot.crop) { sfx('tap'); seedDialog(i); return; }
    if (G.cropReady(plot)) {
      const r = G.harvest(S.cur, i);
      persist(); sfx('harvest');
      el.outerHTML = plotHtml(S.cur.farm.plots[i], i);
      toast(`+${r.amount} ${FOODS[r.food].label} for the food basket!`);
      const t = S.tab; render(); S.tab = t;
    } else { sfx('tap'); toast(`${CROPS[plot.crop].label} is growing. ${fmtDur(G.cropTimeLeft(plot))} to go!`); }
  },
  'plant': el => {
    const r = G.plant(S.cur, +el.dataset.i, el.dataset.crop);
    if (!r.ok) { sfx('no'); toast('No seeds of that kind. Pop bubbles for more!'); return; }
    persist(); sfx('plant'); closeModal(); render();
  },
  'build-open': () => { sfx('tap'); buildDialog(); },
  'build': el => {
    const id = el.dataset.id;
    if (S.cur.farm.decorations.includes(id)) return;
    const r = G.buildDecoration(S.cur, id);
    if (!r.ok) { sfx('no'); toast('Not enough stars yet. Pop star bubbles!'); return; }
    persist(); sfx('fanfare'); closeModal(); render();
    toast(`You built a ${DECORATIONS[id].label}!`);
  },
  'bubble-start': () => { sfx('tap'); startBubbles(); },
  'bubble-again': () => { closeModal(); startBubbles(); },
  'close-modal': closeModal,
  'parent-gate': () => { sfx('tap'); parentGate(); },
  'gate-ok'() {
    const inp = document.getElementById('gate-answer');
    if (inp.value.trim() === inp.dataset.want) { closeModal(); parentPanel(); }
    else { sfx('no'); inp.value = ''; toast('Not quite.'); }
  },
  'del-player': el => {
    const p = S.profiles.find(x => x.id === el.dataset.id);
    openModal(`<div class="dialog"><h2>Delete ${esc(p.name)}?</h2><p>This removes ${esc(p.name)}'s pet, farm and Meadow from this device. A downloaded backup can bring it back.</p>
      <div class="row"><button class="btn" data-act="parent-back">Keep it</button><button class="btn danger" data-act="del-confirm" data-id="${p.id}">Delete</button></div></div>`);
  },
  'del-confirm': el => {
    store.deleteProfile(S.index, el.dataset.id);
    S.profiles = S.profiles.filter(x => x.id !== el.dataset.id);
    render(); parentPanel();
  },
  'parent-back': () => parentPanel(),
  'export-file'() {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sprout-pals-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  async 'export-copy'() {
    try { await navigator.clipboard.writeText(backupText()); toast('Backup copied. Paste it somewhere safe.'); }
    catch { document.getElementById('import-text').value = backupText(); toast('Select the text in the box and copy it.'); }
  },
  'import-text'() {
    const t = document.getElementById('import-text').value.trim();
    if (!t) { toast('Paste a backup first.'); return; }
    doImport(t);
  },
};

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' && el.dataset.act !== 'feed') return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
}

// Enter key in the small forms
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const f = e.target.closest && e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  ({ name: ACT['name-ok'], player: ACT['player-create'], gate: ACT['gate-ok'] })[f.dataset.form]?.();
});

// ---------- utils ----------
function fmtDur(ms) {
  if (ms == null) return '';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return mm ? `${h}h ${mm}m` : `${h}h`;
  const d = Math.floor(h / 24), hh = h % 24;
  return hh ? `${d}d ${hh}h` : `${d}d`;
}

boot();
