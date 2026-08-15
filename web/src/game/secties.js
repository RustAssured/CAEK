/* CAEK — het level, sectie voor sectie.
 *
 *   0. PI Planning Oven      het recept, het Doelenwiel, richting
 *   1. Sprint 1              ingrediënten en Scope Creep
 *   2. Metriekenlab          meten -> begrijpen -> aanpassen
 *   3. Dependency Pretzel    drie schakelaars, één brug
 *   4. Cluster Review        kijken, delen, luisteren
 *   5. De Demo               PowerPoint of laten zien
 *   6. Value Oven            alles erin, en wat komt eruit
 *
 * Tussendoor de kleine chaos: BAU, technical debt, een impediment, een
 * priority change en een kort overleg van vijfenzeventig minuten. */

import * as THREE from 'three';
import * as props from '../world/props.js';
import { PALET, verf, gloed } from '../world/materialen.js';
import {
  SECTIES, PI, DOELENWIEL, INGREDIENTEN, METRICS, SCHAKELAARS, SPRINKLES, WAARDE,
} from '../config.js';

const bij = (id) => SECTIES.find((s) => s.id === id).x;

/**
 * @param {import('../world/level.js').Level} level
 * @param {object} spel  de Spel-instantie uit main.js
 */
export function bouwLevel(level, spel) {
  decor(level);
  sectieStart(level, spel);
  sectieSprint(level, spel);
  sectieMetrics(level, spel);
  sectiePretzel(level, spel);
  sectieReview(level, spel);
  sectieDemo(level, spel);
  sectieOven(level, spel);
  sectiekaarten(level, spel);
}

/* ================================================================== *
 * Decor: achtergrond, cipressen, lantaarns
 * ================================================================== */

function decor(level) {
  const achter = props.achtergrondBakkerij(420, 7);
  level.plaats(achter, 180, 0, 0);

  for (let x = 6; x < 356; x += 27) {
    const boom = props.cipres(7 + (x % 5));
    level.plaats(boom, x + (x % 7), -0.4, -9 - (x % 4));
  }
  for (let x = 14; x < 356; x += 19) {
    level.plaats(props.lantaarn(4.6), x, 0, -3.4);
  }
}

/* ================================================================== *
 * Sectie 0 — DE PI PLANNING OVEN
 * ================================================================== */

function sectieStart(level, spel) {
  const x0 = bij('start');
  level.grond(-6, x0 + 44, 0, PALET.steen);

  // de planningoven zelf: hij warmt op, er is nog niets gebakken
  const oven = props.oven(1.15, { tekst: 'PI PLANNING' });
  level.plaats(oven, x0 + 8, 0, -6);
  level.tik((dt, speler, s) => {
    oven.userData.vuur.material = gloed(PALET.oranje, 1.4 + Math.sin(s.klok * 3) * 0.5);
  });

  // het Doelenwiel, groot en zwevend: de ruggengraat van de hele game
  const wiel = props.doelenwiel(DOELENWIEL, PI.strategisch, 4.2);
  wiel.position.set(x0 + 20, 9.5, -7);
  level.scene.add(wiel);
  level.tik((dt, speler, s) => {
    wiel.rotation.z = Math.sin(s.klok * 0.25) * 0.06;
    wiel.position.y = 9.5 + Math.sin(s.klok * 0.7) * 0.22;
  });
  spel.wiel3d = wiel;

  // de gouden lijn strategisch doel -> PI-doel -> Caek
  const lijn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1, 6),
    gloed(PALET.goudLicht, 1.8),
  );
  lijn.visible = false;
  level.scene.add(lijn);
  spel.gouddraad = lijn;
  level.tik((dt, speler) => {
    if (!lijn.visible) return;
    const van = new THREE.Vector3(x0 + 20, 9.5, -7);
    const naar = new THREE.Vector3(speler.x, speler.y + 1.4, 0);
    const midden = van.clone().add(naar).multiplyScalar(0.5);
    lijn.position.copy(midden);
    lijn.scale.y = van.distanceTo(naar);
    lijn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), naar.clone().sub(van).normalize());
  });

  level.plaats(props.bord(['PI PLANNING', 'OVEN']), x0 + 3, 0, 2.2);

  // het recept oppakken
  const recept = props.doos(2.2, 2.8, 0.14, PALET.papier, { emissief: 0.5 });
  recept.rotation.z = -0.12;
  const receptGroep = new THREE.Group();
  receptGroep.add(recept);
  const receptLabel = props.label(['PI', 'RECEPT'], { breedte: 2.0, kleur: '#0b1640', grootte: 62 });
  receptLabel.position.z = 0.12;
  receptGroep.add(receptLabel);
  level.plaats(receptGroep, x0 + 27, 2.4, 0.4);
  level.tik((dt, speler, s) => {
    if (spel.vlaggen.receptGepakt) return;
    receptGroep.position.y = 2.4 + Math.sin(s.klok * 1.6) * 0.2;
    receptGroep.rotation.z = Math.sin(s.klok * 0.9) * 0.08;
  });

  level.interactie({
    x: x0 + 27, y: 2.4, straal: 3,
    label: 'neem het PI-doel mee',
    async doe(s) {
      s.vlaggen.receptGepakt = true;
      s.geluid.waarde();
      receptGroep.visible = false;
      lijn.visible = true;
      await s.dialoog.scene([
        ['verteller', 'PI RECEPT ONTVANGEN'],
        ['verteller', `Strategisch doel: ${PI.strategischNaam}.`],
        ['verteller', `PI-doel: ${PI.doel}`],
        ['caek', 'Dit past niet in mijn rugzak.'],
        ['cupcaek', 'Het past wel. Het past alleen niet meteen.'],
      ]);
      s.hud.zetSectie('SPRINT 1', 'Maak de eerste werkende basis');
      s.hud.kaart('NEEM HET PI-DOEL MEE', 'en loop naar rechts');
      setTimeout(() => { lijn.visible = false; }, 4000);
    },
  });

  level.checkpoint(x0 + 30, 0, 'START PI');

  // openingsscene
  level.zone(0, 4, async (s) => {
    s.bevries(true);
    await s.dialoog.scene([
      ['verteller', 'De oven warmt op. Overal vliegen kaartjes, doelen en ingrediënten voorbij.'],
      ['cupcaek', 'Broer! Het PI-recept is er!'],
      ['caek', 'Al?'],
      ['cupcaek', 'Het staat er nog niet helemaal op. Dat hoort zo.'],
      ['verteller', 'Aan het begin van een PI weet je wát je wilt bereiken. Nog niet precies hoe.'],
    ]);
    s.bevries(false);
    s.hud.kaart('DE PI PLANNING OVEN', 'pak het gloeiende receptenkaartje');
  });

  // een paar tussenplatforms zodat er ook echt gesprongen wordt
  level.platform(x0 + 34, 2.6, 3.6);
  level.platform(x0 + 39.5, 4.4, 3.2);
}

