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
  if (action === 'players') return json_({ players: getPlayers_() });
  if (action === 'board') return json_(computeBoard_(getRows_(), today_()));
  return json_({ ok: true, message: 'Good Globe Game scoreboard is running.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
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

    var already = getRows_().some(function (r) { return r.player === player && r.date === date; });
    if (already) return json_({ ok: true, duplicate: true });

    sheet_('Scores').appendRow([new Date(), "'" + date, player].concat(scores).concat([total]).concat(miles));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'Server error: ' + err });
  } finally {
    lock.releaseLock();
  }
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
    if (name === 'Scores') sh.appendRow(['Saved at', 'Date', 'Player', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Total', 'Q1 miles', 'Q2 miles', 'Q3 miles', 'Q4 miles', 'Q5 miles']);
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
function setup() { sheet_('Players'); sheet_('Scores'); }
