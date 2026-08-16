/* CAEK — de Cluster Review.
 *
 * Eén bouwer die vier keer draait. Dat is geen bezuiniging maar het punt: de
 * Cluster Review is de hub van het kwartaal, en je hoort hem te herkennen als
 * je binnenkomt. Zelfde zaal, zelfde slingers, zelfde radiootje.
 *
 * De zaal is vanaf review 1 vol. Alle teams zijn er, elke keer. Die teams daar
 * krijgen was de grootste strijd, en dat ze er nu allemaal zijn is precies
 * waar dit cluster trots op is. Een podium dat langzaam volloopt zou zeggen
 * "in het begin kwam er niemand", en dat is het tegenovergestelde van waar.
 *
 * Wat wél groeit is de koppeling aan het Doelenwiel: bij review 1 hangen een
 * paar teamdoelen aan een segment, bij Inspect & Adapt bijna allemaal. Dat is
 * de beweging die er echt is, en je ziet hem als gouden lijnen die zich per
 * review vermenigvuldigen. */

import * as THREE from 'three';
import {
  props, PALET, verf, gloed, bij, sectie, trekDraad, gouddraad, zetPubliek,
} from './gereedschap.js';
import {
  TEAMS, PUBLIEK, DOELENWIEL, PI, SPRINKLES, WAARDE, WOO_JUNG_FM, SCHAKELS, koppelingen,
} from '../../config.js';

const KOPPELINGEN = koppelingen();

/**
 * Bouwt één Cluster Review.
 *
 * @param {import('../../world/level.js').Level} level
 * @param {object} spel
 * @param {{nummer: number, sectieId: string, taak: Function}} opties
 *   `taak` krijgt de zaal terug en hangt er de opdracht van deze review aan.
 */
