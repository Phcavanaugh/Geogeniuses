/**
 * Good Globe Game — scoreboard backend for a Google Sheet.
 *
 * The Sheet needs two tabs (this script creates them the first time it runs):
 *   Players — one name per row in column A, starting at A2. Add or remove family here.
 *   Scores  — written by the game. Don't edit rows by hand unless you mean to.
 *
 * Deploy: Deploy > New deployment > Web app, Execute as "Me", Who has access "Anyone".
 * Paste the web app URL into config.js in the game files.
 */

var TZ = 'America/Chicago';
var MAX_TOTAL = 1000;

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  // Answers come from a cache that's cleared whenever a score, share or player is saved,
  // so the Sheet is only read again after something changes.
  if (action === 'players') return raw_(cached_('players', function () { return { players: getPlayers_() }; }, 600));
  if (action === 'board') return raw_(cached_('board:' + today_(), function () { return computeBoard_(getRows_(), today_()); }));
  // Every saved day and share, for working out badges in the game.
  if (action === 'history') return raw_(cached_('history', function () { return { ok: true, rows: getRows_(), shares: getShares_() }; }));
  // One player's game for one day, including where they tapped (for their profile).
  if (action === 'day') return json_(getDay_(String(e.parameter.player || ''), String(e.parameter.date || '')));
  // GeoGrabber: the last 60 days of daily runs, and one player's coins/skins/badges.
  if (action === 'grabBoard') return raw_(cached_('grab:' + today_(), function () { return { ok: true, today: today_(), rows: getGrabRows_(addDays_(today_(), -60)) }; }));
  if (action === 'grabProfile') return json_(getGrabProfile_(String(e.parameter.player || '')));
  return json_({ ok: true, message: 'Good Globe Game scoreboard is running.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'share') return json_(saveShare_(body));
    if (body.action === 'addPlayer') return json_(addPlayer_(body));
    if (body.action === 'grabSubmit') return json_(grabSubmit_(body));
    if (body.action === 'grabSaveProfile') return json_(grabSaveProfile_(body));
    if (body.action !== 'submit') return json_({ ok: false, error: 'Unknown action.' });

    var player = String(body.player || '').trim();
    var date = String(body.date || '');
    var scores = (body.scores || []).map(Number);
    var miles = (body.miles || []).map(Number);
    var total = scores.reduce(function (a, b) { return a + b; }, 0);

    if (getPlayers_().indexOf(player) === -1) return json_({ ok: false, error: 'That name isn\'t on the Players list.' });
    if (date !== today_()) return json_({ ok: false, error: 'Only today\'s puzzle counts for points.' });
    var caps = [100, 100, 200, 300, 300];
    var badScore = scores.some(function (s, i) { return !(s >= 0 && s <= caps[i]); });
    if (scores.length !== 5 || badScore || total > MAX_TOTAL) return json_({ ok: false, error: 'That score doesn\'t look right.' });

    if (hasScore_(player, date)) return json_({ ok: true, duplicate: true });

    // Where they tapped, as [[lon, lat], ...] for the five questions.
    var guesses = '';
    if (Array.isArray(body.guesses) && body.guesses.length === 5 && body.guesses.every(function (p) {
      return Array.isArray(p) && p.length === 2 && Math.abs(p[0]) <= 360 && Math.abs(p[1]) <= 90;
    })) guesses = JSON.stringify(body.guesses.map(function (p) { return [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]; }));
    var sc = sheet_('Scores');
    if (sc.getRange(1, 15).getValue() === '') sc.getRange(1, 15).setValue('Guesses');
    sc.appendRow([new Date(), "'" + date, player].concat(scores).concat([total]).concat(miles).concat([guesses]));
    bust_();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'Server error: ' + err });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Shares (for the Postcard badge) ----------
