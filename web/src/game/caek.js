/* CAEK — de speler.
 *
 * Het model komt uit web/assets/caek.glb (gebouwd door tools/build_caek_glb.py
 * uit de losse exports in assets/). Vier clips: idle, lopen, rennen, springen.
 *
 * Natuurkunde is met opzet met de hand geschreven: een 2.5D platformer heeft
 * geen physics-engine nodig, en zo houden we de besturing precies zo vergevend
 * als deze doelgroep verdient (coyote-tijd, sprongbuffer, geen instant dood). */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NATUURKUNDE as N, SUPERCAEK } from '../config.js';
import { PALET } from '../world/materialen.js';

const DOEL_HOOGTE = N.spelerHoogte;
/** Hoever Caek naar de kijker toe blijft draaien; puur 90 graden leest als
 *  een profiel en dan zie je zijn gezicht niet meer. */
const DRAAI = Math.PI / 2 * 0.72;

/**
 * Laadt een karakter-GLB, meet hem op en schaalt hem naar `doelHoogte`.
 *
 * Caek, Cupcaek en SuperCaek delen exact hetzelfde skelet — 24 botten met
 * identieke namen — dus deze loader werkt voor alle drie, en een clip van de
 * één kan het skelet van de ander aansturen.
 */
export async function laadKarakter(url, doelHoogte = DOEL_HOOGTE) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const wortel = gltf.scene;

  let skin = null;
  wortel.traverse((o) => {
    if (o.isSkinnedMesh && !skin) skin = o;
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = false;

    // De export komt binnen als metalness 1 met een witte emissive: het model
    // is dan feitelijk unlit en reageert nergens op. Voor de olieverf willen
    // we juist licht en schaduw op hem, want daar leeft het flowveld van.
    const m = o.material;
    if (m && 'metalness' in m) {
      m.metalness = 0;
      m.roughness = 0.85;
      m.emissiveIntensity = 0.42;
      m.needsUpdate = true;
    }
  });
  if (!skin) throw new Error('caek.glb bevat geen skinned mesh');

  // Bij deze rig heffen de inverse bind matrices de 0.01-schaal van de
  // Armature precies op, dus de geometrie-bounds staan al in wereldmaat.
  // Voor de zekerheid meten we ook het skelet en nemen we de grootste.
  skin.geometry.computeBoundingBox();
  const geoBox = skin.geometry.boundingBox.clone();
  const botBox = new THREE.Box3();
  const p = new THREE.Vector3();
  wortel.updateMatrixWorld(true);
  for (const bot of skin.skeleton.bones) botBox.expandByPoint(p.setFromMatrixPosition(bot.matrixWorld));

  const gemetenHoogte = Math.max(geoBox.max.y - geoBox.min.y, botBox.max.y - botBox.min.y);
  const schaal = gemetenHoogte > 1e-4 ? doelHoogte / gemetenHoogte : 1;

  const clips = {};
  for (const clip of gltf.animations) clips[clip.name] = clip;

  // De bindpose zegt waar de voeten *zouden* staan, niet waar ze in de
  // animatie staan. Bij Caek is dat hetzelfde, bij Cupcaek scheelt het ruim
  // anderhalve meter: haar clips dragen een roottranslatie mee. Dus meten we
  // de zakking van de rustclip erbij, anders hangt ze onder de vloer.
  const zakking = meetZakking(wortel, skin, clips, botBox.min.y);
  const voetOffset = Math.min(geoBox.min.y, botBox.min.y) + zakking;

  wortel.scale.setScalar(schaal);
  wortel.position.y = -voetOffset * schaal;

  return { wortel, skin, clips, schaal, gemetenHoogte, zakking };
}

/**
 * Hoeveel het laagste bot in de rustclip onder de bindpose zakt.
 *
 * We nemen het minimum over een hele cyclus: dat is het moment waarop de voet
 * de grond raakt, en precies dáár wil je de vloer hebben. De sprongclip doet
 * niet mee -- die verlaat de grond met opzet.
 */
function meetZakking(wortel, skin, clips, bindBodem) {
  const clip = clips.idle || clips.bind || clips.lopen || clips.rennen;
  if (!clip || clip.duration <= 0) return 0;

  const botten = skin.skeleton.bones;
  const bewaard = botten.map((b) => ({
    p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone(),
  }));

  const mixer = new THREE.AnimationMixer(wortel);
  const actie = mixer.clipAction(clip);
  actie.play();

  const stappen = 24;
  const stap = clip.duration / stappen;
  const p = new THREE.Vector3();
  let bodem = Infinity;
  for (let i = 0; i <= stappen; i++) {
    mixer.setTime(i * stap);
    wortel.updateMatrixWorld(true);
    for (const bot of botten) bodem = Math.min(bodem, p.setFromMatrixPosition(bot.matrixWorld).y);
  }

  actie.stop();
  mixer.uncacheRoot(wortel);
  botten.forEach((b, i) => {
    b.position.copy(bewaard[i].p);
    b.quaternion.copy(bewaard[i].q);
    b.scale.copy(bewaard[i].s);
  });
  wortel.updateMatrixWorld(true);

  return Number.isFinite(bodem) ? bodem - bindBodem : 0;
}

