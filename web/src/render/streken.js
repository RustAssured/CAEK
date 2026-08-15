/* CAEK — penseelstreken als geometrie.
 *
 * De Kuwahara-keten levert een geschilderd béeld; dit legt daar echte halen
 * overheen. Per laag één instanced draw call met duizenden quads: elk quad
 * leest op zijn ankerpunt de kleur (uit het Kuwahara-resultaat) en de
 * richting (uit het flowveld), draait zichzelf daarlangs en zet zich neer.
 *
 * Twee dingen die dit oplevert en een filter nooit kan:
 *   - streken lopen over silhouetranden heen, zoals verf dat doet
 *   - waar halen elkaar overlappen ligt de verf dikker, dus het impasto in
 *     de finale-pass is echt reliëf in plaats van een truc met helderheid
 *
 * En één ding dat hier expres in zit: de ankers schuiven mee met de camera
 * (`uVerschuiving`). Zonder dat plakken de streken aan het scherm in plaats
 * van aan de wereld, en dan zwemt het hele doek zodra je loopt — het
 * "douchedeur"-effect dat elke screen-space schilderfilter verraadt.
 */

import * as THREE from 'three';
import { streekVertex, streekFragment, grondlaagFragment, quadVertex } from './shaders.js';

/** Premultiplied "over": de bovenste haal wint, precies als natte verf. */
const OVER = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
};

const KWAST = new THREE.PlaneGeometry(1, 1);

export class Streken {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {object} stijl  het `streken`-blok uit STIJL
   */
  constructor(renderer, stijl) {
    this.renderer = renderer;
    this.stijl = stijl;
    this.breedte = 1;
    this.hoogte = 1;
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();
    this.lagen = [];
    this.aantalStreken = 0;

    this.doel = new THREE.WebGLRenderTarget(1, 1, {
      count: 2,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    for (const tex of this.doel.textures) tex.colorSpace = THREE.LinearSRGBColorSpace;

    this.grondlaag = new THREE.Mesh(KWAST.clone(), new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: grondlaagFragment,
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uKleur: { value: null },
        uBasisHoogte: { value: stijl.basisHoogte },
      },
    }));
    this.grondlaag.geometry.scale(2, 2, 1);   // vult het klipvlak
    this.grondlaag.frustumCulled = false;
    this.grondlaag.renderOrder = -1;
    this.scene.add(this.grondlaag);

