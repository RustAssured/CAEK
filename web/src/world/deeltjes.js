/* CAEK — rook, bloem en vonken.
 *
 * Eén systeem voor alles wat opdwarrelt. Het is opzettelijk klein: geen
 * physics, geen botsingen, alleen een positie, een snelheid en een leven dat
 * afloopt. Wat het overtuigend maakt is niet de simulatie maar de timing --
 * een wolkje bloem op het moment dat je landt zegt meer over gewicht dan
 * welke veerformule ook.
 *
 * Alles zit in twee instanced meshes, dus twee draw calls voor het hele spel.
 * Een deeltje dat dood is krijgt gewoon een nieuwe geboorte; er wordt nooit
 * geheugen bijgemaakt.
 *
 * Waarom geen THREE.Points: die schaalt punten in pixels, en dan is een
 * rookpluim op een 4K-scherm ineens half zo groot als op een laptop. Vier
 * hoekpunten per deeltje kosten hier niets en geven wereldmaten terug.
 *
 * Twee mengsoorten, want ze doen tegengesteld werk. Rook moet de achtergrond
 * afdekken, vonken moeten er licht bij optellen. Beide laten het alfakanaal
 * met rust: dat kanaal draagt het verfmasker en niet de dekking van een
 * rookpluim.
 */

import * as THREE from 'three';
import { vlekTextuur } from './materialen.js';

const MAX = 300;

/* De soorten. `zwaarte` is hoeveel de zwaartekracht pakt (negatief = het stijgt
 * op), `traag` hoeveel snelheid er per seconde af gaat, `groei` hoeveel groter
 * een deeltje wordt over zijn leven. */
export const SOORT = {
  rook:  { kleur: 0x91a9dd, maat: [1.3, 3.0], leven: [2.2, 3.6], zwaarte: -0.55, traag: 0.7, groei: 2.0, licht: false, start: 0.34 },
  bloem: { kleur: 0xfdf3d8, maat: [0.45, 1.0], leven: [0.5, 0.9], zwaarte: 1.1, traag: 2.6, groei: 2.2, licht: false, start: 0.62 },
  vonk:  { kleur: 0xffd873, maat: [0.22, 0.5], leven: [0.6, 1.1], zwaarte: -0.3, traag: 1.1, groei: 0.7, licht: true, start: 1.0 },
  gloed: { kleur: 0xe8721f, maat: [0.7, 1.6], leven: [0.7, 1.3], zwaarte: -1.6, traag: 1.4, groei: 1.4, licht: true, start: 0.9 },
};

const deeltjeVertex = /* glsl */`
  attribute vec3 plek;
  attribute float maat;
  attribute vec4 tint;
  varying vec4 vTint;
  varying vec2 vUv;
  void main() {
    vTint = tint;
    vUv = uv;
    // Naar de camera toe draaien gebeurt in het oogstelsel: daar is "recht
    // vooruit" per definitie de kijkrichting, dus volstaat het om de hoek van
    // de quad in x en y op te tellen bij het middelpunt.
    vec4 midden = modelViewMatrix * vec4(plek, 1.0);
    midden.xy += position.xy * maat;
    gl_Position = projectionMatrix * midden;
  }
`;

const deeltjeFragment = /* glsl */`
  uniform sampler2D uVlek;
  varying vec4 vTint;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uVlek, vUv).a * vTint.a;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vTint.rgb, a);
  }
`;

function tussen(bereik) { return bereik[0] + Math.random() * (bereik[1] - bereik[0]); }

