/* GeoGeniuses Kids — find states and countries on a map. */
(() => {
"use strict";

// ---------- data: names, regions, pools ----------
const DISPLAY = {
  "United States of America":"United States","Dem. Rep. Congo":"DR Congo","Central African Rep.":"Central African Republic",
  "Bosnia and Herz.":"Bosnia and Herzegovina","Macedonia":"North Macedonia","S. Sudan":"South Sudan","Eq. Guinea":"Equatorial Guinea",
  "eSwatini":"Eswatini","Dominican Rep.":"Dominican Republic","Antigua and Barb.":"Antigua and Barbuda","St. Kitts and Nevis":"Saint Kitts and Nevis",
  "St. Vin. and Gren.":"Saint Vincent and the Grenadines","Solomon Is.":"Solomon Islands","Marshall Is.":"Marshall Islands","W. Sahara":"Western Sahara",
  "Falkland Is.":"Falkland Islands","Congo":"Republic of the Congo","Vatican":"Vatican City","São Tomé and Principe":"São Tomé and Príncipe",
  "Fr. Polynesia":"French Polynesia","Faeroe Is.":"Faroe Islands","Cayman Is.":"Cayman Islands","Turks and Caicos Is.":"Turks and Caicos",
  "U.S. Virgin Is.":"U.S. Virgin Islands","British Virgin Is.":"British Virgin Islands","N. Mariana Is.":"Northern Mariana Islands",
  "Cook Is.":"Cook Islands","Pitcairn Is.":"Pitcairn Islands","S. Geo. and the Is.":"South Georgia","Fr. S. Antarctic Lands":"French Southern Lands",
  "Br. Indian Ocean Ter.":"British Indian Ocean Territory","Wallis and Futuna Is.":"Wallis and Futuna","St. Pierre and Miquelon":"Saint Pierre and Miquelon",
  "Heard I. and McDonald Is.":"Heard Island","Indian Ocean Ter.":"Christmas Island","Ashmore and Cartier Is.":"Ashmore Reef",
};
const REG = {
  europe:["Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herz.","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Monaco","Montenegro","Netherlands","Macedonia","Norway","Poland","Portugal","Romania","Russia","San Marino","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom","Vatican","Turkey"],
  asia:["Afghanistan","Armenia","Azerbaijan","Bahrain","Bangladesh","Bhutan","Brunei","Cambodia","China","Georgia","India","Indonesia","Iran","Iraq","Israel","Japan","Jordan","Kazakhstan","Kuwait","Kyrgyzstan","Laos","Lebanon","Malaysia","Maldives","Mongolia","Myanmar","Nepal","North Korea","Oman","Pakistan","Palestine","Philippines","Qatar","Russia","Saudi Arabia","Singapore","South Korea","Sri Lanka","Syria","Taiwan","Tajikistan","Thailand","Timor-Leste","Turkey","Turkmenistan","United Arab Emirates","Uzbekistan","Vietnam","Yemen"],
  africa:["Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Rep.","Chad","Comoros","Congo","Dem. Rep. Congo","Côte d'Ivoire","Djibouti","Egypt","Eq. Guinea","Eritrea","eSwatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","S. Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe"],
  na:["Antigua and Barb.","Bahamas","Barbados","Belize","Canada","Costa Rica","Cuba","Dominica","Dominican Rep.","El Salvador","Grenada","Guatemala","Haiti","Honduras","Jamaica","Mexico","Nicaragua","Panama","St. Kitts and Nevis","Saint Lucia","St. Vin. and Gren.","Trinidad and Tobago","United States of America","Greenland"],
  sa:["Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru","Suriname","Uruguay","Venezuela"],
  oceania:["Australia","Fiji","Kiribati","Marshall Is.","Micronesia","Nauru","New Zealand","Palau","Papua New Guinea","Samoa","Solomon Is.","Tonga","Vanuatu"],
};
const EASY = {
  europe:["United Kingdom","France","Spain","Italy","Germany","Russia","Ukraine","Norway","Sweden","Finland","Poland","Ireland","Portugal","Greece","Iceland","Turkey"],
  asia:["China","India","Russia","Japan","Mongolia","Saudi Arabia","Iran","Kazakhstan","Indonesia","Turkey","Pakistan","Thailand","Vietnam","South Korea","Philippines","Afghanistan"],
  africa:["Egypt","South Africa","Madagascar","Nigeria","Kenya","Morocco","Algeria","Libya","Ethiopia","Sudan","Dem. Rep. Congo","Somalia","Angola","Tanzania","Chad","Mali"],
  na:["United States of America","Canada","Mexico","Greenland","Cuba","Panama","Guatemala","Jamaica","Haiti","Costa Rica","Honduras","Nicaragua","Dominican Rep."],
  sa:["Brazil","Argentina","Chile","Peru","Colombia","Venezuela","Bolivia","Ecuador","Paraguay","Uruguay"],
  oceania:["Australia","New Zealand","Papua New Guinea","Fiji","Solomon Is."],
  world:["United States of America","Canada","Mexico","Brazil","Argentina","Chile","Peru","Colombia","Venezuela","United Kingdom","France","Spain","Italy","Germany","Russia","Ukraine","Norway","Sweden","China","India","Japan","Mongolia","Kazakhstan","Indonesia","Iran","Saudi Arabia","Turkey","Australia","New Zealand","Egypt","South Africa","Madagascar","Nigeria","Kenya","Algeria","Greenland"],
  states:["California","Texas","Florida","Alaska","Hawaii","New York","Illinois","Arizona","Washington","Colorado","Michigan","Montana","Nevada","Oregon","Utah","Georgia","Wisconsin","Ohio","Pennsylvania","Minnesota","Louisiana","Maine","North Carolina","New Mexico","Idaho","Wyoming"],
};
const TINY_STATES = ["Rhode Island","Delaware","Connecticut"];

const MAPS = [
  {id:"usa",label:"USA states",icon:"🇺🇸",kind:"states"},
  {id:"world",label:"World",icon:"🌍",kind:"countries"},
  {id:"na",label:"North America",icon:"🌎",kind:"countries",bbox:[-168,6,-52,72]},
  {id:"sa",label:"South America",icon:"🦜",kind:"countries",bbox:[-82,-56,-34,13]},
  {id:"europe",label:"Europe",icon:"🏰",kind:"countries",bbox:[-24,34,44,71]},
  {id:"africa",label:"Africa",icon:"🦁",kind:"countries",bbox:[-19,-35,52,37]},
  {id:"asia",label:"Asia",icon:"🐼",kind:"countries",bbox:[26,-10,146,58]},
  {id:"oceania",label:"Oceania",icon:"🦘",kind:"countries",bbox:[112,-47,182,3]},
];
const LEVEL = { medium:{ hintAfter:1, revealAfter:4, skipAfter:2, sayWrong:true } };
const COLORS = ["#7bd389","#ffb86b","#8ecae6","#f497b6","#c3a6ff","#ffe066","#80deea","#ffab91","#a5d6a7","#b39ddb"];

// ---------- prefs ----------
const store = {
  get(k, d){ try{ const v = localStorage.getItem("ggk:"+k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("ggk:"+k, JSON.stringify(v)); }catch(e){} },
};
let sel = { level: "medium", map: store.get("map","usa"), mode: store.get("mode","quick") };
let voiceOn = store.get("voice", true);

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const screens = { home:$("home"), play:$("play"), done:$("done") };
function show(name){ for (const k in screens) screens[k].classList.toggle("hidden", k !== name); }

$("maps").innerHTML = MAPS.map(m => `<button class="mapbtn" data-map="${m.id}"><span class="mi">${m.icon}</span><b>${m.label}</b></button>`).join("");
function paintHome(){
  document.querySelectorAll(".mapbtn").forEach(b => b.classList.toggle("sel", b.dataset.map === sel.map));
  document.querySelectorAll(".mode").forEach(b => b.classList.toggle("sel", b.dataset.mode === sel.mode));
  $("voiceBtn").textContent = voiceOn ? "🔊" : "🔇";
  $("sayBtn").textContent = voiceOn ? "🔊" : "🔇";
  const filled = store.get("filled", []);
  const best = store.get(`best:${sel.map}:${sel.level}:${sel.mode}`, null);
  const bits = [];
  if (best != null && sel.mode !== "explore") bits.push(`Best here: ${best} ⭐`);
  if (filled.length) bits.push(`🏆 Maps filled: ${filled.length}`);
  $("trophies").textContent = bits.join("  ·  ");
}
document.querySelectorAll(".mode").forEach(b => b.onclick = () => { sel.mode = b.dataset.mode; store.set("mode", sel.mode); tick(); paintHome(); });
$("maps").addEventListener("click", e => { const b = e.target.closest(".mapbtn"); if (!b) return; sel.map = b.dataset.map; store.set("map", sel.map); tick(); paintHome(); });
$("voiceBtn").onclick = () => { voiceOn = !voiceOn; store.set("voice", voiceOn); if (!voiceOn) speechSynthesis?.cancel(); paintHome(); };
$("sayBtn").onclick = () => {
  if (!voiceOn) { voiceOn = true; store.set("voice", true); paintHome(); }
  if (game && game.mode !== "explore" && game.cur) say(`Find ${game.cur.properties.name}!`);
  else if (game && game.mode === "explore") say("Tap any place to hear its name.");
};
$("goBtn").onclick = () => { unlockAudio(); start(); };
$("homeBtn").onclick = () => { speechSynthesis?.cancel(); clearTimeout(nextTimer); game = null; show("home"); paintHome(); };
$("againBtn").onclick = () => start();
$("doneHome").onclick = () => { show("home"); paintHome(); };
$("skipBtn").onclick = () => { if (game && !game.busy) reveal(); };

// ---------- sound + voice ----------
let actx = null;
function unlockAudio(){ try{ actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); }catch(e){} }
function tone(freqs, dur = .12, type = "sine", vol = .18){
  if (!actx) return;
  let t = actx.currentTime;
  for (const f of freqs){
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur * 1.6);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur * 1.7);
    t += dur * .8;
  }
}
const sfx = {
  good: () => tone([660, 880, 1175], .11, "triangle"),
  bad:  () => tone([220, 175], .14, "sine", .14),
  tap:  () => tone([520], .07, "triangle", .1),
  done: () => tone([523, 659, 784, 1046, 1318], .13, "triangle"),
};
let voice = null;
function pickVoice(){
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const en = vs.filter(v => /^en[-_]US/i.test(v.lang));
  voice = en.find(v => /samantha|ava|allison|google us|zira|jenny|aria/i.test(v.name)) || en[0] || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (window.speechSynthesis){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text){
  if (!voiceOn || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = "en-US"; u.rate = .92; u.pitch = 1.1;
  speechSynthesis.speak(u);
}

// ---------- confetti ----------
const cv = $("confetti"), cx = cv.getContext("2d");
let bits = [], raf = 0;
function confetti(n = 40, x, y){
  const r = cv.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio;
  x = x ?? r.width / 2; y = y ?? r.height / 3;
  for (let i = 0; i < n; i++) bits.push({ x, y, vx:(Math.random()-.5)*9, vy:-Math.random()*9-3, s:5+Math.random()*6, c:COLORS[i % COLORS.length], r:Math.random()*6, life:70+Math.random()*30 });
  if (!raf) raf = requestAnimationFrame(stepConfetti);
}
function stepConfetti(){
  const d = devicePixelRatio; cx.clearRect(0, 0, cv.width, cv.height);
  bits = bits.filter(b => b.life-- > 0);
  for (const b of bits){ b.vy += .32; b.x += b.vx; b.y += b.vy; b.r += .15;
    cx.save(); cx.translate(b.x*d, b.y*d); cx.rotate(b.r); cx.fillStyle = b.c; cx.fillRect(-b.s*d/2, -b.s*d/4, b.s*d, b.s*d/2); cx.restore(); }
  raf = bits.length ? requestAnimationFrame(stepConfetti) : 0;
  if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
}

// ---------- geo data ----------
const cache = {};
async function loadJSON(url){ if (!cache[url]) cache[url] = fetch(url).then(r => r.json()); return cache[url]; }

async function featuresFor(map){
  if (map.kind === "states"){
    const us = await loadJSON("../data/states-10m.json?v=1");
    const skip = new Set(["60","66","69","72","78"]);
    const feats = topojson.feature(us, us.objects.states).features.filter(f => !skip.has(String(f.id)));
    feats.forEach(f => { f.properties.key = f.properties.name; });
    return { feats, fitTo: topojson.feature(us, us.objects.nation) };
  }
  const w = await loadJSON("../data/countries-50m.json?v=1");
  const geoms = w.objects.countries.geometries;
  const byName = n => geoms.find(g => g.properties.name === n);
  const merges = [["Somalia","Somaliland"],["Cyprus","N. Cyprus"]];
  const absorbed = new Set(merges.map(m => m[1]));
  const feats = [];
  for (const g of geoms){
    const raw = g.properties.name;
    if (absorbed.has(raw)) continue;
    let f;
    const m = merges.find(mm => mm[0] === raw);
    if (m) f = { type:"Feature", id:g.id, properties:{}, geometry: topojson.merge(w, [g, byName(m[1])].filter(Boolean)) };
    else f = topojson.feature(w, g);
    f.properties = { key: raw, name: DISPLAY[raw] || raw };
    feats.push(f);
  }
  return { feats, fitTo: null };
}

function areaOf(f){ const a = d3.geoArea(f); return Math.min(a, 4 * Math.PI - a); }

function poolFor(map, level, feats){
  const keys = new Set(feats.map(f => f.properties.key));
  let all, easy;
  if (map.kind === "states"){
    all = feats.map(f => f.properties.key).filter(k => k !== "District of Columbia");
    easy = EASY.states;
    if (level === "easy") return easy.filter(k => keys.has(k));
    return all;
  }
  if (map.id === "world"){ all = [...new Set(Object.values(REG).flat())]; easy = EASY.world; }
  else { all = REG[map.id]; easy = EASY[map.id]; }
  all = all.filter(k => keys.has(k));
  if (level === "easy") return easy.filter(k => keys.has(k));
  if (level === "medium"){
    const min = map.id === "world" ? 3e-3 : 4.5e-4;
    const byKey = new Map(feats.map(f => [f.properties.key, f]));
    return all.filter(k => easy.includes(k) || areaOf(byKey.get(k)) >= min);
  }
  return all;
}

// ---------- map rendering ----------
const svg = d3.select("#map");
const gRoot = svg.append("g");
const gLand = gRoot.append("g");
const gFx = gRoot.append("g");
let proj, pathGen, zoomK = 1;
const zoom = d3.zoom().scaleExtent([1, 20]).on("zoom", e => {
  gRoot.attr("transform", e.transform); zoomK = e.transform.k; rescaleFx();
});
svg.call(zoom).on("dblclick.zoom", null);
$("zin").onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.8);
$("zout").onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1/1.8);
$("zreset").onclick = () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);

