/* CAEK — de vier sprints.
 *
 * Elke sprint introduceert één nieuw ding en herhaalt de rest. Sprint 1 is de
 * langste omdat je daar de bewegingen leert; 2 tot 4 zijn korter omdat je ze
 * al kent. Wat je moet doen om verder te komen moet je in tien seconden
 * snappen -- de rest is smaak. */

import * as THREE from 'three';
import {
  props, PALET, verf, gloed, sectie, bauBand, impediment, technicalDebt,
  kortOverleg, vraagsturen, laatRoken,
} from './gereedschap.js';
import {
  INGREDIENTEN, METRICS, AFHANKELIJKHEDEN, SPOEDWERK, TEAMS, WAARDE, SCHAKELS,
} from '../../config.js';
import { pauze } from '../../ui/dialoog.js';

/* ================================================================== *
 * SPRINT 1 — het beslag
 * ================================================================== */

export function bouwSprint1(level, spel) {
  const s = sectie('sprint1');
  const x0 = s.x;
  level.grond(x0, x0 + 32, 0, PALET.steen);
  level.grond(x0 + 36, x0 + 64, 0, PALET.steen);
  level.platform(x0 + 34, 2.4, 3.4);
  level.grond(x0 + 68, x0 + s.lengte + 2, 0, PALET.steen);

  level.plaats(props.bord(['SPRINTDOEL', s.doel], { breedte: 4.8, hoogte: 2.2, grootte: 40 }), x0 + 3, 0, -4.2);

  // Scope Creep wordt hier wakker
  level.zone(x0 + 4, x0 + 7, (sp) => {
    sp.scopeCreep.wakker(sp.speler.x - 11, 0);
    sp.cupcaek.gezicht('streng');
    sp.dialoog.scene([
      ['verteller', 'Er rolt iets kleins en schattigs achter je aan.'],
      ['scopecreep', 'Kan dit er misschien ook nog bij?'],
      ['cupcaek', 'Niet aankijken. Dan groeit hij.'],
    ]);
  });

  // ingrediënten — vijf horen bij het sprintdoel, vier absoluut niet
  const posities = [
    [x0 + 9, 1.6], [x0 + 14, 3.4], [x0 + 18, 1.6], [x0 + 23, 4.2], [x0 + 28, 1.6],
    [x0 + 12, 5.6], [x0 + 21, 1.6], [x0 + 40, 4.8], [x0 + 46, 1.6],
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
    level.tik((dt, speler, sp) => {
      object.position.y = y + Math.sin(sp.klok * 2 + i) * 0.18;
      object.rotation.y += dt * 1.1;
      object.userData.halo.rotation.x += dt * 2;
    });
    level.pickup({
      x, y, straal: 1.5,
      doe(sp) {
        object.visible = false;
        sp.pakIngredient(ing);
      },
    });
  });

  level.platform(x0 + 12, 4.0, 3.0);
  level.platform(x0 + 14, 2.0, 2.6);
  level.platform(x0 + 23, 2.6, 3.0);
  level.platform(x0 + 40, 3.2, 3.4);

  /* ---------------- het sorteerbord ---------------- */

  level.plaats(
    props.bord(['WAT DRAAGT BIJ', 'AAN HET SPRINTDOEL?'], { breedte: 4.8, hoogte: 2.2, grootte: 44 }),
    x0 + 52, 0, -3.6,
  );

  level.interactie({
    x: x0 + 52, y: 1.5, straal: 3.2, eenmalig: false,
    label: 'sorteer je mand',
    async doe(sp) {
      if (sp.mand.length === 0) {
        await sp.dialoog.zeg('cupcaek', 'Je mand is leeg. Ook een keuze.');
        return;
      }
      const overbodig = sp.mand.filter((i) => !i.nodig);
      const gekozen = await sp.paneel.vink(
        'Wat draagt bij aan het sprintdoel?',
        `Sprintdoel: <b>${s.doel.toLowerCase()}</b>. Vink aan wat je uit je mand gooit.`,
        sp.mand.map((i) => ({ label: i.naam, icoon: i.emoji, waarde: i.id })),
        'Gooi eruit',
      );
      const eruit = sp.mand.filter((i) => gekozen.has(i.id));
      const foutWeg = eruit.filter((i) => i.nodig);
      const goedWeg = eruit.filter((i) => !i.nodig);

      sp.mand = sp.mand.filter((i) => !gekozen.has(i.id));
      sp.hud.zetTeller('mand', sp.mand.length);

      if (foutWeg.length) {
        sp.geluid.fout();
        await sp.dialoog.zeg('cupcaek', `Je hebt ${foutWeg[0].naam} weggegooid. Die hadden we juist nodig.`);
      }
      if (goedWeg.length) {
        sp.geluid.waarde();
        sp.scopeCreep.krimp();
        sp.cupcaek.gezicht('blij');
        await sp.dialoog.scene([
          ['verteller', `${goedWeg.length}× werk dat niet aan het sprintdoel bijdraagt: eruit.`],
          ['scopecreep', '...oké.'],
          ['cupcaek', 'Kijk. Hij krimpt.'],
        ]);
      } else if (overbodig.length && !goedWeg.length) {
        await sp.dialoog.zeg('cupcaek', 'Er zit nog van alles in dat niets met het sprintdoel te maken heeft.');
      }
      sp.vlaggen.gesorteerd = true;
    },
  });

  /* ---------------- het sprintoventje ---------------- */

  const oventje = props.oven(0.55, { tekst: 'SPRINT 1' });
  level.plaats(oventje, x0 + 60, 0, -2.5);
  laatRoken(level, oventje, 'sprint1oven');
  level.tik((dt, speler, sp) => {
    oventje.userData.gloeien(PALET.oranje, 1.1 + Math.sin(sp.klok * 2.6) * 0.4);
  });

  level.interactie({
    x: x0 + 60, y: 1.5, straal: 3.4,
    label: 'bak het sprintresultaat',
    async doe(sp) {
      const nodig = sp.mand.filter((i) => i.nodig).length;
      if (nodig < 3) {
        await sp.dialoog.scene([
          ['cupcaek', `Met ${nodig} van de vijf ingrediënten wordt dit geen werkende basis.`],
          ['cupcaek', 'Ga terug. Ze liggen er nog.'],
        ]);
        return;
      }
      if (sp.mand.some((i) => !i.nodig)) {
        await sp.dialoog.scene([
          ['caek', 'Ik gooi er gewoon alles in.'],
          ['cupcaek', 'Dan bak je alles behalve het sprintdoel. Eerst sorteren, bij het bord.'],
        ]);
        return;
      }
      sp.geluid.ping();
      await sp.dialoog.zeg('verteller', 'PING.', { wacht: 0.9 });
      const taart = props.taartje(PALET.goud);
      level.plaats(taart, x0 + 62.5, 0, 0.9);
      sp.geefValue(WAARDE.sprintdoel, 'SPRINTDOEL BEHAALD');
      sp.rondSprintAf(1);
      await sp.dialoog.scene([
        ['verteller', 'Er komt een mini-CAEK uit. Niet perfect. Wel bruikbaar.'],
        ['cupcaek', 'Bruikbaar is een compliment.'],
      ]);
    },
  });

  level.checkpoint(x0 + 64, 0, 'SPRINTDOEL 1');

  /* ---------------- BAU ---------------- */

  bauBand(level, x0 + 68, { lengte: 14, hoogte: 5.6 });
  level.platform(x0 + 70, 3.0, 3.2);
  level.platform(x0 + 74, 3.0, 3.2);
  level.zone(x0 + 68, x0 + 70, (sp) => {
    sp.dialoog.zeg('cupcaek', 'BAU. Je kunt hem niet stoppen. Je moet er gewoon tussendoor blijven bewegen.');
  });
}

