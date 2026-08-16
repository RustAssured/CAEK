/* CAEK — Scope Creep.
 *
 * Begint als een piepklein schattig deegbolletje. Elk niet-noodzakelijk
 * ingrediënt dat je oppakt eet hij op, en dan groeit hij. Vechten helpt niet;
 * de enige oplossing is bij het bord je mand leegmaken.
 *
 * Hij is een grap, geen tegenstander. Daarom groeit hij traag, houdt hij op
 * met groeien voor hij het beeld vult, en laat hij je na een hap ruim met
 * rust. Een running gag die je echt begint te irriteren is geen running gag
 * meer. */

import * as THREE from 'three';
import { emojiTextuur } from '../world/materialen.js';
import { bol, vlak, label } from '../world/props.js';

const GEZICHTEN = ['🥟', '😊', '😃', '😈', '👹'];

export class ScopeCreep {
  constructor() {
    this.groep = new THREE.Group();

    this.deeg = bol(0.5, 0xe8c98a, { emissief: 0.2, plat: true });
    this.groep.add(this.deeg);

    this.knobbels = [];
    for (let i = 0; i < 7; i++) {
      const k = bol(0.2 + Math.random() * 0.16, 0xdfbb78, { emissief: 0.15, plat: true });
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI;
      k.position.set(Math.sin(b) * Math.cos(a) * 0.42, Math.sin(b) * Math.sin(a) * 0.42, Math.cos(b) * 0.42);
      this.groep.add(k);
      this.knobbels.push(k);
    }

    this.gezicht = vlak(0.8, 0.8, new THREE.MeshBasicMaterial({
      map: emojiTextuur(GEZICHTEN[0]), transparent: true, depthWrite: false,
    }));
    this.gezicht.position.z = 0.52;
    this.gezicht.renderOrder = 4;
    this.groep.add(this.gezicht);

    this.bordje = label('Kan dit er ook nog bij?', { breedte: 3.4, grootte: 40 });
    this.bordje.position.y = 1.0;
    this.groep.add(this.bordje);

    this.gegeten = 0;
    this.x = -40;
    this.y = 0;
    this.grootte = 0.55;
    this.doelGrootte = 0.55;
    this.actief = false;
    this.klok = 0;
    this.afkoeling = 0;
    this.groep.visible = false;
  }

  wakker(x, y) {
    this.x = x;
    this.y = y;
    this.actief = true;
    this.groep.visible = true;
  }

  eet() {
    this.gegeten++;
    // afvlakkende groei met een plafond: hij wordt duidelijk groter, maar
    // nooit zo groot dat hij het level in de weg staat
    this.doelGrootte = Math.min(1.55, 0.5 + Math.sqrt(this.gegeten) * 0.42);
    const idx = Math.min(GEZICHTEN.length - 1, this.gegeten);
    this.gezicht.material.map?.dispose();
    this.gezicht.material.map = emojiTextuur(GEZICHTEN[idx]);
    this.gezicht.material.needsUpdate = true;
    this.bordje.visible = this.gegeten < 2;
  }

  krimp() {
    this.gegeten = 0;
    this.doelGrootte = 0.3;
    this.gezicht.material.map?.dispose();
    this.gezicht.material.map = emojiTextuur('😳');
    this.gezicht.material.needsUpdate = true;
    this.bordje.visible = false;
    this.wegrollen = true;
  }

  update(dt, speler) {
    if (!this.actief) return;
    this.klok += dt;
    this.afkoeling = Math.max(0, this.afkoeling - dt);
    this.grootte += (this.doelGrootte - this.grootte) * Math.min(1, dt * 3);

    if (this.wegrollen) {
      this.x -= dt * 9;
      this.doelGrootte = Math.max(0.06, this.doelGrootte - dt * 0.25);
      if (this.x < speler.x - 40) { this.actief = false; this.groep.visible = false; }
    } else {
      // hij haalt je nooit in als je doorloopt — hij haalt je in als je treuzelt
      // hij loopt altijd trager dan jij (loopSnelheid 7.6), ook volgegeten
      const snelheid = 2.0 + Math.min(1.6, this.gegeten * 0.35);
      this.x += Math.sign(speler.x - this.x) * Math.min(snelheid * dt, Math.abs(speler.x - this.x));
      this.y += (speler.y - this.y) * Math.min(1, dt * 2);
    }

    this.groep.scale.setScalar(this.grootte / 0.5);
    this.groep.position.set(this.x, this.y + this.grootte, 0.2);
    this.groep.rotation.z -= dt * 2.2 * Math.sign(speler.x - this.x || 1);
    this.gezicht.rotation.z = -this.groep.rotation.z;
    this.bordje.rotation.z = -this.groep.rotation.z;
    for (let i = 0; i < this.knobbels.length; i++) {
      this.knobbels[i].position.multiplyScalar(1 + Math.sin(this.klok * 3 + i) * 0.002);
    }
  }

  /** Raakt hij de speler? Dan pikt hij iets uit de mand. */
  raaktSpeler(speler) {
    if (this.wegrollen || this.afkoeling > 0 || !this.actief) return false;
    const dx = Math.abs(speler.x - this.x);
    const dy = Math.abs((speler.y + 1) - (this.y + this.grootte));
    if (dx < this.grootte * 0.7 + 0.35 && dy < this.grootte + 0.9) {
      this.afkoeling = 4.0;
      return true;
    }
    return false;
  }
}