function buildProjection(map, w, h, data){
  const pad = Math.min(w, h) * .04;
  const ext = [[pad, pad], [w - pad, h - pad]];
  if (map.kind === "states") return d3.geoAlbersUsa().fitExtent(ext, data.fitTo);
  if (map.id === "world"){
    const fc = { type:"FeatureCollection", features: data.feats.filter(f => f.properties.key !== "Antarctica") };
    return d3.geoNaturalEarth1().fitExtent(ext, fc);
  }
  const [x0, y0, x1, y1] = map.bbox, cxl = (x0 + x1) / 2, cyl = (y0 + y1) / 2;
  const pts = [];
  for (let i = 0; i <= 12; i++){ const x = x0 + (x1 - x0) * i / 12, y = y0 + (y1 - y0) * i / 12; pts.push([x, y0], [x, y1], [x0, y], [x1, y]); }
  return d3.geoAzimuthalEqualArea().rotate([-cxl, -cyl]).fitExtent(ext, { type:"MultiPoint", coordinates: pts });
}

function sizeOf(){ const r = $("mapWrap").getBoundingClientRect(); return [Math.max(200, r.width), Math.max(200, r.height)]; }

function render(){
  if (!game) return;
  const [w, h] = sizeOf();
  svg.attr("viewBox", `0 0 ${w} ${h}`);
  proj = buildProjection(game.map, w, h, game.data);
  pathGen = d3.geoPath(proj);
  zoom.translateExtent([[-w * .3, -h * .3], [w * 1.3, h * 1.3]]).extent([[0, 0], [w, h]]);
  gLand.selectAll("path.f").attr("d", pathGen);
  game.boundsCache = new Map();
  redrawFx();
}
window.addEventListener("resize", () => { if (game && !screens.play.classList.contains("hidden")) { render(); } });

