/* CAEK — bouwstenen van de wereld.
 *
 * Alles is opgebouwd uit primitieven. Dat is geen armoede maar opzet: de
 * Kuwahara-filter slikt fijne details toch op, en dikke simpele vormen met
 * harde kleurvlakken zijn precies wat de olieverf-pipeline mooi maakt. */

import * as THREE from 'three';
import {
  PALET, verf, gloed, maskeer, maskeerEigen, meng, vlekTextuur,
  tekstTextuur, emojiTextuur,
} from './materialen.js';

const DOOS = new THREE.BoxGeometry(1, 1, 1);
const BOL = new THREE.SphereGeometry(0.5, 18, 14);
const CILINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
const KEGEL = new THREE.ConeGeometry(0.5, 1, 14);
const VLAK = new THREE.PlaneGeometry(1, 1);

export function doos(b, h, d, kleur, opties) {
  const m = new THREE.Mesh(DOOS, verf(kleur, opties));
  m.scale.set(b, h, d);
  return m;
}

export function bol(r, kleur, opties) {
  const m = new THREE.Mesh(BOL, verf(kleur, opties));
  m.scale.setScalar(r * 2);
  return m;
}

export function cilinder(r, h, kleur, opties) {
  const m = new THREE.Mesh(CILINDER, verf(kleur, opties));
  m.scale.set(r * 2, h, r * 2);
  return m;
}

export function kegel(r, h, kleur, opties) {
  const m = new THREE.Mesh(KEGEL, verf(kleur, opties));
  m.scale.set(r * 2, h, r * 2);
  return m;
}

export function vlak(b, h, materiaal) {
  const m = new THREE.Mesh(VLAK, materiaal);
  m.scale.set(b, h, 1);
  return m;
}

/* ------------------------------------------------------------------ *
 * Grond en platforms
 * ------------------------------------------------------------------ */

/* De geschilderde platen. Worden vóór het bouwen ingeladen (zie
 * world/vloer.js); zijn ze er niet, dan valt alles terug op de oude opbouw
 * uit blokjes en blijft het spel gewoon werken. */
export const TEX = {};
export function zetTexturen(gevonden) { Object.assign(TEX, gevonden); }

/* En de echte 3D-modellen, voor de paar objecten waar het de moeite waard is.
 * Zie world/modellen.js. Leeg is prima: dan wint de plaat. */
export const MODEL = {};
export function zetModellen(gevonden) { Object.assign(MODEL, gevonden); }

/* ------------------------------------------------------------------ *
 * Geschilderde platen als props
 * ------------------------------------------------------------------ */

/**
 * Een geschilderde plaat als staand vlak, met de voet op y = 0.
 *
 * Ondoorzichtig met een alphaTest en niet transparant: alleen dan draagt het
 * alfakanaal het verfmasker (zie maskeer()). De platen zijn met echte
 * transparantie gerenderd, dus de test snijdt schoon.
 */
function plaat(textuur, hoogte, { masker = 0.10, z = 0 } = {}) {
  const beeld = textuur.image;
  const breedte = hoogte * (beeld ? beeld.width / beeld.height : 1);
  const materiaal = new THREE.MeshBasicMaterial({
    map: textuur, transparent: false, alphaTest: 0.45, toneMapped: false,
  });
  maskeer(materiaal, masker);
  const mesh = new THREE.Mesh(VLAK, materiaal);
  mesh.scale.set(breedte, hoogte, 1);
  mesh.position.set(0, hoogte / 2, z);
  mesh.userData.maat = { breedte, hoogte };
  return mesh;
}

/* Waar op elke plaat iets overheen moet: de mond van de oven, het lege paneel
 * van een bord, het scherm waar de demo op komt. Alles als fractie van de
 * plaat -- [x, y, breedte, hoogte], met x en y vanaf de linkeronderhoek.
 * Uitgemeten op de tekeningen zelf; komt er ooit een nieuwe render, dan is dit
 * het enige dat mee hoeft. */
const PLAAT = {
  oven:   { hoogte: 9.4, mond: [0.41, 0.46, 0.26, 0.30] },
  bord:   { paneel: [0.50, 0.75, 0.78, 0.26] },
  deur:   { blad: [0.50, 0.42, 0.42, 0.68] },
  scherm: { beeld: [0.50, 0.655, 0.78, 0.52] },
  tafel:  { hoogte: 3.1, blad: 0.50 },
  wiel:   { binnen: 0.33, buiten: 0.86, rand: 1.06, start: Math.PI / 8 },
};

/** Zet een vlak op een uitgemeten plek van een plaat, in de maat van die plek. */
function opPlaat(plaatMesh, vak, materiaal, { schaal = 1, z = 0.06 } = {}) {
  const { breedte, hoogte } = plaatMesh.userData.maat;
  const [x, y, b, h] = vak;
  const m = vlak(b * breedte * schaal, h * hoogte * schaal, materiaal);
  m.position.set((x - 0.5) * breedte, y * hoogte, plaatMesh.position.z + z);
  return m;
}

/* Maatvoering van de vloerplaat.
 *
 * `TEGEL` is hoeveel wereldeenheden één herhaling beslaat. `RAND` is waar in
 * de plaat de voorrand van het loopvlak zit, van boven gemeten -- alles boven
 * die lijn is wegwijkende straat, alles eronder de zijkant van de stoep.
 *
 * `BOVEN_MAX` begrenst hoe hoog die wegwijkende straat in de wereld mag
 * uitsteken, en dat is niet cosmetisch: alles wat achter de grond staat --
 * de zeventien teamstands van de Cluster Review, het publiek, de Obeya --
 * verdwijnt erachter als deze band te hoog wordt. Een halve eenheid is genoeg
 * om te lezen als straat en laag genoeg om niets af te dekken. */
const VLOER = { TEGEL: 9.0, RAND: 0.68, BOVEN_MAX: 0.55, DIEPTE: 13.0, VOOR: -0.45 };

/* De kratten waar je op springt zijn een eigen plaat: bakkersgerei in plaats
 * van zwevende stukken stoep, zodat je in één oogopslag ziet waar je op kunt
 * staan. `RAND` is waar de bovenkant van het krat zit -- daar staat de speler
 * op, dus die lijn moet op de collider vallen. */
const KRAT = { TEGEL: 1.7, RAND: 0.36, HOOGTE: 1.15, DIEPTE: 2.6, HOUT_TEGEL: 1.6, MIDDEN: -1.5 };

/**
 * Een echte doos met hout eromheen gewikkeld.
 *
 * De houttegel gaat op alle zes de vlakken, met de herhaling per vlak
 * berekend uit de wereldmaat -- anders wordt de nerf op een breed krat
 * uitgerekt en op een smal krat samengeperst, en dan zie je meteen dat het
 * dezelfde tegel is.
 *
 * Bovenop een dun lichter randje: dat is het vlak waar je op landt, en het
 * scheelt in leesbaarheid enorm of je die rand ziet liggen.
 */
function houtenKrat(breedte, dikte) {
  const groep = new THREE.Group();
  const hoogte = Math.max(KRAT.HOOGTE, dikte);
  const diepte = KRAT.DIEPTE;

  const geo = new THREE.BoxGeometry(breedte, hoogte, diepte);
  // per vlak de uv's schalen zodat de nerf overal even groot is
  const uv = geo.attributes.uv;
  const maten = [
    [diepte, hoogte], [diepte, hoogte],   // rechts, links
    [breedte, diepte], [breedte, diepte], // boven, onder
    [breedte, hoogte], [breedte, hoogte], // voor, achter
  ];
  for (let vlak = 0; vlak < 6; vlak++) {
    const [b, h] = maten[vlak];
    for (let i = vlak * 4; i < vlak * 4 + 4; i++) {
      uv.setXY(i, uv.getX(i) * (b / KRAT.HOUT_TEGEL), uv.getY(i) * (h / KRAT.HOUT_TEGEL));
    }
  }
  uv.needsUpdate = true;

  const romp = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    map: TEX.hout, color: 0xd2b48a,
  }));
  romp.position.y = -hoogte / 2;
  // Naar achteren geschoven tot zijn voorvlak nét achter het spelvlak ligt.
  // Een doos met echte diepte gecentreerd op z = 0 staat óm de speler heen, en
  // dan loopt hij onder een laag platform door met zijn hoofd in het krat.
  romp.position.z = KRAT.MIDDEN;
  groep.add(romp);

  // Het landingsvlak: een dun randje bloem langs de bovenkant. Warm en niet
  // wit -- crème op vol licht leest van een afstand als sneeuw op een boomstam,
  // en dat is niet de grap die we willen maken.
  const rand = doos(breedte + 0.05, 0.08, diepte + 0.05, PALET.toast, { emissief: 0.16 });
  rand.position.set(0, -0.01, KRAT.MIDDEN);
  groep.add(rand);

  groep.userData.krat = romp;
  return groep;
}

/**
 * Een rij echte kratten, precies zo breed als het platform.
 *
 * Eén model uitrekken tot de goede breedte zou de ijzeren banden en de klinken
 * meerekken, en dat zie je meteen. Dus wordt er geteld hoeveel kratten er in
 * passen en worden ze naast elkaar gezet; wat er dan nog aan afwijking
 * overblijft is hooguit een paar procent in de breedte.
 *
 * Twee kratten naast elkaar is trouwens ook gewoon wat een bakkerij doet, dus
 * het leest beter dan één uitgerekt exemplaar.
 */
