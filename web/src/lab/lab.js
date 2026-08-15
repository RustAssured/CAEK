/* CAEK — Verflab.
 *
 * Een aparte pagina die exact dezelfde renderketen aanstuurt als de game, met
 * schuifregelaars op elke uniform. Bedoeld om te kijken en te draaien: wat je
 * hier goed vindt, kopieer je als JS terug naar render/composer.js.
 *
 * De proefopstelling bevat met opzet van elk materiaal iets — glad, gestreept,
 * gloeiend, donker, een karakter met een textuur, en veel lucht. Een stijl die
 * op één type oppervlak mooi is, is nog geen stijl.
 */

import * as THREE from 'three';
import { Schilder, STIJL, KWALITEIT } from '../render/composer.js';
import { quadVertex } from '../render/shaders.js';
import * as props from '../world/props.js';
import { PALET, verf } from '../world/materialen.js';
import { zetLicht } from '../world/level.js';
import { laadCaek, Caek } from '../game/caek.js';
import { Cupcaek } from '../game/cupcaek.js';
import { DOELENWIEL, PI } from '../config.js';
import { bouwRegelaars, alsJs } from './regelaars.js';

const $ = (s) => document.querySelector(s);

/* ------------------------------------------------------------------ *
 * Weergaves: het eindbeeld, of één tussenstap uit de keten
 * ------------------------------------------------------------------ */

const debugFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBron;
uniform int uModus;      // 0 = kleur, 1 = flowveld, 2 = hoogte
out vec4 fragKleur;

vec3 hsv(float h, float s, float v) {
  vec3 k = fract(vec3(5.0, 3.0, 1.0) / 6.0 + h) * 6.0 - 3.0;
  return v * mix(vec3(1.0), clamp(abs(k) - 1.0, 0.0, 1.0), s);
}