// rings + labels live in gFx, positioned in projected coords
let fx = [];
function addRing(f, cls = ""){ fx.push({ type:"ring", f, cls }); redrawFx(); }
function addLabel(f, text){ fx.push({ type:"label", f, text }); redrawFx(); }
function clearFx(){ fx = []; gFx.selectAll("*").remove(); }
function anchorOf(f){
  // centroid of the biggest polygon, so labels land on the mainland
  const g = f.geometry;
  if (g.type !== "MultiPolygon") return pathGen.centroid(f);
  let best = null, ba = -1;
  for (const c of g.coordinates){ const p = { type:"Polygon", coordinates:c }; const a = pathGen.area(p); if (a > ba){ ba = a; best = p; } }
  return pathGen.centroid(best);
}
function redrawFx(){
  gFx.selectAll("*").remove();
  for (const o of fx){
    const [x, y] = anchorOf(o.f);
    if (!isFinite(x)) continue;
    if (o.type === "ring") gFx.append("circle").attr("class", "ring " + o.cls).attr("cx", x).attr("cy", y).datum(o);
    else gFx.append("text").attr("class", "lbl").attr("x", x).attr("y", y).text(o.text).datum(o);
  }
  rescaleFx();
}
function rescaleFx(){
  gFx.selectAll("circle.ring").attr("r", 20 / zoomK);
  gFx.selectAll("text.lbl").attr("font-size", 17 / zoomK).attr("dy", 6 / zoomK).style("stroke-width", 4 / zoomK + "px");
}

