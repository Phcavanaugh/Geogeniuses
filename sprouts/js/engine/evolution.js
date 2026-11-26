// Evolution scoring. Pure functions: tables are passed in (defaults come from config) so the
// tests can use small made-up tables.
import { FORMS as DEFAULT_FORMS, FOOD_SCORES as DEFAULT_SCORES } from '../../config/evolution.js';
import { STAGE_ORDER } from '../../config/stages.js';

export function nextStage(stage) {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

/** Forms the pet could grow into next, ignoring unlock conditions. */
export function candidateForms(pet, forms = DEFAULT_FORMS) {
  const next = nextStage(pet.stage);
  if (!next) return [];
  const current = pet.stage === 'egg' ? 'egg' : pet.form;
  return Object.keys(forms).filter(id => forms[id].stage === next && (forms[id].from || []).includes(current));
}

/** Is a form's unlock condition met? ctx: { decorations: string[], raised: number } */
export function isUnlocked(form, ctx = {}) {
  const u = form && form.unlock;
  if (!u) return true;
  if (u.decoration && !(ctx.decorations || []).includes(u.decoration)) return false;
  if (u.raised != null && (ctx.raised || 0) < u.raised) return false;
  return true;
}

/**
 * Record one feeding. Adds foodScore × hungerRestored to every candidate form's score.
 * Mutates pet.evoScores. Returns the amounts added (for display/debugging).
 */
export function addFeedingScore(pet, foodId, hungerRestored, forms = DEFAULT_FORMS, scores = DEFAULT_SCORES) {
  const added = {};
  if (!(hungerRestored > 0)) return added;
  pet.evoScores = pet.evoScores || {};
  const table = scores[foodId] || {};
  for (const id of candidateForms(pet, forms)) {
    const amount = (Number(table[id]) || 0) * hungerRestored;
    pet.evoScores[id] = (pet.evoScores[id] || 0) + amount;
    added[id] = amount;
  }
  return added;
}

/**
 * Pick the next form: highest score among eligible candidates, ties broken by rng().
 * If every candidate is locked (shouldn't happen with sane config), falls back to unlocked-or-not.
 */
export function chooseNextForm(pet, ctx = {}, rng = Math.random, forms = DEFAULT_FORMS) {
  const candidates = candidateForms(pet, forms);
  if (!candidates.length) return null;
  let eligible = candidates.filter(id => isUnlocked(forms[id], ctx));
  if (!eligible.length) eligible = candidates;
  const scores = pet.evoScores || {};
  const best = Math.max(...eligible.map(id => scores[id] || 0));
  const tied = eligible.filter(id => (scores[id] || 0) === best);
  const pick = Math.min(tied.length - 1, Math.floor(rng() * tied.length));
  return tied[pick];
}
