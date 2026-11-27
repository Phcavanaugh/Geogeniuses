/**
 * ¡Hola, Palabras! — saved progress, so a kid can keep playing on any device.
 * This runs in its OWN Google Sheet (not the GeoGeniuses one).
 *
 * The Sheet has two tabs (run "setup" once and they are made for you):
 *   Players — one name per row in column A, starting at A2. Add or remove kids here.
 *   Saves   — written by the game, one row per kid. Don't edit it by hand.
 *
 * Deploy: Deploy > New deployment > Web app, Execute as "Me", Who has access "Anyone".
 * Send the web app URL (ends in /exec) so it can go in palabras/config.js.
 * After changing this code later: Deploy > Manage deployments > pencil > Version: New version > Deploy.
 *
 * A save is { v: {key: text or null}, t: {key: time it changed} }.
 * Each key keeps whichever copy changed most recently, so two devices never wipe each other out.
 */

var CHUNK = 45000;   // a Sheet cell holds up to 50,000 characters, so a save is spread over several cells
var MAX_CHUNKS = 40;

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'ping') return json_({ ok: true });
  if (p.action === 'players') return json_({ ok: true, players: getPlayers_() });
  if (p.action === 'load') return json_({ ok: true, save: readSave_(String(p.player || '')) });
  return json_({ ok: false, error: 'Unknown action.' });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request.' }); }
  if (body.action === 'addPlayer') return json_(addPlayer_(body));
  if (body.action === 'save') return json_(save_(body));
  return json_({ ok: false, error: 'Unknown action.' });
}

function save_(body) {
  var player = String(body.player || '').trim();
  if (getPlayers_().indexOf(player) === -1) return { ok: false, error: 'That name isn\'t on the Players list.' };
  var incoming = body.save || {};
  if (typeof incoming.v !== 'object' || typeof incoming.t !== 'object') return { ok: false, error: 'Bad save.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var merged = merge_(readSave_(player) || { v: {}, t: {} }, incoming);
    writeSave_(player, merged);
    return { ok: true, t: merged.t };
  } finally {
    lock.releaseLock();
  }
}

// For every key, keep the copy that changed most recently.
function merge_(a, b) {
  var out = { v: {}, t: {} };
  var keys = {};
  Object.keys(a.t).concat(Object.keys(b.t)).forEach(function (k) { keys[k] = 1; });
  Object.keys(keys).forEach(function (k) {
    var ta = Number(a.t[k]) || 0, tb = Number(b.t[k]) || 0;
    var src = tb >= ta && k in b.t ? b : a;
    out.t[k] = Math.max(ta, tb);
    out.v[k] = k in src.v ? src.v[k] : null;
  });
  return out;
}

function findRow_(sh, player) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  var names = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < names.length; i++) if (String(names[i][0]) === player) return i + 2;
  return -1;
}

function readSave_(player) {
  if (!player) return null;
  var sh = sheet_('Saves'), row = findRow_(sh, player);
  if (row < 0) return null;
  var count = Number(sh.getRange(row, 3).getValue()) || 0;
  if (!count) return null;
  var parts = sh.getRange(row, 4, 1, count).getValues()[0];
  // every piece starts with "~" so the Sheet never mistakes it for a formula
  var str = parts.map(function (s) { return String(s).slice(1); }).join('');
  try { return JSON.parse(str); } catch (err) { return null; }
}

function writeSave_(player, save) {
  var str = JSON.stringify(save), parts = [];
  for (var i = 0; i < str.length; i += CHUNK) parts.push('~' + str.slice(i, i + CHUNK));
  if (parts.length > MAX_CHUNKS) throw new Error('Save is too big.');
  var sh = sheet_('Saves'), row = findRow_(sh, player);
  if (row < 0) { row = Math.max(sh.getLastRow() + 1, 2); }
  var old = row <= sh.getLastRow() ? Number(sh.getRange(row, 3).getValue()) || 0 : 0;
  sh.getRange(row, 1, 1, 3).setValues([[player, new Date(), parts.length]]);
  sh.getRange(row, 4, 1, parts.length).setValues([parts]);
  if (old > parts.length) sh.getRange(row, 4 + parts.length, 1, old - parts.length).clearContent();
}

function getPlayers_() {
  var sh = sheet_('Players');
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (n) { return n; });
}

function addPlayer_(body) {
  var name = String(body.name || '').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-zÀ-ÿ0-9 .'-]{1,20}$/.test(name)) return { ok: false, error: 'Use letters, numbers and spaces only (up to 20 characters).' };
  var taken = getPlayers_().some(function (n) { return n.toLowerCase() === name.toLowerCase(); });
  if (taken) return { ok: false, taken: true };
  sheet_('Players').appendRow([name]);
  return { ok: true, name: name };
}

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === 'Players') sh.appendRow(['Name']);
    if (name === 'Saves') sh.appendRow(['Name', 'Last saved', 'Pieces', 'Save data →']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor (pick "setup" in the menu at the top, then press Run) to make the tabs. */
function setup() { sheet_('Players'); sheet_('Saves'); }
