/* CAEK — bouwstenen van de wereld.
 *
 * Alles is opgebouwd uit primitieven. Dat is geen armoede maar opzet: de
 * Kuwahara-filter slikt fijne details toch op, en dikke simpele vormen met
 * harde kleurvlakken zijn precies wat de olieverf-pipeline mooi maakt. */

import * as THREE from 'three';
import { PALET, verf, gloed, maskeer, maskeerEigen, tekstTextuur, emojiTextuur } from './materialen.js';

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

/** Een looppad. Geeft de mesh terug; de collider maakt level.js zelf. */
export function platform(breedte, dikte = 0.9, kleur = PALET.steen, { top = PALET.blauwLicht } = {}) {
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

/* ------------------------------------------------------------------ *
 * Borden en tekst
 * ------------------------------------------------------------------ */

export function bord(regels, {
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
  const tex = tekstTextuur(tekst, {
    breedte: 512, hoogte: 160, kleur, grootte,
    achtergrond: plaat ? 'rgba(11,22,64,.72)' : 'geen',
    rand: plaat ? 'rgba(245,178,41,.9)' : 'geen',
    randDikte: 8,
  });
  // Ondoorzichtig met een alphaTest in plaats van transparant: alleen dan kan
  // het alfakanaal het verfmasker dragen, en tekst die je niet kunt lezen is
  // erger dan een randje aliasing. De verf smeert dat randje toch weer glad.
  const materiaal = new THREE.MeshBasicMaterial({
    map: tex, transparent: false, alphaTest: 0.4, depthWrite: false,
  });
  maskeer(materiaal, 0.06);
  const m = vlak(breedte, breedte * 160 / 512, materiaal);
  m.renderOrder = 5;
  return m;
}

/* ------------------------------------------------------------------ *
 * De ovens
 * ------------------------------------------------------------------ */

export function oven(schaal = 1, { tekst = 'OVEN', gloedKleur = PALET.oranje } = {}) {
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

  const naambord = label(tekst, { breedte: 6 });
  naambord.position.set(0, 7.6, 2.2);
  groep.add(naambord);

  groep.scale.setScalar(schaal);
  return groep;
}

/* ------------------------------------------------------------------ *
 * Het Doelenwiel in 3D — de visuele ruggengraat van de game
 * ------------------------------------------------------------------ */

export function doelenwiel(doelen, actiefId, straal = 4) {
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

export function demotafel(kleur = PALET.blauwLicht) {
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

export function scherm(breedte = 9, hoogte = 5) {
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

export function deur(regels, breedte = 3, hoogte = 4.6) {
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

  // het oventje waar hun cadans aan af te lezen is
  const oventje = doos(0.9, 0.9, 0.7, PALET.blauw, { plat: true });
  oventje.position.set(-1.5, 0.45, 0);
  groep.add(oventje);
  const lampje = bol(0.16, PALET.oranje, { emissief: 1.4 });
  lampje.position.set(-1.5, 0.95, 0.4);
  groep.add(lampje);
  groep.userData.lampje = lampje;

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
