/* CAEK — alle draaiknoppen op één plek.
 *
 * Wat je hier verandert, verandert het spel zonder dat er code aan te pas
 * komt. Dat geldt vooral voor TEAMS, PUBLIEK en AFTITELING: die lijsten zijn
 * bedoeld om tot vijf minuten voor verzending nog bij te werken. Het spel
 * werkt met vier teams net zo goed als met twintig -- nergens staat een
 * aantal hardcoded. */

export const NATUURKUNDE = {
  zwaartekracht: -58,
  loopSnelheid: 7.6,
  rennenVanaf: 5.4,        // boven deze snelheid speelt de renanimatie
  versnellingGrond: 62,
  versnellingLucht: 34,
  wrijvingGrond: 15,
  springKracht: 19.5,
  coyoteTijd: 0.12,        // nog even mogen springen na de rand
  springBuffer: 0.15,      // te vroeg drukken telt alsnog
  maxValSnelheid: -42,
  dodelijkeHoogte: -14,
  spelerBreedte: 1.15,
  spelerHoogte: 2.0,
};

export const CAMERA = {
  fov: 40,
  afstand: 14.5,
  hoogte: 3.2,
  vooruit: 2.6,            // camera kijkt een stukje voor de speler uit
  volgSoepel: 3.6,
  superZoom: 2.2,
};

export const SUPERCAEK = {
  duur: 20,                // seconden in comicmodus bij Inspect & Adapt
  transformatie: 2.6,      // lengte van het anime-pauzemoment
  snelheidsbonus: 1.7,
  // Hij hoort een slag groter te zijn dan Caek: dat is het hele punt van een
  // transformatie. Groter dan dit en hij past niet meer onder de platforms.
  hoogteFactor: 1.22,
};

/* Schakelaars voor grappen die misschien niet blijken te werken. Uit zetten
 * kost één regel; iets uit de code halen kost een middag. */
export const SCHAKELS = {
  // Getekende sprites in plaats van de 3D-modellen. De hele renderketen is
  // gebouwd voor dikke simpele vormen met harde kleurvlakken, en dat is
  // precies wat een tekening is. Op false vallen we terug op de GLB's; die
  // code blijft staan zodat de keuze omkeerbaar is.
  sprites: true,
  wachttunnel: true,       // sprint 4: de deur die op zichzelf opengaat
  cadans: true,            // teams die net iets uit de maat draaien
  wooJungFM: true,         // het gedeukte radiootje bij de review
};

/* ------------------------------------------------------------------ *
 * De karakters als getekende sprites
 * ------------------------------------------------------------------ */

/* Eén PNG per animatie, frames naast elkaar in een horizontale strip. Het
 * getal achter de laatste underscore is het aantal frames -- dat zet
 * tools/sprites.py er zelf in. Ontbreekt een animatie, dan leent de sprite er
 * een die er wél is; ontbreekt alles, dan komt er een plaatshouder.
 *
 * `hoogte` is de wereldhoogte van het karakter, niet de pixelhoogte. */
export const SPRITE = {
  map: './assets/sprites/',
  hoogte: NATUURKUNDE.spelerHoogte,
  karakters: {
    caek: {
      hoogte: NATUURKUNDE.spelerHoogte,
      animaties: {
        idle: 'caek_idle_1.png',
        lopen: 'caek_lopen_10.png',
        rennen: 'caek_rennen_10.png',
        springen: 'caek_springen_2.png',
      },
    },
    supercaek: {
      hoogte: NATUURKUNDE.spelerHoogte * 1.22,
      animaties: {
        idle: 'supercaek_idle_1.png',
        lopen: 'supercaek_lopen_6.png',
        rennen: 'supercaek_rennen_6.png',
      },
    },
    cupcaek: {
      hoogte: NATUURKUNDE.spelerHoogte * 0.89,
      animaties: {
        idle: 'cupcaek_idle_1.png',
        lopen: 'cupcaek_lopen_6.png',
      },
    },
  },
};

