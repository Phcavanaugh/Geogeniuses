# Tile Tumble (geogeniuses.win/tiles)

A falling-tiles rhythm game for kids, with a grown-ups-only song setup and chart editor. It's a static site with no build step and no server, and it has no accounts, ads, chat, purchases or links out. Players, scores, settings and chart edits are saved on each device.

## How it works

- **One clock.** Song position comes from the Web Audio clock, and tiles, judging and music all read that clock, so they can't drift apart. Each chart also stores when the audio file first makes a sound (`audio.firstSound`), which corrects the small start delays that differ between browsers' audio decoders.
- **Timing offset.** Bluetooth headphones and speakers add delay. *Grown-ups → Sound & timing → Timing check* measures it and keeps one offset for the speaker and one for Bluetooth.
- **Judging.** Perfect, Great and Good windows are 50/90/140 ms (Relaxed: 80/130/200 ms). Normal mode has an energy bar. Relaxed mode never fails and missed tiles don't break the combo. Stars come from accuracy: 50%, 75% and 90%.

## Files

| Path | What |
| --- | --- |
| `songs/songs.json` | The song list. A song kids can see needs `audio`, a `chart`, and `"published": true` in the chart. |
| `songs/*.chart.json` | Charts. Format is documented at the top of `js/chart.js`. |
| `songs/starlight-skip.*` | The original demo song. Its chart is generated from the song's own score, so it's exact. |
| `js/` | Game (`game.js`, `judge.js`), audio clock (`audio.js`), editor (`editor.js`), beat detector (`beats.js`). |
| `tools/draft-chart.mjs` | Command-line draft chart from an audio file (same detector as the editor). |
| `tools/make_demo.py`, `tools/demo-chart.mjs` | Rebuild the demo song and its chart. |

## Adding a song to the website (for every device)

1. Put the audio in `songs/` (MP3 or M4A), for example `songs/riptide.mp3`.
2. Make the chart. On a phone or iPad, open Grown-ups, tap *Add audio file* for the song, then *Edit chart*. Make the chart, review it, then use *Export chart file*. Or run `node tools/draft-chart.mjs songs/riptide.mp3 --id riptide --title "Riptide" --artist "Vance Joy" --out songs/riptide.chart.json` to get a starting draft, then review it in the editor.
3. In `songs/songs.json`, set that song's `"audio"` and `"chart"` paths.
4. The chart must have `"published": true`. Turning on *Kids can play* in the editor does this before you export.

## Checks

```
npm test          # unit tests: judging, chart helpers, beat detector
npm run e2e       # full phone-emulation run in Chromium (add --shots for screenshots, --device="iPad (gen 7) landscape")
npm run serve     # http://localhost:8790/tiles/
```

Automated tests run in Chromium with iPhone/iPad emulation. Real Safari on a real iPhone still needs a by-hand check, especially sound output delay.