    this.bouwLagen();
  }

  /** Maten staan in de stijl als fractie van de renderhoogte. */
  #maten(config) {
    return {
      lengte: Math.max(2, config.lengte * this.hoogte),
      breedte: Math.max(1, config.breedte * this.hoogte),
    };
  }

  /** Eén laag = één instanced draw call met zijn eigen streekmaat. */
  #maakLaag(config, index) {
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = KWAST.index;
    geo.attributes.position = KWAST.attributes.position;
    geo.attributes.uv = KWAST.attributes.uv;
    geo.attributes.normal = KWAST.attributes.normal;

    const materiaal = new THREE.ShaderMaterial({
      vertexShader: streekVertex,
      fragmentShader: streekFragment,
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      ...OVER,
      uniforms: {
        uKleur: { value: null },
        uTensor: { value: null },
        uResolutie: { value: new THREE.Vector2(1, 1) },
        uVerschuiving: { value: new THREE.Vector2() },
        uLengte: { value: 1 },
        uBreedte: { value: 1 },
        uHoekRuis: { value: this.stijl.hoekRuis },
        uRandKrimp: { value: this.stijl.randKrimp },
        uAnisotropie: { value: this.stijl.anisotropie },
        uDetail: { value: config.detail ?? 0 },
        uDekking: { value: this.stijl.dekking },
        uHaren: { value: this.stijl.haren },
        uHoogte: { value: this.stijl.hoogte },
      },
    });

    const mesh = new THREE.Mesh(geo, materiaal);
    mesh.frustumCulled = false;
    mesh.renderOrder = index;
    this.scene.add(mesh);
    return { config, geo, materiaal, mesh, aantal: 0 };
  }

  bouwLagen() {
    for (const laag of this.lagen) {
      this.scene.remove(laag.mesh);
      laag.geo.dispose();
      laag.materiaal.dispose();
    }
    this.lagen = this.stijl.lagen.map((c, i) => this.#maakLaag(c, i));
    this.vulAnkers();
  }

  /**
   * Ankerpunten op een gejitterd raster. Puur willekeurig strooien laat
   * gaten vallen; een raster met jitter dekt gelijkmatig zonder dat je het
   * raster terugziet.
   */
  vulAnkers() {
    const aspect = this.breedte / Math.max(this.hoogte, 1);
    this.aantalStreken = 0;

    for (const laag of this.lagen) {
      const { lengte, breedte } = this.#maten(laag.config);
      const dichtheid = laag.config.dichtheid ?? 1.5;
      const oppervlakStreek = Math.max(lengte * breedte * 0.55, 1);
      const gewenst = Math.min(
        this.stijl.maxPerLaag,
        Math.round(dichtheid * (this.breedte * this.hoogte) / oppervlakStreek),
      );
      const kolommen = Math.max(1, Math.round(Math.sqrt(gewenst * aspect)));
      const rijen = Math.max(1, Math.ceil(gewenst / kolommen));
      const aantal = kolommen * rijen;

      const ankers = new Float32Array(aantal * 2);
      const willekeur = new Float32Array(aantal * 4);
      let i = 0;
      for (let r = 0; r < rijen; r++) {
        for (let k = 0; k < kolommen; k++) {
          ankers[i * 2] = (k + 0.5 + (Math.random() - 0.5) * 1.4) / kolommen;
          ankers[i * 2 + 1] = (r + 0.5 + (Math.random() - 0.5) * 1.4) / rijen;
          willekeur[i * 4] = Math.random();
          willekeur[i * 4 + 1] = Math.random();
          willekeur[i * 4 + 2] = Math.random();
          willekeur[i * 4 + 3] = Math.random();
          i++;
        }
      }

      laag.geo.setAttribute('aAnker', new THREE.InstancedBufferAttribute(ankers, 2));
      laag.geo.setAttribute('aWillekeur', new THREE.InstancedBufferAttribute(willekeur, 4));
      laag.geo.instanceCount = aantal;
      laag.aantal = aantal;
      laag.vorige = { lengte: laag.config.lengte, breedte: laag.config.breedte, dichtheid: laag.config.dichtheid };
      this.aantalStreken += aantal;
    }
  }

  pasMaatAan(breedte, hoogte) {
    if (breedte === this.breedte && hoogte === this.hoogte) return;
    this.breedte = breedte;
    this.hoogte = hoogte;
    this.doel.setSize(breedte, hoogte);
    for (const laag of this.lagen) laag.materiaal.uniforms.uResolutie.value.set(breedte, hoogte);
    this.ververs();
    this.vulAnkers();
  }

  /**
   * Neemt losse stijlwaarden over zonder de lagen opnieuw op te bouwen.
   * Verandert de streekmaat, dan verandert ook hoeveel streken je nodig hebt
   * voor dekking — vandaar dat de ankers dan opnieuw gestrooid worden.
   */
  ververs() {
    this.grondlaag.material.uniforms.uBasisHoogte.value = this.stijl.basisHoogte;
    let maatGewijzigd = false;

    this.lagen.forEach((laag, i) => {
      const c = this.stijl.lagen[i];
      if (!c) return;
      // Vergelijk tegen losse getallen, niet tegen het configobject: het lab
      // wijzigt de stijl ter plekke, dus config en c zijn hetzelfde object.
      const vorige = laag.vorige || {};
      if (c.lengte !== vorige.lengte || c.breedte !== vorige.breedte || c.dichtheid !== vorige.dichtheid) {
        maatGewijzigd = true;
      }
      laag.vorige = { lengte: c.lengte, breedte: c.breedte, dichtheid: c.dichtheid };
      laag.config = c;
      const maat = this.#maten(c);
      const u = laag.materiaal.uniforms;
      u.uLengte.value = maat.lengte;
      u.uBreedte.value = maat.breedte;
      u.uHoekRuis.value = this.stijl.hoekRuis;
      u.uRandKrimp.value = this.stijl.randKrimp;
      u.uAnisotropie.value = this.stijl.anisotropie;
      u.uDetail.value = c.detail ?? 0;
      u.uDekking.value = this.stijl.dekking;
      u.uHaren.value = this.stijl.haren;
      u.uHoogte.value = this.stijl.hoogte;
    });

    if (maatGewijzigd) this.vulAnkers();
  }

  /**
   * @param {THREE.Texture} kleur    het Kuwahara-resultaat
   * @param {THREE.Texture} tensor   het gladde flowveld
   * @param {THREE.Vector2} verschuiving  camerapan in schermbreedtes
   */
  render(kleur, tensor, verschuiving) {
    this.grondlaag.material.uniforms.uKleur.value = kleur;
    for (const laag of this.lagen) {
      const u = laag.materiaal.uniforms;
      u.uKleur.value = kleur;
      u.uTensor.value = tensor;
      u.uVerschuiving.value.copy(verschuiving);
    }
    const wasAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(this.doel);
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = wasAutoClear;
  }

  dispose() {
    this.doel.dispose();
    this.grondlaag.material.dispose();
    for (const laag of this.lagen) {
      laag.geo.dispose();
      laag.materiaal.dispose();
    }
  }
}
