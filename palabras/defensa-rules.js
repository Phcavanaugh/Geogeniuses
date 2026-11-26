// ¡Defensa! — the rules: maps, towers, walls, critters, rounds and the game itself. No graphics here,
// so the same rules run in the 3D game (defensa3d.js) and in the balance tests (tests/defensa-sim.mjs).
//
// Scale: the numbers in the tables (ranges, speeds, sizes) are in "Bloons units" (BU), the same scale as
// Bloons TD 6, so they can be compared with that game. One board unit (about one tower wide) = U BU.
// The game itself works in board units: (0,0) is the top-left corner of the play area.
//
// How a game goes: one island, many rounds. Your towers, walls, coin trees and coins stay from round to
// round. Critters march along trails to a bowl of food. Each critter is one of Bloons' balloons: same speed,
// same toughness, and when it's knocked out the smaller critters inside come out (like a balloon's layers).
// Whatever reaches the food eats as many bites as it would take to knock it and everything inside it out.
// Each critter knocked out pays a coin; each round you finish pays 100 + the round. The rounds are Bloons TD 6's
// standard rounds, and Easy / Medium / Hard are Bloons' (4–5 plays Easy, 7 Medium, 10 Hard).

import { BT } from './defensa-bt.js?v=86';
export const U = 13.33;                                   // Bloons units per board unit
export const bu = v => v / U;                             // Bloons units → board units
export const COLS = 24, ROWS = 17, MARGIN = 1.1;          // play area 320×227 BU, landscape; the island reaches MARGIN past it

// ---------- maps ----------
// Each map has a bowl and four trails (corner points; corners get rounded). Trail 1 is open from round 1;
// the others open in later rounds (see AGES.paths).
// One winding trail per island, ending at the bowl. Its length is set so an ant (red balloon) on Easy takes about
// 37 seconds to walk it, the time Pete measured for a red balloon on a Bloons beginner map.
const JARDIN = {
  bowl: [12, 13.4],
  paths: [   // two loops: the trail crosses itself twice, like Bloons' "In The Loop"
    [[-.6,5],[10,5],[10,10],[5,10],[5,2.4],[16,2.4],[16,13.6],[20.7,13.6],[20.7,8.7],[12,8.7],[12,12.45]],
  ],
};
const flipX = m => ({ bowl: [COLS - m.bowl[0], m.bowl[1]], paths: m.paths.map(p => p.map(([x, y]) => [COLS - x, y])) });
const flipY = m => ({ bowl: [m.bowl[0], ROWS - m.bowl[1]], paths: m.paths.map(p => p.map(([x, y]) => [x, ROWS - y])) });
export const MAPS = [
  { id:'jardin', name:'El jardín', seed:11, ndeco:46, deco:['tree','tree','bush','flower','flower','mushroom','rock'],  ...JARDIN },
  { id:'playa',  name:'La playa',  seed:23, ndeco:40, deco:['palm','palm','shell','umbrella','crab','rock','starfish'], ...flipX(JARDIN) },
  { id:'nieve',  name:'La nieve',  seed:37, ndeco:44, deco:['pine','pine','pine','snowman','rock','snowpile'],          ...flipY(flipX(JARDIN)) },
];

// ---------- towers ----------
// Towers. Each has a Bloons twin and uses its exact numbers for every upgrade (from BT, in defensa-bt.js):
// gato = Dart Monkey, abeja = Tack Shooter, pulpo = Glue Gunner, dragón = Bomb Shooter, huerto = Banana Farm,
// búho = Ninja Monkey, pingüino = Ice Monkey, mago = Wizard Monkey, nido = Monkey Village. Costs and upgrade costs are Bloons'.
// Only some can see hidden critters, like Bloons: the owl, and the penguin / wizard / towers near a nest with the right upgrades.
// Shots fly straight like Bloons' darts and hit what they touch, up to their pierce. imm = balloon kinds they can't hurt
// ('lead' = snails, 'black' = spiders and zebras, 'purple' = bats, 'white' = sheep and zebras).
export const TOWERS = [
  { id:'gato', twin:'DartMonkey', name:'El gato', word:'w|🐱', cost:200, range:32, tip:'Lanza bolas de estambre. (No puede con los caracoles.)',
    paths:[ { name:'Rapidez',        steps:[ { cost:100, name:'Lanza rápido' }, { cost:190, name:'Lanza muy rápido' }, { cost:450, name:'Tres bolas' } ] },
            { name:'Bolas fuertes',  steps:[ { cost:140, name:'Bola puntiaguda' }, { cost:200, name:'Bola muy puntiaguda' }, { cost:320, name:'Bola gigante' } ] } ] },
  { id:'abeja', twin:'TackShooter', name:'La abeja', word:'w|🐝', cost:260, range:23, tip:'Lanza aguijones a todos lados. (No puede con los caracoles.)',
    paths:[ { name:'Más aguijones',   steps:[ { cost:150, name:'Más aguijones' }, { cost:150, name:'Muchos aguijones' }, { cost:450, name:'Lluvia de aguijones' } ] },
            { name:'Más rápida',      steps:[ { cost:150, name:'Más rápida' }, { cost:220, name:'Muy rápida' }, { cost:600, name:'Aguijones de fuego' } ] } ] },
  { id:'pulpo', twin:'GlueGunner', name:'El pulpo', word:'w|🐙', cost:225, range:46, tip:'Echa tinta: ¡los bichos van más lentos! (A los jefes no les pega.)',
    paths:[ { name:'Tinta pegajosa',  steps:[ { cost:280, name:'Tinta que dura' }, { cost:400, name:'Tinta más pegajosa' }, { cost:3600, name:'Tinta para jefes' } ] },
            { name:'Tinta ácida',     steps:[ { cost:200, name:'Tinta que empapa' }, { cost:300, name:'Tinta ácida' }, { cost:2000, name:'Tinta que disuelve' } ] } ] },
  { id:'dragon', twin:'BombShooter', name:'El dragón', word:'w|🐉', cost:375, range:40, tip:'Echa bolas de fuego que explotan. (No puede con las arañas ni las cebras.)',
    paths:[ { name:'Fuego grande',    steps:[ { cost:250, name:'Fuego grande' }, { cost:650, name:'Fuego pesado' }, { cost:1100, name:'Fuego enorme' } ] },
            { name:'Fuego rápido',    steps:[ { cost:250, name:'Más rápido' }, { cost:400, name:'Fuego veloz' }, { cost:1000, name:'Fuego contra jefes' } ] } ] },
  { id:'huerto', twin:'BananaFarm', name:'El huerto', word:'c|¡El huerto!', cost:1250, range:0, farm:80, tip:'Un manzano: da monedas al final de cada ronda.',
    paths:[ { name:'Más manzanas',    steps:[ { cost:500, name:'Más manzanas' }, { cost:600, name:'Muchas manzanas' }, { cost:3000, name:'Gran huerto' } ] },
            { name:'Manzanas de oro', steps:[ { cost:300, name:'Manzanas que duran' }, { cost:800, name:'Manzanas de oro' }, { cost:3650, name:'Alcancía' } ] } ] },
  { id:'buho', twin:'NinjaMonkey', name:'El búho', word:'w|🦉', cost:400, range:40, sees:true, tip:'Ve a los bichos escondidos y les tira plumas. (Los otros animales no los ven.)',
    paths:[ { name:'Plumas',          steps:[ { cost:350, name:'Búho veloz' }, { cost:350, name:'Plumas afiladas' }, { cost:900, name:'Dos plumas' } ] },
            { name:'Trucos',          steps:[ { cost:250, name:'Susto' }, { cost:400, name:'¡Te vi!' }, { cost:1200, name:'Escuela de búhos' } ] } ] },
  { id:'pinguino', twin:'IceMonkey', name:'El pingüino', word:'w|🐧', cost:400, range:20, tip:'Congela a los bichos cerca. (No a las ovejas ni a los caracoles.)',
    paths:[ { name:'Más frío',        steps:[ { cost:200, name:'Hielo rápido' }, { cost:300, name:'Hielo profundo' }, { cost:2750, name:'Viento ártico' } ] },
            { name:'Hielo mágico',    steps:[ { cost:150, name:'Escarcha' }, { cost:350, name:'Frío que todo lo ve' }, { cost:1500, name:'Trozos de hielo' } ] } ] },
  { id:'mago', twin:'WizardMonkey', name:'El zorro mago', word:'w|🦊', cost:250, range:40, tip:'Lanza magia. (La magia no les hace nada a los caracoles ni a los murciélagos.)',
    paths:[ { name:'Magia fuerte',    steps:[ { cost:175, name:'Magia que persigue' }, { cost:450, name:'Rayo mágico' }, { cost:1450, name:'Gran mago' } ] },
            { name:'Ojos mágicos',    steps:[ { cost:300, name:'Magia intensa' }, { cost:300, name:'Ve lo escondido' }, { cost:1500, name:'Brillo' } ] } ] },
  { id:'nido', twin:'MonkeyVillage', name:'El nido', word:'c|¡El nido!', cost:1200, range:40, support:true, tip:'Ayuda a los animales cerca: llegan más lejos.',
    paths:[ { name:'Pájaros',         steps:[ { cost:400, name:'Nido grande' }, { cost:1500, name:'Tambores' }, { cost:800, name:'Entrenamiento' } ] },
            { name:'Vigías',          steps:[ { cost:250, name:'Sin crecer' }, { cost:2000, name:'Radar' }, { cost:7500, name:'Oficina secreta' } ] } ] },
];
// Bloons' "primary" towers (the nest's top "Entrenamiento" helps only these)
export const PRIMARY = ['gato', 'abeja', 'pulpo', 'dragon', 'pinguino'];
export const SIZE = 12;

