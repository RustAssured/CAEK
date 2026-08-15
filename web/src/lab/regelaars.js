/* CAEK — de schuifregelaars van het lab.
 *
 * Eén schema beschrijft elke knop: waar hij in STIJL zit, zijn bereik, en
 * één regel uitleg in gewone taal. Een knop toevoegen is één regel erbij. */

const S = (pad, label, min, max, stap, uitleg) => ({ soort: 'schuif', pad, label, min, max, stap, uitleg });

export const REGELAARS = [
  {
    groep: 'Penseelstreken',
    open: true,
    items: [
      { soort: 'schakelaar', pad: '@streken', label: 'Streken als geometrie', uitleg: 'Uit = alleen de Kuwahara-filter, zoals de eerste versie.' },
      S('streken.dekking', 'Dekking', 0.2, 1, 0.01, 'Hoeveel verf één haal afgeeft. Laag = doorschijnend, je ziet de lagen eronder.'),
      S('streken.haren', 'Borstelharen', 0, 1, 0.01, 'Hoe sterk losse haren in de haal doorkomen.'),
      S('streken.hoekRuis', 'Eigenwijsheid', 0, 1.6, 0.01, 'Hoeveel een haal van het flowveld mag afwijken. Nul leest als een kam.'),
      S('streken.randKrimp', 'Krimp bij randen', 0, 24, 0.5, 'Hoe klein halen worden vlak bij een contour. Hoger houdt kleine dingen — zoals Caek — herkenbaar.'),
      S('streken.krimpBodem', 'Bodem onder de krimp', 0.1, 1, 0.02, 'Hoe klein een haal maximaal mag worden. Te laag en de krimp knijpt ook in de lucht; dan doet de streeklengte niets meer.'),
      S('streken.anisotropie', 'Volgt het veld', 0, 1, 0.01, 'Langere halen waar de richting eenduidig is, kortere waar het rommelig is.'),
      S('streken.basisHoogte', 'Onderschildering', 0, 1, 0.01, 'Dikte van de laag onder de halen. Voorkomt gaten.'),
    ],
  },
  {
    groep: 'Kleur per haal',
    open: true,
    items: [
      S('streken.tintRuis', 'Tintvariatie', 0, 0.2, 0.002, 'Verschil in tint tussen naburige halen. Zonder dit leest een vlak als plastic.'),
      S('streken.waardeRuis', 'Helderheidsvariatie', 0, 1, 0.01),
      S('streken.kleurSpreiding', 'Kleur van ernaast', 0, 4, 0.05, 'Een haal haalt zijn kleur een stukje naast zichzelf op, zodat buren verschillen.'),
      S('streken.vonken', 'Complementaire vonken', 0, 1, 0.02, 'De oranje spikkels in het blauw. Sparen: te veel wordt confetti.'),
      S('streken.wervel', 'Wervels in vlakke vlakken', 0, 1, 0.02, 'Waar de scene vlak is zegt het flowveld niets; dit vult de lucht met krullen.'),
      S('streken.wervelSchaal', 'Wervelgrootte', 0.5, 10, 0.1, 'Lager = grotere, tragere krullen.'),
    ],
  },
  {
    groep: 'Streekmaten',
    items: [
      S('streken.lagen.0.lengte', 'Grof — lengte', 0.005, 0.12, 0.001, 'Als fractie van de beeldhoogte, dus onafhankelijk van het scherm.'),
      S('streken.lagen.0.breedte', 'Grof — breedte', 0.002, 0.05, 0.0005),
      S('streken.lagen.0.dichtheid', 'Grof — dichtheid', 0.3, 3.5, 0.05, 'Meer streken kost fillrate. Kijk naar de fps hieronder.'),
      S('streken.lagen.0.detail', 'Grof — alleen op vormen', 0, 1, 0.01, '0 = overal, 1 = alleen waar contouren zitten. De grondlaag wil je op 0.'),
      S('streken.lagen.1.lengte', 'Midden — lengte', 0.004, 0.06, 0.001),
      S('streken.lagen.1.breedte', 'Midden — breedte', 0.001, 0.02, 0.0002),
      S('streken.lagen.1.dichtheid', 'Midden — dichtheid', 0.3, 3.5, 0.05),
      S('streken.lagen.1.detail', 'Midden — alleen op vormen', 0, 1, 0.01),
      S('streken.lagen.2.lengte', 'Fijn — lengte', 0.002, 0.03, 0.0005, 'De detaillaag; die maakt gezichten en tekst weer leesbaar.'),
      S('streken.lagen.2.breedte', 'Fijn — breedte', 0.0005, 0.01, 0.0001),
      S('streken.lagen.2.dichtheid', 'Fijn — dichtheid', 0, 3, 0.05),
      S('streken.lagen.2.detail', 'Fijn — alleen op vormen', 0, 1, 0.01, 'Hoog houden: anders dekt het fijne penseel je lucht af.'),
    ],
  },
  {
    groep: 'Kuwahara (het beeld eronder)',
    items: [
      { soort: 'schuifUniform', doel: 'kuwahara', uniform: 'uStraal', label: 'Kernelstraal', min: 0, max: 12, stap: 0.25, uitleg: 'Hoe grof de kleurvlakken worden voordat er halen op gaan. Duurste knop van de hele keten.' },
      S('alfa', 'Excentriciteit', 0.2, 3, 0.05, 'Hoe langgerekt de filterellips meedraait met het veld. Hoger = ronder.'),
      S('scherpte', 'Scherpte (q)', 1, 20, 0.5, 'Hoe hard de scherpste sector wint. Hoger = strakkere randen.'),
    ],
  },
  {
    groep: 'Reliëf en licht',
    items: [
      { soort: 'schuifUniform', doel: 'finale', uniform: 'uImpasto', label: 'Impasto', min: 0, max: 2, stap: 0.02, uitleg: 'Strijklicht over de verfdikte. Met streken aan is die dikte echt.' },
      S('korrel', 'Korrel', 0, 0.4, 0.005, 'Doekstructuur en borstelharen in het reliëf.'),
      { soort: 'schuifUniform', doel: 'finale', uniform: 'uLic', label: 'Uitsmeren (LIC)', min: 0, max: 8, stap: 1, uitleg: 'Smeert langs het veld. Met streken aan meestal 0 — de halen doen dit al.' },
    ],
  },
  {
    groep: 'Kleur',
    items: [
      S('warmte', 'Split-toning', 0, 1.5, 0.02, 'Blauw in de schaduwen, goud in het licht. Het UWV-palet.'),
      S('schaduwKleur', 'Kleur in de schaduw', 0, 0.3, 0.005, 'Houdt de diepste plekken violet in plaats van dood zwart.'),
      S('belichting', 'Belichting', 0.4, 2.2, 0.02),
      S('vignet', 'Vignet', 0, 1.2, 0.02),
    ],
  },
  {
    groep: 'SuperCaek',
    items: [
      { soort: 'schuifUniform', doel: 'finale', uniform: 'uSuper', label: 'Comicmodus', min: 0, max: 1, stap: 0.01, uitleg: 'Crossfade naar het comicpad. Dit is exact wat in de game gebeurt bij de transformatie.' },
    ],
  },
];

