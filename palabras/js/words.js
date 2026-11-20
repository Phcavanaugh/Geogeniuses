// ¡Hola, Palabras! — All the vocabulary: every world and its words.
// Plain script (not a module): files load in order and share one global scope; see index.html.
const VOCAB = {
  granja: { es:'En la granja', en:'Farm animals', icon:'🐮', color:'#FFE0D6', animal:true, words:[
    ['el','perro','🐶','dog'],['el','gato','🐱','cat'],['la','vaca','🐮','cow'],['el','cerdo','🐷','pig'],
    ['el','caballo','🐴','horse'],['la','oveja','🐑','sheep'],['la','cabra','🐐','goat'],['la','gallina','🐔','hen'],
    ['el','gallo','🐓','rooster'],['el','pollito','🐤','chick'],['el','pato','🦆','duck'],['el','pavo','🦃','turkey'],
    ['el','conejo','🐰','rabbit'],['el','ratón','🐭','mouse'],['la','llama','🦙','llama'],['el','toro','🐂','bull'] ]},
  zoo: { es:'En el zoológico', en:'Zoo & jungle', icon:'🦁', color:'#FFE9C7', animal:true, words:[
    ['el','león','🦁','lion'],['el','tigre','🐯','tiger'],['el','elefante','🐘','elephant'],['la','jirafa','🦒','giraffe'],
    ['la','cebra','🦓','zebra'],['el','mono','🐵','monkey'],['el','gorila','🦍','gorilla'],['el','hipopótamo','🦛','hippo'],
    ['el','rinoceronte','🦏','rhino'],['el','cocodrilo','🐊','crocodile'],['el','camello','🐫','camel'],['el','canguro','🦘','kangaroo'],
    ['el','koala','🐨','koala'],['el','panda','🐼','panda'],['la','serpiente','🐍','snake'],['el','perezoso','🦥','sloth'],
    ['el','leopardo','🐆','leopard'],['el','orangután','🦧','orangutan'] ]},
  mar: { es:'En el mar', en:'Sea animals', icon:'🐙', color:'#D6F0FF', animal:true, words:[
    ['el','pez','🐟','fish'],['el','pulpo','🐙','octopus'],['la','ballena','🐳','whale'],['el','delfín','🐬','dolphin'],
    ['el','tiburón','🦈','shark'],['la','tortuga','🐢','turtle'],['el','cangrejo','🦀','crab'],['la','foca','🦭','seal'],
    ['el','calamar','🦑','squid'],['la','langosta','🦞','lobster'],['el','camarón','🦐','shrimp'],['el','pez globo','🐡','pufferfish'],
    ['la','nutria','🦦','otter'],['el','pez tropical','🐠','tropical fish'],['la','medusa','🪼','jellyfish'],['la','concha','🐚','seashell'],['el','coral','🪸','coral'],['el','oso polar','🐻‍❄️','polar bear'] ]},
  bosque: { es:'En el bosque', en:'Forest animals', icon:'🦊', color:'#E3F2D9', animal:true, words:[
    ['el','oso','🐻','bear'],['el','zorro','🦊','fox'],['el','lobo','🐺','wolf'],['la','ardilla','🐿️','squirrel'],
    ['el','erizo','🦔','hedgehog'],['el','búho','🦉','owl'],['el','murciélago','🦇','bat'],['el','venado','🦌','deer'],
    ['el','castor','🦫','beaver'],['el','mapache','🦝','raccoon'],['el','jabalí','🐗','wild boar'],['el','tejón','🦡','badger'],
    ['la','rana','🐸','frog'],['el','bisonte','🦬','bison'],['la','lagartija','🦎','lizard'],['el','mamut','🦣','mammoth'] ]},
  bichos: { es:'Los bichos', en:'Bugs & creepy crawlies', icon:'🐞', color:'#FBE7FF', animal:true, words:[
    ['la','abeja','🐝','bee'],['la','mariposa','🦋','butterfly'],['la','hormiga','🐜','ant'],['la','araña','🕷️','spider'],
    ['la','mariquita','🐞','ladybug'],['la','oruga','🐛','caterpillar'],['el','escarabajo','🪲','beetle'],['el','saltamontes','🦗','grasshopper'],
    ['la','mosca','🪰','fly'],['el','mosquito','🦟','mosquito'],['el','gusano','🪱','worm'],['el','caracol','🐌','snail'],
    ['el','escorpión','🦂','scorpion'],['la','cucaracha','🪳','cockroach'],['el','microbio','🦠','germ'] ]},
  aves: { es:'Los pájaros', en:'Birds', icon:'🦜', color:'#E0F7F1', animal:true, words:[
    ['el','pájaro','🐦','bird'],['el','pingüino','🐧','penguin'],['el','loro','🦜','parrot'],['el','flamenco','🦩','flamingo'],
    ['el','pavo real','🦚','peacock'],['el','cisne','🦢','swan'],['el','águila','🦅','eagle','f'],['la','paloma','🕊️','dove'],
    ['el','dodo','🦤','dodo'],['el','ganso','🪿','goose'],['el','cuervo','🐦‍⬛','crow'],['el','pollito en el huevo','🐣','hatching chick'] ]},
  todos: { es:'¡Todos los animales!', en:'All animals — hardest!', icon:'🌍', color:'#FFF1B8', words:null },
  comida: { es:'La comida', en:'Food', icon:'🍎', color:'#FFF1B8', words:[
    ['la','manzana','🍎','apple'],['el','plátano','🍌','banana'],['la','leche','🥛','milk'],['el','pan','🍞','bread'],
    ['el','queso','🧀','cheese'],['las','uvas','🍇','grapes'],['la','galleta','🍪','cookie'],['el','huevo','🥚','egg'],
    ['la','fresa','🍓','strawberry'],['el','helado','🍦','ice cream'],['la','naranja','🍊','orange'],['la','zanahoria','🥕','carrot'],
    ['la','sandía','🍉','watermelon'],['la','piña','🍍','pineapple'],['el','limón','🍋','lemon'],['la','pera','🍐','pear'],
    ['las','cerezas','🍒','cherries'],['el','durazno','🍑','peach'],['el','coco','🥥','coconut'],['el','aguacate','🥑','avocado'],
    ['el','tomate','🍅','tomato'],['el','brócoli','🥦','broccoli'],['el','maíz','🌽','corn'],['la','papa','🥔','potato'],
    ['el','pepino','🥒','cucumber'],['el','pastel','🎂','cake'],['la','pizza','🍕','pizza'],['la','hamburguesa','🍔','hamburger'],
    ['el','taco','🌮','taco'],['el','sándwich','🥪','sandwich'],['la','sopa','🍲','soup'],['el','arroz','🍚','rice'],
    ['las','palomitas','🍿','popcorn'],['las','papas fritas','🍟','french fries'],['la','dona','🍩','donut'],['el','chocolate','🍫','chocolate'],
    ['el','dulce','🍬','candy'],['la','miel','🍯','honey'],['el','jugo','🧃','juice'],['los','panqueques','🥞','pancakes'] ]},
  casa: { es:'En la casa', en:'At home', icon:'🏠', color:'#DDF3FF', words:[
    ['la','casa','🏠','house'],['la','cama','🛏️','bed'],['la','silla','🪑','chair'],['el','libro','📖','book'],
    ['el','reloj','⏰','clock'],['la','puerta','🚪','door'],['la','llave','🔑','key'],['la','taza','☕','cup'],
    ['la','ventana','🪟','window'],['el','sofá','🛋️','couch'],['la','bañera','🛁','bathtub'],['la','ducha','🚿','shower'],
    ['el','inodoro','🚽','toilet'],['el','jabón','🧼','soap'],['el','cepillo de dientes','🪥','toothbrush'],['el','espejo','🪞','mirror'],
    ['la','escoba','🧹','broom'],['la','cuchara','🥄','spoon'],['el','tenedor','🍴','fork'],['el','plato','🍽️','plate'],
    ['la','tele','📺','TV'],['el','teléfono','📱','phone'],['la','computadora','💻','computer'],['las','tijeras','✂️','scissors'],
    ['el','lápiz','✏️','pencil'],['la','vela','🕯️','candle'],['la','caja','📦','box'],['la','mochila','🎒','backpack'],
    ['el','paraguas','☂️','umbrella'],['la','escalera','🪜','ladder'],['el','regalo','🎁','present'],['la','cubeta','🪣','bucket'] ]},
  juguetes: { es:'Los juguetes', en:'Toys & music', icon:'🧸', color:'#FFE4D1', words:[
    ['la','pelota','⚽','ball'],['el','osito','🧸','teddy bear'],['el','globo','🎈','balloon'],['el','papalote','🪁','kite'],
    ['el','yoyó','🪀','yo-yo'],['la','muñeca','🪆','doll'],['el','rompecabezas','🧩','puzzle'],['los','dados','🎲','dice'],
    ['el','robot','🤖','robot'],['el','dinosaurio','🦕','dinosaur'],['la','patineta','🛹','skateboard'],['los','patines','🛼','roller skates'],
    ['la','corona','👑','crown'],['la','varita mágica','🪄','magic wand'],['el','tambor','🥁','drum'],['la','guitarra','🎸','guitar'],
    ['la','trompeta','🎺','trumpet'],['el','piano','🎹','piano'],['el','violín','🎻','violin'],['la','pelota de béisbol','⚾','baseball'],
    ['la','pelota de básquetbol','🏀','basketball'],['el','bate','🏏','bat'],['el','trofeo','🏆','trophy'],['la','burbuja','🫧','bubble'] ]},
  ropa: { es:'La ropa', en:'Clothes', icon:'👕', color:'#E6EEFF', words:[
    ['el','zapato','👟','shoe'],['el','sombrero','👒','hat'],['la','camisa','👕','shirt'],['los','pantalones','👖','pants'],
    ['el','vestido','👗','dress'],['los','calcetines','🧦','socks'],['la','bufanda','🧣','scarf'],['los','guantes','🧤','gloves'],
    ['el','abrigo','🧥','coat'],['la','gorra','🧢','cap'],['los','lentes','👓','glasses'],['la','bota','👢','boot'],
    ['los','shorts','🩳','shorts'],['el','traje de baño','🩱','swimsuit'],['la','corbata','👔','tie'],['la','sandalia','👡','sandal'],
    ['la','bolsa','👜','purse'],['el','anillo','💍','ring'],['las','chanclas','🩴','flip-flops'],['el','casco','⛑️','helmet'] ]},
  cuerpo: { es:'Mi cuerpo', en:'My body', icon:'✋', color:'#FFE4F0', words:[
    ['la','mano','✋','hand'],['el','pie','🦶','foot'],['la','nariz','👃','nose'],['la','boca','👄','mouth'],
    ['el','ojo','👁️','eye'],['la','oreja','👂','ear'],['el','diente','🦷','tooth'],['la','pierna','🦵','leg'],
    ['el','brazo','💪','arm'],['la','lengua','👅','tongue'],['el','dedo','👆','finger'],['el','pulgar','👍','thumb'],
    ['la','cara','😊','face'],['el','corazón','❤️','heart'],['el','cerebro','🧠','brain'],['el','hueso','🦴','bone'],
    ['el','bebé','👶','baby'],['el','niño','👦','boy'],['la','niña','👧','girl'],['las','huellas','👣','footprints'] ]},
  afuera: { es:'Afuera', en:'Outside & nature', icon:'☀️', color:'#E3F7DF', words:[
    ['el','sol','☀️','sun'],['la','luna','🌙','moon'],['la','estrella','⭐','star'],['la','flor','🌸','flower'],
    ['el','árbol','🌳','tree'],['la','nube','☁️','cloud'],['la','lluvia','🌧️','rain'],['el','arcoíris','🌈','rainbow'],
    ['la','nieve','❄️','snow'],['el','muñeco de nieve','⛄','snowman'],['el','rayo','⚡','lightning'],['el','fuego','🔥','fire'],
    ['la','montaña','⛰️','mountain'],['el','volcán','🌋','volcano'],['la','playa','🏖️','beach'],['la','ola','🌊','wave'],
    ['la','hoja','🍁','leaf'],['el','cactus','🌵','cactus'],['el','hongo','🍄','mushroom'],['la','roca','🪨','rock'],
    ['el','planeta','🪐','planet'],['la','Tierra','🌍','Earth'],['el','girasol','🌻','sunflower'],['la','rosa','🌹','rose'],
    ['el','tornado','🌪️','tornado'],['la','gota','💧','raindrop'],['el','viento','🌬️','wind'],['la','palmera','🌴','palm tree'] ]},
  vehiculos: { es:'¡A viajar!', en:'Things that go', icon:'🚗', color:'#ECE6FF', words:[
    ['el','carro','🚗','car'],['el','autobús','🚌','bus'],['el','avión','✈️','airplane'],['el','barco','⛵','sailboat'],
    ['el','tren','🚂','train'],['la','bicicleta','🚲','bicycle'],['el','camión','🚚','truck'],['el','cohete','🚀','rocket'],
    ['la','moto','🏍️','motorcycle'],['el','helicóptero','🚁','helicopter'],['el','taxi','🚕','taxi'],['la','ambulancia','🚑','ambulance'],
    ['el','camión de bomberos','🚒','fire truck'],['el','carro de policía','🚓','police car'],['el','tractor','🚜','tractor'],['la','lancha','🚤','speedboat'],
    ['el','crucero','🛳️','cruise ship'],['la','canoa','🛶','canoe'],['el','patinete','🛴','scooter'],['el','tranvía','🚋','trolley'],
    ['el','ovni','🛸','UFO'],['el','paracaídas','🪂','parachute'],['la','grúa','🏗️','crane'],['el','carro de carreras','🏎️','race car'] ]},
  todas: { es:'¡Todas las palabras!', en:'Every word — the big mix', icon:'🌟', color:'#FFD6E8', words:null }
};

