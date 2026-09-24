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
  // Every question is scored out of 100, then multiplied (x1, x1, x2, x3, x3).
  // Full marks within 20 miles; the score falls fast at first and reaches zero at 10,000 miles.
  const CURVE_POWER = 5.7;
  function baseScore(miles) {
    if (miles <= PERFECT_MILES) return 100;
    const f = Math.max(0, 1 - (miles - PERFECT_MILES) / (ZERO_MILES - PERFECT_MILES));
    return Math.min(99, Math.round(100 * Math.pow(f, CURVE_POWER)));
  }
  function pointsFor(miles, max) { return baseScore(miles) * (max / 100); }
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

  // ---------- Globe (MapLibre, satellite imagery) ----------
  const Globe = (function () {
    const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";
    const MAX_ZOOM = 7.5; // about state/region level — no street-level zoom
    const START_CENTER = [-30, 20];
    let map = null, pin = null, answer = null, locked = false, onPin = () => {};
    let pinMarker = null, ansMarker = null;

    function pinEl(color) {
      const el = document.createElement("div");
      el.className = "pin";
      el.innerHTML = '<svg width="28" height="38" viewBox="0 0 28 38"><path d="M14 37C14 37 26 22.5 26 13.5A12 12 0 0 0 2 13.5C2 22.5 14 37 14 37Z" fill="' + color +
        '" stroke="#fff" stroke-width="2.5"/><circle cx="14" cy="13.5" r="4.5" fill="#fff"/></svg>';
      return el;
    }
    function fitZoom() {
      const el = map.getContainer();
      const d = Math.min(el.clientWidth, el.clientHeight) * 0.9;
      return d > 0 ? Math.log2(d * Math.PI / 512) : 1;
    }
    function arc(a, b) {
      const f = d3.geoInterpolate(a, b), pts = [];
      for (let i = 0; i <= 128; i++) pts.push(f(i / 128));
      for (let i = 1; i < pts.length; i++) { // keep longitudes continuous across the date line
        while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360;
        while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360;
      }
      return pts;
    }
    function setLine(coords) {
      const src = map.getSource("guessline");
      if (src) src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords || [] } });
    }

    return {
      async load() {
        const [w50, us] = await Promise.all(["data/countries-50m.json", "data/states-10m.json"].map((u) => fetch(u).then((r) => r.json())));
        const borders = topojson.mesh(w50, w50.objects.countries, (a, b) => a !== b);
        const states = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
        map = new maplibregl.Map({
          container: "map",
          style: {
            version: 8,
            projection: { type: "globe" },
            sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] },
            sources: {
              backup: { type: "raster", tiles: ["tiles/{z}/{x}/{y}.jpg"], tileSize: 256, maxzoom: 2 },
              nasa: { type: "raster", tiles: [GIBS], tileSize: 256, maxzoom: 8,
                attribution: 'Imagery: <a href="https://earthdata.nasa.gov/gibs" target="_blank">NASA Blue Marble</a>' },
              borders: { type: "geojson", data: borders },
              states: { type: "geojson", data: states },
              guessline: { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } } },
            },
            layers: [
              { id: "space", type: "background", paint: { "background-color": "#0b1a2b" } },
              { id: "backup", type: "raster", source: "backup" },
              { id: "nasa", type: "raster", source: "nasa", paint: { "raster-fade-duration": 150 } },
              { id: "states", type: "line", source: "states", paint: { "line-color": "rgba(255,255,255,0.35)", "line-width": 0.6 } },
              { id: "borders", type: "line", source: "borders", paint: { "line-color": "rgba(255,255,255,0.7)", "line-width": 0.9 } },
              { id: "guessline", type: "line", source: "guessline", layout: { "line-cap": "round" },
                paint: { "line-color": "#ffffff", "line-width": 2.2, "line-dasharray": [2, 1.5] } },
            ],
          },
          center: START_CENTER, zoom: 1, minZoom: 0, maxZoom: MAX_ZOOM,
          dragRotate: false, pitchWithRotate: false, touchPitch: false, keyboard: false,
          renderWorldCopies: false, attributionControl: { compact: true },
        });
        map.touchZoomRotate.disableRotation();
        map.on("click", (e) => {
          if (locked) return;
          pin = [e.lngLat.lng, e.lngLat.lat];
          if (!pinMarker) pinMarker = new maplibregl.Marker({ element: pinEl("#e4572e"), anchor: "bottom" });
          pinMarker.setLngLat(pin).addTo(map);
          onPin(pin);
        });
        await new Promise((res) => map.once("load", res));
        this.reset();
      },
      reset() {
        if (!map) return;
        pin = null; answer = null; locked = false;
        if (pinMarker) pinMarker.remove();
        if (ansMarker) ansMarker.remove();
        setLine(null);
        map.stop();
        map.jumpTo({ center: START_CENTER, zoom: fitZoom(), bearing: 0, pitch: 0 });
      },
      onPin(fn) { onPin = fn; },
      getPin() { return pin; },
      resize() { if (map) map.resize(); },
      invertAt(sx, sy) { const r = map.getContainer().getBoundingClientRect(); const p = map.unproject([sx - r.left, sy - r.top]); return [p.lng, p.lat]; },
      reveal(guess, ans) {
        pin = guess; answer = ans; locked = true;
        if (!ansMarker) ansMarker = new maplibregl.Marker({ element: pinEl("#2f9e5b"), anchor: "bottom" });
        ansMarker.setLngLat(ans).addTo(map);
        const line = arc(guess, ans);
        setLine(line);
        // Zoom so both pins fit on screen, centered between them.
        const el = map.getContainer(), room = Math.min(el.clientWidth, el.clientHeight) * 0.36;
        const half = d3.geoDistance(guess, ans) / 2;
        const mid = d3.geoInterpolate(guess, ans)(0.5);
        const radius = room / Math.max(Math.sin(half), 0.002);
        const z = Math.max(fitZoom(), Math.min(6, Math.log2(radius * 2 * Math.PI / 512)));
        map.flyTo({ center: mid, zoom: z, duration: 1200, essential: true });
      },
    };
  })();

  // ---------- App state ----------
  let QUESTIONS = [];
  let player = store.get("ggg:player");
  let session = null; // {date, dayIdx, practice, key, progress}

  function show(id) {
    ["pickScreen", "gameScreen", "doneScreen", "msgScreen"].forEach((s) => { $(s).hidden = s !== id; });
    if (id === "gameScreen") Globe.resize();
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
  window.__ggg = { pointsFor, baseScore, emojiFor, computeBoard, milesBetween, globe: Globe };
})();
