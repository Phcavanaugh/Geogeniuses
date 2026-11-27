// ¡Hola, Palabras! — Saving, speech, Dora's recorded voice, helpers and smart practice.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= storage ======================= */
// Two ages, each with its own stars, stickers, pet and records. Voice settings are shared.
// Test mode (open the game with ?test): its own separate save, plus a test panel (js/test.js)
const TEST = (()=>{ try{ return new URLSearchParams(location.search).has('test'); }catch(e){ return false; } })();
const KP = TEST ? 'hpT' : 'hp';
const AGE = (()=>{ try{ const a=localStorage.getItem(KP+'_age'); return a==='10' ? 10 : a==='7' ? 7 : 4; }catch(e){ return 4; } })();
const BIG = AGE>=7;          // reads on her own
const TEN = AGE===10;
const PREFIX = KP + (TEN ? '10_' : BIG ? '7_' : '_');
const SHARED = new Set(['showEn','sayArt','rate','voiceURI','recVoice','gameLen','nameBig','nameLittle']);
const store = {
  key(k){ return (SHARED.has(k) ? 'hp_' : PREFIX) + k; },
  get(k,d){ try{ const v=localStorage.getItem(this.key(k)); return v===null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{ localStorage.setItem(this.key(k),JSON.stringify(v)); }catch(e){} }
};
const $ = id => document.getElementById(id);
const S = {
  mode: TEN ? 'escribe' : BIG ? 'adivina' : 'cards', cat:null, list:[], i:0, run:0,
  showEn: store.get('showEn', false),
  sayArt: store.get('sayArt', true),
  rate: store.get('rate', 0.8),
  voiceURI: store.get('voiceURI', ''),
  nChoices: store.get('nChoices6', 6),
  len: store.get('gameLen', 10),        // words per game (0 = no limit)
  pedorro: store.get('pedorro', BIG),  // fart sound on misses
  readAloud: store.get('readAloud', !TEN), // read each question out loud automatically (off by default at 10)
  names: [store.get('nameBig','Grande'), store.get('nameLittle','Peque')],
  stars: store.get('stars', 0),
};
let stats = store.get('stats', {});   // emoji -> {r:right, w:wrong, s:current streak}
let pet = store.get('pet', {xp:0, hat:0});
// store: animals and Lolo colors, bought with ⭐. All pets share the same level, so each one evolves too.
const PETS = {
  axolotl:{ name:'Lolo',   kind:'el ajolote',  en:'axolotl', price:0,   emoji:'🦎', hi:'c|¡Hola! Soy Lolo, el ajolote.' },
  penguin:{ name:'Pipo',   kind:'el pingüino', en:'penguin', price:50,  emoji:'🐧', hi:'c|¡Hola! Soy Pipo, el pingüino.' },
  fox:    { name:'Chispa', kind:'la zorrita',  en:'fox',     price:75,  emoji:'🦊', hi:'c|¡Hola! Soy Chispa, la zorrita.' },
  seal:   { name:'Nieve',  kind:'la foquita',  en:'seal',    price:100, emoji:'🦭', hi:'c|¡Hola! Soy Nieve, la foquita.' },
};
const SKINLIST = [
  { id:'clasico', name:'Rosa',    price:0 },
  { id:'menta',   name:'Menta',   price:25 },
  { id:'salvaje', name:'Salvaje', price:25 },
  { id:'dorado',  name:'Dorado',  price:40 },
  { id:'blanco',  name:'Blanco',  price:40 },
  { id:'galaxia', name:'Galaxia', price:60 },
];
pet = { species:'axolotl', skin:'clasico', owned:['axolotl'], skins:['clasico'], ...pet };
if(!PETS[pet.species]) pet.species='axolotl';
const petInfo = () => PETS[pet.species];
const petName = () => petInfo().name;

/* ======================= speech ======================= */
const synth = window.speechSynthesis;
let voices = [];
function rankVoice(v){
  const l=(v.lang||'').toLowerCase().replace('_','-');
  if(!l.startsWith('es')) return -1;
  let s = 1;
  if(l==='es-mx') s=6; else if(l==='es-us') s=5; else if(l==='es-419') s=4; else if(l==='es-es') s=3;
  if(/google|premium|enhanced|natural|neural/i.test(v.name)) s+=0.5;
  return s;
}
function loadVoices(){
  if(!synth) return;
  voices = synth.getVoices().filter(v=>rankVoice(v)>=0).sort((a,b)=>rankVoice(b)-rankVoice(a));
  const sel=$('voice'); sel.innerHTML='';
  if(!voices.length){ sel.innerHTML='<option>Default</option>'; $('warn').classList.add('on'); return; }
  $('warn').classList.remove('on');
  voices.forEach(v=>{ const o=document.createElement('option'); o.value=v.voiceURI; o.textContent=`${v.name} (${v.lang})`; sel.appendChild(o); });
  if(!voices.find(v=>v.voiceURI===S.voiceURI)) S.voiceURI = voices[0].voiceURI;
  sel.value = S.voiceURI;
}
if(synth){ loadVoices(); synth.onvoiceschanged = loadVoices; setTimeout(loadVoices,500); }
else { $('warn').textContent='This browser can’t speak words aloud. Try Chrome or Safari.'; $('warn').classList.add('on'); }

function speak(text, rateMult=1){
  return new Promise(res=>{
    if(!synth) return res();
    let done=false; const fin=()=>{ if(!done){done=true;res();} };
    try{
      synth.cancel(); stopClips();
      const u = new SpeechSynthesisUtterance(text);
      const v = voices.find(v=>v.voiceURI===S.voiceURI) || voices[0];
      if(v){ u.voice=v; u.lang=v.lang; } else u.lang='es-MX';
      u.rate = S.rate*rateMult; u.pitch = 1.1;
      u.onend=fin; u.onerror=fin;
      synth.speak(u);
      setTimeout(fin, 900 + text.length*90/S.rate);
    }catch(e){ fin(); }
  });
}
const wait = ms => new Promise(r=>setTimeout(r,ms));
const phrase = w => S.sayArt ? `${w[0]} ${w[1]}` : w[1];
const plural = w => w[0]==='los'||w[0]==='las';
const fem = w => w[4]==='f' || w[0]==='la' || w[0]==='las';
const esta = w => plural(w) ? 'están' : 'está';
const isAction = w => (WORD_BY_PIC[w[2]]||{}).kind==='action';   // verbs: "¿Cuál es saltar?", "¡A saltar!"
const dondeText = (w, html) => isAction(w) ? `¿Cuál es ${String(html).trim()}?` : `¿Dónde ${esta(w)} ${html}?`;
const thatIs = w => plural(w) ? (fem(w)?'Esas son':'Esos son') : (fem(w)?'Esa es':'Ese es');
const wordHTML = w => `<span class="art">${w[0]}</span> ${w[1]}`;

/* ======================= recorded voice (Dora) ======================= */
// Clips live in audio/<group>.mp3 with an index in audio/<group>.json. Keys:
//  w|🐶 "el perro."  d|🐶 "¿Dónde está el perro?"  b|🐶 "¡Busca el perro!"  q|🐶 "¡Quiero el perro!"
//  c|<text> common phrase,  r|N streak,  p|N points,  j|N moves
const VOICE = { on: store.get('recVoice', true), clips:{}, loading:{}, tok:0, unlocked:false, status:'', loadedGroups:0 };
// Drawn sticker art for word pictures: art/words/<name>.png. Any word not listed here keeps its emoji.
// To add art: drop the PNG in art/words/ and add its emoji → file name here.
const ART = {
  // En la granja
  '🐶':'perro', '🐱':'gato', '🐮':'vaca', '🐷':'cerdo', '🐴':'caballo', '🐑':'oveja', '🐐':'cabra', '🐔':'gallina', '🐓':'gallo', '🐤':'pollito', '🦆':'pato', '🦃':'pavo', '🐰':'conejo', '🐭':'raton', '🦙':'llama', '🐂':'toro', '🫏':'burro', '🐏':'carnero', '🐃':'bufalo', '🐀':'rata', '🐈‍⬛':'gato-negro', '🐩':'caniche', '🐹':'hamster', '🧑‍🌾':'granjero', '🌾':'trigo', '🪺':'nido', '🪶':'pluma', '🐾':'huellas', '🦮':'perro-guia',
  // En el zoológico
  '🦁':'leon', '🐯':'tigre', '🐘':'elefante', '🦒':'jirafa', '🦓':'cebra', '🐵':'mono', '🦍':'gorila', '🦛':'hipopotamo', '🦏':'rinoceronte', '🐊':'cocodrilo', '🐫':'camello', '🦘':'canguro', '🐨':'koala', '🐼':'panda', '🐍':'serpiente', '🦥':'perezoso', '🐆':'leopardo', '🦧':'orangutan', '🐪':'dromedario', '🦖':'tiranosaurio', '🐉':'dragon', '🦄':'unicornio',
  // En el mar
  '🐟':'pez', '🐙':'pulpo', '🐳':'ballena', '🐬':'delfin', '🦈':'tiburon', '🐢':'tortuga', '🦀':'cangrejo', '🦭':'foca', '🦑':'calamar', '🦞':'langosta', '🦐':'camaron', '🐡':'pez-globo', '🦦':'nutria', '🐠':'pez-tropical', '🪼':'medusa', '🐚':'concha', '🪸':'coral', '🐻‍❄️':'oso-polar', '🐋':'ballena-azul',
  // En el bosque
  '🐻':'oso', '🦊':'zorro', '🐺':'lobo', '🐿️':'ardilla', '🦔':'erizo', '🦉':'buho', '🦇':'murcielago', '🦌':'venado', '🦫':'castor', '🦝':'mapache', '🐗':'jabali', '🦡':'tejon', '🐸':'rana', '🦬':'bisonte', '🦎':'lagartija', '🦣':'mamut', '🦨':'zorrillo', '🫎':'alce',
  // Los bichos
  '🐝':'abeja', '🦋':'mariposa', '🐜':'hormiga', '🕷️':'aranya', '🐞':'mariquita', '🐛':'oruga', '🪲':'escarabajo', '🦗':'saltamontes', '🪰':'mosca', '🦟':'mosquito', '🪱':'gusano', '🐌':'caracol', '🦂':'escorpion', '🪳':'cucaracha', '🦠':'microbio', '🕸️':'telaranya',
  // Los pájaros
  '🐦':'pajaro', '🐧':'pinguino', '🦜':'loro', '🦩':'flamenco', '🦚':'pavo-real', '🦢':'cisne', '🦅':'aguila', '🕊️':'paloma', '🦤':'dodo', '🪿':'ganso', '🐦‍⬛':'cuervo', '🐣':'pollito-en-el-huevo',
  // La comida
  '🍎':'manzana', '🍌':'platano', '🥛':'leche', '🍞':'pan', '🧀':'queso', '🍇':'uvas', '🍪':'galleta', '🥚':'huevo', '🍓':'fresa', '🍦':'helado', '🍊':'naranja', '🥕':'zanahoria', '🍉':'sandia', '🍍':'pinya', '🍋':'limon', '🍐':'pera', '🍒':'cerezas', '🍑':'durazno', '🥥':'coco', '🥑':'aguacate', '🍅':'tomate', '🥦':'brocoli', '🌽':'maiz', '🥔':'papa', '🥒':'pepino', '🎂':'pastel', '🍕':'pizza', '🍔':'hamburguesa', '🌮':'taco', '🥪':'sandwich', '🍲':'sopa', '🍚':'arroz', '🍿':'palomitas', '🍟':'papas-fritas', '🍩':'dona', '🍫':'chocolate', '🍬':'dulce', '🍯':'miel', '🧃':'jugo', '🥞':'panqueques', '🥭':'mango', '🥝':'kiwi', '🍏':'manzana-verde', '🍈':'melon', '🫐':'arandanos', '🫒':'aceituna', '🌶️':'chile', '🫑':'pimiento', '🧄':'ajo', '🧅':'cebolla', '🍠':'camote', '🥬':'lechuga', '🥜':'cacahuate', '🌰':'castanya', '🫘':'frijoles', '🥐':'cruasan', '🥖':'pan-frances', '🥨':'pretzel', '🧇':'wafle', '🥓':'tocino', '🥩':'carne', '🍗':'pollo', '🌭':'hot-dog', '🌯':'burrito', '🫔':'tamal', '🥗':'ensalada', '🧂':'sal', '🧈':'mantequilla', '🍳':'huevo-frito', '🍝':'espagueti', '🍜':'fideos', '🍣':'sushi', '🥟':'empanada', '🧁':'panquecito', '🥧':'pay', '🍮':'flan', '🍭':'paleta', '🍧':'raspado', '🍵':'te', '🥤':'refresco',
  // En la casa
  '🏠':'casa', '🛏️':'cama', '🪑':'silla', '📖':'libro', '⏰':'reloj', '🚪':'puerta', '🔑':'llave', '☕':'taza', '🪟':'ventana', '🛋️':'sofa', '🛁':'banyera', '🚿':'ducha', '🚽':'inodoro', '🧼':'jabon', '🪥':'cepillo-de-dientes', '🪞':'espejo', '🧹':'escoba', '🥄':'cuchara', '🍴':'tenedor', '🍽️':'plato', '📺':'tele', '📱':'telefono', '💻':'computadora', '✂️':'tijeras', '✏️':'lapiz', '🕯️':'vela', '📦':'caja', '🎒':'mochila', '☂️':'paraguas', '🪜':'escalera', '🎁':'regalo', '🪣':'cubeta', '💡':'foco', '🔦':'linterna', '🧊':'hielo', '🫖':'tetera', '🥢':'palillos', '🥣':'tazon', '🫙':'frasco', '🧽':'esponja', '🧻':'papel-de-banyo', '🗑️':'bote-de-basura', '🛒':'carrito-del-super', '🔨':'martillo', '🪛':'desarmador', '🧲':'iman', '📎':'clip', '✉️':'carta', '📮':'buzon', '📷':'camara', '🖍️':'crayon', '📓':'cuaderno', '🗓️':'calendario', '🔔':'campana', '⌛':'reloj-de-arena', '🖼️':'cuadro', '🪴':'planta', '🧳':'maleta', '🔋':'pila', '🔌':'enchufe', '📻':'radio', '🧵':'hilo', '🧶':'estambre', '🧺':'canasta',
  // Los juguetes
  '⚽':'pelota', '🧸':'osito', '🎈':'globo', '🪁':'papalote', '🪀':'yoyo', '🪆':'munyeca', '🧩':'rompecabezas', '🎲':'dados', '🤖':'robot', '🦕':'dinosaurio', '🛹':'patineta', '🛼':'patines', '👑':'corona', '🪄':'varita-magica', '🥁':'tambor', '🎸':'guitarra', '🎺':'trompeta', '🎹':'piano', '🎻':'violin', '⚾':'pelota-de-beisbol', '🏀':'pelota-de-basquetbol', '🏏':'bate', '🏆':'trofeo', '🫧':'burbuja', '🪅':'pinyata', '♟️':'ajedrez', '🃏':'cartas', '🎳':'boliche', '🏈':'balon-de-futbol-americano', '🎾':'pelota-de-tenis', '🏐':'voleibol', '🏓':'ping-pong', '🥏':'disco-volador', '🛝':'resbaladilla', '🎠':'carrusel', '🎡':'rueda-de-la-fortuna', '🎢':'montanya-rusa', '🎪':'circo', '🎊':'confeti', '🎷':'saxofon', '🪗':'acordeon', '🎤':'microfono', '🎧':'audifonos', '🛷':'trineo', '🧱':'bloques', '🪃':'bumeran', '🎮':'videojuego', '🎨':'pinturas',
  // La ropa
  '👟':'zapato', '👒':'sombrero', '👕':'camisa', '👖':'pantalones', '👗':'vestido', '🧦':'calcetines', '🧣':'bufanda', '🧤':'guantes', '🧥':'abrigo', '🧢':'gorra', '👓':'lentes', '👢':'bota', '🩳':'shorts', '🩱':'traje-de-banyo', '👔':'corbata', '👡':'sandalia', '👜':'bolsa', '💍':'anillo', '🩴':'chanclas', '⛑️':'casco', '👚':'blusa', '👘':'kimono', '🩲':'calzones', '🥼':'bata', '🦺':'chaleco', '👠':'tacon', '🩰':'zapatillas-de-ballet', '🎩':'sombrero-de-copa', '🎓':'birrete', '👛':'monedero', '💼':'maletin', '🕶️':'lentes-de-sol', '🥽':'goggles', '💄':'lapiz-labial', '💎':'diamante', '🎽':'camiseta-deportiva', '🛍️':'bolsas-de-compras', '🎀':'monyo', '⌚':'reloj-de-pulsera', '👙':'bikini',
  // Mi cuerpo y la gente
  '✋':'mano', '🦶':'pie', '👃':'nariz', '👄':'boca', '👁️':'ojo', '👂':'oreja', '🦷':'diente', '🦵':'pierna', '💪':'brazo', '👅':'lengua', '👆':'dedo', '👍':'pulgar', '😊':'cara', '❤️':'corazon', '🧠':'cerebro', '🦴':'hueso', '👶':'bebe', '👦':'ninyo', '👧':'ninya', '👣':'huellas-de-pies', '👩':'mama', '👨':'papa', '👴':'abuelo', '👵':'abuela', '👪':'familia', '👫':'amigos', '🧔':'barba', '🩹':'curita', '🧑‍🚒':'bombero', '👮':'policia', '🧑‍⚕️':'doctor', '🧑‍🍳':'cocinero', '🧑‍🏫':'maestra', '🧑‍🚀':'astronauta', '🧙':'mago', '🧚':'hada', '🧜‍♀️':'sirena', '🦸':'superheroe', '👸':'princesa', '🤴':'principe',
  // Afuera
  '☀️':'sol', '🌙':'luna', '⭐':'estrella', '🌸':'flor', '🌳':'arbol', '☁️':'nube', '🌧️':'lluvia', '🌈':'arcoiris', '❄️':'nieve', '⛄':'munyeco-de-nieve', '⚡':'rayo', '🔥':'fuego', '⛰️':'montanya', '🌋':'volcan', '🏖️':'playa', '🌊':'ola', '🍁':'hoja', '🌵':'cactus', '🍄':'hongo', '🪨':'roca', '🪐':'planeta', '🌍':'tierra', '🌻':'girasol', '🌹':'rosa', '🌪️':'tornado', '💧':'gota', '🌬️':'viento', '🌴':'palmera', '🏝️':'isla', '🏜️':'desierto', '🌅':'amanecer', '🌃':'noche', '🌌':'galaxia', '☄️':'cometa', '🌠':'estrella-fugaz', '⛈️':'tormenta', '🌫️':'niebla', '🌀':'huracan', '🌱':'brote', '🌲':'pino', '🍀':'trebol', '🌷':'tulipan', '🌼':'margarita', '💐':'ramo-de-flores', '🪵':'tronco', '⛺':'casa-de-campanya', '🌉':'puente', '⛲':'fuente', '🏰':'castillo', '🏫':'escuela', '🏥':'hospital', '🏪':'tienda', '🏙️':'ciudad', '🎆':'fuegos-artificiales', '🧭':'brujula', '🗺️':'mapa',
  // ¡A viajar!
  '🚗':'carro', '🚌':'autobus', '✈️':'avion', '⛵':'barco', '🚂':'tren', '🚲':'bicicleta', '🚚':'camion', '🚀':'cohete', '🏍️':'moto', '🚁':'helicoptero', '🚕':'taxi', '🚑':'ambulancia', '🚒':'camion-de-bomberos', '🚓':'carro-de-policia', '🚜':'tractor', '🚤':'lancha', '🛳️':'crucero', '🛶':'canoa', '🛴':'patinete', '🚋':'tranvia', '🛸':'ovni', '🪂':'paracaidas', '🏗️':'grua', '🏎️':'carro-de-carreras', '🚙':'camioneta', '🚐':'combi', '🚃':'vagon', '🚄':'tren-bala', '🚇':'metro', '🚉':'estacion', '🚡':'teleferico', '🛩️':'avioneta', '🛰️':'satelite', '⛴️':'ferry', '🚢':'buque', '🛥️':'yate', '⚓':'ancla', '🛟':'salvavidas', '🛞':'llanta', '⛽':'gasolinera', '🚦':'semaforo', '🛑':'senyal-de-alto', '🚏':'parada-de-autobus', '🛺':'mototaxi', '🛵':'motoneta', '🚛':'trailer', '🛣️':'carretera', '🛤️':'vias-del-tren',
  // Colores y formas
  '@rojo':'rojo', '@azul':'azul', '@amarillo':'amarillo', '@verde':'verde', '@morado':'morado', '@fucsia':'fucsia', '@negro':'negro', '@blanco':'blanco', '@gris':'gris', '@cafe':'cafe', '@dorado':'dorado', '@plateado':'plateado', '@celeste':'celeste', '@turquesa':'turquesa', '@lila':'lila', '@beige':'beige', '@circulo':'circulo', '@cuadrado':'cuadrado', '@triangulo':'triangulo', '@rectangulo':'rectangulo', '@ovalo':'ovalo', '@rombo':'rombo', '@pentagono':'pentagono', '@hexagono':'hexagono', '@espiral':'espiral', '@cubo':'cubo', '@esfera':'esfera', '@cono':'cono', '@cilindro':'cilindro', '@media-luna':'media-luna',
  // Los números
  '@cero':'cero', '@uno':'uno', '@dos':'dos', '@tres':'tres', '@cuatro':'cuatro', '@cinco':'cinco', '@seis':'seis', '@siete':'siete', '@ocho':'ocho', '@nueve':'nueve', '@diez':'diez', '@once':'once', '@doce':'doce', '@trece':'trece', '@catorce':'catorce', '@quince':'quince', '@dieciseis':'dieciseis', '@diecisiete':'diecisiete', '@dieciocho':'dieciocho', '@diecinueve':'diecinueve', '@veinte':'veinte', '@treinta':'treinta', '@cuarenta':'cuarenta', '@cincuenta':'cincuenta', '@cien':'cien',
  // La familia
  '@hermano':'hermano', '@hermana':'hermana', '@tio':'tio', '@tia':'tia', '@primo':'primo', '@prima':'prima', '@hijo':'hijo', '@hija':'hija', '@nieto':'nieto', '@nieta':'nieta', '@bisabuelo':'bisabuelo', '@bisabuela':'bisabuela', '@sobrino':'sobrino', '@sobrina':'sobrina', '@esposo':'esposo', '@esposa':'esposa', '@padrino':'padrino', '@madrina':'madrina', '@gemelos':'gemelos', '@gemelas':'gemelas', '@padrastro':'padrastro', '@madrastra':'madrastra', '@cunyado':'cunyado', '@cunyada':'cunyada', '@padres':'padres',
  // En la escuela
  '@pizarron':'pizarron', '@borrador':'borrador', '@regla':'regla', '@sacapuntas':'sacapuntas', '@pegamento':'pegamento', '@cartulina':'cartulina', '@escritorio':'escritorio', '@pupitre':'pupitre', '@marcador':'marcador', '@lonchera':'lonchera', '@uniforme':'uniforme', '@biblioteca':'biblioteca', '@salon-de-clases':'salon-de-clases', '@recreo':'recreo', '@tarea':'tarea', '@examen':'examen', '@diploma':'diploma', '@medalla':'medalla', '@calculadora':'calculadora', '@globo-terraqueo':'globo-terraqueo', '@proyector':'proyector', '@plastilina':'plastilina', '@pincel':'pincel', '@acuarela':'acuarela', '@sello':'sello', '@grapadora':'grapadora', '@libro-de-texto':'libro-de-texto', '@estuche':'estuche', '@pizarra-blanca':'pizarra-blanca', '@portapapeles':'portapapeles',
  // Los sentimientos
  '@alegria':'alegria', '@tristeza':'tristeza', '@miedo':'miedo', '@enojo':'enojo', '@sorpresa':'sorpresa', '@calma':'calma', '@amor':'amor', '@verguenza':'verguenza', '@orgullo':'orgullo', '@asco':'asco', '@emocion':'emocion', '@aburrimiento':'aburrimiento', '@curiosidad':'curiosidad', '@timidez':'timidez', '@paciencia':'paciencia', '@frustracion':'frustracion', '@confianza':'confianza', '@celos':'celos', '@soledad':'soledad', '@gratitud':'gratitud',
  // ¡A moverse!
  '@correr':'correr', '@saltar':'saltar', '@caminar':'caminar', '@bailar':'bailar', '@cantar':'cantar', '@reir':'reir', '@llorar':'llorar', '@dormir':'dormir', '@despertar':'despertar', '@comer':'comer', '@beber':'beber', '@nadar':'nadar', '@volar':'volar', '@trepar':'trepar', '@gatear':'gatear', '@rodar':'rodar', '@girar':'girar', '@aplaudir':'aplaudir', '@saludar':'saludar', '@abrazar':'abrazar', '@besar':'besar', '@sonreir':'sonreir', '@guinyar':'guinyar', '@escuchar':'escuchar', '@mirar':'mirar', '@oler':'oler', '@probar':'probar', '@tocar':'tocar', '@senyalar':'senyalar', '@esconderse':'esconderse',
  // ¿Qué hacemos?
  '@buscar':'buscar', '@encontrar':'encontrar', '@abrir':'abrir', '@cerrar':'cerrar', '@subir':'subir', '@bajar':'bajar', '@empujar':'empujar', '@jalar':'jalar', '@lanzar':'lanzar', '@atrapar':'atrapar', '@patear':'patear', '@apilar':'apilar', '@construir':'construir', '@romper':'romper', '@arreglar':'arreglar', '@lavar':'lavar', '@secar':'secar', '@peinar':'peinar', '@vestirse':'vestirse', '@desvestirse':'desvestirse', '@dibujar':'dibujar', '@pintar':'pintar', '@recortar':'recortar', '@pegar':'pegar', '@doblar':'doblar', '@mezclar':'mezclar', '@verter':'verter', '@compartir':'compartir', '@ayudar':'ayudar', '@esperar':'esperar',
  // Frutas y verduras
  '@mandarina':'mandarina', '@toronja':'toronja', '@lima':'lima', '@papaya':'papaya', '@guayaba':'guayaba', '@granada':'granada', '@higo':'higo', '@ciruela':'ciruela', '@chabacano':'chabacano', '@nectarina':'nectarina', '@lichi':'lichi', '@granadilla':'granadilla', '@mora':'mora', '@frambuesa':'frambuesa', '@datil':'datil', '@tamarindo':'tamarindo', '@membrillo':'membrillo', '@tuna':'tuna', '@caqui':'caqui', '@coliflor':'coliflor', '@berenjena':'berenjena', '@calabacita':'calabacita', '@calabaza':'calabaza', '@apio':'apio', '@rabano':'rabano', '@betabel':'betabel', '@espinaca':'espinaca', '@repollo':'repollo', '@esparrago':'esparrago', '@nabo':'nabo',
  // En la cocina
  '@olla':'olla', '@sarten':'sarten', '@horno':'horno', '@estufa':'estufa', '@refrigerador':'refrigerador', '@congelador':'congelador', '@microondas':'microondas', '@licuadora':'licuadora', '@tostadora':'tostadora', '@colador':'colador', '@cucharon':'cucharon', '@espatula':'espatula', '@batidor':'batidor', '@rodillo':'rodillo', '@tabla-de-cortar':'tabla-de-cortar', '@cuchillo':'cuchillo', '@jarra':'jarra', '@vaso':'vaso', '@botella':'botella', '@mantel':'mantel', '@servilleta':'servilleta', '@bandeja':'bandeja', '@tapa':'tapa', '@abrelatas':'abrelatas', '@pelador':'pelador', '@rallador':'rallador', '@manopla-de-cocina':'manopla-de-cocina', '@receta':'receta', '@masa':'masa', '@delantal':'delantal',
  // El baño y la recámara
  '@lavabo':'lavabo', '@toalla':'toalla', '@peine':'peine', '@champu':'champu', '@acondicionador':'acondicionador', '@grifo':'grifo', '@pasta-dental':'pasta-dental', '@hilo-dental':'hilo-dental', '@secador-de-pelo':'secador-de-pelo', '@cepillo-de-pelo':'cepillo-de-pelo', '@almohada':'almohada', '@sabana':'sabana', '@cobija':'cobija', '@funda-de-almohada':'funda-de-almohada', '@colchon':'colchon', '@litera':'litera', '@lampara':'lampara', '@armario':'armario', '@cajon':'cajon', '@comoda':'comoda', '@percha':'percha', '@alfombra':'alfombra', '@cortina':'cortina', '@despertador':'despertador', '@pijama':'pijama', '@peluche':'peluche', '@botiquin':'botiquin', '@bata-de-banyo':'bata-de-banyo', '@tapete-de-banyo':'tapete-de-banyo', '@jabonera':'jabonera',
  // ¡Fiesta!
  '@cumpleanyos':'cumpleanyos', '@guirnalda':'guirnalda', '@gorrito-de-fiesta':'gorrito-de-fiesta', '@invitacion':'invitacion', '@tarjeta-de-cumpleanyos':'tarjeta-de-cumpleanyos', '@serpentina':'serpentina', '@matrimonio':'matrimonio', '@aniversario':'aniversario', '@disfraz':'disfraz', '@mascara':'mascara', '@antifaz':'antifaz', '@corona-de-papel':'corona-de-papel', '@pastelito-de-cumpleanyos':'pastelito-de-cumpleanyos', '@musico':'musico', '@payaso':'payaso', '@brindis':'brindis', '@vela-de-cumpleanyos':'vela-de-cumpleanyos', '@navidad':'navidad', '@nochebuena':'nochebuena', '@pascua':'pascua', '@anyo-nuevo':'anyo-nuevo', '@dia-de-muertos':'dia-de-muertos', '@calavera-de-azucar':'calavera-de-azucar', '@altar-de-muertos':'altar-de-muertos', '@desfile':'desfile', '@festival':'festival', '@decoracion':'decoracion', '@centro-de-mesa':'centro-de-mesa', '@bolsita-de-recuerdos':'bolsita-de-recuerdos', '@cabina-de-fotos':'cabina-de-fotos',
  // Los deportes
  '@futbol':'futbol', '@baloncesto':'baloncesto', '@tenis':'tenis', '@natacion':'natacion', '@gimnasia':'gimnasia', '@ciclismo':'ciclismo', '@golf':'golf', '@hockey':'hockey', '@badminton':'badminton', '@boxeo':'boxeo', '@karate':'karate', '@yoga':'yoga', '@surf':'surf', '@esqui':'esqui', '@patinaje-sobre-hielo':'patinaje-sobre-hielo', '@remo':'remo', '@esgrima':'esgrima', '@escalada':'escalada', '@arco':'arco', '@rugby':'rugby', '@raqueta':'raqueta', '@porteria':'porteria', '@aro-de-basquetbol':'aro-de-basquetbol', '@red':'red', '@silbato':'silbato', '@arbitro':'arbitro', '@cronometro':'cronometro', '@meta':'meta', '@valla':'valla', '@guante-de-beisbol':'guante-de-beisbol',
  // Los oficios
  '@enfermera':'enfermera', '@dentista':'dentista', '@veterinaria':'veterinaria', '@panadero':'panadero', '@carpintera':'carpintera', '@mecanico':'mecanico', '@electricista':'electricista', '@plomero':'plomero', '@pintora':'pintora', '@jardinero':'jardinero', '@conductora-de-autobus':'conductora-de-autobus', '@piloto':'piloto', '@marinera':'marinera', '@pescador':'pescador', '@fotografa':'fotografa', '@artista':'artista', '@cantante':'cantante', '@bailarin':'bailarin', '@actriz':'actriz', '@cientifico':'cientifico', '@bibliotecaria':'bibliotecaria', '@vendedor':'vendedor', '@cartero':'cartero', '@peluquero':'peluquero', '@costurera':'costurera', '@zapatero':'zapatero', '@albanyil':'albanyil', '@arquitecto':'arquitecto', '@jueza':'jueza', '@periodista':'periodista',
  // La ciudad
  '@calle':'calle', '@acera':'acera', '@cruce-peatonal':'cruce-peatonal', '@tunel':'tunel', '@rotonda':'rotonda', '@plaza':'plaza', '@parque':'parque', '@banco-de-plaza':'banco-de-plaza', '@farmacia':'farmacia', '@panaderia':'panaderia', '@cafeteria':'cafeteria', '@restaurante':'restaurante', '@museo':'museo', '@cine':'cine', '@teatro':'teatro', '@zoologico':'zoologico', '@estacion-de-bomberos':'estacion-de-bomberos', '@comisaria':'comisaria', '@oficina-de-correos':'oficina-de-correos', '@supermercado':'supermercado', '@mercado':'mercado', '@rascacielos':'rascacielos', '@edificio-de-apartamentos':'edificio-de-apartamentos', '@apartamento':'apartamento', '@iglesia':'iglesia', '@estacionamiento':'estacionamiento', '@farol':'farol', '@hidrante':'hidrante', '@alcantarilla':'alcantarilla', '@ascensor':'ascensor',
  // El tiempo
  '@primavera':'primavera', '@verano':'verano', '@otonyo':'otonyo', '@invierno':'invierno', '@clima':'clima', '@temperatura':'temperatura', '@calor':'calor', '@frio':'frio', '@bochorno':'bochorno', '@helada':'helada', '@granizo':'granizo', '@aguanieve':'aguanieve', '@llovizna':'llovizna', '@chaparron':'chaparron', '@ventisca':'ventisca', '@nevada':'nevada', '@rocio':'rocio', '@escarcha':'escarcha', '@brisa':'brisa', '@rafaga':'rafaga', '@trueno':'trueno', '@tormenta-de-arena':'tormenta-de-arena', '@tormenta-de-nieve':'tormenta-de-nieve', '@cielo-despejado':'cielo-despejado', '@sombra':'sombra', '@atardecer':'atardecer', '@mediodia':'mediodia', '@manyana':'manyana', '@tarde':'tarde', '@dia':'dia',
  // Animales del mundo
  '@jaguar':'jaguar', '@guepardo':'guepardo', '@lince':'lince', '@suricata':'suricata', '@hiena':'hiena', '@antilope':'antilope', '@gacela':'gacela', '@okapi':'okapi', '@tapir':'tapir', '@armadillo':'armadillo', '@pangolin':'pangolin', '@puercoespin':'puercoespin', '@wombat':'wombat', '@ornitorrinco':'ornitorrinco', '@equidna':'equidna', '@capibara':'capibara', '@lemur':'lemur', '@avestruz':'avestruz', '@emu':'emu', '@tucan':'tucan', '@colibri':'colibri', '@pelicano':'pelicano', '@buitre':'buitre', '@garza':'garza', '@morsa':'morsa', '@manati':'manati', '@narval':'narval', '@orca':'orca', '@mantarraya':'mantarraya', '@caballito-de-mar':'caballito-de-mar',
  // Herramientas y jardín
  '@pala':'pala', '@rastrillo':'rastrillo', '@azada':'azada', '@regadera':'regadera', '@manguera':'manguera', '@tijeras-de-podar':'tijeras-de-podar', '@carretilla':'carretilla', '@maceta':'maceta', '@semilla':'semilla', '@abono':'abono', '@pala-de-mano':'pala-de-mano', '@sierra':'sierra', '@taladro':'taladro', '@llave-inglesa':'llave-inglesa', '@alicates':'alicates', '@cinta-metrica':'cinta-metrica', '@nivel':'nivel', '@tornillo':'tornillo', '@clavo':'clavo', '@tuerca':'tuerca', '@arandela':'arandela', '@lija':'lija', '@cinta-adhesiva':'cinta-adhesiva', '@brocha':'brocha', '@rama':'rama', '@raiz':'raiz', '@tallo':'tallo', '@petalo':'petalo', '@espina':'espina', '@maleza':'maleza',
};
const ART_V = 2;
const ART_REDO = { plomero:3, jardinero:3, bailarin:3, cartero:3, 'conductora-de-autobus':3 };   // redrawn stickers: a new version just for these, so devices fetch the new picture
function picHTML(e){ const f = ART[e]; return f ? `<img class="wart" src="art/words/${f}.png?v=${ART_REDO[f]||ART_V}" alt="${e}" draggable="false">` : e; }
function setPic(el, e){ el.innerHTML = picHTML(e); }
// words whose picture is drawn art only ("@name") wait until their picture is in ART; a world of them opens when all are in
for(const c of Object.values(VOCAB)){ const all=c.words.length; c.words=c.words.filter(w=>w[2][0]!=='@' || ART[w[2]]); if(c.more) c.ready = all>0 && c.words.length===all; }
const WORD = {}; Object.values(VOCAB).forEach(c=>c.words.forEach(w=>WORD[w[2]]=w));
for(const e in EXTRA_WORDS){ const [a,w,en]=EXTRA_WORDS[e]; WORD[e]=[a,w,e,en]; }
// One normal <audio> element plays everything: unlike Web Audio it still plays when an iPhone is on silent.
const player = new Audio(); player.preload='auto'; player.setAttribute('playsinline',''); player.setAttribute('webkit-playsinline','');
const SILENT='data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
function unlockAudio(){
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  if(VOICE.unlocked || VOICE.tok) return;          // a real clip is (or was) playing: nothing to unlock
  try{ player.src=SILENT; const p=player.play(); if(p&&p.then) p.then(()=>{ VOICE.unlocked=true; }).catch(()=>{}); }catch(e){}
}
['touchend','click'].forEach(ev=>document.addEventListener(ev, unlockAudio, {capture:true}));
// each group = audio/<g>.mp3 (MP3 clips back to back) + audio/<g>.json ({key:[offset,length]})
function loadGroup(g){
  if(!VOICE.loading[g]) VOICE.loading[g] = Promise.all([
      fetch(`audio/${g}.json`).then(r=>{ if(!r.ok) throw new Error('json '+r.status); return r.json(); }),
      fetch(`audio/${g}.mp3`).then(r=>{ if(!r.ok) throw new Error('mp3 '+r.status); return r.arrayBuffer(); })
    ]).then(([idx,bin])=>{ for(const k in idx) VOICE.clips[k]={bin, off:idx[k][0], len:idx[k][1]}; VOICE.loadedGroups++; return true; })
      .catch(e=>{ VOICE.status='Could not download the recordings ('+(e&&e.message||e)+').'; delete VOICE.loading[g]; return false; });
  return VOICE.loading[g];
}
const groupsFor = cat => VOCAB[cat] && VOCAB[cat].from ? VOCAB[cat].from : cat==='todas' ? Object.keys(VOCAB).filter(k=>k!=='todos'&&k!=='todas')
                       : cat==='todos' ? Object.keys(VOCAB).filter(k=>VOCAB[k].animal) : [cat];
const loadCat = cat => Promise.all(groupsFor(cat).map(loadGroup));
function keyText(k){
  const i=k.indexOf('|'), t=k.slice(0,i), v=k.slice(i+1), w=WORD[v];
  switch(t){
    case 'c': return v;
    case 'w': return phrase(w)+'.';
    case 'd': return dondeText(w, phrase(w));
    case 'b': return `¡Busca ${phrase(w)}!`;
    case 'q': return `¡Quiero ${phrase(w)}!`;
    case 'e': return isAction(w) ? `¡A ${w[1]}!` : `${plural(w)?'Son':'Es'} ${phrase(w)}.`;
    case 'a': return RIDDLES[v][0]+' '+riddleQ(v)[0];
    case 'f': return DEFS[v][0];
    case 'v': return VERDAD[+v][1];
    case 'k': return CUAL[+v][0];
    case 'x': return '';
    case 'z': { const t=v[0], rest=v.slice(1);
      if(t==='r') return ZORRO.frases[+rest][1];
      if(t==='s') return scriptLines(0)[+rest].es;
      if(t==='p') return scriptLines(1)[+rest].es;
      if(t==='v') return ZORRO.vocab[+rest][0]+'.';
      if(t==='t') return ZORRO.lessons[+rest].t+'.';
      const [li,fi]=rest.split('_').map(Number), f=ZORRO.lessons[li]&&ZORRO.lessons[li].facts[fi];
      if(t==='f') return f ? plainEs(f[1]) : '';
      if(t==='k') return f && f[3] ? f[3][0] : '';
      return ''; }
    case 'r': return `¡Racha de ${v}!`;
    case 'p': return v==='1' ? 'un punto.' : `${v} puntos.`;
    case 'j': return `en ${v} jugadas.`;
  }
  return '';
}
let lastURL=null;
function stopClips(){ try{ player.pause(); }catch(e){} }
// Say a list of clip keys. Dora's recordings are joined into one MP3 and played; if that can't play, the device voice says it.
async function talk(keys){
  keys=keys.filter(Boolean);
  if(S.fartNext){ S.fartNext=false; keys=['x|fart'+(1+Math.floor(Math.random()*3)), ...keys]; }
  const tok=++VOICE.tok; stopClips(); synth&&synth.cancel();
  if(VOICE.on && keys.every(k=>VOICE.clips[k])){
    const parts=keys.map(k=>{ const c=VOICE.clips[k]; return new Uint8Array(c.bin, c.off, c.len); });
    const bytes=parts.reduce((t,p)=>t+p.length,0);
    const url=URL.createObjectURL(new Blob(parts,{type:'audio/mpeg'}));
    try{
      player.src=url;
      await player.play();
      VOICE.unlocked=true; VOICE.status='ok';
      if(lastURL) URL.revokeObjectURL(lastURL); lastURL=url;
      await new Promise(res=>{
        const t=setTimeout(fin, bytes/4000*1000 + 1500);   // 32 kbps ≈ 4000 bytes per second
        function fin(){ clearTimeout(t); player.removeEventListener('ended',fin); player.removeEventListener('error',fin); player.removeEventListener('pause',fin); res(); }
        player.addEventListener('ended',fin); player.addEventListener('error',fin); player.addEventListener('pause',fin);
      });
      return;
    }catch(e){
      URL.revokeObjectURL(url);
      VOICE.status = 'The phone blocked the recording ('+(e&&e.name||e)+'), so the device voice was used.';
      if(tok!==VOICE.tok) return;
    }
  } else if(VOICE.on && !VOICE.status) VOICE.status='Recordings still downloading — the device voice was used.';
  if(tok!==VOICE.tok) return;
  return speak(keys.map(keyText).filter(Boolean).join(' '));
}
loadGroup('common'); loadGroup('silly');   // silly has the miss lines and some game names, so every age needs it

/* ======================= helpers ======================= */
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function setStars(n){ S.stars=n; store.set('stars',n); $('starCount').textContent=n; }
function burst(x,y,set=['⭐','✨','🎉','💛'],n=12){
  for(let k=0;k<n;k++){
    const b=document.createElement('div'); b.className='burst'; b.textContent=set[k%set.length];
    b.style.left=x+'px'; b.style.top=y+'px';
    const a=Math.random()*Math.PI*2, d=90+Math.random()*120;
    b.style.setProperty('--dx',Math.cos(a)*d+'px'); b.style.setProperty('--dy',Math.sin(a)*d+'px'); b.style.setProperty('--r',(Math.random()*360)+'deg');
    document.body.appendChild(b); setTimeout(()=>b.remove(),1000);
  }
}
function banner(text, cls=''){
  const c=document.createElement('div'); c.className='cheer '+cls; c.innerHTML=`<div class="b">${text}</div>`;
  document.body.appendChild(c); setTimeout(()=>c.remove(),1200);
}
const PRAISE=['¡Muy bien!','¡Excelente!','¡Sí!','¡Bravo!','¡Genial!','¡Eso es!'];
const praise = () => PRAISE[Math.floor(Math.random()*PRAISE.length)];
function toast(html){ document.querySelectorAll('.toast').forEach(t=>t.remove()); const t=document.createElement('div'); t.className='toast'; t.innerHTML=html; document.body.appendChild(t); setTimeout(()=>t.remove(),1900); }

/* ======================= smart practice ======================= */
// Words missed recently come back more; words answered right 3+ times in a row show up less.
function weight(w){
  const st=stats[w[2]];
  if(!st) return 2;                  // never tried
  if(st.s===0 && st.w>0) return 4;   // missed last time
  if(st.s>=3) return 0.35;           // mastered
  return 1.2;
}
function pickTarget(words){
  S.recent = S.recent || [];
  let pool = words.filter(w=>!S.recent.includes(w[2]));
  if(!pool.length) pool = words;
  let total = pool.reduce((t,w)=>t+weight(w),0), r=Math.random()*total;
  let pick = pool[pool.length-1];
  for(const w of pool){ r-=weight(w); if(r<=0){ pick=w; break; } }
  S.recent.push(pick[2]); if(S.recent.length>Math.min(6, Math.floor(words.length/2))) S.recent.shift();
  return pick;
}
function distractors(words, target, n){ return shuffle(uniq(words.filter(w=>w[2]!==target[2]))).slice(0,n); }
function record(w, ok){
  const st = stats[w[2]] || (stats[w[2]]={r:0,w:0,s:0});
  const first = ok && st.r===0;
  if(ok){ st.r++; st.s++; } else { st.w++; st.s=0; }
  store.set('stats', stats);
  if(first) toast(`<b>${picHTML(w[2])}</b> ¡Nueva estampa!`);
}
const found = w => (stats[w[2]]||{}).r>0;