// One row per player per day they shared their result. Repeat shares on the same day are ignored.
function saveShare_(body) {
  var player = String(body.player || '').trim();
  var date = String(body.date || '');
  if (getPlayers_().indexOf(player) === -1) return { ok: false, error: 'That name isn\'t on the Players list.' };
  // Shares can arrive a little late (a phone that was offline), so accept the past week.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today_() || date < addDays_(today_(), -7)) return { ok: false, error: 'That date doesn\'t look right.' };
  var already = getShares_().some(function (r) { return r.player === player && r.date === date; });
  if (!already) { sheet_('Shares').appendRow([new Date(), "'" + date, player]); bust_(); }
  return { ok: true, duplicate: already };
}

// ---------- New players (the Join button) ----------
function addPlayer_(body) {
  var name = String(body.name || '').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z\u00C0-\u00FF0-9 .'-]{1,20}$/.test(name)) return { ok: false, error: 'Use letters, numbers and spaces only (up to 20 characters).' };
  var taken = getPlayers_().some(function (n) { return n.toLowerCase() === name.toLowerCase(); });
  if (taken) return { ok: false, taken: true };
  sheet_('Players').appendRow([name]);
  bust_();
  return { ok: true, name: name };
}

// ---------- Cache ----------
// Google's cache holds up to 100 KB per entry, so bigger answers are split into pieces.
var CACHE_TTL = 21600; // 6 hours, the longest Google allows
var CHUNK = 80000;
function cached_(key, build, ttl) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(key + ':n') || 0);
  if (n > 0) {
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + ':' + i);
    var got = cache.getAll(keys), parts = [];
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) { parts = null; break; } parts.push(got[keys[j]]); }
    if (parts) return parts.join('');
  }
  var str = JSON.stringify(build());
  var count = Math.max(1, Math.ceil(str.length / CHUNK)), obj = {};
  for (var k = 0; k < count; k++) obj[key + ':' + k] = str.substr(k * CHUNK, CHUNK);
  obj[key + ':n'] = String(count);
  try { cache.putAll(obj, ttl || CACHE_TTL); } catch (e) { /* too big to cache: still answer */ }
  return str;
}
// Clear the cache after anything is saved (the pieces left behind are simply ignored).
function bust_() {
  var cache = CacheService.getScriptCache();
  cache.removeAll(['players:n', 'history:n', 'board:' + today_() + ':n', 'grab:' + today_() + ':n']);
}
// Editing the Sheet by hand (adding a player, fixing a score) clears the cache too.
function onEdit(e) { bust_(); }
function raw_(str) {
  return ContentService.createTextOutput(str).setMimeType(ContentService.MimeType.JSON);
}
function getShares_() {
  var sh = sheet_('Shares');
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().map(function (r) {
    var date = r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : String(r[1]);
    return { date: date, player: String(r[2]) };
  });
}

// ---------- Leaderboard ----------
function computeBoard_(rows, today) {
  var seen = {}, clean = [];
  rows.forEach(function (r) { var k = r.player + '|' + r.date; if (!seen[k]) { seen[k] = 1; clean.push(r); } });
  var dow = new Date(today + 'T12:00:00Z').getUTCDay();
  var monday = addDays_(today, -((dow + 6) % 7));
  var by = {};
  clean.forEach(function (r) { (by[r.player] = by[r.player] || []).push(r); });

  var todayList = clean.filter(function (r) { return r.date === today; })
    .map(function (r) { return { name: r.player, total: r.total, scores: r.scores }; })
    .sort(function (a, b) { return b.total - a.total; });

  var week = [], avg = [], streak = [];
  Object.keys(by).forEach(function (name) {
    var list = by[name];
    var wk = list.filter(function (r) { return r.date >= monday && r.date <= today; });
    if (wk.length) week.push({ name: name, total: sum_(wk), games: wk.length });
    avg.push({ name: name, avg: Math.round(sum_(list) / list.length), games: list.length });
    var dates = {}; list.forEach(function (r) { dates[r.date] = 1; });
    var d = dates[today] ? today : addDays_(today, -1), n = 0;
    while (dates[d]) { n++; d = addDays_(d, -1); }
    if (n) streak.push({ name: name, streak: n });
  });
  week.sort(function (a, b) { return b.total - a.total; });
  avg.sort(function (a, b) { return b.avg - a.avg; });
  streak.sort(function (a, b) { return b.streak - a.streak; });
  return { today: todayList, week: week, avg: avg, streak: streak, weekStart: monday };
}

