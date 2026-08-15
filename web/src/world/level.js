/* CAEK — de levelbouwer.
 *
 * Geen Blender-export maar een declaratieve bouwer: de secties in
 * game/secties.js schrijven hun wereld met deze API. Dat leest prettiger dan
 * named empties uit een GLB en je kunt een sectie verplaatsen door één getal
 * te wijzigen.
 *
 * Alles is 2.5D: colliders zijn platte rechthoeken in het XY-vlak, de derde
 * dimensie is puur decor. */

import * as THREE from 'three';
import { PALET } from './materialen.js';
import * as props from './props.js';
import { WERELD_EINDE } from '../config.js';

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.vloeren = [];       // { x0, x1, y }
    this.muren = [];         // { x0, x1, y0, y1, doorSuper?, geraakt? }
    this.interacties = [];   // { x, y, straal, label, doe, eenmalig, klaar }
    this.verzamelbaar = [];  // idem, maar zonder knop
    this.zones = [];         // { x0, x1, doe, eenmalig, klaar }
    this.checkpoints = [];   // { x, y, naam, geraakt }
    this.tikkers = [];       // per-frame callbacks
    this.eindeX = WERELD_EINDE;
  }

  /* ---------------- colliders ---------------- */

  voegVloer(x0, x1, y) {
    const v = { x0, x1, y };
    this.vloeren.push(v);
    return v;
  }

  voegMuur(x0, x1, y0, y1, opties = {}) {
    const m = { x0, x1, y0, y1, ...opties };
    this.muren.push(m);
    return m;
  }

  /* ---------------- bouwstenen ---------------- */

  /** Doorlopende grond met een dikke sokkel eronder. */
  grond(x0, x1, y = 0, kleur = PALET.steen) {
    const breedte = x1 - x0;
    const g = props.platform(breedte, 1.2, kleur);
    g.position.set((x0 + x1) / 2, y, 0);
    this.scene.add(g);
    // sokkel tot ver onder beeld, zodat er geen gat onder de wereld gaapt
    const sokkel = props.doos(breedte, 26, 3.4, PALET.blauwDiep, { emissief: 0.04 });
    sokkel.position.set((x0 + x1) / 2, y - 13.6, -0.4);
    this.scene.add(sokkel);
    this.voegVloer(x0, x1, y);
    return g;
  }

  /** Zwevend platform. */
  platform(x, y, breedte = 4, kleur = PALET.steen) {
    const p = props.platform(breedte, 0.9, kleur);
    p.position.set(x, y, 0);
    this.scene.add(p);
    this.voegVloer(x - breedte / 2, x + breedte / 2, y);
    return p;
  }

  /** Object neerzetten zonder collider. */
  plaats(object, x, y = 0, z = 0) {
    object.position.set(x, y, z);
    this.scene.add(object);
    return object;
  }

  /* ---------------- interactie ---------------- */

  /**
   * Iets waar `E` boven verschijnt.
   * @param {{x:number,y?:number,straal?:number,label:string,doe:Function,eenmalig?:boolean}} opties
   */
  interactie(opties) {
    const i = { y: 1, straal: 2.4, eenmalig: true, klaar: false, actief: true, ...opties };
    this.interacties.push(i);
    return i;
  }

  /** Iets dat je oppakt door er langs te lopen. */
  pickup(opties) {
    const p = { straal: 1.5, klaar: false, ...opties };
    this.verzamelbaar.push(p);
    return p;
  }

  /** Onzichtbare trigger over een x-bereik. */
  zone(x0, x1, doe, eenmalig = true) {
    const z = { x0, x1, doe, eenmalig, klaar: false };
    this.zones.push(z);
    return z;
  }

  checkpoint(x, y, naam) {
    const c = { x, y, naam, geraakt: false };
    this.checkpoints.push(c);

    // een klein baken zodat je ziet waar je terugkomt
    const paal = props.cilinder(0.12, 2.6, PALET.goud, { emissief: 0.5 });
    paal.position.set(x, y + 1.3, -0.8);
    this.scene.add(paal);
    const vlag = props.doos(1.2, 0.7, 0.08, PALET.rood, { emissief: 0.4 });
    vlag.position.set(x + 0.66, y + 2.3, -0.8);
    this.scene.add(vlag);
    c.vlag = vlag;
    return c;
  }

  tik(fn) {
    this.tikkers.push(fn);
  }

  /* ---------------- lopende update ---------------- */

  update(dt, speler, spel) {
    // een tikker die false teruggeeft is klaar en verdwijnt
    let opschonen = false;
    const lijst = this.tikkers.slice();
    for (const fn of lijst) {
      if (fn(dt, speler, spel) === false) { fn.klaar = true; opschonen = true; }
    }
    if (opschonen) this.tikkers = this.tikkers.filter((f) => !f.klaar);

    for (const p of this.verzamelbaar) {
      if (p.klaar) continue;
      const dx = speler.x - p.x;
      const dy = speler.y + 1 - (p.y ?? 1);
      if (dx * dx + dy * dy < p.straal * p.straal) {
        p.klaar = true;
        p.doe(spel);
      }
    }

    for (const z of this.zones) {
      if (z.klaar) continue;
      if (speler.x >= z.x0 && speler.x <= z.x1) {
        if (z.eenmalig) z.klaar = true;
        z.doe(spel);
      }
    }

    for (const c of this.checkpoints) {
      if (c.geraakt || speler.x < c.x) continue;
      c.geraakt = true;
      speler.zetCheckpoint(c.x, c.y);
      if (c.vlag) {
        c.vlag.material = c.vlag.material.clone();
        c.vlag.material.color.setHex(0x63a844);
        c.vlag.material.emissive.setHex(0x2f5a1f);
      }
      spel.checkpointGehaald?.(c);
    }
  }

  /** Dichtstbijzijnde bruikbare interactie, of null. */
  dichtsteInteractie(speler) {
    let beste = null;
    let besteAfstand = Infinity;
    for (const i of this.interacties) {
      if (i.klaar || !i.actief) continue;
      const dx = speler.x - i.x;
      const dy = speler.y + 1 - i.y;
      const d = dx * dx + dy * dy;
      if (d < i.straal * i.straal && d < besteAfstand) {
        beste = i;
        besteAfstand = d;
      }
    }
    return beste;
  }
}

/** Sfeerlicht dat bij de hele wereld hoort. */
export function zetLicht(scene) {
  const hemel = new THREE.HemisphereLight(0x6f9bff, 0xf5b229, 1.55);
  scene.add(hemel);

  const zon = new THREE.DirectionalLight(0xffe6b0, 1.5);
  zon.position.set(-9, 14, 10);
  scene.add(zon);

  const tegenlicht = new THREE.DirectionalLight(0x4a7bff, 0.75);
  tegenlicht.position.set(11, 5, -8);
  scene.add(tegenlicht);

  scene.add(new THREE.AmbientLight(0x2b3f80, 0.7));
  scene.fog = new THREE.Fog(0x0d1b4c, 34, 96);
  return { hemel, zon, tegenlicht };
}