/* ================================================================== *
 * Sectie 1 — SPRINT 1: MAAK HET BESLAG
 * ================================================================== */

function sectieSprint(level, spel) {
  const x0 = bij('sprint');
  level.grond(x0, x0 + 30, 0, PALET.steen);
  level.grond(x0 + 34, x0 + 62, 0, PALET.steen);
  level.platform(x0 + 32, 2.4, 3.4);

  level.plaats(props.bord(['SPRINTDOEL', 'werkende basis'], { breedte: 4.2, grootte: 46 }), x0 + 2, 0, 2.4);

  // Scope Creep wordt hier wakker
  level.zone(x0 + 3, x0 + 6, (s) => {
    s.scopeCreep.wakker(s.speler.x - 11, 0);
    s.cupcaek.gezicht('streng');
    s.dialoog.scene([
      ['verteller', 'Er rolt iets kleins en schattigs achter je aan.'],
      ['scopecreep', 'Kan dit er misschien ook nog bij?'],
      ['cupcaek', 'Niet aankijken. Dan groeit hij.'],
    ]);
  });

  // ingrediënten — vijf horen bij het sprintdoel, vier absoluut niet
  const posities = [
    [x0 + 8, 1.6], [x0 + 13, 3.4], [x0 + 17, 1.6], [x0 + 22, 4.2], [x0 + 27, 1.6],
    [x0 + 11, 5.6], [x0 + 20, 1.6], [x0 + 38, 4.8], [x0 + 44, 1.6],
  ];
  const volgorde = [
    'techniek', 'portaal', 'business', 'rapport', 'data',
    'knop', 'samenwerking', 'migratie', 'gebruikers',
  ];
  volgorde.forEach((id, i) => {
    const ing = INGREDIENTEN.find((n) => n.id === id);
    const [x, y] = posities[i];
    const object = props.ingredient(ing.emoji, ing.nodig ? PALET.goudLicht : PALET.roze);
    level.plaats(object, x, y, 0.3);
    level.tik((dt, speler, s) => {
      object.position.y = y + Math.sin(s.klok * 2 + i) * 0.18;
      object.rotation.y += dt * 1.1;
      object.userData.halo.rotation.x += dt * 2;
    });
    level.pickup({
      x, y, straal: 1.5,
      doe(s) {
        object.visible = false;
        s.pakIngredient(ing);
      },
    });
  });

  // wat platforms om bij de hoge ingrediënten te komen
  level.platform(x0 + 11, 4.0, 3.0);
  level.platform(x0 + 13, 2.0, 2.6);
  level.platform(x0 + 22, 2.6, 3.0);
  level.platform(x0 + 38, 3.2, 3.4);

  // ---- het sorteerbord ----
  const sorteerbord = props.bord(['WAT DRAAGT BIJ', 'AAN HET SPRINTDOEL?'], { breedte: 5.4, hoogte: 2.2, grootte: 44 });
  level.plaats(sorteerbord, x0 + 50, 0, 1.6);

  level.interactie({
    x: x0 + 50, y: 1.5, straal: 3.2, eenmalig: false,
    label: 'sorteer je mand',
    async doe(s) {
      if (s.mand.length === 0) {
        await s.dialoog.zeg('cupcaek', 'Je mand is leeg. Ook een keuze.');
        return;
      }
      const overbodig = s.mand.filter((i) => !i.nodig);
      const gekozen = await s.paneel.vink(
        'Wat draagt bij aan het sprintdoel?',
        'Sprintdoel: <b>maak de eerste werkende basis</b>. Vink aan wat je uit je mand gooit.',
        s.mand.map((i) => ({ label: i.naam, icoon: i.emoji, waarde: i.id })),
        'Gooi eruit',
      );
      const eruit = s.mand.filter((i) => gekozen.has(i.id));
      const foutWeg = eruit.filter((i) => i.nodig);
      const goedWeg = eruit.filter((i) => !i.nodig);

      s.mand = s.mand.filter((i) => !gekozen.has(i.id));
      s.hud.zetTeller('mand', s.mand.length);

      if (foutWeg.length) {
        s.geluid.fout();
        await s.dialoog.zeg('cupcaek', `Je hebt ${foutWeg[0].naam} weggegooid. Die hadden we juist nodig.`);
      }
      if (goedWeg.length) {
        s.geluid.waarde();
        s.scopeCreep.krimp();
        s.cupcaek.gezicht('blij');
        await s.dialoog.scene([
          ['verteller', `${goedWeg.length}× werk dat niet aan het sprintdoel bijdraagt: eruit.`],
          ['scopecreep', '...oké.'],
          ['cupcaek', 'Kijk. Hij krimpt.'],
        ]);
      } else if (overbodig.length && !goedWeg.length) {
        await s.dialoog.zeg('cupcaek', 'Er zit nog van alles in dat niets met het sprintdoel te maken heeft.');
      }
      s.vlaggen.gesorteerd = true;
    },
  });

  // ---- het sprintoventje ----
  const oventje = props.oven(0.55, { tekst: 'SPRINT 1' });
  level.plaats(oventje, x0 + 58, 0, -2.5);
  level.interactie({
    x: x0 + 58, y: 1.5, straal: 3.4,
    label: 'bak het sprintresultaat',
    async doe(s) {
      const nodig = s.mand.filter((i) => i.nodig).length;
      if (nodig < 3) {
        await s.dialoog.scene([
          ['cupcaek', `Met ${nodig} van de vijf ingrediënten wordt dit geen werkende basis.`],
          ['cupcaek', 'Ga terug. Ze liggen er nog.'],
        ]);
        return;
      }
      if (s.mand.some((i) => !i.nodig)) {
        await s.dialoog.scene([
          ['caek', 'Ik gooi er gewoon alles in.'],
          ['cupcaek', 'Dan bak je alles behalve het sprintdoel. Eerst sorteren, bij het bord.'],
        ]);
        return;
      }
      s.geluid.ping();
      await s.dialoog.zeg('verteller', 'PING.', { wacht: 0.9 });
      const taart = props.taartje(PALET.goud);
      level.plaats(taart, x0 + 60.5, 0, 0.9);
      s.sprintresultaat = taart;
      s.geefValue(WAARDE.sprintdoel, 'SPRINTDOEL BEREIKT');
      s.hud.streepSprintdoelDoor();
      s.vlaggen.sprintdoel = true;
      await s.dialoog.scene([
        ['verteller', 'Er komt een mini-CAEK uit. Niet perfect. Wel bruikbaar.'],
        ['cupcaek', 'Bruikbaar is een compliment.'],
      ]);
    },
  });

  level.checkpoint(x0 + 62, 0, 'SPRINTDOEL');

  // ---- kleine chaos: BAU ----
  const band = props.lopendeBand(16);
  level.plaats(band, x0 + 70, 5.6, -1);
  level.plaats(props.bord('BAU', { breedte: 2.2, hoogte: 1.2, grootte: 64 }), x0 + 63, 4.4, 1.4);
  level.platform(x0 + 64, 1.6, 3.0);
  level.grond(x0 + 66, x0 + 80, 0, PALET.steen);

  const broodjes = [];
  for (let i = 0; i < 7; i++) {
    const b = props.broodje();
    level.plaats(b, x0 + 62 + i * 2.6, 6.1, -1);
    broodjes.push(b);
  }
  level.tik((dt, speler, s) => {
    for (const b of broodjes) {
      b.position.x -= dt * 5.5;
      b.rotation.x -= dt * 6;
      if (b.position.x < x0 + 62) b.position.x = x0 + 80;
      // een broodje dat op je kop valt: geen schade, wel oponthoud
      if (Math.abs(b.position.x - speler.x) < 0.9 && Math.abs(speler.y + 2 - b.position.y) < 1.2) {
        speler.snelheid.x *= 0.4;
      }
    }
  });
  level.platform(x0 + 68, 3.0, 3.2);
  level.platform(x0 + 73, 3.0, 3.2);

  level.zone(x0 + 66, x0 + 68, (s) => {
    s.dialoog.zeg('cupcaek', 'BAU. Je kunt hem niet stoppen. Je moet er gewoon tussendoor blijven bewegen.');
  });
}

