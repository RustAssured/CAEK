/* CAEK — Cupcaek, het zusje.
 *
 * Zij deelt het skelet van Caek en SuperCaek (24 botten, identieke namen), dus
 * ze gebruikt dezelfde loader en zou desgewenst ook zijn ren- en sprongclips
 * kunnen draaien. Zelf heeft ze idle en lopen, en meer heeft een sidekick niet
 * nodig.
 *
 * Cupcaek doet drie dingen: meelopen, commentaar leveren, en op precies de
 * juiste momenten midden op het pad gaan staan.
 *
 * Laadt haar model niet, dan valt ze terug op een opbouw uit primitieven. Dat
 * is geen luxe: zonder die terugval is een mislukte download een zwart gat in
 * het beeld in plaats van een lelijk maar werkend zusje.
 */

import * as THREE from 'three';
import { PALET, verf, gezichtTextuur } from '../world/materialen.js';
import { bol, cilinder, doos, vlak } from '../world/props.js';
import { laadKarakter } from './caek.js';

/** Iets kleiner dan Caek (2.0) — ze is het zusje. */
export const CUPCAEK_HOOGTE = 1.78;

/** Ze kijkt net als Caek driekwart naar de camera, gespiegeld op looprichting. */
const DRAAI = Math.PI / 2 * 0.72;

export async function laadCupcaek(url = './assets/cupcaek.glb') {
  try {
    return await laadKarakter(url, CUPCAEK_HOOGTE);
  } catch (fout) {
    console.warn('Cupcaek-model niet geladen, placeholder gebruikt:', fout.message);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Terugval: Cupcaek uit primitieven
 * ------------------------------------------------------------------ */

function maakPlaceholder() {
  const groep = new THREE.Group();

  const vormpje = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.32, 0.72, 16, 1),
    verf(PALET.rozeDiep, { emissief: 0.25 }),
  );
  vormpje.position.y = 0.52;
  groep.add(vormpje);

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

  const kleuren = [PALET.goud, PALET.groen, PALET.blauwLicht, PALET.room, PALET.oranje];
  for (let i = 0; i < 16; i++) {
    const korrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 3, 5), verf(kleuren[i % kleuren.length], { emissief: 0.6 }));
    const a = Math.random() * Math.PI * 2;
    const r = 0.18 + Math.random() * 0.34;
    korrel.position.set(Math.cos(a) * r, 1.22 + Math.random() * 0.2, Math.sin(a) * r);
    korrel.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    groep.add(korrel);
  }

  const strik = new THREE.Group();
  for (const zijde of [-1, 1]) {
    const lus = bol(0.17, PALET.rozeDiep, { emissief: 0.4 });
    lus.scale.set(1.3, 1, 0.6);
    lus.position.x = zijde * 0.2;
    strik.add(lus);
  }
  strik.add(bol(0.1, PALET.rozeDiep, { emissief: 0.5 }));
  strik.position.set(0.3, 1.5, 0.18);
  strik.rotation.z = 0.3;
  groep.add(strik);

  const gezicht = vlak(0.8, 0.8, new THREE.MeshBasicMaterial({
    map: gezichtTextuur('blij'), transparent: true, depthWrite: false,
  }));
  gezicht.position.set(0, 1.10, 0.66);
  gezicht.renderOrder = 4;
  groep.add(gezicht);
  groep.userData.gezicht = gezicht;

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

/* ------------------------------------------------------------------ */

export class Cupcaek {
  /**
   * @param {object|null} model  resultaat van laadCupcaek(), of null
   * @param {object} [opties]    `{ poppetje }` -- een SpritePoppetje
   */
  constructor(model = null, { poppetje = null } = {}) {
    this.groep = new THREE.Group();
    this.draaier = new THREE.Group();
    this.groep.add(this.draaier);

    this.poppetje = poppetje;
    this.model = model;
    if (poppetje) {
      this.draaier.add(poppetje.groep);
    } else if (model) {
      this.draaier.add(model.wortel);
      this.mixer = new THREE.AnimationMixer(model.wortel);
      this.acties = {};
      for (const [naam, clip] of Object.entries(model.clips)) {
        this.acties[naam] = this.mixer.clipAction(clip);
      }
      this.huidigeActie = null;
      this.speel('idle');
    } else {
      this.placeholder = maakPlaceholder();
      this.placeholder.userData.placeholder = true;
      this.draaier.add(this.placeholder);
    }

    this.positie = new THREE.Vector3(0, 0, 0.6);
    this.klok = 0;
    this.blokkeert = null;     // x-positie waar ze niemand doorlaat
    this.volgAfstand = -2.1;
    this.snelheidX = 0;
    this.doelDraai = DRAAI;
    this.stemming = 'blij';
  }