// one-tap powers: a tower at the top of either path (step 3) gets one. cd = seconds (of a round) before it can be used again.
export const POWERS = {
  gato:   { name:'¡Lluvia de estambre!', cd:40, tip:'Todos los gatos lanzan muy rápido un ratito.' },
  abeja:  { name:'¡Enjambre!',           cd:45, tip:'Las abejas pican a todos los bichos.' },
  pulpo:  { name:'¡Mar de tinta!',       cd:45, tip:'Todos los bichos van muy lentos.' },
  dragon: { name:'¡Volcán!',             cd:50, tip:'Fuego enorme alrededor de cada dragón dorado.' },
  huerto: { name:'¡Cosecha!',            cd:60, tip:'¡Monedas ahora mismo!' },
  buho:   { name:'¡Todos a la vista!',   cd:45, tip:'Todos ven a los escondidos un ratito.' },
};                                   // how wide a tower is, in BU (like Bloons' basic tower)

// la cerca (ours — Bloons has no fences): goes on a trail; critters stop and chew through it (bats fly over).
// hp is in bites; it stays chewed between rounds and is gone once broken. Upgrades: barbed wire hurts the critters
// chewing on it (a sharp hit: not snails); electric zaps critters near it (snaps don't hurt bats — Bloons' purple).
export const WALL = { id:'cerca', name:'La cerca', word:'c|¡La cerca!', cost:120, hp:30, tip:'Ponla en el camino: los bichos tienen que pararse y morderla.',
  paths:[ { name:'Alambre de púas', steps:[ { cost:150, name:'Alambre de púas', hp:20, spike:1 }, { cost:350, name:'Púas largas', hp:40, spike:2 }, { cost:900, name:'Púas de acero', hp:80, spike:5 } ] },
          { name:'Cerca eléctrica', steps:[ { cost:200, name:'Cerca eléctrica', hp:10, zap:{ cd:1, dmg:1, pierce:2, range:1 } }, { cost:450, name:'Más voltaje', hp:20, zap:{ cd:.6, dmg:1, pierce:4, range:1.2 } },
                                            { cost:1200, name:'Rayo', hp:40, zap:{ cd:.4, dmg:2, pierce:8, range:1.5 } } ] } ] };

// ---------- critters ----------
// Each critter is a Bloons balloon (named in "bloon"): hp = hits to knock it out (fort = when it's fortified),
// speed in BU per second, kids = what comes out when it's knocked out, props = Bloons properties (which hits can't hurt it).
// fly: goes over fences (our rule — Bloons has no fences). boss: the big ones (Bloons' MOAB class).
export const FOES = {
  hormiga:    { bloon:'Red',     name:'la hormiga',     word:'w|🐜', hp:1,    speed:25,   size:.62, kids:[] },
  raton:      { bloon:'Blue',    name:'el ratón',       word:'w|🐭', hp:1,    speed:35,   size:.7,  kids:['hormiga'] },
  rana:       { bloon:'Green',   name:'la rana',        word:'w|🐸', hp:1,    speed:45,   size:.7,  kids:['raton'] },
  pollito:    { bloon:'Yellow',  name:'el pollito',     word:'w|🐤', hp:1,    speed:80,   size:.64, kids:['rana'] },
  conejo:     { bloon:'Pink',    name:'el conejo',      word:'w|🐰', hp:1,    speed:87.5, size:.72, kids:['pollito'] },
  arana:      { bloon:'Black',   name:'la araña',       word:'w|🕷️', hp:1,    speed:45,   size:.64, kids:['conejo', 'conejo'], props:['black'] },
  oveja:      { bloon:'White',   name:'la oveja',       word:'w|🐑', hp:1,    speed:50,   size:.76, kids:['conejo', 'conejo'], props:['white'] },
  murcielago: { bloon:'Purple',  name:'el murciélago',  word:'w|🦇', hp:1,    speed:75,   size:.7,  kids:['conejo', 'conejo'], props:['purple'], fly:true },
  caracol:    { bloon:'Lead',    name:'el caracol',     word:'w|🐌', hp:1,    fort:4,     speed:25, size:.72, kids:['arana', 'arana'], props:['lead'] },
  cebra:      { bloon:'Zebra',   name:'la cebra',       word:'w|🦓', hp:1,    speed:45,   size:.8,  kids:['arana', 'oveja'], props:['black', 'white'] },
  mapache:    { bloon:'Rainbow', name:'el mapache',     word:'w|🦝', hp:1,    speed:55,   size:.8,  kids:['cebra', 'cebra'] },
  cocodrilo:  { bloon:'Ceramic', name:'el cocodrilo',   word:'w|🐊', hp:10,   fort:20,    speed:62.5, size:.86, kids:['mapache', 'mapache'] },
  oso:        { bloon:'MOAB',    name:'el oso',         word:'w|🐻', hp:200,  fort:400,   speed:25,   size:1.15, boss:true, kids:['cocodrilo', 'cocodrilo', 'cocodrilo', 'cocodrilo'] },
  elefante:   { bloon:'BFB',     name:'el elefante',    word:'w|🐘', hp:700,  fort:1400,  speed:6.25, size:1.5,  boss:true, kids:['oso', 'oso', 'oso', 'oso'] },
  dino:       { bloon:'ZOMG',    name:'el dinosaurio',  word:'w|🦖', hp:4000, fort:8000,  speed:4.5,  size:1.85, boss:true, kids:['elefante', 'elefante', 'elefante', 'elefante'] },
};
// regrow critters grow back one step every 3 seconds (up to what they started as), like Bloons' regrow balloons
export const GROWS = { hormiga:'raton', raton:'rana', rana:'pollito', pollito:'conejo', conejo:'arana', arana:'cebra', oveja:'cebra', cebra:'mapache', mapache:'cocodrilo' };
const GROW_RANK = ['hormiga', 'raton', 'rana', 'pollito', 'conejo', 'arana', 'oveja', 'cebra', 'mapache', 'cocodrilo'];
export const REGROW_S = 3;
// hits to knock out a critter and everything inside it (Bloons' RBE); fortified bosses carry fortified bosses / crocodiles
export const hpOf = (k, fort) => fort && FOES[k].fort ? FOES[k].fort : FOES[k].hp;
export const rbeOf = (k, fort = false) => hpOf(k, fort) + FOES[k].kids.reduce((s, c) => s + rbeOf(c, fort && !!FOES[k].boss), 0);
for(const f of Object.values(FOES)) f.pts = 1;      // one point per pop (like Bloons)

