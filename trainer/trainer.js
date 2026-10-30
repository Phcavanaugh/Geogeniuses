// GeoGeniuses Trainer: name a place, find it on the globe before the clock runs out.
// Practice only. Nothing is saved or sent anywhere.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const FIRST_CLOCK = 15, PASS = 70;
  const KIND = { city: "City", capital: "Capital", landmark: "Landmark", nature: "Nature" };
  function milesBetween(a, b) { return d3.geoDistance(a, b) * 3958.8; }
  function baseScore(miles) { return Math.round(100 / Math.sqrt(1 + miles / 1000)); }
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  const Globe = (function () {
    const MAX_ZOOM = 8.6;                 // closest view is roughly 40 x 40 miles on a phone
    // Live Esri World Imagery (the same source GeoHistory uses). The bundled NASA images sit
    // underneath, so if Esri is ever unreachable the globe still shows, just less sharp.
    const ESRI_KEY = (window.GGG_ESRI_KEY || "").trim();
    const ESRI_TILES = ESRI_KEY
      ? "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=" + encodeURIComponent(ESRI_KEY)
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    const US_CENTER = [10, 25]; // trainer: start on the whole world
    let map = null, pin = null, answer = null, locked = false, onPin = () => {};
    let pinMarker = null, ansMarker = null, anim = null, placed = false;
    let topPad = 0, restBottom = 0; // screen space covered by the floating clue card and Confirm button

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
        im = await loadImage("../imagery/world-1024.jpg");
        size = 1024 / Math.pow(2, z); sx = x * size; sy = y * size;
      } else {
        const shift = z - 1, qx = x >> shift, qy = y >> shift;
        im = await loadImage("../imagery/q" + qx + qy + ".jpg");
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
      const el = map.getContainer(), room = Math.min(el.clientWidth, el.clientHeight - (padBottom || 0) - topPad) * 0.36;
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
        const [w50, us] = await Promise.all(["../data/countries-50m.json", "../data/states-10m.json"].map((u) => fetch(u).then((r) => r.json())));
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
              // No background layer: space around the globe stays see-through so the starfield shows.
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
          if (!pinMarker) pinMarker = new maplibregl.Marker({ element: pinEl("#ff6b3d"), anchor: "bottom" });
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
        if (!placed) {
          map.jumpTo({ center: US_CENTER, zoom: fitZoom(), padding: { top: topPad, bottom: restBottom, left: 0, right: 0 } });
          placed = true;
        } else {
          map.easeTo({ padding: { top: topPad, bottom: restBottom, left: 0, right: 0 }, duration: 350 });
        }
      },
      // How much of the screen the clue card (top) and the Confirm button (bottom) cover.
      setInsets(top, bottom) { topPad = top || 0; restBottom = bottom || 0; },
      lock() { locked = true; },
      zoomOut() { if (map) map.easeTo({ zoom: fitZoom(), duration: 500, padding: { top: topPad, bottom: restBottom, left: 0, right: 0 } }); },
      showAnswer(ans) {
        locked = true;
        if (ansMarker) ansMarker.remove();
        ansMarker = new maplibregl.Marker({ element: pinEl("#3ecf7a", true), anchor: "bottom" }).setLngLat(ans).addTo(map);
        map.easeTo({ center: ans, zoom: Math.max(map.getZoom(), 3), duration: 700 });
      },
      center(ll) { map.jumpTo({ center: ll }); },
      project(ll) { const r = map.getContainer().getBoundingClientRect(), q = map.project(ll); return [q.x + r.left, q.y + r.top]; },
      onPin(fn) { onPin = fn; },
      tileTemplate() { return ESRI_TILES; },
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
        const duration = hooks.fast ? Math.min(1500, 650 + miles * 0.12) : Math.min(3200, 1100 + miles * 0.35);
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
            const padding = { top: topPad, left: 0, right: 0, bottom: pad0 + (padEnd - pad0) * blend };
            map.jumpTo({ center, zoom: Math.max(zoom, zEnd < z0 ? zEnd : fitZoom()), padding });
            if (u < 1) { anim = requestAnimationFrame(step); return; }
            anim = null;
            drawing = null; drawOverlay();
            const full = []; for (let i = 0; i <= 128; i++) full.push(interp(i / 128));
            setLine(unwrap(full));
            ansMarker = new maplibregl.Marker({ element: pinEl("#3ecf7a", true), anchor: "bottom" }).setLngLat(ans).addTo(map);
            if (hooks.onLand) setTimeout(hooks.onLand, 330); // as the flag hits the ground
            setTimeout(done, 550);
          };
          anim = requestAnimationFrame(step);
        });
      },
    };
  })();

  // ---------- Starfield behind the globe (Milky Way) ----------
  // Drawn on its own canvas under the map, so spinning the globe never moves the stars.
  const Stars = (function () {
    const cv = $("stars"), c = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, stars = [], running = false, last = 0;
    function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    function build() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = rng(23), area = (w * h) / (300 * 620);
      stars = [];
      for (let i = 0; i < 170 * area; i++)
        stars.push({ x: r() * w, y: r() * h, s: r() < 0.12 ? 1.5 : r() * 0.9 + 0.4, a: 0.5 + r() * 0.5, tw: 0.4 + r() * 1.6, ph: r() * 6.28, c: "255,255,255" });
      // The Milky Way: a dense, faint band of stars on a diagonal.
      for (let i = 0; i < 900 * area; i++) {
        const t = r(), off = (r() + r() + r() - 1.5) * 70;
        stars.push({ x: t * w * 1.3 - w * 0.15, y: h * 0.95 - t * h * 0.9 + off, s: r() * 0.7 + 0.2, a: 0.12 + r() * 0.35, tw: 0.2 + r(), ph: r() * 6.28, c: "225,232,255" });
      }
      const tints = ["170,200,255", "255,214,150", "200,220,255"];
      for (let i = 0; i < 9 * area; i++) stars.push({ x: r() * w, y: r() * h * 0.8, s: 1.9, a: 0.9, tw: 0.8 + r(), ph: r() * 6.28, c: tints[i % 3], glow: true });
    }
    function draw(s) {
      c.fillStyle = "#050a14"; c.fillRect(0, 0, w, h);
      c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.atan2(h * 0.9, w * 1.3));
      const g = c.createLinearGradient(0, -90, 0, 90);
      g.addColorStop(0, "rgba(120,140,200,0)"); g.addColorStop(0.5, "rgba(160,175,230,.2)"); g.addColorStop(1, "rgba(120,140,200,0)");
      c.fillStyle = g; c.fillRect(-w, -90, w * 2, 180); c.restore();
      const drift = reduce ? 0 : s * 1.2;
      for (const st of stars) {
        const a = reduce ? st.a : st.a * (0.65 + 0.35 * Math.sin(s * st.tw + st.ph));
        const x = (((st.x + drift) % (w + 4)) + w + 4) % (w + 4) - 2;
        if (st.glow) {
          const gg = c.createRadialGradient(x, st.y, 0, x, st.y, st.s * 4);
          gg.addColorStop(0, "rgba(" + st.c + "," + a + ")"); gg.addColorStop(1, "rgba(" + st.c + ",0)");
          c.fillStyle = gg; c.beginPath(); c.arc(x, st.y, st.s * 4, 0, 7); c.fill();
        }
        c.fillStyle = "rgba(" + st.c + "," + a + ")"; c.beginPath(); c.arc(x, st.y, st.s, 0, 7); c.fill();
      }
    }
    function loop(t) {
      if (!running) return;
      // About 20 frames a second is plenty for a slow twinkle and easy on the battery.
      if (t - last > 50) { last = t; draw(t / 1000); }
      requestAnimationFrame(loop);
    }
    function start() {
      build();
      if (!w) return;
      if (reduce) { draw(0); return; }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }
    function stop() { running = false; }
    window.addEventListener("resize", () => { if (running || reduce) { build(); draw(performance.now() / 1000); } });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else if (!$("gameScreen").hidden) start();
    });
    return { start, stop };
  })();


  // ---------- The run ----------
  let places = [], order = [], cursor = 0;
  let run = null;   // { clock, results: [], place, deadline, timer, busy }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function nextPlace() {
    if (cursor >= order.length) { order = shuffle(order.slice()); cursor = 0; }
    return places[order[cursor++]];
  }
  function show(id) {
    for (const s of ["startScreen", "gameScreen", "endScreen"]) $(s).hidden = s !== id;
    if (id === "gameScreen") { Globe.resize(); Stars.start(); } else Stars.stop();
  }
  function stat() {
    if (!run) { $("runStat").textContent = ""; return; }
    const ok = run.results.filter((r) => r.pass);
    const pts = ok.reduce((s, r) => s + r.score, 0);
    $("runStat").textContent = ok.length + " found · " + fmt(pts) + " pts";
  }

  function startRun() {
    order = shuffle(places.map((_, i) => i)); cursor = 0;
    run = { clock: FIRST_CLOCK, results: [], place: null, deadline: 0, timer: 0, busy: false };
    show("gameScreen");
    stat();
    nextClue(true);
  }

  function nextClue(first) {
    const p = nextPlace();
    run.place = p; run.busy = false;
    $("clueKind").textContent = KIND[p.k] || "Place";
    $("clueName").textContent = p.n;
    $("confirmBtn").disabled = true; $("confirmBtn").textContent = "Confirm";
    $("clueInfo").hidden = true; $("clueInfo").textContent = "";
    run.waiting = false;
    $("hint").hidden = false;
    $("flash").hidden = true;
    const qc = $("qcard"), top = qc.offsetTop + qc.offsetHeight + 6, bottom = $("bottomBar").offsetHeight;
    const gs = $("gameScreen");
    gs.style.setProperty("--qh", top + "px");
    gs.style.setProperty("--bb", bottom + "px");
    Globe.setInsets(top, bottom);
    Globe.reset();
    if (!first) Globe.zoomOut();
    run.total = run.clock;
    run.deadline = performance.now() + run.clock * 1000;
    tick();
  }

  function tick() {
    cancelAnimationFrame(run.timer);
    const left = Math.max(0, (run.deadline - performance.now()) / 1000);
    const frac = run.total > 0 ? left / run.total : 0;
    const bar = $("timeBar");
    bar.style.transform = "scaleX(" + frac.toFixed(4) + ")";
    bar.classList.toggle("danger", left <= 3);
    bar.classList.toggle("warn", left > 3 && left <= 6);
    $("clueClock").textContent = left.toFixed(1) + "s";
    $("clueClock").classList.toggle("danger", left <= 3);
    if (left <= 0) { timeUp(); return; }
    run.timer = requestAnimationFrame(tick);
  }
  function stopClock() { cancelAnimationFrame(run.timer); return Math.max(0, (run.deadline - performance.now()) / 1000); }

  function flash(html) { const f = $("flash"); f.innerHTML = html; f.hidden = false; }

  function showInfo(p) { $("clueInfo").textContent = p.d || ""; $("clueInfo").hidden = !p.d; }

  async function confirm() {
    if (run && run.waiting) { nextClue(false); return; }
    if (!run || run.busy) return;
    const g = Globe.getPin(); if (!g) return;
    run.busy = true;
    const left = stopClock();
    $("confirmBtn").disabled = true;
    const p = run.place, ans = [p.lon, p.lat];
    const miles = milesBetween(g, ans), score = baseScore(miles);
    const pass = score >= PASS;
    run.results.push({ name: p.n, d: p.d, miles, score, pass, time: run.total - left });
    stat();
    const near = miles < 1 ? "spot on" : fmt(Math.round(miles)) + " mi";
    await Globe.reveal(g, ans, {
      fast: true, padBottom: $("bottomBar").offsetHeight,
      onLand() {
        showInfo(p);
        if (pass) {
          const next = Math.round(FIRST_CLOCK * score) / 100;
          flash('<b class="ok">' + score + '</b><span>' + near + '</span><small>next ' + next.toFixed(1) + 's</small>');
          buzz(score === 100 ? [20, 40, 20] : 15);
        } else {
          flash('<b class="bad">' + score + '</b><span>' + near + '</span><small>under ' + PASS + '</small>');
          buzz([60, 50, 60]);
        }
      },
    });
    if (pass) {
      run.clock = (FIRST_CLOCK * score) / 100;
      // Clock stays paused until they tap Next, so there's time to read about the place.
      run.waiting = true;
      $("confirmBtn").textContent = "Next"; $("confirmBtn").disabled = false;
    } else {
      setTimeout(() => endRun("Too far: " + p.n + " was " + near + " away"), 2600);
    }
  }

  function timeUp() {
    if (run.busy) return;
    run.busy = true;
    const p = run.place;
    $("confirmBtn").disabled = true; $("hint").hidden = true;
    run.results.push({ name: p.n, d: p.d, miles: null, score: 0, pass: false, time: run.total });
    showInfo(p);
    Globe.showAnswer([p.lon, p.lat]);
    flash('<b class="bad">Time’s up</b><span>' + p.n.split(",")[0] + ' is here</span>');
    buzz([60, 50, 60]);
    setTimeout(() => endRun("Out of time on " + p.n), 2600);
  }

  function endRun(why) {
    const ok = run.results.filter((r) => r.pass);
    const pts = ok.reduce((s, r) => s + r.score, 0);
    $("endWhy").textContent = why;
    $("endCount").textContent = ok.length;
    $("endUnit").textContent = ok.length === 1 ? "place found" : "places found";
    $("endPts").textContent = fmt(pts) + " points" + (ok.length ? " · average " + Math.round(pts / ok.length) : "");
    const list = $("endList"); list.innerHTML = "";
    run.results.forEach((r, i) => {
      const li = document.createElement("li");
      if (!r.pass) li.className = "fail";
      const m = r.miles == null ? "time" : r.miles < 1 ? "0 mi" : fmt(Math.round(r.miles)) + " mi";
      li.innerHTML = '<span class="e">' + (i + 1) + '</span><span class="a"></span><span class="m">' + m +
        '</span><span class="p">' + (r.miles == null ? "–" : r.score) + '</span>';
      const a = li.querySelector(".a"); a.textContent = r.name;
      if (r.d) { const sm = document.createElement("small"); sm.textContent = r.d; a.appendChild(sm); }
      list.appendChild(li);
    });
    run = null; stat();
    show("endScreen");
    $("endScreen").scrollTop = 0;
  }

  Globe.onPin(() => { if (run && !run.busy && !run.waiting) { $("confirmBtn").disabled = false; $("hint").hidden = true; buzz(8); } });
  $("confirmBtn").onclick = confirm;
  $("startBtn").onclick = startRun;
  $("againBtn").onclick = startRun;

  (async function boot() {
    try {
      const [list] = await Promise.all([fetch("places.json?v=2").then((r) => r.json()), Globe.load()]);
      places = list;
      $("startBtn").disabled = false; $("startBtn").textContent = "Start";
    } catch (e) {
      $("startBtn").textContent = "Couldn’t load. Refresh to try again.";
    }
  })();
  window.__trainer = { baseScore, get run() { return run; }, globe: Globe };
})();