/* ================================================================== *
 * Sectie 2 — HET METRIEKENLABORATORIUM
 * ================================================================== */

function sectieMetrics(level, spel) {
  const x0 = bij('metrics');
  level.grond(x0 - 8, x0 + 40, 0, PALET.blauw);
  level.platform(x0 + 42, 1.6, 3.4);
  level.plaats(props.bord(['HOE GAAT HET', 'EIGENLIJK?'], { breedte: 5, hoogte: 2, grootte: 50 }), x0 + 2, 0, 2.2);

  // technical debt: negeren mag, maar dan komt het terug
  const rooster = props.broodrooster();
  level.plaats(rooster, x0 - 4, 0, 1.2);
  level.plaats(props.label('TECHNICAL DEBT', { breedte: 3.6, grootte: 44, plaat: true }), x0 - 4, 2.9, 1.2);
  level.interactie({
    x: x0 - 4, y: 1.2, straal: 2.6,
    label: 'de aanslag eraf halen',
    async doe(s) {
      s.vlaggen.debtOpgelost = true;
      s.geluid.pak();
      rooster.children.forEach((k) => { if (k.material?.color?.getHex() === PALET.korst) k.visible = false; });
      s.geefValue(WAARDE.technicalDebt, 'TECHNICAL DEBT OPGERUIMD');
      await s.dialoog.zeg('cupcaek', 'Scheelt straks brandende toast.');
    },
  });

  // de drie meetinstrumenten
  const plekken = [[x0 + 8, 1.9], [x0 + 14, 4.4], [x0 + 20, 1.9]];
  METRICS.forEach((metric, i) => {
    const [x, y] = plekken[i];
    const object = props.meetinstrument(metric.id);
    level.plaats(object, x, y, 0.4);
    level.tik((dt, speler, s) => {
      object.position.y = y + Math.sin(s.klok * 1.7 + i * 2) * 0.14;
      if (object.userData.wijzer) object.userData.wijzer.rotation.z = Math.sin(s.klok * 2.4) * 0.9;
    });
    level.pickup({
      x, y, straal: 1.7,
      async doe(s) {
        object.visible = false;
        s.metrics.push(metric);
        s.hud.zetTeller('metrics', s.metrics.length);
        s.geluid.pak();
        await s.dialoog.zeg('verteller', `${metric.naam}: ${metric.meting}`);
        if (s.metrics.length === 3) {
          await s.dialoog.scene([
            ['cupcaek', 'We hoeven niet nóg harder te bakken.'],
            ['cupcaek', 'Misschien staat de oven gewoon verkeerd.'],
          ]);
        }
      },
    });
  });
  level.platform(x0 + 14, 3.0, 3.2);

  // drie deuren; alleen de deur waar de data naar wijst gaat open
  const deuren = [
    { id: 'groot', tekst: ['MEER', 'BOUWEN'], x: x0 + 32, kleur: PALET.goud },
    { id: 'klein', tekst: ['STAP 3', 'FIXEN'], x: x0 + 36, kleur: PALET.groen },
    { id: 'dashboard', tekst: ['NOG EEN', 'DASHBOARD'], x: x0 + 40, kleur: PALET.paars },
  ];
  const muurBlok = level.voegMuur(x0 + 30, x0 + 41, 0, 8);

  for (const d of deuren) {
    const object = props.deur(d.tekst, 2.6, 5);
    object.userData.blad.material = verf(d.kleur, { emissief: 0.2 });
    level.plaats(object, d.x, 0, -1.4);
    d.object = object;
  }
  // de grote glimmende route is groter en glimmender
  deuren[0].object.scale.set(1.4, 1.25, 1);
  deuren[0].object.position.y = 0;

  level.interactie({
    x: x0 + 28.5, y: 1.6, straal: 3.4, eenmalig: false,
    label: 'kies een route',
    async doe(s) {
      if (s.metrics.length < 3) {
        await s.dialoog.scene([
          ['caek', 'Ik neem gewoon de grote glimmende.'],
          ['cupcaek', 'Zullen we eerst even kijken hoe het écht gaat?'],
        ]);
        return;
      }
      const keuze = await s.paneel.kies(
        'De data zegt',
        s.metrics.map((m) => `<b>${m.naam}:</b> ${m.meting}`).join('<br>'),
        [
          { label: 'De grote glimmende route', onder: 'meer bouwen, meer opleveren', icoon: '✨', waarde: 'groot' },
          { label: 'Het kleine onooglijke pad', onder: 'naar de plek waar ketenpartners vastlopen', icoon: '🧭', waarde: 'klein' },
          { label: 'Nog een dashboard maken', onder: 'dan weten we het pas écht zeker', icoon: '📊', waarde: 'dashboard' },
        ],
      );
      if (keuze === 'klein') {
        s.geluid.waarde();
        const deur = deuren[1].object;
        deur.userData.blad.visible = false;
        muurBlok.x0 = x0 + 100;   // de weg is vrij
        muurBlok.x1 = x0 + 100;
        s.geefValue(WAARDE.metrics, 'METRICS GEBRUIKT');
        await s.dialoog.scene([
          ['verteller', 'Meten → begrijpen → aanpassen.'],
          ['cupcaek', 'Niet: meten → dashboard maken → klaar.'],
        ]);
      } else if (keuze === 'groot') {
        s.geluid.fout();
        await s.dialoog.scene([
          ['verteller', 'De grote deur rammelt en blijft dicht.'],
          ['cupcaek', 'Die route bouwt meer van wat al niet gebruikt wordt.'],
        ]);
      } else {
        s.geluid.fout();
        await s.dialoog.scene([
          ['caek', 'Nog één dashboard erbij?'],
          ['cupcaek', 'We hébben de meting al. Nu moeten we er iets mee doen.'],
        ]);
      }
    },
  });

  level.checkpoint(x0 + 42, 0, 'METRICS');
}

