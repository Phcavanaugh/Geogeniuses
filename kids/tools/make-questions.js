// Builds kids/questions.json: one list of 5 per day.
// Q1 = a well-known U.S. state, Q2 = any other state, Q3 = a famous country,
// Q4 = a big country, Q5 = a smaller or less-known country.
// Run: node kids/tools/make-questions.js
const fs = require("fs"), path = require("path");
const d3 = require("../../vendor/d3.min.js");
const topojson = require("../../vendor/topojson-client.min.js");
const ROOT = path.join(__dirname, "..", "..");
const DAYS = 365;

// [name, capital, nickname]
const STATES = [
  ["Alabama","Montgomery","the Yellowhammer State"],["Alaska","Juneau","the Last Frontier"],["Arizona","Phoenix","the Grand Canyon State"],
  ["Arkansas","Little Rock","the Natural State"],["California","Sacramento","the Golden State"],["Colorado","Denver","the Centennial State"],
  ["Connecticut","Hartford","the Constitution State"],["Delaware","Dover","the First State"],["Florida","Tallahassee","the Sunshine State"],
  ["Georgia","Atlanta","the Peach State"],["Hawaii","Honolulu","the Aloha State"],["Idaho","Boise","the Gem State"],
  ["Illinois","Springfield","the Prairie State"],["Indiana","Indianapolis","the Hoosier State"],["Iowa","Des Moines","the Hawkeye State"],
  ["Kansas","Topeka","the Sunflower State"],["Kentucky","Frankfort","the Bluegrass State"],["Louisiana","Baton Rouge","the Pelican State"],
  ["Maine","Augusta","the Pine Tree State"],["Maryland","Annapolis","the Old Line State"],["Massachusetts","Boston","the Bay State"],
  ["Michigan","Lansing","the Great Lakes State"],["Minnesota","Saint Paul","the Land of 10,000 Lakes"],["Mississippi","Jackson","the Magnolia State"],
  ["Missouri","Jefferson City","the Show-Me State"],["Montana","Helena","Big Sky Country"],["Nebraska","Lincoln","the Cornhusker State"],
  ["Nevada","Carson City","the Silver State"],["New Hampshire","Concord","the Granite State"],["New Jersey","Trenton","the Garden State"],
  ["New Mexico","Santa Fe","the Land of Enchantment"],["New York","Albany","the Empire State"],["North Carolina","Raleigh","the Tar Heel State"],
  ["North Dakota","Bismarck","the Peace Garden State"],["Ohio","Columbus","the Buckeye State"],["Oklahoma","Oklahoma City","the Sooner State"],
  ["Oregon","Salem","the Beaver State"],["Pennsylvania","Harrisburg","the Keystone State"],["Rhode Island","Providence","the Ocean State"],
  ["South Carolina","Columbia","the Palmetto State"],["South Dakota","Pierre","the Mount Rushmore State"],["Tennessee","Nashville","the Volunteer State"],
  ["Texas","Austin","the Lone Star State"],["Utah","Salt Lake City","the Beehive State"],["Vermont","Montpelier","the Green Mountain State"],
  ["Virginia","Richmond","the Old Dominion"],["Washington","Olympia","the Evergreen State"],["West Virginia","Charleston","the Mountain State"],
  ["Wisconsin","Madison","the Badger State"],["Wyoming","Cheyenne","the Equality State"],
];
const EASY_STATES = ["California","Texas","Florida","Alaska","Hawaii","New York","Illinois","Arizona","Washington","Colorado","Michigan","Montana","Nevada","Oregon","Utah","Georgia","Wisconsin","Ohio","Pennsylvania","Minnesota","Louisiana","Maine","North Carolina","New Mexico","Idaho","Wyoming"];

