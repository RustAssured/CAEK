/* CAEK — alle draaiknoppen op één plek. */

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
  duur: 20,                // seconden in comicmodus
  transformatie: 2.6,      // lengte van het anime-pauzemoment
  snelheidsbonus: 1.7,
  energiePerValue: 1 / 68, // vol rond de demo, ook als je alles optioneels overslaat
};

/* De Value-beloningen uit het design doc. Waarde komt van bijdragen aan het
 * PI-doel, niet van hard rennen. Alles bij elkaar komt boven de 97, want de
 * meter capt: 100% bestaat niet. */
export const WAARDE = {
  sprintdoel: 10,
  metrics: 15,
  afhankelijkheid: 10,
  feedback: 10,
  demo: 15,
  clusterReview: 10,
  impediment: 5,
  technicalDebt: 5,
  besluit: 5,
  piDoel: 30,
  plafond: 97,
};

/* Het Doelenwiel — de acht echte doelen van UWV, met de klok mee vanaf boven.
 *
 * Dit is de ruggengraat van het spel: alles wat je doet is aan een segment
 * gekoppeld, en het wiel loopt gedurende de vier sprints vol. In het naafje
 * staat alleen DOELEN UWV; "Wet- en regelgeving" is al een segment, dus in het
 * midden zou het dubbel staan.
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

/* De teams van het cluster. Dit is de enige lijst die je nakijkt voordat je
 * het spel verstuurt — het spel werkt met vier teams net zo goed als met
 * twintig, het podium van de Cluster Review schaalt mee. Wie hier niet in
 * staat, hoort in de aftiteling (zie AFTITELING). */
export const TEAMS = {
  applicatie: [
    'Polis LA', 'Superheroes', 'Sterke Verhalen', 'Casio', 'Equinox',
    'KMT IO', 'Smurfen', 'Muppets', 'UGCEMP', 'AVBDVB',
    'UPA', 'KBS', 'Luziver', 'BPMONE', 'Tiem',
  ],
  enabler: ['TET', 'Architectuur'],
};

export const PI = {
  // welk segment van het wiel deze PI vooral dient
  strategisch: 'dienstverlening',
  doel: 'Afnemers en ketenpartners krijgen in één keer het juiste antwoord.',
};

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

export const METRICS = [
  { id: 'doorlooptijd', emoji: '⏱️', naam: 'Doorlooptijd', meting: 'te hoog — 14 dagen tot antwoord' },
  { id: 'gebruik', emoji: '📉', naam: 'Gebruik', meting: 'lager dan gedacht — 1 op de 5 afnemers' },
  { id: 'feedback', emoji: '🧭', naam: 'Gebruikersfeedback', meting: 'ketenpartners lopen vast bij stap 3' },
];

export const SCHAKELAARS = [
  { id: 'business', naam: 'BUSINESS' },
  { id: 'iv', naam: 'IV' },
  { id: 'keten', naam: 'KETENPARTNER' },
];

export const SPRINKLES = [
  { id: 'kleur', kleur: '#e8721f', tekst: '"De kleur van de knop is niet onze huisstijl."', relevant: false },
  { id: 'stap3', kleur: '#63a844', tekst: '"Bij stap 3 weten we niet meer wat we moeten invullen."', relevant: true },
  { id: 'lettertype', kleur: '#f2799f', tekst: '"Kan het lettertype iets groter?"', relevant: false },
  { id: 'excel', kleur: '#3f63c9', tekst: '"Wij doen dit nu nog in een eigen Excel."', relevant: false },
  { id: 'ai', kleur: '#7a4fb5', tekst: '"Kan er ook AI in?"', relevant: false },
];

/* Sectiegrenzen op de X-as. De wereld is één rechte lijn van 0 tot ~356. */
export const SECTIES = [
  { id: 'start', x: 0, naam: 'START PI', titel: 'DE PI PLANNING OVEN', onder: 'de oven warmt op' },
  { id: 'sprint', x: 46, naam: 'SPRINT 1', titel: 'SPRINT 1 — MAAK HET BESLAG', onder: 'niet alles wat je kunt pakken hoort erbij' },
  { id: 'metrics', x: 122, naam: 'METRIEKEN', titel: 'HET METRIEKENLABORATORIUM', onder: 'hoe gaat het eigenlijk?' },
  { id: 'pretzel', x: 178, naam: 'AFHANKELIJKHEDEN', titel: 'DE DEPENDENCY PRETZEL', onder: 'trek aan één kabel, drie bewegen mee' },
  { id: 'review', x: 232, naam: 'CLUSTER REVIEW', titel: 'CLUSTER REVIEW', onder: 'volgende voorstelling: NU' },
  { id: 'demo', x: 288, naam: 'DE DEMO', titel: 'DE DEMO', onder: 'twee knoppen, één goed antwoord' },
  { id: 'oven', x: 326, naam: 'EINDE PI', titel: 'DE VALUE OVEN', onder: 'wat komt eruit?' },
];

export const WERELD_EINDE = 358;
