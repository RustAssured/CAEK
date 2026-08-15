/* CAEK — Cupcaek, het zusje.
 *
 * PLACEHOLDER MODEL. Het rigged 3D-model van Cupcaek was bij het bouwen van
 * deze slice nog onderweg; dit is een opbouw uit primitieven die de silhouet
 * uit de character sheet volgt (roze cupcake, strik, gouden laarsjes). Zodra
 * CUPCAEK_*.glb er is: run tools/build_caek_glb.py op die exports en vervang
 * `maakPlaceholder()` door een GLTF-laad zoals in caek.js — de rest van deze
 * klasse (volggedrag, blokkeren, hupjes) blijft ongewijzigd bruikbaar.
 *
 * Cupcaek doet drie dingen: meelopen, commentaar leveren, en op precies de
 * juiste momenten midden op het pad gaan staan. */

import * as THREE from 'three';
import { PALET, verf, gezichtTextuur } from '../world/materialen.js';
import { bol, cilinder, doos, vlak } from '../world/props.js';

function maakPlaceholder() {
  const groep = new THREE.Group();

  const vormpje = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.32, 0.72, 16, 1),
    verf(PALET.rozeDiep, { emissief: 0.25 }),
  );
  vormpje.position.y = 0.52;
  groep.add(vormpje);

  // ribbels van het papieren vormpje
  for (let i = 0; i < 12; i++) {
    const rib = doos(0.05, 0.7, 0.06, PALET.roze);
    const a = (i / 12) * Math.PI * 2;
    rib.position.set(Math.cos(a) * 0.42, 0.52, Math.sin(a) * 0.42);
    rib.lookAt(0, 0.52, 0);
    groep.add(rib);
  }

  const glazuur = bol(0.56, PALET.roze, { emissief: 0.35 });
  glazuur.scale.y *= 0.86;
  glazuur.position.y = 1.06;
  groep.add(glazuur);

  const topje = bol(0.3, PALET.roze, { emissief: 0.4 });
  topje.position.y = 1.42;
  groep.add(topje);

  // hagelslag op het glazuur
  const kleuren = [PALET.goud, PALET.groen, PALET.blauwLicht, PALET.room, PALET.oranje];
  for (let i = 0; i < 16; i++) {
    const korrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 3, 5), verf(kleuren[i % kleuren.length], { emissief: 0.6 }));
    const a = Math.random() * Math.PI * 2;
    const r = 0.18 + Math.random() * 0.34;
    korrel.position.set(Math.cos(a) * r, 1.22 + Math.random() * 0.2, Math.sin(a) * r);
    korrel.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    groep.add(korrel);
  }

  // strik
  const strik = new THREE.Group();
  for (const zijde of [-1, 1]) {
    const lus = bol(0.17, PALET.rozeDiep, { emissief: 0.4 });
    lus.scale.set(1.3, 1, 0.6);
    lus.position.x = zijde * 0.2;
    strik.add(lus);
  }
  const knoop = bol(0.1, PALET.rozeDiep, { emissief: 0.5 });
  strik.add(knoop);
  strik.position.set(0.3, 1.5, 0.18);
  strik.rotation.z = 0.3;
  groep.add(strik);

  // gezicht — getekend, want een emoji verdwijnt in de olieverf
  const gezicht = vlak(0.8, 0.8, new THREE.MeshBasicMaterial({
    map: gezichtTextuur('blij'), transparent: true, depthWrite: false,
  }));
  gezicht.position.set(0, 1.12, 0.5);
  gezicht.renderOrder = 4;
  groep.add(gezicht);
  groep.userData.gezicht = gezicht;

  // beentjes en laarsjes
  const benen = [];
  for (const zijde of [-1, 1]) {
    const been = new THREE.Group();
    const pijp = cilinder(0.075, 0.42, PALET.rozeDiep);
    pijp.position.y = -0.21;
    been.add(pijp);
    const laars = doos(0.26, 0.18, 0.36, PALET.roze, { emissief: 0.3 });
    laars.position.set(0, -0.48, 0.06);
    been.add(laars);
    been.position.set(zijde * 0.19, 0.5, 0);
    groep.add(been);
    benen.push(been);
  }
  groep.userData.benen = benen;

  // armpjes
  const armen = [];
  for (const zijde of [-1, 1]) {
    const arm = cilinder(0.06, 0.42, PALET.rozeDiep);
    arm.position.set(zijde * 0.52, 1.0, 0.1);
    arm.rotation.z = zijde * 0.6;
    groep.add(arm);
    armen.push(arm);
  }
  groep.userData.armen = armen;

  return groep;
}

export class Cupcaek {
  constructor() {
    this.groep = maakPlaceholder();
    this.groep.userData.placeholder = true;
    this.positie = new THREE.Vector3(0, 0, 0.6);
    this.klok = 0;
    this.doelX = 0;
    this.blokkeert = null;     // x-positie waar ze niemand doorlaat
    this.volgAfstand = -2.1;
    this.snelheidX = 0;
  }

  /** 'blij' | 'verbaasd' | 'streng' | 'boos' | 'knipoog' | 'slaapt' */
  gezicht(naam) {
    const mesh = this.groep.userData.gezicht;
    mesh.material.map?.dispose();
    mesh.material.map = gezichtTextuur(naam);
    mesh.material.needsUpdate = true;
  }

  /** Ga op x staan en laat de speler er niet voorbij. */
  blokkeer(x) {
    this.blokkeert = x;
  }

  laatDoor() {
    this.blokkeert = null;
  }

  update(dt, speler) {
    this.klok += dt;

    const doel = this.blokkeert !== null ? this.blokkeert : speler.x + this.volgAfstand * speler.kijkt;
    const vorige = this.positie.x;
    this.positie.x += (doel - this.positie.x) * Math.min(1, dt * 3.2);
    this.snelheidX = (this.positie.x - vorige) / Math.max(dt, 1e-4);

    // Ze volgt de vloerhoogte van de speler, niet zijn sprongen — anders
    // zweeft ze mee de lucht in.
    if (speler.opGrond) this.vloerY = speler.y;
    const doelY = this.vloerY ?? 0;
    this.positie.y += (doelY - this.positie.y) * Math.min(1, dt * 4.5);

    const rent = Math.abs(this.snelheidX) > 0.6;
    const hup = rent ? Math.abs(Math.sin(this.klok * 11)) * 0.19 : Math.sin(this.klok * 2.1) * 0.045;
    this.groep.position.set(this.positie.x, this.positie.y + hup, this.positie.z);
    this.groep.rotation.z = -this.snelheidX * 0.02;
    this.groep.rotation.y = Math.abs(this.snelheidX) > 0.2 ? Math.sign(this.snelheidX) * 0.4 : 0;

    const benen = this.groep.userData.benen;
    const fase = this.klok * (rent ? 13 : 3);
    benen[0].rotation.x = Math.sin(fase) * (rent ? 0.9 : 0.08);
    benen[1].rotation.x = Math.sin(fase + Math.PI) * (rent ? 0.9 : 0.08);
    const armen = this.groep.userData.armen;
    armen[0].rotation.x = Math.sin(fase + Math.PI) * (rent ? 0.7 : 0.12);
    armen[1].rotation.x = Math.sin(fase) * (rent ? 0.7 : 0.12);
  }
}