/** Caek zelf, op spelerhoogte. */
export const laadCaek = (url) => laadKarakter(url, DOEL_HOOGTE);

export class Caek {
  /**
   * @param {{wortel: THREE.Object3D, skin: THREE.SkinnedMesh, clips: object}} model
   * @param {import('../world/level.js').Level} level
   */
  constructor(model, level, geluid) {
    this.level = level;
    this.geluid = geluid;

    this.groep = new THREE.Group();       // wereldpositie (voeten op y)
    this.draaier = new THREE.Group();     // kijkrichting
    this.draaier.add(model.wortel);
    this.groep.add(this.draaier);

    this.model = model;
    this.mixer = new THREE.AnimationMixer(model.wortel);
    this.acties = {};
    for (const [naam, clip] of Object.entries(model.clips)) {
      const actie = this.mixer.clipAction(clip);
      this.acties[naam] = actie;
    }
    if (this.acties.springen) {
      this.acties.springen.loop = THREE.LoopOnce;
      this.acties.springen.clampWhenFinished = true;
    }
    this.huidigeActie = null;
    this.speel('idle');

    this.positie = new THREE.Vector3(2, 1, 0);
    this.snelheid = new THREE.Vector3();
    this.opGrond = false;
    this.kijkt = 1;
    this.doelDraai = DRAAI;
    this.coyote = 0;
    this.buffer = 0;
    this.checkpoint = new THREE.Vector3(2, 1, 0);
    this.bevroren = false;
    this.superTijd = 0;
    this.superActief = false;
    this.onbeweeglijkTot = 0;
    this.klok = 0;

    this.#maakCape();
  }

  #maakCape() {
    const geo = new THREE.PlaneGeometry(1.5, 1.9, 6, 8);
    const mat = new THREE.MeshLambertMaterial({
      color: PALET.rood, emissive: new THREE.Color(PALET.rood).multiplyScalar(0.4),
      side: THREE.DoubleSide,
    });
    this.cape = new THREE.Mesh(geo, mat);
    this.cape.position.set(0, DOEL_HOOGTE * 0.62, -0.42);
    this.cape.visible = false;
    this.draaier.add(this.cape);

