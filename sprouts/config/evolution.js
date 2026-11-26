// Sprout Pals — what each pet can grow into, and how food steers it.
// INITIAL PLAYTEST SETTINGS — tune freely. All pets and names are original to Sprout Pals.
//
// HOW IT WORKS (modelled on the publicly described scoring approach of virtual-pet games):
//  * Every form lists `from`: the forms it can grow out of.
//  * Each time the pet eats, for every form it could grow into next:
//        score[form] += FOOD_SCORES[food][form] × hungerPointsActuallyFilled
//    (feeding a full pet fills 0 points, so it adds nothing).
//  * When the stage time is up, the eligible form with the highest score wins.
//    Ties are broken at random. The result is saved immediately.
//  * `unlock` (optional) makes a rare form eligible only when a condition is met.
//    Supported: { decoration: '<id>' }  — that farm decoration has been built
//               { raised: <n> }          — this player has already raised n grown-ups

export const FORMS = {
  // Baby
  puffkin:    { stage: 'baby',    name: 'Puffkin',    from: ['egg'],
                blurb: 'A round little puff, curious about everything.' },

  // Toddlers
  berrybun:   { stage: 'toddler', name: 'Berrybun',   from: ['puffkin'],
                blurb: 'Bouncy and sweet, with floppy berry ears.' },
  leafling:   { stage: 'toddler', name: 'Leafling',   from: ['puffkin'],
                blurb: 'Grows a tiny leaf that wiggles when happy.' },
  pebblepup:  { stage: 'toddler', name: 'Pebblepup',  from: ['puffkin'],
                blurb: 'Sturdy and snuggly, likes hearty food.' },

  // Teens
  jellyhop:   { stage: 'teen',    name: 'Jellyhop',   from: ['berrybun', 'leafling'],
                blurb: 'Hops everywhere. Wobbles when it lands.' },
  fernfox:    { stage: 'teen',    name: 'Fernfox',    from: ['leafling', 'pebblepup'],
                blurb: 'Quick and clever, with a frond for a tail.' },
  burrowbear: { stage: 'teen',    name: 'Burrowbear', from: ['pebblepup', 'berrybun'],
                blurb: 'Loves digging in the garden beds.' },

  // Grown-ups
  honeyhorn:  { stage: 'adult',   name: 'Honeyhorn',  from: ['jellyhop', 'burrowbear'],
                blurb: 'A gentle giant with a golden horn.' },
  mossdrake:  { stage: 'adult',   name: 'Mossdrake',  from: ['fernfox', 'jellyhop'],
                blurb: 'A friendly little dragon covered in soft moss.' },
  boulderback:{ stage: 'adult',   name: 'Boulderback',from: ['burrowbear', 'fernfox'],
                blurb: 'Strong, calm, and always up for a nap.' },
  starbloom:  { stage: 'adult',   name: 'Starbloom',  from: ['jellyhop', 'fernfox', 'burrowbear'],
                unlock: { decoration: 'moon-fountain' }, rare: true,
                blurb: 'A rare night-flower pet. Only appears near a Moon Fountain.' },
};

// FOOD_SCORES[food][form] — how strongly one tummy point of this food pulls toward that form.
// Missing entries count as 0. The free Snack Biscuit steers nothing.
export const FOOD_SCORES = {
  biscuit:    {},
  strawberry: { berrybun: 3, leafling: 0, pebblepup: 0, jellyhop: 3, fernfox: 0, burrowbear: 1,
                honeyhorn: 3, mossdrake: 1, boulderback: 0, starbloom: 1 },
  blueberry:  { berrybun: 2, leafling: 1, pebblepup: 0, jellyhop: 2, fernfox: 1, burrowbear: 0,
                honeyhorn: 1, mossdrake: 1, boulderback: 0, starbloom: 4 },
  peas:       { berrybun: 0, leafling: 3, pebblepup: 0, jellyhop: 1, fernfox: 3, burrowbear: 0,
                honeyhorn: 0, mossdrake: 3, boulderback: 1, starbloom: 1 },
  broccoli:   { berrybun: 0, leafling: 2, pebblepup: 1, jellyhop: 0, fernfox: 2, burrowbear: 1,
                honeyhorn: 0, mossdrake: 3, boulderback: 1, starbloom: 0 },
  carrot:     { berrybun: 1, leafling: 0, pebblepup: 3, jellyhop: 0, fernfox: 1, burrowbear: 3,
                honeyhorn: 1, mossdrake: 0, boulderback: 3, starbloom: 0 },
  pumpkin:    { berrybun: 0, leafling: 1, pebblepup: 2, jellyhop: 1, fernfox: 0, burrowbear: 2,
                honeyhorn: 2, mossdrake: 0, boulderback: 3, starbloom: 1 },
};