// key (map file name) -> [display name, capital, continent]
const C = {
  // Q3: famous
  "United States of America":["the United States","Washington, D.C.","North America"],"Canada":["Canada","Ottawa","North America"],
  "Mexico":["Mexico","Mexico City","North America"],"Brazil":["Brazil","Brasília","South America"],"Argentina":["Argentina","Buenos Aires","South America"],
  "Chile":["Chile","Santiago","South America"],"Peru":["Peru","Lima","South America"],"Colombia":["Colombia","Bogotá","South America"],
  "Venezuela":["Venezuela","Caracas","South America"],"United Kingdom":["the United Kingdom","London","Europe"],"France":["France","Paris","Europe"],
  "Spain":["Spain","Madrid","Europe"],"Italy":["Italy","Rome","Europe"],"Germany":["Germany","Berlin","Europe"],"Russia":["Russia","Moscow","Europe and Asia"],
  "Ukraine":["Ukraine","Kyiv","Europe"],"Norway":["Norway","Oslo","Europe"],"Sweden":["Sweden","Stockholm","Europe"],"China":["China","Beijing","Asia"],
  "India":["India","New Delhi","Asia"],"Japan":["Japan","Tokyo","Asia"],"Mongolia":["Mongolia","Ulaanbaatar","Asia"],"Kazakhstan":["Kazakhstan","Astana","Asia"],
  "Indonesia":["Indonesia","Jakarta","Asia"],"Iran":["Iran","Tehran","Asia"],"Saudi Arabia":["Saudi Arabia","Riyadh","Asia"],"Turkey":["Turkey","Ankara","Europe and Asia"],
  "Australia":["Australia","Canberra","Oceania"],"New Zealand":["New Zealand","Wellington","Oceania"],"Egypt":["Egypt","Cairo","Africa"],
  "South Africa":["South Africa","Pretoria","Africa"],"Madagascar":["Madagascar","Antananarivo","Africa"],"Nigeria":["Nigeria","Abuja","Africa"],
  "Kenya":["Kenya","Nairobi","Africa"],"Algeria":["Algeria","Algiers","Africa"],"Greenland":["Greenland","Nuuk","North America"],
};
const Q3 = Object.keys(C);
const BIG = {
  "Zimbabwe":["Zimbabwe","Harare","Africa"],"Zambia":["Zambia","Lusaka","Africa"],"Yemen":["Yemen","Sanaa","Asia"],"Vietnam":["Vietnam","Hanoi","Asia"],
  "Uzbekistan":["Uzbekistan","Tashkent","Asia"],"Uruguay":["Uruguay","Montevideo","South America"],"Uganda":["Uganda","Kampala","Africa"],
  "Turkmenistan":["Turkmenistan","Ashgabat","Asia"],"Tunisia":["Tunisia","Tunis","Africa"],"Thailand":["Thailand","Bangkok","Asia"],
  "Tanzania":["Tanzania","Dodoma","Africa"],"Tajikistan":["Tajikistan","Dushanbe","Asia"],"Syria":["Syria","Damascus","Asia"],
  "Suriname":["Suriname","Paramaribo","South America"],"S. Sudan":["South Sudan","Juba","Africa"],"Sudan":["Sudan","Khartoum","Africa"],
  "Somalia":["Somalia","Mogadishu","Africa"],"Senegal":["Senegal","Dakar","Africa"],"Romania":["Romania","Bucharest","Europe"],
  "Poland":["Poland","Warsaw","Europe"],"Philippines":["the Philippines","Manila","Asia"],"Paraguay":["Paraguay","Asunción","South America"],
  "Papua New Guinea":["Papua New Guinea","Port Moresby","Oceania"],"Pakistan":["Pakistan","Islamabad","Asia"],"Oman":["Oman","Muscat","Asia"],
  "North Korea":["North Korea","Pyongyang","Asia"],"Niger":["Niger","Niamey","Africa"],"Nicaragua":["Nicaragua","Managua","North America"],
  "Nepal":["Nepal","Kathmandu","Asia"],"Namibia":["Namibia","Windhoek","Africa"],"Mozambique":["Mozambique","Maputo","Africa"],
  "Morocco":["Morocco","Rabat","Africa"],"Mauritania":["Mauritania","Nouakchott","Africa"],"Mali":["Mali","Bamako","Africa"],
  "Malaysia":["Malaysia","Kuala Lumpur","Asia"],"Libya":["Libya","Tripoli","Africa"],"Laos":["Laos","Vientiane","Asia"],
  "Kyrgyzstan":["Kyrgyzstan","Bishkek","Asia"],"Iraq":["Iraq","Baghdad","Asia"],"Guyana":["Guyana","Georgetown","South America"],
  "Guinea":["Guinea","Conakry","Africa"],"Greece":["Greece","Athens","Europe"],"Ghana":["Ghana","Accra","Africa"],"Gabon":["Gabon","Libreville","Africa"],
  "Finland":["Finland","Helsinki","Europe"],"Ethiopia":["Ethiopia","Addis Ababa","Africa"],"Eritrea":["Eritrea","Asmara","Africa"],
  "Ecuador":["Ecuador","Quito","South America"],"Côte d'Ivoire":["Côte d'Ivoire (Ivory Coast)","Yamoussoukro","Africa"],
  "Dem. Rep. Congo":["the Democratic Republic of the Congo","Kinshasa","Africa"],"Congo":["the Republic of the Congo","Brazzaville","Africa"],
  "Chad":["Chad","N'Djamena","Africa"],"Central African Rep.":["the Central African Republic","Bangui","Africa"],"Cameroon":["Cameroon","Yaoundé","Africa"],
  "Cambodia":["Cambodia","Phnom Penh","Asia"],"Myanmar":["Myanmar","Naypyidaw","Asia"],"Burkina Faso":["Burkina Faso","Ouagadougou","Africa"],
  "Botswana":["Botswana","Gaborone","Africa"],"Bolivia":["Bolivia","Sucre (with La Paz as the seat of government)","South America"],
  "Belarus":["Belarus","Minsk","Europe"],"Bangladesh":["Bangladesh","Dhaka","Asia"],"Angola":["Angola","Luanda","Africa"],"Afghanistan":["Afghanistan","Kabul","Asia"],
};
const SMALL = {
  "Ireland":["Ireland","Dublin","Europe"],"Portugal":["Portugal","Lisbon","Europe"],"Austria":["Austria","Vienna","Europe"],
  "Switzerland":["Switzerland","Bern","Europe"],"Netherlands":["the Netherlands","Amsterdam","Europe"],"Belgium":["Belgium","Brussels","Europe"],
  "Denmark":["Denmark","Copenhagen","Europe"],"Hungary":["Hungary","Budapest","Europe"],"Czechia":["Czechia","Prague","Europe"],
  "Bulgaria":["Bulgaria","Sofia","Europe"],"Serbia":["Serbia","Belgrade","Europe"],"Croatia":["Croatia","Zagreb","Europe"],
  "Lithuania":["Lithuania","Vilnius","Europe"],"Latvia":["Latvia","Riga","Europe"],"Estonia":["Estonia","Tallinn","Europe"],
  "Iceland":["Iceland","Reykjavík","Europe"],"Cuba":["Cuba","Havana","North America"],"Jamaica":["Jamaica","Kingston","North America"],
  "Haiti":["Haiti","Port-au-Prince","North America"],"Dominican Rep.":["the Dominican Republic","Santo Domingo","North America"],
  "Panama":["Panama","Panama City","North America"],"Costa Rica":["Costa Rica","San José","North America"],"Guatemala":["Guatemala","Guatemala City","North America"],
  "Honduras":["Honduras","Tegucigalpa","North America"],"South Korea":["South Korea","Seoul","Asia"],"Sri Lanka":["Sri Lanka","Colombo (Sri Jayawardenepura Kotte is the official capital)","Asia"],
  "Israel":["Israel","Jerusalem","Asia"],"Jordan":["Jordan","Amman","Asia"],"Taiwan":["Taiwan","Taipei","Asia"],
  "Sierra Leone":["Sierra Leone","Freetown","Africa"],"Liberia":["Liberia","Monrovia","Africa"],"Malawi":["Malawi","Lilongwe","Africa"],
  "Benin":["Benin","Porto-Novo","Africa"],"Togo":["Togo","Lomé","Africa"],"Rwanda":["Rwanda","Kigali","Africa"],"Georgia":["Georgia (the country)","Tbilisi","Asia"],
  "Armenia":["Armenia","Yerevan","Asia"],"Azerbaijan":["Azerbaijan","Baku","Asia"],"United Arab Emirates":["the United Arab Emirates","Abu Dhabi","Asia"],
  "Lebanon":["Lebanon","Beirut","Asia"],"Fiji":["Fiji","Suva","Oceania"],
};

