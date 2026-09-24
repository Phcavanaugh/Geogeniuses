/* Good Globe Game — front end. Plain JavaScript, no build step. */
(function () {
  "use strict";

  // ---------- Settings ----------
  const API = (window.GGG_API_URL || "").trim();
  const START = window.GGG_START_DATE || "2026-09-28";
  const TZ = "America/Chicago";
  const MAX_PTS = [100, 100, 200, 300, 300];
  const DAY_MAX = MAX_PTS.reduce((a, b) => a + b, 0);
  const PERFECT_MILES = 20;
  const ZERO_MILES = 10000;
  const PERFECT_EMOJI = "👨🏻‍🦰";

  // ---------- Small helpers ----------
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  function todayCentral() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function ymdToUTC(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); }
  function addDays(s, n) { return new Date(ymdToUTC(s) + n * 864e5).toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((ymdToUTC(b) - ymdToUTC(a)) / 864e5); }
  function prettyDate(s, withDow) {
    const opts = { timeZone: "UTC", month: "short", day: "numeric" };
    if (withDow) opts.weekday = "short";
    return new Date(ymdToUTC(s)).toLocaleDateString("en-US", opts);
  }
  const fmt = (n) => Number(n).toLocaleString("en-US");

  // ---------- Scoring ----------
  function milesBetween(a, b) { // [lon,lat]
    return d3.geoDistance(a, b) * 3958.8;
  }
  function pointsFor(miles, max) {
    if (miles <= PERFECT_MILES) return max;
    const f = Math.max(0, 1 - (miles - PERFECT_MILES) / (ZERO_MILES - PERFECT_MILES));
    return Math.min(max - 1, Math.round(max * f * f));
  }
  function emojiFor(pts, max) {
    if (pts >= max) return PERFECT_EMOJI;
    const pct = pts / max;
    if (pct > 0.9) return "🟢";
    if (pct >= 0.7) return "🟡";
    return "🔴";
  }

  // ---------- Leaderboard math (demo mode; the Sheet script does the same) ----------
  function computeBoard(rows, today) {
    const seen = new Set(), clean = [];
    rows.forEach((r) => { const k = r.player + "|" + r.date; if (!seen.has(k)) { seen.add(k); clean.push(r); } });
    const dow = new Date(ymdToUTC(today)).getUTCDay();
    const monday = addDays(today, -((dow + 6) % 7));
    const by = {};
    clean.forEach((r) => { (by[r.player] = by[r.player] || []).push(r); });
    const todayList = clean.filter((r) => r.date === today)
      .map((r) => ({ name: r.player, total: r.total, scores: r.scores })).sort((a, b) => b.total - a.total);
    const week = [], avg = [], streak = [];
    Object.keys(by).forEach((name) => {
      const list = by[name];
      const wk = list.filter((r) => r.date >= monday && r.date <= today);
      if (wk.length) week.push({ name, total: wk.reduce((s, r) => s + r.total, 0), games: wk.length });
      avg.push({ name, avg: Math.round(list.reduce((s, r) => s + r.total, 0) / list.length), games: list.length });
      const dates = new Set(list.map((r) => r.date));
      let d = dates.has(today) ? today : addDays(today, -1), n = 0;
      while (dates.has(d)) { n++; d = addDays(d, -1); }
      if (n) streak.push({ name, streak: n });
    });
    week.sort((a, b) => b.total - a.total);
    avg.sort((a, b) => b.avg - a.avg);
    streak.sort((a, b) => b.streak - a.streak);
    return { today: todayList, week, avg, streak, weekStart: monday };
  }

  // ---------- Backend: Google Sheet, or demo mode on this device ----------
  const api = API ? {
    async players() { const r = await fetch(API + "?action=players"); return (await r.json()).players; },
    async board() { const r = await fetch(API + "?action=board"); return r.json(); },
    async submit(payload) {
      const r = await fetch(API, { method: "POST", body: JSON.stringify(Object.assign({ action: "submit" }, payload)) });
      return r.json();
    },
  } : {
    async players() { return ["Pete", "Guest"]; },
    async board() { return computeBoard(store.get("ggg:demo:rows") || [], todayCentral()); },
    async submit(p) {
      const rows = store.get("ggg:demo:rows") || [];
      if (rows.some((r) => r.player === p.player && r.date === p.date)) return { ok: true, duplicate: true };
      rows.push({ date: p.date, player: p.player, total: p.total, scores: p.scores });
      store.set("ggg:demo:rows", rows);
      return { ok: true };
    },
  };

  // ---------- Globe ----------
  const Globe = (function () {
    const canvas = $("globe"), ctx = canvas.getContext("2d");
    const proj = d3.geoOrthographic().clipAngle(90).precision(0.5);
    const path = d3.geoPath(proj, ctx);
    const grat = d3.geoGraticule10();
    const DEFAULT_ROT = [30, -20, 0];
    let W = 0, H = 0, R = 0, k = 1, rot = DEFAULT_ROT.slice();
    let hi = null, lo = null, pin = null, answer = null, locked = false;
    let onPin = () => {}, idleTimer = null, interacting = false, anim = null;

    function resize() {
      const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) / 2 * 0.92;
      draw();
    }
    function visible(p) { return d3.geoDistance(p, [-rot[0], -rot[1]]) < Math.PI / 2 - 1e-6; }
    function marker(p, color) {
      if (!visible(p)) return;
      const [x, y] = proj(p);
      ctx.beginPath(); ctx.arc(x, y - 14, 8, 0, 2 * Math.PI);
      ctx.moveTo(x - 6.5, y - 9.5); ctx.lineTo(x, y); ctx.lineTo(x + 6.5, y - 9.5);
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 14, 3, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
    }
    function draw() {
      if (!W) return;
      const d = (interacting || !hi) ? lo : hi;
      proj.translate([W / 2, H / 2]).scale(R * k).rotate(rot);
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = "#cfe3f3"; ctx.fill();
      ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(15,42,68,.08)"; ctx.lineWidth = 0.7; ctx.stroke();
      if (d) {
        ctx.beginPath(); path(d.land); ctx.fillStyle = "#f3ecd9"; ctx.fill();
        ctx.beginPath(); path(d.borders); ctx.strokeStyle = "#7a7468"; ctx.lineWidth = 0.7; ctx.stroke();
        if (d.states) { ctx.beginPath(); path(d.states); ctx.strokeStyle = "rgba(122,116,104,.55)"; ctx.lineWidth = 0.5; ctx.stroke(); }
        ctx.beginPath(); path(d.coast); ctx.strokeStyle = "#8aa7bf"; ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.beginPath(); path({ type: "Sphere" }); ctx.strokeStyle = "rgba(15,42,68,.35)"; ctx.lineWidth = 1; ctx.stroke();
      if (pin && answer) {
        ctx.beginPath(); path({ type: "LineString", coordinates: [pin, answer] });
        ctx.setLineDash([5, 4]); ctx.strokeStyle = "#15212e"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
      }
      if (pin) marker(pin, "#e4572e");
      if (answer) marker(answer, "#2f9e5b");
    }
    function zoomAt(newK, sx, sy) {
      // Change zoom while keeping the spot under the finger/cursor in place.
      const r = canvas.getBoundingClientRect(), x = sx - r.left, y = sy - r.top;
      proj.scale(R * k).rotate(rot);
      const before = proj.invert([x, y]);
      k = newK;
      if (!before || !isFinite(before[0])) return;
      for (let n = 0; n < 3; n++) {
        proj.scale(R * k).rotate(rot);
        const after = proj.invert([x, y]);
        if (!after || !isFinite(after[0])) return;
        let dl = after[0] - before[0]; dl = ((dl + 540) % 360) - 180;
        rot = [rot[0] + dl, Math.max(-90, Math.min(90, rot[1] + (after[1] - before[1]))), 0];
      }
    }
    function settle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { interacting = false; draw(); }, 180);
    }

    // Pointer handling: one finger drags, two fingers pinch, a still tap drops the pin.
    const ptrs = new Map();
    let start = null, pinch = null;
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (anim) { anim.stop(); anim = null; }
      if (ptrs.size === 1) start = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, rot: rot.slice() };
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k };
        if (start) start.moved = true;
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()];
        zoomAt(Math.max(1, Math.min(60, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)), (a.x + b.x) / 2, (a.y + b.y) / 2);
        interacting = true; draw(); settle(); return;
      }
      if (ptrs.size === 1 && start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) > 7) start.moved = true;
        if (start.moved) {
          const deg = 180 / Math.PI / (R * k);
          rot = [start.rot[0] + dx * deg, Math.max(-90, Math.min(90, start.rot[1] - dy * deg)), 0];
          interacting = true; draw(); settle();
        }
      }
    });
    function up(e) {
      const wasSingle = ptrs.size === 1;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (wasSingle && start && !start.moved && Date.now() - start.t < 700 && !locked) {
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        if (Math.hypot(x - W / 2, y - H / 2) <= R * k) {
          const p = proj.invert([x, y]);
          if (p && isFinite(p[0])) { pin = p; draw(); onPin(p); }
        }
      }
      if (ptrs.size === 0) start = null;
      else if (ptrs.size === 1) { const [p] = [...ptrs.values()]; start = { x: p.x, y: p.y, t: 0, moved: true, rot: rot.slice() }; }
    }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoomAt(Math.max(1, Math.min(60, k * Math.exp(-e.deltaY * 0.0015))), e.clientX, e.clientY);
      interacting = true; draw(); settle();
    }, { passive: false });
    window.addEventListener("resize", resize);

    return {
      async load() {
        const [w110, w50, us] = await Promise.all(
          ["data/countries-110m.json", "data/countries-50m.json", "data/states-10m.json"].map((u) => fetch(u).then((r) => r.json())));
        const build = (w, withStates) => ({
          land: topojson.feature(w, w.objects.land),
          borders: topojson.mesh(w, w.objects.countries, (a, b) => a !== b),
          coast: topojson.mesh(w, w.objects.land),
          states: withStates ? topojson.mesh(us, us.objects.states, (a, b) => a !== b) : null,
        });
        lo = build(w110, false); hi = build(w50, true);
        resize();
      },
      invertAt(sx, sy) { const r = canvas.getBoundingClientRect(); proj.scale(R * k).rotate(rot); return proj.invert([sx - r.left, sy - r.top]); },
      reset() { rot = DEFAULT_ROT.slice(); k = 1; pin = null; answer = null; locked = false; draw(); },
      onPin(fn) { onPin = fn; },
      getPin() { return pin; },
      resize,
      reveal(guess, ans) {
        pin = guess; answer = ans; locked = true;
        const mid = d3.geoInterpolate(guess, ans)(0.5);
        const half = d3.geoDistance(guess, ans) / 2;
        const targetK = Math.max(1, Math.min(14, 0.8 / Math.max(Math.sin(half), 0.01)));
        const r0 = rot.slice(), k0 = k, r1 = [-mid[0], -mid[1], 0];
        let dl = r1[0] - r0[0]; dl = ((dl + 540) % 360) - 180;
        const ease = d3.easeCubicInOut;
        if (anim) anim.stop();
        anim = d3.timer((t) => {
          const u = Math.min(1, t / 1100), e = ease(u);
          rot = [r0[0] + dl * e, r0[1] + (r1[1] - r0[1]) * e, 0];
          k = k0 * Math.pow(targetK / k0, e);
          interacting = u < 1; draw();
          if (u >= 1) { anim.stop(); anim = null; }
        });
      },
    };
  })();

  // ---------- App state ----------
  let QUESTIONS = [];
  let player = store.get("ggg:player");
  let session = null; // {date, dayIdx, practice, key, progress}

  function show(id) {
    ["pickScreen", "gameScreen", "doneScreen", "msgScreen"].forEach((s) => { $(s).hidden = s !== id; });
    if (id === "gameScreen") requestAnimationFrame(Globe.resize);
  }
  function message(title, body) { $("msgTitle").textContent = title; $("msgBody").textContent = body; show("msgScreen"); }
  function setWho() {
    const b = $("whoBtn");
    b.hidden = !player; b.textContent = player ? player + " ▾" : "";
  }

  async function pickPlayer() {
    show("pickScreen");
    const grid = $("nameGrid");
    grid.innerHTML = '<p class="muted">Loading names…</p>';
    try {
      const names = await api.players();
      grid.innerHTML = "";
      names.forEach((n) => {
        const b = document.createElement("button");
        b.textContent = n;
        b.onclick = () => { player = n; store.set("ggg:player", n); setWho(); begin(todayCentral(), false); };
        grid.appendChild(b);
      });
    } catch (e) {
      grid.innerHTML = '<p class="muted">Couldn\'t load the player list. Check your connection and refresh.</p>';
    }
  }

  async function begin(date, practice) {
    const dayIdx = daysBetween(START, date);
    $("dateLabel").textContent = prettyDate(date, true);
    document.querySelectorAll(".practice").forEach((n) => n.remove());
    if (dayIdx < 0) return message("Not yet!", "The first puzzle goes live on " + prettyDate(START, true) + ".");
    if (dayIdx >= QUESTIONS.length) return message("Out of questions", "The question bank has run out. New days are coming soon.");
    const key = "ggg:v1:" + player + ":" + date + (practice ? ":practice" : "");
    const progress = store.get(key) || { guesses: [], submitted: false };
    session = { date, dayIdx, practice, key, progress, qs: QUESTIONS[dayIdx] };
    if (practice) {
      const tag = document.createElement("div");
      tag.className = "practice"; tag.textContent = "Practice — " + prettyDate(date, true) + " (not scored)";
      $("app").insertBefore(tag, $("app").children[1]);
    }
    if (!practice && progress.guesses.length < 5) {
      // Already played today on another device? Then show the result instead of a replay.
      try {
        const b = await api.board();
        const mine = (b.today || []).find((r) => r.name === player);
        if (mine) { session.remote = mine; return finish(true); }
      } catch (e) {}
    }
    if (progress.guesses.length >= 5) return finish(true);
    showQuestion();
  }

  function showQuestion() {
    const i = session.progress.guesses.length, q = session.qs[i];
    $("qNum").textContent = "Question " + (i + 1) + " of 5 · " + (i < 2 ? "U.S." : "World");
    $("qPts").textContent = MAX_PTS[i] + " pts";
    $("qClue").textContent = q.clue;
    $("confirmBtn").hidden = false; $("confirmBtn").disabled = true;
    $("result").hidden = true;
    $("hint").hidden = false;
    show("gameScreen");
    Globe.reset();
  }
  Globe.onPin(() => { $("confirmBtn").disabled = false; $("hint").hidden = true; });

  $("confirmBtn").onclick = () => {
    const p = Globe.getPin(); if (!p) return;
    const i = session.progress.guesses.length, q = session.qs[i];
    const ans = [q.lon, q.lat];
    const miles = milesBetween(p, ans), pts = pointsFor(miles, MAX_PTS[i]);
    session.progress.guesses.push({ lon: +p[0].toFixed(4), lat: +p[1].toFixed(4), miles: Math.round(miles), pts });
    store.set(session.key, session.progress);
    Globe.reveal(p, ans);
    $("confirmBtn").hidden = true;
    $("rEmoji").textContent = emojiFor(pts, MAX_PTS[i]);
    $("rAnswer").textContent = q.answer;
    $("rDist").textContent = miles <= PERFECT_MILES ? "Nailed it — " + Math.round(miles) + " mi" : fmt(Math.round(miles)) + " miles away";
    $("rPts").textContent = "+" + pts;
    $("rFact").textContent = q.fact;
    $("nextBtn").textContent = i === 4 ? "See results" : "Next";
    $("result").hidden = false;
  };
  $("nextBtn").onclick = () => {
    if (session.progress.guesses.length >= 5) finish(false); else showQuestion();
  };

  async function finish(already) {
    const g = session.progress.guesses;
    let scores, total;
    if (g.length >= 5) { scores = g.map((x) => x.pts); total = scores.reduce((a, b) => a + b, 0); }
    else if (session.remote) { scores = session.remote.scores || []; total = session.remote.total; }
    const emojis = scores.map((s, i) => emojiFor(s, MAX_PTS[i])).join("");
    $("sTitle").textContent = "Day " + (session.dayIdx + 1) + " · " + prettyDate(session.date, false) + (session.practice ? " · practice" : "");
    $("sEmoji").textContent = emojis;
    $("sTotal").textContent = fmt(total) + " / " + fmt(DAY_MAX);
    $("sNote").textContent = "";
    const list = $("sList"); list.innerHTML = "";
    session.qs.forEach((q, i) => {
      const li = document.createElement("li");
      const x = g[i];
      li.innerHTML = '<span class="e"></span><span class="a"></span><span class="p"></span>';
      li.querySelector(".e").textContent = scores[i] != null ? emojiFor(scores[i], MAX_PTS[i]) : "";
      li.querySelector(".a").textContent = q.answer + (x ? " — " + fmt(x.miles) + " mi" : "");
      li.querySelector(".p").textContent = (scores[i] != null ? scores[i] : "–") + "/" + MAX_PTS[i];
      list.appendChild(li);
    });
    session.share = "Good Globe Game · " + prettyDate(session.date, false) + (session.practice ? " (practice)" : "") +
      "\n" + emojis + " · " + fmt(total) + "/" + fmt(DAY_MAX) + "\n" + location.origin + location.pathname;
    $("copied").hidden = true;
    fillPast();
    show("doneScreen");

    if (!session.practice && g.length >= 5 && !session.progress.submitted) {
      $("sNote").textContent = "Saving your score…";
      try {
        const res = await api.submit({ player, date: session.date, scores, total, miles: g.map((x) => x.miles) });
        if (res && res.ok) {
          session.progress.submitted = true; store.set(session.key, session.progress);
          $("sNote").textContent = res.duplicate ? "You'd already played today — your first score stands." : "Score saved.";
        } else {
          $("sNote").textContent = (res && res.error) || "Couldn't save your score. Refresh to try again.";
        }
      } catch (e) {
        $("sNote").textContent = "Couldn't reach the scoreboard. Refresh to try again.";
      }
    }
    loadBoard();
  }

  // ---------- Leaderboard ----------
  let board = null, tab = "today";
  async function loadBoard() {
    $("boardList").innerHTML = '<li class="muted">Loading…</li>';
    $("boardNote").textContent = "";
    try { board = await api.board(); renderBoard(); }
    catch (e) { $("boardList").innerHTML = '<li class="muted">Couldn\'t load the leaderboard.</li>'; }
  }
  function renderBoard() {
    if (!board) return;
    const ul = $("boardList"); ul.innerHTML = "";
    let rows = [], note = "";
    if (tab === "today") { rows = board.today.map((r) => [r.name, fmt(r.total), (r.scores || []).map((s, i) => emojiFor(s, MAX_PTS[i])).join("")]); note = "Today's scores"; }
    if (tab === "week") { rows = board.week.map((r) => [r.name, fmt(r.total), r.games + (r.games === 1 ? " day" : " days")]); note = "Total points since Monday, " + prettyDate(board.weekStart, false); }
    if (tab === "avg") { rows = board.avg.map((r) => [r.name, fmt(r.avg), r.games + (r.games === 1 ? " game" : " games")]); note = "Average daily score, all time"; }
    if (tab === "streak") { rows = board.streak.map((r) => [r.name, r.streak + (r.streak === 1 ? " day" : " days"), ""]); note = "Days played in a row"; }
    if (!rows.length) ul.innerHTML = '<li class="muted">No scores yet.</li>';
    rows.forEach((r, i) => {
      const li = document.createElement("li");
      li.innerHTML = '<span class="rank"></span><span class="n"></span><span class="v"></span>';
      li.querySelector(".rank").textContent = i + 1;
      li.querySelector(".n").textContent = r[0];
      if (r[2]) { const s = document.createElement("span"); s.className = "sub"; s.textContent = r[2]; li.querySelector(".n").appendChild(s); }
      li.querySelector(".v").textContent = r[1];
      if (r[0] === player) li.style.background = "#fff7f2";
      ul.appendChild(li);
    });
    $("boardNote").textContent = note;
  }
  document.querySelectorAll(".tab").forEach((b) => {
    b.onclick = () => {
      tab = b.dataset.tab;
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b));
      renderBoard();
    };
  });

  // ---------- Share ----------
  $("shareBtn").onclick = async () => {
    const text = session.share;
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); } catch (e2) {} ta.remove();
    }
    $("copied").hidden = false;
  };

  // ---------- Past days (practice) ----------
  function fillPast() {
    const sel = $("pastSel"); sel.innerHTML = "";
    const today = todayCentral();
    const last = Math.min(daysBetween(START, today) - 1, QUESTIONS.length - 1);
    for (let i = last; i >= 0; i--) {
      const d = addDays(START, i);
      const o = document.createElement("option");
      o.value = d; o.textContent = "Day " + (i + 1) + " · " + prettyDate(d, true);
      sel.appendChild(o);
    }
    $("pastBtn").disabled = last < 0;
    if (last < 0) { const o = document.createElement("option"); o.textContent = "No past days yet"; sel.appendChild(o); }
  }
  $("pastBtn").onclick = () => { const d = $("pastSel").value; if (d) { store.del("ggg:v1:" + player + ":" + d + ":practice"); begin(d, true); } };

  $("whoBtn").onclick = () => {
    if (confirm("Switch player? You'll pick your name again.")) { store.del("ggg:player"); player = null; setWho(); pickPlayer(); }
  };

  // ---------- Start ----------
  (async function init() {
    $("demo").hidden = !!API;
    $("dateLabel").textContent = prettyDate(todayCentral(), true);
    setWho();
    try {
      const [qs] = await Promise.all([fetch("questions.json").then((r) => r.json()), Globe.load()]);
      QUESTIONS = qs;
    } catch (e) { return message("Something went wrong", "The game files didn't load. Try refreshing."); }
    if (!player) pickPlayer(); else begin(todayCentral(), false);
  })();

  // Exposed for testing only.
  window.__ggg = { pointsFor, emojiFor, computeBoard, milesBetween, globe: Globe };
})();
