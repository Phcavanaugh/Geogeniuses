// Builds assets/manifest.json (read by the game) and ASSETS.md (for the artist) from the game
// config, so the art list always matches the pets, crops and decorations that exist.
// Run:  node tools/asset-doc.mjs      (from the sprouts/ folder)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FORMS } from '../config/evolution.js';
import { CROPS, CROP_ORDER } from '../config/crops.js';
import { FOODS, FOOD_ORDER } from '../config/foods.js';
import { DECORATIONS, DECORATION_ORDER } from '../config/rewards.js';
import { NEEDS } from '../config/needs.js';
import { FACE } from '../js/ui/placeholders.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = [];
const add = (group, key, file, w, h, transparent, use, extra = {}) =>
  A.push({ group, key, file, size: [w, h], transparent, use, ...extra });

// Pets
add('Pets', 'pet.egg.body', 'pets/egg/body.png', 512, 512, true, 'The egg before hatching. Centered, bottom of egg ~6% above the image bottom.');
add('Pets', 'pet.egg.crack1', 'pets/egg/crack1.png', 512, 512, true, 'Small crack drawn over the egg after a few taps (same framing as the egg).');
add('Pets', 'pet.egg.crack2', 'pets/egg/crack2.png', 512, 512, true, 'Big cracks just before hatching (same framing as the egg).');
for (const [id, f] of Object.entries(FORMS)) {
  const a = FACE[id] || { x: 0.5, y: 0.6, s: 1 };
  add('Pets', `pet.${id}.body`, `pets/${id}/body.png`, 512, 512, true,
    `${f.name} (${f.stage}${f.rare ? ', rare' : ''}) body with NO eyes or mouth — the face is layered on by the game. ` +
    `Leave the face area plain. Feet on a line ~6% above the image bottom.`,
    { faceAnchor: { x: a.x, y: a.y, scale: a.s } });
}

// Face parts (shared by all pets, so every pet blinks and emotes the same way)
for (const e of ['open', 'closed', 'happy', 'sad', 'sleepy']) {
  add('Face parts', `face.eyes.${e}`, `face/eyes-${e}.png`, 360, 240, true,
    `Both eyes, ${e}. Eye centres at (28%, 37%) and (72%, 37%). Swapped in code for blinking and moods.`);
}
for (const m of ['smile', 'grin', 'frown', 'flat', 'chomp', 'wobble', 'oh']) {
  add('Face parts', `face.mouth.${m}`, `face/mouth-${m}.png`, 360, 240, true,
    `Mouth, ${m}. Centre at (50%, 75%) of the image; same canvas as the eyes so they stack exactly.`);
}
add('Face parts', 'face.cheeks', 'face/cheeks.png', 360, 240, true, 'Blush cheeks shown when happy. Same canvas as eyes.');

// Effects
for (const [k, w, use] of [
  ['zzz', 240, 'Floating "z z z" while asleep.'], ['stink', 240, 'Stink lines when dirty.'],
  ['heart', 120, 'Little heart that floats up when happy/played with.'], ['bubble', 120, 'Soap bubble for washing.'],
  ['sparkle', 120, 'Sparkle for growing up / rewards.'], ['ball', 120, 'Toy ball used when playing.'],
]) add('Effects', `fx.${k}`, `fx/${k}.png`, w, w, true, use);

// Crops & food
for (const c of CROP_ORDER) {
  for (let s = 0; s < 4; s++) {
    add('Crops', `crop.${c}.${s}`, `crops/${c}/stage-${s}.png`, 256, 256, true,
      `${CROPS[c].label}, growth stage ${s} (${['seed in soil', 'sprout', 'growing', 'ready to pick'][s]}). Bottom of stem at image bottom-centre; no soil patch (the plot draws soil).`);
  }
  add('Crops', `seed.${c}`, `crops/${c}/seeds.png`, 256, 256, true, `${CROPS[c].label} seed packet (used in the seed picker).`);
}
for (const f of FOOD_ORDER) add('Food', `food.${f}`, `food/${f}.png`, 256, 256, true, `${FOODS[f].label} as a food item in the feeding tray.`);

