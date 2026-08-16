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
import { laadVloer } from './world/vloer.js';
import { bouwLevel } from './game/level/index.js';
import { laadCaek, laadKarakter, Caek } from './game/caek.js';
import { Cupcaek, laadCupcaek } from './game/cupcaek.js';
import { startSuperCaek } from './game/level/inspect.js';
import { laadSprites, SpritePoppetje } from './game/sprite.js';
import { ScopeCreep } from './game/scopecreep.js';
import { Hud } from './ui/hud.js';
import { Dialoog, pauze } from './ui/dialoog.js';
import { Paneel } from './ui/paneel.js';
import { toonEindscherm } from './ui/eindscherm.js';
import { CAMERA, NATUURKUNDE, PI, SCHAKELS, SECTIES, SUPERCAEK, WAARDE } from './config.js';

class Spel {
  constructor(canvas) {
    this.canvas = canvas;
    this.klok = 0;
    this.value = 0;
    this.mand = [];
    this.metrics = [];
    this.sprinkles = [];
    this.schakelaars = new Set();
    this.vlaggen = {};
    this.plops = 0;
    this.rommelKapot = 0;
    this.rommelTotaal = 0;
    this.bezigMetScene = 0;
    this.superMengsel = 0;
    this.superDoel = 0;
    this.superKlaar = false;
    this.schud = 0;
    this.gestart = false;
    this.klaar = false;

    // Het Doelenwiel is de enige voortgangsmeter. Het strategische doel van
    // deze PI brandt vanaf het begin; de rest komt er per Cluster Review bij.
    this.gekoppeld = new Set([PI.strategisch]);
    this.sprintsAf = new Set();
    this.reviewsBezocht = new Set();
    this.wielen = [];       // alle Doelenwielen in de wereld

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
    this.level = new Level(this.scene);
    // de vloertextuur moet er zijn vóór het bouwen: platform() kijkt bij het
    // maken of hij bestaat en kiest daar zijn opbouw op
    await laadVloer();
    if (SCHAKELS.sprites) await this.#laadSprites();
    else await this.#laadModellen();

    this.scopeCreep = new ScopeCreep();
    this.scopeCreep.hoogsteGroei = 0;
    this.scene.add(this.scopeCreep.groep);

    bouwLevel(this.level, this);

    this.speler.positie.set(1, 1, 0);
    this.speler.zetCheckpoint(1, 1);
    this.cupcaek.positie.set(-1, 0, 0.9);
  }

  /** De getekende karakters. */
  async #laadSprites() {
    const [caek, cup, super_] = await Promise.all([
      laadSprites('caek'), laadSprites('cupcaek'), laadSprites('supercaek'),
    ]);

    const poppetje = new SpritePoppetje(caek);
    this.speler = new Caek(null, this.level, this.geluid, { poppetje });
    this.speler.gewoneSprites = caek;
    this.speler.superSprites = super_;
    this.scene.add(this.speler.groep);

