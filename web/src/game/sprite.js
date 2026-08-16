/* CAEK — karakters als getekende 2D-sprites in de 2.5D-wereld.
 *
 * De hele renderketen is gebouwd voor dikke simpele vormen met harde
 * kleurvlakken. Dat is precies wat een getekende sprite ís, en precies wat een
 * automatisch gerigde 3D-mesh niet is. Een slappe rig valt niet weg te
 * filteren; een tekening klopt of klopt niet, en dat bepaal jij.
 *
 * ------------------------------------------------------------------
 * WAT JE AANLEVERT
 * ------------------------------------------------------------------
 *
 * Eén PNG per animatie, frames naast elkaar in een horizontale strip,
 * transparante achtergrond, karakter kijkt naar rechts, voeten op de
 * onderrand van het frame.
 *
 *   web/assets/sprites/caek_idle_3.png
 *   web/assets/sprites/caek_lopen_6.png
 *   web/assets/sprites/caek_springen_2.png
 *   web/assets/sprites/cupcaek_idle_2.png
 *   ...
 *
 * Het getal achter de laatste underscore is het aantal frames. Staat er geen
 * getal, dan gokt de loader op vierkante frames (breedte / hoogte). Eén enkel
 * plaatje zonder getal werkt dus ook gewoon: dat wordt een animatie van één
 * frame, en de procedurele beweging hieronder doet de rest.
 *
 * Dat is met opzet zo slordig-tolerant: je levert wat je hebt, en het systeem
 * past zich aan in plaats van andersom.
 *
 * ------------------------------------------------------------------
 * WAT DE CODE ERBIJ DOET
 * ------------------------------------------------------------------
 *
 * Ook met één frame per animatie beweegt een karakter: deinen, meeleunen in
 * de looprichting, indrukken bij de landing, uitrekken in de sprong. In een
 * geschilderde stijl leest dat verrassend levend, en het is hoe veel
 * handgemaakte games het doen. Meer frames maken het beter, maar niets is
 * verplicht. */

import * as THREE from 'three';
import { maskeer } from '../world/materialen.js';
import { SPRITE } from '../config.js';

const lader = new THREE.TextureLoader();

/* ------------------------------------------------------------------ *
 * Een spriteblad inladen
 * ------------------------------------------------------------------ */

/** Haalt het aantal frames uit de bestandsnaam: caek_lopen_6.png -> 6. */
function framesUitNaam(url) {
  const m = /_(\d+)\.(png|webp|jpg|jpeg)$/i.exec(url);
  return m ? Math.max(1, parseInt(m[1], 10)) : 0;
}

/**
 * @param {string} url
 * @param {number} [framesOverschrijving]
 * @returns {Promise<{textuur: THREE.Texture, frames: number, verhouding: number}>}
 */
export async function laadBlad(url, framesOverschrijving = 0) {
  const textuur = await lader.loadAsync(url);
  textuur.colorSpace = THREE.SRGBColorSpace;
  textuur.magFilter = THREE.LinearFilter;
  textuur.minFilter = THREE.LinearMipmapLinearFilter;
  textuur.wrapS = THREE.ClampToEdgeWrapping;
  textuur.wrapT = THREE.ClampToEdgeWrapping;

  const b = textuur.image.width;
  const h = textuur.image.height;
  const frames = framesOverschrijving || framesUitNaam(url) || Math.max(1, Math.round(b / h));

  textuur.repeat.set(1 / frames, 1);
  return { textuur, frames, verhouding: (b / frames) / h };
}

/* ------------------------------------------------------------------ *
 * Terugval: een getekend poppetje op canvas
 * ------------------------------------------------------------------ */

/* Zolang de echte tekeningen er niet zijn moet het spel wel te spelen zijn.
 * Dit is met opzet duidelijk een plaatshouder -- je moet in één oogopslag
 * zien dat hier nog een tekening hoort te komen. */