function geknipteKratten(breedte) {
  const groep = new THREE.Group();
  const m = MODEL.krat;
  const aantal = Math.max(1, Math.round(breedte / m.breedte));
  const stuk = breedte / aantal;
  const rek = stuk / m.breedte;

  for (let i = 0; i < aantal; i++) {
    const krat = m.wortel.clone();
    krat.scale.x *= rek;
    krat.position.x = -breedte / 2 + stuk * (i + 0.5);
    // Het model staat op y = 0 met zijn voet; hier hangt het platform aan zijn
    // bovenkant, dus zakt het geheel zijn eigen hoogte omlaag. En naar achteren
    // tot het voorvlak nét achter het spelvlak ligt -- anders loopt de speler
    // onder een laag platform door met zijn hoofd in het krat.
    krat.position.y = -m.hoogte;
    krat.position.z = KRAT.MIDDEN;
    groep.add(krat);
  }
  return groep;
}

/**
 * Een looppad. Geeft de mesh terug; de collider maakt level.js zelf.
 *
 * Met de geschilderde plaat is dit één staand vlak in plaats van een stapel
 * blokjes. Dat mag omdat de plaat al mét perspectief geschilderd is: het
 * loopvlak wijkt naar achteren, daaronder zit de zijkant van de stoep. Precies
 * hoe de camera het zou zien, dus een plat vlak volstaat -- en het scheelt per
 * platform tientallen meshes.
 *
 * Het vlak staat net achter het spelvlak, zodat de karakters op de voorrand
 * lijken te lopen in plaats van erachter te verdwijnen.
 */
/**
 * De straat als écht liggend vlak, met de stoeprand als losse voorkant.
 *
 * Dit was eerst één staande plaat met het perspectief erin geschilderd. Dat
 * werkte, maar het bleef een sticker: het licht van de lantaarns viel er niet
 * op, de contactschaduwen lagen op niets, en alles wat achter de straat stond
 * -- de zeventien kraampjes van de Cluster Review -- werd erdoor afgedekt in
 * plaats van erop te staan.
 *
 * Nu zijn het twee vlakken. Een liggend loopvlak dat naar achteren wegloopt,
 * en een staande kant eronder. Twee meshes per stuk grond in plaats van één,
 * en daarvoor terug: echte perspectief die klopt als de camera meepant, licht
 * dat over het plaveisel strijkt, en een straat waar de wereld óp staat.
 *
 * De twee platen zijn uit dezelfde tekening gesneden (zie tools/backdrop.py
 * --band), dus de naad tussen boven en voor valt precies waar de schilder hem
 * ook heeft gezet.
 */
function geschilderdeStraat(breedte) {
  const groep = new THREE.Group();

  const boven = TEX.vloer_boven.clone();
  boven.needsUpdate = true;
  boven.wrapS = THREE.RepeatWrapping;
  boven.wrapT = THREE.ClampToEdgeWrapping;
  boven.repeat.set(breedte / VLOER.TEGEL, 1);
  // elk stuk straat een eigen stukje tekening, anders zie je de herhaling
  boven.offset.x = (breedte * 0.37) % 1;

  // Lambert en niet Basic: dit vlak ligt plat, dus het vangt het strijklicht
  // en de lantaarns. De emissiveMap houdt de geschilderde kleur overeind waar
  // geen licht komt -- zonder die zou de straat 's nachts dichtlopen.
  const bovenMat = new THREE.MeshLambertMaterial({
    map: boven, emissiveMap: boven, emissive: 0xffffff,
    emissiveIntensity: 0.52, toneMapped: false,
  });
  maskeer(bovenMat, 0.10);
  const dek = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bovenMat);
  dek.rotation.x = -Math.PI / 2;
  dek.scale.set(breedte, VLOER.DIEPTE, 1);
  dek.position.set(0, 0, VLOER.VOOR - VLOER.DIEPTE / 2);
  groep.add(dek);

  const rand = TEX.vloer_rand.clone();
  rand.needsUpdate = true;
  rand.wrapS = THREE.RepeatWrapping;
  rand.wrapT = THREE.ClampToEdgeWrapping;
  rand.repeat.set(breedte / VLOER.TEGEL, 1);
  rand.offset.x = (breedte * 0.37) % 1;

  const beeld = TEX.vloer_rand.image;
  const hoogte = VLOER.TEGEL * (beeld ? beeld.height / beeld.width : 0.23);
  const randMat = new THREE.MeshLambertMaterial({
    map: rand, emissiveMap: rand, emissive: 0xffffff,
    emissiveIntensity: 0.58, toneMapped: false,
  });
  maskeer(randMat, 0.10);
  const kant = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), randMat);
  kant.scale.set(breedte, hoogte, 1);
  kant.position.set(0, -hoogte / 2, VLOER.VOOR);
  groep.add(kant);

  groep.userData.vloervlak = dek;
  return groep;
}

export function platform(breedte, dikte = 0.9, kleur = PALET.steen, { top = PALET.blauwLicht, zwevend = false } = {}) {
  // Een krat waar je op springt is een echte doos met hout eromheen gewikkeld,
  // geen platte plaat. Dat is het verschil tussen een sticker en iets waar je
  // omheen kunt kijken: als de camera meepant schuift het zijvlak weg en
  // onthult het bovenvlak zich. Precies die parallax is de 2.5D-diepte.
  if (zwevend && MODEL.krat) return geknipteKratten(breedte);
  if (zwevend && TEX.hout) return houtenKrat(breedte, dikte);
  if (!zwevend && TEX.vloer_boven && TEX.vloer_rand) return geschilderdeStraat(breedte);
  const plaat = zwevend ? (TEX.springblok || TEX.vloer) : TEX.vloer;
  if (plaat) return geschilderdPlatform(breedte, zwevend, plaat);
  const groep = new THREE.Group();
  const romp = doos(breedte, dikte, 4.2, kleur, { plat: true });
  romp.position.y = -dikte / 2;
  groep.add(romp);

  // gouden kanten bovenop: leest als een lichtrand in de verf
  const deklaag = doos(breedte, 0.22, 4.4, top);
  deklaag.position.y = -0.05;
  groep.add(deklaag);

  // kasseien-ritme, geeft het flowveld iets om langs te lopen
  const stenen = Math.max(1, Math.round(breedte / 1.6));
  for (let i = 0; i < stenen; i++) {
    const s = doos(1.15, 0.16, 0.9, i % 2 ? PALET.goud : PALET.goudLicht);
    s.position.set(-breedte / 2 + (i + 0.5) * (breedte / stenen), 0.04, 1.2 + (i % 3) * 0.6 - 0.6);
    groep.add(s);
  }
  return groep;
}

/* Een zwevend platform is geen stuk straat maar een plank in de lucht: daar
 * hoort geen halve stoep achter weg te wijken. Van de plaat wordt dan alleen
 * de onderste strook gebruikt -- de voorste rij stenen plus de zijkant. */
const ZWEVEND_DEEL = 0.56;

function geschilderdPlatform(breedte, zwevend, plaat) {
  const groep = new THREE.Group();

  // Een krat is een eigen plaat met eigen verhoudingen: die gebruiken we
  // heel, alleen kleiner. Alleen als we terugvallen op de straatplaat wordt
  // er een strook uit gesneden.
  const eigenKrat = zwevend && plaat === TEX.springblok;
  let deel = zwevend && !eigenKrat ? ZWEVEND_DEEL : 1;
  const beeld = plaat.image;
  const verhouding = beeld ? beeld.height / beeld.width : 0.5;
  const tegel = eigenKrat ? KRAT.TEGEL : VLOER.TEGEL;
  let hoogte = tegel * verhouding * deel;
  let rand = eigenKrat ? KRAT.RAND
    : (zwevend ? (VLOER.RAND - (1 - deel)) / deel : VLOER.RAND);

  // De band boven de grondlijn aftoppen, anders verdwijnt de halve wereld
  // erachter. Wat er van de plaat afvalt is de bovenkant, dus de uitsnede
  // schuift mee naar beneden. Kratten hebben dat niet nodig: die steken van
  // zichzelf al nauwelijks boven de lijn uit.
  if (!eigenKrat) {
    const boven = hoogte * rand;
    if (boven > VLOER.BOVEN_MAX) {
      const weg = (boven - VLOER.BOVEN_MAX) / (tegel * verhouding);
      deel -= weg;
      hoogte = tegel * verhouding * deel;
      rand = VLOER.BOVEN_MAX / hoogte;
    }
  }

  const textuur = plaat.clone();
  textuur.needsUpdate = true;
  textuur.wrapS = THREE.RepeatWrapping;
  textuur.wrapT = THREE.ClampToEdgeWrapping;
  textuur.repeat.set(breedte / tegel, deel);
  // elk platform een eigen stukje straat, anders herhaalt het zichtbaar;
  // verticaal snijden we de bovenkant eraf, dus offset.y volgt uit `deel`
  textuur.offset.set((breedte * 0.37) % 1, 1 - deel);

  const materiaal = new THREE.MeshBasicMaterial({
    map: textuur, toneMapped: false,
    transparent: eigenKrat, alphaTest: eigenKrat ? 0.35 : 0,
  });
  // Ook deze plaat is al olieverf; er nog een laag Kuwahara overheen leggen
  // maakt er pap van. Een klein beetje mag, zodat hij niet los komt te staan
  // van de props die er wél doorheen gaan.
  maskeer(materiaal, 0.10);
  const vlak = new THREE.Mesh(VLAK, materiaal);
  vlak.scale.set(breedte, hoogte, 1);
  // de voorrand van het loopvlak op y = 0 leggen
  vlak.position.set(0, hoogte * (rand - 0.5), zwevend ? -0.2 : -0.45);
  groep.add(vlak);
  groep.userData.vloervlak = vlak;
  return groep;
}