    // originele materialen bewaren zodat de comic-tint terug kan
    this.origineleMaterialen = new Map();
    this.model.wortel.traverse((o) => {
      if (o.isMesh) this.origineleMaterialen.set(o, o.material);
    });
    // SuperCaek-tint: het blauwe pak. De emissive blijft licht — hij is
    // hiermee de helderste vlek op het doek, precies wat de comicmodus wil.
    this.superMaterialen = new Map();
    for (const [mesh, mat0] of this.origineleMaterialen) {
      const kloon = mat0.clone();
      kloon.color = new THREE.Color(0xbcd6ff);
      if (kloon.emissive) kloon.emissive = new THREE.Color(0x9ec2ff);
      kloon.emissiveIntensity = 0.95;
      this.superMaterialen.set(mesh, kloon);
    }
  }

  speel(naam, vervaging = 0.18) {
    const actie = this.acties[naam];
    if (!actie || this.huidigeActie === actie) return;
    actie.reset();
    actie.enabled = true;
    actie.setEffectiveWeight(1);
    if (naam === 'springen') actie.time = 0.42;   // sla het inzakken over
    actie.fadeIn(vervaging).play();
    if (this.huidigeActie) this.huidigeActie.fadeOut(vervaging);
    this.huidigeActie = actie;
  }

  get x() { return this.positie.x; }
  get y() { return this.positie.y; }

  /** Rechthoek in wereldcoördinaten, voeten op positie.y */
  get aabb() {
    const hb = N.spelerBreedte / 2;
    return { x0: this.positie.x - hb, x1: this.positie.x + hb, y0: this.positie.y, y1: this.positie.y + N.spelerHoogte };
  }

  zetCheckpoint(x, y) {
    this.checkpoint.set(x, y, 0);
  }

  herstel() {
    this.positie.copy(this.checkpoint);
    this.snelheid.set(0, 0, 0);
    this.opGrond = false;
  }

  startSuper() {
    this.superActief = true;
    this.superTijd = SUPERCAEK.duur;
    this.cape.visible = true;
    for (const [mesh, mat] of this.superMaterialen) mesh.material = mat;
  }

  stopSuper() {
    this.superActief = false;
    this.superTijd = 0;
    this.cape.visible = false;
    for (const [mesh, mat] of this.origineleMaterialen) mesh.material = mat;
  }

  update(dt, invoer) {
    this.klok += dt;
    const vrij = !this.bevroren && this.klok > this.onbeweeglijkTot;

    let richting = 0;
    if (vrij) {
      if (invoer.ingedrukt('links')) richting -= 1;
      if (invoer.ingedrukt('rechts')) richting += 1;
    }

    const maxSnelheid = N.loopSnelheid * (this.superActief ? SUPERCAEK.snelheidsbonus : 1);
    const versnelling = this.opGrond ? N.versnellingGrond : N.versnellingLucht;

    if (richting !== 0) {
      this.snelheid.x += richting * versnelling * dt;
      this.snelheid.x = THREE.MathUtils.clamp(this.snelheid.x, -maxSnelheid, maxSnelheid);
      this.kijkt = richting;
      this.doelDraai = DRAAI * richting;
    } else if (this.opGrond) {
      const rem = N.wrijvingGrond * dt;
      this.snelheid.x -= Math.sign(this.snelheid.x) * Math.min(Math.abs(this.snelheid.x), rem);
    }

    // springen, met coyote-tijd en buffer: vergevend genoeg voor iedereen
    this.coyote = this.opGrond ? N.coyoteTijd : Math.max(0, this.coyote - dt);
    if (vrij && invoer.gedrukt('springen')) this.buffer = N.springBuffer;
    else this.buffer = Math.max(0, this.buffer - dt);

    if (this.buffer > 0 && this.coyote > 0) {
      this.snelheid.y = N.springKracht;
      this.buffer = 0;
      this.coyote = 0;
      this.opGrond = false;
      this.geluid?.sprong();
      this.acties.springen?.reset();
      this.speel('springen', 0.08);
    }

    this.snelheid.y = Math.max(N.maxValSnelheid, this.snelheid.y + N.zwaartekracht * dt);

    this.#beweeg(dt);
    this.#animeer();

    // vloeiend naar de kijkrichting draaien
    this.draaier.rotation.y += (this.doelDraai - this.draaier.rotation.y) * Math.min(1, dt * 12);

    if (this.superActief) {
      this.superTijd -= dt;
      const t = this.klok * 9;
      const pos = this.cape.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setZ(i, Math.sin(t + y * 3.2) * 0.22 * (0.9 - y * 0.4) - Math.abs(this.snelheid.x) * 0.03);
      }
      pos.needsUpdate = true;
      if (this.superTijd <= 0) this.stopSuper();
    }

    this.mixer.update(dt);
    this.groep.position.copy(this.positie);
  }

  #beweeg(dt) {
    const hb = N.spelerBreedte / 2;

    // horizontaal
    this.positie.x += this.snelheid.x * dt;
    for (const muur of this.level.muren) {
      if (this.positie.y + N.spelerHoogte < muur.y0 || this.positie.y > muur.y1) continue;
      if (this.positie.x + hb > muur.x0 && this.positie.x - hb < muur.x1) {
        if (muur.doorSuper && this.superActief) { muur.geraakt?.(this); continue; }
        if (this.snelheid.x > 0) this.positie.x = muur.x0 - hb;
        else if (this.snelheid.x < 0) this.positie.x = muur.x1 + hb;
        this.snelheid.x = 0;
        muur.geraakt?.(this);
      }
    }
    this.positie.x = THREE.MathUtils.clamp(this.positie.x, -4, this.level.eindeX);

    // verticaal — platforms vangen alleen van bovenaf
    const vorigeY = this.positie.y;
    this.positie.y += this.snelheid.y * dt;
    this.opGrond = false;
    if (this.snelheid.y <= 0) {
      for (const vloer of this.level.vloeren) {
        if (this.positie.x + hb <= vloer.x0 || this.positie.x - hb >= vloer.x1) continue;
        if (vorigeY >= vloer.y - 0.02 && this.positie.y <= vloer.y) {
          this.positie.y = vloer.y;
          if (this.snelheid.y < -6) this.geluid?.land();
          this.snelheid.y = 0;
          this.opGrond = true;
          break;
        }
      }
    }
  }

  #animeer() {
    if (!this.opGrond) {
      this.speel('springen', 0.1);
      return;
    }
    const v = Math.abs(this.snelheid.x);
    if (v < 0.4) this.speel('idle');
    else if (v < N.rennenVanaf) {
      this.speel('lopen');
      if (this.acties.lopen) this.acties.lopen.timeScale = THREE.MathUtils.clamp(v / 3.4, 0.65, 1.5);
    } else {
      this.speel('rennen');
      if (this.acties.rennen) this.acties.rennen.timeScale = THREE.MathUtils.clamp(v / 7.0, 0.8, 1.6);
    }
  }
}
