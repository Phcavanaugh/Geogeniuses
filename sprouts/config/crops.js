// Sprout Pals — the six farm crops. INITIAL PLAYTEST SETTINGS — tune freely.
//
// growMinutes: real minutes from planting until ready to harvest (keeps counting while closed).
// Each crop shows 4 growth pictures: 0 seed, 1 sprout, 2 growing, 3 ready.
// harvest: how many food items one harvest gives. seedsBack: seeds returned on harvest
//          (at least 1, so the farm can never get stuck).

export const PLOT_COUNT = 6;

export const CROPS = {
  strawberry: { label: 'Strawberry', food: 'strawberry', growMinutes: 2,  harvest: 2, seedsBack: 1, color: '#e8424f' },
  peas:       { label: 'Peas',       food: 'peas',       growMinutes: 3,  harvest: 2, seedsBack: 1, color: '#6cbf3f' },
  carrot:     { label: 'Carrot',     food: 'carrot',     growMinutes: 5,  harvest: 2, seedsBack: 1, color: '#f28c28' },
  blueberry:  { label: 'Blueberry',  food: 'blueberry',  growMinutes: 20, harvest: 3, seedsBack: 1, color: '#4f63d8' },
  broccoli:   { label: 'Broccoli',   food: 'broccoli',   growMinutes: 30, harvest: 2, seedsBack: 1, color: '#2e8b46' },
  pumpkin:    { label: 'Pumpkin',    food: 'pumpkin',    growMinutes: 60, harvest: 2, seedsBack: 2, color: '#e9771c' },
};

export const CROP_ORDER = ['strawberry', 'peas', 'carrot', 'blueberry', 'broccoli', 'pumpkin'];

// Seeds every new player starts with.
export const START_SEEDS = { strawberry: 3, peas: 2, carrot: 2, blueberry: 1, broccoli: 1, pumpkin: 1 };

// Fraction of grow time at which each picture appears (stage 3 = ready at 1.0).
export const GROWTH_STAGE_AT = [0, 0.25, 0.6, 1];