/* ------------------------------------------------------------------ *
 * Borden en tekst
 * ------------------------------------------------------------------ */

export function bord(regels, opties = {}) {
  if (TEX.bord) return geschilderdBord(regels, opties);
  return gebouwdBord(regels, opties);
}

/**
 * Het geschilderde bord: één plaat, en de tekst erop gerenderd.
 *
 * De tekst blijft nadrukkelijk uit de plaat. Alle grappen staan op deze
 * borden en de teamnamen wisselen; die wil je kunnen aanpassen zonder opnieuw
 * te renderen. De plaat levert het lege paneel, het spel schrijft erop.
 *
 * De breedte is leidend en niet de hoogte: borden staan naast elkaar in een
 * sidescroller, dus horizontale ruimte is waar het knelt.
 */
function geschilderdBord(regels, {
  breedte = 3.4, hoogte = 1.7, tekstKleur = '#fdf3d8', grootte = 62,
} = {}) {
  const groep = new THREE.Group();
  const beeld = TEX.bord.image;
  const verhouding = beeld ? beeld.height / beeld.width : 0.63;
  const plaatBreedte = breedte * 1.16;
  const vel = plaat(TEX.bord, plaatBreedte * verhouding, { masker: 0.10 });
  groep.add(vel);

  const [, , vb, vh] = PLAAT.bord.paneel;
  const tex = tekstTextuur(regels, {
    breedte: 768, hoogte: Math.round(768 * (vh * vel.userData.maat.hoogte) / (vb * plaatBreedte)),
    achtergrond: 'geen', rand: 'geen', kleur: tekstKleur, grootte,
  });
  const paneelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.4, depthWrite: false });
  maskeer(paneelMat, 0.04);
  const paneel = opPlaat(vel, PLAAT.bord.paneel, paneelMat, { schaal: 0.94, z: 0.05 });
  paneel.renderOrder = 5;
  groep.add(paneel);
  groep.userData.hoogte = vel.userData.maat.hoogte;
  return groep;
}

function gebouwdBord(regels, {
  breedte = 3.4, hoogte = 1.7, paal = 1.6, kleur = PALET.blauwDiep,
  rand = PALET.goud, tekstKleur = '#fdf3d8', grootte = 62,
} = {}) {
  const groep = new THREE.Group();
  const stok = doos(0.24, paal, 0.24, PALET.korst);
  stok.position.y = paal / 2;
  groep.add(stok);

  const plank = doos(breedte, hoogte, 0.26, kleur);
  plank.position.y = paal + hoogte / 2;
  groep.add(plank);

  const lijst = doos(breedte + 0.18, hoogte + 0.18, 0.18, rand);
  lijst.position.y = paal + hoogte / 2;
  lijst.position.z = -0.06;
  groep.add(lijst);

  const tex = tekstTextuur(regels, {
    breedte: 640, hoogte: Math.round(640 * hoogte / breedte),
    achtergrond: 'geen', rand: 'geen', kleur: tekstKleur, grootte,
  });
  const paneelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.4 });
  maskeer(paneelMat, 0.06);
  const paneel = vlak(breedte * 0.92, hoogte * 0.86, paneelMat);
  paneel.position.set(0, paal + hoogte / 2, 0.15);
  groep.add(paneel);
  return groep;
}

/** Zwevend labeltje boven een object. `plaat` zet er een donker bordje achter,
 *  want los goud op donkerblauw verdwijnt in de verf. */
export function label(tekst, { breedte = 2.6, kleur = '#ffd873', grootte = 68, plaat = false } = {}) {
  // 1024 breed en niet 512: sinds de olieverf van de voorgrond af is, is een
  // wazige letter gewoon een wazige letter en geen penseelstreek meer.
  const tex = tekstTextuur(tekst, {
    breedte: 1024, hoogte: 320, kleur: kleur, grootte: grootte * 2,
    // Dekkend en niet 72%: het plaatje is #0b1640 en dat is exact de kleur
    // van de nachtlucht erachter. Half doorzichtig verdween het bordje
    // daarin op, en bleef er alleen een gouden streepje over.
    achtergrond: plaat ? '#0e1c52' : 'geen',
    rand: plaat ? '#f5b229' : 'geen',
    randDikte: 16,
  });
  // Ondoorzichtig met een alphaTest in plaats van transparant: alleen dan kan
  // het alfakanaal het verfmasker dragen, en tekst die je niet kunt lezen is
  // erger dan een randje aliasing. De verf smeert dat randje toch weer glad.
  const materiaal = new THREE.MeshBasicMaterial({
    map: tex, transparent: false, alphaTest: 0.4, depthWrite: false,
  });
  maskeer(materiaal, 0.06);
  const m = vlak(breedte, breedte * 320 / 1024, materiaal);
  m.renderOrder = 5;
  return m;
}

/* ------------------------------------------------------------------ *
 * De ovens
 * ------------------------------------------------------------------ */

/**
 * De oven. Drie uitvoeringen, dezelfde bediening.
 *
 * Bij voorkeur het echte model: dat is precies het soort object waar 2.5D
 * voor bedoeld is. De deuren staan open, de camera pant erlangs en je kijkt
 * even de vlammen in. Geen plaat doet dat na.
 *
 * Wie hem aanroept hoeft het verschil niet te weten. `userData.gloeien()`
 * regelt het vuur, `userData.deur` gaat dicht als de PI erop zit -- dat werkt
 * in alle drie de uitvoeringen.
 */
export function oven(schaal = 1, { tekst = 'OVEN', gloedKleur = PALET.oranje } = {}) {
  const groep = MODEL.oven ? gemodelleerdeOven(gloedKleur)
    : TEX.oven ? geschilderdeOven(gloedKleur)
      : gebouwdeOven(gloedKleur);

  // Het naambord hangt vóór de oven en niet erboven: de ovens zijn hoog, en
  // op 1,6 keer schaal loopt een bord boven de pijp zo het beeld uit.
  const hoogte = groep.userData.hoogte;
  const naambord = label(tekst, { breedte: hoogte * 0.46, grootte: 56, plaat: true });
  naambord.position.set(0, hoogte * 0.60, hoogte * 0.42);
  groep.add(naambord);

  groep.scale.setScalar(schaal);
  return groep;
}

/* Het vuur als losse additieve vlek over de mond heen.
 *
 * De vlammen zitten al in de textuur; dit maakt ze levend. Additief, dus wat
 * eronder ligt blijft zichtbaar en het licht stapelt er alleen bovenop -- een
 * dekkende gele rechthoek zou de hele tekening wegvagen. */
function ovenvuur(kleur, breedte, hoogte) {
  const materiaal = meng(new THREE.MeshBasicMaterial({
    map: vlekTextuur(), color: kleur, toneMapped: false,
  }));
  const mesh = vlak(breedte, hoogte, materiaal);
  mesh.renderOrder = 3;
  mesh.userData.gloeien = (nieuweKleur, sterkte) => {
    materiaal.color.set(nieuweKleur);
    materiaal.opacity = Math.max(0, sterkte);
  };
  return mesh;
}

function gemodelleerdeOven(gloedKleur) {
  const groep = new THREE.Group();
  const m = MODEL.oven;
  groep.add(m.wortel.clone());

  // De mond zit iets onder het midden en steekt naar voren; uitgemeten op het
  // model zelf, als fractie van zijn hoogte.
  const mondY = m.hoogte * 0.37;
  const mondZ = m.diepte * 0.44;
  const vuur = ovenvuur(gloedKleur, m.breedte * 0.62, m.hoogte * 0.34);
  vuur.position.set(0, mondY, mondZ);
  groep.add(vuur);

  // Dichtgaan kan een model met vaste deuren niet, dus dat doet een donker
  // luik over de mond. Op de schaal waarop dit gebeurt -- één beat aan het
  // eind van de PI -- leest dat precies als een deur die sluit.
  const luik = doos(m.breedte * 0.52, m.hoogte * 0.34, 0.2, PALET.blauwDiep);
  luik.position.set(0, mondY, mondZ + 0.05);
  luik.visible = false;
  groep.add(luik);

  groep.userData.hoogte = m.hoogte;
  groep.userData.vuur = vuur;
  groep.userData.deur = luik;
  groep.userData.gloeien = vuur.userData.gloeien;
  groep.add(schoorsteen(m.breedte * 0.39, m.hoogte * 0.95, groep));
  return groep;
}