// Bloons TD 6 standard rounds 1–80 (default round set), each balloon swapped for its critter:
// [critter, how many, first at (s), last at (s), hidden?, regrow?, fortified?]
const ROUNDS = [
  [["hormiga",20,0.0,17.51]],
  [["hormiga",35,0.0,19.0]],
  [["hormiga",10,0.0,5.1],["raton",5,5.7,7.95],["hormiga",15,9.71,16.71]],
  [["hormiga",25,0.0,12.0],["raton",18,7.9,10.4],["hormiga",10,14.51,17.31]],
  [["raton",12,0.0,5.14],["hormiga",5,5.7,7.98],["raton",15,8.6,16.5]],
  [["rana",4,0.0,1.71],["hormiga",15,5.33,10.33],["raton",15,10.8,18.7]],
  [["raton",10,0.0,5.14],["rana",5,5.7,10.65],["hormiga",20,11.81,22.65],["raton",10,22.81,26.8]],
  [["raton",20,0.0,10.84],["rana",2,11.42,11.99],["hormiga",10,14.03,16.0],["rana",12,18.27,28.87]],
  [["rana",30,0.0,18.95]],
  [["raton",60,0.0,35.0],["raton",20,35.0,44.0],["raton",22,44.0,47.99]],
  [["pollito",3,0.0,1.0],["rana",12,4.47,10.75],["raton",10,10.87,14.67],["hormiga",10,14.59,19.16]],
  [["rana",10,0.0,5.13],["raton",15,5.7,11.77],["pollito",5,14.27,17.39]],
  [["raton",50,0.0,30.0],["rana",23,2.21,32.21]],
  [["hormiga",18,0.0,9.71],["hormiga",31,9.5,26.63],["raton",5,2.85,3.97],["raton",10,15.96,17.34],["rana",5,5.71,6.83],["rana",5,19.84,21.22],["pollito",4,8.56,9.51],["pollito",5,23.71,25.26]],
  [["hormiga",20,0.0,25.0],["conejo",5,17.55,20.55],["rana",12,5.68,20.68],["pollito",10,8.87,20.87],["raton",15,2.78,22.78]],
  [["rana",20,0.0,10.85],["pollito",8,14.59,16.02],["rana",20,0.2,11.05]],
  [["pollito",12,0.0,5.0,0,1,0]],
  [["rana",60,0.0,25.0],["rana",20,25.0,26.82]],
  [["rana",10,0.0,2.89],["pollito",5,2.85,5.19,0,1,0],["conejo",15,5.96,13.57],["pollito",4,13.48,15.76]],
  [["arana",6,0.0,5.25]],
  [["conejo",10,10.84,15.98],["conejo",4,16.68,18.12],["pollito",40,0.09,10.09]],
  [["oveja",16,0.0,8.0]],
  [["arana",7,0.0,2.5],["oveja",7,4.82,6.82]],
  [["rana",1,0.0,1.0,1,0,0],["raton",20,3.0,9.0]],
  [["pollito",25,0.0,14.0,0,1,0],["murcielago",10,17.14,21.14]],
  [["conejo",23,0.0,8.7],["cebra",4,11.08,14.51]],
  [["pollito",45,26.53,34.26],["rana",45,19.05,26.4],["raton",60,11.54,19.54],["hormiga",100,0.02,12.02]],
  [["caracol",6,0.0,5.0]],
  [["pollito",50,0.0,11.0],["pollito",15,12.75,15.25,0,1,0]],
  [["caracol",9,0.0,13.07]],
  [["cebra",8,6.16,11.25],["cebra",2,14.2,15.91,0,1,0],["arana",8,0.0,5.09],["oveja",8,0.35,5.44]],
  [["arana",15,0.0,9.0],["oveja",20,10.34,21.34],["murcielago",10,21.96,27.96]],
  [["pollito",13,5.34,25.34,1,0,0],["hormiga",20,0.0,5.0,1,0,0]],
  [["pollito",160,0.0,36.0],["cebra",6,8.62,26.7]],
  [["oveja",25,0.0,10.03],["mapache",5,14.35,16.64],["conejo",35,19.21,26.21],["arana",30,26.76,33.76]],
  [["conejo",40,0.0,1.51],["conejo",40,8.49,9.84],["conejo",60,16.99,20.99],["rana",10,4.01,5.36,1,1,0],["rana",10,12.67,14.02,1,1,0]],
  [["arana",25,0.0,10.85],["oveja",25,11.42,22.27],["caracol",15,22.84,30.83],["cebra",10,31.41,36.54],["oveja",7,41.92,43.51,1,0,0]],
  [["oveja",17,0.0,3.6],["caracol",14,4.83,13.4],["cebra",10,12.09,18.37],["cocodrilo",2,27.06,29.06],["conejo",42,2.0,25.41]],
  [["arana",10,0.0,5.14],["oveja",10,5.71,10.85],["mapache",2,35.93,37.93,0,1,0],["cebra",20,12.79,23.64],["mapache",18,24.79,34.5]],
  [["oso",1,0.0,1.0]],
  [["arana",60,0.0,18.77],["cebra",60,18.85,46.2]],
  [["mapache",6,0.0,5.0,0,1,0],["mapache",5,6.6,11.6,1,0,0]],
  [["mapache",10,0.0,5.14],["cocodrilo",7,3.55,9.26]],
  [["cebra",10,0.0,10.0],["cebra",10,9.92,16.92],["cebra",10,16.83,20.83],["cebra",10,20.75,22.75],["cebra",10,22.67,23.67]],
  [["mapache",25,0.0,13.7],["conejo",180,18.08,53.08],["caracol",4,50.6,53.1,0,0,1],["murcielago",10,14.35,17.35,1,0,0]],
  [["cocodrilo",6,0.0,7.0,0,0,1]],
  [["cocodrilo",12,0.0,6.28],["conejo",70,6.5,24.65,1,0,0]],
  [["conejo",40,0.0,15.0,0,1,0],["mapache",40,30.54,50.54],["cocodrilo",3,51.72,55.72,0,0,1],["murcielago",30,15.29,30.29,1,1,0]],
  [["mapache",10,4.0,9.14],["mapache",10,40.1,45.24],["mapache",10,41.38,46.52,0,1,0],["cocodrilo",18,15.5,22.04],["cebra",20,29.27,32.79],["rana",343,0.0,50.0]],
  [["oso",1,0.0,1.0],["oso",1,27.98,28.98],["caracol",8,3.06,7.06,0,0,1],["hormiga",20,9.89,11.23],["cocodrilo",20,16.56,27.41]],
  [["cocodrilo",15,0.0,18.0,1,0,0],["mapache",10,19.0,24.14,0,1,0]],
  [["mapache",25,0.0,13.7],["oso",1,14.27,15.27],["oso",1,17.7,18.7],["cocodrilo",5,14.85,17.13],["cocodrilo",5,18.27,20.56]],
  [["conejo",80,0.0,35.0,1,0,0],["oso",1,19.61,20.61],["oso",1,27.07,28.07],["oso",1,31.08,32.08]],
  [["cocodrilo",35,0.0,19.41],["oso",1,6.23,7.23],["oso",1,11.99,12.99]],
  [["oso",1,28.78,29.78],["cocodrilo",10,0.0,1.16],["cocodrilo",10,7.83,9.3],["cocodrilo",10,14.42,15.89],["cocodrilo",15,22.17,23.07]],
  [["mapache",40,0.0,12.0,1,0,0],["oso",1,15.18,16.18]],
  [["oso",2,0.0,0.57],["oso",2,12.56,13.13],["mapache",40,0.97,26.23]],
  [["oso",5,0.0,43.98],["cocodrilo",15,0.0,22.0],["cocodrilo",10,23.53,43.53,0,0,1]],
  [["cocodrilo",20,0.0,10.0],["caracol",50,10.17,17.62,1,0,0],["cocodrilo",10,18.16,26.16,0,1,0]],
  [["elefante",1,0.0,1.0]],
  [["cebra",150,0.0,20.0,0,1,0],["oso",5,1.92,15.95]],
  [["oso",5,1.08,21.08],["murcielago",250,0.0,40.0],["mapache",15,40.3,48.29,1,1,0],["oso",2,32.14,37.14,0,0,1]],
  [["cocodrilo",40,3.88,4.08],["cocodrilo",40,20.08,20.28],["cocodrilo",42,36.42,36.62],["caracol",75,0.0,42.25]],
  [["oso",6,0.0,4.0],["oso",3,5.53,9.53,0,0,1]],
  [["cebra",100,0.0,32.36],["mapache",70,32.6,46.9],["cocodrilo",50,47.32,58.17],["oso",3,58.57,59.14],["elefante",2,60.0,62.0]],
  [["oso",2,0.0,0.5],["oso",2,7.0,7.5],["oso",4,13.92,14.92],["oso",3,20.75,22.75,0,0,1]],
  [["oso",4,0.0,2.28],["oso",4,24.15,26.44],["cocodrilo",13,9.1,17.09,1,1,1]],
  [["oso",4,0.0,1.71],["elefante",1,7.44,8.44]],
  [["caracol",40,0.0,16.56,0,0,1],["cocodrilo",50,17.13,42.13],["arana",40,5.46,15.46,0,1,0]],
  [["mapache",200,0.0,40.0],["oso",4,40.0,41.14],["oveja",120,0.0,38.0,1,1,0]],
  [["oso",10,4.42,9.42],["cocodrilo",30,0.0,16.55]],
  [["elefante",1,3.42,3.92],["elefante",1,16.12,16.62],["cocodrilo",38,0.0,21.7,0,1,0]],
  [["oso",7,0.0,2.28],["oso",1,26.38,26.95],["elefante",2,13.4,16.4]],
  [["cocodrilo",50,0.0,20.0],["cocodrilo",60,54.86,82.39,0,0,1],["elefante",1,43.93,44.43],["cocodrilo",25,21.14,41.14,1,1,1]],
  [["elefante",1,0.0,0.1],["elefante",3,9.71,9.81],["elefante",3,22.49,22.59],["caracol",14,0.57,7.99],["caracol",14,10.28,17.7,0,0,1],["oso",1,8.72,9.29,0,0,1],["oso",2,18.27,21.27,0,0,1]],
  [["cocodrilo",60,0.0,1.78,0,1,0]],
  [["oso",11,0.0,58.92],["elefante",5,26.67,31.22]],
  [["mapache",150,0.0,90.0],["cocodrilo",75,10.0,11.17],["cocodrilo",72,77.92,79.12,1,0,0],["elefante",1,44.08,45.8],["murcielago",80,64.4,79.4]],
  [["mapache",500,0.0,60.0,0,1,0],["elefante",4,3.17,38.17],["elefante",2,47.22,57.22,0,0,1]],
  [["dino",1,0.0,2.0]],
];