export function bouwReview(level, spel, { nummer, sectieId, taak, zaalBreedte, uitgangOp }) {
  const s = sectie(sectieId);
  const x0 = s.x;
  const lengte = s.lengte;
  const laatste = nummer === 4;

  // Hoe breed de zaal zelf is en waar de uitgang zit. Bij Inspect & Adapt
  // staat er nog van alles achter de uitgang -- de rommel waar SuperCaek
  // doorheen dendert, en de oven waarin de PI sluit.
  const ruimte = zaalBreedte ?? lengte - 20;
  const muurX = uitgangOp ?? (x0 + lengte - 4);

  level.grond(x0 - 2, x0 + lengte + 2, 0, PALET.steen);

  const zaal = { nummer, x0, lengte, laatste, ruimte, muurX, standen: new Map(), wiel: null, draden: [] };

  /* ---------------- het Doelenwiel boven de zaal ---------------- */

  const wielX = x0 + 8 + ruimte * 0.5;
  const wielY = laatste ? 15.5 : 13.5;
  const wiel = props.doelenwiel(DOELENWIEL, PI.strategisch, laatste ? 5.2 : 4.0);
  wiel.position.set(wielX, wielY, -11);
  level.scene.add(wiel);
  spel.wielen.push(wiel);
  zaal.wiel = wiel;
  zaal.wielPunt = new THREE.Vector3(wielX, wielY, -11);

  level.tik((dt, speler, sp) => {
    wiel.rotation.z = Math.sin(sp.klok * 0.22 + nummer) * 0.05;
    wiel.position.y = wielY + Math.sin(sp.klok * 0.6) * 0.2;
    zaal.wielPunt.y = wiel.position.y;
  });

  /* ---------------- slingers ---------------- */

  for (let i = 0; i < Math.floor(lengte / 7); i++) {
    const slinger = props.kabel(
      new THREE.Vector3(x0 + 3 + i * 7, 7.8, -3),
      new THREE.Vector3(x0 + 10 + i * 7, 7.8, -3),
      [PALET.goud, PALET.roze, PALET.groen][i % 3], 1.2,
    );
    level.scene.add(slinger);
  }

  level.plaats(
    props.bord([`CLUSTER REVIEW ${nummer}`, laatste ? 'INSPECT & ADAPT' : 'iedereen is er'], {
      breedte: 7.0, hoogte: 2.4, grootte: 40,
    }),
    x0 + 2, 0, 2.6,
  );

  /* ---------------- alle teams, elke keer ---------------- */

  const perRij = Math.ceil(TEAMS.length / 2);
  TEAMS.forEach((team, i) => {
    const rij = i < perRij ? 0 : 1;
    const inRij = rij === 0 ? i : i - perRij;
    const aantalInRij = rij === 0 ? perRij : TEAMS.length - perRij;
    const tx = x0 + 8 + (aantalInRij < 2 ? ruimte / 2 : (inRij / (aantalInRij - 1)) * ruimte)
      + (rij === 1 ? ruimte / (aantalInRij * 2) : 0);
    const tz = rij === 0 ? -3.2 : -7.4;

    const stand = props.teamstand(team.naam, {
      kleur: [PALET.goud, PALET.roze, PALET.groen, PALET.oranje, PALET.blauwLicht][i % 5],
      enabler: team.soort === 'enabler',
    });
    level.plaats(stand, tx, rij === 1 ? 1.1 : 0, tz);
    zaal.standen.set(team.naam, { stand, x: tx, z: tz, y: rij === 1 ? 1.1 : 0, team });

    // cadans: een deel van de teams draait nog niet in hetzelfde ritme. Hun
    // oventimer staat anders, hun taart komt een tel later. Puur visueel.
    const uitDeMaat = SCHAKELS.cadans && team.cadans === false;
    const tempo = uitDeMaat ? 1.35 : 2.2;
    const faseVerschuiving = uitDeMaat ? 1.9 : 0;
    level.tik((dt, speler, sp) => {
      const puls = Math.sin(sp.klok * tempo + faseVerschuiving);
      stand.userData.lampje.material = gloed(uitDeMaat ? PALET.blauwLicht : PALET.oranje, 0.9 + puls * 0.5);
      stand.userData.resultaat.position.y = 1.12 + Math.max(0, puls) * 0.07;
    });
  });

  /* ---------------- de gouden lijnen naar het wiel ---------------- */

  // Alles wat tot en met deze review gekoppeld is hangt er al bij binnenkomst.
  // Wat er in déze review bij komt trekt zichtbaar aan -- dat is het verschil
  // dat je moet zien.
  const alGekoppeld = KOPPELINGEN.filter((k) => k.review < nummer);
  const nieuwDezeReview = KOPPELINGEN.filter((k) => k.review === nummer);

  for (const koppeling of alGekoppeld) {
    const plek = zaal.standen.get(koppeling.team);
    if (!plek) continue;
    const draad = gouddraad(
      new THREE.Vector3(plek.x, plek.y + 2.8, plek.z),
      zaal.wielPunt.clone(),
      { dikte: 0.045, sterkte: 1.1 },
    );
    level.scene.add(draad);
    zaal.draden.push(draad);
  }

  zaal.koppelNieuwe = async (spelStaat) => {
    for (const koppeling of nieuwDezeReview) {
      const plek = zaal.standen.get(koppeling.team);
      if (!plek) continue;
      trekDraad(
        level,
        new THREE.Vector3(plek.x, plek.y + 2.8, plek.z),
        zaal.wielPunt.clone(),
        { dikte: 0.06, sterkte: 1.9, duur: 0.5 },
      );
      spelStaat.koppelDoel(koppeling.doel);
      await new Promise((r) => setTimeout(r, 110));
    }
  };

  /* ---------------- Obeya, publiek, radio ---------------- */

  const obeyaMuur = props.obeya(9, 4.4);
  level.plaats(obeyaMuur, muurX - 6, 0, -8.5);

  zetPubliek(level, {
    x: x0 + 8 + ruimte * 0.5,
    aantal: 16,
    breedte: Math.max(12, ruimte),
    z: 5.0,
    label: PUBLIEK,
  });

  if (SCHAKELS.wooJungFM) zetRadio(level, x0 + 5.5, nummer);

  /* ---------------- je eigen demotafel ---------------- */

  const eigenX = muurX - 11;
  const eigenTafel = props.demotafel(PALET.goud);
  eigenTafel.userData.taart.visible = false;
  level.plaats(eigenTafel, eigenX, 0, -1.4);
  const eigenBord = props.label('CAEK', { breedte: 2.6, grootte: 48, plaat: true });
  level.plaats(eigenBord, eigenX, 3.3, -1.4);
  zaal.eigenTafel = eigenTafel;
  zaal.eigenX = eigenX;

  /* ---------------- de uitgang ---------------- */

  const uitgang = level.voegMuur(muurX, muurX + 1, 0, 7);
  const hek = props.doos(0.6, 6.4, 5, PALET.steen, { plat: true });
  level.plaats(hek, muurX + 0.5, 3.2, -1);
  zaal.uitgang = uitgang;
  zaal.hek = hek;
  zaal.openUitgang = () => {
    uitgang.x0 = -999;
    uitgang.x1 = -999;
    hek.visible = false;
  };

  /* ---------------- binnenkomst ---------------- */

  level.zone(x0 + 1, x0 + 3.5, async (sp) => {
    sp.hud.zetSectie(s.naam, laatste ? 'Kijk terug, en kijk vooruit' : 'Laat zien wat er is');
    sp.hud.kaart(s.titel, s.onder);
    sp.cupcaek.blokkeer(muurX - 3);
    sp.cupcaek.gezicht('streng');
    sp.bezoekReview(nummer);
    if (nummer === 1) {
      await sp.dialoog.scene([
        ['verteller', 'Het hele level verandert in een festivalterrein.'],
        ['caek', 'We kunnen ook doorlopen.'],
        ['cupcaek', 'Nee.'],
        ['verteller', 'Alle teams zijn er. Alle teams zijn er altijd geweest.'],
      ]);
    } else if (!laatste) {
      await sp.dialoog.zeg('cupcaek', ['Weer iedereen aanwezig.', 'Zelfde zaal, meer lijnen.', 'Kijken, delen, luisteren.'][nummer - 2]);
    }
  });

  taak?.(level, spel, zaal);

  level.checkpoint(x0 + lengte - 1, 0, s.naam);
  return zaal;
}

