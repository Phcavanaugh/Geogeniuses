// Sprout Pals — farm decorations, the Bubble Pop minigame, and the grown-up goal.
// INITIAL PLAYTEST SETTINGS — tune freely.

// Decorations are built on the farm with stars earned in Bubble Pop.
// A decoration can also unlock a rare pet form (see `unlock` in config/evolution.js).
export const DECORATIONS = {
  'scarecrow':     { label: 'Scarecrow',     stars: 3 },
  'birdbath':      { label: 'Birdbath',      stars: 5 },
  'flower-arch':   { label: 'Flower Arch',   stars: 8 },
  'windmill':      { label: 'Windmill',      stars: 12 },
  'moon-fountain': { label: 'Moon Fountain', stars: 15, hint: 'Something rare might grow near it...' },
};
export const DECORATION_ORDER = ['scarecrow', 'birdbath', 'flower-arch', 'windmill', 'moon-fountain'];

// Bubble Pop: tap the floating bubbles before they drift away.
export const BUBBLE_POP = {
  seconds: 30,
  spawnEveryMs: 700,       // a new bubble this often
  riseSeconds: [5, 8],     // how long a bubble takes to float up (random in range)
  starChance: 0.25,        // chance a bubble holds a star instead of a seed
  seedWeights: { strawberry: 3, peas: 3, carrot: 3, blueberry: 2, broccoli: 2, pumpkin: 1 },
};

// Before a grown-up moves to the Meadow (the collection), the child finishes this small goal.
export const ADULT_GOAL = {
  title: 'Meadow party!',
  steps: [
    { action: 'feed', count: 3, label: 'Share 3 snacks' },
    { action: 'play', count: 3, label: 'Play 3 times' },
    { action: 'wash', count: 1, label: 'Get washed up' },
  ],
  rewardStars: 3,
};
