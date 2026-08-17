/* CAEK — de PI Planning.
 *
 * Het begin van het kwartaal. Hier gebeurt alles wat er later nog vier keer
 * naar terugverwijst: het Doelenwiel hangt er groot en compleet, teams komen
 * met hun doelen aanzetten, risico's worden bekeken en afhankelijkheden
 * worden letterlijk zichtbaar gemaakt als draden tussen teams.
 *
 * Jij doet één ding: je neemt het PI-doel mee. En je ziet welk getal de teams
 * eraan hangen -- dat is de business value die bij Inspect & Adapt naast de
 * werkelijkheid komt te staan.
 *
 * En je ziet SuperCaek. Drie seconden. Geen beloning maar een introductie:
 * dit is wie we zijn als we er allemaal staan. */

import * as THREE from 'three';
import { props, PALET, verf, gloed, sectie, gouddraad, richtLijn, laatRoken } from './gereedschap.js';
import { DOELENWIEL, PI, TEAMS, WAARDE, koppelingen } from '../../config.js';
import { pauze } from '../../ui/dialoog.js';

export function bouwPlanning(level, spel) {
  const s = sectie('planning');
  const x0 = s.x;
  level.grond(x0 - 8, x0 + s.lengte + 2, 0, PALET.steen);

  /* ---------------- de oven die opwarmt ---------------- */

  const oven = props.oven(1.15, { tekst: 'PI PLANNING' });
  level.plaats(oven, x0 + 8, 0, -7);
  laatRoken(level, oven, 'planningoven', { tempo: 2.0 });
  level.tik((dt, speler, sp) => {
    oven.userData.gloeien(PALET.oranje, 1.4 + Math.sin(sp.klok * 3) * 0.5);
  });
  level.plaats(props.bord(['PI PLANNING'], { breedte: 5, hoogte: 1.8, grootte: 56 }), x0 + 2, 0, 2.4);

  /* ---------------- het Doelenwiel, groot en compleet ---------------- */

  const wielPunt = new THREE.Vector3(x0 + 21, 11.5, -8);
  const wiel = props.doelenwiel(DOELENWIEL, PI.strategisch, 4.6);
  wiel.position.copy(wielPunt);
  level.scene.add(wiel);
  spel.wielen.push(wiel);
  spel.wiel3d = wiel;
  level.tik((dt, speler, sp) => {
    wiel.rotation.z = Math.sin(sp.klok * 0.25) * 0.06;
    wiel.position.y = wielPunt.y + Math.sin(sp.klok * 0.7) * 0.22;
  });

  /* ---------------- teams komen met hun doelen aanzetten ---------------- */

  // Zes teamkaartjes die alvast een lijn naar het wiel hebben. Niet alle
  // zeventien: hier is het nog een intentie, geen kwartaal. Bij de reviews
  // wordt het pas echt.
  const KOPPELINGEN = koppelingen();
  for (let i = 0; i < 6; i++) {
    const koppeling = KOPPELINGEN[Math.floor((i * TEAMS.length) / 6)];
    const tx = x0 + 12 + i * 3.6;
    const kaartje = props.doos(2.6, 1.5, 0.12, PALET.papier, { emissief: 0.45 });
    level.plaats(kaartje, tx, 5.2 + (i % 2) * 1.4, -3.4);
    const naam = props.label(koppeling.team, { breedte: 2.7, kleur: '#0b1640', grootte: 52 });
    level.plaats(naam, tx, 5.2 + (i % 2) * 1.4, -3.26);

    const draad = gouddraad(
      new THREE.Vector3(tx, 5.8 + (i % 2) * 1.4, -3.4),
      wielPunt.clone(),
      { dikte: 0.04, sterkte: 1.0 },
    );
    level.scene.add(draad);
    level.tik((dt, speler, sp) => {
      const y = 5.2 + (i % 2) * 1.4 + Math.sin(sp.klok * 1.1 + i) * 0.16;
      kaartje.position.y = y;
      naam.position.y = y;
      richtLijn(draad, new THREE.Vector3(tx, y + 0.6, -3.4), new THREE.Vector3(wielPunt.x, wiel.position.y, wielPunt.z));
    });
  }

  /* ---------------- risico's ---------------- */

  const risicoBord = props.bord(['RISICO\'S', 'benoemd, niet weggepoetst'], { breedte: 6.0, hoogte: 2.2, grootte: 40 });
  level.plaats(risicoBord, x0 + 27, 0, 2.2);
  const risicos = ['te weinig tijd', 'twee keer hetzelfde', 'niemand beschikbaar', 'het staat niet in de keten'];
  risicos.forEach((tekst, i) => {
    const kaart = props.doos(2.0, 1.2, 0.1, [PALET.rood, PALET.oranje, PALET.goud, PALET.roze][i], { emissief: 0.4 });
    level.plaats(kaart, x0 + 24 + i * 2.2, 3.6 + (i % 2) * 1.2, 1.9);
    const label = props.label(tekst, { breedte: 2.1, grootte: 42, kleur: '#0b1640' });
    level.plaats(label, x0 + 24 + i * 2.2, 3.6 + (i % 2) * 1.2, 2.0);
  });

  level.interactie({
    x: x0 + 27, y: 1.6, straal: 3.4,
    label: 'kijk naar de risico\'s',
    async doe(sp) {
      sp.geluid.klik();
      await sp.dialoog.scene([
        ['verteller', 'De risico\'s hangen er gewoon. Opgeschreven, met naam en toenaam.'],
        ['caek', 'Moeten die niet weg?'],
        ['cupcaek', 'Nee. Een risico dat er hangt is een risico dat iemand ziet.'],
      ]);
    },
  });

  /* ---------------- afhankelijkheden als draden tussen teams ---------------- */

  const knopen = [];
  for (let i = 0; i < 5; i++) {
    const kx = x0 + 34 + (i % 3) * 3.4;
    const ky = 3.0 + Math.floor(i / 3) * 3.2;
    const bal = props.bol(0.44, [PALET.blauwLicht, PALET.groen, PALET.oranje][i % 3], { emissief: 0.55 });
    level.plaats(bal, kx, ky, -3.0);
    knopen.push(new THREE.Vector3(kx, ky, -3.0));
  }
  for (let i = 0; i < knopen.length; i++) {
    for (let j = i + 1; j < knopen.length; j++) {
      if ((i + j) % 2) continue;   // niet alles met alles, dat leest niet meer
      const draad = props.kabel(knopen[i], knopen[j], PALET.blauwLicht, 0.8);
      level.scene.add(draad);
    }
  }
  level.plaats(props.label('AFHANKELIJKHEDEN', { breedte: 6.0, grootte: 46, plaat: true }), x0 + 37.4, 8.4, -3.0);

  /* ---------------- de business value die de teams beloven ---------------- */

  const valueBord = props.bord(['BUSINESS VALUE', `${PI.beloofdeValue} punten beloofd`], { breedte: 7.0, hoogte: 2.4, grootte: 40 });
  level.plaats(valueBord, x0 + 45, 0, 2.4);
  level.interactie({
    x: x0 + 45, y: 1.6, straal: 3.2,
    label: 'bekijk de beloofde business value',
    async doe(sp) {
      sp.geluid.klik();
      await sp.dialoog.scene([
        ['verteller', `De teams hangen er samen ${PI.beloofdeValue} punten business value aan.`],
        ['caek', 'Is dat veel?'],
        ['cupcaek', 'Dat weten we aan het eind van de PI. Niet nu.'],
      ]);
    },
  });

  /* ---------------- het PI-doel meenemen ---------------- */

  const receptGroep = new THREE.Group();
  const recept = props.doos(2.2, 2.8, 0.14, PALET.papier, { emissief: 0.5 });
  recept.rotation.z = -0.12;
  receptGroep.add(recept);
  const receptLabel = props.label(['PI', 'DOEL'], { breedte: 2.0, kleur: '#0b1640', grootte: 62 });
  receptLabel.position.z = 0.12;
  receptGroep.add(receptLabel);
  level.plaats(receptGroep, x0 + 51, 2.6, 0.4);
  level.tik((dt, speler, sp) => {
    if (sp.vlaggen.piDoelGepakt) return;
    receptGroep.position.y = 2.6 + Math.sin(sp.klok * 1.6) * 0.2;
    receptGroep.rotation.z = Math.sin(sp.klok * 0.9) * 0.08;
  });

  // de gouden lijn wiel -> Caek, terwijl hij het doel draagt
  const draagLijn = gouddraad(wielPunt.clone(), wielPunt.clone(), { dikte: 0.08, sterkte: 1.8 });
  draagLijn.visible = false;
  level.scene.add(draagLijn);
  level.tik((dt, speler) => {
    if (!draagLijn.visible) return;
    richtLijn(draagLijn,
      new THREE.Vector3(wielPunt.x, wiel.position.y, wielPunt.z),
      new THREE.Vector3(speler.x, speler.y + 1.4, 0));
  });

  level.interactie({
    x: x0 + 51, y: 2.6, straal: 3.2,
    label: 'neem het PI-doel mee',
    async doe(sp) {
      sp.vlaggen.piDoelGepakt = true;
      sp.geluid.waarde();
      receptGroep.visible = false;
      draagLijn.visible = true;
      await sp.dialoog.scene([
        ['verteller', 'PI-DOEL ONTVANGEN'],
        ['verteller', `Strategisch doel: ${DOELENWIEL.find((d) => d.id === PI.strategisch).naam}.`],
        ['verteller', `PI-doel: ${PI.doel}`],
        ['caek', 'Dit past niet in mijn rugzak.'],
        ['cupcaek', 'Het past wel. Het past alleen niet meteen.'],
      ]);
      setTimeout(() => { draagLijn.visible = false; }, 4500);
      await superIntro(sp);
    },
  });

  /* ---------------- openingsscene ---------------- */

  level.zone(x0, x0 + 4, async (sp) => {
    sp.bevries(true);
    await sp.dialoog.scene([
      ['verteller', 'De oven warmt op. Overal vliegen kaartjes, doelen en ingrediënten voorbij.'],
      ['cupcaek', 'Broer! Het is weer zover. Nieuwe PI.'],
      ['caek', 'Al?'],
      ['cupcaek', 'Vier sprints. Vier keer een volle zaal. En dan opnieuw.'],
      ['verteller', 'Aan het begin van een PI weet je wát je wilt bereiken. Nog niet precies hoe.'],
    ]);
    sp.bevries(false);
    sp.hud.kaart(s.titel, s.onder);
    sp.hud.zetSectie(s.naam, 'Neem het PI-doel mee');
  });

  level.checkpoint(x0 + 54, 0, 'PI GESTART');

  // een paar tussenplatforms zodat er ook echt gesprongen wordt
  level.platform(x0 + 15, 2.6, 3.6);
  level.platform(x0 + 19.5, 4.4, 3.2);
  level.platform(x0 + 31, 2.4, 3.2);
  level.platform(x0 + 41, 3.0, 3.4);
}