// check every key exists in the map files
const w = JSON.parse(fs.readFileSync(path.join(ROOT, "data/countries-50m.json")));
const us = JSON.parse(fs.readFileSync(path.join(ROOT, "data/states-10m.json")));
const cKeys = new Set(w.objects.countries.geometries.map((g) => g.properties.name));
const sKeys = new Set(us.objects.states.geometries.map((g) => g.properties.name));
for (const k of [...Object.keys(C), ...Object.keys(BIG), ...Object.keys(SMALL)]) if (!cKeys.has(k)) throw new Error("missing country " + k);
for (const s of STATES) if (!sKeys.has(s[0])) throw new Error("missing state " + s[0]);

// a dot inside the biggest piece, for the review map
function anchorOf(feat) {
  const g = feat.geometry;
  let poly = g;
  if (g.type === "MultiPolygon") {
    let best = -1;
    for (const c of g.coordinates) { const p = { type: "Polygon", coordinates: c }; const a = d3.geoArea(p); if (a < 2 * Math.PI && a > best) { best = a; poly = p; } }
  }
  const c = d3.geoCentroid(poly);
  return [+c[0].toFixed(3), +c[1].toFixed(3)];
}
const featC = (k) => topojson.feature(w, w.objects.countries.geometries.find((g) => g.properties.name === k));
const featS = (k) => topojson.feature(us, us.objects.states.geometries.find((g) => g.properties.name === k));

