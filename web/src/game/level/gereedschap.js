/* CAEK — gedeeld gereedschap voor de levelbouwers.
 *
 * Wat op meer dan één plek in de wereld voorkomt staat hier, zodat de vier
 * sprints en de vier Cluster Reviews niet ieder hun eigen variant krijgen. */

import * as THREE from 'three';
import * as props from '../../world/props.js';
import { PALET, verf, gloed } from '../../world/materialen.js';
import { SECTIES, WAARDE } from '../../config.js';

/** x-positie waar een sectie begint. */
export const bij = (id) => SECTIES.find((s) => s.id === id).x;

/** Volledige sectie-omschrijving, inclusief lengte en sprintdoel. */
export const sectie = (id) => SECTIES.find((s) => s.id === id);

/* ------------------------------------------------------------------ *
 * Gouden lijnen
 * ------------------------------------------------------------------ */

const OMHOOG = new THREE.Vector3(0, 1, 0);

/**
 * Een gloeiende lijn van A naar B.
 *
 * Dit is de belangrijkste visuele taal van het spel: alles wat waarde heeft
 * loopt zichtbaar terug naar een segment van het Doelenwiel. Eén lijn is een
 * teamdoel; een bundel is een cluster dat dezelfde kant op trekt.
 */
export function gouddraad(van, naar, { dikte = 0.06, kleur = PALET.goudLicht, sterkte = 1.7 } = {}) {
  const lijn = new THREE.Mesh(new THREE.CylinderGeometry(dikte, dikte, 1, 5), gloed(kleur, sterkte));
  richtLijn(lijn, van, naar);
  return lijn;
}

/** Zet een eenheidscilinder tussen twee punten. */
export function richtLijn(lijn, van, naar) {
  const richting = naar.clone().sub(van);
  lijn.position.copy(van).add(naar).multiplyScalar(0.5);
  lijn.scale.y = Math.max(1e-3, richting.length());
  lijn.quaternion.setFromUnitVectors(OMHOOG, richting.normalize());
  return lijn;
}

/**
 * Laat een gouden lijn in een halve seconde "aangroeien" van A naar B.
 * Geeft de mesh terug; de groei loopt via level.tik().
 */
export function trekDraad(level, van, naar, opties = {}) {
  const lijn = gouddraad(van, naar, opties);
  level.scene.add(lijn);
  let t = 0;
  const duur = opties.duur ?? 0.55;
  level.tik((dt) => {
    t += dt;
    const f = Math.min(1, t / duur);
    richtLijn(lijn, van, van.clone().lerp(naar, f * f * (3 - 2 * f)));
    return t < duur;
  });
  return lijn;
}

/* ------------------------------------------------------------------ *
 * Publiek
 * ------------------------------------------------------------------ */

/**
 * Een rij toeschouwers vóór het podium.
 *
 * Ze zitten met opzet aan de kant van de speler en niet achter een muur: dat
 * de stakeholders ín het cluster zitten is precies het punt.
 */
export function zetPubliek(level, { x, aantal = 14, breedte = 26, z = 4.0, label = null }) {
  const plaat = props.TEX.publiek;
  const hoofden = plaat
    ? geschilderdPubliek(level, x, breedte, z)
    : bollenPubliek(level, x, aantal, breedte, z);

  if (label) {
    // Klein en aan de kant. Een banner van negen meter vlak voor de camera
    // dekt de halve zaal af, en juist die zaal is het punt.
    const bordje = props.label(label, { breedte: 5.4, grootte: 44, plaat: true });
    level.plaats(bordje, x - breedte / 2 - 1.5, 2.6, z + 1.2);
  }
  return hoofden;
}

/* Eén geschilderde strook in plaats van tweeëndertig bollen per zaal. Het
 * publiek zit met opzet aan de kant van de speler en niet achter een muur:
 * dat de stakeholders ín het cluster zitten is precies het punt. */
function geschilderdPubliek(level, x, breedte, z) {
  /* Het publiek zit tússen de camera en het podium, dus het staat er dicht
   * op en wordt makkelijk te groot. Op vijf eenheden per herhaling zijn de
   * koppen ongeveer op mensmaat, en de onderrand ligt laag genoeg dat de
   * straat en de voeten van de karakters zichtbaar blijven -- die zaal is het
   * punt, niet de achterhoofden ervoor. */
  const beeld = props.TEX.publiek.image;
  const verhouding = beeld ? beeld.height / beeld.width : 0.5;
  const tegel = 5.2;
  const hoogte = tegel * verhouding;
  const bodem = -1.55;

  const textuur = props.TEX.publiek.clone();
  textuur.needsUpdate = true;
  textuur.wrapS = THREE.RepeatWrapping;
  textuur.repeat.set(breedte / tegel, 1);

  const materiaal = new THREE.MeshBasicMaterial({
    map: textuur, transparent: false, alphaTest: 0.4, toneMapped: false,
  });
  const vlak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materiaal);
  vlak.scale.set(breedte, hoogte, 1);
  level.plaats(vlak, x, bodem + hoogte / 2, z + 1.6);

  // Meedeinen doet de hele rij tegelijk; slapen zakt hem weg.
  level.tik((dt, speler, s) => {
    const slaapt = s.vlaggen.publiekSlaapt;
    vlak.position.y = bodem + hoogte / 2 - (slaapt ? 0.22 : 0)
      + Math.sin(s.klok * (slaapt ? 0.8 : 2.3)) * (slaapt ? 0.02 : 0.05);
  });
  return [vlak];
}

