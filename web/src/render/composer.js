/* CAEK — de renderketen.
 *
 * Zes passes, van 3D-scene naar iets dat eruitziet alsof het met een paletmes
 * is opgelegd. De SuperCaek-modus is geen apart effect maar dezelfde keten met
 * één uniform (`uSuper`) omhoog: de hele renderer wisselt van genre.
 */

import * as THREE from 'three';
import {
  quadVertex, luchtFragment, tensorFragment, blurFragment,
  kuwaharaFragment, finaleFragment,
} from './shaders.js';
import { Streken } from './streken.js';

/** Voorinstellingen. `renderSchaal` is verreweg de grootste knop op snelheid.
 *  `streken` zet de geometrie-penselen aan; die kosten vooral fillrate. */
export const KWALITEIT = {
  hoog:   { renderSchaal: 0.88, straal: 5.0, licStappen: 0, impasto: 0.78, tensorDeling: 2, streken: true },
  midden: { renderSchaal: 0.74, straal: 3.6, licStappen: 0, impasto: 0.62, tensorDeling: 2, streken: true },
  laag:   { renderSchaal: 0.62, straal: 3.0, licStappen: 4, impasto: 0.50, tensorDeling: 2, streken: false },
  uit:    { renderSchaal: 1.00, straal: 0.0, licStappen: 0, impasto: 0.00, tensorDeling: 4, streken: false },
};

/** Vaste stijlparameters — hieraan draaien is het leukste deel van het werk.
 *  web/lab.html draait er live aan en kan het resultaat als JS teruggeven. */
export const STIJL = {
  alfa: 1.0,        // excentriciteit van de penseelellips (hoger = ronder)
  scherpte: 8.0,    // q: hoe hard de scherpste sector wint
  korrel: 0.105,    // borstelharen in het reliëf
  warmte: 0.55,     // blauw/oranje split-toning
  vignet: 0.42,
  belichting: 1.06,

  streken: {
    dekking: 0.94,       // hoeveel verf één haal afgeeft
    haren: 0.75,         // hoe sterk losse borstelharen doorkomen
    hoogte: 1.0,         // dikte van de verf, voedt het impasto
    hoekRuis: 0.5,       // hoeveel een haal van het flowveld mag afwijken
    randKrimp: 9.0,      // kleiner worden bij sterke randen; houdt silhouetten heel
    anisotropie: 0.7,    // lengte volgt de eenduidigheid van het veld
    basisHoogte: 0.3,    // hoogte van de onderschildering
    maxPerLaag: 32000,   // bovengrens per laag; het lab mag hem opzoeken

    // Maten zijn fracties van de renderhoogte, niet pixels: anders ziet
    // dezelfde instelling er op een 4K-scherm heel anders uit dan op een
    // laptop. Grof eerst, dan detail — zoals je ook echt zou schilderen.
    // `detail` = hoe sterk een laag zich beperkt tot plekken waar iets te
    // zien is. De grondlaag ligt overal, het fijne penseel alleen op vormen.
    lagen: [
      { lengte: 0.052, breedte: 0.018, dichtheid: 1.4, detail: 0 },
      { lengte: 0.024, breedte: 0.0078, dichtheid: 1.5, detail: 0.55 },
      { lengte: 0.011, breedte: 0.0034, dichtheid: 1.3, detail: 0.95 },
    ],
  },
};

const quadGeometrie = new THREE.PlaneGeometry(2, 2);

function maakQuad(fragmentShader, uniforms) {
  const materiaal = new THREE.ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(quadGeometrie, materiaal);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, materiaal };
}

function maakDoel(breedte, hoogte, type, metDiepte = false) {
  return new THREE.WebGLRenderTarget(breedte, hoogte, {
    type,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: metDiepte,
    stencilBuffer: false,
  });
}