export const roundRBE = r => (ROUNDS[r - 1] || []).reduce((s, [k, n, , , , , fort]) => s + n * rbeOf(k, !!fort), 0);
// the round each critter first comes (for the "¡Cuidado!" banner), and the first round with hidden ones
const FIRST = {}; ROUNDS.forEach((g, i) => g.forEach(([k]) => { if(!(k in FIRST)) FIRST[k] = i + 1; }));
export const FIRST_HIDDEN = ROUNDS.findIndex(g => g.some(x => x[4])) + 1;
// Bloons pays less for each pop late in the game
export const popCash = r => r <= 50 ? 1 : r <= 60 ? .5 : r <= 85 ? .2 : .1;

// Bloons' difficulties: 4–5 plays Easy, 7 Medium, 10 Hard. lives = bites of food; rounds = the round that wins the island;
// start = first round; price = cost multiplier; speed = how fast critters move (Easy = 1).
// Ours, not Bloons': unlock = the round each tower (in TOWERS order) arrives. (paths: the island has one trail, open from the start.)
export const AGES = {
   4:{ mode:'Fácil',   lives:200, cash:650, price:.85, speed:1,    start:1, rounds:40, paths:[1], unlock:[1,2,4,8,6,15,5,3,10] },
   7:{ mode:'Normal',  lives:150, cash:650, price:1,   speed:1.1,  start:1, rounds:60, paths:[1], unlock:[1,3,6,10,8,13,7,5,12] },
  10:{ mode:'Difícil', lives:100, cash:650, price:1.08, speed:1.25, start:3, rounds:80, paths:[1], unlock:[1,4,8,12,10,14,9,6,13] },
};

export const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
export const unlocked = (r, age) => TOWERS.map((t, i) => r >= AGES[age].unlock[i]);
export const pathsFor = (r, age) => AGES[age].paths.filter(p => r >= p).length;
export const newPath = (r, age) => r > 1 && AGES[age].paths.includes(r);
export const roundBonus = r => 100 + r;

// trail through the corner points, with rounded corners
function buildPath(pts){
  const out = [pts[0]];
  for(let i = 1; i < pts.length - 1; i++){
    const [ax, ay] = pts[i-1], [bx, by] = pts[i], [cx, cy] = pts[i+1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), r = Math.min(1, l1 / 2, l2 / 2);
    const e = [bx - (bx - ax) / l1 * r, by - (by - ay) / l1 * r], x = [bx + (cx - bx) / l2 * r, by + (cy - by) / l2 * r];
    for(let k = 0; k <= 8; k++){ const t = k / 8, u = 1 - t; out.push([u*u*e[0] + 2*u*t*bx + t*t*x[0], u*u*e[1] + 2*u*t*by + t*t*x[1]]); }
  }
  out.push(pts[pts.length-1]); return out;
}
export function distToPath(path, x, y){
  let best = 1e9;
  for(let i = 0; i < path.length - 1; i++){
    const [ax, ay] = path[i], [bx, by] = path[i+1], dx = bx - ax, dy = by - ay, l = dx*dx + dy*dy;
    const t = l ? Math.max(0, Math.min(1, ((x - ax)*dx + (y - ay)*dy) / l)) : 0, px = ax + dx*t - x, py = ay + dy*t - y;
    const d = px*px + py*py; if(d < best) best = d;
  }
  return Math.sqrt(best);
}
export const distToPaths = (paths, x, y) => paths.reduce((m, p) => Math.min(m, distToPath(p, x, y)), 1e9);
function project(path, x, y){
  let best = { d: 0, dist: 1e9 }, at = 0;
  for(let i = 0; i < path.length - 1; i++){
    const [ax, ay] = path[i], [bx, by] = path[i+1], dx = bx - ax, dy = by - ay, l2 = dx*dx + dy*dy, l = Math.sqrt(l2);
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax)*dx + (y - ay)*dy) / l2)) : 0, dist = Math.hypot(ax + dx*t - x, ay + dy*t - y);
    if(dist < best.dist) best = { d: at + t*l, dist };
    at += l;
  }
  return best;
}
export const PATH_HALF = .5;        // half the width of a trail (≈ 13 BU)
export const BOWL_R = .95;

export function prepMap(m){
  const paths = m.paths.map(buildPath), bowl = m.bowl;
  const R = rng(m.seed), deco = []; let guard = 0;
  while(deco.length < m.ndeco && guard++ < 8000){
    const x = -.5 + R()*(COLS + 1), y = -.5 + R()*(ROWS + 1);
    if(distToPaths(paths, x, y) < .9 || Math.hypot(x - bowl[0], y - bowl[1]) < 1.8) continue;
    if(paths.some(p => Math.hypot(x - p[0][0], y - p[0][1]) < 1.2)) continue;
    if(deco.some(d => Math.hypot(d.x - x, d.y - y) < 1.3)) continue;
    deco.push({ x, y, kind: m.deco[Math.floor(R()*m.deco.length)], rot: R()*6.28, s: .85 + R()*.3 });
  }
  return { ...m, allPaths: paths, deco, bowl };
}

// what comes in round r: Bloons' round, group by group, at Bloons' times; the critters take turns on the open trails
export function makeWave(r, age){
  const np = pathsFor(r, age), out = []; let n = 0;
  for(const [k, count, t0, t1, h, regrow, fort] of ROUNDS[r - 1] || []) for(let i = 0; i < count; i++)
    out.push({ k, t: t0 + (count > 1 ? i * (t1 - t0) / (count - 1) : 0), h: !!h, regrow: !!regrow, fort: !!fort, boss: !!FOES[k].boss });
  out.sort((a, b) => a.t - b.t); for(const s of out) s.p = n++ % np;
  return out;
}
export const firstHidden = r => r === FIRST_HIDDEN;
export function newFoes(r){ return Object.keys(FIRST).filter(k => FIRST[k] === r && r > 1); }