void main() {
  vec3 c = texture2D(uBron, vUv).rgb;

  if (uModus == 1) {
    // tensor -> richting als kleur, anisotropie als verzadiging
    float E = c.x, F = c.y, G = c.z;
    float d = E - G;
    float disc = sqrt(max(d * d + 4.0 * F * F, 0.0));
    float l1 = 0.5 * (E + G + disc);
    float l2 = 0.5 * (E + G - disc);
    vec2 t = normalize(vec2(l1 - E, -F) + 1e-9);
    float hoek = atan(t.y, t.x) / 3.14159265;
    float anis = (l1 + l2) > 1e-7 ? (l1 - l2) / (l1 + l2) : 0.0;
    fragKleur = vec4(hsv(fract(hoek * 0.5 + 0.5), 0.25 + 0.75 * anis, 0.95), 1.0);
    return;
  }

  if (uModus == 2) {
    float h = clamp(c.r, 0.0, 2.0) * 0.5;
    fragKleur = vec4(vec3(h), 1.0);
    return;
  }

  vec3 k = clamp(c, 0.0, 1.0);
  vec3 srgb = mix(k * 12.92, 1.055 * pow(max(k, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, k));
  fragKleur = vec4(srgb, 1.0);
}
`;

const wisserFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uLinks;
uniform sampler2D uRechts;
uniform float uGrens;
out vec4 fragKleur;
void main() {
  fragKleur = vUv.x < uGrens ? texture2D(uLinks, vUv) : texture2D(uRechts, vUv);
}
`;

/* ------------------------------------------------------------------ *
 * De proefopstelling
 * ------------------------------------------------------------------ */

const UITSNEDES = {
  totaal:    { x: 0, y: 4.5, z: 26 },
  karakter:  { x: -1.5, y: 2.0, z: 7 },
  oven:      { x: 11, y: 4.0, z: 15 },
  lucht:     { x: -13, y: 7.5, z: 18 },
  grond:     { x: 2, y: 1.0, z: 9 },
};

async function bouwProefopstelling(scene) {
  zetLicht(scene);

  const grond = props.platform(46, 1.2, PALET.steen);
  grond.position.set(0, 0, 0);
  scene.add(grond);

  const sokkel = props.doos(46, 24, 3.4, PALET.blauwDiep, { emissief: 0.04 });
  sokkel.position.set(0, -12.6, -0.4);
  scene.add(sokkel);

  scene.add(props.achtergrondBakkerij(70, 3).translateY(0).translateZ(0));

  const oven = props.oven(1.0, { tekst: 'VALUE OVEN' });
  oven.position.set(11, 0, -4);
  scene.add(oven);

  const cipres = props.cipres(11);
  cipres.position.set(-13, -0.4, -7);
  scene.add(cipres);

  const lantaarn = props.lantaarn(5);
  lantaarn.position.set(-6, 0, -3);
  scene.add(lantaarn);

  const bord = props.bord(['PROEF', 'OPSTELLING'], { breedte: 4.2, grootte: 52 });
  bord.position.set(-9.5, 0, 2);
  scene.add(bord);

  const tafel = props.demotafel(PALET.groen);
  tafel.position.set(5.5, 0, -1.5);
  scene.add(tafel);

  const rommel = props.papierrommel(2.6);
  rommel.position.set(-3.5, 0, 1.2);
  scene.add(rommel);

  const wiel = props.doelenwiel(DOELENWIEL, PI.strategisch, 3.2);
  wiel.position.set(17.5, 7.5, -6);
  scene.add(wiel);

  const pretzel = props.pretzel(2.4);
  pretzel.position.set(-18, 6.5, -5);
  scene.add(pretzel);

  // een paar losse kleurvlakken: handig om te zien wat de streken met een
  // egaal vlak doen, want dat is het lastigste geval
  const kleuren = [PALET.rood, PALET.goud, PALET.groen, PALET.roze, PALET.room, PALET.paars];
  kleuren.forEach((kleur, i) => {
    const tegel = props.doos(2, 2, 0.3, kleur, { emissief: 0.2 });
    tegel.position.set(-21 + i * 2.2, 2.4, 1.5);
    scene.add(tegel);
  });

  const deur = props.deur(['STAP 3', 'FIXEN'], 2.6, 5);
  deur.userData.blad.material = verf(PALET.oranje, { emissief: 0.2 });
  deur.position.set(21, 0, -2);
  scene.add(deur);

  return { grond, oven };
}

/* ------------------------------------------------------------------ *
 * Opstarten
 * ------------------------------------------------------------------ */

async function begin() {
  const canvas = $('#doek');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 300);
  camera.position.set(0, 4.5, 26);

  await bouwProefopstelling(scene);

  // Caek en Cupcaek erbij: een karakter met een textuur reageert heel anders
  // op de streken dan een egaal vlak, en dat wil je juist zien.
  let speler = null;
  try {
    const model = await laadCaek('./assets/caek.glb');
    speler = new Caek(model, { muren: [], vloeren: [], eindeX: 999 }, null);
    speler.positie.set(-1.5, 0, 0.5);
    speler.groep.position.copy(speler.positie);
    speler.bevroren = true;
    scene.add(speler.groep);
  } catch (e) {
    console.warn('Caek kon niet geladen worden in het lab:', e.message);
  }
  const cupcaek = new Cupcaek();
  cupcaek.positie.set(1.4, 0, 0.9);
  scene.add(cupcaek.groep);

  const schilder = new Schilder(renderer, 'hoog');
  const quadCamera = new THREE.Camera();

  function maakQuad(fragmentShader, uniforms) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: quadVertex, fragmentShader, uniforms,
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    mesh.frustumCulled = false;
    const s = new THREE.Scene();
    s.add(mesh);
    return { scene: s, mat };
  }

  const debug = maakQuad(debugFragment, { uBron: { value: null }, uModus: { value: 0 } });
  const wisser = maakQuad(wisserFragment, {
    uLinks: { value: null }, uRechts: { value: null }, uGrens: { value: 0.5 },
  });
  const maakDoel = () => new THREE.WebGLRenderTarget(2, 2, {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  });
  const rtA = maakDoel();
  const rtB = maakDoel();

  /* -------------------------- camera & maat -------------------------- */

  const staat = {
    vergelijk: false,
    panning: false,
    weergave: 'eind',
    grens: 0.5,
    doelPositie: new THREE.Vector3().copy(camera.position),
  };

  function pasMaatAan() {
    const b = innerWidth;
    const h = innerHeight;
    renderer.setSize(b, h, false);
    camera.aspect = b / h;
    camera.updateProjectionMatrix();
    schilder.pasMaatAan(b, h);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    rtA.setSize(Math.round(b * dpr), Math.round(h * dpr));
    rtB.setSize(Math.round(b * dpr), Math.round(h * dpr));
  }
  addEventListener('resize', pasMaatAan);
  pasMaatAan();

  // slepen = pannen, scrollen = dollyen
  let sleept = false;
  let laatst = { x: 0, y: 0 };
  canvas.addEventListener('pointerdown', (e) => {
    sleept = true;
    laatst = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', () => { sleept = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!sleept) return;
    const schaal = camera.position.z / innerHeight * 2 * Math.tan((camera.fov * Math.PI / 180) / 2);
    staat.doelPositie.x -= (e.clientX - laatst.x) * schaal;
    staat.doelPositie.y += (e.clientY - laatst.y) * schaal;
    laatst = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    staat.doelPositie.z = THREE.MathUtils.clamp(staat.doelPositie.z * (1 + Math.sign(e.deltaY) * 0.12), 3, 90);
  }, { passive: false });

  /* ---------------------------- bediening ---------------------------- */

  bouwRegelaars($('#regelaars'), STIJL, () => {
    schilder.kuwahara.materiaal.uniforms.uAlfa.value = STIJL.alfa;
    schilder.kuwahara.materiaal.uniforms.uScherpte.value = STIJL.scherpte;
    const f = schilder.finale.materiaal.uniforms;
    f.uKorrel.value = STIJL.korrel;
    f.uWarmte.value = STIJL.warmte;
    f.uVignet.value = STIJL.vignet;
    f.uBelichting.value = STIJL.belichting;
    f.uImpasto.value = STIJL.impasto ?? f.uImpasto.value;
    schilder.streken.ververs();
  }, schilder);

  const knopVergelijk = $('#knop-vergelijk');
  const knopPanning = $('#knop-panning');
  const wisserEl = $('#wisser');
  const wisserGreep = wisserEl.querySelector('i');

  knopVergelijk.addEventListener('click', () => {
    staat.vergelijk = !staat.vergelijk;
    knopVergelijk.classList.toggle('aan', staat.vergelijk);
    wisserEl.hidden = !staat.vergelijk;
  });
  knopPanning.addEventListener('click', () => {
    staat.panning = !staat.panning;
    knopPanning.classList.toggle('aan', staat.panning);
  });

  let sleeptWisser = false;
  wisserGreep.addEventListener('pointerdown', (e) => {
    sleeptWisser = true;
    wisserGreep.setPointerCapture(e.pointerId);
  });
  addEventListener('pointerup', () => { sleeptWisser = false; });
  addEventListener('pointermove', (e) => {
    if (!sleeptWisser) return;
    staat.grens = THREE.MathUtils.clamp(e.clientX / innerWidth, 0.02, 0.98);
  });

  $('#weergave').addEventListener('change', (e) => { staat.weergave = e.target.value; });
  $('#uitsnede').addEventListener('change', (e) => {
    const u = UITSNEDES[e.target.value];
    if (u) staat.doelPositie.set(u.x, u.y, u.z);
  });

  $('#knop-kopieer').addEventListener('click', async () => {
    const tekst = alsJs(STIJL);
    try {
      await navigator.clipboard.writeText(tekst);
      melding('Gekopieerd — plak dit over STIJL in render/composer.js');
    } catch {
      console.log(tekst);
      melding('Klembord geweigerd; de instellingen staan in de console');
    }
  });

  $('#knop-herstel').addEventListener('click', () => {
    localStorage.removeItem('caek-stijl');
    location.reload();
  });

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') $('#paneel').classList.toggle('verborgen');
  });

  function melding(tekst) {
    const el = $('#melding');
    el.textContent = tekst;
    clearTimeout(melding.timer);
    melding.timer = setTimeout(() => { el.textContent = ''; }, 3500);
  }

  // instellingen bewaren tussen sessies
  const bewaardeStijl = localStorage.getItem('caek-stijl');
  if (bewaardeStijl) {
    try {
      Object.assign(STIJL, JSON.parse(bewaardeStijl));
      schilder.streken.stijl = STIJL.streken;
      schilder.streken.bouwLagen();
    } catch { /* stuk opgeslagen stijl negeren we gewoon */ }
  }
  setInterval(() => localStorage.setItem('caek-stijl', JSON.stringify(STIJL)), 4000);

  /* ------------------------------ de lus ------------------------------ */

  let vorige = performance.now();
  let fpsSom = 0;
  let fpsTellen = 0;

  function lus(nu) {
    requestAnimationFrame(lus);
    const dt = Math.min(0.05, (nu - vorige) / 1000);
    vorige = nu;
    const tijd = nu / 1000;

    if (staat.panning) staat.doelPositie.x = Math.sin(tijd * 0.35) * 9;
    camera.position.lerp(staat.doelPositie, Math.min(1, dt * 6));
    camera.lookAt(camera.position.x, camera.position.y - 1.0, 0);

    if (speler) speler.mixer.update(dt);
    cupcaek.update(dt, { x: 1.4, y: 0, kijkt: 1, opGrond: true });

    if (staat.vergelijk) {
      const aanStond = schilder.strekenAan;
      schilder.strekenAan = false;
      schilder.render(scene, camera, tijd, rtA);
      schilder.strekenAan = true;
      schilder.render(scene, camera, tijd, rtB);
      schilder.strekenAan = aanStond;
      wisser.mat.uniforms.uLinks.value = rtA.texture;
      wisser.mat.uniforms.uRechts.value = rtB.texture;
      wisser.mat.uniforms.uGrens.value = staat.grens;
      renderer.setRenderTarget(null);
      renderer.render(wisser.scene, quadCamera);
      wisserGreep.style.left = `${staat.grens * 100}%`;
    } else if (staat.weergave === 'eind') {
      schilder.render(scene, camera, tijd);
    } else {
      schilder.render(scene, camera, tijd, rtA);   // vult alle tussenbuffers
      const t = schilder.texturen();
      const bron = {
        scene: t.scene, kuwahara: t.kuwahara, streken: t.streken, hoogte: t.hoogte, tensor: t.tensor,
      }[staat.weergave];
      debug.mat.uniforms.uBron.value = bron || t.scene;
      debug.mat.uniforms.uModus.value = staat.weergave === 'tensor' ? 1 : (staat.weergave === 'hoogte' ? 2 : 0);
      renderer.setRenderTarget(null);
      renderer.render(debug.scene, quadCamera);
    }

    fpsSom += dt;
    fpsTellen++;
    if (fpsTellen >= 30) {
      $('#meter-fps').textContent = Math.round(fpsTellen / fpsSom);
      $('#meter-streken').textContent = schilder.streken.aantalStreken.toLocaleString('nl-NL');
      $('#meter-buffer').textContent = `${schilder.breedte}×${schilder.hoogte}`;
      fpsSom = 0;
      fpsTellen = 0;
    }
  }
  requestAnimationFrame(lus);

  /* Van buitenaf aanstuurbaar, zodat tools/stijlzoeker het lab kan gebruiken
   * als renderbank: stijl erin, plaatje eruit, honderden keren achter elkaar. */
  function pasStijlToe(nieuw) {
    const samenvoegen = (doel, bron) => {
      for (const [k, v] of Object.entries(bron)) {
        if (Array.isArray(v)) {
          doel[k] = doel[k] || [];
          v.forEach((item, i) => {
            doel[k][i] = typeof item === 'object' ? Object.assign(doel[k][i] || {}, item) : item;
          });
        } else if (v && typeof v === 'object') {
          doel[k] = doel[k] || {};
          samenvoegen(doel[k], v);
        } else {
          doel[k] = v;
        }
      }
    };
    samenvoegen(STIJL, nieuw);
    schilder.kuwahara.materiaal.uniforms.uAlfa.value = STIJL.alfa;
    schilder.kuwahara.materiaal.uniforms.uScherpte.value = STIJL.scherpte;
    const f = schilder.finale.materiaal.uniforms;
    f.uKorrel.value = STIJL.korrel;
    f.uWarmte.value = STIJL.warmte;
    f.uVignet.value = STIJL.vignet;
    f.uBelichting.value = STIJL.belichting;
    if (nieuw.impasto !== undefined) f.uImpasto.value = nieuw.impasto;
    if (nieuw.straal !== undefined) schilder.kuwahara.materiaal.uniforms.uStraal.value = nieuw.straal;
    schilder.streken.ververs();
  }

  function zetCamera(naam) {
    const u = UITSNEDES[naam] || UITSNEDES.totaal;
    camera.position.set(u.x, u.y, u.z);
    staat.doelPositie.copy(camera.position);
    camera.lookAt(camera.position.x, camera.position.y - 1.0, 0);
  }

  window.LAB = {
    schilder, scene, camera, STIJL, KWALITEIT, staat,
    pasStijlToe, zetCamera, uitsnedes: Object.keys(UITSNEDES),
    // één frame op commando, los van de animatielus
    renderNu(tijd = 12.0) { schilder.render(scene, camera, tijd); },
  };
}

begin().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('afterbegin',
    `<p style="position:fixed;inset:20px;z-index:99;color:#f2799f;font:14px sans-serif">Lab startte niet: ${e.message}</p>`);
});