    this.cupcaek = new Cupcaek(null, { poppetje: new SpritePoppetje(cup) });
    this.scene.add(this.cupcaek.groep);
  }

  /** De oude 3D-weg. Blijft staan zodat de keuze omkeerbaar is. */
  async #laadModellen() {
    const [model, cupcaekModel, superModel] = await Promise.all([
      laadCaek('./assets/caek.glb'),
      laadCupcaek('./assets/cupcaek.glb'),
      laadKarakter('./assets/supercaek.glb', NATUURKUNDE.spelerHoogte * SUPERCAEK.hoogteFactor)
        .catch((fout) => { console.warn('SuperCaek-model niet geladen:', fout.message); return null; }),
    ]);

    this.speler = new Caek(model, this.level, this.geluid);
    this.speler.zetSuperModel(superModel);
    this.scene.add(this.speler.groep);

    this.cupcaek = new Cupcaek(cupcaekModel);
    this.scene.add(this.cupcaek.groep);
  }

  /* ------------------------------------------------------------ *
   * Waarde — het hart van de game
   * ------------------------------------------------------------ */

  /**
   * Waarde komt alleen van acties die aan het PI-doel bijdragen. Rondrennen
   * en spullen verzamelen levert niets op -- dat is het punt.
   *
   * Er is geen balk meer: het getal zie je pas bij Inspect & Adapt, naast wat
   * er beloofd was. Tussendoor krijg je een gouden +N die opstijgt.
   */
  geefValue(punten, label) {
    this.value = Math.min(this.value + punten, WAARDE.plafond);
    this.hud.plusValue(punten);
    if (label) this.hud.kaart(label, `Value +${punten}`, 1700);
    this.geluid.waarde();
  }

  /** Hang een teamdoel aan een segment van het Doelenwiel. */
  koppelDoel(doelId) {
    const nieuw = !this.gekoppeld.has(doelId);
    this.gekoppeld.add(doelId);
    this.hud.zetWiel(this.gekoppeld, doelId);
    if (nieuw) this.geluid.ping();

    // elk 3D-wiel in de wereld licht mee op, ook die van eerdere reviews:
    // wat eenmaal gekoppeld is blijft gekoppeld
    for (const wiel of this.wielen) {
      for (const segment of wiel.children) {
        if (segment.userData?.doel !== doelId || !segment.material?.emissive) continue;
        // niet klonen: maskeerEigen() heeft elk segment al zijn eigen
        // materiaal gegeven, en een kloon zou het verfmasker kwijtraken
        segment.material.emissive.setHex(0xffd873).multiplyScalar(0.75);
      }
    }
  }

  /** Sprint N is afgerond. */
  rondSprintAf(nummer) {
    this.sprintsAf.add(nummer);
    this.vlaggen[`sprint${nummer}`] = true;
    this.hud.streepSprintdoelDoor();
  }

  bezoekReview(nummer) {
    this.reviewsBezocht.add(nummer);
  }

  /**
   * Het wiel is vol: alles trekt aan dezelfde doelen. Pas dan verschijnt
   * SuperCaek -- niet omdat je hard gewerkt hebt, maar omdat het cluster er
   * allemaal staat. Dat is wat een mascotte hoort te betekenen.
   */
  ontgrendelSuperCaek() {
    if (this.superKlaar) return;
    this.superKlaar = true;
    this.hud.toonSuperPrompt(true);
    this.hud.kaart('HET WIEL IS VOL', 'druk op Shift', 2600);
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
   * Finale — eerst sluit de PI, dan pas het woord
   * ------------------------------------------------------------ */

  async finale() {
    if (this.klaar) return;
    this.klaar = true;
    this.bezigMetScene++;
    this.bevries(true);

    const oven = this.slotOven;
    // het PI-doel zelf is de grootste beloning — maar alleen als er ook
    // daadwerkelijk iets werkends is gebouwd én getoond
    if (this.vlaggen.sprint1 && this.vlaggen.demoGegeven) {
      this.geefValue(WAARDE.piDoel, 'PI-DOEL GEREALISEERD');
      await pauze(1200);
    }
    await this.dialoog.scene([
      ['verteller', 'Caek zet alles wat er dit kwartaal gemaakt is in de oven.'],
      ['verteller', 'Vier sprintresultaten. Een keten die rondloopt. Metingen. Feedback. Een demo.'],
      ['verteller', 'En zeventien teams die er elke keer stonden.'],
    ]);
    if (oven) oven.userData.deur.visible = true;
    await pauze(700);
    await this.dialoog.zeg('caek', '...', { wacht: 1.2 });
    this.geluid.ping();
    if (oven) oven.userData.deur.visible = false;
    await this.dialoog.zeg('verteller', 'PING.', { wacht: 1.0 });

    // de camera zoomt uit en de volgende PI komt in zicht: geen einde, maar
    // "het gaat door" — dat is de goede noot voor een afscheid
    await this.zoomUit();

    this.hud.toon(false);
    this.hud.toonPrompt(null);
    await toonEindscherm(this);
  }

  /** Uitzoomen tot het hele kwartaal in beeld past. */
  async zoomUit() {
    this.uitzoomen = true;
    await this.dialoog.zeg('cupcaek', 'Kijk eens achterom.', { wacht: 1.4 });
    let t = 0;
    await new Promise((klaar) => {
      const stap = () => {
        t += 1 / 60;
        this.uitzoomAfstand = CAMERA.afstand + Math.min(1, t / 3.2) * 26;
        if (t < 3.4) requestAnimationFrame(stap);
        else klaar();
      };
      stap();
    });
    await this.dialoog.scene([
      ['verteller', 'De PI sluit. En daarachter begint de volgende alweer.'],
      ['cupcaek', 'Dat is geen dreiging. Dat is het ritme.'],
    ]);
  }

  /* ------------------------------------------------------------ *
   * Lus
   * ------------------------------------------------------------ */

  start() {
    this.gestart = true;
    this.hud.toon(true);
    this.hud.zetWiel(this.gekoppeld);
    this.hud.zetSectie(SECTIES[0].naam, 'Neem het PI-doel mee');
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

    if (!this.klaar) {
      this.update(dt);
    } else {
      // tijdens de finale staat de speler stil, maar de wereld draait door:
      // ovens, wiel en publiek blijven leven terwijl de camera uitzoomt
      this.level.update(dt, this.speler, this);
      this.cupcaek.update(dt, this.speler);
      this.speler.mixer.update(dt);
      this.werkCameraBij(dt);
    }

    this.schilder.render(this.scene, this.camera, this.klok);
    this.invoer.spoel();
    this.meetPrestatie(dt);
  }

  update(dt) {
    const speler = this.speler;

    if (this.invoer.gedrukt('super')) startSuperCaek(this);

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

    const basis = this.uitzoomAfstand ?? CAMERA.afstand;
    const zoom = basis - this.superMengsel * CAMERA.superZoom;
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

  /**
   * Beeldkwaliteit die zichzelf bijstelt.
   *
   * Twee kanten op, en snel: een halve seconde meten is genoeg om te weten of
   * het stroef loopt, en drie seconden wachten terwijl het schokt is drie
   * seconden te lang. Omhoog gaat behoedzamer dan omlaag, anders gaat hij
   * tussen twee trappen zitten pendelen.
   */
  meetPrestatie(dt) {
    if (this.kwaliteitVast) return;
    this.fpsMonster.push(dt);
    if (this.fpsMonster.length < 30) return;
    const gemiddeld = this.fpsMonster.reduce((a, b) => a + b, 0) / this.fpsMonster.length;
    this.fpsMonster.length = 0;
    const fps = 1 / gemiddeld;
    // 'uit' zit er met opzet niet in: dat is kale 3D, en dan is de hele stijl
    // weg. Wie dat wil kiest het zelf in het startscherm.
    const trap = ['hoog', 'midden', 'laag'];
    const nu = trap.indexOf(this.schilder.kwaliteitNaam);
    if (nu < 0) return;

    if (fps < 48 && nu < trap.length - 1) {
      this.schilder.zetKwaliteit(trap[nu + 1]);
      this.rustig = 0;
      console.info(`CAEK: ${Math.round(fps)} fps — beeldkwaliteit terug naar "${trap[nu + 1]}"`);
      return;
    }
    // pas omhoog na een paar rustige metingen achter elkaar
    if (fps > 58 && nu > 0) {
      this.rustig = (this.rustig || 0) + 1;
      if (this.rustig >= 6) {
        this.rustig = 0;
        this.schilder.zetKwaliteit(trap[nu - 1]);
        console.info(`CAEK: ${Math.round(fps)} fps — beeldkwaliteit omhoog naar "${trap[nu - 1]}"`);
      }
    } else {
      this.rustig = 0;
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