/* ------------------------------------------------------------------ *
 * SuperCaek, drie seconden
 * ------------------------------------------------------------------ */

/**
 * Geen beloning maar een introductie.
 *
 * SuperCaek is de mascotte waarin Caek verandert tijdens de PI-dagen, als het
 * hele cluster samenkomt om extra kracht te laten zien. Hier zie je hem één
 * keer, kort, zodat je vanaf minuut één weet dat dat ding bestaat. De echte
 * transformatie komt pas bij Inspect & Adapt.
 */
async function superIntro(sp) {
  sp.bezigMetScene++;
  sp.bevries(true);
  sp.geluid.super();

  await sp.dialoog.zeg('verteller', 'En dan, heel even, gebeurt er iets.', { wacht: 1.0 });

  sp.superDoel = 1;
  for (let i = 0; i < 18; i++) { sp.schilder.zetFlits((i / 18) * 0.9); await pauze(26); }
  sp.speler.startSuper(3.0);
  sp.hud.kaart('SUPERCAEK', 'de mascotte van de PI-dagen', 2000);
  for (let i = 18; i >= 0; i--) { sp.schilder.zetFlits((i / 18) * 0.9); await pauze(24); }
  sp.schilder.zetFlits(0);
  sp.schud = 0.7;

  await sp.dialoog.zeg('supercaek', 'DIT IS WIE WE ZIJN ALS WE ER ALLEMAAL STAAN.', { wacht: 1.6 });
  await pauze(600);
  await sp.dialoog.scene([
    ['caek', '...wat was dat?'],
    ['cupcaek', 'Dat gebeurt op de PI-dagen. Als iedereen er is.'],
    ['cupcaek', 'Aan het eind van deze PI zie je hem terug.'],
  ]);

  sp.bevries(false);
  sp.bezigMetScene--;
}