/* ------------------------------------------------------------------ */

function lees(object, pad) {
  return pad.split('.').reduce((o, k) => o?.[k], object);
}

function schrijf(object, pad, waarde) {
  const delen = pad.split('.');
  const laatste = delen.pop();
  const doel = delen.reduce((o, k) => o?.[k], object);
  if (doel) doel[laatste] = waarde;
}

function toonWaarde(v) {
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * @param {HTMLElement} houder
 * @param {object} stijl        het STIJL-object, wordt ter plekke aangepast
 * @param {Function} bijWijziging
 * @param {import('../render/composer.js').Schilder} schilder
 */
export function bouwRegelaars(houder, stijl, bijWijziging, schilder) {
  for (const groep of REGELAARS) {
    const details = document.createElement('details');
    details.className = 'groep';
    details.open = !!groep.open;
    const summary = document.createElement('summary');
    summary.textContent = groep.groep;
    details.appendChild(summary);
    const doos = document.createElement('div');
    details.appendChild(doos);

    for (const item of groep.items) {
      doos.appendChild(maakItem(item, stijl, bijWijziging, schilder));
    }
    houder.appendChild(details);
  }
}

function maakItem(item, stijl, bijWijziging, schilder) {
  const rij = document.createElement('div');
  rij.className = 'regelaar';

  if (item.soort === 'schakelaar') {
    rij.classList.add('schakelaar');
    const invoer = document.createElement('input');
    invoer.type = 'checkbox';
    invoer.checked = schilder.strekenAan;
    const label = document.createElement('label');
    label.textContent = item.label;
    invoer.addEventListener('change', () => { schilder.strekenAan = invoer.checked; });
    rij.append(invoer, label);
    if (item.uitleg) rij.appendChild(uitlegRegel(item.uitleg));
    return rij;
  }

  const label = document.createElement('label');
  label.textContent = item.label;
  const uit = document.createElement('output');
  const invoer = document.createElement('input');
  invoer.type = 'range';
  invoer.min = item.min;
  invoer.max = item.max;
  invoer.step = item.stap;

  const isUniform = item.soort === 'schuifUniform';
  const huidige = isUniform
    ? schilder[item.doel].materiaal.uniforms[item.uniform].value
    : lees(stijl, item.pad);

  invoer.value = huidige ?? item.min;
  uit.textContent = toonWaarde(Number(invoer.value));

  invoer.addEventListener('input', () => {
    const v = Number(invoer.value);
    uit.textContent = toonWaarde(v);
    if (isUniform) {
      schilder[item.doel].materiaal.uniforms[item.uniform].value = v;
    } else {
      schrijf(stijl, item.pad, v);
      bijWijziging();
    }
  });

  rij.append(label, uit, invoer);
  if (item.uitleg) rij.appendChild(uitlegRegel(item.uitleg));
  return rij;
}

function uitlegRegel(tekst) {
  const p = document.createElement('p');
  p.className = 'uitleg';
  p.textContent = tekst;
  return p;
}

/** De huidige stijl als plakbaar JS-blok voor render/composer.js. */
export function alsJs(stijl) {
  const getal = (v) => (Number.isInteger(v) ? `${v}` : String(Number(v.toFixed(5))));
  const lagen = stijl.streken.lagen
    .map((l) => `      { lengte: ${getal(l.lengte)}, breedte: ${getal(l.breedte)}, dichtheid: ${getal(l.dichtheid)}, detail: ${getal(l.detail ?? 0)} },`)
    .join('\n');

  return `export const STIJL = {
  alfa: ${getal(stijl.alfa)},
  scherpte: ${getal(stijl.scherpte)},
  korrel: ${getal(stijl.korrel)},
  warmte: ${getal(stijl.warmte)},
  vignet: ${getal(stijl.vignet)},
  belichting: ${getal(stijl.belichting)},

  streken: {
    dekking: ${getal(stijl.streken.dekking)},
    haren: ${getal(stijl.streken.haren)},
    hoogte: ${getal(stijl.streken.hoogte)},
    hoekRuis: ${getal(stijl.streken.hoekRuis)},
    randKrimp: ${getal(stijl.streken.randKrimp)},
    krimpBodem: ${getal(stijl.streken.krimpBodem)},
    anisotropie: ${getal(stijl.streken.anisotropie)},
    basisHoogte: ${getal(stijl.streken.basisHoogte)},
    maxPerLaag: ${stijl.streken.maxPerLaag},
    tintRuis: ${getal(stijl.streken.tintRuis)},
    waardeRuis: ${getal(stijl.streken.waardeRuis)},
    kleurSpreiding: ${getal(stijl.streken.kleurSpreiding)},
    vonken: ${getal(stijl.streken.vonken)},
    wervel: ${getal(stijl.streken.wervel)},
    wervelSchaal: ${getal(stijl.streken.wervelSchaal)},
    lagen: [
${lagen}
    ],
  },
};`;
}