// ---------- Sheet helpers ----------
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === 'Players') { sh.appendRow(['Name']); sh.appendRow(['Pete']); }
    if (name === 'Shares') sh.appendRow(['Saved at', 'Date', 'Player']);
    if (name === GRAB) sh.appendRow(['Saved at', 'Date', 'Player', 'Land %', 'Rivals cut', 'Status', 'Power-up', 'Twist', 'Seconds', 'Played at']);
    if (name === GRAB_PROFILES) sh.appendRow(['Player', 'Updated', 'Coins', 'Profile (coins, skins, power-ups, badges)']);
    if (name === 'Scores') sh.appendRow(['Saved at', 'Date', 'Player', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Total', 'Q1 miles', 'Q2 miles', 'Q3 miles', 'Q4 miles', 'Q5 miles', 'Guesses']);
    sh.setFrozenRows(1);
  }
  return sh;
}
function getPlayers_() {
  var sh = sheet_('Players');
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (n) { return n; });
}
// One saved day for one player: scores, miles and guess locations (if they were saved).
function getDay_(player, date) {
  var sh = sheet_('Scores');
  if (!player || !date || sh.getLastRow() < 2) return { ok: false };
  var keys = sh.getRange(2, 2, sh.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < keys.length; i++) {
    var d = keys[i][0] instanceof Date ? Utilities.formatDate(keys[i][0], TZ, 'yyyy-MM-dd') : String(keys[i][0]);
    if (d !== date || String(keys[i][1]) !== player) continue;
    var width = Math.max(14, Math.min(15, sh.getLastColumn()));
    var r = sh.getRange(i + 2, 1, 1, width).getValues()[0];
    var guesses = null;
    try { if (r[14]) guesses = JSON.parse(r[14]); } catch (err) { guesses = null; }
    return { ok: true, player: player, date: date, scores: r.slice(3, 8).map(Number), total: Number(r[8]),
      miles: r.slice(9, 14).map(function (m) { return m === '' ? null : Number(m); }), guesses: guesses };
  }
  return { ok: false };
}

// Quick duplicate check that reads only the date and player columns.
function hasScore_(player, date) {
  var sh = sheet_('Scores');
  if (sh.getLastRow() < 2) return false;
  var vals = sh.getRange(2, 2, sh.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    var d = vals[i][0] instanceof Date ? Utilities.formatDate(vals[i][0], TZ, 'yyyy-MM-dd') : String(vals[i][0]);
    if (d === date && String(vals[i][1]) === player) return true;
  }
  return false;
}
function getRows_() {
  var sh = sheet_('Scores');
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues().map(function (r) {
    var date = r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : String(r[1]);
    return { date: date, player: String(r[2]), scores: [r[3], r[4], r[5], r[6], r[7]].map(Number), total: Number(r[8]) };
  });
}
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function addDays_(s, n) {
  var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}
function sum_(list) { return list.reduce(function (a, r) { return a + r.total; }, 0); }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor (select "setup" and press Run) to create the tabs. */
function setup() { sheet_('Players'); sheet_('Scores'); sheet_('Shares'); sheet_(GRAB); sheet_(GRAB_PROFILES); }