// Backgrounds
for (const [k, use] of [
  ['home', 'Title screen.'], ['room', "Pet's room (daytime). Floor should fill the bottom ~30%."],
  ['room-night', 'Same room at night (while asleep).'], ['farm', 'Farm screen; plots are drawn on top in the centre.'],
  ['meadow', 'Collection screen (where grown-ups live).'], ['bubbles', 'Bubble Pop minigame (sky/pond).'],
]) add('Backgrounds', `bg.${k}`, `backgrounds/${k}.jpg`, 2048, 1536, false,
  `${use} Shown with "cover" cropping on phones (portrait) and iPads (both orientations): keep important detail in the centre 50%.`);

// Decorations
for (const d of DECORATION_ORDER) add('Decorations', `decor.${d}`, `decor/${d}.png`, 384, 384, true, `${DECORATIONS[d].label} for the farm. Base at bottom-centre.`);
add('Farm', 'farm.plot', 'farm/plot.png', 320, 320, true, 'Empty soil plot (crops are drawn on top).');

// UI
add('UI', 'ui.logo', 'ui/logo.png', 1040, 340, true, 'Game logo on the title screen.');
add('UI', 'ui.star', 'ui/star.png', 128, 128, true, 'Star currency icon.');
for (const n of NEEDS) add('UI', `ui.need-${n}`, `ui/need-${n}.png`, 128, 128, true, `Icon for the ${n} need meter.`);
for (const a of ['feed', 'play', 'wash', 'sleep', 'wake']) add('UI', `ui.action-${a}`, `ui/action-${a}.png`, 128, 128, true, `Icon on the ${a} button (white or light, sits on a coloured button).`);
for (let i = 0; i < 6; i++) add('UI', `ui.avatar-${i}`, `ui/avatar-${i}.png`, 256, 256, true, `Player picture choice #${i + 1} (round).`);

const manifest = { note: 'Generated by tools/asset-doc.mjs — edit the config files or the tool, not this file.', version: 1, assets: A };
writeFileSync(join(root, 'assets/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

// Markdown for the artist
let md = `# Sprout Pals — art list (asset manifest)

_Generated by \`tools/asset-doc.mjs\` from the game config. Machine-readable copy: \`assets/manifest.json\`._

**Every file is optional.** Drop a finished file at the path shown (inside \`sprouts/assets/\`) and the game
uses it on the next load; any file that is missing falls back to the built-in placeholder drawing.

General rules
- PNG with transparency unless marked "no" (backgrounds are JPG). Use sRGB. Sizes are recommended canvas sizes; keep the aspect ratio.
- Pets are built from **parts**: a body with no face, plus shared eyes and mouths layered on top by the game. That lets the code animate blinking, eating and moods without sprite sheets. Keep every pet's style consistent (same line weight, lighting from the top-left).
- \`faceAnchor\` (pets) = where the centre of the face goes, as a fraction of the body image (x from left, y from top) and a size multiplier. If your drawing needs a different spot, change the number in \`js/ui/placeholders.js\` (FACE) and re-run this tool.
- Do not use any existing franchise's characters, names, artwork or logos.

App icons (not loaded through the manifest — replace these files directly): \`icons/icon-512.png\` (512×512), \`icons/icon-192.png\` (192×192), \`icons/icon-maskable-512.png\` (512×512, keep the artwork inside the centre 80%), \`icons/apple-touch-icon.png\` (180×180, no transparency).
`;
let group = '';
for (const a of A) {
  if (a.group !== group) { group = a.group; md += `\n## ${group}\n\n| File | Size | Transparent | Use |\n|---|---|---|---|\n`; }
  const anchor = a.faceAnchor ? ` Face anchor x ${a.faceAnchor.x}, y ${a.faceAnchor.y}, scale ${a.faceAnchor.scale}.` : '';
  md += `| \`${a.file}\` | ${a.size[0]}×${a.size[1]} | ${a.transparent ? 'yes' : 'no'} | ${a.use}${anchor} |\n`;
}
writeFileSync(join(root, 'ASSETS.md'), md);
console.log(`Wrote ${A.length} assets to assets/manifest.json and ASSETS.md`);