function geschilderdeOven(gloedKleur) {
  const groep = new THREE.Group();
  const vel = plaat(TEX.oven, PLAAT.oven.hoogte, { masker: 0.12 });
  groep.add(vel);
  const { breedte, hoogte } = vel.userData.maat;
  const [mx, my, mb, mh] = PLAAT.oven.mond;

  const vuur = ovenvuur(gloedKleur, mb * breedte * 1.8, mh * hoogte * 1.8);
  vuur.position.set((mx - 0.5) * breedte, my * hoogte, 0.08);
  groep.add(vuur);

  const luik = opPlaat(vel, PLAAT.oven.mond, verf(PALET.blauwDiep), { schaal: 1.1, z: 0.14 });
  luik.visible = false;
  groep.add(luik);

  groep.userData.hoogte = PLAAT.oven.hoogte;
  groep.userData.vuur = vuur;
  groep.userData.deur = luik;
  groep.userData.gloeien = vuur.userData.gloeien;
  groep.add(schoorsteen(breedte * 0.32, hoogte * 0.97, groep));
  return groep;
}

function gebouwdeOven(gloedKleur) {
  const groep = new THREE.Group();
  const romp = doos(6, 6.4, 4, PALET.blauw, { plat: true });
  romp.position.y = 3.2;
  groep.add(romp);

  const rand = doos(6.5, 0.6, 4.4, PALET.goud);
  rand.position.y = 6.6;
  groep.add(rand);

  const deurgat = doos(4.2, 3.4, 0.4, PALET.blauwDiep);
  deurgat.position.set(0, 2.5, 2.05);
  groep.add(deurgat);

  const vuur = vlak(3.9, 3.1, gloed(gloedKleur, 1.8));
  vuur.position.set(0, 2.5, 2.24);
  groep.add(vuur);
  groep.userData.vuur = vuur;

  const deur = doos(4.4, 3.6, 0.3, PALET.goud);
  deur.position.set(0, 2.5, 2.3);
  deur.visible = false;
  groep.add(deur);
  groep.userData.deur = deur;

  for (const x of [-2, 2]) {
    const knop = cilinder(0.34, 0.4, PALET.rood);
    knop.rotation.x = Math.PI / 2;
    knop.position.set(x, 5.6, 2.1);
    groep.add(knop);
  }

  const pijp = cilinder(0.5, 3.2, PALET.korst);
  pijp.position.set(2.2, 8.2, 0);
  groep.add(pijp);

  groep.userData.hoogte = 9.4;
  groep.userData.gloeien = (kleur, sterkte) => { vuur.material = gloed(kleur, sterkte); };
  groep.add(schoorsteen(2.2, 9.8, groep));
  return groep;
}

/* Een leeg punt op de pijp. De rook wordt niet hier gemaakt maar door het
 * level, dat de deeltjesmotor kent; wat de oven levert is alleen de plek --
 * inclusief zijn schaal, want een oventje van 0,55 hoort geen pluim van een
 * oven van 1,6 te blazen. */
function schoorsteen(x, y, groep) {
  const punt = new THREE.Object3D();
  punt.position.set(x, y, 0);
  groep.userData.schoorsteen = punt;
  return punt;
}

/* ------------------------------------------------------------------ *
 * Het Doelenwiel in 3D — de visuele ruggengraat van de game
 * ------------------------------------------------------------------ */

export function doelenwiel(doelen, actiefId, straal = 4) {
  if (TEX.doelenwiel && doelen.length === 8) return geschilderdDoelenwiel(doelen, actiefId, straal);
  return gebouwdDoelenwiel(doelen, actiefId, straal);
}

/**
 * Het geschilderde wiel, met de gloed per segment eroverheen.
 *
 * De acht taartpunten zitten al in de plaat, gedempt. Wat het spel toevoegt is
 * licht: elk gekoppeld doel krijgt zijn punt aangestoken. Dus liggen er acht
 * additieve sectoren over de tekening die beginnen op bijna zwart -- additief
 * is zwart onzichtbaar -- en die main.js aanzet door hun emissive op te
 * hogen. Dat is precies dezelfde bediening als bij het gebouwde wiel, zodat
 * koppelDoel() geen weet hoeft te hebben van welk wiel er hangt.
 *
 * De naad tussen de punten staat in de plaat op 22,5 graden en niet op nul.
 * Vandaar PLAAT.wiel.start: zonder die draai zou de gloed dwars over de
 * geschilderde scheidslijnen heen liggen.
 */
function geschilderdDoelenwiel(doelen, actiefId, straal) {
  const groep = new THREE.Group();
  const W = PLAAT.wiel;
  const stap = (Math.PI * 2) / doelen.length;

  const beeld = TEX.doelenwiel.image;
  const breedte = straal * 2 * W.rand;
  // De plaat komt vol verzadigd binnen; als alle acht punten al branden valt
  // er niets meer aan te steken. Dus gaat de tekening omlaag naar maanlicht en
  // haalt de gloed hem per doel terug.
  const materiaal = new THREE.MeshBasicMaterial({
    map: TEX.doelenwiel, transparent: false, alphaTest: 0.45, toneMapped: false,
    color: 0x6d7a9c,
  });
  maskeer(materiaal, 0.12);
  const vel = vlak(breedte, breedte * (beeld ? beeld.height / beeld.width : 1), materiaal);
  vel.position.z = -0.04;
  groep.add(vel);

  doelen.forEach((doel, i) => {
    const start = W.start + i * stap;
    const vorm = new THREE.RingGeometry(
      straal * W.binnen, straal * W.buiten, 20, 1, start, stap * 0.94,
    );
    // Zwart met een emissive die het werk doet: onder additief mengen draagt
    // color niets bij, dus wat je ziet is puur de gloed.
    const mat = meng(new THREE.MeshLambertMaterial({
      color: 0x000000,
      emissive: new THREE.Color(doel.kleur).multiplyScalar(doel.id === actiefId ? 0.85 : 0.0),
      toneMapped: false,
    }));
    const segment = new THREE.Mesh(vorm, mat);
    segment.userData.doel = doel.id;
    segment.renderOrder = 3;
    if (doel.id === actiefId) groep.userData.actiefSegment = segment;
    groep.add(segment);

    const iconMat = new THREE.MeshBasicMaterial({ map: emojiTextuur(doel.icoon), transparent: true, depthWrite: false });
    const icon = vlak(straal * 0.26, straal * 0.26, iconMat);
    const hoek = start + stap / 2;
    icon.position.set(Math.cos(hoek) * straal * 0.60, Math.sin(hoek) * straal * 0.60, 0.10);
    icon.renderOrder = 4;
    groep.add(icon);
  });

  const tekst = label(['DOELEN', 'UWV'], { breedte: straal * 0.56, kleur: '#0b1640', grootte: 54 });
  tekst.position.z = 0.12;
  groep.add(tekst);
  return groep;
}

function gebouwdDoelenwiel(doelen, actiefId, straal) {
  const groep = new THREE.Group();
  const stap = (Math.PI * 2) / doelen.length;

  doelen.forEach((doel, i) => {
    const vorm = new THREE.CircleGeometry(straal, 24, i * stap, stap * 0.97);
    const kleur = new THREE.Color(doel.kleur).getHex();
    const isActief = doel.id === actiefId;
    const mat = verf(kleur, { emissief: isActief ? 0.7 : 0.1 });
    const segment = new THREE.Mesh(vorm, mat);
    segment.userData.doel = doel.id;
    if (isActief) groep.userData.actiefSegment = segment;
    groep.add(segment);

    const iconMat = new THREE.MeshBasicMaterial({ map: emojiTextuur(doel.icoon), transparent: true });
    const icon = vlak(straal * 0.34, straal * 0.34, iconMat);
    const hoek = i * stap + stap / 2;
    icon.position.set(Math.cos(hoek) * straal * 0.62, Math.sin(hoek) * straal * 0.62, 0.08);
    groep.add(icon);
  });

  const naaf = new THREE.Mesh(new THREE.CircleGeometry(straal * 0.36, 24), verf(PALET.room, { emissief: 0.4 }));
  naaf.position.z = 0.06;
  groep.add(naaf);

  const tekst = label(['DOELEN', 'UWV'], { breedte: straal * 0.62, kleur: '#0b1640', grootte: 54 });
  tekst.position.z = 0.1;
  groep.add(tekst);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(straal * 1.04, 0.16, 8, 40), verf(PALET.goud, { emissief: 0.5 }));
  groep.add(ring);

  // Het wiel is de voortgangsmeter, geen decor. Het hangt ver naar achteren,
  // dus zonder eigen masker zou het volledig in de verf verdwijnen.
  maskeerEigen(groep, 0.22);
  return groep;
}

/* ------------------------------------------------------------------ *
 * Oppakbare dingen
 * ------------------------------------------------------------------ */

export function ingredient(emoji, kleur = PALET.goudLicht) {
  const groep = new THREE.Group();
  const schil = bol(0.42, kleur, { emissief: 0.45 });
  groep.add(schil);
  const gezicht = vlak(0.7, 0.7, new THREE.MeshBasicMaterial({ map: emojiTextuur(emoji), transparent: true, depthWrite: false }));
  gezicht.position.z = 0.45;
  gezicht.renderOrder = 4;
  groep.add(gezicht);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 22), gloed(PALET.goudLicht, 1.4));
  groep.add(halo);
  groep.userData.halo = halo;
  return groep;
}