// ---------- GeoGrabber (geogeniuses.win/geograbber) ----------
// One row per player per day. A run is saved as "playing" when it starts and updated when it ends,
// so leaving mid-run still counts as that day's one run. A finished run is never overwritten.
var GRAB = 'GeoGrabber';
var GRAB_PROFILES = 'GeoGrabber profiles';
function grabSubmit_(body) {
  var player = String(body.player || '').trim();
  var date = String(body.date || '');
  var e = body.entry || {};
  if (getPlayers_().indexOf(player) === -1) return { ok: false, error: 'That name isn\'t on the Players list.' };
  if (date !== today_()) return { ok: false, error: 'Only today\'s plat counts for the board.' };
  var pct = Number(e.pct), kills = Number(e.kills || 0), secs = Number(e.secs || 0), at = Number(e.at || 0);
  var status = e.status === 'done' ? 'done' : 'playing';
  if (!(pct >= 0 && pct <= 100) || !(kills >= 0 && kills <= 99) || !(secs >= 0 && secs <= 3600)) return { ok: false, error: 'That score doesn\'t look right.' };
  var row = [new Date(), "'" + date, player, Math.round(pct * 10) / 10, Math.round(kills), status,
    String(e.power || '').slice(0, 20), String(e.twist || '').slice(0, 20), Math.round(secs), at ? new Date(at) : ''];
  var sh = sheet_(GRAB), n = sh.getLastRow() - 1;
  if (n > 0) {
    var keys = sh.getRange(2, 2, n, 5).getValues();
    for (var i = keys.length - 1; i >= 0; i--) {
      var d = keys[i][0] instanceof Date ? Utilities.formatDate(keys[i][0], TZ, 'yyyy-MM-dd') : String(keys[i][0]);
      if (d !== date || String(keys[i][1]) !== player) continue;
      if (String(keys[i][4]) === 'done') return { ok: true, duplicate: true };
      if (status === 'playing' && pct < Number(keys[i][2])) return { ok: true, duplicate: true };
      if (!row[9]) row[9] = sh.getRange(i + 2, 10).getValue();
      sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
      bust_();
      return { ok: true, updated: true };
    }
  }
  sh.appendRow(row);
  bust_();
  return { ok: true };
}
function getGrabRows_(since) {
  var sh = sheet_(GRAB);
  if (sh.getLastRow() < 2) return [];
  var out = [];
  sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues().forEach(function (r) {
    var date = r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : String(r[1]);
    if (date < since) return;
    out.push({ date: date, player: String(r[2]), pct: Number(r[3]) || 0, kills: Number(r[4]) || 0, status: String(r[5]),
      power: String(r[6] || '') || null, twist: String(r[7] || '') || null, secs: Number(r[8]) || 0,
      at: r[9] instanceof Date ? r[9].getTime() : (r[0] instanceof Date ? r[0].getTime() : 0) });
  });
  return out;
}
function getGrabProfile_(player) {
  if (!player) return { ok: false };
  var sh = sheet_(GRAB_PROFILES);
  if (sh.getLastRow() < 2) return { ok: true, profile: null };
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) !== player) continue;
    try { return { ok: true, profile: JSON.parse(vals[i][3]) }; } catch (err) { return { ok: true, profile: null }; }
  }
  return { ok: true, profile: null };
}
function grabSaveProfile_(body) {
  var player = String(body.player || '').trim();
  if (getPlayers_().indexOf(player) === -1) return { ok: false, error: 'That name isn\'t on the Players list.' };
  var str = JSON.stringify(body.profile || {});
  if (str.length > 45000) return { ok: false, error: 'Profile is too big.' };
  var coins = Number((body.profile || {}).coins) || 0;
  var sh = sheet_(GRAB_PROFILES), n = sh.getLastRow() - 1;
  if (n > 0) {
    var names = sh.getRange(2, 1, n, 1).getValues();
    for (var i = 0; i < names.length; i++) {
      if (String(names[i][0]) !== player) continue;
      sh.getRange(i + 2, 1, 1, 4).setValues([[player, new Date(), coins, str]]);
      return { ok: true };
    }
  }
  sh.appendRow([player, new Date(), coins, str]);
  return { ok: true };
}
