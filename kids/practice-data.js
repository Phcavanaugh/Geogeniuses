// Lists for GeoGeniuses Kids unlimited practice (used by ../app.js when window.GGG_KIDS is set).
window.GGK_PRACTICE = (function () {
  // Map-file country names -> how kids see them
  const DISPLAY = {
  "United States of America":"United States","Dem. Rep. Congo":"DR Congo","Central African Rep.":"Central African Republic",
  "Bosnia and Herz.":"Bosnia and Herzegovina","Macedonia":"North Macedonia","S. Sudan":"South Sudan","Eq. Guinea":"Equatorial Guinea",
  "eSwatini":"Eswatini","Dominican Rep.":"Dominican Republic","Antigua and Barb.":"Antigua and Barbuda","St. Kitts and Nevis":"Saint Kitts and Nevis",
  "St. Vin. and Gren.":"Saint Vincent and the Grenadines","Solomon Is.":"Solomon Islands","Marshall Is.":"Marshall Islands","W. Sahara":"Western Sahara",
  "Falkland Is.":"Falkland Islands","Congo":"Republic of the Congo","Vatican":"Vatican City","São Tomé and Principe":"São Tomé and Príncipe",
  "Fr. Polynesia":"French Polynesia","Faeroe Is.":"Faroe Islands","Cayman Is.":"Cayman Islands","Turks and Caicos Is.":"Turks and Caicos",
  "U.S. Virgin Is.":"U.S. Virgin Islands","British Virgin Is.":"British Virgin Islands","N. Mariana Is.":"Northern Mariana Islands",
  "Cook Is.":"Cook Islands","Pitcairn Is.":"Pitcairn Islands","S. Geo. and the Is.":"South Georgia","Fr. S. Antarctic Lands":"French Southern Lands",
  "Br. Indian Ocean Ter.":"British Indian Ocean Territory","Wallis and Futuna Is.":"Wallis and Futuna","St. Pierre and Miquelon":"Saint Pierre and Miquelon",
  "Heard I. and McDonald Is.":"Heard Island","Indian Ocean Ter.":"Christmas Island","Ashmore and Cartier Is.":"Ashmore Reef",
};
  // Countries on each continent map (Russia and Turkey are on two)
  const REG = {
  europe:["Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herz.","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Monaco","Montenegro","Netherlands","Macedonia","Norway","Poland","Portugal","Romania","Russia","San Marino","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom","Vatican","Turkey"],
  asia:["Afghanistan","Armenia","Azerbaijan","Bahrain","Bangladesh","Bhutan","Brunei","Cambodia","China","Georgia","India","Indonesia","Iran","Iraq","Israel","Japan","Jordan","Kazakhstan","Kuwait","Kyrgyzstan","Laos","Lebanon","Malaysia","Maldives","Mongolia","Myanmar","Nepal","North Korea","Oman","Pakistan","Palestine","Philippines","Qatar","Russia","Saudi Arabia","Singapore","South Korea","Sri Lanka","Syria","Taiwan","Tajikistan","Thailand","Timor-Leste","Turkey","Turkmenistan","United Arab Emirates","Uzbekistan","Vietnam","Yemen"],
  africa:["Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Rep.","Chad","Comoros","Congo","Dem. Rep. Congo","Côte d'Ivoire","Djibouti","Egypt","Eq. Guinea","Eritrea","eSwatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","S. Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe"],
  na:["Antigua and Barb.","Bahamas","Barbados","Belize","Canada","Costa Rica","Cuba","Dominica","Dominican Rep.","El Salvador","Grenada","Guatemala","Haiti","Honduras","Jamaica","Mexico","Nicaragua","Panama","St. Kitts and Nevis","Saint Lucia","St. Vin. and Gren.","Trinidad and Tobago","United States of America","Greenland"],
  sa:["Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru","Suriname","Uruguay","Venezuela"],
  oceania:["Australia","Fiji","Kiribati","Marshall Is.","Micronesia","Nauru","New Zealand","Palau","Papua New Guinea","Samoa","Solomon Is.","Tonga","Vanuatu"],
};
  // Big, famous ones that are always included
  const EASY = {
  europe:["United Kingdom","France","Spain","Italy","Germany","Russia","Ukraine","Norway","Sweden","Finland","Poland","Ireland","Portugal","Greece","Iceland","Turkey"],
  asia:["China","India","Russia","Japan","Mongolia","Saudi Arabia","Iran","Kazakhstan","Indonesia","Turkey","Pakistan","Thailand","Vietnam","South Korea","Philippines","Afghanistan"],
  africa:["Egypt","South Africa","Madagascar","Nigeria","Kenya","Morocco","Algeria","Libya","Ethiopia","Sudan","Dem. Rep. Congo","Somalia","Angola","Tanzania","Chad","Mali"],
  na:["United States of America","Canada","Mexico","Greenland","Cuba","Panama","Guatemala","Jamaica","Haiti","Costa Rica","Honduras","Nicaragua","Dominican Rep."],
  sa:["Brazil","Argentina","Chile","Peru","Colombia","Venezuela","Bolivia","Ecuador","Paraguay","Uruguay"],
  oceania:["Australia","New Zealand","Papua New Guinea","Fiji","Solomon Is."],
  world:["United States of America","Canada","Mexico","Brazil","Argentina","Chile","Peru","Colombia","Venezuela","United Kingdom","France","Spain","Italy","Germany","Russia","Ukraine","Norway","Sweden","China","India","Japan","Mongolia","Kazakhstan","Indonesia","Iran","Saudi Arabia","Turkey","Australia","New Zealand","Egypt","South Africa","Madagascar","Nigeria","Kenya","Algeria","Greenland"],
  states:["California","Texas","Florida","Alaska","Hawaii","New York","Illinois","Arizona","Washington","Colorado","Michigan","Montana","Nevada","Oregon","Utah","Georgia","Wisconsin","Ohio","Pennsylvania","Minnesota","Louisiana","Maine","North Carolina","New Mexico","Idaho","Wyoming"],
};
  const MAPS = [
    { id: "usa", label: "USA states", icon: "🇺🇸" },
    { id: "world", label: "World", icon: "🌍" },
    { id: "na", label: "North America", icon: "🌎" },
    { id: "sa", label: "South America", icon: "🦜" },
    { id: "europe", label: "Europe", icon: "🏰" },
    { id: "africa", label: "Africa", icon: "🦁" },
    { id: "asia", label: "Asia", icon: "🐼" },
    { id: "oceania", label: "Oceania", icon: "🦘" },
  ];
  return { DISPLAY, REG, EASY, MAPS };
})();
