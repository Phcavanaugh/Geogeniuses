// ¡Hola, Palabras! — play on any device. Each kid picks their name, and their progress is saved
// to the Palabras Google Sheet (see apps-script/Code.gs). Off when config.js has no PALABRAS_API.
// Loads before the game. It notes when each saved setting changes, sends changes in the background,
// and on start pulls in anything newer from the Sheet (then reloads once).
// For each key the newest copy wins, so two devices never wipe each other out.
(function(){
  const API = (window.PALABRAS_API || '').trim();
  let TEST = false; try{ TEST = new URLSearchParams(location.search).has('test'); }catch(e){}
  window.SYNC = { on:false };
  if (!API || TEST) return;

  const ls = window.localStorage;
  const RX = /^hp(_|7_|10_)/;                       // the game's own saved keys (not test mode's hpT…, not ours hpx_…)
  const rawSet = Storage.prototype.setItem, rawRem = Storage.prototype.removeItem;
  const jget = (k, d) => { try{ const v = ls.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } };
  const jset = (k, v) => { try{ rawSet.call(ls, k, JSON.stringify(v)); }catch(e){} };
  const gameKeys = () => Object.keys(ls).filter(k => RX.test(k));
  let T = jget('hpx_t', {});                         // key -> when it last changed here
  let SENT = jget('hpx_sent', {});                   // key -> the change the Sheet already has
  let player = ls.getItem('hpx_player') || '';
  let quiet = false, timer = 0;

  // ---- notice every change the game makes ----
  function stamp(k){
    if (quiet || !RX.test(k)) return;
    T[k] = Math.max(Date.now(), (T[k] || 0) + 1); jset('hpx_t', T);
    if (player){ clearTimeout(timer); timer = setTimeout(() => push(false), 3000); }
  }
  // only real changes count: the game re-saves some values unchanged every time it starts
  Storage.prototype.setItem = function(k, v){
    const before = this === ls ? this.getItem(k) : null;
    rawSet.call(this, k, v);
    if (this === ls && before !== String(v)) stamp(String(k));
  };
  Storage.prototype.removeItem = function(k){
    const had = this === ls && this.getItem(k) !== null;
    rawRem.call(this, k);
    if (had) stamp(String(k));
  };

  // ---- talking to the Sheet ----
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
  async function get(params, ms){ const r = await withTimeout(fetch(API + '?' + new URLSearchParams(params)), ms || 9000); return r.json(); }
  async function post(body, ms, keepalive){ const r = await withTimeout(fetch(API, { method:'POST', body: JSON.stringify(body), keepalive: !!keepalive }), ms || 15000); return r.json(); }

  function snapshot(){                                // everything this device has, with change times
    const v = {}, t = {};
    gameKeys().forEach(k => { v[k] = ls.getItem(k); t[k] = T[k] || 1; });
    Object.keys(T).forEach(k => { if (!(k in v)){ v[k] = null; t[k] = T[k]; } });   // deleted keys travel too
    return { v, t };
  }
  function merge(a, b){                               // newest copy of each key wins
    const out = { v:{}, t:{} };
    new Set([...Object.keys(a.t), ...Object.keys(b.t)]).forEach(k => {
      const ta = +a.t[k] || 0, tb = +b.t[k] || 0, src = (tb >= ta && k in b.t) ? b : a;
      out.t[k] = Math.max(ta, tb); out.v[k] = k in src.v ? src.v[k] : null;
    });
    return out;
  }
  function writeAll(save){                            // replace this device's game data with a save
    quiet = true;
    try{
      gameKeys().forEach(k => rawRem.call(ls, k));
      Object.keys(save.v).forEach(k => { if (RX.test(k) && save.v[k] !== null) rawSet.call(ls, k, save.v[k]); });
    }catch(e){}
    quiet = false;
    T = Object.assign({}, save.t); jset('hpx_t', T);
  }

  let pushing = null;
  async function push(keepalive){                     // send only what the Sheet doesn't have yet
    if (!player) return true;
    if (pushing) { await pushing.catch(() => {}); }
    const keys = Object.keys(T).filter(k => (T[k] || 0) > (SENT[k] || 0));
    if (!keys.length) return true;
    const v = {}, t = {};
    keys.forEach(k => { v[k] = ls.getItem(k); t[k] = T[k]; });
    const body = { action:'save', player, save:{ v, t } };
    const small = JSON.stringify(body).length < 60000;   // the browser only finishes small sends after the page closes
    pushing = post(body, 15000, keepalive && small).then(r => {
      if (r && r.ok){ keys.forEach(k => { SENT[k] = Math.max(SENT[k] || 0, t[k]); }); jset('hpx_sent', SENT); return true; }
      return false;
    }).catch(() => false);
    const ok = await pushing; pushing = null; return ok;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(true); });
  window.addEventListener('pagehide', () => push(true));
  setInterval(() => push(false), 60000);              // catches anything a dropped connection missed

  // ---- on start: pull in anything newer from the Sheet ----
  async function startup(){
    let cover = setTimeout(() => showCover('Cargando…'), 500);
    try{
      const r = await get({ action:'load', player }, 7000);
      clearTimeout(cover); hideCover();
      if (!r || !r.ok) return;
      const server = r.save || { v:{}, t:{} };
      const local = snapshot();
      const fresh = Object.keys(server.t).filter(k => RX.test(k) && (+server.t[k] || 0) > (local.t[k] || 0));
      // whatever the Sheet has at least as new as this device doesn't need sending
      Object.keys(server.t).forEach(k => { const st = +server.t[k] || 0; if (st >= (local.t[k] || 0)) SENT[k] = Math.max(SENT[k] || 0, st); });
      jset('hpx_sent', SENT);
      if (fresh.length){
        writeAll(merge(local, server));
        if (!sessionStorage.getItem('hpx_rl')){ sessionStorage.setItem('hpx_rl', '1'); location.reload(); return; }
      }
      sessionStorage.removeItem('hpx_rl');
      push(false);
    }catch(e){ clearTimeout(cover); hideCover(); }   // no internet: keep playing here, send it all later
  }

  // ---- screens: "¿Quién juega?" and a loading cover ----
  const wrap = document.createElement('div'); wrap.className = 'whobox'; wrap.hidden = true;
  wrap.innerHTML = '<div class="whocard"><h2 class="whot"></h2><div class="whosub"></div><div class="whonames"></div>'
    + '<div class="whoadd"><input maxlength="20" placeholder="Name" autocomplete="off"><button class="whoaddbtn">＋ Añadir</button></div>'
    + '<div class="whomsg"></div><button class="wholater" hidden></button></div>';
  document.body.appendChild(wrap);
  const q = s => wrap.querySelector(s);
  function showCover(msg){ wrap.hidden = false; wrap.classList.add('cover'); q('.whot').textContent = msg; q('.whosub').textContent = ''; q('.whonames').innerHTML = ''; q('.whoadd').hidden = true; q('.wholater').hidden = true; q('.whomsg').textContent = ''; }
  function hideCover(){ if (wrap.classList.contains('cover')){ wrap.hidden = true; wrap.classList.remove('cover'); } }
  function nameButtons(names, onPick, extra){
    const box = q('.whonames'); box.innerHTML = '';
    names.forEach(n => { const b = document.createElement('button'); b.className = 'whoname' + (n === player ? ' on' : ''); b.textContent = n; b.onclick = () => onPick(n); box.appendChild(b); });
    if (extra){ const b = document.createElement('button'); b.className = 'whoname alt'; b.textContent = extra.label; b.onclick = extra.onPick; box.appendChild(b); }
  }

  async function showPicker(canClose){
    wrap.hidden = false; wrap.classList.remove('cover');
    q('.whot').textContent = '¿Quién juega?'; q('.whosub').textContent = 'Who’s playing?';
    q('.whonames').innerHTML = '<div class="whomsg">Cargando nombres…</div>'; q('.whomsg').textContent = '';
    q('.whoadd').hidden = true;
    const later = q('.wholater');
    later.hidden = false;
    later.textContent = canClose ? 'Cancelar' : 'Jugar sin guardar';
    later.onclick = () => { wrap.hidden = true; };
    let names = [];
    try{ const r = await get({ action:'players' }); names = (r && r.players) || []; }
    catch(e){ q('.whonames').innerHTML = ''; q('.whomsg').textContent = 'No internet right now. You can play here and pick your name later.'; return; }
    nameButtons(names, pick);
    q('.whoadd').hidden = false;
    if (!names.length) q('.whomsg').textContent = 'Add each kid’s name to get started.';
  }
  q('.whoaddbtn').onclick = async () => {
    const inp = q('.whoadd input'), name = inp.value.replace(/\s+/g, ' ').trim();
    if (!name) { inp.focus(); return; }
    q('.whomsg').textContent = 'Adding…';
    try{
      const r = await post({ action:'addPlayer', name });
      if (r.ok || r.taken){ inp.value = ''; q('.whomsg').textContent = ''; showPicker(!!player); }
      else q('.whomsg').textContent = r.error || 'That didn’t work. Try again.';
    }catch(e){ q('.whomsg').textContent = 'No internet right now. Try again in a bit.'; }
  };

  // The first time on a device that already has progress: ask whose it is, so nobody loses stars.
  const AGES = [['hp_', '🧸 4–5 años'], ['hp7_', '🚀 7 años'], ['hp10_', '🎯 10 años']];
  const SHARED = /^hp_(showEn|sayArt|rate|voiceURI|recVoice|gameLen|nameBig|nameLittle|nChoices6|readAloud|pedorro|age)$/;
  function legacyAges(){
    if (ls.getItem('hpx_done') !== null) return [];     // a name has been picked on this device before
    return AGES.filter(([p]) => ls.getItem(p + 'journey') !== null || (+jget(p + 'stars', 0) > 0));
  }
  function ask(title, sub, names, none){
    return new Promise(res => {
      q('.whot').textContent = title; q('.whosub').textContent = sub; q('.whoadd').hidden = true; q('.wholater').hidden = true; q('.whomsg').textContent = '';
      nameButtons(names, res, { label: none, onPick: () => res('') });
    });
  }
  async function migrate(names){
    const ages = legacyAges(); if (!ages.length) return true;
    if (ls.getItem('hpx_legacy') === null){ const all = {}; gameKeys().forEach(k => all[k] = ls.getItem(k)); jset('hpx_legacy', all); }   // a backup that's never deleted
    const owners = {};
    for (const [p, label] of ages){
      const who = await ask('Este aparato ya tiene progreso', `Whose is the ${label} progress (⭐ ${+jget(p + 'stars', 0)}) on this device?`, names, 'Nadie / nobody');
      if (who) (owners[who] = owners[who] || []).push(p);
    }
    showCover('Guardando…');
    for (const [who, prefixes] of Object.entries(owners)){
      const v = {}, t = {};
      gameKeys().forEach(k => {
        const mine = SHARED.test(k) || prefixes.some(p => k.startsWith(p) && (p !== 'hp_' || !SHARED.test(k)));
        if (mine){ v[k] = ls.getItem(k); t[k] = 1; }       // oldest possible time: anything already in the Sheet wins
      });
      try{ const r = await post({ action:'save', player: who, save:{ v, t } }); if (!r.ok) throw 0; }
      catch(e){ q('.whot').textContent = 'No internet right now'; q('.whomsg').textContent = 'Nothing was lost. Try again when you’re online.'; q('.wholater').hidden = false; q('.wholater').textContent = 'OK'; q('.wholater').onclick = () => { wrap.hidden = true; }; return false; }
    }
    return true;
  }

  async function pick(name){
    if (name === player){ wrap.hidden = true; return; }
    let names = []; try{ names = [...wrap.querySelectorAll('.whoname:not(.alt)')].map(b => b.textContent); }catch(e){}
    if (!(await migrate(names))) return;
    showCover('Cargando…');
    if (player){                                        // leaving another kid: send their last changes, keep a copy here
      await push(false);
      try{ rawSet.call(ls, 'hpx_c_' + player, JSON.stringify(snapshot())); }catch(e){}
    }
    let server;
    try{ const r = await get({ action:'load', player: name }); if (!r.ok) throw 0; server = r.save || { v:{}, t:{} }; }
    catch(e){ showPicker(!!player); setTimeout(() => { q('.whomsg').textContent = 'No internet right now. Try again in a bit.'; }, 50); return; }
    const cached = jget('hpx_c_' + name, null) || { v:{}, t:{} };
    const merged = merge(server, cached);
    SENT = {}; Object.keys(server.t).forEach(k => SENT[k] = +server.t[k] || 0);
    writeAll(merged);
    player = name; rawSet.call(ls, 'hpx_player', name); rawSet.call(ls, 'hpx_done', '1'); jset('hpx_sent', SENT);
    await push(false);                                  // anything this device had that the Sheet didn't
    sessionStorage.setItem('hpx_rl', '1');
    location.reload();
  }

  // the "👤 Name · Cambiar" button above the age switch
  function chip(){
    const map = document.getElementById('map'), ages = map && map.querySelector('.agesw');
    if (!ages) return;
    const b = document.createElement('button'); b.className = 'whochip';
    b.innerHTML = player ? `👤 <b></b> <span>· Cambiar</span>` : `👤 <span>¿Quién juega?</span>`;
    if (player) b.querySelector('b').textContent = player;
    b.onclick = () => showPicker(!!player);
    map.insertBefore(b, ages);
  }

  window.SYNC = { on:true, push, showPicker, get player(){ return player; } };
  const go = () => { chip(); if (player) startup(); else showPicker(false); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