/** Eén wolk van één mengsoort: optellend (licht) of afdekkend. */
class Wolk {
  constructor(licht) {
    const geo = new THREE.InstancedBufferGeometry();
    const basis = new THREE.PlaneGeometry(1, 1);
    geo.index = basis.index;
    geo.attributes.position = basis.attributes.position;
    geo.attributes.uv = basis.attributes.uv;

    this.plek = new Float32Array(MAX * 3);
    this.maat = new Float32Array(MAX);
    this.tint = new Float32Array(MAX * 4);
    geo.setAttribute('plek', new THREE.InstancedBufferAttribute(this.plek, 3));
    geo.setAttribute('maat', new THREE.InstancedBufferAttribute(this.maat, 1));
    geo.setAttribute('tint', new THREE.InstancedBufferAttribute(this.tint, 4));
    geo.instanceCount = 0;

    const materiaal = new THREE.ShaderMaterial({
      vertexShader: deeltjeVertex,
      fragmentShader: deeltjeFragment,
      uniforms: { uVlek: { value: vlekTextuur() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: licht ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      // Het alfakanaal van de scene is het verfmasker. Een rookpluim mag daar
      // niet in schrijven, anders bepaalt hij ongemerkt hoeveel olieverf er
      // over alles achter hem heen gaat.
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    });

    this.mesh = new THREE.Mesh(geo, materiaal);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.geo = geo;

    this.snelheid = new Float32Array(MAX * 3);
    this.leven = new Float32Array(MAX);
    this.duur = new Float32Array(MAX);
    this.basisMaat = new Float32Array(MAX);
    this.groei = new Float32Array(MAX);
    this.start = new Float32Array(MAX);
    this.zwaarte = new Float32Array(MAX);
    this.traag = new Float32Array(MAX);
    this.volgende = 0;
    this.hoogste = 0;
  }

  spuit(soort, x, y, z, vx, vy, vz, kleur) {
    // rondlopende index: het oudste deeltje maakt plaats, en dat is precies
    // het deeltje dat je het minst mist
    const i = this.volgende;
    this.volgende = (this.volgende + 1) % MAX;
    this.hoogste = Math.max(this.hoogste, i + 1);

    const duur = tussen(soort.leven);
    this.leven[i] = duur;
    this.duur[i] = duur;
    this.plek[i * 3] = x;
    this.plek[i * 3 + 1] = y;
    this.plek[i * 3 + 2] = z;
    this.snelheid[i * 3] = vx;
    this.snelheid[i * 3 + 1] = vy;
    this.snelheid[i * 3 + 2] = vz;
    this.basisMaat[i] = tussen(soort.maat);
    this.groei[i] = soort.groei;
    this.start[i] = soort.start;
    this.zwaarte[i] = soort.zwaarte;
    this.traag[i] = soort.traag;
    const c = new THREE.Color(kleur ?? soort.kleur);
    this.tint[i * 4] = c.r;
    this.tint[i * 4 + 1] = c.g;
    this.tint[i * 4 + 2] = c.b;
    this.tint[i * 4 + 3] = soort.start;
  }

  update(dt) {
    let levend = 0;
    for (let i = 0; i < this.hoogste; i++) {
      if (this.leven[i] <= 0) { this.maat[i] = 0; continue; }
      this.leven[i] -= dt;
      if (this.leven[i] <= 0) { this.maat[i] = 0; continue; }

      const rem = Math.max(0, 1 - this.traag[i] * dt);
      this.snelheid[i * 3] *= rem;
      this.snelheid[i * 3 + 2] *= rem;
      this.snelheid[i * 3 + 1] = this.snelheid[i * 3 + 1] * rem - this.zwaarte[i] * dt * 3.4;
      this.plek[i * 3] += this.snelheid[i * 3] * dt;
      this.plek[i * 3 + 1] += this.snelheid[i * 3 + 1] * dt;
      this.plek[i * 3 + 2] += this.snelheid[i * 3 + 2] * dt;

      // t loopt van 0 (net geboren) naar 1 (weg). Rook groeit en vervaagt,
      // vonken krimpen juist -- vandaar dat groei per soort verschilt.
      const t = 1 - this.leven[i] / this.duur[i];
      this.maat[i] = this.basisMaat[i] * (1 + (this.groei[i] - 1) * t);
      // aan het begin ook even opkomen, anders ploppen ze op volle sterkte
      this.tint[i * 4 + 3] = this.start[i] * Math.min(1, t * 6) * (1 - t) * (1 - t * 0.4);
      levend++;
    }

    if (levend === 0) { this.hoogste = 0; this.volgende = 0; }
    this.geo.instanceCount = this.hoogste;
    this.geo.attributes.plek.needsUpdate = true;
    this.geo.attributes.maat.needsUpdate = true;
    this.geo.attributes.tint.needsUpdate = true;
  }
}

/**
 * De deeltjesmotor van het spel. Eén instantie, in main.js.
 *
 * `spuit()` is de ruwe vorm; daarboven zitten de gebaren die het spel echt
 * gebruikt -- landen, afzetten, roken, vonken -- want die willen op één plek
 * afgeregeld zijn en niet verspreid over vijf levelbestanden.
 */
export class Deeltjes {
  constructor(scene) {
    this.dof = new Wolk(false);
    this.licht = new Wolk(true);
    this.groep = new THREE.Group();
    this.groep.add(this.dof.mesh, this.licht.mesh);
    scene.add(this.groep);
    this.resten = new Map();
  }

  spuit(soortNaam, aantal, x, y, z, { spreiding = 1.2, omhoog = 1.4, kleur = null } = {}) {
    const soort = SOORT[soortNaam];
    if (!soort) return;
    const wolk = soort.licht ? this.licht : this.dof;
    for (let i = 0; i < aantal; i++) {
      wolk.spuit(
        soort,
        x + (Math.random() - 0.5) * spreiding * 0.8,
        y + Math.random() * 0.3,
        z + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * spreiding * 2.2,
        omhoog * (0.5 + Math.random()),
        (Math.random() - 0.5) * 0.8,
        kleur,
      );
    }
  }

  /** Bloem onder de voeten bij een landing. Harder vallen = grotere wolk. */
  landing(x, y, z, kracht = 1) {
    this.spuit('bloem', Math.min(9, 2 + Math.round(kracht * 5)), x, y + 0.12, z, {
      spreiding: 1.4 + kracht * 0.6, omhoog: 0.8 + kracht * 0.5,
    });
  }

  /** Een klein zetje bij het afzetten. Subtieler dan de landing. */
  afzet(x, y, z) {
    this.spuit('bloem', 3, x, y + 0.12, z, { spreiding: 1.0, omhoog: 0.5 });
  }

  /** Value opgehaald: gouden vonken die opstijgen. */
  vonken(x, y, z, aantal = 12) {
    this.spuit('vonk', aantal, x, y, z, { spreiding: 1.6, omhoog: 2.6 });
  }

  /**
   * Een schoorsteen of een ovenmond die blijft roken.
   *
   * Doorlopend en niet eenmalig, dus dit gaat per tik met een tempo in plaats
   * van met een aantal -- anders zou een schoorsteen bij 120 fps twee keer
   * zoveel roken als bij 60. `sleutel` houdt de rest per bron apart, zodat
   * vijf schoorstenen elkaars ritme niet opeten.
   */
  pluim(sleutel, dt, x, y, z, { tempo = 2.4, soort = 'rook', spreiding = 0.5, omhoog = 1.5, kleur = null } = {}) {
    const rest = (this.resten.get(sleutel) || 0) + dt * tempo;
    let over = rest;
    while (over >= 1) {
      over -= 1;
      this.spuit(soort, 1, x, y, z, { spreiding, omhoog, kleur });
    }
    this.resten.set(sleutel, over);
  }

  update(dt) {
    this.dof.update(dt);
    this.licht.update(dt);
  }
}