export function sprinkle(kleurHex) {
  const kleur = new THREE.Color(kleurHex).getHex();
  const groep = new THREE.Group();
  const korrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), verf(kleur, { emissief: 0.6 }));
  korrel.rotation.z = 0.6;
  groep.add(korrel);
  return groep;
}

export function meetinstrument(soort) {
  const groep = new THREE.Group();
  if (soort === 'doorlooptijd') {
    const buis = cilinder(0.16, 2.2, PALET.room, { emissief: 0.3 });
    groep.add(buis);
    const bolletje = bol(0.34, PALET.rood, { emissief: 0.5 });
    bolletje.position.y = -1.1;
    groep.add(bolletje);
    const vloeistof = cilinder(0.1, 1.5, PALET.rood, { emissief: 0.6 });
    vloeistof.position.y = -0.35;
    groep.add(vloeistof);
  } else if (soort === 'gebruik') {
    const beker = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.34, 1.5, 16, 1, true), verf(PALET.room, { emissief: 0.3, dubbel: true }));
    groep.add(beker);
    const inhoud = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.42, 16), verf(PALET.blauwLicht, { emissief: 0.5 }));
    inhoud.position.y = -0.5;
    groep.add(inhoud);
  } else {
    const plaat = cilinder(0.8, 0.16, PALET.goud, { emissief: 0.4 });
    plaat.position.y = -0.6;
    groep.add(plaat);
    const wijzerplaat = cilinder(0.62, 0.14, PALET.room, { emissief: 0.4 });
    wijzerplaat.rotation.x = Math.PI / 2;
    wijzerplaat.position.y = 0.2;
    groep.add(wijzerplaat);
    const wijzer = doos(0.06, 0.5, 0.06, PALET.rood, { emissief: 0.5 });
    wijzer.position.set(0, 0.42, 0.1);
    groep.add(wijzer);
    groep.userData.wijzer = wijzer;
  }
  return groep;
}

/* ------------------------------------------------------------------ *
 * Puzzelonderdelen
 * ------------------------------------------------------------------ */

export function schakelaar(naam) {
  const groep = new THREE.Group();
  const kast = doos(1.5, 1.9, 0.7, PALET.blauwDiep);
  kast.position.y = 0.95;
  groep.add(kast);

  const rand = doos(1.7, 2.1, 0.5, PALET.korst);
  rand.position.set(0, 0.95, -0.15);
  groep.add(rand);

  const lamp = bol(0.22, PALET.rood, { emissief: 0.9 });
  lamp.position.set(0, 1.62, 0.4);
  groep.add(lamp);
  groep.userData.lamp = lamp;

  const hendel = doos(0.2, 0.9, 0.2, PALET.goud, { emissief: 0.3 });
  hendel.position.set(0, 0.85, 0.45);
  hendel.rotation.x = -0.7;
  groep.add(hendel);
  groep.userData.hendel = hendel;

  const naambord = label(naam, { breedte: 2.6, grootte: 58, plaat: true });
  naambord.position.set(0, 2.6, 0.4);
  groep.add(naambord);
  return groep;
}

/** De Dependency Pretzel: een knoop die later een keurige baguette wordt. */
export function pretzel(straal = 3) {
  const groep = new THREE.Group();
  const knoop = new THREE.Mesh(
    new THREE.TorusKnotGeometry(straal, straal * 0.19, 96, 12, 2, 3),
    verf(PALET.korst, { emissief: 0.2, plat: true }),
  );
  groep.add(knoop);
  groep.userData.knoop = knoop;

  // zoutkorrels
  for (let i = 0; i < 26; i++) {
    const korrel = bol(0.11, PALET.room, { emissief: 0.6 });
    const a = Math.random() * Math.PI * 2;
    korrel.position.set(Math.cos(a) * straal * (0.75 + Math.random() * 0.5), Math.sin(a) * straal * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * straal);
    groep.add(korrel);
  }
  return groep;
}

export function kabel(van, naar, kleur = PALET.blauwLicht, doorzak = 1.4) {
  const midden = van.clone().add(naar).multiplyScalar(0.5).add(new THREE.Vector3(0, -doorzak, 0));
  const curve = new THREE.QuadraticBezierCurve3(van, midden, naar);
  const geo = new THREE.TubeGeometry(curve, 20, 0.11, 6, false);
  return new THREE.Mesh(geo, verf(kleur, { emissief: 0.25 }));
}

/* ------------------------------------------------------------------ *
 * Cluster Review en demo
 * ------------------------------------------------------------------ */

/** Het gebakken resultaat: niet perfect, wel bruikbaar. */
export function taartje(kleur = PALET.goud) {
  const groep = new THREE.Group();
  const bodem = cilinder(0.8, 0.7, kleur, { emissief: 0.35 });
  bodem.position.y = 0.35;
  groep.add(bodem);
  const glazuur = cilinder(0.86, 0.22, PALET.room, { emissief: 0.5 });
  glazuur.position.y = 0.78;
  groep.add(glazuur);
  const kers = bol(0.16, PALET.rood, { emissief: 0.6 });
  kers.position.y = 0.98;
  groep.add(kers);
  return groep;
}

/**
 * De demotafel. `userData.taart` is wat erop staat, en dat is een gag.
 *
 * De hele Cluster Review draait erom: Caek heeft nog niets te laten zien, en
 * dan ineens wel. Dus moet wat er op tafel staat aan en uit kunnen, en moet
 * hij plat kunnen slaan (die keer dat het bijna misgaat).
 *
 * De geschilderde plaat is daarom in twee stukken opgesneden: onder de
 * tafelrand het meubel, erboven alles wat erop staat. Dat bovenstuk hangt in
 * een eigen groep met zijn draaipunt op het tafelblad, zodat schalen het naar
 * beneden plet in plaats van door het blad heen.
 *
 * `variant` kiest tussen de twee tekeningen: de gewone tafel voor de reviews,
 * de rijkere voor Inspect & Adapt -- daar staat een kwartaal werk op.
 */
export function demotafel(kleur = PALET.blauwLicht, { variant = 1 } = {}) {
  const plaatje = variant >= 2 ? (TEX.demotafel2 || TEX.demotafel) : (TEX.demotafel || TEX.demotafel2);
  if (plaatje) return geschilderdeDemotafel(plaatje);
  return gebouwdeDemotafel(kleur);
}

function geschilderdeDemotafel(plaatje) {
  const groep = new THREE.Group();
  const beeld = plaatje.image;
  const hoogte = PLAAT.tafel.hoogte;
  const breedte = hoogte * (beeld ? beeld.width / beeld.height : 1.33);
  const deel = PLAAT.tafel.blad;

  const maak = (vanaf, tot, y) => {
    const tex = plaatje.clone();
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.offset.set(0, vanaf);
    tex.repeat.set(1, tot - vanaf);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: false, alphaTest: 0.45, toneMapped: false,
    });
    maskeer(mat, 0.10);
    const m = vlak(breedte, hoogte * (tot - vanaf), mat);
    m.position.y = y;
    return m;
  };

  const meubel = maak(0, deel, hoogte * deel / 2);
  groep.add(meubel);

  // eigen groep met het draaipunt op de tafelrand: schalen plet naar beneden
  const bovenop = new THREE.Group();
  bovenop.position.y = hoogte * deel;
  bovenop.add(maak(deel, 1, hoogte * (1 - deel) / 2));
  groep.add(bovenop);

  groep.userData.hoogte = hoogte;
  groep.userData.taart = bovenop;
  return groep;
}

function gebouwdeDemotafel(kleur) {
  const groep = new THREE.Group();
  const blad = doos(3.2, 0.28, 2.2, PALET.korst);
  blad.position.y = 1.1;
  groep.add(blad);
  for (const x of [-1.3, 1.3]) for (const z of [-0.8, 0.8]) {
    const poot = doos(0.2, 1.1, 0.2, PALET.korst);
    poot.position.set(x, 0.55, z);
    groep.add(poot);
  }
  const taart = cilinder(0.85, 0.7, kleur, { emissief: 0.35 });
  taart.position.y = 1.6;
  groep.add(taart);
  const glazuur = cilinder(0.9, 0.2, PALET.room, { emissief: 0.5 });
  glazuur.position.y = 2.0;
  groep.add(glazuur);
  groep.userData.taart = taart;
  return groep;
}

export function podium(breedte = 8) {
  const groep = new THREE.Group();
  const vloer = doos(breedte, 1.2, 5, PALET.korst);
  vloer.position.y = 0.6;
  groep.add(vloer);
  const kleed = doos(breedte + 0.3, 0.2, 5.3, PALET.rood, { emissief: 0.3 });
  kleed.position.y = 1.24;
  groep.add(kleed);
  return groep;
}

/**
 * Het presentatiescherm. `userData.projecteer()` zet er licht op.
 *
 * Bij de geschilderde uitvoering is het scherm al een crèmekleurig vlak; wat
 * het spel doet is het aanzetten. Additief, want een dekkende rechthoek zou
 * het penseelwerk in de projectie wegvagen -- en juist dat penseelwerk maakt
 * dat het licht van een lamp lijkt te komen en niet van een LED.
 */
export function scherm(breedte = 9, hoogte = 5) {
  if (MODEL.scherm) return gemodelleerdScherm(hoogte);
  if (TEX.scherm) return geschilderdScherm(hoogte);
  return gebouwdScherm(breedte, hoogte);
}

