/* CAEK — het eindscherm.
 *
 * Geen SCORE: 18.450 maar een PI-afsluiting: beloofd naast geleverd, het
 * volle Doelenwiel, en wat er onderweg gebeurd is. De meter komt nooit op
 * 100, want er is altijd wel iets te verbeteren.
 *
 * Daarna twee dingen die geen spel meer zijn: het afscheidswoord en de
 * aftiteling. Allebei komen ze uit config.js, dus ze zijn tot vijf minuten
 * voor verzending nog aan te passen zonder dat er code aan te pas komt. Staat
 * er niets, dan slaat het scherm dat blok netjes over. */

import { AFSCHEID, AFTITELING, DOELENWIEL, PI, SLOGAN, TEAMS, WAARDE } from '../config.js';
import { maakWiel, verlichtWiel, doelVan } from './wiel.js';
import { pauze } from './dialoog.js';

export async function toonEindscherm(spel) {
  const el = document.querySelector('#eindscherm');
  const doel = doelVan(PI.strategisch);
  const value = Math.min(Math.round(spel.value), WAARDE.plafond);
  const piGehaald = spel.vlaggen.sprint1 && spel.vlaggen.demoGegeven;
  const beloofd = PI.beloofdeValue;
  const geleverd = spel.vlaggen.actualValue ?? Math.round(beloofd * (value / 100));

  const geleerd = [
    spel.sprintsAf.size >= 4 && '🎯 Vier sprintdoelen behaald',
    spel.metrics.length >= 3 && '📊 Metrics gebruikt om een keuze te maken',
    spel.vlaggen.review3Klaar && '💬 Eén stuk relevante feedback verwerkt',
    spel.vlaggen.demoGegeven && '🎤 Werkend resultaat gedemonstreerd in plaats van 83 slides',
    spel.vlaggen.sprint2 && '🤝 Afhankelijkheid opgelost door met drie teams af te stemmen',
    spel.vlaggen.gesorteerd && '🧺 Werk geschrapt dat niet aan het sprintdoel bijdroeg',
    spel.vlaggen.debtOpgelost && '🔧 Technical debt opgeruimd voordat het toast werd',
    spel.vlaggen.busGehad && `🚌 ${spel.vlaggen.busKeuze} laten vallen, en toch meegedragen`,
  ].filter(Boolean);

  const overleefd = [
    `🍞 ${spel.scopeCreep?.hoogsteGroei || 0}× Scope Creep gevoed`,
    `🎪 ${spel.reviewsBezocht.size}× Cluster Review, altijd een volle zaal`,
    '🥨 1× Dependency Pretzel',
    `📚 ${spel.rommelKapot}× papierrommel aan gruzelementen`,
    `☕ ${spel.vlaggen.overlegGehad ? 1 : 0}× "kort overleg"`,
    `🥔 ${spel.plops}× PLOP`,
  ];

  el.innerHTML = `
    <div class="eind-doos">
      <div class="eind-kop"><b>PI COMPLETE</b></div>

      <figure class="eind-wiel">
        <div class="wiel-houder"></div>
        <figcaption>${spel.gekoppeld.size} VAN DE ${DOELENWIEL.length} DOELEN GERAAKT</figcaption>
      </figure>

      <dl class="eind-rijen">
        <div class="eind-rij" style="animation-delay:.05s">
          <dt>PI-doel</dt>
          <dd>${piGehaald ? '✅ Bereikt' : '🟡 Deels bereikt'} — ${PI.doel}</dd>
        </div>
        <div class="eind-rij" style="animation-delay:.15s">
          <dt>Strategische bijdrage</dt><dd>🎯 ${doel.naam}</dd>
        </div>
        <div class="eind-rij" style="animation-delay:.25s">
          <dt>Business value</dt>
          <dd class="eind-vergelijk">
            <div class="vgl-regel"><span>beloofd</span><span class="balk beloofd"><i style="width:100%"></i></span><b>${beloofd}</b></div>
            <div class="vgl-regel"><span>geleverd</span><span class="balk geleverd"><i></i></span><b class="tel">0</b></div>
          </dd>
        </div>
        <div class="eind-rij" style="animation-delay:.35s">
          <dt>Geleerd</dt>
          <dd><ul>${geleerd.map((r) => `<li>${r}</li>`).join('') || '<li>Vooral: hard gewerkt.</li>'}</ul></dd>
        </div>
        <div class="eind-rij" style="animation-delay:.45s">
          <dt>Overleefd</dt><dd><ul>${overleefd.map((r) => `<li>${r}</li>`).join('')}</ul></dd>
        </div>
      </dl>

      <p class="eind-noot" hidden></p>

      ${afscheidBlok()}

      ${aftitelingBlok()}

      <div class="eind-slot">
        <div class="kreet">${SLOGAN.replace(', ', ',<br>')}</div>
        <div class="eind-knoppen">
          <button class="knop-primair" id="opnieuw">Nog een PI</button>
        </div>
      </div>
    </div>`;

  // het wiel op het eindscherm laat zien wat er dit kwartaal geraakt is
  const grootWiel = maakWiel({ actief: PI.strategisch, labels: true });
  verlichtWiel(grootWiel, spel.gekoppeld);
  el.querySelector('.wiel-houder').appendChild(grootWiel);
  el.hidden = false;

  await pauze(600);

  /* ---------------- beloofd naast geleverd ---------------- */

  const balk = el.querySelector('.geleverd i');
  const getal = el.querySelector('.eind-vergelijk .tel');
  balk.style.width = `${Math.round((geleverd / beloofd) * 100)}%`;
  spel.geluid.waarde();

  await tel(getal, geleverd, 1400);

  // De twist: één laatste sprinkle. En dan nóg is het niet alles.
  await pauze(900);
  const noot = el.querySelector('.eind-noot');
  noot.hidden = false;
  noot.textContent = 'Cupcaek gooit er één laatste sprinkle op.';
  await pauze(1100);
  const extra = geleverd + Math.max(1, Math.round(beloofd * 0.01));
  balk.style.width = `${Math.min(98, Math.round((extra / beloofd) * 100))}%`;
  getal.textContent = String(extra);
  spel.geluid.pak();
  await pauze(1200);
  noot.textContent = 'Er is altijd wel iets te verbeteren.';

  el.querySelector('#opnieuw').addEventListener('click', () => location.reload());
}