/* ================================================================== *
 * SPRINT 2 — de knoop
 * ================================================================== */

/* De drie teams waar je langs moet. Uit de roster gehaald en over de lijst
 * verspreid, zodat het klopt blijft als de teamlijst verandert. Er wordt
 * nergens beweerd dat een team ergens van is -- je stemt met ze af, meer niet. */
function afstemTeams() {
  const n = TEAMS.length;
  return AFHANKELIJKHEDEN.map((a, i) => ({
    ...a,
    team: TEAMS[Math.min(n - 1, Math.floor((i + 0.5) * n / AFHANKELIJKHEDEN.length))].naam,
  }));
}

export function bouwSprint2(level, spel) {
  const s = sectie('sprint2');
  const x0 = s.x;
  level.grond(x0, x0 + 22, 0, PALET.blauw);
  level.grond(x0 + 40, x0 + s.lengte + 2, 0, PALET.blauw);

  level.plaats(props.bord(['SPRINTDOEL', s.doel], { breedte: 4.8, hoogte: 2.2, grootte: 40 }), x0 + 2, 0, -4.2);

  const knoop = props.pretzel(3.4);
  level.plaats(knoop, x0 + 31, 9.0, -5);
  level.plaats(props.label('THE DEPENDENCY PRETZEL', { breedte: 8, grootte: 46, plaat: true }), x0 + 31, 14.0, -5);
  level.tik((dt, speler, sp) => {
    if (sp.vlaggen.sprint2) return;
    knoop.rotation.y += dt * 0.28;
    knoop.rotation.z = Math.sin(sp.klok * 0.6) * 0.12;
  });

  // kabels kriskras: trek aan één, en er bewegen drie mee
  const kabels = [];
  for (let i = 0; i < 7; i++) {
    const k = props.kabel(
      new THREE.Vector3(x0 + 20 + i * 0.9, 3 + (i % 3) * 2, -2),
      new THREE.Vector3(x0 + 40 - i * 0.7, 2 + ((i + 1) % 4) * 2, -2),
      [PALET.blauwLicht, PALET.oranje, PALET.groen][i % 3],
      1.4 + (i % 3) * 0.6,
    );
    level.scene.add(k);
    kabels.push(k);
  }
  level.tik((dt, speler, sp) => {
    for (let i = 0; i < kabels.length; i++) kabels[i].position.y = Math.sin(sp.klok * 1.6 + i) * 0.14;
  });

  level.zone(x0 + 3, x0 + 5, (sp) => {
    sp.cupcaek.gezicht('verbaasd');
    sp.dialoog.scene([
      ['verteller', 'Caek trekt aan één kabel. Drie andere bewegen mee.'],
      ['verteller', 'Cupcaek trekt een stekker eruit. Het licht gaat overal uit.'],
      ['cupcaek', '...'],
      ['verteller', 'Drie teams. Pas als je met alle drie hebt afgestemd, komt de keten rond.'],
    ]);
  });

  /* ---------------- drie teams, drie schakelaars ---------------- */

  const teams = afstemTeams();
  const plekken = [[x0 + 8, 0], [x0 + 14, 4.2], [x0 + 19, 0]];
  level.platform(x0 + 14, 4.0, 3.6);
  level.platform(x0 + 11, 2.0, 2.8);

  teams.forEach((afspraak, i) => {
    const [x, y] = plekken[i];
    const object = props.schakelaar(afspraak.team);
    level.plaats(object, x, y, -1.2);
    const stand = props.teamstand(afspraak.team, { kleur: PALET.blauwLicht });
    level.plaats(stand, x + 2.6, y, -3.4);

    level.interactie({
      x, y: y + 1.2, straal: 2.4,
      label: `stem af met ${afspraak.team}`,
      async doe(sp) {
        sp.schakelaars.add(afspraak.id);
        sp.geluid.klik();
        object.userData.lamp.material = verf(PALET.groen, { emissief: 1.2 });
        object.userData.hendel.rotation.x = 0.7;
        if (sp.schakelaars.size < teams.length) {
          const rest = teams.filter((k) => !sp.schakelaars.has(k.id)).map((k) => k.team);
          await sp.dialoog.zeg('verteller', `Afgestemd met ${afspraak.team}. Nog nodig: ${rest.join(' en ')}.`);
          return;
        }
        // alle drie: de pretzel wordt een baguette
        sp.geluid.waarde();
        knoop.visible = false;
        const brug = props.stokbrood(20);
        level.plaats(brug, x0 + 31, 0.4, 0);
        level.voegVloer(x0 + 21, x0 + 41, 1.0);
        sp.geefValue(WAARDE.afhankelijkheid, 'AFHANKELIJKHEID OPGELOST');
        sp.rondSprintAf(2);
        await sp.dialoog.scene([
          ['verteller', 'De Pretzel verandert in een keurige rechte baguette.'],
          ['caek', 'Waarom?'],
          ['cupcaek', 'Geen idee. Loop maar door.'],
        ]);
      },
    });
  });

  level.checkpoint(x0 + 44, 0, 'SPRINTDOEL 2');

  impediment(level, x0 + 48);
  vraagsturen(level, x0 + 54);
}