export class Schilder {
  constructor(renderer, kwaliteit = 'hoog') {
    this.renderer = renderer;
    this.quadCamera = new THREE.Camera();
    this.breedte = 1;
    this.hoogte = 1;
    this.super = 0;
    this.flits = 0;

    const halfDrijvend = renderer.capabilities.isWebGL2 !== false;
    this.type = halfDrijvend ? THREE.HalfFloatType : THREE.UnsignedByteType;

    this.rtScene = maakDoel(1, 1, this.type, true);
    this.rtScene.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.rtT0 = maakDoel(1, 1, this.type);
    this.rtT1 = maakDoel(1, 1, this.type);
    this.rtT2 = maakDoel(1, 1, this.type);
    this.rtVerf = maakDoel(1, 1, this.type);

    this.lucht = maakQuad(luchtFragment, {
      uTijd: { value: 0 },
      uPan: { value: new THREE.Vector2() },
      uAspect: { value: 1.777 },
      uSuper: { value: 0 },
    });

    this.tensor = maakQuad(tensorFragment, {
      uBron: { value: null },
      uPixel: { value: new THREE.Vector2() },
    });

    this.blur = maakQuad(blurFragment, {
      uBron: { value: null },
      uRichting: { value: new THREE.Vector2() },
    });

    this.kuwahara = maakQuad(kuwaharaFragment, {
      uBron: { value: null },
      uTensor: { value: null },
      uPixel: { value: new THREE.Vector2() },
      uStraal: { value: 5.0 },
      uAlfa: { value: STIJL.alfa },
      uScherpte: { value: STIJL.scherpte },
    });

    this.finale = maakQuad(finaleFragment, {
      uVerf: { value: null },
      uTensor: { value: null },
      uHoogteKaart: { value: null },
      uStreken: { value: 0 },
      uPixel: { value: new THREE.Vector2() },
      uTijd: { value: 0 },
      uLic: { value: 6 },
      uImpasto: { value: STIJL.impasto },
      uKorrel: { value: STIJL.korrel },
      uWarmte: { value: STIJL.warmte },
      uVignet: { value: STIJL.vignet },
      uBelichting: { value: STIJL.belichting },
      uSuper: { value: 0 },
      uFlits: { value: 0 },
    });

    this.streken = new Streken(renderer, STIJL.streken);
    this.strekenAan = true;
    this.verschuiving = new THREE.Vector2();

    this.zetKwaliteit(kwaliteit);
  }

  zetKwaliteit(naam) {
    const p = KWALITEIT[naam] || KWALITEIT.hoog;
    this.kwaliteitNaam = naam in KWALITEIT ? naam : 'hoog';
    this.instelling = p;
    this.kuwahara.materiaal.uniforms.uStraal.value = p.straal;
    this.finale.materiaal.uniforms.uLic.value = p.licStappen;
    this.finale.materiaal.uniforms.uImpasto.value = p.impasto;
    this.strekenAan = p.streken !== false;
    this.pasMaatAan(this.cssBreedte || 1, this.cssHoogte || 1, true);
  }

  pasMaatAan(cssBreedte, cssHoogte, forceer = false) {
    this.cssBreedte = cssBreedte;
    this.cssHoogte = cssHoogte;
    const p = this.instelling;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const schaal = p.renderSchaal * dpr;
    const b = Math.max(2, Math.round(cssBreedte * schaal));
    const h = Math.max(2, Math.round(cssHoogte * schaal));
    if (!forceer && b === this.breedte && h === this.hoogte) return;

    this.breedte = b;
    this.hoogte = h;
    this.rtScene.setSize(b, h);
    this.rtVerf.setSize(b, h);

    const tb = Math.max(2, Math.round(b / p.tensorDeling));
    const th = Math.max(2, Math.round(h / p.tensorDeling));
    this.rtT0.setSize(tb, th);
    this.rtT1.setSize(tb, th);
    this.rtT2.setSize(tb, th);
    this.streken.pasMaatAan(b, h);

    this.tensor.materiaal.uniforms.uPixel.value.set(1 / b, 1 / h);
    this.kuwahara.materiaal.uniforms.uPixel.value.set(1 / b, 1 / h);
    this.finale.materiaal.uniforms.uPixel.value.set(1 / b, 1 / h);
    this.lucht.materiaal.uniforms.uAspect.value = cssBreedte / Math.max(cssHoogte, 1);
    this.tensorPixel = new THREE.Vector2(1 / tb, 1 / th);
  }

  /** @param {number} v 0 = olieverf, 1 = comic */
  zetSuper(v) {
    this.super = v;
    this.lucht.materiaal.uniforms.uSuper.value = v;
    this.finale.materiaal.uniforms.uSuper.value = v;
  }

  zetFlits(v) {
    this.flits = v;
    this.finale.materiaal.uniforms.uFlits.value = v;
  }