// ---------- game ----------
let game = null, nextTimer = 0;

async function start(){
  const map = MAPS.find(m => m.id === sel.map);
  $("prompt").innerHTML = `<span class="q">Loading map…</span>`;
  show("play");
  const data = await featuresFor(map);
  const pool = poolFor(map, sel.level, data.feats);
  const inPlay = new Set(sel.mode === "explore" ? data.feats.map(f => f.properties.key) : pool);
  const byKey = new Map(data.feats.map(f => [f.properties.key, f]));
  let queue = d3.shuffle(pool.slice());
  if (sel.mode === "quick") queue = queue.slice(0, 10);
  game = { map, data, level:sel.level, lv:LEVEL[sel.level], mode:sel.mode, byKey, queue:queue.map(k => byKey.get(k)).filter(Boolean),
           idx:-1, misses:0, stars:0, results:[], found:new Set(), busy:false, cur:null, inPlay };

  clearFx();
  gLand.selectAll("path.f").remove();
  gLand.selectAll("path.f").data(data.feats, d => d.properties.key).join("path")
    .attr("class", d => "f" + (map.kind === "countries" && !inPlay.has(d.properties.key) ? " out" : ""))
    .style("fill", null);
  svg.call(zoom.transform, d3.zoomIdentity);
  render();
  $("skipBtn").classList.add("hidden");
  hideToast();

  if (game.mode === "explore"){
    $("prompt").innerHTML = `<span class="q">Explore ${map.label}</span><span class="name">Tap anywhere!</span>`;
    $("progress").innerHTML = ""; $("stars").textContent = "Pinch to zoom 🔍";
    say(`Tap any ${map.kind === "states" ? "state" : "country"} to hear its name.`);
    return;
  }
  next();
}