function gemodelleerdScherm(hoogte) {
  const groep = new THREE.Group();
  const m = MODEL.scherm;
  const bord = m.wortel.clone();
  bord.scale.multiplyScalar(hoogte / m.hoogte);
  groep.add(bord);
  const schaal = hoogte / m.hoogte;

  // De projectie is licht op het doek, niet een vlak eroverheen: het doek is
  // al crème geschilderd en een dekkende rechthoek zou dat penseelwerk wegvagen.
  const straalMat = meng(new THREE.MeshBasicMaterial({ color: PALET.room, toneMapped: false }));
  straalMat.opacity = 0;
  const beeld = vlak(m.breedte * schaal * 0.78, m.hoogte * schaal * 0.58, straalMat);
  beeld.position.set(0, m.hoogte * schaal * 0.62, m.diepte * schaal * 0.6);
  beeld.renderOrder = 3;
  groep.add(beeld);

  groep.userData.hoogte = m.hoogte * schaal;
  groep.userData.beeld = beeld;
  groep.userData.projecteer = (kleur, sterkte) => {
    straalMat.color.set(kleur);
    straalMat.opacity = Math.max(0, sterkte * 0.6);
  };
  return groep;
}

function geschilderdScherm(hoogte) {
  const groep = new THREE.Group();
  const vel = plaat(TEX.scherm, hoogte * 1.28, { masker: 0.10 });
  groep.add(vel);

  const straalMat = meng(new THREE.MeshBasicMaterial({ color: PALET.room, toneMapped: false }));
  straalMat.opacity = 0;
  const beeld = opPlaat(vel, PLAAT.scherm.beeld, straalMat, { schaal: 0.98, z: 0.05 });
  beeld.renderOrder = 3;
  groep.add(beeld);

  groep.userData.hoogte = vel.userData.maat.hoogte;
  groep.userData.beeld = beeld;
  groep.userData.projecteer = (kleur, sterkte) => {
    straalMat.color.set(kleur);
    straalMat.opacity = Math.max(0, sterkte);
  };
  return groep;
}

function gebouwdScherm(breedte, hoogte) {
  const groep = new THREE.Group();
  const lijst = doos(breedte + 0.5, hoogte + 0.5, 0.5, PALET.blauwDiep);
  lijst.position.y = hoogte / 2;
  groep.add(lijst);
  const beeld = doos(breedte, hoogte, 0.3, PALET.room, { emissief: 0.7 });
  beeld.position.set(0, hoogte / 2, 0.2);
  groep.add(beeld);
  groep.userData.beeld = beeld;
  for (const x of [-breedte / 2 - 0.6, breedte / 2 + 0.6]) {
    const poot = doos(0.3, hoogte * 0.9, 0.3, PALET.korst);
    poot.position.set(x, hoogte * 0.45, 0);
    groep.add(poot);
  }
  groep.userData.hoogte = hoogte;
  groep.userData.projecteer = (kleur, sterkte) => {
    beeld.material = verf(kleur, { emissief: sterkte });
  };
  return groep;
}

export function knopZuil(tekst, kleur) {
  const groep = new THREE.Group();
  const zuil = doos(1.8, 1.5, 1.4, PALET.blauwDiep);
  zuil.position.y = 0.75;
  groep.add(zuil);
  const knop = cilinder(0.62, 0.5, kleur, { emissief: 0.6 });
  knop.position.y = 1.6;
  groep.add(knop);
  groep.userData.knop = knop;
  const naambord = label(tekst, { breedte: 3.4, grootte: 54, plaat: true });
  naambord.position.y = 2.6;
  groep.add(naambord);
  return groep;
}

/* ------------------------------------------------------------------ *
 * Kleine chaos onderweg
 * ------------------------------------------------------------------ */

export function broodje() {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 5, 10), verf(PALET.toast, { emissief: 0.2, plat: true }));
  m.rotation.z = Math.PI / 2;
  return m;
}

export function lopendeBand(lengte) {
  const groep = new THREE.Group();
  const band = doos(lengte, 0.4, 2.4, PALET.blauwDiep);
  groep.add(band);
  for (let i = 0; i < Math.floor(lengte / 1.2); i++) {
    const rol = cilinder(0.3, 2.2, PALET.steen);
    rol.rotation.x = Math.PI / 2;
    rol.position.set(-lengte / 2 + i * 1.2 + 0.6, -0.1, 0);
    groep.add(rol);
  }
  return groep;
}

export function stokbrood(lengte = 7) {
  const groep = new THREE.Group();
  const brood = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, lengte - 1.7, 6, 12), verf(PALET.toast, { emissief: 0.18, plat: true }));
  brood.rotation.z = Math.PI / 2;
  groep.add(brood);
  for (let i = 0; i < 5; i++) {
    const snee = doos(0.14, 0.5, 1.5, PALET.korst);
    snee.position.set(-lengte / 2 + 1.2 + i * ((lengte - 2.4) / 4), 0.55, 0);
    snee.rotation.z = 0.5;
    groep.add(snee);
  }
  return groep;
}

export function papierrommel(hoogte = 3) {
  const groep = new THREE.Group();
  const lagen = Math.round(hoogte * 4);
  for (let i = 0; i < lagen; i++) {
    const vel = doos(1.6 + Math.random() * 0.8, 0.12, 1.4 + Math.random() * 0.5, i % 3 ? PALET.papier : PALET.room, { plat: true });
    vel.position.set((Math.random() - 0.5) * 0.7, i * (hoogte / lagen) + 0.06, (Math.random() - 0.5) * 0.7);
    vel.rotation.y = Math.random() * Math.PI;
    vel.rotation.z = (Math.random() - 0.5) * 0.16;
    groep.add(vel);
  }
  const ogen = vlak(1.4, 0.7, new THREE.MeshBasicMaterial({ map: emojiTextuur('😠'), transparent: true, depthWrite: false }));
  ogen.position.set(0, hoogte * 0.7, 0.9);
  ogen.renderOrder = 4;
  groep.add(ogen);
  return groep;
}

export function broodrooster() {
  const groep = new THREE.Group();
  const kast = doos(2.2, 1.6, 1.4, PALET.steen, { plat: true });
  kast.position.y = 0.8;
  groep.add(kast);
  for (const x of [-0.5, 0.5]) {
    const gleuf = doos(0.7, 0.16, 1.0, PALET.blauwDiep);
    gleuf.position.set(x, 1.62, 0);
    groep.add(gleuf);
    const toast = doos(0.62, 0.7, 0.9, PALET.korst, { plat: true });
    toast.position.set(x, 1.9, 0);
    groep.add(toast);
  }
  const aanslag = bol(0.5, PALET.korst, { plat: true });
  aanslag.position.set(0.9, 1.4, 0.7);
  groep.add(aanslag);
  return groep;
}

/**
 * Een deur. `userData.kleuren()` verft het blad, `userData.open()` haalt hem weg.
 *
 * Dat zijn twee losse handelingen omdat het spel ze los gebruikt: de drie
 * deuren in sprint 3 krijgen elk hun eigen kleur, en er gaat er precies één
 * open. Bij de geschilderde uitvoering wordt de plaat getint in plaats van
 * overgeschilderd -- een dekkend gekleurd vlak zou de tekening wegvagen.
 */
export function deur(regels, breedte = 3, hoogte = 4.6) {
  if (MODEL.deur) return gemodelleerdeDeur(regels);
  if (TEX.deur) return geschilderdeDeur(regels, hoogte);
  return gebouwdeDeur(regels, breedte, hoogte);
}

/**
 * De gemodelleerde deur: een stenen poort met een taartje ernaast.
 *
 * Kleuren doet hier hetzelfde als bij de plaat -- de tekening tinten en niet
 * overschilderen. Opengaan is bij een model wél echt: de poort verdwijnt en je
 * loopt erdoorheen, en dat leest beter dan een deurblad dat oplost.
 */
function gemodelleerdeDeur(regels) {
  const groep = new THREE.Group();
  const m = MODEL.deur;
  const poort = m.wortel.clone();
  groep.add(poort);

  const bordje = label(regels, { breedte: m.breedte * 0.86, grootte: 52, plaat: true });
  // Ruim vóór het model en niet er middenin: een 3D-prop heeft diepte, en een
  // bordje dat op de halve diepte hangt wordt door zijn eigen boog afgesneden.
  bordje.position.set(0, m.hoogte * 1.10, m.diepte * 1.4);
  groep.add(bordje);

  // Licht in de doorgang in plaats van verf op de steen.
  //
  // Het model tinten was de eerste ingeving en dat werkte niet: goud, groen en
  // paars over hetzelfde blauwgrijze metselwerk gaan alle drie naar dezelfde
  // modder, en dan zie je juist niet meer welke deur je kiest. Een gekleurde
  // gloed ín de opening leest wel meteen -- en met de bloei eroverheen schijnt
  // hij de poort uit.
  const gloedMat = meng(new THREE.MeshBasicMaterial({
    map: vlekTextuur(), color: 0xffffff, toneMapped: false,
  }));
  gloedMat.opacity = 0;
  const schijn = vlak(m.breedte * 0.58, m.hoogte * 0.72, gloedMat);
  schijn.position.set(0, m.hoogte * 0.44, m.diepte * 0.52);
  schijn.renderOrder = 3;
  groep.add(schijn);

  groep.userData.hoogte = m.hoogte;
  groep.userData.blad = poort;
  groep.userData.kleuren = (kleur) => {
    gloedMat.color.set(kleur);
    gloedMat.opacity = 0.62;
  };
  groep.userData.open = () => { poort.visible = false; schijn.visible = false; };
  return groep;
}