/* ================================================================== *
 * Sectie 3 — DE DEPENDENCY PRETZEL
 * ================================================================== */

function sectiePretzel(level, spel) {
  const x0 = bij('pretzel');
  level.grond(x0 - 12, x0 + 16, 0, PALET.blauw);
  level.grond(x0 + 34, x0 + 52, 0, PALET.blauw);

  const knoop = props.pretzel(3.4);
  level.plaats(knoop, x0 + 25, 8.5, -5);
  level.plaats(props.label('THE DEPENDENCY PRETZEL', { breedte: 8, grootte: 46, plaat: true }), x0 + 25, 13.5, -5);
  level.tik((dt, speler, s) => {
    if (spel.vlaggen.pretzelOpgelost) return;
    knoop.rotation.y += dt * 0.28;
    knoop.rotation.z = Math.sin(s.klok * 0.6) * 0.12;
  });

  // kabels kriskras: trek aan één, en er bewegen drie mee
  const kabels = [];
  for (let i = 0; i < 7; i++) {
    const k = props.kabel(
      new THREE.Vector3(x0 + 14 + i * 0.9, 3 + (i % 3) * 2, -2),
      new THREE.Vector3(x0 + 34 - i * 0.7, 2 + ((i + 1) % 4) * 2, -2),
      [PALET.blauwLicht, PALET.oranje, PALET.groen][i % 3],
      1.4 + (i % 3) * 0.6,
    );
    level.scene.add(k);
    kabels.push(k);
  }
  level.tik((dt, speler, s) => {
    for (let i = 0; i < kabels.length; i++) {
      kabels[i].position.y = Math.sin(s.klok * 1.6 + i) * 0.14;
    }
  });

  level.zone(x0 - 4, x0 - 2, (s) => {
    s.cupcaek.gezicht('verbaasd');
    s.dialoog.scene([
      ['verteller', 'Caek trekt aan één kabel. Drie andere bewegen mee.'],
      ['verteller', 'Cupcaek trekt een stekker eruit. Het licht gaat overal uit.'],
      ['cupcaek', '...'],
      ['verteller', 'Drie schakelaars. Pas als ze alle drie aan staan, gaat de brug open.'],
    ]);
  });

  // de drie schakelaars, op verschillende hoogtes
  const plekken = [[x0 + 4, 0], [x0 + 10, 4.2], [x0 + 15, 0]];
  level.platform(x0 + 10, 4.0, 3.6);
  level.platform(x0 + 7, 2.0, 2.8);

  SCHAKELAARS.forEach((sch, i) => {
    const [x, y] = plekken[i];
    const object = props.schakelaar(sch.naam);
    level.plaats(object, x, y, -1.2);
    level.interactie({
      x, y: y + 1.2, straal: 2.4,
      label: `zet ${sch.naam} aan`,
      async doe(s) {
        s.schakelaars.add(sch.id);
        s.geluid.klik();
        object.userData.lamp.material = verf(PALET.groen, { emissief: 1.2 });
        object.userData.hendel.rotation.x = 0.7;
        if (s.schakelaars.size < 3) {
          const rest = SCHAKELAARS.filter((k) => !s.schakelaars.has(k.id)).map((k) => k.naam);
          await s.dialoog.zeg('verteller', `${sch.naam} staat aan. Nog nodig: ${rest.join(' en ')}.`);
          return;
        }
        // alle drie: de pretzel wordt een baguette
        s.vlaggen.pretzelOpgelost = true;
        s.geluid.waarde();
        knoop.visible = false;
        const brug = props.stokbrood(20);
        level.plaats(brug, x0 + 25, 0.4, 0);
        level.voegVloer(x0 + 15, x0 + 35, 1.0);
        s.geefValue(WAARDE.afhankelijkheid, 'AFHANKELIJKHEID OPGELOST');
        await s.dialoog.scene([
          ['verteller', 'De Pretzel verandert in een keurige rechte baguette.'],
          ['caek', 'Waarom?'],
          ['cupcaek', 'Geen idee. Loop maar door.'],
        ]);
      },
    });
  });

  level.checkpoint(x0 + 38, 0, 'AFHANKELIJKHEDEN');

  // ---- impediment: een stokbrood dwars over de weg ----
  const blokkade = props.stokbrood(7);
  blokkade.rotation.z = Math.PI / 2;
  level.plaats(blokkade, x0 + 44, 3.4, 0.4);
  const impedimentMuur = level.voegMuur(x0 + 43.2, x0 + 44.8, 0, 7);
  level.interactie({
    x: x0 + 43, y: 1.6, straal: 2.6,
    label: 'maak het impediment zichtbaar',
    async doe(s) {
      s.geluid.klik();
      const vlaggetje = props.doos(1.4, 0.9, 0.08, PALET.rood, { emissief: 0.6 });
      vlaggetje.position.set(x0 + 44, 5.4, 0.6);
      level.scene.add(vlaggetje);
      await s.dialoog.scene([
        ['cupcaek', 'Heb je al geprobeerd hem zichtbaar te maken?'],
        ['verteller', 'Caek zet er een enorm rood vlaggetje op. Er komt een kraan aan.'],
      ]);
      blokkade.visible = false;
      vlaggetje.visible = false;
      impedimentMuur.x0 = -999;
      impedimentMuur.x1 = -999;
      s.geefValue(WAARDE.impediment, 'IMPEDIMENT WEGGEHAALD');
    },
  });

  // ---- priority change ----
  const wegwijzer = props.bord('→ VERDER', { breedte: 3, hoogte: 1.2, grootte: 54 });
  level.plaats(wegwijzer, x0 + 48, 0, 1.8);
  level.zone(x0 + 47, x0 + 49, async (s) => {
    s.geluid.deur();
    wegwijzer.rotation.y = Math.PI;
    await s.dialoog.scene([
      ['verteller', 'Het bord draait plotseling 180 graden.'],
      ['caek', '...'],
      ['cupcaek', '🤷'],
      ['verteller', 'Nieuwe richting. Zelfde kant op.'],
    ]);
    wegwijzer.rotation.y = 0;
  });
}