/* ------------------------------------------------------------------ *
 * Het afscheidswoord
 * ------------------------------------------------------------------ */

/* De woorden moeten van Woo Jung zijn, niet van mij. Staat AFSCHEID.regels
 * leeg, dan bestaat dit blok gewoon niet en klopt het scherm nog steeds. */
function afscheidBlok() {
  if (!AFSCHEID.regels?.length) return '';
  const regels = AFSCHEID.regels.map((r) => `<p>${r}</p>`).join('');
  const onder = AFSCHEID.ondertekening
    ? `<footer class="afscheid-onder">— ${AFSCHEID.ondertekening}</footer>`
    : '';
  return `<section class="eind-afscheid">${regels}${onder}</section>`;
}

/* ------------------------------------------------------------------ *
 * De aftiteling
 * ------------------------------------------------------------------ */

/* Hier mag het lang zijn, hier verwacht iedereen volledigheid. Staat
 * AFTITELING leeg, dan vallen we terug op de teamlijst -- dan staat er in elk
 * geval iets, en dat is beter dan een leeg blok. */
function aftitelingBlok() {
  const blokken = AFTITELING?.length ? AFTITELING : [
    { kop: 'Applicatieteams', namen: TEAMS.filter((t) => t.soort === 'applicatie').map((t) => t.naam) },
    { kop: 'Enablerteams', namen: TEAMS.filter((t) => t.soort === 'enabler').map((t) => t.naam) },
  ];
  const inhoud = blokken.map((b) => `
    <div class="aftiteling-blok">
      <h4>${b.kop}</h4>
      <p>${(b.namen || []).join(' · ')}</p>
    </div>`).join('');
  return `
    <section class="eind-aftiteling">
      <h3>DIT CLUSTER BESTOND UIT</h3>
      ${inhoud}
    </section>`;
}

/* ------------------------------------------------------------------ */

function tel(el, naar, duur) {
  const start = performance.now();
  return new Promise((klaar) => {
    const stap = () => {
      const t = Math.min(1, (performance.now() - start) / duur);
      el.textContent = String(Math.round(naar * (1 - (1 - t) ** 3)));
      if (t < 1) requestAnimationFrame(stap); else klaar();
    };
    stap();
  });
}
