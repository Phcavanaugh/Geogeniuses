// Sprout Pals — life stages and how long each one lasts.
//
// ALL NUMBERS HERE ARE INITIAL PLAYTEST SETTINGS, not verified values from any other game.
// Published accounts of comparable games disagree about stage timing, so change freely.
//
// Durations are measured in real hours of time that has passed (including while the game is
// closed). When a stage's time is up the pet becomes "ready to grow" and waits for the child,
// so every growth moment is seen in person instead of happening while nobody is looking.

export const STAGE_ORDER = ['egg', 'baby', 'toddler', 'teen', 'adult'];

export const STAGE_LABELS = {
  egg: 'Egg',
  baby: 'Baby',
  toddler: 'Toddler',
  teen: 'Teen',
  adult: 'Grown-up',
};

// Hours spent in a stage before the pet is ready for the next one.
export const STAGE_HOURS = {
  baby: 4,      // baby -> toddler
  toddler: 36,  // toddler -> teen
  teen: 72,     // teen -> adult
};

// Taps needed to hatch the egg.
export const HATCH_TAPS = 6;

// Multiplies how fast growth time passes (1 = real time, 2 = twice as fast).
// Handy for a short playtest; does not affect crops or needs.
export const GROWTH_SPEED = 1;