/* ================================================================== *
 * Sectie 4 — CLUSTER REVIEW
 * ================================================================== */

function sectieReview(level, spel) {
  const x0 = bij('review');
  level.grond(x0 - 8, x0 + 52, 0, PALET.steen);
  level.plaats(props.bord(['CLUSTER REVIEW', 'volgende voorstelling: NU'], { breedte: 6.4, hoogte: 2.2, grootte: 42 }), x0 + 1, 0, 2.4);

  // slingers over het festivalterrein
  for (let i = 0; i < 6; i++) {
    const slinger = props.kabel(
      new THREE.Vector3(x0 + 2 + i * 6, 7.5, -3),
      new THREE.Vector3(x0 + 8 + i * 6, 7.5, -3),
      [PALET.goud, PALET.roze, PALET.groen][i % 3], 1.1,
    );
    level.scene.add(slinger);
  }

  // andere teams met hun demo's
  const teams = [
    { x: x0 + 8, kleur: PALET.groen, naam: 'TEAM BROOD' },
    { x: x0 + 14, kleur: PALET.paars, naam: 'TEAM KRUIM' },
    { x: x0 + 20, kleur: PALET.oranje, naam: 'TEAM DEEG' },
  ];
  for (const team of teams) {
    const tafel = props.demotafel(team.kleur);
    level.plaats(tafel, team.x, 0, -1.6);
    level.plaats(props.label(team.naam, { breedte: 3.2, grootte: 46, plaat: true }), team.x, 3.2, -1.6);
  }

  level.interactie({
    x: x0 + 14, y: 1.6, straal: 4.5,
    label: 'kijk bij een ander team',
    async doe(s) {
      s.vlaggen.gekeken = true;
      s.geluid.pak();
      await s.dialoog.scene([
        ['verteller', 'Team Kruim laat iets zien dat half werkt en helemaal duidelijk is.'],
        ['caek', 'Dat hadden wij ook kunnen gebruiken.'],
        ['cupcaek', '+1 inspiratie.'],
      ]);
      s.controleerReview();
    },
  });

  // je eigen sprintresultaat op de demotafel
  const eigenTafel = props.demotafel(PALET.goud);
  eigenTafel.userData.taart.visible = false;
  level.plaats(eigenTafel, x0 + 26, 0, -1.6);
  level.plaats(props.label('CAEK', { breedte: 2.4, grootte: 48, plaat: true }), x0 + 26, 3.2, -1.6);
  level.interactie({
    x: x0 + 26, y: 1.6, straal: 3,
    label: 'zet je sprintresultaat op tafel',
    async doe(s) {
      if (!s.vlaggen.sprintdoel) {
        await s.dialoog.zeg('cupcaek', 'We hebben nog niets gebakken om te laten zien.');
        return;
      }
      s.vlaggen.gedeeld = true;
      eigenTafel.userData.taart.visible = true;
      s.geluid.pak();
      await s.dialoog.zeg('verteller', 'Je zet je sprintresultaat op de demotafel. Mensen komen kijken.');
      s.controleerReview();
    },
  });

  // feedback sprinkles, letterlijk gekleurde hagelslag
  SPRINKLES.forEach((sp, i) => {
    const x = x0 + 10 + i * 5.5;
    const y = 1.4 + (i % 2) * 2.6;
    const object = props.sprinkle(sp.kleur);
    level.plaats(object, x, y, 0.6);
    level.tik((dt, speler, s) => {
      object.rotation.z += dt * 2;
      object.position.y = y + Math.sin(s.klok * 2.2 + i) * 0.16;
    });
    level.pickup({
      x, y, straal: 1.6,
      doe(s) {
        object.visible = false;
        s.sprinkles.push(sp);
        s.hud.zetTeller('sprinkles', s.sprinkles.length);
        s.geluid.pak();
        s.controleerReview();
      },
    });
  });
  level.platform(x0 + 15.5, 2.2, 3.0);
  level.platform(x0 + 26.5, 2.2, 3.0);

  // Cupcaek gaat midden op het pad staan tot de review echt gedaan is
  level.zone(x0 + 4, x0 + 6, (s) => {
    s.cupcaek.blokkeer(x0 + 33);
    s.cupcaek.gezicht('streng');
    s.dialoog.scene([
      ['verteller', 'Het hele level verandert in een festivalterrein.'],
      ['caek', 'We kunnen ook doorlopen.'],
      ['cupcaek', 'Nee.'],
    ]);
  });
  const reviewMuur = level.voegMuur(x0 + 33.4, x0 + 34.4, 0, 6);
  spel.reviewMuur = reviewMuur;

  // ---- welke feedback verwerken we? ----
  level.interactie({
    x: x0 + 32, y: 1.5, straal: 3, eenmalig: false,
    label: 'verwerk feedback',
    async doe(s) {
      if (s.sprinkles.length === 0) {
        await s.dialoog.zeg('cupcaek', 'We hebben nog geen feedback opgehaald. Kijken, delen, luisteren.');
        return;
      }
      if (!s.vlaggen.gekeken || !s.vlaggen.gedeeld) {
        await s.dialoog.zeg('cupcaek', 'Eerst nog even kijken bij een ander team en ons eigen resultaat op tafel zetten.');
        return;
      }

      // de running gag: alles verwerken laat de cake instorten
      if (!s.vlaggen.allesGeprobeerd && s.sprinkles.length >= 3) {
        const alles = await s.paneel.kies(
          'Feedback verwerken',
          'Je hebt <b>' + s.sprinkles.length + '</b> sprinkles opgehaald.',
          [
            { label: 'Allemaal verwerken!', onder: 'we hebben het toch opgehaald', icoon: '🌈', waarde: 'alles' },
            { label: 'Eerst even kijken wat relevant is', icoon: '🔍', waarde: 'kies' },
          ],
        );
        if (alles === 'alles') {
          s.vlaggen.allesGeprobeerd = true;
          s.geluid.kaboom();
          eigenTafel.userData.taart.scale.set(1.4, 0.15, 1.4);
          await s.dialoog.scene([
            ['verteller', 'Caek gooit alle sprinkles tegelijk op de cake.'],
            ['verteller', 'De cake stort in.'],
            ['cupcaek', 'Misschien hoeven we niet álle feedback te verwerken.'],
          ]);
          eigenTafel.userData.taart.scale.set(1, 1, 1);
          return;
        }
      }

      const keuze = await s.paneel.kies(
        'Welke feedback verwerken we?',
        'Eén stuk. Degene die het PI-doel dichterbij brengt.',
        s.sprinkles.map((sp) => ({ label: sp.tekst, icoon: '💬', waarde: sp.id })),
      );
      const gekozen = SPRINKLES.find((sp) => sp.id === keuze);
      if (!gekozen.relevant) {
        s.geluid.fout();
        await s.dialoog.zeg('cupcaek', 'Kan. Maar helpt dat een ketenpartner sneller aan het juiste antwoord?');
        return;
      }
      s.vlaggen.feedbackVerwerkt = true;
      s.geluid.waarde();
      s.geefValue(WAARDE.feedback, 'RELEVANTE FEEDBACK VERWERKT');
      s.geefValue(WAARDE.clusterReview, 'CLUSTER REVIEW BEZOCHT');
      s.cupcaek.laatDoor();
      s.cupcaek.gezicht('blij');
      reviewMuur.x0 = -999;
      reviewMuur.x1 = -999;
      await s.dialoog.scene([
        ['verteller', 'Precies de feedback die over stap 3 ging. De plek waar de data ook al naar wees.'],
        ['cupcaek', 'Nu mag je door.'],
      ]);
    },
  });

  level.checkpoint(x0 + 38, 0, 'CLUSTER REVIEW');

  // ---- kort overleg ----
  const overlegdeur = props.deur(['KORT OVERLEG', '15 MIN'], 3, 4.6);
  level.plaats(overlegdeur, x0 + 42, 0, -1.4);
  level.interactie({
    x: x0 + 42, y: 1.6, straal: 2.6,
    label: 'even kort overleggen',
    async doe(s) {
      s.geluid.deur();
      s.bevries(true);
      const klok = ['15 min', '30 min', '45 min', '1:15'];
      for (const t of klok) {
        await s.dialoog.zeg('verteller', t, { wacht: 0.55 });
      }
      await s.paneel.melding('KORT OVERLEG — 15 MIN', 'De uitgang gaat pas open na een besluit.', 'BESLUIT');
      s.vlaggen.overlegGehad = true;
      s.geefValue(WAARDE.besluit, 'BESLUIT GENOMEN');
      s.bevries(false);
      await s.dialoog.zeg('cupcaek', 'Dat had ook een besluit van vijf minuten kunnen zijn.');
    },
  });
}