function geschilderdeDeur(regels, hoogte) {
  const groep = new THREE.Group();
  const vel = plaat(TEX.deur, hoogte * 1.12, { masker: 0.10 });
  groep.add(vel);

  const bordje = label(regels, { breedte: vel.userData.maat.breedte * 0.9, grootte: 48, plaat: true });
  bordje.position.set(0, vel.userData.maat.hoogte * 1.05, 0.1);
  groep.add(bordje);

  groep.userData.hoogte = vel.userData.maat.hoogte;
  groep.userData.blad = vel;
  groep.userData.kleuren = (kleur) => {
    // licht getint: de tekening moet leesbaar blijven, het is een hint welke
    // deur bij welk antwoord hoort en geen kleurvlak
    vel.material.color.set(kleur).lerp(new THREE.Color(0xffffff), 0.45);
  };
  groep.userData.open = () => { vel.visible = false; };
  return groep;
}

function gebouwdeDeur(regels, breedte, hoogte) {
  const groep = new THREE.Group();
  const kozijn = doos(breedte + 0.5, hoogte + 0.4, 0.7, PALET.korst);
  kozijn.position.y = hoogte / 2;
  groep.add(kozijn);
  const blad = doos(breedte, hoogte, 0.4, PALET.blauw);
  blad.position.set(0, hoogte / 2, 0.25);
  groep.add(blad);
  groep.userData.blad = blad;
  const bordje = label(regels, { breedte: breedte * 0.95, grootte: 48 });
  bordje.position.set(0, hoogte * 0.72, 0.5);
  groep.add(bordje);
  const kruk = bol(0.16, PALET.goud, { emissief: 0.5 });
  kruk.position.set(breedte * 0.34, hoogte * 0.45, 0.5);
  groep.add(kruk);
  groep.userData.hoogte = hoogte;
  groep.userData.kleuren = (kleur) => { blad.material = verf(kleur, { emissief: 0.2 }); };
  groep.userData.open = () => { blad.visible = false; };
  return groep;
}

/* ------------------------------------------------------------------ *
 * De Cluster Review
 * ------------------------------------------------------------------ */

/**
 * Een teamstand: kleine demotafel met een naambordje en een eigen oventje.
 *
 * Kleiner dan demotafel() omdat er zeventien naast elkaar staan. Enablerteams
 * krijgen geen taart maar een sleutel op tafel: zij maken mogelijk dat de rest
 * kan bakken, en dat is een ander soort resultaat.
 */
export function teamstand(naam, { kleur = PALET.goud, enabler = false } = {}) {
  if (TEX.teamstand) return geschilderdeTeamstand(naam, enabler);

  const groep = new THREE.Group();

  const blad = doos(2.4, 0.22, 1.6, PALET.korst);
  blad.position.y = 1.0;
  groep.add(blad);
  for (const x of [-0.95, 0.95]) for (const z of [-0.6, 0.6]) {
    const poot = doos(0.16, 1.0, 0.16, PALET.korst);
    poot.position.set(x, 0.5, z);
    groep.add(poot);
  }

  const resultaat = new THREE.Group();
  if (enabler) {
    const steel = doos(0.16, 0.9, 0.16, PALET.blauwLicht, { emissief: 0.5 });
    steel.position.y = 0.45;
    resultaat.add(steel);
    const baard = doos(0.5, 0.16, 0.16, PALET.blauwLicht, { emissief: 0.5 });
    baard.position.set(0.17, 0.12, 0);
    resultaat.add(baard);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 6, 16), verf(PALET.blauwLicht, { emissief: 0.5 }));
    ring.position.y = 1.0;
    resultaat.add(ring);
  } else {
    const bodem = cilinder(0.6, 0.5, kleur, { emissief: 0.35 });
    bodem.position.y = 0.25;
    resultaat.add(bodem);
    const glazuur = cilinder(0.64, 0.16, PALET.room, { emissief: 0.5 });
    glazuur.position.y = 0.58;
    resultaat.add(glazuur);
    const kers = bol(0.12, PALET.rood, { emissief: 0.6 });
    kers.position.y = 0.74;
    resultaat.add(kers);
  }
  resultaat.position.y = 1.12;
  groep.add(resultaat);
  groep.userData.resultaat = resultaat;

  const bordje = label(naam, { breedte: 2.5, grootte: 52, plaat: true });
  bordje.position.set(0, 2.5, 0.2);
  groep.add(bordje);
  groep.userData.bordje = bordje;

  const oventje = doos(0.9, 0.9, 0.7, PALET.blauw, { plat: true });
  oventje.position.set(-1.5, 0.45, 0);
  groep.add(oventje);
  const lampje = bol(0.16, PALET.oranje, { emissief: 1.4 });
  lampje.position.set(-1.5, 0.95, 0.4);
  groep.add(lampje);
  groep.userData.lampje = lampje;

  // Cadans: hoe deze stand laat zien dat hij in de maat loopt of net niet.
  groep.userData.cadans = (puls, uitDeMaat) => {
    lampje.material = gloed(uitDeMaat ? PALET.blauwLicht : PALET.oranje, 0.9 + puls * 0.5);
    resultaat.position.y = 1.12 + Math.max(0, puls) * 0.07;
  };
  return groep;
}

/* Waar op de plaat het naambord zit, en hoe hoog het kraampje in de wereld
 * staat. Het bord op de tekening is met opzet leeg: de naam wordt door het
 * spel gerenderd, zodat de teamlijst aan te passen is zonder opnieuw te
 * renderen. */
const STAND = { HOOGTE: 3.4, BORD_Y: 0.845, BORD_BREEDTE: 0.52 };

function geschilderdeTeamstand(naam, enabler) {
  const groep = new THREE.Group();

  const beeld = TEX.teamstand.image;
  const verhouding = beeld ? beeld.width / beeld.height : 1;
  const hoogte = STAND.HOOGTE;
  const breedte = hoogte * verhouding;

  const materiaal = new THREE.MeshBasicMaterial({
    map: TEX.teamstand, transparent: false, alphaTest: 0.4, toneMapped: false,
  });
  maskeer(materiaal, 0.12);
  const vlak = new THREE.Mesh(VLAK, materiaal);
  vlak.scale.set(breedte, hoogte, 1);
  vlak.position.y = hoogte / 2;
  groep.add(vlak);

  // Enablerteams bakken niets maar maken mogelijk dat de rest kan bakken;
  // dat verschil blijft, alleen nu als een kleurzweem over dezelfde plaat.
  if (enabler) materiaal.color.setHex(0x9fc2ff);

  const bordje = label(naam, { breedte: breedte * STAND.BORD_BREEDTE, grootte: 52 });
  bordje.position.set(0, hoogte * STAND.BORD_Y, 0.06);
  groep.add(bordje);
  groep.userData.bordje = bordje;

  /* Cadans op een platte plaat.
   *
   * Bij de 3D-versie knipperde het oventje en wipte de taart; hier is alles
   * één tekening. Dus doet het kraampje als geheel mee: het ademt een tikje
   * op en neer en de warmte in de oven pulseert via de kleur. Teams die niet
   * in de maat lopen krijgen een koelere zweem en een trager ritme -- geen
   * oordeel, gewoon zichtbaar. */
  groep.userData.cadans = (puls, uitDeMaat) => {
    vlak.position.y = hoogte / 2 + Math.max(0, puls) * 0.05;
    const warm = 1.0 + puls * 0.10;
    if (uitDeMaat) materiaal.color.setRGB(warm * 0.82, warm * 0.88, warm * 1.05);
    else if (!enabler) materiaal.color.setRGB(warm, warm * 0.97, warm * 0.92);
  };
  return groep;
}

/**
 * Woo Jung FM: een klein gedeukt radiootje op een paaltje.
 *
 * Geen figuurtje. Aanwezig zonder spotlight -- wie het weet die weet het.
 */
export function radio() {
  const groep = new THREE.Group();

  const paal = cilinder(0.1, 1.1, PALET.steen);
  paal.position.y = 0.55;
  groep.add(paal);

  const kast = doos(1.5, 0.9, 0.7, PALET.korst, { plat: true });
  kast.position.y = 1.55;
  kast.rotation.z = 0.06;          // scheef, want gedeukt
  groep.add(kast);

  const rooster = doos(0.62, 0.62, 0.1, PALET.blauwDiep);
  rooster.position.set(-0.36, 1.55, 0.38);
  rooster.rotation.z = 0.06;
  groep.add(rooster);

  const schaal = doos(0.6, 0.24, 0.1, PALET.room, { emissief: 0.8 });
  schaal.position.set(0.3, 1.72, 0.38);
  groep.add(schaal);

  for (const x of [0.16, 0.46]) {
    const knop = cilinder(0.11, 0.12, PALET.goud, { emissief: 0.5 });
    knop.rotation.x = Math.PI / 2;
    knop.position.set(x, 1.38, 0.38);
    groep.add(knop);
  }

  const antenne = cilinder(0.035, 1.5, PALET.goud, { emissief: 0.4 });
  antenne.position.set(0.6, 2.4, 0);
  antenne.rotation.z = -0.4;
  groep.add(antenne);

  const bordje = label('WOO JUNG FM', { breedte: 3.0, grootte: 46, plaat: true });
  bordje.position.set(0, 3.2, 0.2);
  groep.add(bordje);

  groep.userData.schaal = schaal;
  return groep;
}

