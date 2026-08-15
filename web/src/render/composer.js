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

/** Voorinstellingen. `renderSchaal` is verreweg de grootste knop op snelheid. */
export const KWALITEIT = {
  hoog:   { renderSchaal: 0.88, straal: 5.0, licStappen: 6, impasto: 0.78, tensorDeling: 2 },
  midden: { renderSchaal: 0.74, straal: 3.6, licStappen: 4, impasto: 0.62, tensorDeling: 2 },
  laag:   { renderSchaal: 0.60, straal: 2.6, licStappen: 0, impasto: 0.42, tensorDeling: 2 },
  uit:    { renderSchaal: 1.00, straal: 0.0, licStappen: 0, impasto: 0.00, tensorDeling: 4 },
};

/** Vaste stijlparameters — hieraan draaien is het leukste deel van het werk. */
export const STIJL = {
  alfa: 1.0,        // excentriciteit van de penseelellips (hoger = ronder)
  scherpte: 8.0,    // q: hoe hard de scherpste sector wint
  korrel: 0.105,    // borstelharen in het reliëf
  warmte: 0.55,     // blauw/oranje split-toning
  vignet: 0.42,
  belichting: 1.06,
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

    this.zetKwaliteit(kwaliteit);
  }

  zetKwaliteit(naam) {
    const p = KWALITEIT[naam] || KWALITEIT.hoog;
    this.kwaliteitNaam = naam in KWALITEIT ? naam : 'hoog';
    this.instelling = p;
    this.kuwahara.materiaal.uniforms.uStraal.value = p.straal;
    this.finale.materiaal.uniforms.uLic.value = p.licStappen;
    this.finale.materiaal.uniforms.uImpasto.value = p.impasto;
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

  render(scene, camera, tijd) {
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
      this.#teken(this.finale, null);
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

    // 6. finale naar het scherm
    this.finale.materiaal.uniforms.uVerf.value = this.rtVerf.texture;
    this.finale.materiaal.uniforms.uTensor.value = this.rtT2.texture;
    this.#teken(this.finale, null);
    r.setRenderTarget(null);
  }

  dispose() {
    for (const rt of [this.rtScene, this.rtT0, this.rtT1, this.rtT2, this.rtVerf]) rt.dispose();
    for (const q of [this.lucht, this.tensor, this.blur, this.kuwahara, this.finale]) q.materiaal.dispose();
  }
}