/* ------------------------------------------------------------------ *
 * Woo Jung FM
 * ------------------------------------------------------------------ */

function zetRadio(level, x, nummer) {
  const toestel = props.radio();
  level.plaats(toestel, x, 0, 2.2);
  level.tik((dt, speler, sp) => {
    toestel.userData.schaal.material = gloed(PALET.room, 0.7 + Math.sin(sp.klok * 3.1) * 0.3);
  });

  let volgende = (nummer - 1) % WOO_JUNG_FM.length;
  level.interactie({
    x, y: 1.6, straal: 2.6, eenmalig: false,
    label: 'zet de radio aan',
    async doe(sp) {
      sp.geluid.klik();
      const tekst = WOO_JUNG_FM[volgende % WOO_JUNG_FM.length];
      volgende++;
      await sp.dialoog.zeg('radio', tekst);
    },
  });
}

/* ------------------------------------------------------------------ *
 * De taken per review
 * ------------------------------------------------------------------ */

/** Review 1 — laten zien wat je gebakken hebt, en kijken bij een ander. */
export function taakReview1(level, spel, zaal) {
  const kijkTeam = TEAMS[3];
  const kijkPlek = zaal.standen.get(kijkTeam.naam);

  level.interactie({
    x: kijkPlek.x, y: kijkPlek.y + 1.6, straal: 3.6,
    label: `kijk bij ${kijkTeam.naam}`,
    async doe(sp) {
      sp.vlaggen.gekeken1 = true;
      sp.geluid.pak();
      await sp.dialoog.scene([
        ['verteller', `${kijkTeam.naam} laat iets zien dat half werkt en helemaal duidelijk is.`],
        ['caek', 'Dat hadden wij ook kunnen gebruiken.'],
        ['cupcaek', '+1 inspiratie.'],
      ]);
      probeerAfronden1(sp, zaal);
    },
  });

  level.interactie({
    x: zaal.eigenX, y: 1.6, straal: 3.2,
    label: 'zet je sprintresultaat op tafel',
    async doe(sp) {
      if (!sp.vlaggen.sprint1) {
        await sp.dialoog.zeg('cupcaek', 'We hebben nog niets gebakken om te laten zien.');
        return;
      }
      sp.vlaggen.gedeeld1 = true;
      zaal.eigenTafel.userData.taart.visible = true;
      sp.geluid.pak();
      await sp.dialoog.zeg('verteller', 'Je zet je sprintresultaat op de demotafel. Mensen komen kijken.');
      probeerAfronden1(sp, zaal);
    },
  });

  async function probeerAfronden1(sp, z) {
    if (!sp.vlaggen.gekeken1 || !sp.vlaggen.gedeeld1 || sp.vlaggen.review1Klaar) return;
    sp.vlaggen.review1Klaar = true;
    sp.geefValue(WAARDE.review, 'CLUSTER REVIEW 1');
    await sp.dialoog.zeg('verteller', 'De eerste teamdoelen worden aan het Doelenwiel gehangen.');
    await z.koppelNieuwe(sp);
    sp.cupcaek.laatDoor();
    sp.cupcaek.gezicht('blij');
    z.openUitgang();
    await sp.dialoog.scene([
      ['cupcaek', 'Zie je die lijnen? Dat is waar alles aan hangt.'],
      ['cupcaek', 'Volgende sprint komen er meer bij.'],
    ]);
  }
}

