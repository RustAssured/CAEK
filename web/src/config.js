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

/* Het Doelenwiel. Eén segment is het strategische doel van deze PI. */
export const DOELENWIEL = [
  { id: 'dienstverlening', naam: 'Dienstverlening', kleur: '#f5b229', icoon: '💛' },
  { id: 'kwaliteit', naam: 'Kwaliteit', kleur: '#63a844', icoon: '✅' },
  { id: 'teamwerk', naam: 'Teamwerk', kleur: '#3f63c9', icoon: '🤝' },
  { id: 'vertrouwen', naam: 'Vertrouwen', kleur: '#cf3a2c', icoon: '⚖️' },
  { id: 'wendbaarheid', naam: 'Wendbaarheid', kleur: '#e8721f', icoon: '⚙️' },
  { id: 'groei', naam: 'Groei', kleur: '#7a4fb5', icoon: '📈' },
];

export const PI = {
  strategisch: 'dienstverlening',
  strategischNaam: 'Dienstverlening die klopt',
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