/* ------------------------------------------------------------------ *
 * Het Doelenwiel — de ruggengraat
 * ------------------------------------------------------------------ */

/* De acht echte doelen van UWV, met de klok mee vanaf boven.
 *
 * Alles wat je doet is aan een segment gekoppeld, en het wiel loopt
 * gedurende de vier sprints vol. In het naafje staat alleen DOELEN UWV;
 * "Wet- en regelgeving" is al een segment, dus in het midden zou het
 * dubbel staan.
 *
 * `kort` is wat er in het segment past, `naam` is de volledige formulering. */
export const DOELENWIEL = [
  { id: 'wet', kort: ['Wet- en', 'regelgeving'], naam: 'Wet- en regelgeving', kleur: '#cf3a2c', icoon: '⚖️' },
  { id: 'digitaliseren', kort: ['Vereenvoudigen', 'en digitaliseren'], naam: 'Vereenvoudigen en digitaliseren', kleur: '#f5b229', icoon: '🖥️' },
  { id: 'bedrijfsvoering', kort: ['Bedrijfsvoering', 'in control'], naam: 'Bedrijfsvoering in control', kleur: '#efc026', icoon: '⚙️' },
  { id: 'medewerkers', kort: ['Medewerkers gezien,', 'gehoord, gewaardeerd'], naam: 'Medewerkers gezien, gehoord en gewaardeerd', kleur: '#8cc63f', icoon: '💚' },
  { id: 'eenuwv', kort: ['Eén UWV,', 'één overheid'], naam: 'Eén UWV, één overheid', kleur: '#63a844', icoon: '🤝' },
  { id: 'dienstverlening', kort: ['Dienstverlening passend', 'en toegankelijk'], naam: 'Dienstverlening passend en toegankelijk', kleur: '#7cbf52', icoon: '🚪' },
  { id: 'clienten', kort: ['Cliënten inzicht', 'in eigen situatie'], naam: 'Cliënten inzicht in eigen situatie', kleur: '#e8721f', icoon: '👤' },
  { id: 'beslissingen', kort: ['Beslissingen tijdig,', 'juist, begrijpelijk'], naam: 'Beslissingen tijdig, juist en begrijpelijk', kleur: '#f0932b', icoon: '🕐' },
];

export const PI = {
  // welk segment van het wiel deze PI vooral dient
  strategisch: 'dienstverlening',
  doel: 'Afnemers en ketenpartners krijgen in één keer het juiste antwoord.',
  // wat de teams op de PI planning aan business value beloofden; bij Inspect
  // & Adapt komt de werkelijkheid ernaast te staan
  beloofdeValue: 340,
};

/* ------------------------------------------------------------------ *
 * De teams
 * ------------------------------------------------------------------ */

/* Dit is de enige lijst die je nakijkt voordat je het spel verstuurt. Wie
 * hier niet in staat maar wel bij het cluster hoort, hoort in AFTITELING.
 *
 * `cadans: false` betekent: draait nog niet mee in hetzelfde ritme. Dat is
 * puur visueel -- hun oventimer staat anders, hun taart komt een tel later
 * uit de oven. De speler hoeft er niets mee te doen. */
export const TEAMS = [
  { naam: 'Polis LA', soort: 'applicatie' },
  { naam: 'Superheroes', soort: 'applicatie' },
  { naam: 'Sterke Verhalen', soort: 'applicatie' },
  { naam: 'Casio', soort: 'applicatie' },
  { naam: 'Equinox', soort: 'applicatie' },
  { naam: 'KMT IO', soort: 'applicatie' },
  { naam: 'Smurfen', soort: 'applicatie' },
  { naam: 'Muppets', soort: 'applicatie' },
  { naam: 'UGCEMP', soort: 'applicatie' },
  { naam: 'AVBDVB', soort: 'applicatie' },
  { naam: 'UPA', soort: 'applicatie', cadans: false },
  { naam: 'KBS', soort: 'applicatie' },
  { naam: 'Luziver', soort: 'applicatie', cadans: false },
  { naam: 'BPMONE', soort: 'applicatie' },
  { naam: 'Tiem', soort: 'applicatie' },
  { naam: 'TET', soort: 'enabler' },
  { naam: 'Architectuur', soort: 'enabler' },
];