/** De Obeya-muur: kaartjes in kolommen. Decor, maar herkenbaar decor. */
export function obeya(breedte = 9, hoogte = 4.4) {
  const groep = new THREE.Group();

  const wand = doos(breedte, hoogte, 0.4, PALET.blauwDiep, { plat: true });
  wand.position.y = hoogte / 2;
  groep.add(wand);

  const kleuren = [PALET.goud, PALET.groen, PALET.roze, PALET.oranje, PALET.blauwLicht];
  const kolommen = Math.max(3, Math.round(breedte / 2.2));
  let n = 7;
  const willekeur = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < kolommen; k++) {
    const rijen = 2 + Math.floor(willekeur() * 3);
    for (let r = 0; r < rijen; r++) {
      const kaartje = doos(0.7, 0.5, 0.06, kleuren[Math.floor(willekeur() * kleuren.length)], { emissief: 0.35 });
      kaartje.position.set(
        -breedte / 2 + 1.1 + k * ((breedte - 2.2) / Math.max(1, kolommen - 1)),
        hoogte - 1.0 - r * 0.75,
        0.24,
      );
      kaartje.rotation.z = (willekeur() - 0.5) * 0.2;
      groep.add(kaartje);
    }
  }

  const kop = label('OBEYA', { breedte: 3.2, grootte: 56, plaat: true });
  kop.position.set(0, hoogte - 0.3, 0.3);
  groep.add(kop);
  return groep;
}

/** De bus van links: spoedwerk arriveert per bus, met knipperlicht. */
export function bus(lengte = 9) {
  const groep = new THREE.Group();

  const romp = doos(lengte, 3.2, 3, PALET.oranje, { plat: true, emissief: 0.3 });
  romp.position.y = 2.2;
  groep.add(romp);

  const dak = doos(lengte * 0.98, 0.3, 3.1, PALET.room, { emissief: 0.4 });
  dak.position.y = 3.9;
  groep.add(dak);

  for (let i = 0; i < 4; i++) {
    const raam = doos(lengte * 0.16, 1.1, 0.2, PALET.blauwDiep, { emissief: 0.2 });
    raam.position.set(-lengte * 0.34 + i * lengte * 0.22, 2.8, 1.55);
    groep.add(raam);
  }

  for (const x of [-lengte * 0.32, lengte * 0.3]) {
    const wiel = cilinder(0.75, 0.6, PALET.blauwDiep);
    wiel.rotation.x = Math.PI / 2;
    wiel.position.set(x, 0.75, 1.5);
    groep.add(wiel);
    const wiel2 = wiel.clone();
    wiel2.position.z = -1.5;
    groep.add(wiel2);
  }

  const knipper = bol(0.3, PALET.goudLicht, { emissief: 1.8 });
  knipper.position.set(0, 4.2, 0);
  groep.add(knipper);
  groep.userData.knipper = knipper;

  const rolbord = label('SPOED', { breedte: 3.4, grootte: 62, plaat: true });
  rolbord.position.set(lengte * 0.36, 3.2, 1.6);
  groep.add(rolbord);

  return groep;
}

/**
 * De wachttunnel: een gesloten deur, en ernaast een grote knop die niks doet.
 *
 * Geen namen, geen venijn -- alleen het gevoel dat iedereen kent.
 */
export function wachttunnel(lengte = 10, hoogte = 6) {
  const groep = new THREE.Group();

  for (const x of [-lengte / 2, lengte / 2]) {
    const wang = doos(0.8, hoogte, 5, PALET.steen, { plat: true });
    wang.position.set(x, hoogte / 2, -1);
    groep.add(wang);
  }
  const bovenkant = doos(lengte + 0.8, 0.9, 5, PALET.steen, { plat: true });
  bovenkant.position.set(0, hoogte + 0.45, -1);
  groep.add(bovenkant);

  const poort = doos(lengte - 0.6, hoogte - 0.4, 0.5, PALET.blauw, { plat: true, emissief: 0.12 });
  poort.position.set(0, (hoogte - 0.4) / 2, 0.6);
  groep.add(poort);
  groep.userData.poort = poort;

  for (let i = 1; i < 5; i++) {
    const balk = doos(lengte - 1.0, 0.24, 0.2, PALET.goud, { emissief: 0.3 });
    balk.position.set(0, i * (hoogte - 0.4) / 5, 0.9);
    groep.add(balk);
    poort.userData[`balk${i}`] = balk;
    groep.userData[`balk${i}`] = balk;
  }

  const bordje = label('EVEN GEDULD', { breedte: lengte * 0.7, grootte: 52, plaat: true });
  bordje.position.set(0, hoogte + 1.3, 0.6);
  groep.add(bordje);

  return groep;
}

/* ------------------------------------------------------------------ *
 * Decor
 * ------------------------------------------------------------------ */

/** Cipres in Van Gogh-stijl: een wringende vlam van kegels. */
export function cipres(hoogte = 9) {
  const groep = new THREE.Group();
  const lagen = 7;
  for (let i = 0; i < lagen; i++) {
    const t = i / lagen;
    const k = kegel(1.5 * (1 - t * 0.72), hoogte / lagen * 2.1, i % 2 ? 0x1d4a2a : 0x2a6b38, { plat: true });
    k.position.set(Math.sin(i * 1.7) * 0.42, hoogte * t + hoogte / lagen, 0);
    k.rotation.z = Math.sin(i * 2.1) * 0.16;
    groep.add(k);
  }
  const stam = cilinder(0.28, 1.6, PALET.korst);
  stam.position.y = 0.8;
  groep.add(stam);
  return groep;
}

export function lantaarn(hoogte = 4.5) {
  if (MODEL.lantaarn) return gemodelleerdeLantaarn(hoogte);
  return gebouwdeLantaarn(hoogte);
}

/**
 * De gietijzeren lantaarn, met een taartje aan de arm.
 *
 * Het licht komt uit drie dingen tegelijk, en dat is geen stapeling maar
 * arbeidsdeling: de textuur geeft het glas zijn gloed, een additieve vlek
 * geeft de halo eromheen die de bloeipass oppikt, en een puntlicht laat de
 * straat eronder echt oplichten. Alleen dat laatste kost iets, dus het bereik
 * is krap gehouden.
 */
function gemodelleerdeLantaarn(hoogte) {
  const groep = new THREE.Group();
  const m = MODEL.lantaarn;
  const schaal = hoogte / m.hoogte;
  const paal = m.wortel.clone();
  paal.scale.multiplyScalar(schaal);
  groep.add(paal);

  // de lampkop zit bovenin; uitgemeten op het model
  const kopY = hoogte * 0.86;

  const halo = vlak(hoogte * 0.5, hoogte * 0.5, meng(new THREE.MeshBasicMaterial({
    map: vlekTextuur(), color: PALET.goudLicht, toneMapped: false,
  })));
  halo.material.opacity = 0.55;
  halo.position.set(0, kopY, m.diepte * schaal * 0.5);
  halo.renderOrder = 3;
  groep.add(halo);

  const licht = new THREE.PointLight(0xffd873, 9, 14, 2);
  licht.position.set(0, kopY, 0.4);
  groep.add(licht);
  return groep;
}

function gebouwdeLantaarn(hoogte) {
  const groep = new THREE.Group();
  const paal = cilinder(0.14, hoogte, PALET.blauwDiep);
  paal.position.y = hoogte / 2;
  groep.add(paal);
  const kap = kegel(0.6, 0.7, PALET.goud);
  kap.position.y = hoogte + 0.35;
  groep.add(kap);
  const lamp = bol(0.42, PALET.goudLicht, { emissief: 1.6 });
  lamp.position.y = hoogte - 0.1;
  groep.add(lamp);
  const licht = new THREE.PointLight(0xffd873, 12, 16, 2);
  licht.position.y = hoogte - 0.1;
  groep.add(licht);
  return groep;
}

/** Werkende achtergrondbakkerij: silhouetten die diepte geven. */
export function achtergrondBakkerij(breedte, zaad = 1) {
  const groep = new THREE.Group();
  let x = -breedte / 2;
  let n = zaad;
  const willekeur = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648;
  while (x < breedte / 2) {
    const b = 3 + willekeur() * 5;
    const h = 3 + willekeur() * 9;
    const gebouw = doos(b, h, 2, willekeur() > 0.5 ? PALET.blauwDiep : 0x14245e, { plat: true, emissief: 0.05 });
    gebouw.position.set(x + b / 2, h / 2, -14 - willekeur() * 8);
    groep.add(gebouw);
    if (willekeur() > 0.45) {
      const raam = doos(b * 0.3, 0.8, 0.2, PALET.goud, { emissief: 1.3 });
      raam.position.set(x + b / 2, h * 0.62, gebouw.position.z + 1.1);
      groep.add(raam);
    }
    x += b + 1 + willekeur() * 3;
  }
  return groep;
}