  #teken(quad, doel) {
    this.renderer.setRenderTarget(doel);
    this.renderer.render(quad.scene, this.quadCamera);
  }

  /**
   * @param {THREE.WebGLRenderTarget|null} doel  waar het eindbeeld heen gaat;
   *   null = het scherm. Het lab rendert hiermee twee varianten naast elkaar.
   */
  render(scene, camera, tijd, doel = null) {
    const r = this.renderer;
    const wasAutoClear = r.autoClear;

    this.lucht.materiaal.uniforms.uTijd.value = tijd;
    this.lucht.materiaal.uniforms.uPan.value.set(camera.position.x * 0.012, camera.position.y * 0.010);
    this.finale.materiaal.uniforms.uTijd.value = tijd;

    // 1. lucht + scene in één doel
    r.autoClear = false;
    r.setRenderTarget(this.rtScene);
    r.clear(true, true, true);
    r.render(this.lucht.scene, this.quadCamera);
    r.render(scene, camera);
    r.autoClear = wasAutoClear;

    if (this.kwaliteitNaam === 'uit') {
      this.finale.materiaal.uniforms.uVerf.value = this.rtScene.texture;
      this.finale.materiaal.uniforms.uTensor.value = this.rtT2.texture;
      // zonder verf hebben we alsnog een flowveld nodig voor het comicpad
      this.tensor.materiaal.uniforms.uBron.value = this.rtScene.texture;
      this.#teken(this.tensor, this.rtT2);
      this.finale.materiaal.uniforms.uStreken.value = 0;
      this.#teken(this.finale, doel);
      r.setRenderTarget(null);
      return;
    }

    // 2. structuurtensor op halve resolutie
    this.tensor.materiaal.uniforms.uBron.value = this.rtScene.texture;
    this.#teken(this.tensor, this.rtT0);

    // 3 + 4. separabele blur -> stabiel flowveld
    this.blur.materiaal.uniforms.uBron.value = this.rtT0.texture;
    this.blur.materiaal.uniforms.uRichting.value.set(this.tensorPixel.x, 0);
    this.#teken(this.blur, this.rtT1);

    this.blur.materiaal.uniforms.uBron.value = this.rtT1.texture;
    this.blur.materiaal.uniforms.uRichting.value.set(0, this.tensorPixel.y);
    this.#teken(this.blur, this.rtT2);

    // 5. anisotrope Kuwahara
    this.kuwahara.materiaal.uniforms.uBron.value = this.rtScene.texture;
    this.kuwahara.materiaal.uniforms.uTensor.value = this.rtT2.texture;
    this.#teken(this.kuwahara, this.rtVerf);

    // 6. penseelstreken als geometrie over het geschilderde beeld
    const f = this.finale.materiaal.uniforms;
    if (this.strekenAan) {
      this.#zetVerschuiving(camera);
      this.streken.render(this.rtVerf.texture, this.rtT2.texture, this.verschuiving);
      f.uVerf.value = this.streken.doel.textures[0];
      f.uHoogteKaart.value = this.streken.doel.textures[1];
      f.uStreken.value = 1;
    } else {
      f.uVerf.value = this.rtVerf.texture;
      f.uHoogteKaart.value = null;
      f.uStreken.value = 0;
    }

    // 7. finale naar het scherm
    f.uTensor.value = this.rtT2.texture;
    this.#teken(this.finale, doel);
    r.setRenderTarget(null);
  }

  /** Tussenresultaten, voor de debugweergaves in het lab. */
  texturen() {
    return {
      scene: this.rtScene.texture,
      tensor: this.rtT2.texture,
      kuwahara: this.rtVerf.texture,
      streken: this.streken.doel.textures[0],
      hoogte: this.streken.doel.textures[1],
    };
  }

  /**
   * Ankers meeschuiven met de camera, zodat streken aan de wereld plakken.
   *
   * Dit werkt zo goed omdat de camera in een sidescroller alleen pant en
   * nooit draait: één screen-space verschuiving volstaat om de halen op hun
   * plek te houden. De achtergrond schuift er met parallax iets onderdoor,
   * maar dat valt niet op — het zwemmen van álles wél.
   */
  #zetVerschuiving(camera) {
    if (camera.isOrthographicCamera) {
      const breedte = (camera.right - camera.left) / camera.zoom;
      const hoogte = (camera.top - camera.bottom) / camera.zoom;
      this.verschuiving.set(-camera.position.x / breedte, -camera.position.y / hoogte);
      return;
    }
    // zichtbaar gebied op het spelvlak (z = 0)
    const afstand = Math.max(Math.abs(camera.position.z), 0.001);
    const hoogte = 2 * afstand * Math.tan((camera.fov * Math.PI / 180) / 2);
    const breedte = hoogte * camera.aspect;
    this.verschuiving.set(-camera.position.x / breedte, -camera.position.y / hoogte);
  }

  dispose() {
    this.streken.dispose();
    for (const rt of [this.rtScene, this.rtT0, this.rtT1, this.rtT2, this.rtVerf]) rt.dispose();
    for (const q of [this.lucht, this.tensor, this.blur, this.kuwahara, this.finale]) q.materiaal.dispose();
  }
}
