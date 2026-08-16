/* CAEK — PI in de Mix
 *
 * Startpunt. Zet de renderer op, laadt Caek, bouwt het level, en draait de lus.
 *
 * De kern van het ontwerp staat in geefValue(): waarde komt van acties die
 * aantoonbaar aan het PI-doel bijdragen. Munten verzamelen doet niets. */

import * as THREE from 'three';
import { Schilder } from './render/composer.js';
import { Invoer } from './engine/input.js';
import { Geluid } from './engine/audio.js';
import { Level, zetLicht } from './world/level.js';
import { bouwLevel } from './game/secties.js';
import { laadCaek, Caek } from './game/caek.js';
import { Cupcaek, laadCupcaek } from './game/cupcaek.js';
import { ScopeCreep } from './game/scopecreep.js';
import { Hud } from './ui/hud.js';
import { Dialoog, pauze } from './ui/dialoog.js';
import { Paneel } from './ui/paneel.js';
import { toonEindscherm } from './ui/eindscherm.js';
import { CAMERA, NATUURKUNDE, SUPERCAEK, WAARDE } from './config.js';

class Spel {
  constructor(canvas) {
    this.canvas = canvas;
    this.klok = 0;
    this.value = 0;
    this.energie = 0;
    this.mand = [];
    this.metrics = [];
    this.sprinkles = [];
    this.schakelaars = new Set();
    this.vlaggen = {};
    this.plops = 0;
    this.rommelKapot = 0;
    this.bezigMetScene = 0;
    this.superMengsel = 0;
    this.superDoel = 0;
    this.schud = 0;
    this.gestart = false;
    this.klaar = false;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);   // de Schilder regelt zelf zijn resolutie
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.5, 300);
    this.camera.position.set(0, CAMERA.hoogte, CAMERA.afstand);
    this.cameraDoel = new THREE.Vector3(0, CAMERA.hoogte, 0);

    zetLicht(this.scene);

    this.invoer = new Invoer();
    this.geluid = new Geluid();
    this.hud = new Hud();
    this.dialoog = new Dialoog(this.geluid);
    this.paneel = new Paneel(this.geluid);

    this.schilder = new Schilder(this.renderer, 'hoog');
    this.pasMaatAan();
    addEventListener('resize', () => this.pasMaatAan());

    this.fpsMonster = [];
  }

  pasMaatAan() {
    const b = Math.max(320, innerWidth);
    const h = Math.max(240, innerHeight);
    this.renderer.setSize(b, h, false);
    this.camera.aspect = b / h;
    this.camera.updateProjectionMatrix();
    this.schilder.pasMaatAan(b, h);
  }

  async laad() {
    const [model, cupcaekModel] = await Promise.all([
      laadCaek('./assets/caek.glb'),
      laadCupcaek('./assets/cupcaek.glb'),
    ]);

    this.level = new Level(this.scene);
    this.speler = new Caek(model, this.level, this.geluid);
    this.scene.add(this.speler.groep);

    this.cupcaek = new Cupcaek(cupcaekModel);
    this.scene.add(this.cupcaek.groep);

    this.scopeCreep = new ScopeCreep();
    this.scopeCreep.hoogsteGroei = 0;
    this.scene.add(this.scopeCreep.groep);

    bouwLevel(this.level, this);

    this.speler.positie.set(1, 1, 0);
    this.speler.zetCheckpoint(1, 1);
    this.cupcaek.positie.set(-1, 0, 0.9);
  }

  /* ------------------------------------------------------------ *
   * Waarde — het hart van de game
   * ------------------------------------------------------------ */

  geefValue(punten, label) {
    this.value = Math.min(this.value + punten, WAARDE.plafond);
    this.hud.zetValue(this.value);
    this.hud.plusValue(punten);
    if (label) this.hud.kaart(label, `Value +${punten}`, 1700);
    this.geluid.waarde();

    if (!this.speler.superActief && this.energie < 1) {
      this.energie = Math.min(1, this.energie + punten * SUPERCAEK.energiePerValue);
      this.hud.zetEnergie(this.energie);
      if (this.energie >= 1) this.hud.toonSuperPrompt(true);
    }
  }

  pakIngredient(ingredient) {
    this.mand.push(ingredient);
    this.hud.zetTeller('mand', this.mand.length);
    this.geluid.pak();
    if (!ingredient.nodig) {
      this.scopeCreep.eet();
      this.scopeCreep.hoogsteGroei = Math.max(this.scopeCreep.hoogsteGroei, this.scopeCreep.gegeten);
      this.hud.kaart('SCOPE CREEP GROEIT', ingredient.naam, 1400);
      this.geluid.fout();
    }
  }

  controleerReview() {
    const klaar = this.vlaggen.gekeken && this.vlaggen.gedeeld && this.sprinkles.length > 0;
    if (klaar && !this.vlaggen.reviewCompleet) {
      this.vlaggen.reviewCompleet = true;
      this.hud.kaart('KIJKEN · DELEN · LUISTEREN', 'nu nog: kies wat je verwerkt', 2000);
    }
  }

  bevries(aan) {
    this.speler.bevroren = aan;
    if (aan) {
      this.speler.snelheid.x = 0;
      this.invoer.aan.links = this.invoer.aan.rechts = false;
    }
  }

  checkpointGehaald(c) {
    this.hud.kaart('CHECKPOINT', c.naam, 1300);
    this.geluid.klik();
  }

  /* ------------------------------------------------------------ *
   * SuperCaek — twintig seconden waarin de hele game van genre wisselt
   * ------------------------------------------------------------ */

  async startSuperCaek() {
    if (this.speler.superActief || this.energie < 1 || this.bezigMetScene) return;
    this.energie = 0;
    this.hud.zetEnergie(0);
    this.hud.toonSuperPrompt(false);

    this.bezigMetScene++;
    this.bevries(true);
    this.geluid.super();

    await this.dialoog.zeg('cupcaek', 'Broer...', { wacht: 1.1, traag: true });
    // anime-pauze: alles staat stil, de camera zoomt in
    this.superDoel = 1;
    this.schilder.zetFlits(0);
    for (let i = 0; i < 22; i++) {
      this.schilder.zetFlits(i / 22 * 0.9);
      await pauze(28);
    }
    this.speler.startSuper();
    this.hud.kaart('SUPERCAEK', 'papierrommel · onduidelijkheid · dubbel werk', 2200);
    for (let i = 22; i >= 0; i--) {
      this.schilder.zetFlits(i / 22 * 0.9);
      await pauze(24);
    }
    this.schilder.zetFlits(0);
    this.schud = 0.9;
    this.bevries(false);
    this.bezigMetScene--;
    this.dialoog.zeg('supercaek', 'DENDEREN.', { wacht: 1.4 });
  }

  /* ------------------------------------------------------------ *
   * Finale
   * ------------------------------------------------------------ */

  async finale() {
    if (this.klaar) return;
    this.klaar = true;
    this.bezigMetScene++;
    this.bevries(true);

    const oven = this.valueOven;
    // het PI-doel zelf is de grootste beloning — maar alleen als er ook
    // daadwerkelijk iets werkends is gebouwd én getoond
    if (this.vlaggen.sprintdoel && this.vlaggen.demoGegeven) {
      this.geefValue(WAARDE.piDoel, 'PI-DOEL GEREALISEERD');
      await pauze(1200);
    }
    await this.dialoog.scene([
      ['verteller', 'Caek stopt alles wat hij verzameld heeft in de Value Oven.'],
      ['verteller', 'PI-doel. Sprintresultaat. Feedback. Metrics. De demo. De samenwerking.'],
    ]);
    if (oven) oven.userData.deur.visible = true;
    await pauze(700);
    await this.dialoog.zeg('caek', '...', { wacht: 1.2 });
    this.geluid.ping();
    if (oven) oven.userData.deur.visible = false;
    await this.dialoog.zeg('verteller', 'PING.', { wacht: 1.0 });

    this.hud.toon(false);
    this.hud.toonPrompt(null);
    await toonEindscherm(this);
  }

  /* ------------------------------------------------------------ *
   * Lus
   * ------------------------------------------------------------ */

  start() {
    this.gestart = true;
    this.hud.toon(true);
    this.hud.zetValue(0);
    this.hud.zetSectie('START PI', '');
    this.invoer.toonDuimbalk(true);
    this.vorige = performance.now();
    requestAnimationFrame((t) => this.lus(t));
  }

  lus(nu) {
    requestAnimationFrame((t) => this.lus(t));
    const dt = Math.min(0.05, (nu - this.vorige) / 1000);
    this.vorige = nu;
    if (!this.gestart) return;
    this.klok += dt;

    const wasGeblokkeerd = this.invoer.geblokkeerd;
    this.invoer.geblokkeerd = this.paneel.open || this.dialoog.bezig;
    // de spatie die een tekstballon wegklikt mag geen sprong worden
    if (wasGeblokkeerd && !this.invoer.geblokkeerd) this.invoer.gedruktNu.clear();

    if (!this.klaar) this.update(dt);

    this.schilder.render(this.scene, this.camera, this.klok);
    this.invoer.spoel();
    this.meetPrestatie(dt);
  }

  update(dt) {
    const speler = this.speler;

    if (this.invoer.gedrukt('super')) this.startSuperCaek();

    speler.update(dt, this.invoer);
    this.cupcaek.update(dt, speler);
    this.scopeCreep.update(dt, speler);
    this.level.update(dt, speler, this);

    // Scope Creep pikt iets uit je mand
    if (this.scopeCreep.raaktSpeler(speler) && this.mand.length) {
      const idx = this.mand.findIndex((i) => !i.nodig);
      const weg = this.mand.splice(idx >= 0 ? idx : 0, 1)[0];
      this.hud.zetTeller('mand', this.mand.length);
      this.hud.raak('caek');
      this.geluid.fout();
      speler.snelheid.x = -Math.sign(this.scopeCreep.x - speler.x || 1) * 9;
      speler.snelheid.y = 7;
      speler.onbeweeglijkTot = speler.klok + 0.22;
      this.hud.kaart('SCOPE CREEP HAPT', weg.naam, 1200);
    }

    // vallen
    if (speler.positie.y < NATUURKUNDE.dodelijkeHoogte) this.plop();

    // interactie
    const dichtstbij = this.level.dichtsteInteractie(speler);
    this.hud.toonPrompt(this.bezigMetScene || this.dialoog.bezig || this.paneel.open ? null : dichtstbij?.label);
    if (dichtstbij && this.invoer.gedrukt('actie') && !this.bezigMetScene) {
      if (dichtstbij.eenmalig) dichtstbij.klaar = true;
      this.bezigMetScene++;
      Promise.resolve(dichtstbij.doe(this))
        .catch((e) => console.error('interactie mislukt', e))
        .finally(() => { this.bezigMetScene--; });
    }

    this.werkCameraBij(dt);
    this.werkSuperBij(dt);
  }

  plop() {
    this.plops++;
    this.speler.herstel();
    this.geluid.plop();
    this.hud.raak('caek');
    this.hud.kaart('PLOP.', 'Kleine bijstelling.', 1400);
  }

  werkCameraBij(dt) {
    const speler = this.speler;
    const soepel = Math.min(1, dt * CAMERA.volgSoepel);
    const vooruit = CAMERA.vooruit * speler.kijkt;
    this.cameraDoel.x += (speler.x + vooruit - this.cameraDoel.x) * soepel;
    this.cameraDoel.y += (Math.max(speler.y, -2) + CAMERA.hoogte - this.cameraDoel.y) * soepel * 0.8;

    const zoom = CAMERA.afstand - this.superMengsel * CAMERA.superZoom;
    this.camera.position.set(this.cameraDoel.x, this.cameraDoel.y, zoom);

    if (this.schud > 0) {
      this.schud = Math.max(0, this.schud - dt * 1.8);
      const k = this.schud * this.schud * 0.55;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
    }
    this.camera.lookAt(this.cameraDoel.x, this.cameraDoel.y - 1.2, 0);
  }

  werkSuperBij(dt) {
    this.superDoel = this.speler.superActief ? 1 : 0;
    const snelheid = this.superDoel > this.superMengsel ? 5 : 1.6;
    this.superMengsel += (this.superDoel - this.superMengsel) * Math.min(1, dt * snelheid);
    if (Math.abs(this.superMengsel - this.superDoel) < 0.002) this.superMengsel = this.superDoel;
    this.schilder.zetSuper(this.superMengsel);
    if (this.speler.superActief) this.schud = Math.max(this.schud, 0.12);
  }

  /** Zakt de framerate weg, dan één stap terug in beeldkwaliteit. */
  meetPrestatie(dt) {
    if (this.kwaliteitVast) return;
    this.fpsMonster.push(dt);
    if (this.fpsMonster.length < 90) return;
    const gemiddeld = this.fpsMonster.reduce((a, b) => a + b, 0) / this.fpsMonster.length;
    this.fpsMonster.length = 0;
    const fps = 1 / gemiddeld;
    const trap = ['hoog', 'midden', 'laag', 'uit'];
    const nu = trap.indexOf(this.schilder.kwaliteitNaam);
    if (fps < 26 && nu < trap.length - 1) {
      this.schilder.zetKwaliteit(trap[nu + 1]);
      console.info(`CAEK: ${Math.round(fps)} fps — beeldkwaliteit terug naar "${trap[nu + 1]}"`);
    }
  }
}

