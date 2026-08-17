/* CAEK — de renderketen.
 *
 * Zes passes, van 3D-scene naar iets dat eruitziet alsof het met een paletmes
 * is opgelegd. De SuperCaek-modus is geen apart effect maar dezelfde keten met
 * één uniform (`uSuper`) omhoog: de hele renderer wisselt van genre.
 */

import * as THREE from 'three';
import {
  quadVertex, luchtFragment, tensorFragment, blurFragment,
  kuwaharaFragment, finaleFragment, helderFragment, waasFragment,
} from './shaders.js';
import { Streken } from './streken.js';

/** Voorinstellingen. `renderSchaal` is verreweg de grootste knop op snelheid.
 *  `streken` zet de geometrie-penselen aan; die kosten vooral fillrate. */
export const KWALITEIT = {
  hoog:   { renderSchaal: 0.95, straal: 4.2, licStappen: 0, impasto: 1.35, tensorDeling: 2, streken: true, strekenDeel: 1.0, dpr: 1.6, bloei: 1.0 },
  midden: { renderSchaal: 0.80, straal: 3.2, licStappen: 0, impasto: 1.10, tensorDeling: 2, streken: true, strekenDeel: 0.6, dpr: 1.35, bloei: 0.8 },
  laag:   { renderSchaal: 0.62, straal: 2.6, licStappen: 4, impasto: 0.50, tensorDeling: 3, streken: false, strekenDeel: 0, dpr: 1.0, bloei: 0 },
  uit:    { renderSchaal: 1.00, straal: 0.0, licStappen: 0, impasto: 0.00, tensorDeling: 4, streken: false, strekenDeel: 0, dpr: 1.0, bloei: 0 },
};

/* Hoe hard er geschilderd wordt, per diepte.
 *
 * Dit is 2.5D: de karakters en alles waar je mee kunt, staan op z = 0. Wat
 * daarachter ligt is decor. Dus is de afstand tot de camera meteen een goede
 * maat voor "hoeveel verf mag hier overheen": vlakbij bijna niets, achterin
 * het volle werk. Dat leest ook als lucht -- verte is waziger dan dichtbij.
 *
 * De bodem stond lang op 0,45 omdat de wereld toen uit gekleurde blokjes
 * bestond en de filter het schilderij máákte. Sinds alles op het spelvlak
 * geschilderd wórdt aangeleverd -- de sprites, de vloer, de kraampjes, de
 * platen -- doet diezelfde filter het omgekeerde: hij smeert penseelwerk uit
 * dat er al ligt. Dus staat de bodem nu vrijwel op nul. Voorgrond scherp,
 * achtergrond geschilderd, en de keten blijft heel omdat SuperCaeks
 * comicmodus er doorheen loopt.
 *
 * De uitzondering zit in het alfakanaal: materialen mogen een eigen sterkte
 * meegeven (zie maskeer() in world/materialen.js). */
export const DIEPTE = {
  nabij: 17.0,   // hier begint het masker; alles ervoor krijgt `bodem`
  ver: 40.0,     // hier is de filter op volle sterkte
  bodem: 0.05,   // vrijwel niets op het spelvlak; net genoeg dat de overgang
                 // naar het geschilderde decor erachter niet als een naad leest
};

/* Bloei — wat licht geeft, geeft ook licht áf.
 *
 * `drempel` is in lineaire ruimte, dus vóór de filmcurve. Gewone geverfde
 * vlakken blijven daaronder; ovenvuur, gouden ringen en vonken gaan eroverheen.
 * `deling` is hoeveel kleiner de bloeibuffer is dan het beeld -- op een kwart
 * kost de hele pass ongeveer niets en is de halo juist mooi breed. */
export const BLOEI = {
  drempel: 0.72,
  sterkte: 0.55,
  deling: 4,
};

/** Vaste stijlparameters — hieraan draaien is het leukste deel van het werk.
 *  web/lab.html draait er live aan en kan het resultaat als JS teruggeven. */
