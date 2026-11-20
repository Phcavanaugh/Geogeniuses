# ¡Hola, Palabras!

Spanish vocabulary game for kids (ages 4–5, 7 and 10), live at geogeniuses.win/palabras.
No build step: GitHub Pages serves these files as-is.

| File | What's in it |
|---|---|
| `index.html` | The screens (HTML) and the list of scripts, in load order |
| `css/palabras.css` | All the styles |
| `js/words.js` | Every world and its words |
| `js/riddles.js` | ¡Adivina! riddles |
| `js/content7.js` | True/false, odd-one-out and silly lines for the older kids |
| `js/units.js` | Homework units (the fox unit) |
| `js/core.js` | Saving, speech, Dora's voice, helpers |
| `js/pet.js` | The pet and the store |
| `js/home.js` | Game modes, home screen, journey map |
| `js/tarea.js` | Homework unit screens |
| `js/run.js` | Flashcards and the shared game run (hearts, score) |
| `js/word-games.js`, `js/arcade.js` | The mini-games |
| `js/app.js` | Settings, install, offline |
| `lolo3d.js`, `monster3d.js` | 3D pets and Ñamñam (three.js in `lib/`) |
| `sw.js` | Offline support |
| `audio/` | Dora's voice packs, made by `tools/voice/` |

The `js/` files are plain scripts that share one global scope, so a file can use anything
defined in the files loaded before it.

**When you change anything:** bump `VERSION` in `sw.js`, and the `?v=` numbers in
`index.html` and `sw.js` when you change JS or CSS.

**Test before shipping:** serve the repo (`python3 -m http.server 8770`) and run
`node palabras/tests/smoke.js` (needs Playwright). It plays every mode at every age and fails on any error.