  /**
   * Zusje als getekende sprite.
   *
   * Ze volgt dezelfde logica als de 3D-versie -- meelopen, blokkeren, naar de
   * speler kijken -- maar spiegelt in plaats van te draaien.
   */
  #updateSprite(dt, speler) {
    const doel = this.blokkeert !== null ? this.blokkeert : speler.x + this.volgAfstand * speler.kijkt;
    const vorige = this.positie.x;
    this.positie.x += (doel - this.positie.x) * Math.min(1, dt * 3.2);
    this.snelheidX = (this.positie.x - vorige) / Math.max(dt, 1e-4);

    if (speler.opGrond) this.vloerY = speler.y;
    const doelY = this.vloerY ?? 0;
    this.positie.y += (doelY - this.positie.y) * Math.min(1, dt * 4.5);

    const kijkt = Math.abs(this.snelheidX) > 0.6
      ? Math.sign(this.snelheidX)
      : Math.sign(speler.x - this.positie.x || 1);

    this.poppetje.update(dt, {
      snelheidX: this.snelheidX,
      snelheidY: 0,
      opGrond: true,
      kijkt,
    });
    this.groep.position.set(this.positie.x, this.positie.y, this.positie.z);
  }

  speel(naam, vervaging = 0.2) {
    if (this.poppetje) { this.poppetje.speel(naam); return; }
    const actie = this.acties?.[naam];
    if (!actie || this.huidigeActie === actie) return;
    actie.reset().setEffectiveWeight(1).fadeIn(vervaging).play();
    if (this.huidigeActie) this.huidigeActie.fadeOut(vervaging);
    this.huidigeActie = actie;
  }

  /**
   * 'blij' | 'verbaasd' | 'streng' | 'boos' | 'knipoog' | 'slaapt'
   *
   * Met het echte model zit het gezicht in de textuur, dus dit stuurt geen
   * mimiek meer aan maar lichaamstaal: hoe ze staat zegt genoeg. Op de
   * placeholder wisselt het nog wel het getekende gezicht.
   */
  gezicht(naam) {
    this.stemming = naam;
    const mesh = this.placeholder?.userData.gezicht;
    if (!mesh) return;
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
    if (this.poppetje) { this.#updateSprite(dt, speler); return; }

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

    // kijkrichting: mee met de looprichting, of naar de speler toe als ze wacht
    const kijkt = rent ? Math.sign(this.snelheidX) : Math.sign(speler.x - this.positie.x || 1);
    this.doelDraai = DRAAI * kijkt;
    this.draaier.rotation.y += (this.doelDraai - this.draaier.rotation.y) * Math.min(1, dt * 9);

    if (this.mixer) {
      this.speel(rent ? 'lopen' : 'idle');
      if (this.acties.lopen) {
        this.acties.lopen.timeScale = THREE.MathUtils.clamp(Math.abs(this.snelheidX) / 2.6, 0.7, 1.8);
      }
      // strenge Cupcaek staat net iets rechter op
      const kanteling = this.stemming === 'streng' ? 0.0 : -this.snelheidX * 0.02;
      this.groep.rotation.z += (kanteling - this.groep.rotation.z) * Math.min(1, dt * 6);
      this.mixer.update(dt);
      this.groep.position.set(this.positie.x, this.positie.y, this.positie.z);
      return;
    }

    // --- terugval: de placeholder wordt met de hand geanimeerd ---
    if (!this.placeholder) { this.groep.position.set(this.positie.x, this.positie.y, this.positie.z); return; }
    const hup = rent ? Math.abs(Math.sin(this.klok * 11)) * 0.19 : Math.sin(this.klok * 2.1) * 0.045;
    this.groep.position.set(this.positie.x, this.positie.y + hup, this.positie.z);
    this.groep.rotation.z = -this.snelheidX * 0.02;

    const benen = this.placeholder.userData.benen;
    const fase = this.klok * (rent ? 13 : 3);
    benen[0].rotation.x = Math.sin(fase) * (rent ? 0.9 : 0.08);
    benen[1].rotation.x = Math.sin(fase + Math.PI) * (rent ? 0.9 : 0.08);
    const armen = this.placeholder.userData.armen;
    armen[0].rotation.x = Math.sin(fase + Math.PI) * (rent ? 0.7 : 0.12);
    armen[1].rotation.x = Math.sin(fase) * (rent ? 0.7 : 0.12);
  }
}