/** Review 2 — de drie teams uit de afhankelijkheid laten hun kant zien. */
export function taakReview2(level, spel, zaal) {
  level.interactie({
    x: zaal.eigenX, y: 1.6, straal: 3.4,
    label: 'laat de keten zien',
    async doe(sp) {
      if (!sp.vlaggen.sprint2) {
        await sp.dialoog.zeg('cupcaek', 'De keten loopt nog niet rond. Dat wordt een korte demo.');
        return;
      }
      zaal.eigenTafel.userData.taart.visible = true;
      sp.geluid.pak();
      await sp.dialoog.scene([
        ['verteller', 'Drie teams laten hun kant van dezelfde keten zien. Achter elkaar. Het past.'],
        ['caek', 'Dit hebben we dus samen gebouwd.'],
        ['cupcaek', 'Dat is precies wat een cluster is.'],
      ]);
      sp.geefValue(WAARDE.review, 'CLUSTER REVIEW 2');
      await zaal.koppelNieuwe(sp);
      sp.vlaggen.review2Klaar = true;
      sp.cupcaek.laatDoor();
      sp.cupcaek.gezicht('blij');
      zaal.openUitgang();
    },
  });
}

/** Review 3 — feedback als hagelslag, met de running gag. */
export function taakReview3(level, spel, zaal) {
  const { x0, lengte } = zaal;

  SPRINKLES.forEach((sp, i) => {
    const x = x0 + 9 + i * 4.6;
    const y = 1.5 + (i % 2) * 2.4;
    const object = props.sprinkle(sp.kleur);
    level.plaats(object, x, y, 1.4);
    level.tik((dt, speler, staat) => {
      object.rotation.z += dt * 2;
      object.position.y = y + Math.sin(staat.klok * 2.2 + i) * 0.16;
    });
    level.pickup({
      x, y, straal: 1.7,
      doe(staat) {
        object.visible = false;
        staat.sprinkles.push(sp);
        staat.hud.zetTeller('sprinkles', staat.sprinkles.length);
        staat.geluid.pak();
      },
    });
  });
  level.platform(x0 + 13.5, 2.4, 3.0);
  level.platform(x0 + 22.5, 2.4, 3.0);

  level.interactie({
    x: zaal.eigenX, y: 1.6, straal: 3.4, eenmalig: false,
    label: 'verwerk feedback',
    async doe(sp) {
      if (sp.sprinkles.length === 0) {
        await sp.dialoog.zeg('cupcaek', 'We hebben nog geen feedback opgehaald. Die ligt overal.');
        return;
      }
      zaal.eigenTafel.userData.taart.visible = true;

      // de running gag: alles tegelijk verwerken laat de taart instorten
      if (!sp.vlaggen.allesGeprobeerd && sp.sprinkles.length >= 3) {
        const alles = await sp.paneel.kies(
          'Feedback verwerken',
          `Je hebt <b>${sp.sprinkles.length}</b> sprinkles opgehaald.`,
          [
            { label: 'Allemaal verwerken!', onder: 'we hebben het toch opgehaald', icoon: '🌈', waarde: 'alles' },
            { label: 'Eerst even kijken wat relevant is', icoon: '🔍', waarde: 'kies' },
          ],
        );
        if (alles === 'alles') {
          sp.vlaggen.allesGeprobeerd = true;
          sp.geluid.kaboom();
          zaal.eigenTafel.userData.taart.scale.set(1.4, 0.15, 1.4);
          await sp.dialoog.scene([
            ['verteller', 'Caek gooit alle sprinkles tegelijk op de taart.'],
            ['verteller', 'De taart stort in.'],
            ['cupcaek', 'Misschien hoeven we niet álle feedback te verwerken.'],
          ]);
          zaal.eigenTafel.userData.taart.scale.set(1, 1, 1);
          return;
        }
      }

      const keuze = await sp.paneel.kies(
        'Welke feedback verwerken we?',
        'Eén stuk. Degene die het PI-doel dichterbij brengt.',
        sp.sprinkles.map((k) => ({ label: k.tekst, icoon: '💬', waarde: k.id })),
      );
      const gekozen = SPRINKLES.find((k) => k.id === keuze);
      if (!gekozen.relevant) {
        sp.geluid.fout();
        await sp.dialoog.zeg('cupcaek', 'Kan. Maar helpt dat een ketenpartner sneller aan het juiste antwoord?');
        return;
      }
      sp.vlaggen.review3Klaar = true;
      sp.geefValue(WAARDE.feedback, 'RELEVANTE FEEDBACK VERWERKT');
      sp.geefValue(WAARDE.review, 'CLUSTER REVIEW 3');
      await sp.dialoog.zeg('verteller', 'Precies de feedback die over stap 3 ging. De plek waar de data ook al naar wees.');
      await zaal.koppelNieuwe(sp);
      sp.cupcaek.laatDoor();
      sp.cupcaek.gezicht('blij');
      zaal.openUitgang();
      await sp.dialoog.zeg('cupcaek', 'Het wiel is over de helft.');
    },
  });
}