/* In het publiek bij elke Cluster Review. Dat de stakeholders ín het cluster
 * zitten is waar dit cluster trots op is, dus die horen in beeld en niet
 * achter een muur waar je naartoe demonstreert. */
export const PUBLIEK = 'Stakeholders, binnen en buiten UWV';

/**
 * Welk teamdoel aan welk wielsegment hangt, en bij welke review dat zichtbaar
 * wordt.
 *
 * Afgeleid uit de teamlijst in plaats van met de hand ingevuld: zo blijft het
 * kloppen als de roster verandert, en zo staat er nergens de bewering "team X
 * werkt aan doel Y" -- het zijn gouden lijnen, geen toewijzingen.
 *
 * De verdeling loopt op: bij review 1 hangt een deel eraan, bij Inspect &
 * Adapt alles. Dat is de beweging die er echt is.
 */
export function koppelingen(teams = TEAMS, wiel = DOELENWIEL) {
  const n = teams.length;
  return teams.map((team, i) => ({
    team: team.naam,
    // evenredig over de segmenten: opeenvolgende teams komen op hetzelfde
    // segment uit, zodat het wiel per review met twee segmenten volloopt in
    // plaats van meteen helemaal. De lijnen bundelen dan ook mooi.
    doel: wiel[Math.min(wiel.length - 1, Math.floor((i * wiel.length) / n))].id,
    // gelijkmatig over de vier momenten, zodat er bij review 1 al lijnen
    // hangen en bij Inspect & Adapt alles eraan hangt
    review: Math.min(4, Math.floor((i * 4) / n) + 1),
  }));
}

/* ------------------------------------------------------------------ *
 * De vier sprints
 * ------------------------------------------------------------------ */

/* Sprint 1. Vijf ingrediënten dragen bij aan het sprintdoel, de rest is
 * precies het soort werk waar Scope Creep dik van wordt. */
export const INGREDIENTEN = [
  { id: 'techniek', emoji: '🧈', naam: 'techniek', nodig: true },
  { id: 'business', emoji: '🥚', naam: 'businesskennis', nodig: true },
  { id: 'data', emoji: '🥛', naam: 'data', nodig: true },
  { id: 'samenwerking', emoji: '🌾', naam: 'samenwerking', nodig: true },
  { id: 'gebruikers', emoji: '🍓', naam: 'gebruikersfeedback', nodig: true },
  { id: 'portaal', emoji: '🍰', naam: 'een tweede portaal "want dat kan ook"', nodig: false },
  { id: 'rapport', emoji: '🧁', naam: 'een extra maandrapportage', nodig: false },
  { id: 'knop', emoji: '🍪', naam: 'nog een knop, blauw ditmaal', nodig: false },
  { id: 'migratie', emoji: '🥐', naam: 'alvast een migratie voor volgend jaar', nodig: false },
];

/* Sprint 2: de afhankelijkheden. Drie schakelaars horen bij teams, niet bij
 * abstracties -- dezelfde puzzel, maar het gaat ineens ergens over. Welke
 * teams dat zijn wordt bij het bouwen uit TEAMS gehaald. */
export const AFHANKELIJKHEDEN = [
  { id: 'business', rol: 'BUSINESS' },
  { id: 'iv', rol: 'IV' },
  { id: 'keten', rol: 'KETENPARTNER' },
];

/* Sprint 3: meten. */
export const METRICS = [
  { id: 'doorlooptijd', emoji: '⏱️', naam: 'Doorlooptijd', meting: 'te hoog — 14 dagen tot antwoord' },
  { id: 'gebruik', emoji: '📉', naam: 'Gebruik', meting: 'lager dan gedacht — 1 op de 5 afnemers' },
  { id: 'feedback', emoji: '🧭', naam: 'Gebruikersfeedback', meting: 'ketenpartners lopen vast bij stap 3' },
];