function next(){
  clearTimeout(nextTimer);
  clearFx();
  gLand.selectAll("path.f").classed("target-hint", false).classed("target-show", false).classed("flash", false);
  game.idx++; game.misses = 0; game.busy = false;
  $("skipBtn").classList.add("hidden");
  if (game.idx >= game.queue.length) return finish();
  game.cur = game.queue[game.idx];
  const name = game.cur.properties.name;
  const p = $("prompt");
  p.classList.remove("pop"); void p.offsetWidth;
  p.innerHTML = `<span class="q">Can you find…</span><span class="name">${name}</span>`;
  p.classList.add("pop");
  paintProgress();
  say(`Find ${name}!`);
}

function paintProgress(){
  const n = game.queue.length;
  if (n <= 12){
    $("progress").innerHTML = game.queue.map((_, i) => {
      const r = game.results[i];
      const c = i === game.idx ? "cur" : r == null ? "" : r > 0 ? "on" : "miss";
      return `<i class="${c}"></i>`;
    }).join("");
  } else {
    $("progress").textContent = `🧩 ${Math.min(game.idx, n)} / ${n} found`;
  }
  $("stars").textContent = `⭐ ${game.stars}`;
}

function pathFor(f){ return gLand.selectAll("path.f").filter(d => d === f); }

