# ¡Hola, Palabras!

Spanish vocabulary game for kids (ages 4–5, 7 and 10), live at geogeniuses.win/palabras.
No build step: GitHub Pages serves these files as-is.

| File | What's in it |
|---|---|
| `index.html` | The screens (HTML) and the list of scripts, in load order |
| `css/palabras.css` | All the styles |
| `js/words.js` | Every world, and every word as one entry: Spanish, English, picture, riddle |
| `js/riddles.js` | ¡Adivina! helpers (how riddles end, look-alike pictures) |
| `js/content7.js` | True/false, odd-one-out and silly lines for the older kids |
| `js/units.js` | Homework units (the fox unit) |
| `js/core.js` | Saving, speech, Dora's voice, helpers |
| `js/pet.js` | The pet and the store |
| `js/home.js` | Game modes, home screen, journey map |
| `js/tarea.js` | Homework unit screens |
| `js/run.js` | Flashcards and the shared game run (hearts, score) |
| `js/word-games.js`, `js/arcade.js` | The mini-games |
| `js/defensa.js` | Connects ¡Defensa! to Palabras: the saved island, rounds unlocked by map levels (3 each), stars, best scores |
| `js/app.js` | Settings, install, offline |
| `js/test.js` | Test mode: open with `?test` for a separate save and a 🧪 panel of shortcuts |
| `lolo3d.js`, `monster3d.js` | 3D pets and Ñamñam (three.js in `lib/`) |
| `defensa3d.js`, `defensa-rules.js` | ¡Defensa!, the 3D tower defense game (graphics / rules). Rules use Bloons TD 6's scale (ranges, speeds, round toughness). Balance check: `node palabras/tests/defensa-sim.mjs` |
| `art/defensa/` | ¡Defensa! pictures (swap a file to change it) and `models/` (drop in a .glb and list it in `models.json` to replace a tower or critter) |
| `lib/` | three.js, plus its glTF loader (only loaded when `models.json` lists a model) |
| `defensa.html` | ¡Defensa! on its own, for testing: geogeniuses.win/palabras/defensa.html |
| `sw.js` | Offline support |
| `audio/` | Dora's voice packs, made by `tools/voice/` |

The `js/` files are plain scripts that share one global scope, so a file can use anything
defined in the files loaded before it.

**When you change anything:** bump `VERSION` in `sw.js`, and the `?v=` numbers in
`index.html` and `sw.js` when you change JS or CSS.

**Adding a word:** add one line to `WORDS` in `js/words.js` (the comment at the top explains each field),
add its voice lines to `tools/voice/clips.json`, run the voice tool, then `node palabras/tests/check-words.js`.

**Test before shipping:** `node palabras/tests/check-words.js` checks every word is complete and its recordings match. Then serve the repo (`python3 -m http.server 8770`) and run
`node palabras/tests/smoke.js` (needs Playwright). It plays every mode at every age and fails on any error.

## Playing on more than one device (the Palabras Google Sheet)

Each kid picks their name ("¿Quién juega?") and their progress follows them to any device.
Saves go to the Palabras Google Sheet, which is its own sheet, separate from GeoGeniuses. The code is in `apps-script/Code.gs`.

- **Turned off** until `config.js` has the Sheet's web app URL. While it's off, the game saves on each device only, like before.
- **Players tab:** one name per row. Add kids there or with "＋ Añadir" in the game.
- **First time on a device that already has progress:** the game asks whose each age's progress is, so nothing is lost. A backup copy of that old progress also stays on the device (`hpx_legacy`).
- **How saving works:** changes are sent a few seconds after they happen and when the game closes. On start, anything newer in the Sheet is pulled in. For each saved item, the newest copy wins. With no internet the game keeps playing and sends everything later.
- **Switching kids:** tap "👤 Name · Cambiar" above the age buttons.
- **Changing the Apps Script later:** Deploy → Manage deployments → pencil → Version: New version → Deploy. The URL stays the same.