/* ================================================================== *
 * Sectie 5 — DE DEMO
 * ================================================================== */

function sectieDemo(level, spel) {
  const x0 = bij('demo');
  level.grond(x0 - 6, x0 + 34, 0, PALET.steen);

  const bühne = props.podium(12);
  level.plaats(bühne, x0 + 12, 0, -1);
  level.voegVloer(x0 + 6, x0 + 18, 1.34);

  const groot = props.scherm(11, 6);
  level.plaats(groot, x0 + 12, 1.3, -4.5);
  spel.demoScherm = groot;

  // een klein publiek
  const publiek = [];
  for (let i = 0; i < 9; i++) {
    const hoofd = props.bol(0.42, [PALET.toast, PALET.roze, PALET.room][i % 3], { emissief: 0.2 });
    const x = x0 + 5 + (i % 5) * 3.2;
    const z = 4 + Math.floor(i / 5) * 2.2;
    level.plaats(hoofd, x, 1.1 + (i % 2) * 0.15, z);
    publiek.push(hoofd);
  }
  level.tik((dt, speler, s) => {
    for (let i = 0; i < publiek.length; i++) {
      const slaapt = s.vlaggen.publiekSlaapt;
      publiek[i].position.y = (slaapt ? 0.7 : 1.1) + Math.sin(s.klok * (slaapt ? 0.8 : 2.4) + i) * (slaapt ? 0.03 : 0.09);
    }
  });

  const knopA = props.knopZuil('POWERPOINT', PALET.rood);
  const knopB = props.knopZuil('LAAT HET ZIEN', PALET.groen);
  level.plaats(knopA, x0 + 9, 1.34, 1.2);
  level.plaats(knopB, x0 + 15, 1.34, 1.2);

  const powerpointInteractie = level.interactie({
    x: x0 + 9, y: 2.6, straal: 2.6,
    label: 'druk op POWERPOINT',
    async doe(s) {
      s.bevries(true);
      s.vlaggen.publiekSlaapt = true;
      s.cupcaek.gezicht('slaapt');
      groot.userData.beeld.material = verf(PALET.room, { emissief: 0.9 });
      for (let slide = 1; slide <= 83; slide += Math.ceil(slide / 3)) {
        s.hud.kaart(`SLIDE ${slide} / 83`, 'agenda · context · aanpak · vervolg', 260);
        s.geluid.klik();
        await new Promise((r) => setTimeout(r, 190));
      }
      s.geluid.snurk();
      await s.dialoog.scene([
        ['verteller', 'Het publiek valt langzaam in slaap.'],
        ['cupcaek', 'zzzz'],
        ['verteller', 'De knop vliegt uit elkaar.'],
      ]);
      s.geluid.kaboom();
      knopA.visible = false;
      s.cupcaek.gezicht('verbaasd');
      s.vlaggen.publiekSlaapt = false;
      s.bevries(false);
      await s.dialoog.zeg('caek', 'Dan maar laten zien.');
    },
  });

  level.interactie({
    x: x0 + 15, y: 2.6, straal: 2.6,
    label: 'druk op LAAT HET ZIEN',
    async doe(s) {
      if (!s.vlaggen.sprintdoel) {
        await s.dialoog.zeg('cupcaek', 'We hebben nog geen werkend resultaat om te laten zien.');
        return;
      }
      powerpointInteractie.klaar = true;
      s.bevries(true);
      s.vlaggen.publiekSlaapt = false;
      groot.userData.beeld.material = verf(PALET.goudLicht, { emissief: 1.1 });
      s.geluid.waarde();
      await s.dialoog.scene([
        ['verteller', 'Caek laat het daadwerkelijk gebouwde resultaat zien. Live. Eén klik.'],
        ['publiek', 'Oh — zit dat zo.'],
      ]);
      s.vlaggen.demoGegeven = true;
      s.cupcaek.gezicht('blij');
      s.geefValue(WAARDE.demo, 'WERKEND RESULTAAT GEDEMONSTREERD');
      // hartjes
      for (let i = 0; i < 12; i++) {
        const hartje = props.label('♥', { breedte: 0.9, kleur: '#f2799f', grootte: 90 });
        hartje.position.set(x0 + 6 + Math.random() * 12, 2 + Math.random() * 2, 3 + Math.random() * 2);
        level.scene.add(hartje);
        hartje.material.transparent = true;
        let leeftijd = 0;
        level.tik((dt) => {
          leeftijd += dt;
          hartje.position.y += dt * 1.2;
          hartje.material.opacity = Math.max(0, 1 - leeftijd / 3);
          if (leeftijd > 3) { hartje.removeFromParent(); return false; }
          return true;
        });
      }
      s.bevries(false);
    },
  });

  level.zone(x0 + 2, x0 + 4, (s) => {
    s.dialoog.scene([
      ['verteller', 'Twee knoppen. Achter Caek een gigantisch scherm.'],
      ['cupcaek', 'Kies verstandig.'],
    ]);
    s.hud.kaart('DE DEMO', 'twee knoppen, één goed antwoord');
  });

  level.checkpoint(x0 + 24, 0, 'DEMO');

  // ---- papierrommel: hier is SuperCaek eindelijk nuttig ----
  const rommelSoorten = ['PAPIERROMMEL', 'ONDUIDELIJKHEID', 'DUBBEL WERK', 'ONNODIGE COMPLEXITEIT'];
  for (let i = 0; i < 4; i++) {
    const x = x0 + 26 + i * 4.2;
    const stapel = props.papierrommel(2.6);
    level.plaats(stapel, x, 0, 0);
    level.plaats(props.label(rommelSoorten[i], { breedte: 4.6, grootte: 40, plaat: true }), x, 3.6, 0);
    const muur = level.voegMuur(x - 1.1, x + 1.1, 0, 2.6, {
      doorSuper: true,
      geraakt(speler) {
        if (!speler.superActief || !stapel.visible) return;
        stapel.visible = false;
        muur.x0 = -999;
        muur.x1 = -999;
        spel.rommelKapot++;
        spel.geluid.kaboom();
        spel.hud.kaart('KABOOM', rommelSoorten[i], 700);
      },
    });
    // zonder SuperCaek kun je er ook overheen klimmen — het mag alleen langer duren
    level.platform(x, 2.8, 2.4);
  }
}

