/* CAEK — Inspect & Adapt.
 *
 * De vierde en laatste Cluster Review, en meteen het einde van de PI. Alle
 * taarten op tafel, bijna elk teamdoel aan een segment gekoppeld, het
 * Doelenwiel vol. Wat je in de PI Planning beloofde naast wat er werkelijk
 * uitkwam.
 *
 * En dan pas SuperCaek. Niet als beloning voor hard werken maar omdat het
 * wiel vol is: alles trekt aan dezelfde doelen. Dat is wat een mascotte hoort
 * te betekenen.
 *
 * Twee beats, in deze volgorde, nooit door elkaar: eerst sluit de PI, dan pas
 * het woord. */

import * as THREE from 'three';
import { props, PALET, verf, gloed, laatRoken } from './gereedschap.js';
import { DOELENWIEL, PI, WAARDE } from '../../config.js';
import { pauze } from '../../ui/dialoog.js';

/** De taak van review 4. Krijgt de zaal van bouwReview() aangereikt. */
export function taakInspect(level, spel, zaal) {
  const { x0, lengte } = zaal;

  /* ---------------- beloofd naast geleverd ---------------- */

  // De taart van dit cluster staat er ook gewoon bij.
  zaal.eigenTafel.userData.taart.visible = true;

  const balkenX = zaal.muurX - 6;
  const beloofd = props.doos(1.6, 6.0, 0.6, PALET.blauwLicht, { emissief: 0.4 });
  beloofd.position.set(balkenX - 1.4, 3.0, 2.2);
  level.scene.add(beloofd);
  const geleverd = props.doos(1.6, 0.2, 0.6, PALET.goud, { emissief: 0.6 });
  geleverd.position.set(balkenX + 1.4, 0.1, 2.2);
  level.scene.add(geleverd);

  level.plaats(props.label('BELOOFD', { breedte: 2.6, grootte: 48, plaat: true }), balkenX - 1.4, 6.8, 0.2);
  level.plaats(props.label('GELEVERD', { breedte: 2.6, grootte: 48, plaat: true }), balkenX + 1.4, 6.8, 0.2);

  level.interactie({
    x: balkenX, y: 1.6, straal: 3.6,
    label: 'leg de Actual Value ernaast',
    async doe(sp) {
      sp.bezigMetScene++;
      sp.bevries(true);
      sp.geluid.klik();

      await sp.dialoog.scene([
        ['verteller', `Op de PI Planning beloofden de teams samen ${PI.beloofdeValue} punten business value.`],
        ['cupcaek', 'En nu kijken we wat er werkelijk uit is gekomen.'],
      ]);

      // De gouden balk groeit naar wat er daadwerkelijk geleverd is. Delen
      // door 100 en niet door het plafond: de meter komt nooit op vol, en
      // beloofd hoort ook nooit precies gelijk te zijn aan geleverd.
      const fractie = Math.min(1, sp.value / 100);
      const doelHoogte = 6.0 * fractie;
      let t = 0;
      await new Promise((klaar) => {
        level.tik((dt) => {
          t += dt;
          const f = Math.min(1, t / 1.6);
          const h = doelHoogte * f * f * (3 - 2 * f);
          geleverd.scale.y = Math.max(0.02, h / 0.2);
          geleverd.position.y = h / 2;
          if (t >= 1.6) { klaar(); return false; }
          return true;
        });
      });

      const werkelijk = Math.round(PI.beloofdeValue * fractie);
      sp.vlaggen.actualValue = werkelijk;
      await sp.dialoog.scene([
        ['verteller', `Actual Value: ${werkelijk} van de ${PI.beloofdeValue}.`],
        ['caek', 'Dat is minder dan we beloofden.'],
        ['cupcaek', 'Dat is bijna altijd zo. Daarom kijken we ernaar.'],
        ['cupcaek', 'Niet om het verschil weg te praten. Om te snappen waar het zit.'],
      ]);

      sp.vlaggen.actualBekeken = true;
      sp.bevries(false);
      sp.bezigMetScene--;
      probeerSluiten(sp);
    },
  });

  /* ---------------- de laatste koppelingen ---------------- */

  level.interactie({
    x: x0 + lengte * 0.32, y: 1.6, straal: 4.4,
    label: 'hang de laatste teamdoelen aan het wiel',
    async doe(sp) {
      sp.bezigMetScene++;
      sp.geluid.klik();
      await sp.dialoog.scene([
        ['verteller', 'De laatste teams hangen hun PI-doelen aan het Doelenwiel.'],
        ['caek', 'Er zit geen segment meer leeg.'],
      ]);
      await zaal.koppelNieuwe(sp);
      sp.geefValue(WAARDE.review, 'INSPECT & ADAPT');
      sp.vlaggen.wielVol = true;
      await sp.dialoog.scene([
        ['cupcaek', 'Alles wat we deden hangt aan hetzelfde wiel.'],
        ['cupcaek', 'Dat is geen toeval. Dat is een kwartaal werk.'],
      ]);
      sp.bezigMetScene--;
      probeerSluiten(sp);
    },
  });

  /* ---------------- problem solving workshop, als decor ---------------- */

  const werkplek = props.obeya(7, 3.6);
  level.plaats(werkplek, x0 + 12, 0, -10.5);
  level.plaats(props.label('PROBLEM SOLVING', { breedte: 5.2, grootte: 44, plaat: true }), x0 + 12, 4.4, -10.2);

  /* ---------------- de rommel waar SuperCaek doorheen dendert ---------------- */

  const rommelSoorten = ['PAPIERROMMEL', 'ONDUIDELIJKHEID', 'DUBBEL WERK', 'ONNODIGE COMPLEXITEIT'];
  const rommelStart = x0 + lengte - 20;
  spel.rommelTotaal = rommelSoorten.length;
  rommelSoorten.forEach((soort, i) => {
    const x = rommelStart + i * 3.4;
    const stapel = props.papierrommel(2.6);
    level.plaats(stapel, x, 0, 0);
    level.plaats(props.label(soort, { breedte: 4.6, grootte: 40, plaat: true }), x, 3.6, 0);
    const muur = level.voegMuur(x - 1.1, x + 1.1, 0, 2.6, {
      doorSuper: true,
      geraakt(speler) {
        if (!speler.superActief || !stapel.visible) return;
        stapel.visible = false;
        muur.x0 = -999;
        muur.x1 = -999;
        spel.rommelKapot++;
        spel.geluid.kaboom();
        spel.hud.kaart('KABOOM', soort, 700);
      },
    });
    // zonder SuperCaek kun je er ook overheen klimmen — het mag alleen langer duren
    level.platform(x, 2.8, 2.4);
  });

  /* ---------------- het einde van de PI ---------------- */

  const slotOven = props.oven(1.6, { tekst: 'EINDE PI', gloedKleur: PALET.goudLicht });
  level.plaats(slotOven, x0 + lengte - 4, 0, -7);
  laatRoken(level, slotOven, 'slotoven', { tempo: 2.4 });
  level.tik((dt, speler, sp) => {
    slotOven.userData.gloeien(PALET.goudLicht, 1.2 + Math.sin(sp.klok * 2.2) * 0.4);
  });
  spel.slotOven = slotOven;

  level.voegMuur(x0 + lengte + 1, x0 + lengte + 14, 0, 14);

  level.interactie({
    x: x0 + lengte - 8, y: 1.6, straal: 4.4,
    label: 'sluit de PI',
    async doe(sp) {
      await sp.finale();
    },
  });

  /* ---------------- binnenkomst ---------------- */

  level.zone(x0 + 4, x0 + 6, async (sp) => {
    await sp.dialoog.scene([
      ['verteller', 'Alle taarten staan op tafel. Alle teams staan erachter.'],
      ['cupcaek', 'Dit is het moment waarop we kijken wat het geworden is.'],
      ['cupcaek', 'Twee dingen: wat we beloofden, en wat er staat.'],
    ]);
    sp.hud.kaart('INSPECT & ADAPT', 'twee dingen bekijken, dan de PI sluiten', 3000);
  });

  zaal.watMist = (sp) => {
    if (sp.vlaggen.iaKlaar) return [];
    const rest = [];
    if (!sp.vlaggen.wielVol) rest.push('hang de laatste teamdoelen aan het wiel');
    if (!sp.vlaggen.actualBekeken) rest.push('leg de Actual Value naast de belofte');
    return rest;
  };

  function probeerSluiten(sp) {
    if (!sp.vlaggen.actualBekeken || !sp.vlaggen.wielVol || sp.vlaggen.iaKlaar) return;
    sp.vlaggen.iaKlaar = true;
    sp.cupcaek.laatDoor();
    sp.cupcaek.gezicht('blij');
    zaal.openUitgang();
    sp.ontgrendelSuperCaek();
  }
}

