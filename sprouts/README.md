# Sprout Pals

A private family pet-care and farming game. A child hatches an egg, cares for the pet, grows
food on a small farm, feeds it, and finds out what it grows into. Once grown up and after a short
"Meadow party" goal, the pet moves to the Meadow (collection) and a new egg appears.

Live at **https://geogeniuses.win/sprouts/** (part of the GeoGeniuses site, served by GitHub Pages).

No accounts, ads, purchases, chat or analytics. Every child's progress is saved on the device.

## Stack: why plain HTML + JavaScript modules

- **No build step.** The browser loads the files in this folder as they are. That matches the rest of
  this repository: GitHub Pages serves `main` as-is, and there's no build pipeline to maintain or break.
- **Small and easy to read.** About 2,500 lines total. Game rules (`js/engine/`) are separate from
  the screens (`js/ui/`), and every number lives in `config/`.
- **Same code runs in Node,** so the rules have fast unit tests that need no browser.
- **All paths are relative,** so the game works at `/sprouts/`, at a site root, or from a local server.
- **Offline:** `sw.js` caches the game on first load, so it then works offline and from the Home Screen.

## Folder map

| Path | What it is |
|---|---|
| `index.html`, `css/game.css` | Page shell and all styling (iPhone + iPad layouts, large touch targets) |
| `config/*.js` | **All tunable numbers** — see below |
| `js/engine/evolution.js` | Evolution scoring |
| `js/engine/time.js` | Time passing (open or closed): needs, growth, crops |
| `js/engine/game.js` | Rules for care, farm, goal, collection |
| `js/engine/save.js` | Save/load per child, migrations, repair, export/import |
| `js/ui/app.js` | Screens and interaction |
| `js/ui/art.js` | Asset loader with fallback |
| `js/ui/placeholders.js`, `icons.js` | Temporary art drawn in code (SVG) |
| `js/ui/pet-view.js` | Builds a pet from parts and animates it |
| `js/ui/sound.js` | Synthesized sound effects + mute |
| `assets/` | Drop real art here (see `ASSETS.md`) |
| `icons/` | App / Home Screen icons |
| `tests/` | Unit tests, end-to-end test, local server |
| `tools/` | Regenerate the art list / icons |

## Local development

Needs Node 18+.

```sh
cd sprouts
node tests/serve.mjs            # http://localhost:8790/sprouts/  (serves the whole repo, same subpath as live)
```

To try it on an iPhone/iPad on the same Wi-Fi, open `http://<computer-ip>:8790/sprouts/`.

## Tests

```sh
cd sprouts
node --test tests/unit/*.test.mjs        # evolution scoring, save loading/migration, elapsed time (34 tests)
node tests/e2e/play.mjs                  # full play sequence in headless Chromium (needs Playwright)
node tests/e2e/play.mjs --shots          # same, saving screenshots to tests/e2e/shots/
node tests/e2e/play.mjs "--device=iPad Pro 11 landscape" --shots
node tests/e2e/play.mjs https://geogeniuses.win/sprouts/   # run against the live site
```

The end-to-end test runs on the real files at the `/sprouts/` subpath with a controllable clock.
It covers: create profile → hatch → plant → harvest → feed → grow up three times (checking that
food steered the result) → finish the grown-up goal → move it to the Meadow → Bubble Pop → mute →
**close the browser** → reopen 10 hours later → check the profile, egg, crops (which grew while the
game was closed), inventory, collection and mute setting are all still there → reload offline.

## Deployment

The repository root is published by GitHub Pages from `main` with the custom domain in `/CNAME`.
Deploying means merging to `main`: put changes on a branch, open a PR, merge, and Pages
republishes in a minute or two. Nothing needs building.

After a deploy, the service worker fetches fresh files whenever the device is online (it checks the
network first and uses the cache only when offline), so there is no version number to bump.

## Game configuration

Every number is a **starting value for playtesting**, not a verified value from any other game. Edit, reload, play.

| File | Controls |
|---|---|
| `config/stages.js` | Stage lengths (baby→toddler 4 h, toddler→teen 36 h, teen→adult 72 h), taps to hatch, `GROWTH_SPEED` multiplier |
| `config/needs.js` | Decay per hour awake/asleep, sleep recovery, the floor needs never go below (15), what Play/Wash do, "welcome back" threshold |
| `config/crops.js` | Six crops: grow minutes, harvest size, seeds returned, starting seeds |
| `config/foods.js` | How much tummy each food fills, happiness bonus |
| `config/evolution.js` | Every pet form, what it grows from, rare unlock conditions, and the **food × form score table** |
| `config/rewards.js` | Decorations and star prices, Bubble Pop settings, the grown-up goal |