// Is a tap at projected point p "close enough" to a tiny piece of feature f?
function nearTiny(f, p){
  const g = f.geometry; if (!g) return false;
  const polys = g.type === "MultiPolygon" ? g.coordinates : g.type === "Polygon" ? [g.coordinates] : [];
  for (const c of polys){
    const b = pathGen.bounds({ type:"Polygon", coordinates:c });
    if (!isFinite(b[0][0])) continue;
    const size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) * zoomK;
    if (size > 26) continue;
    const dx = Math.max(b[0][0] - p[0], 0, p[0] - b[1][0]);
    const dy = Math.max(b[0][1] - p[1], 0, p[1] - b[1][1]);
    if (Math.hypot(dx, dy) * zoomK <= 22) return true;
  }
  return false;
}

svg.on("click", ev => {
  if (!game) return;
  const p = d3.pointer(ev, gLand.node());
  const el = ev.target.closest && ev.target.closest("path.f");
  const hit = el ? d3.select(el).datum() : null;
  if (game.mode === "explore") return exploreTap(hit, p);
  if (game.busy || !game.cur) return;
  const t = game.cur;
  if (hit === t || nearTiny(t, p)) return correct();
  if (!hit){ toast("That's the ocean! 🌊", "info"); sfx.tap(); return; }
  const name = hit.properties.name;
  if (game.found.has(hit.properties.key)){ toast(`That's ${name} — already found!`, "info"); sfx.tap(); return; }
  wrong(hit);
});

function exploreTap(hit, p){
  if (!hit){
    // forgive near-misses on tiny islands
    hit = game.data.feats.find(f => nearTiny(f, p)) || null;
    if (!hit){ toast("Ocean 🌊", "info"); return; }
  }
  sfx.tap();
  gLand.selectAll("path.f.tapped").classed("tapped", false);
  pathFor(hit).classed("tapped", true);
  clearFx(); addLabel(hit, hit.properties.name);
  toast(hit.properties.name, "info");
  say(hit.properties.name);
}

