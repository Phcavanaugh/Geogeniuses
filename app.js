/* GeoGeniuses — front end. Plain JavaScript, no build step. */
(function () {
  "use strict";

  // ---------- Settings ----------
  const API = (window.GGG_API_URL || "").trim();
  const START = window.GGG_START_DATE || "2026-09-28";
  const TZ = "America/Chicago";
  const MAX_PTS = [100, 100, 200, 300, 300];
  const DAY_MAX = MAX_PTS.reduce((a, b) => a + b, 0);
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
  // Every question is scored out of 100 (GeoHistory's curve), then multiplied (x1, x1, x2, x3, x3).
  // 100 at the spot, 71 at 1,000 miles, 50 at 3,000 miles, 41 at 5,000 miles.
  function baseScore(miles) { return Math.round(100 / Math.sqrt(1 + miles / 1000)); }
  function pointsFor(miles, max) { return baseScore(miles) * (max / 100); }
  function tierFor(pts, max) {
    const base = Math.round(pts * 100 / max);
    return base >= 100 ? "perfect" : base >= 90 ? "green" : base >= 50 ? "yellow" : base >= 1 ? "red" : "black";
  }
  function emojiFor(pts, max) {
    const base = Math.round(pts * 100 / max);
    if (base >= 100) return PERFECT_EMOJI;
    if (base >= 90) return "🟢";
    if (base >= 50) return "🟡";
    if (base >= 1) return "🔴";
    return "⚫";
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
    async addPlayer(name) {
      const r = await fetch(API, { method: "POST", body: JSON.stringify({ action: "addPlayer", name }) });
      return r.json();
    },
  } : {
    async players() { return ["Pete", "Guest"].concat(store.get("ggg:demo:players") || []); },
    async addPlayer(name) {
      const list = store.get("ggg:demo:players") || [];
      if (["Pete", "Guest"].concat(list).some((k) => k.toLowerCase() === name.toLowerCase())) return { ok: false, taken: true };
      list.push(name); store.set("ggg:demo:players", list); return { ok: true, name };
    },
    async board() { return computeBoard(store.get("ggg:demo:rows") || [], todayCentral()); },
    async submit(p) {
      const rows = store.get("ggg:demo:rows") || [];
      if (rows.some((r) => r.player === p.player && r.date === p.date)) return { ok: true, duplicate: true };
      rows.push({ date: p.date, player: p.player, total: p.total, scores: p.scores });
      store.set("ggg:demo:rows", rows);
      return { ok: true };
    },
  };

  // ---------- Globe (MapLibre, static NASA Blue Marble imagery bundled with the game) ----------
  const Globe = (function () {
    const MAX_ZOOM = 8.6;                 // closest view is roughly 40 x 40 miles on a phone
    // Live Esri World Imagery (the same source GeoHistory uses). The bundled NASA images sit
    // underneath, so if Esri is ever unreachable the globe still shows, just less sharp.
    const ESRI_KEY = (window.GGG_ESRI_KEY || "").trim();
    const ESRI_TILES = ESRI_KEY
      ? "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=" + encodeURIComponent(ESRI_KEY)
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    const US_CENTER = [-98.5, 39.5];
    let map = null, pin = null, answer = null, locked = false, onPin = () => {};
    let pinMarker = null, ansMarker = null, anim = null, placed = false;

    // --- Serve map tiles by cutting them out of five static images (no live map service) ---
    const imgCache = {};
    function loadImage(url) {
      if (!imgCache[url]) {
        imgCache[url] = new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im); im.onerror = () => rej(new Error("image " + url));
          im.src = url;
        });
      }
      return imgCache[url];
    }
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = tileCanvas.height = 256;
    const tctx = tileCanvas.getContext("2d");
    function tileBlob() { return new Promise((res) => tileCanvas.toBlob(res, "image/jpeg", 0.9)); }
    // Fallback imagery: a 1,024-px overview and four 2,048-px quadrants of NASA Blue Marble.
    maplibregl.addProtocol("bm", async (params) => {
      const [z, x, y] = params.url.replace("bm://", "").split("/").map(Number);
      let im, sx, sy, size;
      if (z <= 2) {
        im = await loadImage("imagery/world-1024.jpg");
        size = 1024 / Math.pow(2, z); sx = x * size; sy = y * size;
      } else {
        const shift = z - 1, qx = x >> shift, qy = y >> shift;
        im = await loadImage("imagery/q" + qx + qy + ".jpg");
        size = 2048 / Math.pow(2, shift);
        sx = (x - (qx << shift)) * size; sy = (y - (qy << shift)) * size;
      }
      tctx.drawImage(im, sx, sy, size, size, 0, 0, 256, 256);
      const blob = await tileBlob();
      return { data: await blob.arrayBuffer() };
    });

    function pinEl(color, drop) {
      const el = document.createElement("div");
      el.className = "pin";
      el.innerHTML = '<svg class="' + (drop ? "drop" : "") + '" width="28" height="38" viewBox="0 0 28 38"><path d="M14 37C14 37 26 22.5 26 13.5A12 12 0 0 0 2 13.5C2 22.5 14 37 14 37Z" fill="' + color +
        '" stroke="#fff" stroke-width="2.5"/><circle cx="14" cy="13.5" r="4.5" fill="#fff"/></svg>';
      return el;
    }
    function fitZoom() {
      const el = map.getContainer();
      const d = Math.min(el.clientWidth, el.clientHeight) * 0.9;
      return d > 0 ? Math.log2(d * Math.PI / 512) : 1;
    }
    // Zoom at which an arc of `halfAngle` radians either side of center fits on screen.
    function zoomToFit(halfAngle, padBottom) {
      const el = map.getContainer(), room = Math.min(el.clientWidth, el.clientHeight - (padBottom || 0)) * 0.36;
      const radius = room / Math.max(Math.sin(Math.min(halfAngle, Math.PI / 2)), 0.002);
      return Math.max(fitZoom(), Math.min(7, Math.log2(radius * 2 * Math.PI / 512)));
    }
    function unwrap(pts) {
      for (let i = 1; i < pts.length; i++) {
        while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360;
        while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360;
      }
      return pts;
    }
    // Overlay canvas for the line while it's being drawn, redrawn on every map frame so it stays in step.
    let overlay = null, octx = null, drawing = null;
    function sizeOverlay() {
      if (!overlay) return;
      const el = map.getContainer(), dpr = window.devicePixelRatio || 1;
      overlay.width = el.clientWidth * dpr; overlay.height = el.clientHeight * dpr;
      overlay.style.width = el.clientWidth + "px"; overlay.style.height = el.clientHeight + "px";
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function drawOverlay() {
      if (!octx) return;
      octx.clearRect(0, 0, overlay.width, overlay.height);
      if (!drawing || drawing.length < 2) return;
      const c = map.getCenter(), center = [c.lng, c.lat];
      octx.save();
      octx.strokeStyle = "#fff"; octx.lineWidth = 2.4; octx.lineCap = "round"; octx.setLineDash([4, 5]);
      octx.shadowColor = "rgba(0,0,0,.5)"; octx.shadowBlur = 2;
      octx.beginPath();
      let pen = false;
      drawing.forEach((pt) => {
        if (d3.geoDistance(pt, center) > Math.PI / 2 - 0.02) { pen = false; return; } // far side of the globe
        const q = map.project(pt);
        if (pen) octx.lineTo(q.x, q.y); else { octx.moveTo(q.x, q.y); pen = true; }
      });
      octx.stroke();
      octx.restore();
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
              earth: { type: "raster", tiles: ["bm://{z}/{x}/{y}"], tileSize: 256, maxzoom: 4 },
              esri: { type: "raster", tiles: [ESRI_TILES], tileSize: 256, maxzoom: 19,
                attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community" },
              borders: { type: "geojson", data: borders },
              states: { type: "geojson", data: states },
              guessline: { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } } },
            },
            layers: [
              { id: "space", type: "background", paint: { "background-color": "#0b1a2b" } },
              { id: "earth", type: "raster", source: "earth", paint: { "raster-fade-duration": 0 } },
              { id: "esri", type: "raster", source: "esri", paint: { "raster-fade-duration": 200 } },
              { id: "states", type: "line", source: "states", paint: { "line-color": "rgba(255,255,255,0.35)", "line-width": 0.6 } },
              { id: "borders", type: "line", source: "borders", paint: { "line-color": "rgba(255,255,255,0.7)", "line-width": 0.9 } },
              { id: "guessline", type: "line", source: "guessline", layout: { "line-cap": "round" },
                paint: { "line-color": "#ffffff", "line-width": 2.4, "line-dasharray": [1.5, 1.5] } },
            ],
          },
          center: US_CENTER, zoom: 1, minZoom: 0, maxZoom: MAX_ZOOM,
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
        // Don't wait for imagery: the map is still hidden behind the name screen, so no tiles load yet.
        await new Promise((res) => {
          if (map.isStyleLoaded()) return res();
          map.once("style.load", res); map.once("load", res); setTimeout(res, 4000);
        });
        // Keep the imagery credit collapsed behind the (i) button until someone taps it.
        const collapseAttrib = () => document.querySelectorAll(".maplibregl-ctrl-attrib.maplibregl-compact-show")
          .forEach((el) => el.classList.remove("maplibregl-compact-show"));
        collapseAttrib(); map.once("idle", collapseAttrib); setTimeout(collapseAttrib, 1500);
        overlay = document.createElement("canvas");
        overlay.className = "line-overlay";
        map.getContainer().appendChild(overlay);
        octx = overlay.getContext("2d");
        sizeOverlay();
        map.on("resize", sizeOverlay);
        map.on("render", drawOverlay);
      },
      // Clear pins and line for the next question. The camera stays where it was;
      // only the very first question of a visit starts centered on the continental U.S.
      reset() {
        if (!map) return;
        if (anim) { cancelAnimationFrame(anim); anim = null; }
        pin = null; answer = null; locked = false;
        if (pinMarker) pinMarker.remove();
        if (ansMarker) { ansMarker.remove(); ansMarker = null; }
        setLine(null); drawing = null; drawOverlay();
        if (!placed) { map.jumpTo({ center: US_CENTER, zoom: fitZoom() }); placed = true; }
      },
      onPin(fn) { onPin = fn; },
      getPin() { return pin; },
      resize() { if (map) map.resize(); },
      invertAt(sx, sy) { const r = map.getContainer().getBoundingClientRect(); const p = map.unproject([sx - r.left, sy - r.top]); return [p.lng, p.lat]; },
      // Draw a dotted line from the guess to the answer, with the camera following it,
      // then drop the answer flag at the end. Resolves when the flag has landed.
      reveal(guess, ans, hooks) {
        hooks = hooks || {};
        pin = guess; answer = ans; locked = true;
        map.stop();
        const angle = d3.geoDistance(guess, ans), miles = angle * 3958.8;
        const interp = d3.geoInterpolate(guess, ans);
        const c0 = map.getCenter(), start = [c0.lng, c0.lat], z0 = map.getZoom();
        // Frame both pins in the part of the map above the result card (hooks.padBottom px).
        const padEnd = hooks.padBottom || 0, pad0 = (map.getPadding() || {}).bottom || 0;
        const zEnd = zoomToFit(angle / 2, padEnd);
        const duration = Math.min(3200, 1100 + miles * 0.35);
        const t0 = performance.now();
        if (hooks.onStart) hooks.onStart(duration);
        return new Promise((done) => {
          const step = (now) => {
            const u = Math.min(1, (now - t0) / duration);
            const t = d3.easeCubicInOut(u);
            const n = Math.max(2, Math.ceil(96 * t));
            const pts = []; for (let i = 0; i <= n; i++) pts.push(interp((i / n) * t));
            drawing = pts;
            if (hooks.onProgress) hooks.onProgress(t);
            // Camera: centered on the drawn part of the line, zoomed out just enough to keep it in view.
            const target = interp(t / 2), blend = Math.min(1, u / 0.25);
            const center = d3.geoInterpolate(start, target)(blend);
            const zoom = Math.min(z0 + (zEnd - z0) * t, zoomToFit((angle * t) / 2 + 0.01, padEnd));
            const padding = { top: 0, left: 0, right: 0, bottom: pad0 + (padEnd - pad0) * blend };
            map.jumpTo({ center, zoom: Math.max(zoom, zEnd < z0 ? zEnd : fitZoom()), padding });
            if (u < 1) { anim = requestAnimationFrame(step); return; }
            anim = null;
            drawing = null; drawOverlay();
            const full = []; for (let i = 0; i <= 128; i++) full.push(interp(i / 128));
            setLine(unwrap(full));
            ansMarker = new maplibregl.Marker({ element: pinEl("#2f9e5b", true), anchor: "bottom" }).setLngLat(ans).addTo(map);
            if (hooks.onLand) setTimeout(hooks.onLand, 330); // as the flag hits the ground
            setTimeout(done, 550);
          };
          anim = requestAnimationFrame(step);
        });
      },
    };
  })();

  // ---------- Sound and haptics ----------
  const Feedback = (function () {
    let ctx = null;
    let on = store.get("ggg:sound") !== false;
    function audio() {
      if (!on) return null;
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) { return null; }
      return ctx;
    }
    function tone(freq, start, dur, type, vol, endFreq) {
      const c = audio(); if (!c) return;
      const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function thud(start) {
      const c = audio(); if (!c) return;
      const t = c.currentTime + (start || 0), n = Math.floor(c.sampleRate * 0.12);
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = "lowpass"; f.frequency.value = 500; g.gain.value = 0.5;
      src.connect(f).connect(g).connect(c.destination); src.start(t);
      tone(150, start || 0, 0.22, "sine", 0.45, 55);
    }
    // iPhones ignore navigator.vibrate; toggling a hidden switch control triggers a tap on iOS 18+.
    let iosSwitch = null;
    function buzz(pattern) {
      if (!on) return;
      if (navigator.vibrate) { try { navigator.vibrate(pattern); return; } catch (e) {} }
      try {
        if (!iosSwitch) {
          const label = document.createElement("label");
          label.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
          const input = document.createElement("input");
          input.type = "checkbox"; input.setAttribute("switch", "");
          label.appendChild(input); document.body.appendChild(label); iosSwitch = label;
        }
        const taps = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
        for (let i = 0; i < taps; i++) setTimeout(() => iosSwitch.click(), i * 90);
      } catch (e) {}
    }
    // While the line draws: a soft whoosh plus ticks that speed up and rise in pitch.
    let whoosh = null, lastTick = -1;
    function lineStart(duration) {
      const c = audio(); if (!c) return;
      const secs = duration / 1000, n = Math.floor(c.sampleRate * (secs + 0.3));
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
      src.buffer = buf; f.type = "bandpass"; f.Q.value = 1.2;
      f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(1600, t + secs);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.25);
      g.gain.setValueAtTime(0.07, t + Math.max(0.3, secs - 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + secs + 0.1);
      src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + secs + 0.2);
      whoosh = src; lastTick = -1;
    }
    function lineProgress(t) {
      const step = Math.floor(t * 24);            // 24 ticks over the whole line
      if (step <= lastTick) return;
      lastTick = step;
      tone(520 + step * 22, 0, 0.035, "square", 0.035);
    }
    function lineStop() { if (whoosh) { try { whoosh.stop(); } catch (e) {} whoosh = null; } }
    // A different sound for each score color, on top of the flag's thunk.
    const outcomes = {
      perfect() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.12 + i * 0.09, 0.38, "triangle", 0.22));
                  [1318.5, 1567.98].forEach((f, i) => tone(f, 0.5 + i * 0.07, 0.25, "sine", 0.1)); buzz([30, 60, 30, 60, 80]); },
      green()   { tone(783.99, 0.12, 0.18, "triangle", 0.22); tone(1046.5, 0.24, 0.3, "triangle", 0.22); buzz([25, 50, 25]); },
      yellow()  { tone(659.25, 0.12, 0.28, "sine", 0.22); buzz(30); },
      red()     { tone(392, 0.12, 0.22, "triangle", 0.2, 370); tone(311.13, 0.34, 0.45, "triangle", 0.2, 262); buzz(45); },
      black()   { tone(110, 0.12, 0.5, "sawtooth", 0.12, 80); buzz([60, 40, 60]); },
    };
    return {
      unlock() { audio(); },
      pin() { tone(880, 0, 0.05, "triangle", 0.12); buzz(10); },
      lineStart, lineProgress, lineStop,
      land(tier) { lineStop(); thud(0); (outcomes[tier] || outcomes.yellow)(); },
      isOn() { return on; },
      toggle() { on = !on; store.set("ggg:sound", on); if (on) audio(); return on; },
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

  let knownPlayers = [];
  function choosePlayer(n) { player = n; store.set("ggg:player", n); setWho(); begin(todayCentral(), false); }
  function cleanName(n) { return String(n || "").replace(/\s+/g, " ").trim(); }
  function newErr(msg) { $("newErr").textContent = msg || ""; $("newErr").hidden = !msg; }

  async function pickPlayer() {
    show("pickScreen");
    newErr("");
    $("findName").value = "";
    $("matches").innerHTML = '<div class="muted small">Loading names…</div>';
    try {
      knownPlayers = await api.players();
      renderMatches();
    } catch (e) {
      $("matches").innerHTML = '<div class="muted small">Couldn\'t load names — refresh to try again.</div>';
    }
  }
  // Names matching what's typed: names starting with it first, then names containing it.
  function findMatches(q) {
    q = cleanName(q).toLowerCase();
    if (!q) return [];
    const starts = [], contains = [];
    knownPlayers.forEach((n) => {
      const l = n.toLowerCase();
      if (l.startsWith(q) || l.split(" ").some((w) => w.startsWith(q))) starts.push(n);
      else if (l.includes(q)) contains.push(n);
    });
    const byName = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" });
    return starts.sort(byName).concat(contains.sort(byName)).slice(0, 8);
  }
  function renderMatches() {
    const box = $("matches"), q = $("findName").value;
    box.innerHTML = "";
    if (!cleanName(q)) {
      box.innerHTML = '<div class="muted small">' + knownPlayers.length + (knownPlayers.length === 1 ? " player" : " players") + " so far.</div>";
      return;
    }
    const list = findMatches(q);
    if (!list.length) { box.innerHTML = '<div class="muted small">No one by that name yet. New here? Join above.</div>'; return; }
    list.forEach((n) => {
      const b = document.createElement("button");
      b.className = "match"; b.textContent = n;
      b.onclick = () => choosePlayer(n);
      box.appendChild(b);
    });
  }
  $("findName").addEventListener("input", renderMatches);
  $("findName").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const list = findMatches($("findName").value);
    const exact = list.find((n) => n.toLowerCase() === cleanName($("findName").value).toLowerCase());
    if (exact || list.length === 1) choosePlayer(exact || list[0]);
  });
  $("newName").addEventListener("keydown", (e) => { if (e.key === "Enter") $("joinBtn").click(); });
  $("newName").addEventListener("input", () => newErr(""));
  $("joinBtn").onclick = async () => {
    const n = cleanName($("newName").value);
    if (!n) return newErr("Type your name first.");
    if (!/^[A-Za-zÀ-ÿ0-9 .'-]{1,20}$/.test(n)) return newErr("Use letters, numbers and spaces only (up to 20 characters).");
    const taken = () => newErr("“" + n + "” is already taken. Enter a different name, or pick yours from the list below.");
    if (knownPlayers.some((k) => k.toLowerCase() === n.toLowerCase())) return taken();
    $("joinBtn").disabled = true; $("joinBtn").textContent = "…";
    try {
      const res = await api.addPlayer(n);
      if (res && res.ok) { knownPlayers.push(res.name || n); choosePlayer(res.name || n); }
      else if (res && res.taken) taken();
      else newErr((res && res.error) || "Couldn't add you. Try again.");
    } catch (e) {
      newErr("Couldn't reach the scoreboard. Check your connection and try again.");
    } finally {
      $("joinBtn").disabled = false; $("joinBtn").textContent = "Join";
    }
  };

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
    $("nextBtn").hidden = true;
    $("result").hidden = true; $("result").classList.remove("show");
    $("hint").hidden = false;
    $("milesChip").hidden = true;
    show("gameScreen");
    Globe.reset();
  }
  Globe.onPin(() => { $("confirmBtn").disabled = false; $("hint").hidden = true; Feedback.pin(); });

  $("confirmBtn").onclick = async () => {
    const p = Globe.getPin(); if (!p) return;
    const i = session.progress.guesses.length, q = session.qs[i];
    const ans = [q.lon, q.lat];
    const miles = milesBetween(p, ans), pts = pointsFor(miles, MAX_PTS[i]);
    session.progress.guesses.push({ lon: +p[0].toFixed(4), lat: +p[1].toFixed(4), miles: Math.round(miles), pts });
    store.set(session.key, session.progress);
    $("confirmBtn").disabled = true;
    Feedback.unlock();
    // Fill in the result card now (hidden) so we know how much of the map it will cover.
    const card = $("result");
    $("rEmoji").textContent = emojiFor(pts, MAX_PTS[i]);
    $("rAnswer").textContent = q.answer;
    $("rDist").textContent = pts === MAX_PTS[i] ? "Nailed it — " + Math.round(miles) + " mi" : fmt(Math.round(miles)) + " miles away";
    $("rPts").textContent = "+" + pts;
    $("rFact").textContent = q.fact;
    card.classList.remove("show"); card.style.visibility = "hidden"; card.hidden = false;
    const cardH = card.offsetHeight + 16;
    card.hidden = true; card.style.visibility = "";
    const chip = $("milesChip"), total = Math.round(miles), tier = tierFor(pts, MAX_PTS[i]);
    chip.textContent = "0 mi"; chip.classList.remove("done"); chip.hidden = false;
    await Globe.reveal(p, ans, {
      padBottom: cardH,
      onStart(duration) { Feedback.lineStart(duration); },
      onProgress(t) { chip.textContent = fmt(Math.round(total * t)) + " mi"; Feedback.lineProgress(t); },
      onLand() { chip.textContent = fmt(total) + (total === 1 ? " mile" : " miles"); chip.classList.add("done"); Feedback.land(tier); },
    });
    // Same spot, same size: Confirm becomes Next, and the card slides up over the map.
    $("confirmBtn").hidden = true;
    $("nextBtn").textContent = i === 4 ? "See results" : "Next";
    $("nextBtn").hidden = false;
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add("show"));
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
    session.share = "GeoGeniuses · " + prettyDate(session.date, false) + (session.practice ? " (practice)" : "") +
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
    $("copied").hidden = true;
    // Open the phone's (or computer's) share sheet whenever the browser offers one.
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (e) { if (e && e.name === "AbortError") return; } // they closed the share sheet
    }
    // No share sheet available: copy to the clipboard instead.
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

  function setSoundBtn() { $("soundBtn").textContent = Feedback.isOn() ? "🔊" : "🔇"; $("soundBtn").setAttribute("aria-label", Feedback.isOn() ? "Sound on" : "Sound off"); }
  $("soundBtn").onclick = () => { Feedback.toggle(); setSoundBtn(); };
  setSoundBtn();

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