function bollenPubliek(level, x, aantal, breedte, z) {
  const hoofden = [];
  for (let i = 0; i < aantal; i++) {
    const rij = i % 2;
    const kleur = [PALET.toast, PALET.roze, PALET.room, PALET.goud][i % 4];
    const hoofd = props.bol(0.4, kleur, { emissief: 0.1 });
    const hx = x - breedte / 2 + (i / Math.max(1, aantal - 1)) * breedte;
    level.plaats(hoofd, hx, 0.95 + rij * 0.16, z + rij * 1.8);
    hoofden.push(hoofd);

    const romp = props.doos(0.64, 0.85, 0.46, kleur === PALET.room ? PALET.blauwLicht : PALET.blauw, { emissief: 0.1 });
    level.plaats(romp, hx, 0.45 + rij * 0.16, z + rij * 1.8);
  }
  level.tik((dt, speler, s) => {
    for (let i = 0; i < hoofden.length; i++) {
      const slaapt = s.vlaggen.publiekSlaapt;
      hoofden[i].position.y = (slaapt ? 0.66 : 0.95 + (i % 2) * 0.16)
        + Math.sin(s.klok * (slaapt ? 0.8 : 2.3) + i * 0.7) * (slaapt ? 0.03 : 0.07);
    }
  });
  return hoofden;
}

/* ------------------------------------------------------------------ *
 * Kleine chaos die op meer plekken voorkomt
 * ------------------------------------------------------------------ */

/** BAU: een lopende band met broodjes die niet stopt. */
export function bauBand(level, x, { lengte = 16, hoogte = 5.6 } = {}) {
  const band = props.lopendeBand(lengte);
  level.plaats(band, x + lengte / 2, hoogte, -1);
  level.plaats(props.bord('BAU', { breedte: 2.2, hoogte: 1.2, grootte: 64 }), x - 2, hoogte - 1.2, 1.4);

  const broodjes = [];
  for (let i = 0; i < Math.round(lengte / 2.4); i++) {
    const b = props.broodje();
    level.plaats(b, x + i * 2.4, hoogte + 0.5, -1);
    broodjes.push(b);
  }
  level.tik((dt, speler) => {
    for (const b of broodjes) {
      b.position.x -= dt * 5.5;
      b.rotation.x -= dt * 6;
      if (b.position.x < x) b.position.x = x + lengte;
      // een broodje op je kop: geen schade, wel oponthoud
      if (Math.abs(b.position.x - speler.x) < 0.9 && Math.abs(speler.y + 2 - b.position.y) < 1.2) {
        speler.snelheid.x *= 0.4;
      }
    }
  });
  return broodjes;
}

/** Impediment: een stokbrood dwars over de weg dat pas weggaat als je het ziet. */
export function impediment(level, x) {
  const blokkade = props.stokbrood(7);
  blokkade.rotation.z = Math.PI / 2;
  level.plaats(blokkade, x, 3.4, 0.4);
  const muur = level.voegMuur(x - 0.8, x + 0.8, 0, 7);

  level.interactie({
    x: x - 1.8, y: 1.6, straal: 2.8,
    label: 'maak het impediment zichtbaar',
    async doe(s) {
      s.geluid.klik();
      const vlaggetje = props.doos(1.4, 0.9, 0.08, PALET.rood, { emissief: 0.6 });
      vlaggetje.position.set(x, 5.4, 0.6);
      level.scene.add(vlaggetje);
      await s.dialoog.scene([
        ['cupcaek', 'Heb je al geprobeerd hem zichtbaar te maken?'],
        ['verteller', 'Caek zet er een enorm rood vlaggetje op. Er komt een kraan aan.'],
      ]);
      blokkade.visible = false;
      vlaggetje.visible = false;
      muur.x0 = -999;
      muur.x1 = -999;
      s.geefValue(WAARDE.impediment, 'IMPEDIMENT WEGGEHAALD');
    },
  });
  return muur;
}

/** Technical debt: een dichtgekoekte broodrooster. */
export function technicalDebt(level, x, z = 1.2) {
  const rooster = props.broodrooster();
  level.plaats(rooster, x, 0, z);
  level.plaats(props.label('TECHNICAL DEBT', { breedte: 3.6, grootte: 44, plaat: true }), x, 2.9, z);
  level.interactie({
    x, y: 1.2, straal: 2.6,
    label: 'de aanslag eraf halen',
    async doe(s) {
      s.vlaggen.debtOpgelost = true;
      s.geluid.pak();
      rooster.children.forEach((k) => { if (k.material?.color?.getHex() === PALET.korst) k.visible = false; });
      s.geefValue(WAARDE.technicalDebt, 'TECHNICAL DEBT OPGERUIMD');
      await s.dialoog.zeg('cupcaek', 'Scheelt straks brandende toast.');
    },
  });
}