/* ================================================================== *
 * SPRINT 3 — meten, en de bus van links
 * ================================================================== */

export function bouwSprint3(level, spel) {
  const s = sectie('sprint3');
  const x0 = s.x;
  level.grond(x0 - 2, x0 + s.lengte + 2, 0, PALET.blauw);

  level.plaats(props.bord(['SPRINTDOEL', s.doel], { breedte: 4.8, hoogte: 2.2, grootte: 40 }), x0 + 2, 0, -4.2);

  technicalDebt(level, x0 + 6);

  /* ---------------- de drie meetinstrumenten ---------------- */

  const plekken = [[x0 + 13, 1.9], [x0 + 19, 4.4], [x0 + 25, 1.9]];
  METRICS.forEach((metric, i) => {
    const [x, y] = plekken[i];
    const object = props.meetinstrument(metric.id);
    level.plaats(object, x, y, 0.4);
    level.tik((dt, speler, sp) => {
      object.position.y = y + Math.sin(sp.klok * 1.7 + i * 2) * 0.14;
      if (object.userData.wijzer) object.userData.wijzer.rotation.z = Math.sin(sp.klok * 2.4) * 0.9;
    });
    level.pickup({
      x, y, straal: 1.7,
      async doe(sp) {
        object.visible = false;
        sp.metrics.push(metric);
        sp.hud.zetTeller('metrics', sp.metrics.length);
        sp.geluid.pak();
        await sp.dialoog.zeg('verteller', `${metric.naam}: ${metric.meting}`);
        if (sp.metrics.length === METRICS.length) {
          await sp.dialoog.scene([
            ['cupcaek', 'We hoeven niet nóg harder te bakken.'],
            ['cupcaek', 'Misschien staat de oven gewoon verkeerd.'],
          ]);
        }
      },
    });
  });
  level.platform(x0 + 19, 3.0, 3.2);

  /* ---------------- de bus van links ---------------- */

  const bus = props.bus(9);
  bus.position.set(x0 + 20, 0, 6.5);
  bus.visible = false;
  level.scene.add(bus);
  let busRijdt = false;
  level.tik((dt, speler, sp) => {
    if (!bus.visible) return;
    bus.userData.knipper.material = gloed(PALET.goudLicht, 0.6 + Math.abs(Math.sin(sp.klok * 6)) * 1.8);
    if (busRijdt) bus.position.x += dt * 9;
  });

  level.zone(x0 + 30, x0 + 32, async (sp) => {
    sp.bevries(true);
    sp.bezigMetScene++;
    bus.position.set(sp.speler.x - 24, 0, 6.5);
    bus.visible = true;
    busRijdt = true;
    sp.geluid.deur();
    await sp.dialoog.zeg('verteller', 'Van links komt een bus aan. Met knipperlicht.', { wacht: 1.5 });
    busRijdt = false;

    const spoed = SPOEDWERK[Math.floor(sp.klok) % SPOEDWERK.length];
    await sp.dialoog.scene([
      ['verteller', `Er stapt spoedwerk uit: ${spoed.naam.toLowerCase()}.`],
      ['caek', 'Dat past er niet meer bij.'],
      ['cupcaek', 'Er moet dus iets uit.'],
    ]);

    const laatVallen = await sp.paneel.kies(
      'Wat laat je vallen?',
      `Er komt <b>${spoed.naam.toLowerCase()}</b> bij. De sprint zat al vol.`,
      [
        { label: 'Het sprintdoel', onder: 'dan schuift dat een sprint op', icoon: '🎯', waarde: 'doel' },
        { label: 'De metingen', onder: 'die kunnen ook later', icoon: '📊', waarde: 'metrics' },
        { label: 'De feedback verwerken', onder: 'dat is toch geen bouwwerk', icoon: '💬', waarde: 'feedback' },
      ],
    );
    const gekozen = {
      doel: 'het sprintdoel', metrics: 'de metingen', feedback: 'de feedback',
    }[laatVallen] || 'iets';

    await sp.dialoog.zeg('verteller', 'Genoteerd.', { wacht: 1.4 });
    sp.vlaggen.busGehad = true;
    sp.vlaggen.busKeuze = gekozen;
    sp.geefValue(WAARDE.spoedwerk, 'SPOEDWERK OPGEPAKT');
    await sp.dialoog.scene([
      ['cupcaek', `Theoretisch mocht je ${gekozen} laten vallen.`],
      ['caek', 'En praktisch?'],
      ['cupcaek', 'Praktisch draag je ze allebei.'],
      ['verteller', 'Caek pakt het spoedwerk erbij. De rest gaat gewoon mee.'],
    ]);
    sp.bezigMetScene--;
    sp.bevries(false);
    setTimeout(() => { bus.visible = false; }, 4000);
  });

  /* ---------------- drie deuren, één data ---------------- */

  // Zes eenheden uit elkaar en niet vier: de gemodelleerde poort is bijna net
  // zo breed als hoog, en de linker staat ook nog eens op 1,4 keer. Op vier
  // liepen ze in elkaar over en was niet meer te zien welke deur je koos.
  const deuren = [
    { id: 'groot', tekst: ['MEER', 'BOUWEN'], x: x0 + 48, kleur: PALET.goud },
    { id: 'klein', tekst: ['STAP 3', 'FIXEN'], x: x0 + 54, kleur: PALET.groen },
    { id: 'dashboard', tekst: ['NOG EEN', 'DASHBOARD'], x: x0 + 60, kleur: PALET.paars },
  ];
  const muurBlok = level.voegMuur(x0 + 45, x0 + 62, 0, 8);
  for (const d of deuren) {
    const object = props.deur(d.tekst, 2.6, 5);
    object.userData.kleuren(d.kleur);
    level.plaats(object, d.x, 0, -1.4);
    d.object = object;
  }
  deuren[0].object.scale.set(1.4, 1.25, 1);   // de glimmende route is groter

  level.interactie({
    x: x0 + 46, y: 1.6, straal: 3.4, eenmalig: false,
    label: 'kies een route',
    async doe(sp) {
      if (sp.metrics.length < METRICS.length) {
        await sp.dialoog.scene([
          ['caek', 'Ik neem gewoon de grote glimmende.'],
          ['cupcaek', 'Zullen we eerst even kijken hoe het écht gaat?'],
        ]);
        return;
      }
      const keuze = await sp.paneel.kies(
        'De data zegt',
        sp.metrics.map((m) => `<b>${m.naam}:</b> ${m.meting}`).join('<br>'),
        [
          { label: 'De grote glimmende route', onder: 'meer bouwen, meer opleveren', icoon: '✨', waarde: 'groot' },
          { label: 'Het kleine onooglijke pad', onder: 'naar de plek waar ketenpartners vastlopen', icoon: '🧭', waarde: 'klein' },
          { label: 'Nog een dashboard maken', onder: 'dan weten we het pas écht zeker', icoon: '📊', waarde: 'dashboard' },
        ],
      );
      if (keuze === 'klein') {
        sp.geluid.waarde();
        deuren[1].object.userData.open();
        muurBlok.x0 = -999;
        muurBlok.x1 = -999;
        sp.geefValue(WAARDE.metrics, 'METRICS GEBRUIKT');
        sp.rondSprintAf(3);
        await sp.dialoog.scene([
          ['verteller', 'Meten → begrijpen → aanpassen.'],
          ['cupcaek', 'Niet: meten → dashboard maken → klaar.'],
        ]);
      } else if (keuze === 'groot') {
        sp.geluid.fout();
        await sp.dialoog.scene([
          ['verteller', 'De grote deur rammelt en blijft dicht.'],
          ['cupcaek', 'Die route bouwt meer van wat al niet gebruikt wordt.'],
        ]);
      } else {
        sp.geluid.fout();
        await sp.dialoog.scene([
          ['caek', 'Nog één dashboard erbij?'],
          ['cupcaek', 'We hébben de meting al. Nu moeten we er iets mee doen.'],
        ]);
      }
    },
  });

  level.checkpoint(x0 + 63, 0, 'SPRINTDOEL 3');
}

