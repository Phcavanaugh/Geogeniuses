// Draws a pet from parts: body + shared face (eyes, mouth, cheeks) + mood effects.
// Real art from assets/ is used part-by-part when present; otherwise the SVG placeholders.
// Blinking, bobbing, eating and other reactions are CSS animations on these parts.
import { Art } from './art.js';
import { petBodySvg, facePartSvg, eggCrackSvg, FACE, FX } from './placeholders.js';

const STAGE_SCALE = { egg: 0.8, baby: 0.62, toddler: 0.76, teen: 0.88, adult: 1 };

const MOOD_FACE = {
  happy:    { eyes: 'happy',  mouth: 'grin',   cheeks: true },
  content:  { eyes: 'open',   mouth: 'smile',  cheeks: true },
  hungry:   { eyes: 'open',   mouth: 'wobble' },
  sad:      { eyes: 'sad',    mouth: 'frown' },
  dirty:    { eyes: 'open',   mouth: 'flat',   fx: 'stink' },
  sleepy:   { eyes: 'sleepy', mouth: 'flat' },
  sleeping: { eyes: 'closed', mouth: 'oh',     fx: 'zzz', noBlink: true },
};

const part = (kind, name) => Art.html(kind === 'cheeks' ? 'face.cheeks' : `face.${kind}.${name}`, facePartSvg(kind, name));
const fx = name => Art.html(`fx.${name}`, FX[name]);

export function petHtml(pet, mood, { size = 'big' } = {}) {
  const stage = pet.stage;
  const scale = STAGE_SCALE[stage] || 1;
  if (stage === 'egg') {
    const taps = pet.hatchTaps || 0;
    const crack = taps >= 4 ? 2 : taps >= 2 ? 1 : 0;
    return `<div class="pet pet--egg pet--${size}" style="--scale:${scale}">
      <div class="pet-shadow"></div>
      <div class="pet-bob"><div class="pet-body">${Art.html('pet.egg.body', petBodySvg('egg'))}
        ${crack ? `<div class="pet-crack">${Art.html('pet.egg.crack' + crack, eggCrackSvg(crack))}</div>` : ''}</div></div></div>`;
  }
  const form = pet.form;
  const anchor = (Art.has(`pet.${form}.body`) && Art.entry(`pet.${form}.body`)?.faceAnchor) || FACE[form] || { x: 0.5, y: 0.6, s: 1 };
  const fs = anchor.scale || anchor.s || 1;
  const f = MOOD_FACE[mood] || MOOD_FACE.content;
  return `<div class="pet pet--${size} pet--${form} mood--${mood}" style="--scale:${scale}">
    <div class="pet-shadow"></div>
    <div class="pet-bob">
      <div class="pet-body">${Art.html(`pet.${form}.body`, petBodySvg(form))}</div>
      <div class="pet-face" style="left:${anchor.x * 100}%;top:${anchor.y * 100}%;--fs:${fs}">
        ${f.cheeks ? `<div class="face-part cheeks">${part('cheeks')}</div>` : ''}
        <div class="face-part eyes eyes-main${f.noBlink ? '' : ' blinks'}">${part('eyes', f.eyes)}</div>
        ${f.noBlink ? '' : `<div class="face-part eyes eyes-blink">${part('eyes', 'closed')}</div>`}
        <div class="face-part mouth mouth-main">${part('mouth', f.mouth)}</div>
        <div class="face-part mouth mouth-chomp">${part('mouth', 'chomp')}</div>
        <div class="face-part eyes eyes-joy">${part('eyes', 'happy')}</div>
      </div>
      ${f.fx ? `<div class="pet-fx fx-${f.fx}">${fx(f.fx)}</div>` : ''}
    </div>
  </div>`;
}

/** Thumbnail for lists (collection, guide). */
export function petThumb(form, { silhouette = false } = {}) {
  const pet = { stage: 'adult', form };
  return `<div class="thumb${silhouette ? ' silhouette' : ''}">${petHtml(pet, silhouette ? 'content' : 'happy', { size: 'thumb' })}</div>`;
}

/** Short reaction animations: 'eat' | 'play' | 'wash' | 'love' | 'grow' | 'no'. */
export function react(stageEl, kind) {
  const pet = stageEl.querySelector('.pet');
  if (!pet) return;
  pet.classList.remove('react-eat', 'react-play', 'react-wash', 'react-love', 'react-no', 'react-tap');
  void pet.offsetWidth;   // restart the animation
  pet.classList.add('react-' + kind);
  const burst = { play: ['ball', 'heart', 'heart'], wash: ['bubble', 'bubble', 'bubble', 'bubble', 'bubble'], love: ['heart', 'heart'], eat: ['heart'], tap: ['heart'] }[kind];
  if (burst) {
    burst.forEach((name, i) => {
      const el = document.createElement('div');
      el.className = `float-fx float-${name}`;
      el.style.left = `${30 + Math.random() * 40}%`;
      el.style.animationDelay = `${i * 0.12}s`;
      el.innerHTML = fx(name);
      stageEl.appendChild(el);
      setTimeout(() => el.remove(), 1800 + i * 120);
    });
  }
  clearTimeout(pet._rt);
  pet._rt = setTimeout(() => pet.classList.remove('react-' + kind), 1300);
}