/** Kort overleg: een deur met 15 MIN erop waar je 1:15 later uitkomt. */
export function kortOverleg(level, x) {
  const deur = props.deur(['KORT OVERLEG', '15 MIN'], 3, 4.6);
  level.plaats(deur, x, 0, -1.4);
  level.interactie({
    x, y: 1.6, straal: 2.6,
    label: 'even kort overleggen',
    async doe(s) {
      s.geluid.deur();
      s.bevries(true);
      for (const t of ['15 min', '30 min', '45 min', '1:15']) {
        await s.dialoog.zeg('verteller', t, { wacht: 0.55 });
      }
      await s.paneel.melding('KORT OVERLEG — 15 MIN', 'De uitgang gaat pas open na een besluit.', 'BESLUIT');
      s.vlaggen.overlegGehad = true;
      s.geefValue(WAARDE.besluit, 'BESLUIT GENOMEN');
      s.bevries(false);
      await s.dialoog.zeg('cupcaek', 'Dat had ook een besluit van vijf minuten kunnen zijn.');
    },
  });
}

/** Vraagsturen: een bord waar oud en nieuw werk tegen elkaar aan duwen. Decor. */
export function vraagsturen(level, x) {
  const groep = new THREE.Group();
  const paal = props.doos(0.3, 4.4, 0.3, PALET.korst);
  paal.position.y = 2.2;
  groep.add(paal);

  const oud = props.doos(3.0, 2.0, 0.2, PALET.steen, { emissief: 0.2 });
  oud.position.set(-1.7, 3.2, 0.2);
  oud.rotation.z = 0.08;
  groep.add(oud);
  const nieuw = props.doos(3.0, 2.0, 0.2, PALET.goud, { emissief: 0.35 });
  nieuw.position.set(1.7, 3.2, 0.2);
  nieuw.rotation.z = -0.08;
  groep.add(nieuw);

  const oudTekst = props.label('OUD', { breedte: 2.4, grootte: 54 });
  oudTekst.position.set(-1.7, 3.2, 0.4);
  groep.add(oudTekst);
  const nieuwTekst = props.label('NIEUW', { breedte: 2.4, grootte: 54, kleur: '#0b1640' });
  nieuwTekst.position.set(1.7, 3.2, 0.4);
  groep.add(nieuwTekst);

  const kop = props.label('VRAAGSTUREN', { breedte: 4.6, grootte: 48, plaat: true });
  kop.position.set(0, 5.0, 0.4);
  groep.add(kop);

  level.plaats(groep, x, 0, -2.2);
  // ze duwen tegen elkaar aan, eeuwig, zonder winnaar
  level.tik((dt, speler, s) => {
    const d = Math.sin(s.klok * 1.3) * 0.22;
    oud.position.x = -1.7 + d;
    nieuw.position.x = 1.7 + d;
  });
  return groep;
}

/** Een oventje dat pingt. Geeft de mesh terug zodat de cadans eraan kan. */
export function pingOven(level, x, z, tekst, schaal = 0.55) {
  const o = props.oven(schaal, { tekst });
  level.plaats(o, x, 0, z);
  level.tik((dt, speler, s) => {
    o.userData.gloeien(PALET.oranje, 1.2 + Math.sin(s.klok * 2.4) * 0.45);
  });
  laatRoken(level, o, `oven${x}`);
  return o;
}

/**
 * Laat de pijp van een oven roken.
 *
 * Rook doet twee dingen tegelijk. Ze verraadt dat er iets stáát te gebeuren --
 * een oven zonder rook is meubilair -- en ze geeft de lucht diepte, want een
 * pluim die langzaam wegdrijft laat je zien hoe ver weg iets staat. Precies
 * wat een 2.5D-wereld nodig heeft.
 *
 * De plek wordt elke tik opnieuw uitgelezen: ovens worden geplaatst nadat ze
 * gebouwd zijn, en sommige staan op een platform dat later nog schuift.
 */
export function laatRoken(level, oven, sleutel, { tempo = 1.5 } = {}) {
  const punt = oven.userData?.schoorsteen;
  if (!punt) return;
  const plek = new THREE.Vector3();
  const maat = oven.userData.hoogte ? oven.scale.x : 1;
  level.tik((dt, speler, s) => {
    if (!s.deeltjes) return;
    punt.getWorldPosition(plek);
    s.deeltjes.pluim(sleutel, dt, plek.x, plek.y, plek.z, {
      tempo, spreiding: 0.4 * maat, omhoog: 1.1 + maat * 0.5,
    });
  });
}

export { props, PALET, verf, gloed };