function correct(){
  const t = game.cur, lv = game.lv;
  game.busy = true;
  const stars = game.misses === 0 ? 3 : game.misses === 1 ? 2 : 1;
  game.stars += stars; game.results[game.idx] = stars; game.found.add(t.properties.key);
  const color = COLORS[hash(t.properties.key) % COLORS.length];
  pathFor(t).classed("target-hint", false).classed("flash", true).classed("found", true).style("fill", color);
  setTimeout(() => pathFor(t).classed("flash", false), 450);
  clearFx(); addRing(t, "ok"); addLabel(t, t.properties.name);
  const praise = ["Yes!","You got it!","Awesome!","Super!","Nice!","Great job!","Woo-hoo!"][Math.floor(Math.random() * 7)];
  toast(`${praise} ${"⭐".repeat(stars)}`, "good");
  sfx.good(); say(`${praise} ${t.properties.name}!`);
  const r = $("mapWrap").getBoundingClientRect();
  confetti(stars * 14, r.left + r.width / 2, r.top + 40);
  paintProgress();
  nextTimer = setTimeout(next, game.mode === "full" ? 1300 : 1700);
}

function wrong(hit){
  const lv = game.lv, t = game.cur;
  game.misses++;
  const el = pathFor(hit); el.classed("wrong", false); void el.node().getBBox(); el.classed("wrong", true);
  setTimeout(() => el.classed("wrong", false), 750);
  sfx.bad();
  const name = hit.properties.name;
  const left = lv.revealAfter - game.misses;
  if (left <= 0) return reveal();
  toast(lv.sayWrong ? `That's ${name}. Try again!` : `Nope — that's ${name}`, "bad");
  if (lv.sayWrong) say(`That's ${name}. Try again!`);
  if (game.misses >= lv.hintAfter){
    pathFor(t).classed("target-hint", true);
    if (!fx.some(o => o.type === "ring")) addRing(t);
  }
  if (game.misses >= lv.skipAfter) $("skipBtn").classList.remove("hidden");
}

function reveal(){
  const t = game.cur;
  game.busy = true;
  game.results[game.idx] = 0; game.found.add(t.properties.key);
  pathFor(t).classed("target-hint", false).classed("target-show", true).classed("found", true).style("fill", "#ffcf99");
  clearFx(); addRing(t); addLabel(t, t.properties.name);
  toast(`Here's ${t.properties.name}! 👀`, "info");
  say(`Here's ${t.properties.name}.`);
  $("skipBtn").classList.add("hidden");
  paintProgress();
  nextTimer = setTimeout(() => { pathFor(t).classed("target-show", false); next(); }, 2400);
}

function finish(){
  game.cur = null;
  const n = game.queue.length, max = n * 3, s = game.stars;
  const pct = max ? s / max : 0;
  const key = `best:${game.map.id}:${game.level}:${game.mode}`;
  if (s > store.get(key, -1)) store.set(key, s);
  if (game.mode === "full"){
    const tag = `${game.map.id}:${game.level}`, filled = store.get("filled", []);
    if (!filled.includes(tag)){ filled.push(tag); store.set("filled", filled); }
  }
  $("doneEmoji").textContent = pct >= .9 ? "🏆" : pct >= .7 ? "🥳" : pct >= .4 ? "😎" : "💪";
  $("doneTitle").textContent = pct >= .9 ? "Map genius!" : pct >= .7 ? "Great job!" : pct >= .4 ? "Nice work!" : "Good practice!";
  $("doneStars").textContent = `⭐ ${s} / ${max}`;
  const firstTry = game.results.filter(r => r === 3).length;
  $("doneMsg").textContent = game.mode === "full"
    ? `You filled in all of ${game.map.label}! ${firstTry} on the first try.`
    : `${firstTry} of ${n} on the first try.`;
  setTimeout(() => {
    show("done"); sfx.done(); confetti(90);
    say(`${$("doneTitle").textContent} You got ${s} stars!`);
  }, 500);
}

let toastTimer = 0;
function toast(msg, kind){
  const t = $("toast"); t.textContent = msg; t.className = "toast " + (kind || "");
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 2200);
}
function hideToast(){ $("toast").classList.add("hidden"); }
function hash(s){ let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function tick(){ unlockAudio(); sfx.tap(); }

// test hook
window.__ggk = { get game(){ return game; }, sel, start, poolFor, featuresFor, MAPS, anchor: f => anchorOf(f), zoom: () => zoomK, proj: () => proj };

paintHome();
})();