/* ------------------------------------------------------------------ *
 * SuperCaek, de echte
 * ------------------------------------------------------------------ */

/**
 * Twintig seconden waarin de hele renderer van genre wisselt.
 *
 * Hij dendert door papierrommel, onduidelijkheid, dubbel werk en onnodige
 * complexiteit. Niet door mensen.
 */
export async function startSuperCaek(sp) {
  if (sp.speler.superActief || !sp.superKlaar || sp.bezigMetScene) return;
  sp.superKlaar = false;
  sp.hud.toonSuperPrompt(false);

  sp.bezigMetScene++;
  sp.bevries(true);
  sp.geluid.super();

  await sp.dialoog.zeg('cupcaek', 'Broer...', { wacht: 1.1, traag: true });

  // anime-pauze: alles staat stil, de camera zoomt in
  sp.superDoel = 1;
  sp.schilder.zetFlits(0);
  for (let i = 0; i < 22; i++) { sp.schilder.zetFlits((i / 22) * 0.9); await pauze(28); }
  sp.speler.startSuper();
  sp.hud.kaart('SUPERCAEK', 'papierrommel · onduidelijkheid · dubbel werk', 2200);
  for (let i = 22; i >= 0; i--) { sp.schilder.zetFlits((i / 22) * 0.9); await pauze(24); }
  sp.schilder.zetFlits(0);
  sp.schud = 0.9;
  sp.bevries(false);
  sp.bezigMetScene--;
  sp.dialoog.zeg('supercaek', 'DENDEREN.', { wacht: 1.4 });
}