export const STIJL = {
  alfa: 1.0,        // excentriciteit van de penseelellips (hoger = ronder)
  scherpte: 8.0,    // q: hoe hard de scherpste sector wint
  korrel: 0.105,    // borstelharen in het reliëf
  warmte: 0.55,     // blauw/oranje split-toning
  schaduwKleur: 0.07,  // kleur in de diepste schaduwen; zonder dit lopen ze dood op zwart
  vignet: 0.42,
  belichting: 1.06,

  streken: {
    dekking: 0.94,       // hoeveel verf één haal afgeeft
    haren: 0.75,         // hoe sterk losse borstelharen doorkomen
    hoogte: 1.0,         // dikte van de verf, voedt het impasto
    hoekRuis: 0.5,       // hoeveel een haal van het flowveld mag afwijken
    randKrimp: 6.0,      // kleiner worden bij sterke randen; houdt silhouetten heel
    krimpBodem: 0.42,    // hoe klein een haal maximaal mag worden — zonder bodem
                         // knijpt de krimp ook in de lucht en wordt lengte inert
    anisotropie: 0.7,    // lengte volgt de eenduidigheid van het veld
    basisHoogte: 0.3,    // hoogte van de onderschildering
    maxPerLaag: 24000,   // bovengrens per laag; het lab mag hem opzoeken

    // Kleur per haal. Eén egale kleur per vlak leest als plastic; Van Gogh
    // legt naast elkaar liggende halen in verschillende tinten neer.
    tintRuis: 0.035,     // tintverschil tussen naburige halen
    waardeRuis: 0.28,    // helderheidsverschil
    kleurSpreiding: 1.0, // hoe ver een haal zijn kleur naast zichzelf ophaalt
    vonken: 0.12,        // spaarzame complementaire halen; op 0,6 wordt het confetti

    // Waar de scene vlak is (lucht) zegt de tensor niets. Dan een wervel.
    wervel: 0.85,
    wervelSchaal: 3.2,

    // Maten zijn fracties van de renderhoogte, niet pixels: anders ziet
    // dezelfde instelling er op een 4K-scherm heel anders uit dan op een
    // laptop. Grof eerst, dan detail — zoals je ook echt zou schilderen.
    // `detail` = hoe sterk een laag zich beperkt tot plekken waar iets te
    // zien is. De grondlaag ligt overal, het fijne penseel alleen op vormen.
    // Het lab kijkt van verder weg dan de gamecamera; wat daar mooi grof is,
    // is in het spel te grof. Dit is het compromis tot streekgrootte met de
    // diepte kan meeschalen (zie "Wat er nog niet in zit").
    lagen: [
      { lengte: 0.060, breedte: 0.020, dichtheid: 1.4, detail: 0 },
      { lengte: 0.028, breedte: 0.0092, dichtheid: 1.5, detail: 0.55 },
      { lengte: 0.011, breedte: 0.0034, dichtheid: 1.1, detail: 0.95 },
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
    // De diepte hebben we nodig als masker: hoe verder weg, hoe dikker de verf.
    this.rtScene.depthTexture = new THREE.DepthTexture(1, 1);
    this.rtScene.depthTexture.type = THREE.UnsignedIntType;
    this.rtT0 = maakDoel(1, 1, this.type);
    this.rtT1 = maakDoel(1, 1, this.type);
    this.rtT2 = maakDoel(1, 1, this.type);
    this.rtVerf = maakDoel(1, 1, this.type);
    // bloei op een kwart: breed en goedkoop, en juist bij gloed is grof beter
    this.rtBloei0 = maakDoel(1, 1, this.type);
    this.rtBloei1 = maakDoel(1, 1, this.type);

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
      uDiepte: { value: null },
      uCam: { value: new THREE.Vector2(0.5, 300) },
      uMasker: { value: new THREE.Vector3(DIEPTE.nabij, DIEPTE.ver, DIEPTE.bodem) },
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
      uSchaduwKleur: { value: STIJL.schaduwKleur },
      uVignet: { value: STIJL.vignet },
      uBelichting: { value: STIJL.belichting },
      uSuper: { value: 0 },
      uFlits: { value: 0 },
      uDiepte: { value: null },
      uCam: { value: new THREE.Vector2(0.5, 300) },
      uMasker: { value: new THREE.Vector3(DIEPTE.nabij, DIEPTE.ver, DIEPTE.bodem) },
      uBloei: { value: null },
      uBloeiSterkte: { value: BLOEI.sterkte },
    });

    this.helder = maakQuad(helderFragment, {
      uBron: { value: null },
      uPixel: { value: new THREE.Vector2() },
      uDrempel: { value: BLOEI.drempel },
    });

    this.waas = maakQuad(waasFragment, {
      uBron: { value: null },
      uRichting: { value: new THREE.Vector2() },
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
    this.bloeiDeel = p.bloei ?? 0;
    this.finale.materiaal.uniforms.uBloeiSterkte.value = BLOEI.sterkte * this.bloeiDeel;
    this.streken?.zetDeel(p.strekenDeel ?? 1);
    this.pasMaatAan(this.cssBreedte || 1, this.cssHoogte || 1, true);
  }

  pasMaatAan(cssBreedte, cssHoogte, forceer = false) {
    this.cssBreedte = cssBreedte;
    this.cssHoogte = cssHoogte;
    const p = this.instelling;
    const dpr = Math.min(window.devicePixelRatio || 1, p.dpr ?? 1.5);
    const schaal = p.renderSchaal * dpr;
    const b = Math.max(2, Math.round(cssBreedte * schaal));
    const h = Math.max(2, Math.round(cssHoogte * schaal));
    if (!forceer && b === this.breedte && h === this.hoogte) return;

    this.breedte = b;
    this.hoogte = h;
    this.rtScene.setSize(b, h);
    this.rtScene.depthTexture.image.width = b;
    this.rtScene.depthTexture.image.height = h;
    this.rtVerf.setSize(b, h);
    const bb = Math.max(2, Math.round(b / BLOEI.deling));
    const bh = Math.max(2, Math.round(h / BLOEI.deling));
    this.rtBloei0.setSize(bb, bh);
    this.rtBloei1.setSize(bb, bh);
    this.bloeiPixel = new THREE.Vector2(1 / bb, 1 / bh);
    this.helder.materiaal.uniforms.uPixel.value.set(1 / b, 1 / h);

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

  /**
   * Bloei: helderheid eruit trekken en breed uitsmeren.
   *
   * Uit rtScene en niet uit het geverfde beeld, met opzet. De scene is waar
   * het licht echt vandaan komt -- emissieve materialen, additieve vonken, de
   * gloed in een ovenmond -- en die waardes staan daar nog boven één. Na de
   * filmcurve is alles al platgedrukt en valt er niets meer te oogsten.
   */
  #bloei() {
    if (!(this.bloeiDeel > 0)) {
      this.finale.materiaal.uniforms.uBloei.value = null;
      this.finale.materiaal.uniforms.uBloeiSterkte.value = 0;
      return;
    }
    this.helder.materiaal.uniforms.uBron.value = this.rtScene.texture;
    this.#teken(this.helder, this.rtBloei0);

    this.waas.materiaal.uniforms.uBron.value = this.rtBloei0.texture;
    this.waas.materiaal.uniforms.uRichting.value.set(this.bloeiPixel.x, 0);
    this.#teken(this.waas, this.rtBloei1);

    this.waas.materiaal.uniforms.uBron.value = this.rtBloei1.texture;
    this.waas.materiaal.uniforms.uRichting.value.set(0, this.bloeiPixel.y);
    this.#teken(this.waas, this.rtBloei0);

    this.finale.materiaal.uniforms.uBloei.value = this.rtBloei0.texture;
    this.finale.materiaal.uniforms.uBloeiSterkte.value = BLOEI.sterkte * this.bloeiDeel;
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

    // het dieptemasker heeft de camera-instellingen nodig om te lineariseren
    for (const q of [this.kuwahara, this.finale]) {
      q.materiaal.uniforms.uDiepte.value = this.rtScene.depthTexture;
      q.materiaal.uniforms.uCam.value.set(camera.near ?? 0.5, camera.far ?? 300);
    }

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

    this.#bloei();

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
      this.streken.zetMasker(this.rtScene.depthTexture, camera.near ?? 0.5, camera.far ?? 300);
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
    for (const rt of [this.rtScene, this.rtT0, this.rtT1, this.rtT2, this.rtVerf, this.rtBloei0, this.rtBloei1]) rt.dispose();
    for (const q of [this.lucht, this.tensor, this.blur, this.kuwahara, this.helder, this.waas, this.finale]) q.materiaal.dispose();
  }
}