// seeded shuffle, cycling through each pool before repeating
let seed = 20261127;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function cycler(list) {
  let bag = [], last = null;
  return () => {
    if (!bag.length) { bag = d3.shuffle(list.slice(), rand); if (bag[bag.length - 1] === last && bag.length > 1) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]]; }
    last = bag.pop(); return last;
  };
}
// d3.shuffle(array, random) is supported in d3 v6+
const easyState = cycler(EASY_STATES);
const otherState = cycler(STATES.map((s) => s[0]).filter((n) => !EASY_STATES.includes(n)));
const q3 = cycler(Q3), q4 = cycler(Object.keys(BIG)), q5 = cycler(Object.keys(SMALL));
const stateInfo = Object.fromEntries(STATES.map((s) => [s[0], s]));
const anchors = {};

function stateQ(n) {
  const [, cap, nick] = stateInfo[n];
  const a = anchors[n] || (anchors[n] = anchorOf(featS(n)));
  return { clue: "Find " + n + ".", answer: n, kind: "state", key: n, fact: "Capital: " + cap + ". Nickname: " + nick + ".", lon: a[0], lat: a[1] };
}
function countryQ(k, table) {
  const [name, cap, cont] = table[k];
  const a = anchors[k] || (anchors[k] = anchorOf(featC(k)));
  const Name = name.replace(/^the /, "The ");
  return { clue: "Find " + name + ".", answer: Name, kind: "country", key: k, fact: "Capital: " + cap + ". Continent: " + cont + ".", lon: a[0], lat: a[1] };
}
const days = [];
for (let d = 0; d < DAYS; d++) {
  days.push([stateQ(easyState()), stateQ(otherState()), countryQ(q3(), C), countryQ(q4(), BIG), countryQ(q5(), SMALL)]);
}
fs.writeFileSync(path.join(__dirname, "..", "questions.json"), JSON.stringify(days, null, 1));
console.log("wrote", days.length, "days");
