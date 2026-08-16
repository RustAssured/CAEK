/* CAEK — het eindscherm.
 *
 * Geen SCORE: 18.450 maar een PI-afsluiting. En de meter komt nooit op 100,
 * want er is altijd wel iets te verbeteren. */

import { PI, WAARDE } from '../config.js';
import { maakWiel, doelVan } from './wiel.js';
import { pauze } from './dialoog.js';

export async function toonEindscherm(spel) {
  const el = document.querySelector('#eindscherm');
  const doel = doelVan(PI.strategisch);
  const value = Math.min(Math.round(spel.value), WAARDE.plafond);
  const piGehaald = spel.vlaggen.sprintdoel && spel.vlaggen.demoGegeven;

  const geleerd = [
    spel.metrics.length === 3 && '📊 Metrics gebruikt om een keuze te maken',
    spel.vlaggen.feedbackVerwerkt && '💬 Eén stuk relevante feedback verwerkt',
    spel.vlaggen.demoGegeven && '🎤 Werkend resultaat gedemonstreerd',
    spel.vlaggen.pretzelOpgelost && '🤝 Afhankelijkheid opgelost met business, IV en ketenpartner',
    spel.vlaggen.gesorteerd && '🧺 Werk geschrapt dat niet aan het sprintdoel bijdroeg',
    spel.vlaggen.debtOpgelost && '🔧 Technical debt opgeruimd voordat het toast werd',
  ].filter(Boolean);

  const overleefd = [
    `🍞 ${spel.scopeCreep.hoogsteGroei || 0}× Scope Creep gevoed`,
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
        <figcaption>DEZE PI DROEG HIERAAN BIJ</figcaption>
      </figure>
      <dl class="eind-rijen">
        <div class="eind-rij" style="animation-delay:.05s"><dt>PI-doel</dt><dd>${piGehaald ? '✅ Bereikt' : '🟡 Deels bereikt'} — ${PI.doel}</dd></div>
        <div class="eind-rij" style="animation-delay:.15s"><dt>Strategische bijdrage</dt><dd>🎯 ${doel.naam}</dd></div>
        <div class="eind-rij" style="animation-delay:.25s"><dt>Value</dt><dd class="eind-meter"><span class="balk"><i></i></span><b>0%</b></dd></div>
        <div class="eind-rij" style="animation-delay:.35s"><dt>Geleerd</dt><dd><ul>${geleerd.map((r) => `<li>${r}</li>`).join('') || '<li>Vooral: hard gewerkt.</li>'}</ul></dd></div>
        <div class="eind-rij" style="animation-delay:.45s"><dt>Overleefd</dt><dd><ul>${overleefd.map((r) => `<li>${r}</li>`).join('')}</ul></dd></div>
      </dl>
      <div class="eind-slot">
        <div class="kreet">BETERE INGREDIËNTEN,<br>BETER RESULTAAT!</div>
        <p class="eind-noot" hidden></p>
        <div class="eind-knoppen">
          <button class="knop-primair" id="opnieuw">Nog een PI</button>
        </div>
      </div>
    </div>`;

  el.querySelector('.wiel-houder').appendChild(maakWiel({ actief: PI.strategisch, labels: true }));
  el.hidden = false;

  const balk = el.querySelector('.eind-meter i');
  const getal = el.querySelector('.eind-meter b');
  await pauze(600);
  balk.style.width = `${value}%`;
  spel.geluid.waarde();

  // laat het getal oplopen
  const duur = 1400;
  const start = performance.now();
  await new Promise((klaar) => {
    const stap = () => {
      const t = Math.min(1, (performance.now() - start) / duur);
      getal.textContent = `${Math.round(value * (1 - (1 - t) ** 3))}%`;
      if (t < 1) requestAnimationFrame(stap); else klaar();
    };
    stap();
  });

  // De twist: één laatste sprinkle. En dan nóg is het geen 100.
  await pauze(900);
  const noot = el.querySelector('.eind-noot');
  noot.hidden = false;
  noot.textContent = 'Cupcaek gooit er één laatste sprinkle op.';
  await pauze(1100);
  const extra = Math.min(value + 1, 98);
  balk.style.width = `${extra}%`;
  getal.textContent = `${extra}%`;
  spel.geluid.pak();
  await pauze(1200);
  noot.textContent = 'Er is altijd wel iets te verbeteren.';

  el.querySelector('#opnieuw').addEventListener('click', () => location.reload());
}