// ---------- the game ----------
const SAVE_V = 4;                    // bump when saved games no longer fit (v3: one-trail maps; v4: fences with upgrade paths)
let uid = 0;
const nid = () => ++uid;
export class Game {
  // a new game on map m (index) for an age; or restore one from saved data
  constructor(age, mapIndex = 0, saved = null){
    const A = AGES[age] || AGES[7];
    this.age = age; this.A = A; this.mapIndex = mapIndex;
    this.map = prepMap(MAPS[mapIndex % MAPS.length]);
    this.lastRound = A.rounds;
    this.r = A.start; this.lives = A.lives; this.maxLives = A.lives; this.coins = A.cash; this.points = 0;
    this.towers = []; this.walls = []; this.foes = []; this.shots = [];
    this.fx = []; this.time = 0;
    if(saved && saved.v === SAVE_V) this.load(saved);      // a game saved on the old maps starts fresh
    this.startRound();
  }
  price(c){ return Math.round(c * this.A.price / 5) * 5; }
  // ----- saving: everything needed to come back to this island later -----
  save(){
    return { v:SAVE_V, age:this.age, map:this.mapIndex, r:this.r,  lives:this.lives, coins:this.coins, points:this.points,
      towers:this.towers.map(t => ({ i:t.i, x:t.x, y:t.y, a:t.a, b:t.b, spent:t.spent, target:t.target })),
      walls:this.walls.map(w => ({ p:w.p, d:w.d, a:w.a, b:w.b, hp:w.hp, spent:w.spent })) };
  }
  load(s){
    Object.assign(this, { r:s.r, lives:s.lives, coins:s.coins, points:s.points || 0 });
    this.towers = (s.towers || []).map(t => ({ ...t, id:nid(), lvl:1 + Math.max(t.a, t.b), cd:0, aim:Math.PI, shotAt:-9, target:t.target || 'first' }));
    this.walls = (s.walls || []).map(w => ({ ...w, id:nid(), wall:true, cd:0, max:this.wallStat(w).max }));
    // if the trail moved (a map was redrawn), anything that no longer fits goes back to the shop: full refund
    const keep = [];
    for(const t of this.towers){ const others = this.towers; this.towers = keep; const why = this.whyNot(t.x, t.y); this.towers = others;
      if(why) this.coins += t.spent || 0; else keep.push(t); }
    this.towers = keep;
    const plen = P => P.reduce((t, q, k) => k ? t + Math.hypot(q[0] - P[k-1][0], q[1] - P[k-1][1]) : 0, 0);
    this.walls = this.walls.filter(w => { const P = this.allPaths()[w.p || 0], ok = P && w.d < plen(P) - 1.4; if(!ok) this.coins += w.spent || 0; return ok; });
  }
  startRound(){
    const r = this.r;
    this.np = pathsFor(r, this.age); this.un = unlocked(r, this.age);
    this.paths = this.map.allPaths.slice(0, this.np).map(P => {
      const seg = []; let tot = 0;
      for(let i = 0; i < P.length - 1; i++){ const [x1, y1] = P[i], [x2, y2] = P[i+1], l = Math.hypot(x2-x1, y2-y1); seg.push({ x1, y1, x2, y2, l, at: tot }); tot += l; }
      return { P, seg, len: tot, start: P[0] };
    });
    this.bowl = this.map.bowl;
    for(const w of this.walls){ const [x, y, dir] = this.posAt(w.p, w.d); Object.assign(w, { x, y, dir }); }   // (walls keep their bites: no repairs)
    this.queue = makeWave(r, this.age); this.total = this.queue.length; this.clock = 0;
    this.phase = 'build'; this.foes = []; this.shots = []; this.revealT = 0; this.yarnT = 0;
    this.snapshot = this.save();             // "¡Otra vez!" goes back to here
  }
  retry(){ this.load(this.snapshot); this.startRound(); }
  posAt(p, d){
    const T = this.paths[p];
    for(const s of T.seg) if(d <= s.at + s.l){ const u = (d - s.at) / s.l; return [s.x1 + (s.x2 - s.x1)*u, s.y1 + (s.y2 - s.y1)*u, Math.atan2(s.x2 - s.x1, s.y2 - s.y1)]; }
    const s = T.seg[T.seg.length-1]; return [s.x2, s.y2, Math.atan2(s.x2 - s.x1, s.y2 - s.y1)];
  }
  openPaths(){ return this.paths.map(t => t.P); }
  allPaths(){ return this.map.allPaths; }
  towerAt(x, y){ return this.towers.find(t => Math.hypot(t.x - x, t.y - y) < bu(SIZE) * .55); }
  wallAt(x, y){ return this.walls.find(w => Math.hypot(w.x - x, w.y - y) < .5); }
  // room for a tower here? off every trail (even ones not open yet), not on a tree, the bowl or another tower
  whyNot(x, y){
    if(x < .35 || x > COLS - .35 || y < .35 || y > ROWS - .35) return 'edge';
    if(distToPaths(this.allPaths(), x, y) < PATH_HALF + .42) return 'path';
    if(Math.hypot(x - this.bowl[0], y - this.bowl[1]) < BOWL_R + .55) return 'bowl';
    if(this.towers.some(t => Math.hypot(t.x - x, t.y - y) < bu(SIZE) * .9)) return 'tower';
    if(this.map.deco.some(d => Math.hypot(d.x - x, d.y - y) < .62)) return 'thing';
    return null;
  }
  canBuild(x, y){ return !this.whyNot(x, y); }
  wallSpot(x, y){
    let best = null;
    this.paths.forEach((T, p) => { const pr = project(T.P, x, y); if(pr.dist < PATH_HALF + .15 && (!best || pr.dist < best.dist)) best = { p, d: pr.d, dist: pr.dist }; });
    if(!best) return { why: 'offpath' };
    const T = this.paths[best.p];
    if(best.d < 1.2 || T.len - best.d < 1.4) return { why: 'ends' };
    if(this.walls.some(w => w.p === best.p && Math.abs(w.d - best.d) < 1)) return { why: 'wall' };
    const [wx, wy, dir] = this.posAt(best.p, best.d);
    return { p: best.p, d: best.d, x: wx, y: wy, dir };
  }
  // a tower's current numbers, with its upgrades applied, in board units:
  // { range, farm, buff, sees, weapons: [{ cd, n, spread (radians), speed, life, r, pierce, dmg, imm, boom, slow, slowBoss, dot, bonus }] }
  stat(t){
    const b = TOWERS[t.i];
    if(BT[b.id]){ const S = BT[b.id][`${t.a}${t.b}`] || BT[b.id]['00'];
      if(S.farm !== undefined) return { range: 0, farm: S.farm, buff: 1, weapons: [] };
      if(S.support) return { range: bu(S.support.range), farm: 0, buff: 1, weapons: [], support: S.support };
      return { range: bu(S.weapons[0].range), farm: 0, buff: 1, sees: !!S.camo, shinobi: S.shinobi || 0, weapons: S.weapons.map(w => ({ wind: w.wind, decamo: !!w.decamo, aura: !!w.aura, freeze: w.freeze, seek: !!w.seek, shards: w.shards, cd: w.cd, n: w.n || 1, spread: (w.spread || 0) * Math.PI / 180, speed: bu(w.speed), life: w.life, r: bu(w.r),
        pierce: w.pierce, dmg: w.dmg || 0, imm: w.imm || [], boom: w.boom && { r: bu(w.boom.r), pierce: w.boom.pierce, dmg: w.boom.dmg, imm: w.boom.imm || [] }, slow: w.slow, slowBoss: w.slowBoss, dot: w.dot, bonus: w.bonus || {} })) }; }
    // ours (abeja, búho): base numbers plus upgrade steps
    const o = { range: b.range, cd: b.cd, pierce: b.pierce, dmg: b.dmg, shots: 1, shell: false, buff: 1 };
    b.paths.forEach((p, pi) => { const n = pi === 0 ? t.a : t.b; for(let k = 0; k < n; k++) for(const [key, v] of Object.entries(p.steps[k])){
      if(key === 'cd') o.cd *= v; else if(key === 'shots' || key === 'buff') o[key] = v; else if(key === 'shell') o.shell = true; else if(key in o && typeof v === 'number') o[key] += v; } });
    return { range: bu(o.range), farm: 0, buff: o.buff, sees: !!b.sees, weapons: [{ cd: o.cd, n: o.shots, spread: o.shots > 1 ? .35 : 0, speed: bu(b.speed), life: .3, r: bu(2), pierce: o.pierce, dmg: o.dmg,
      imm: o.shell ? ['frozen'] : ['lead', 'frozen'], bonus: {} }] };
  }
  // a fence's numbers: most bites, barbed wire (hurts per second to each critter chewing), electric zap
  wallStat(w){
    const s = { max: WALL.hp, spike: 0, zap: null };
    WALL.paths.forEach((p, pi) => { const n = pi === 0 ? w.a : w.b; for(let k = 0; k < n; k++){ const st = p.steps[k]; s.max += st.hp || 0; if(st.spike) s.spike = st.spike; if(st.zap) s.zap = st.zap; } });
    return s;
  }
  // what can this tower (or fence) upgrade to next? [{ path, step, cost, name, locked }]
  // Bloons' rule: only one path can go past step 2.
  upOptions(t){
    const b = t.wall ? WALL : TOWERS[t.i];
    return b.paths.map((p, pi) => { const have = pi === 0 ? t.a : t.b, other = pi === 0 ? t.b : t.a;
      if(have >= 3) return { path: pi, done: true, name: p.name };
      const locked = have + 1 >= 3 && other >= 3;
      return { path: pi, step: have + 1, cost: this.price(p.steps[have].cost), name: p.steps[have].name, pathName: p.name, locked }; });
  }
  upCost(t){ const o = this.upOptions(t).find(o => !o.done && !o.locked); return o ? o.cost : Infinity; }
  sellValue(t){ return Math.round(t.spent * .7); }
  place(x, y, i){
    const b = TOWERS[i], cost = this.price(b.cost); if(!this.canBuild(x, y) || this.coins < cost || !this.un[i]) return null;
    this.coins -= cost; const t = { id: nid(), i, a: 0, b: 0, lvl: 1, spent: cost, cd: 0, x, y, aim: Math.PI, shotAt: -9, target: 'first' };
    this.towers.push(t); this.fx.push({ t:'build', x:t.x, y:t.y }); return t;
  }
  placeWall(x, y){
    const s = this.wallSpot(x, y), cost = this.price(WALL.cost); if(s.why || this.coins < cost) return null;
    this.coins -= cost; const w = { id: nid(), wall: true, p: s.p, d: s.d, x: s.x, y: s.y, dir: s.dir, a: 0, b: 0, hp: WALL.hp, max: WALL.hp, spent: cost, cd: 0 };
    this.walls.push(w); this.fx.push({ t:'build', x:w.x, y:w.y }); return w;
  }
  upgrade(t, path = 0){
    const o = this.upOptions(t).find(o => o.path === path); if(!o || o.done || o.locked || this.coins < o.cost) return false;
    this.coins -= o.cost; t.spent += o.cost;
    if(path === 0) t.a++; else t.b++;
    if(t.wall){ const was = t.max; t.max = this.wallStat(t).max; t.hp += t.max - was; }
    else t.lvl = 1 + Math.max(t.a, t.b);
    this.fx.push({ t:'up', x:t.x, y:t.y, tower:t }); return true;
  }
  setTarget(t, mode){ t.target = mode; }
  // ----- one-tap powers -----
  hasPower(t){ return !t.wall && (t.a >= 3 || t.b >= 3) && !!POWERS[TOWERS[t.i].id]; }
  // one button per kind of tower: [{ id, ready, left (0–1 of the wait still to go), tower }]
  powers(){
    const by = {};
    for(const t of this.towers) if(this.hasPower(t)){ const id = TOWERS[t.i].id, o = by[id] || (by[id] = { id, ready: false, left: 1, tower: null });
      const left = Math.max(0, t.cool || 0) / POWERS[id].cd; if(left <= 0 && !o.ready){ o.ready = true; o.tower = t; o.left = 0; } else if(!o.ready && left < o.left){ o.left = left; o.tower = t; } }
    return Object.values(by);
  }
  usePower(id){
    if(this.phase !== 'wave') return false;
    const t = this.towers.find(t => this.hasPower(t) && TOWERS[t.i].id === id && !(t.cool > 0)); if(!t) return false;
    t.cool = POWERS[id].cd; const s = this.stat(t), alive = () => this.foes.filter(f => f.alive);
    if(id === 'gato') this.yarnT = 6;
    else if(id === 'abeja'){ for(const f of alive()){ this.hit(f, 2, null, ['lead', 'frozen']); this.fx.push({ t:'hit', x:f.x, y:f.y, kind:'abeja' }); } }
    else if(id === 'pulpo'){ for(const f of alive()) if(!f.boss){ f.slowT = 6; f.slowF = .3; f.dot = Math.max(f.dot, 1); f.dotT = 6; this.fx.push({ t:'ink', x:f.x, y:f.y }); } }
    else if(id === 'dragon'){ for(const d of this.towers.filter(d => this.hasPower(d) && TOWERS[d.i].id === 'dragon')){ const r = this.stat(d).range * 1.6;
        this.fx.push({ t:'boom', x:d.x, y:d.y, r }); for(const f of alive()) if(Math.hypot(f.x - d.x, f.y - d.y) <= r) this.hit(f, 15, null, ['black']); } }
    else if(id === 'huerto'){ const n = 150 + 50 * this.towers.filter(h => TOWERS[h.i].id === 'huerto').length; this.coins += n; this.fx.push({ t:'farm', x:t.x, y:t.y, n }); }
    else if(id === 'buho') this.revealT = 12;
    this.fx.push({ t:'power', id, x:t.x, y:t.y }); return true;
  }
  sell(t){ this.coins += this.sellValue(t); if(t.wall) this.walls = this.walls.filter(x => x !== t); else this.towers = this.towers.filter(x => x !== t); this.fx.push({ t:'sell', x:t.x, y:t.y, tower:t }); }
  go(){ if(this.phase === 'build'){ this.phase = 'wave'; this.clock = 0; } }
  // a critter comes out: from a burrow, or out of a bigger one (from). o = { h: hidden, regrow, fort, top }
  spawn(k, p, d = 0, from = null, o = {}){
    const f = FOES[k], [x, y, dir] = this.posAt(p, d), fort = !!o.fort, hp = hpOf(k, fort);
    const foe = { id: nid(), k, p, hp, max: hp, spd: bu(f.speed) * this.A.speed, d, pts: f.pts, size: f.size, fly: !!f.fly, boss: !!f.boss, fort,
      slowT: 0, slowF: 1, dot: 0, dotT: 0, alive: true, x, y, dir, hitAt: -9, atWall: null, rbe: rbeOf(k, fort), kid: !!from,
      hidden: !!o.h, seen: !o.h, regrow: !!o.regrow, top: o.top || k, growT: REGROW_S };
    this.foes.push(foe); if(from) this.fx.push({ t:'kids', x, y, from }); return foe;
  }
  // a hit of dmg; imm = the balloon kinds this hit can't hurt. Leftover damage goes on to what comes out (like Bloons)
  hit(f, dmg, by, imm = []){
    if(!f.alive || dmg <= 0) return;
    const props = f.freezeT > 0 ? [...(FOES[f.k].props || []), 'frozen'] : (FOES[f.k].props || []);   // frozen: sharp hits can't pop it (like Bloons)
    if(props.some(p => imm.includes(p))){ this.fx.push({ t:'bounce', x:f.x, y:f.y }); return; }
    const d = Math.min(dmg, f.hp); f.hp -= d; f.hitAt = this.time; f.rbe -= d;
    if(f.hp > 0){ if(f.max > 1) this.fx.push({ t:'layer', x:f.x, y:f.y }); return; }
    f.alive = false; this.points += f.pts; this.fx.push({ t:'die', x:f.x, y:f.y, pts:f.pts, foe:f });
    this.frac = (this.frac || 0) + popCash(this.r); const c = Math.floor(this.frac); this.frac -= c; this.coins += c;   // a coin for each one knocked out
    const left = dmg - d, F = FOES[f.k];
    F.kids.forEach((kk, n) => { const kid = this.spawn(kk, f.p, Math.max(0, f.d - n * .12), f, { h: f.hidden, regrow: f.regrow, fort: f.fort && F.boss, top: f.regrow ? f.top : kk });
      kid.slowT = f.slowT; kid.slowF = f.slowF;
      if(f.freezeT > 0 && f.freezeL > 1){ kid.freezeT = f.freezeT; kid.freezeL = f.freezeL - 1; kid.shards = f.shards; }
      if(left > 0) this.hit(kid, left, by, imm); });
    // Ice Shards: a frozen critter bursts into shards that fly out
    if(f.freezeT > 0 && f.shards){ const S = f.shards, w = { speed: bu(300), life: .2, r: bu(S.r), pierce: S.pierce, dmg: S.dmg, imm: S.imm, bonus: {} };
      for(let n = 0; n < S.n; n++){ const a = n * Math.PI * 2 / S.n + Math.random(); this.shots.push({ id: nid(), x: f.x, y: f.y, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.life, w, b: TOWERS.find(b => b.id === 'pinguino'), tower: S.tower, pierce: w.pierce, hits: new Set([f.id]), born: this.time, shard: true }); } }
  }
  // regrow: one step bigger (if it isn't back to what it started as)
  grow(f){
    const next = GROWS[f.k]; if(!next || GROW_RANK.indexOf(next) > GROW_RANK.indexOf(f.top)) return;
    const F = FOES[next]; f.k = next; f.hp = f.max = hpOf(next, false); f.rbe = rbeOf(next); f.spd = bu(F.speed) * this.A.speed; f.size = F.size; f.pts = F.pts; f.fly = !!F.fly;
    this.fx.push({ t:'grow', x:f.x, y:f.y, foe:f });
  }
  // what nests near this tower give it: { range: +share, rate: cooldown ×, pierce: +, speed: +share, sees, all (hits everything) }
  helpFor(t){
    const h = { range: 0, rate: 1, pierce: 0, speed: 0, sees: false, all: false }, prim = PRIMARY.includes(TOWERS[t.i].id);
    for(const n of this.towers){ if(n === t || TOWERS[n.i].id !== 'nido') continue; const S = this.stat(n);
      if(Math.hypot(n.x - t.x, n.y - t.y) > S.range) continue; const P = S.support;
      h.range = Math.max(h.range, P.rangeMult + (prim && P.primary ? P.primary.range : 0)); h.rate = Math.min(h.rate, P.rate);
      if(prim && P.primary){ h.pierce = Math.max(h.pierce, P.primary.pierce); h.speed = Math.max(h.speed, P.primary.speed); }
      if(P.camo) h.sees = true; if(P.allTypes) h.all = true; }
    return h;
  }
  // critters in range of a tower, in the order the tower wants them
  targets(t, s){
    const sees = s.sees || (t.help && t.help.sees) || this.revealT > 0, R = s.range * (1 + (t.help ? t.help.range : 0));
    const list = this.foes.filter(f => f.alive && (!f.hidden || sees) && Math.hypot(f.x - t.x, f.y - t.y) <= R);
    if(t.target === 'strong') list.sort((a, b) => b.hp - a.hp || this.left(a) - this.left(b));
    else if(t.target === 'close') list.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
    else list.sort((a, b) => this.left(a) - this.left(b));
    return list;
  }
  left(f){ return this.paths[f.p].len - f.d; }
  step(dt){
    this.time += dt;
    if(this.phase !== 'wave') return;
    this.clock += dt;
    while(this.queue.length && this.queue[0].t <= this.clock){ const s = this.queue.shift(); this.spawn(s.k, s.p, 0, null, s); }
    for(const f of this.foes){ if(!f.alive) continue;
      f.slowT -= dt; if(f.freezeT > 0) f.freezeT -= dt;
      if(f.dot > 0 && f.dotT > 0){ f.dotT -= dt; f.dotAcc = (f.dotAcc || 0) + f.dot * dt; while(f.dotAcc >= 1 && f.alive){ f.dotAcc -= 1; this.hit(f, 1, null); } }
      if(f.regrow && (f.growT -= dt) <= 0){ f.growT = REGROW_S; if(!this.towers.some(n => TOWERS[n.i].id === 'nido' && n.b >= 1 && Math.hypot(n.x - f.x, n.y - f.y) <= this.stat(n).range)) this.grow(f); }   // "Sin crecer" nests stop regrowing
      if(!f.alive) continue;
      let mult = f.freezeT > 0 ? 0 : f.slowT > 0 ? f.slowF : 1; f.atWall = null;
      // a wall in the way? stop and chew on it (one bite a second; the bear chews five)
      if(!f.fly) for(const w of this.walls) if(w.hp > 0 && w.p === f.p && f.d < w.d){ const gap = w.d - .3 - f.d;
        if(gap < .02){ f.atWall = w; w.hp -= (f.boss ? 5 : 1) * dt; w.chewAt = this.time; mult = 0;
          const sp = this.wallStat(w).spike; if(sp){ f.spikeAcc = (f.spikeAcc || 0) + sp * dt; while(f.spikeAcc >= 1 && f.alive){ f.spikeAcc -= 1; this.hit(f, 1, w, ['lead', 'frozen']); this.fx.push({ t:'spike', x:f.x, y:f.y }); } } }
        else mult = Math.min(mult, gap / (f.spd * dt + 1e-6)); }
      if(!f.alive) continue;
      f.d += Math.max(0, Math.min(f.spd * mult * dt, f.spd * dt));
      if(f.d >= this.paths[f.p].len){ f.alive = false; f.leaked = true; this.lives = Math.max(0, this.lives - Math.max(1, Math.ceil(f.rbe))); this.fx.push({ t:'leak', foe:f }); continue; }
      const [x, y, dir] = this.posAt(f.p, f.d); f.x = x; f.y = y; f.dir = dir;
    }
    // a fence chewed through is gone
    for(const w of this.walls) if(w.hp <= 0){ this.fx.push({ t:'wallbreak', x:w.x, y:w.y, wall:w }); }
    this.walls = this.walls.filter(w => w.hp > 0);
    // electric fences zap critters near them
    for(const w of this.walls){ const z = this.wallStat(w).zap; if(!z) continue; w.cd -= dt; if(w.cd > 0) continue;
      const near = this.foes.filter(f => f.alive && !f.fly && Math.hypot(f.x - w.x, f.y - w.y) <= z.range).sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y)).slice(0, z.pierce);
      if(!near.length) continue; w.cd = z.cd;
      for(const f of near){ this.fx.push({ t:'zap', x:w.x, y:w.y, tx:f.x, ty:f.y }); this.hit(f, z.dmg, w, ['purple']); } }
    // hidden critters show up for everyone only during "¡Todos a la vista!" (or once an owl's "¡Te vi!" strips their hiding)
    for(const f of this.foes){ const now = !f.hidden || this.revealT > 0; if(now !== f.seen){ f.seen = now; this.fx.push({ t: now ? 'seen' : 'unseen', x:f.x, y:f.y, foe:f }); } }
    // Shinobi Tactics: owls near a "Escuela de búhos" owl throw faster (Bloons: ×0.92 per one, up to 20)
    const shin = this.towers.filter(t => TOWERS[t.i].id === 'buho').map(t => ({ t, s: this.stat(t) })).filter(o => o.s.shinobi);
    for(const t of this.towers){ t.buff = 1; if(TOWERS[t.i].id === 'buho'){ let n = 0; for(const o of shin) if(Math.hypot(o.t.x - t.x, o.t.y - t.y) <= o.s.range) n++; t.buff = Math.pow(shin[0] ? shin[0].s.shinobi : 1, Math.min(20, n)); } }
    if(this.revealT > 0) this.revealT -= dt;
    if(this.yarnT > 0) this.yarnT -= dt;
    for(const t of this.towers) if(t.cool > 0) t.cool -= dt;
    // towers: aim at a critter and throw (straight shots, like Bloons' darts). Each attack has its own wait.
    for(const t of this.towers) t.help = this.helpFor(t);
    for(const t of this.towers){ const b = TOWERS[t.i]; if(!b.range || b.support) continue;
      const s = this.stat(t), H = t.help; t.cds = t.cds || [];
      s.weapons.forEach((w0, wi) => {
        t.cds[wi] = (t.cds[wi] ?? 0) - dt; if(t.cds[wi] > 0) return;
        const list = this.targets(t, s); if(!list.length) return;
        const w = { ...w0, pierce: w0.pierce + (H.pierce || 0), speed: w0.speed * (1 + (H.speed || 0)), imm: H.all ? [] : w0.imm };
        const f = list[0]; t.cds[wi] = w.cd * t.buff * H.rate * (this.yarnT > 0 && b.id === 'gato' ? .35 : 1);
        if(wi === 0){ t.cd = t.cds[0]; t.aim = Math.atan2(f.x - t.x, f.y - t.y); t.shotAt = this.time; }
        if(w.aura){ this.aura(t, w); return; }
        const ang = Math.atan2(f.y - t.y, f.x - t.x), ring = w.spread >= 6.2;    // a full circle (the bee's tacks): evenly around
        for(let n = 0; n < w.n; n++){ const a = ang + (ring ? n * Math.PI * 2 / w.n : w.n > 1 ? (n - (w.n - 1) / 2) * w.spread / (w.n - 1) : 0);
          this.shots.push({ id: nid(), x: t.x, y: t.y, x0: t.x, y0: t.y, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.life, w, b, tower: t, pierce: w.pierce, hits: new Set(), born: this.time }); }
      });
    }
    const rad = f => bu(f.boss ? ({ oso: 21, elefante: 30, dino: 40 })[f.k] : 8);     // how big a critter is to hit (Bloons' sizes)
    for(const sh of this.shots){
      // magic that chases: turn toward the nearest critter it hasn't hit yet
      if(sh.w.seek){ let best = null, bd = bu(80); for(const f of this.foes){ if(!f.alive || sh.hits.has(f.id) || (f.hidden && !sh.tower.help?.sees && !this.stat(sh.tower).sees)) continue; const d = Math.hypot(f.x - sh.x, f.y - sh.y); if(d < bd){ bd = d; best = f; } }
        if(best){ const sp = Math.hypot(sh.vx, sh.vy), d = bd || 1; sh.vx = (best.x - sh.x) / d * sp; sh.vy = (best.y - sh.y) / d * sp; } }
      const w = sh.w, x1 = sh.x + sh.vx * dt, y1 = sh.y + sh.vy * dt, sx = x1 - sh.x, sy = y1 - sh.y, L2 = sx * sx + sy * sy || 1e-9;
      // critters this shot touches on its way, nearest first
      const touch = [];
      for(const f of this.foes){ if(!f.alive || sh.hits.has(f.id)) continue;
        const u = Math.max(0, Math.min(1, ((f.x - sh.x) * sx + (f.y - sh.y) * sy) / L2)), dx = sh.x + sx * u - f.x, dy = sh.y + sy * u - f.y;
        if(dx * dx + dy * dy <= (w.r + rad(f)) ** 2) touch.push([u, f]); }
      touch.sort((a, b) => a[0] - b[0]);
      for(const [, f] of touch){
        if(w.boom){ this.explode(sh, f.x, f.y); sh.done = true; break; }
        sh.hits.add(f.id); this.land(sh, f);
        if(--sh.pierce <= 0){ sh.done = true; break; } }
      sh.x = x1; sh.y = y1; sh.life -= dt; if(sh.life <= 0) sh.done = true;
    }
    this.shots = this.shots.filter(s => !s.done);
    this.foes = this.foes.filter(f => f.alive);
    if(this.lives <= 0){ this.phase = 'lost'; this.fx.push({ t:'end', won:false }); return; }
    if(!this.queue.length && !this.foes.length) this.endRound();
  }
  // a shot touches a critter: glue (slow, acid), damage (more on bosses / crocodiles for some upgrades)
  land(sh, f){
    const w = sh.w, B = w.bonus || {};
    if(w.decamo && !w.dmg){ if(f.hidden){ f.hidden = false; } return; }                   // the wizard's Shimmer: just takes hiding away
    // ice: freezes what it hits (and what comes out of it, for a few layers); not bosses; Permafrost slows them after
    const iceOk = !(FOES[f.k].props || []).some(p => (w.imm || []).includes(p));
    if(w.freeze && iceOk && (!f.boss || w.freeze.boss)){ f.freezeT = w.freeze.t * (f.k === 'cocodrilo' ? .5 : 1); f.freezeL = w.freeze.layers; f.shards = w.shards ? { ...w.shards, tower: sh.tower } : null; this.fx.push({ t:'freeze', x:f.x, y:f.y, foe:f }); }
    if(w.freeze && iceOk && w.slow && !f.boss){ f.slowT = 1e6; f.slowF = Math.min(f.slowT > 0 ? f.slowF : 1, w.slow.mult); return this.hitLand(sh, f, w, B); }
    if(w.slow && (!f.boss || (w.slowBoss || 1) !== 1)){ f.slowT = w.slow.t; f.slowF = f.boss ? .75 : w.slow.mult; if(w.dot){ f.dot = w.dot.dmg / w.dot.every; f.dotT = w.slow.t; } this.fx.push({ t:'ink', x:f.x, y:f.y }); }
    return this.hitLand(sh, f, w, B);
  }
  hitLand(sh, f, w, B){
    const dmg = w.dmg + (f.boss ? B.Moabs || 0 : 0) + (f.k === 'cocodrilo' ? B.Ceramic || 0 : 0) + (f.hidden ? B.Camo || 0 : 0);
    if(dmg > 0){ this.fx.push({ t:'hit', x:f.x, y:f.y, kind: sh.b.id }); this.hit(f, dmg, sh.tower, w.imm); }
    // "¡Te vi!": a hidden critter that gets hurt stops hiding (and so do the ones that come out of it)
    if(w.decamo && f.hidden && dmg > 0){ f.hidden = false; for(const k of this.foes) if(k.kid && k.alive && k.hidden && Math.hypot(k.x - f.x, k.y - f.y) < .3) k.hidden = false; }
    // "Susto": sometimes blows a critter back along the trail (not bosses; crocodiles only half as far)
    if(w.wind && f.alive && !f.boss && Math.random() < w.wind.chance){ const back = bu(w.wind.min + Math.random() * (w.wind.max - w.wind.min)) * (f.k === 'cocodrilo' ? .5 : 1); f.d = Math.max(0, f.d - back); this.fx.push({ t:'wind', x:f.x, y:f.y }); }
  }
  // an attack all around the tower (the penguin's freeze, the wizard's Shimmer)
  aura(t, w){
    const rad = f => bu(f.boss ? ({ oso: 21, elefante: 30, dino: 40 })[f.k] : 8), sh = { w, b: TOWERS[t.i], tower: t };
    this.fx.push({ t: w.freeze ? 'frost' : 'shimmer', x:t.x, y:t.y, r:w.r });
    const hits = this.foes.filter(f => f.alive && Math.hypot(f.x - t.x, f.y - t.y) <= w.r + rad(f)).sort((a, b) => this.left(a) - this.left(b)).slice(0, w.pierce);
    for(const f of hits) this.land(sh, f);
  }
  // a bomb goes off: hits the critters inside the blast (up to its pierce)
  explode(sh, x, y){
    const w = sh.w, E = w.boom, B = w.bonus || {}, rad = f => bu(f.boss ? ({ oso: 21, elefante: 30, dino: 40 })[f.k] : 8);
    this.fx.push({ t:'boom', x, y, r: E.r });
    const hits = this.foes.filter(f => f.alive && Math.hypot(f.x - x, f.y - y) <= E.r + rad(f)).sort((a, b) => this.left(a) - this.left(b)).slice(0, E.pierce);
    for(const f of hits) this.hit(f, E.dmg + (f.boss ? B.Moabs || 0 : 0), sh.tower, E.imm);
  }
  endRound(){
    // round bonus + coin trees; next round
    let farm = 0; for(const t of this.towers) if(TOWERS[t.i].id === 'huerto'){ const s = this.stat(t); farm += s.farm; this.fx.push({ t:'farm', x:t.x, y:t.y, n:s.farm }); }
    const bonus = roundBonus(this.r); this.coins += bonus + farm;
    const done = this.r >= this.lastRound;
    this.fx.push({ t:'end', won:true, bonus, farm, round:this.r, done });
    this.phase = done ? 'won' : 'cleared';
  }
  // after a round is cleared: on to the next
  nextRound(){ if(this.phase !== 'cleared') return; this.r++; this.startRound(); }
  // test helper: finish the round as cleared
  win(){ if(this.phase !== 'build' && this.phase !== 'wave') return; this.phase = 'wave'; this.queue = []; this.foes = []; this.shots = []; this.step(0); }
}
