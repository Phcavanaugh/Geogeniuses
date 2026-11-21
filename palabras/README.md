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
| `js/defensa.js` | Connects ¡Defensa! to Palabras: next round, map button, stars, best scores |
| `js/app.js` | Settings, install, offline |
| `js/test.js` | Test mode: open with `?test` for a separate save and a 🧪 panel of shortcuts |
| `lolo3d.js`, `monster3d.js` | 3D pets and Ñamñam (three.js in `lib/`) |
| `defensa3d.js`, `defensa-rules.js` | ¡Defensa!, the 3D tower defense game (graphics / rules). Balance check: `node palabras/tests/defensa-sim.mjs` |
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