/* Sprint 3: de bus van links. Theoretisch laat je iets vallen. */
export const SPOEDWERK = [
  { id: 'wetswijziging', naam: 'Een wetswijziging met een datum erop', icoon: '⚖️' },
  { id: 'productie', naam: 'Iets dat in productie stuk is', icoon: '🔥' },
  { id: 'vraag', naam: 'Een vraag van buiten die niet kan wachten', icoon: '📮' },
];

/* Cluster Review: feedback als gekleurde hagelslag. */
export const SPRINKLES = [
  { id: 'kleur', kleur: '#e8721f', tekst: '"De kleur van de knop is niet onze huisstijl."', relevant: false },
  { id: 'stap3', kleur: '#63a844', tekst: '"Bij stap 3 weten we niet meer wat we moeten invullen."', relevant: true },
  { id: 'lettertype', kleur: '#f2799f', tekst: '"Kan het lettertype iets groter?"', relevant: false },
  { id: 'excel', kleur: '#3f63c9', tekst: '"Wij doen dit nu nog in een eigen Excel."', relevant: false },
  { id: 'ai', kleur: '#7a4fb5', tekst: '"Kan er ook AI in?"', relevant: false },
];

/* Wat het radiootje zegt als je erop drukt. Aanwezig zonder spotlight. */
export const WOO_JUNG_FM = [
  'En dan nu: een korte terugblik op de vorige terugblik.',
  'Voor wie net binnenkomt: we zijn al begonnen.',
  'Ik hoor dat de zaal vol is. Dat is het mooiste geluid dat er is.',
  'Even een reminder: de demo duurt vijf minuten. Vijf.',
  'Applaus voor het team dat wél op tijd is aangesloten.',
  'Muziekje? Nee? Goed. Door.',
];

/* ------------------------------------------------------------------ *
 * Waarde: beloofd versus geleverd
 * ------------------------------------------------------------------ */

/* Waarde komt alleen van acties die aan een PI-doel bijdragen. Rondrennen en
 * spullen verzamelen levert niets op -- dat is het punt. De meter capt op 97:
 * er is altijd wel iets te verbeteren. */
export const WAARDE = {
  sprintdoel: 10,
  afhankelijkheid: 10,
  metrics: 12,
  spoedwerk: 6,
  demo: 14,
  feedback: 8,
  review: 6,           // per bijgewoonde Cluster Review
  impediment: 5,
  technicalDebt: 5,
  besluit: 4,
  piDoel: 24,
  plafond: 97,
};

/* ------------------------------------------------------------------ *
 * De wereld: negen secties op één rechte lijn
 * ------------------------------------------------------------------ */

/* Sprint 1 is de langste -- daar leer je de bewegingen. Sprint 2 tot 4 zijn
 * korter omdat je ze al kent. De reviews zijn allemaal even lang: dat is de
 * cadans, en die hoor je te herkennen. */