const EXTRA = {
  granja:[['el','burro','🫏','donkey'],['el','carnero','🐏','ram'],['el','búfalo','🐃','water buffalo'],['la','rata','🐀','rat'],['el','gato negro','🐈‍⬛','black cat'],['el','caniche','🐩','poodle'],['el','hámster','🐹','hamster'],['el','granjero','🧑‍🌾','farmer'],['el','trigo','🌾','wheat'],['el','nido','🪺','nest'],['la','pluma','🪶','feather'],['las','huellas de animal','🐾','paw prints'],['el','perro guía','🦮','guide dog']],
  zoo:[['el','dromedario','🐪','dromedary camel'],['el','tiranosaurio','🦖','T. rex'],['el','dragón','🐉','dragon'],['el','unicornio','🦄','unicorn']],
  mar:[['la','ballena azul','🐋','blue whale']],
  bosque:[['el','zorrillo','🦨','skunk'],['el','alce','🫎','moose']],
  bichos:[['la','telaraña','🕸️','spider web']],
  comida:[['el','mango','🥭','mango'],['el','kiwi','🥝','kiwi'],['la','manzana verde','🍏','green apple'],['el','melón','🍈','melon'],['los','arándanos','🫐','blueberries'],['la','aceituna','🫒','olive'],['el','chile','🌶️','chili pepper'],['el','pimiento','🫑','bell pepper'],['el','ajo','🧄','garlic'],['la','cebolla','🧅','onion'],['el','camote','🍠','sweet potato'],['la','lechuga','🥬','lettuce'],['el','cacahuate','🥜','peanut'],['la','castaña','🌰','chestnut'],['los','frijoles','🫘','beans'],['el','cruasán','🥐','croissant'],['el','pan francés','🥖','baguette'],['el','pretzel','🥨','pretzel'],['el','wafle','🧇','waffle'],['el','tocino','🥓','bacon'],['la','carne','🥩','meat'],['el','pollo','🍗','chicken leg'],['el','hot dog','🌭','hot dog'],['el','burrito','🌯','burrito'],['el','tamal','🫔','tamale'],['la','ensalada','🥗','salad'],['la','sal','🧂','salt'],['la','mantequilla','🧈','butter'],['el','huevo frito','🍳','fried egg'],['el','espagueti','🍝','spaghetti'],['los','fideos','🍜','noodles'],['el','sushi','🍣','sushi'],['la','empanada','🥟','dumpling'],['el','panquecito','🧁','cupcake'],['el','pay','🥧','pie'],['el','flan','🍮','flan'],['la','paleta','🍭','lollipop'],['el','raspado','🍧','shaved ice'],['el','té','🍵','tea'],['el','refresco','🥤','soda']],
  casa:[['el','foco','💡','light bulb'],['la','linterna','🔦','flashlight'],['el','hielo','🧊','ice'],['la','tetera','🫖','teapot'],['los','palillos','🥢','chopsticks'],['el','tazón','🥣','bowl'],['el','frasco','🫙','jar'],['la','esponja','🧽','sponge'],['el','papel de baño','🧻','toilet paper'],['el','bote de basura','🗑️','trash can'],['el','carrito del súper','🛒','shopping cart'],['el','martillo','🔨','hammer'],['el','desarmador','🪛','screwdriver'],['el','imán','🧲','magnet'],['el','clip','📎','paper clip'],['la','carta','✉️','letter'],['el','buzón','📮','mailbox'],['la','cámara','📷','camera'],['el','crayón','🖍️','crayon'],['el','cuaderno','📓','notebook'],['el','calendario','🗓️','calendar'],['la','campana','🔔','bell'],['el','reloj de arena','⌛','hourglass'],['el','cuadro','🖼️','picture'],['la','planta','🪴','plant'],['la','maleta','🧳','suitcase'],['la','pila','🔋','battery'],['el','enchufe','🔌','plug'],['el','radio','📻','radio'],['el','hilo','🧵','thread'],['el','estambre','🧶','yarn'],['la','canasta','🧺','basket']],
  juguetes:[['la','piñata','🪅','piñata'],['el','ajedrez','♟️','chess'],['las','cartas','🃏','playing cards'],['el','boliche','🎳','bowling'],['el','balón de fútbol americano','🏈','football'],['la','pelota de tenis','🎾','tennis ball'],['el','voleibol','🏐','volleyball'],['el','ping-pong','🏓','ping-pong'],['el','disco volador','🥏','frisbee'],['la','resbaladilla','🛝','slide'],['el','carrusel','🎠','merry-go-round'],['la','rueda de la fortuna','🎡','Ferris wheel'],['la','montaña rusa','🎢','roller coaster'],['el','circo','🎪','circus'],['el','confeti','🎊','confetti'],['el','saxofón','🎷','saxophone'],['el','acordeón','🪗','accordion'],['el','micrófono','🎤','microphone'],['los','audífonos','🎧','headphones'],['el','trineo','🛷','sled'],['los','bloques','🧱','blocks'],['el','bumerán','🪃','boomerang'],['el','videojuego','🎮','video game'],['las','pinturas','🎨','paints']],
  ropa:[['la','blusa','👚','blouse'],['el','kimono','👘','kimono'],['los','calzones','🩲','underwear'],['la','bata','🥼','lab coat'],['el','chaleco','🦺','safety vest'],['el','tacón','👠','high heel'],['las','zapatillas de ballet','🩰','ballet shoes'],['el','sombrero de copa','🎩','top hat'],['el','birrete','🎓','graduation cap'],['el','monedero','👛','coin purse'],['el','maletín','💼','briefcase'],['los','lentes de sol','🕶️','sunglasses'],['los','goggles','🥽','goggles'],['el','lápiz labial','💄','lipstick'],['el','diamante','💎','diamond'],['la','camiseta deportiva','🎽','jersey'],['las','bolsas de compras','🛍️','shopping bags'],['el','moño','🎀','bow'],['el','reloj de pulsera','⌚','watch'],['el','bikini','👙','bikini']],
  cuerpo:[['la','mamá','👩','mom'],['el','papá','👨','dad'],['el','abuelo','👴','grandpa'],['la','abuela','👵','grandma'],['la','familia','👪','family'],['los','amigos','👫','friends'],['la','barba','🧔','beard'],['la','curita','🩹','bandage'],['el','bombero','🧑‍🚒','firefighter'],['el','policía','👮','police officer'],['el','doctor','🧑‍⚕️','doctor'],['el','cocinero','🧑‍🍳','cook'],['la','maestra','🧑‍🏫','teacher'],['el','astronauta','🧑‍🚀','astronaut'],['el','mago','🧙','wizard'],['el','hada','🧚','fairy','f'],['la','sirena','🧜‍♀️','mermaid'],['el','superhéroe','🦸','superhero'],['la','princesa','👸','princess'],['el','príncipe','🤴','prince']],
  afuera:[['la','isla','🏝️','island'],['el','desierto','🏜️','desert'],['el','amanecer','🌅','sunrise'],['la','noche','🌃','night'],['la','galaxia','🌌','galaxy'],['el','cometa','☄️','comet'],['la','estrella fugaz','🌠','shooting star'],['la','tormenta','⛈️','storm'],['la','niebla','🌫️','fog'],['el','huracán','🌀','hurricane'],['el','brote','🌱','sprout'],['el','pino','🌲','pine tree'],['el','trébol','🍀','clover'],['el','tulipán','🌷','tulip'],['la','margarita','🌼','daisy'],['el','ramo de flores','💐','bouquet'],['el','tronco','🪵','log'],['la','casa de campaña','⛺','tent'],['el','puente','🌉','bridge'],['la','fuente','⛲','fountain'],['el','castillo','🏰','castle'],['la','escuela','🏫','school'],['el','hospital','🏥','hospital'],['la','tienda','🏪','store'],['la','ciudad','🏙️','city'],['los','fuegos artificiales','🎆','fireworks'],['la','brújula','🧭','compass'],['el','mapa','🗺️','map']],
  vehiculos:[['la','camioneta','🚙','SUV'],['la','combi','🚐','minivan'],['el','vagón','🚃','train car'],['el','tren bala','🚄','bullet train'],['el','metro','🚇','subway'],['la','estación','🚉','station'],['el','teleférico','🚡','cable car'],['la','avioneta','🛩️','small plane'],['el','satélite','🛰️','satellite'],['el','ferry','⛴️','ferry'],['el','buque','🚢','ship'],['el','yate','🛥️','yacht'],['el','ancla','⚓','anchor','f'],['el','salvavidas','🛟','life ring'],['la','llanta','🛞','tire'],['la','gasolinera','⛽','gas station'],['el','semáforo','🚦','traffic light'],['la','señal de alto','🛑','stop sign'],['la','parada de autobús','🚏','bus stop'],['el','mototaxi','🛺','auto rickshaw'],['la','motoneta','🛵','motor scooter'],['el','tráiler','🚛','semi truck'],['la','carretera','🛣️','highway'],['las','vías del tren','🛤️','train tracks']]
};
for (const [k,ws] of Object.entries(EXTRA)) VOCAB[k].words.push(...ws);
VOCAB.cuerpo.es='Mi cuerpo y la gente'; VOCAB.cuerpo.en='Body & people';
VOCAB.afuera.en='Outside, nature & places';
function uniq(ws){ const seen=new Set(); return ws.filter(w=>!seen.has(w[2]) && seen.add(w[2])); }
VOCAB.todos.words = uniq(Object.values(VOCAB).filter(c=>c.animal).flatMap(c=>c.words));
VOCAB.todas.words = uniq(Object.entries(VOCAB).filter(([k])=>k!=='todos'&&k!=='todas').flatMap(([,c])=>c.words));