/* ================================================================== *
 * Opstarten
 * ================================================================== */

async function begin() {
  const canvas = document.querySelector('#scherm');
  const startKnop = document.querySelector('#start-knop');
  const startScherm = document.querySelector('#startscherm');
  const kwaliteitKeuze = document.querySelector('#kwaliteit');
  const geluidVinkje = document.querySelector('#geluid');

  let spel;
  try {
    spel = new Spel(canvas);
    window.CAEK = spel;   // handig bij het finetunen van de stijl
    await spel.laad();
  } catch (fout) {
    console.error(fout);
    startKnop.textContent = 'de oven is stuk';
    startKnop.disabled = true;
    const p = document.createElement('p');
    p.style.cssText = 'margin-top:1em;color:#f2799f;font-size:14px';
    p.textContent = `Er ging iets mis bij het laden: ${fout.message}`;
    startScherm.querySelector('.start-doos').appendChild(p);
    return;
  }

  startKnop.disabled = false;
  startKnop.textContent = 'START DE PI';

  kwaliteitKeuze.addEventListener('change', () => {
    const keuze = kwaliteitKeuze.value;
    spel.kwaliteitVast = keuze !== 'auto';
    spel.schilder.zetKwaliteit(keuze === 'auto' ? 'hoog' : keuze);
  });
  geluidVinkje.addEventListener('change', () => spel.geluid.zetAan(geluidVinkje.checked));

  const starten = () => {
    spel.geluid.ontgrendel();
    spel.geluid.zetAan(geluidVinkje.checked);
    startScherm.classList.add('weg');
    setTimeout(() => { startScherm.hidden = true; }, 650);
    spel.start();
  };
  startKnop.addEventListener('click', starten);
  addEventListener('keydown', (e) => {
    if (!spel.gestart && (e.code === 'Space' || e.code === 'Enter')) starten();
  }, { once: false });
}

begin();

// nette melding als WebGL2 ontbreekt in plaats van een zwart scherm
addEventListener('error', (e) => {
  if (String(e.message).includes('WebGL')) {
    document.querySelector('#start-knop').textContent = 'geen WebGL beschikbaar';
  }
});
