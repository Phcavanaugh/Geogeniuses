// Sprout Pals — the four needs, how fast they drop, and what care actions do.
// INITIAL PLAYTEST SETTINGS — tune freely.
//
// Every need runs from 0 (empty) to 100 (full).

export const NEEDS = ['hunger', 'happiness', 'hygiene', 'energy'];

export const NEED_INFO = {
  hunger:    { label: 'Tummy',  color: '#f28c28', icon: 'need-hunger' },
  happiness: { label: 'Happy',  color: '#ec5fa0', icon: 'need-happiness' },
  hygiene:   { label: 'Clean',  color: '#3fa7e0', icon: 'need-hygiene' },
  energy:    { label: 'Energy', color: '#f2c12e', icon: 'need-energy' },
};

// Points lost per hour while awake.
export const DECAY_PER_HOUR_AWAKE = { hunger: 6, happiness: 5, hygiene: 4, energy: 5 };

// Points lost per hour while asleep (energy goes UP instead — see SLEEP_ENERGY_PER_HOUR).
export const DECAY_PER_HOUR_ASLEEP = { hunger: 3, happiness: 1, hygiene: 2 };

// Energy gained per hour of sleep. The pet wakes on its own when energy reaches 100.
export const SLEEP_ENERGY_PER_HOUR = 30;

// Needs never fall below this, however long the game is closed. Pets never die or run away;
// a long absence just means a hungry, sleepy pet that is happy to see you.
export const NEED_FLOOR = 15;

// Levels used for colors and expressions.
export const LOW = 30;    // below this: warning color, sad/hungry/etc. face
export const GOOD = 60;   // above this: happy color

// Starting needs for a freshly hatched baby.
export const START_NEEDS = { hunger: 60, happiness: 70, hygiene: 80, energy: 80 };

// Care actions. Numbers are points added (negative = taken away).
export const PLAY = { happiness: 20, energy: -8, hygiene: -4, minEnergy: 12 };
export const WASH = { hygiene: 45, happiness: 3 };
export const MINIGAME_PLAY = { happiness: 15, energy: -5 };

// Away this many hours or more -> a "welcome back" message on return.
export const WELCOME_BACK_HOURS = 6;
