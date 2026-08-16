/* CAEK — het level, van PI Planning tot de volgende PI.
 *
 *   PI PLANNING ─┬─→ sprint 1 ─→ REVIEW 1 ─┐
 *                ├─→ sprint 2 ─→ REVIEW 2 ─┤
 *                ├─→ sprint 3 ─→ REVIEW 3 ─┤
 *                └─→ sprint 4 ─→ INSPECT & ADAPT
 *                                          │
 *                                volgende PI komt in zicht
 *
 * Vier sprints met de Cluster Review als terugkerende hub. Het terugkerende
 * deel is geen herhaling om de herhaling: de zaal is vanaf review 1 vol, en
 * wat groeit is het aantal gouden lijnen naar het Doelenwiel. */

import * as props from '../../world/props.js';
import { PALET } from '../../world/materialen.js';
import { SECTIES, WERELD_EINDE } from '../../config.js';
import { bouwPlanning } from './planning.js';
import { bouwSprint1, bouwSprint2, bouwSprint3, bouwSprint4 } from './sprints.js';
import { bouwReview, taakReview1, taakReview2, taakReview3 } from './review.js';
import { taakInspect } from './inspect.js';
import { sectie } from './gereedschap.js';

export function bouwLevel(level, spel) {
  decor(level);

  bouwPlanning(level, spel);

  bouwSprint1(level, spel);
  bouwReview(level, spel, { nummer: 1, sectieId: 'review1', taak: taakReview1 });

  bouwSprint2(level, spel);
  bouwReview(level, spel, { nummer: 2, sectieId: 'review2', taak: taakReview2 });

  bouwSprint3(level, spel);
  bouwReview(level, spel, { nummer: 3, sectieId: 'review3', taak: taakReview3 });

  bouwSprint4(level, spel);

  const ia = sectie('inspect');
  bouwReview(level, spel, {
    nummer: 4,
    sectieId: 'inspect',
    taak: taakInspect,
    zaalBreedte: 28,
    uitgangOp: ia.x + 40,
  });

  sectiekaarten(level);
}

/* ------------------------------------------------------------------ *
 * Decor over de hele wereld
 * ------------------------------------------------------------------ */

function decor(level) {
  const achter = props.achtergrondBakkerij(WERELD_EINDE + 80, 7);
  level.plaats(achter, WERELD_EINDE / 2, 0, 0);

  for (let x = 6; x < WERELD_EINDE; x += 27) {
    const boom = props.cipres(7 + (x % 5));
    level.plaats(boom, x + (x % 7), -0.4, -13 - (x % 4));
  }
  for (let x = 14; x < WERELD_EINDE; x += 19) {
    level.plaats(props.lantaarn(4.6), x, 0, -3.4);
  }
}

/* ------------------------------------------------------------------ *
 * Sectietitels onderweg
 * ------------------------------------------------------------------ */

/* De reviews zetten hun eigen kaart bij binnenkomst (die heeft meer te
 * vertellen), dus die slaan we hier over. */
const EIGEN_KAART = new Set(['planning', 'review1', 'review2', 'review3', 'inspect']);

function sectiekaarten(level) {
  for (const s of SECTIES) {
    if (EIGEN_KAART.has(s.id)) continue;
    level.zone(s.x - 1, s.x + 1, (spel) => {
      spel.hud.zetSectie(s.naam, s.doel || '');
      spel.hud.kaart(s.titel, s.onder);
    });
  }
}