export const SECTIES = [
  { id: 'planning', x: 0, lengte: 56, naam: 'PI PLANNING', titel: 'DE PI PLANNING', onder: 'wat gaan we deze PI waarmaken?' },
  { id: 'sprint1', x: 56, lengte: 78, naam: 'SPRINT 1', titel: 'SPRINT 1 — HET BESLAG', onder: 'niet alles wat je kunt pakken hoort erbij', doel: 'Maak de eerste werkende basis' },
  { id: 'review1', x: 134, lengte: 48, naam: 'CLUSTER REVIEW 1', titel: 'CLUSTER REVIEW', onder: 'de zaal is vol' },
  { id: 'sprint2', x: 182, lengte: 58, naam: 'SPRINT 2', titel: 'SPRINT 2 — DE KNOOP', onder: 'trek aan één kabel, drie bewegen mee', doel: 'Krijg de keten aan de praat' },
  { id: 'review2', x: 240, lengte: 48, naam: 'CLUSTER REVIEW 2', titel: 'CLUSTER REVIEW', onder: 'nu met meer lijnen naar het wiel' },
  { id: 'sprint3', x: 288, lengte: 68, naam: 'SPRINT 3', titel: 'SPRINT 3 — METEN EN DE BUS', onder: 'hoe gaat het eigenlijk?', doel: 'Meet het, en doe er iets mee' },
  { id: 'review3', x: 356, lengte: 48, naam: 'CLUSTER REVIEW 3', titel: 'CLUSTER REVIEW', onder: 'het wiel is over de helft' },
  { id: 'sprint4', x: 404, lengte: 62, naam: 'SPRINT 4', titel: 'SPRINT 4 — LATEN ZIEN', onder: 'PowerPoint of gewoon laten zien', doel: 'Laat zien wat er werkt' },
  { id: 'inspect', x: 466, lengte: 64, naam: 'INSPECT & ADAPT', titel: 'INSPECT & ADAPT', onder: 'beloofd naast geleverd' },
];

export const WERELD_EINDE = 534;

/* Welke review bij welke sectie hoort. De Cluster Review is één bouwer die
 * vier keer draait; dit is het enige verschil tussen de keren. */
export const REVIEWS = [
  { nummer: 1, sectie: 'review1' },
  { nummer: 2, sectie: 'review2' },
  { nummer: 3, sectie: 'review3' },
  { nummer: 4, sectie: 'inspect' },
];

/* ------------------------------------------------------------------ *
 * Het einde
 * ------------------------------------------------------------------ */

/* Het afscheidswoord. Laat AFSCHEID leeg en het eindscherm slaat dat blok
 * netjes over -- dan blijft de aftiteling staan en klopt het alsnog. */
export const AFSCHEID = {
  regels: [],
  ondertekening: '',
};

/* De aftiteling: DIT CLUSTER BESTOND UIT. Hier mag het lang zijn, hier
 * verwacht iedereen volledigheid. Kopjes met namen eronder. */
export const AFTITELING = [];

export const SLOGAN = 'BETERE INGREDIËNTEN, BETER RESULTAAT!';

/* ------------------------------------------------------------------ *
 * De geschilderde achtergrond
 * ------------------------------------------------------------------ */

/* Drie parallaxlagen, elk één brede tegel die horizontaal herhaalt.
 *
 * `hoogteDeel` is hoe hoog één tegel in beeld staat, als deel van de
 * schermhoogte -- 1.0 vult het beeld precies. Met opzet niet in
 * wereldeenheden: een plaat op dertig eenheden diepte krijgt een beeld te
 * zien dat drie keer zo breed is, dus dezelfde wereldmaat zou daar drie keer
 * zo klein uitvallen. Schermgerelateerd blijft het kloppen, ongeacht diepte.
 *
 * `factor` is hoe hard de laag meebeweegt: 0 staat oneindig ver weg en
 * verschuift niet, 1 plakt aan het spelvlak. `bodem` is waar de onderrand van
 * de plaat in de wereld landt -- dat is wel een wereldmaat, want de horizon
 * hoort vast te liggen ten opzichte van de grond.
 *
 * Deze platen zijn al geschilderd, dus ze krijgen geen olieverffilter overheen
 * -- daar zou alleen pap van komen. Dat is precies waar het alfamasker uit
 * render/composer.js voor is. */
export const ACHTERGROND = {
  map: './assets/achtergrond/',
  lagen: [
    { id: 'ver', z: -46, factor: 0.10, hoogteDeel: 0.72, bodem: -6.5 },
    { id: 'midden', z: -30, factor: 0.26, hoogteDeel: 0.50, bodem: -1.8 },
    { id: 'dichtbij', z: -17, factor: 0.50, hoogteDeel: 0.58, bodem: -2.4 },
  ],
};