Published accounts of the original stage timings conflict with each other. Those values are in
`config/stages.js` so you can change them in one place.

### How evolution works

This follows the publicly described scoring mechanism (credit: natashenka.ca's write-ups on
*My Tamagotchi Forever*). Every pet, name and drawing here is original.

1. Each food has a score for each possible next form (`FOOD_SCORES` in `config/evolution.js`).
2. On every feeding, each form the pet could become next gains `foodScore × hunger points actually restored`.
   Feeding a full pet restores 0 points, so it adds nothing.
3. When the stage time is up, the pet shows **Ready to grow!** and waits for the child to tap it.
   This way every growth moment is seen, and only one stage passes per absence. The highest-scoring
   eligible form wins. Ties are broken at random. The result is saved immediately.
4. A form can have an `unlock` condition. Supported: `{ decoration: 'id' }` (built on the farm) and
   `{ raised: n }` (grown-ups already raised). **Starbloom** is rare: it needs the Moon Fountain.

The current tree: Puffkin (baby) → Berrybun / Leafling / Pebblepup → Jellyhop / Fernfox / Burrowbear
→ Honeyhorn / Mossdrake / Boulderback / Starbloom. Sweet foods (strawberry, blueberry) lean toward
Berrybun → Jellyhop → Honeyhorn. Greens (peas, broccoli) lean toward Leafling → Fernfox → Mossdrake.
Hearty foods (carrot, pumpkin) lean toward Pebblepup → Burrowbear → Boulderback. Blueberries plus a
Moon Fountain lean toward Starbloom.

### Time away

Time keeps passing while the game is closed. Needs fall but stop at a floor, pets never die or leave,
a sleeping pet wakes itself, and crops finish growing. After 6+ hours away the child sees a friendly
"Welcome back!" with tips. If the device clock goes backwards, that counts as no time passing, so
nothing un-grows.

## Replacing placeholder graphics

All art is optional. `ASSETS.md` lists every file the game will look for: filename, recommended
size, transparency and use. A machine-readable copy is in `assets/manifest.json`.

1. Save the finished file at the listed path inside `sprouts/assets/` (e.g. `assets/pets/mossdrake/body.png`).
2. Reload. The game checks every listed file at startup and uses each one it finds. Anything
   missing, misnamed or broken quietly uses the built-in drawing, so the game never breaks.
3. Pets are **built from parts**: a body with no face, plus shared eyes/mouth/cheeks layered on top.
   The code animates blinking, eating, moods and reactions by swapping and moving those parts.
   This needs no sprite sheets, and every pet animates the same way. If a body needs its face in a
   different spot, change that pet's entry in `FACE` (`js/ui/placeholders.js`), then run
   `node tools/asset-doc.mjs` to refresh `ASSETS.md`/`manifest.json`.
4. App icons are plain files in `icons/`. Replace them directly (sizes in `ASSETS.md`).
   `node tools/make-icons.mjs` re-renders the placeholders from `icons/icon.svg`.

If you add a pet form, crop or decoration in `config/`, run `node tools/asset-doc.mjs` so the art
list includes it. It also needs a placeholder drawing in `js/ui/placeholders.js`; until it has one,
it shows a default shape.

## Saves, backups and the parent area

- Each child's game is stored under its own `localStorage` key (`sproutpals.profile.<id>`), so one
  damaged save can't affect the others. Progress saves after every action, every 10 seconds, and
  when the app is hidden or closed.
- Save files carry a `schemaVersion`. `js/engine/save.js` upgrades older formats step by step, then
  repairs missing or invalid fields. A damaged save is copied to `sproutpals.damaged.*` and skipped.
  A save from a *newer* version of the game is never overwritten.
- **Grown-ups** (home screen, behind a times-table question) can delete players, download or copy a
  backup, restore from a file or pasted text, and set the volume. Restoring adds the backed-up
  players; a player with the same id is replaced by the backup copy.
- Note for parents: clearing Safari's website data, or iOS removing data for a site not used in
  weeks, deletes saves. Adding the game to the Home Screen and keeping occasional backups helps.
- There is no automatic sync between devices (not required). Use backup/restore to move a game.
