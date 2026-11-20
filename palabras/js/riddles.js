// ¡Hola, Palabras! — ¡Adivina! helpers. The riddles themselves live with each word in js/words.js.
// Plain script (not a module): files load in order and share one global scope; see index.html.

// How each riddle ends depends on the word's kind (see WORDS in js/words.js)
const RIDDLE_ENDS = { group:['¿Quiénes somos?','Who are we?'], plural:['¿Qué somos?','What are we?'], thing:['¿Qué soy?','What am I?'], animal:['¿Quién soy?','Who am I?'], person:['¿Quién soy?','Who am I?'] };
const riddleQ = e => RIDDLE_ENDS[(WORD_BY_PIC[e] || {}).kind] || RIDDLE_ENDS.animal;

// Pictures a riddle could also fit — never shown together as choices
const LOOKALIKES = [
  ['🐱','🐈‍⬛'],['🐶','🐩','🦮','🐺'],['🐳','🐋'],['🐫','🐪'],['🐭','🐀'],['🐑','🐏','🐐'],['🐔','🐤','🐣','🐓'],
  ['🐟','🐠','🐡'],['🐮','🐂','🐃','🦬'],['🐴','🫏','🦓','🦄'],['🦌','🫎'],['🐷','🐗'],['🐻','🐻‍❄️','🐼'],
  ['🦁','🐯','🐆'],['🐵','🦍','🦧'],['🐘','🦣'],['🦑','🐙'],['🦞','🦀','🦐'],['🐢','🐌'],['🦖','🐉','🐊','🦎'],
  ['🐦','🕊️','🐦‍⬛'],['🦆','🪿','🦢'],['🦃','🦚'],['🐜','🪳','🪲'],['🪰','🦟','🐝'],['🐛','🪱'],['🕷️','🕸️'],['🦭','🦦'],['🐦','🪶','🪺']
];