/* ================================================================== *
 * SPRINT 4 — laten zien, en wachten
 * ================================================================== */

export function bouwSprint4(level, spel) {
  const s = sectie('sprint4');
  const x0 = s.x;
  level.grond(x0 - 2, x0 + s.lengte + 2, 0, PALET.steen);

  level.plaats(props.bord(['SPRINTDOEL', s.doel], { breedte: 4.8, hoogte: 2.2, grootte: 40 }), x0 + 2, 0, -4.2);

  /* ---------------- de demo ---------------- */

  const bühne = props.podium(12);
  level.plaats(bühne, x0 + 14, 0, -1);
  level.voegVloer(x0 + 8, x0 + 20, 1.34);

  const groot = props.scherm(11, 6);
  level.plaats(groot, x0 + 14, 1.3, -4.5);

  const knopA = props.knopZuil('POWERPOINT', PALET.rood);
  const knopB = props.knopZuil('LAAT HET ZIEN', PALET.groen);
  level.plaats(knopA, x0 + 11, 1.34, 1.2);
  level.plaats(knopB, x0 + 17, 1.34, 1.2);

  const powerpoint = level.interactie({
    x: x0 + 11, y: 2.6, straal: 2.6,
    label: 'druk op POWERPOINT',
    async doe(sp) {
      sp.bevries(true);
      sp.vlaggen.publiekSlaapt = true;
      sp.cupcaek.gezicht('slaapt');
      groot.userData.projecteer(PALET.room, 0.9);
      for (let slide = 1; slide <= 83; slide += Math.ceil(slide / 3)) {
        sp.hud.kaart(`SLIDE ${slide} / 83`, 'agenda · context · aanpak · vervolg', 260);
        sp.geluid.klik();
        await pauze(190);
      }
      sp.geluid.snurk();
      await sp.dialoog.scene([
        ['verteller', 'Het publiek valt langzaam in slaap.'],
        ['cupcaek', 'zzzz'],
        ['verteller', 'De knop vliegt uit elkaar.'],
      ]);
      sp.geluid.kaboom();
      knopA.visible = false;
      sp.cupcaek.gezicht('verbaasd');
      sp.vlaggen.publiekSlaapt = false;
      sp.bevries(false);
      await sp.dialoog.zeg('caek', 'Dan maar laten zien.');
    },
  });

  level.interactie({
    x: x0 + 17, y: 2.6, straal: 2.6,
    label: 'druk op LAAT HET ZIEN',
    async doe(sp) {
      if (!sp.vlaggen.sprint1) {
        await sp.dialoog.zeg('cupcaek', 'We hebben nog geen werkend resultaat om te laten zien.');
        return;
      }
      powerpoint.klaar = true;
      sp.bevries(true);
      sp.vlaggen.publiekSlaapt = false;
      groot.userData.projecteer(PALET.goudLicht, 1.1);
      sp.geluid.waarde();
      await sp.dialoog.scene([
        ['verteller', 'Caek laat het daadwerkelijk gebouwde resultaat zien. Live. Eén klik.'],
        ['publiek', 'Oh — zit dat zo.'],
      ]);
      sp.vlaggen.demoGegeven = true;
      sp.cupcaek.gezicht('blij');
      sp.geefValue(WAARDE.demo, 'WERKEND RESULTAAT GEDEMONSTREERD');
      sp.rondSprintAf(4);
      strooiHartjes(level, x0 + 8, 12);
      sp.bevries(false);
    },
  });

  level.zone(x0 + 4, x0 + 6, (sp) => {
    sp.dialoog.scene([
      ['verteller', 'Twee knoppen. Achter Caek een gigantisch scherm.'],
      ['cupcaek', 'Kies verstandig.'],
    ]);
  });

  level.checkpoint(x0 + 24, 0, 'DEMO');

  kortOverleg(level, x0 + 28);

  /* ---------------- de wachttunnel ---------------- */

  if (SCHAKELS.wachttunnel) bouwWachttunnel(level, x0 + 42);

  /* ---------------- de volgende PI komt al in zicht ---------------- */

  level.plaats(props.bord(['PRIORITERINGSSESSIE', '→ volgende PI'], { breedte: 5.4, hoogte: 2.2, grootte: 38 }), x0 + 54, 0, -4.2);
  level.platform(x0 + 51, 2.6, 3.2);
  level.platform(x0 + 57, 3.4, 3.2);
  level.zone(x0 + 53, x0 + 55, (sp) => {
    sp.dialoog.scene([
      ['verteller', 'Aan het eind van het bord staat al een lijstje voor het volgende kwartaal.'],
      ['caek', 'We zijn nog niet klaar met dit kwartaal.'],
      ['cupcaek', 'Dat is nooit een reden geweest.'],
    ]);
  });
}