/* ================================================================== *
 * Sectie 6 — DE VALUE OVEN
 * ================================================================== */

function sectieOven(level, spel) {
  const x0 = bij('oven');
  level.grond(x0 - 8, x0 + 30, 0, PALET.blauw);

  const groteOven = props.oven(1.9, { tekst: 'VALUE OVEN', gloedKleur: PALET.goudLicht });
  level.plaats(groteOven, x0 + 18, 0, -6);
  spel.valueOven = groteOven;
  level.tik((dt, speler, s) => {
    groteOven.userData.vuur.material = gloed(PALET.goudLicht, 1.2 + Math.sin(s.klok * 2.2) * 0.4);
  });

  level.plaats(props.bord(['EINDE PI'], { breedte: 4, hoogte: 1.6, grootte: 64 }), x0 - 2, 0, 2.2);

  // voorbij de oven is niets meer; hier houdt de PI op
  level.voegMuur(x0 + 16, x0 + 30, 0, 12);

  level.interactie({
    x: x0 + 12, y: 1.6, straal: 4.5,
    label: 'alles in de Value Oven',
    async doe(s) {
      await s.finale();
    },
  });

  level.checkpoint(x0 + 4, 0, 'EINDE PI');
}

/* ================================================================== *
 * Sectietitels onderweg
 * ================================================================== */

function sectiekaarten(level, spel) {
  for (const sectie of SECTIES) {
    if (sectie.id === 'start') continue;
    level.zone(sectie.x - 1, sectie.x + 1, (s) => {
      s.hud.zetSectie(sectie.naam, s.hud.sprintdoel.textContent);
      s.hud.kaart(sectie.titel, sectie.onder);
    });
  }
}
