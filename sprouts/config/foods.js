// Sprout Pals — foods the pet can eat. INITIAL PLAYTEST SETTINGS — tune freely.
//
// hunger: tummy points this food can fill. Only the points actually filled count toward
//         evolution (a full pet that eats gets nothing — see config/evolution.js).
// happiness: bonus happy points.
// unlimited: always available without farming (the basic snack).
//
// How each food steers growth lives in config/evolution.js (FOOD_SCORES).

export const FOODS = {
  biscuit:    { label: 'Snack Biscuit', hunger: 15, happiness: 0, unlimited: true },
  strawberry: { label: 'Strawberry',    hunger: 20, happiness: 6 },
  peas:       { label: 'Peas',          hunger: 20, happiness: 2 },
  carrot:     { label: 'Carrot',        hunger: 25, happiness: 2 },
  blueberry:  { label: 'Blueberries',   hunger: 25, happiness: 6 },
  broccoli:   { label: 'Broccoli',      hunger: 30, happiness: 1 },
  pumpkin:    { label: 'Pumpkin',       hunger: 40, happiness: 4 },
};

export const FOOD_ORDER = ['biscuit', 'strawberry', 'peas', 'carrot', 'blueberry', 'broccoli', 'pumpkin'];