/**
 * De wachttunnel.
 *
 * Je staat voor een gesloten poort en er gebeurt even niets. Ernaast een grote
 * knop met KAN HET SNELLER? Die doet niks. Je mag erop rammen. Na een paar
 * seconden gaat de poort vanzelf open.
 *
 * Geen namen, geen venijn -- alleen het gevoel dat iedereen kent. Staat uit
 * met één regel in config.js als hij toch niet leuk blijkt.
 */
function bouwWachttunnel(level, x) {
  const tunnel = props.wachttunnel(10, 6);
  level.plaats(tunnel, x, 0, 0);
  const poortMuur = level.voegMuur(x - 5, x + 5, 0, 6);

  const knop = props.knopZuil('KAN HET SNELLER?', PALET.rood);
  level.plaats(knop, x - 8, 0, 1.6);

  let rammen = 0;
  let open = false;

  level.interactie({
    x: x - 8, y: 1.4, straal: 2.6, eenmalig: false,
    label: 'druk op KAN HET SNELLER?',
    async doe(sp) {
      rammen++;
      sp.geluid.klik();
      knop.userData.knop.position.y = 1.42;
      setTimeout(() => { knop.userData.knop.position.y = 1.6; }, 90);
      if (open) {
        await sp.dialoog.zeg('cupcaek', 'Hij is al open.');
        return;
      }
      const antwoord = [
        null,
        'cupcaek:Er gebeurt niks.',
        'caek:Ik druk nog een keer.',
        'cupcaek:Dat helpt vast.',
        null,
        'verteller:De knop maakt een klikje. Verder niets.',
        'cupcaek:Je mag blijven drukken hoor.',
      ][Math.min(rammen, 6)];
      if (!antwoord) return;
      const [wie, tekst] = antwoord.split(/:(.*)/s);
      await sp.dialoog.zeg(wie, tekst);
    },
  });

  // de poort gaat open op zijn eigen tempo, ongeacht wat jij doet
  level.zone(x - 11, x - 9, async (sp) => {
    sp.hud.kaart('EVEN GEDULD', 'de poort gaat zo open', 2600);
    await sp.dialoog.scene([
      ['verteller', 'De poort is dicht. Er staat geen tijd bij.'],
      ['caek', 'Hoe lang duurt dit?'],
      ['cupcaek', 'Dat weet niemand. Er staat wel een knop.'],
    ]);
    await pauze(5200);
    open = true;
    sp.geluid.deur();
    poortMuur.x0 = -999;
    poortMuur.x1 = -999;
    tunnel.userData.poort.visible = false;
    for (let i = 1; i < 5; i++) tunnel.userData[`balk${i}`].visible = false;
    sp.hud.kaart('DE POORT GAAT OPEN', 'zomaar ineens', 2000);
    await sp.dialoog.scene([
      ['verteller', 'De poort gaat open. Er is niets veranderd behalve de tijd.'],
      ['caek', 'Lag het aan de knop?'],
      ['cupcaek', 'Zeker weten doe je het nooit.'],
    ]);
  });
}

/** Hartjes die opstijgen en vervagen. */
function strooiHartjes(level, x, aantal = 12) {
  for (let i = 0; i < aantal; i++) {
    const hartje = props.label('♥', { breedte: 0.9, kleur: '#f2799f', grootte: 90 });
    hartje.position.set(x + Math.random() * 12, 2 + Math.random() * 2, 3 + Math.random() * 2);
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
}