function maakPlaatshouder(soort, frames = 3) {
  const F = 256;
  const doek = document.createElement('canvas');
  doek.width = F * frames;
  doek.height = F;
  const c = doek.getContext('2d');

  const stijlen = {
    caek: { lijf: '#e0a544', rand: '#8a5a12', accent: '#fdf3d8', naam: 'CAEK' },
    supercaek: { lijf: '#bcd6ff', rand: '#3f63c9', accent: '#ffd873', naam: 'SUPER' },
    cupcaek: { lijf: '#f2799f', rand: '#c85a80', accent: '#fdf3d8', naam: 'CUP' },
  };
  const s = stijlen[soort] || stijlen.caek;

  for (let f = 0; f < frames; f++) {
    const ox = f * F;
    const fase = (f / frames) * Math.PI * 2;
    c.save();
    c.translate(ox, 0);

    // benen, uit fase per frame
    c.strokeStyle = s.rand;
    c.lineWidth = 16;
    c.lineCap = 'round';
    for (const [i, zijde] of [[0, -1], [1, 1]].entries()) {
      const zwaai = Math.sin(fase + i * Math.PI) * 22;
      c.beginPath();
      c.moveTo(128 + zijde * 26, 190);
      c.lineTo(128 + zijde * 26 + zwaai, 238);
      c.stroke();
    }

    // romp
    c.fillStyle = s.lijf;
    c.strokeStyle = s.rand;
    c.lineWidth = 10;
    c.beginPath();
    if (soort === 'cupcaek') {
      c.moveTo(58, 190); c.lineTo(78, 118);
      c.quadraticCurveTo(128, 42, 178, 118);
      c.lineTo(198, 190);
    } else {
      c.moveTo(62, 190); c.lineTo(62, 108);
      c.quadraticCurveTo(62, 48, 102, 52);
      c.quadraticCurveTo(128, 20, 154, 52);
      c.quadraticCurveTo(194, 48, 194, 108);
      c.lineTo(194, 190);
    }
    c.closePath();
    c.fill();
    c.stroke();

    // ogen en mond
    c.fillStyle = '#141a33';
    for (const dx of [-28, 28]) {
      c.beginPath();
      c.ellipse(128 + dx, 118, 12, 15, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#141a33';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(128, 138, 26, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();

    // plaatshouder-stempel: dit hoort vervangen te worden
    c.fillStyle = s.accent;
    c.font = 'bold 26px sans-serif';
    c.textAlign = 'center';
    c.fillText(s.naam, 128, 34);
    c.font = 'bold 15px sans-serif';
    c.globalAlpha = 0.7;
    c.fillText('plaatshouder', 128, 252);
    c.globalAlpha = 1;
    c.restore();
  }

  const textuur = new THREE.CanvasTexture(doek);
  textuur.colorSpace = THREE.SRGBColorSpace;
  textuur.magFilter = THREE.LinearFilter;
  textuur.minFilter = THREE.LinearMipmapLinearFilter;
  textuur.repeat.set(1 / frames, 1);
  return { textuur, frames, verhouding: 1, plaatshouder: true };
}

/* ------------------------------------------------------------------ *
 * Alle bladen van één karakter
 * ------------------------------------------------------------------ */

/**
 * Laadt alles wat er is en verzint de rest.
 *
 * Ontbreekt een animatie, dan wordt er een bestaande voor gebruikt: liever
 * Caek die staat te lopen tijdens een sprong dan een gat in het beeld.
 */
export async function laadSprites(soort) {
  const opzet = SPRITE.karakters[soort] || {};
  const bladen = {};

  await Promise.all(Object.entries(opzet.animaties || {}).map(async ([naam, pad]) => {
    try {
      bladen[naam] = await laadBlad(`${SPRITE.map}${pad}`);
    } catch {
      /* stilzwijgend: de terugval hieronder vangt het op */
    }
  }));

  if (!Object.keys(bladen).length) {
    console.info(`CAEK: geen sprites voor "${soort}" gevonden, plaatshouder gebruikt`);
    bladen.idle = maakPlaatshouder(soort, 1);
    bladen.lopen = maakPlaatshouder(soort, 3);
  }
  return { soort, bladen, hoogte: opzet.hoogte ?? SPRITE.hoogte };
}

/* ------------------------------------------------------------------ *
 * Het poppetje zelf
 * ------------------------------------------------------------------ */

/** Snelheid per animatie in frames per seconde. */
const TEMPO = { idle: 4, lopen: 10, rennen: 14, springen: 8 };

export class SpritePoppetje {
  /** @param {{soort: string, bladen: object, hoogte: number}} sprites */
  constructor(sprites) {
    this.sprites = sprites;
    this.groep = new THREE.Group();

    // MeshBasicMaterial: de tekening is de tekening, daar hoort geen
    // scenebelichting overheen. alphaTest in plaats van transparant, want
    // alleen dan kan het alfakanaal het verfmasker dragen -- en met masker
    // 0.02 blijft het karakter scherp in een wereld vol olieverf.
    this.materiaal = new THREE.MeshBasicMaterial({
      transparent: false,
      alphaTest: 0.45,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    maskeer(this.materiaal, 0.02);

    this.vlak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.materiaal);
    this.vlak.frustumCulled = false;
    this.groep.add(this.vlak);

    this.huidige = null;
    this.frame = 0;
    this.klok = 0;
    this.kijkt = 1;
    this.rek = 1;          // 1 = normaal, <1 ingedrukt, >1 uitgerekt
    this.doelRek = 1;
    this.speel('idle');
  }

  /** Welk blad er nu draait. Onbekende naam valt terug op wat er wél is. */
  speel(naam) {
    const bladen = this.sprites.bladen;
    const blad = bladen[naam]
      || (naam === 'rennen' && bladen.lopen)
      || (naam === 'springen' && (bladen.lopen || bladen.idle))
      || bladen.idle
      || Object.values(bladen)[0];
    if (!blad || this.huidigNaam === naam) return;

    this.huidigNaam = naam;
    this.huidige = blad;
    this.frame = 0;
    this.klok = 0;
    this.materiaal.map = blad.textuur;
    this.materiaal.needsUpdate = true;
    this.#zetMaat();
  }

  #zetMaat() {
    const h = this.sprites.hoogte;
    this.vlak.scale.set(h * (this.huidige?.verhouding ?? 1), h, 1);
    this.vlak.position.y = h / 2;
  }

  /** Een tik van de landing: het poppetje veert door. */
  stuiter(kracht = 0.72) {
    this.rek = kracht;
    this.doelRek = 1;
  }

  /**
   * @param {number} dt
   * @param {{snelheidX: number, snelheidY: number, opGrond: boolean, kijkt: number, bevroren?: boolean}} staat
   */
  update(dt, staat) {
    this.klok += dt;

    // welke animatie
    const snel = Math.abs(staat.snelheidX);
    let naam = 'idle';
    if (!staat.opGrond) naam = 'springen';
    else if (snel > 5.4) naam = 'rennen';
    else if (snel > 0.5) naam = 'lopen';
    this.speel(naam);

    // frame doorschuiven; loopsnelheid schaalt mee met hoe hard je gaat
    const blad = this.huidige;
    if (blad && blad.frames > 1) {
      let fps = TEMPO[this.huidigNaam] ?? 8;
      if (this.huidigNaam === 'lopen' || this.huidigNaam === 'rennen') {
        fps *= THREE.MathUtils.clamp(snel / 5.0, 0.55, 1.9);
      }
      this.frame = Math.floor(this.klok * fps) % blad.frames;
      blad.textuur.offset.x = this.frame / blad.frames;
    }

    // kijkrichting: spiegelen in plaats van draaien, dan blijft de tekening
    // de tekening en zie je hem nooit op zijn kant
    if (staat.kijkt) this.kijkt = staat.kijkt;

    /* ---- procedurele beweging bovenop de frames ---- */

    // deinen: in rust rustig, tijdens lopen op de pas
    const deinAmp = staat.opGrond ? (snel > 0.5 ? 0.045 : 0.018) : 0;
    const deinTempo = snel > 0.5 ? 9.5 : 2.2;
    const dein = Math.sin(this.klok * deinTempo) * deinAmp;

    // in de lucht uitrekken bij het stijgen, indrukken bij het vallen
    if (!staat.opGrond) {
      this.doelRek = 1 + THREE.MathUtils.clamp(staat.snelheidY * 0.008, -0.10, 0.14);
    } else if (Math.abs(this.rek - 1) < 0.01) {
      this.doelRek = 1;
    }
    this.rek += (this.doelRek - this.rek) * Math.min(1, dt * 12);

    // meeleunen in de looprichting
    const leun = THREE.MathUtils.clamp(-staat.snelheidX * 0.016, -0.16, 0.16);
    this.groep.rotation.z += (leun - this.groep.rotation.z) * Math.min(1, dt * 8);

    const h = this.sprites.hoogte;
    const breed = h * (blad?.verhouding ?? 1);
    // volumebehoud: wat je uitrekt wordt smaller, en andersom
    this.vlak.scale.set(this.kijkt * breed / this.rek, h * this.rek, 1);
    this.vlak.position.y = (h * this.rek) / 2 + dein;
  }

  /** Wissel naar het spriteblad van een ander karakter (SuperCaek). */
  wisselSprites(sprites) {
    this.sprites = sprites;
    this.huidigNaam = null;
    this.speel('idle');
  }

  dispose() {
    this.vlak.geometry.dispose();
    this.materiaal.dispose();
  }
}
