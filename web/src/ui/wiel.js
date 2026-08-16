/* CAEK — het Doelenwiel als SVG.
 * Klein in de HUD (waar elke waardevolle actie een gouden lijn terugstuurt),
 * groot op het eindscherm. Het is de visuele ruggengraat: alles wat je doet
 * hangt aan één segment. */

import { DOELENWIEL } from '../config.js';

const NS = 'http://www.w3.org/2000/svg';

function boogPad(cx, cy, r, van, tot) {
  const a1 = (van - 90) * Math.PI / 180;
  const a2 = (tot - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
  const groot = tot - van > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${groot} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * @param {object} opties
 * @param {string} opties.actief  id van het strategische doel van deze PI
 * @param {boolean} opties.labels toon de namen rond het wiel
 * @param {number} opties.gloed   0..1, hoe hard het actieve segment oplicht
 */
export function maakWiel({ actief, labels = false, gloed = 1 } = {}) {
  const R = 46;
  const marge = labels ? 46 : 8;
  const maat = (R + marge) * 2;
  const c = maat / 2;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${maat} ${maat}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Doelenwiel UWV');

  const stap = 360 / DOELENWIEL.length;
  DOELENWIEL.forEach((doel, i) => {
    const pad = document.createElementNS(NS, 'path');
    const isActief = doel.id === actief;
    pad.setAttribute('d', boogPad(c, c, R, i * stap, (i + 1) * stap));
    pad.setAttribute('fill', doel.kleur);
    pad.setAttribute('stroke', '#0b1640');
    pad.setAttribute('stroke-width', '3');
    pad.setAttribute('opacity', isActief ? String(0.55 + 0.45 * gloed) : '0.34');
    pad.dataset.doel = doel.id;
    if (isActief) pad.classList.add('actief');
    svg.appendChild(pad);

    if (labels) {
      const hoek = (i * stap + stap / 2 - 90) * Math.PI / 180;
      const lr = R + 20;
      // De echte doelen zijn lange zinnen; `kort` is de opgebroken versie.
      const regels = doel.kort || [doel.naam];
      regels.forEach((regel, r) => {
        const tekst = document.createElementNS(NS, 'text');
        const dy = (r - (regels.length - 1) / 2) * 8;
        tekst.setAttribute('x', (c + lr * Math.cos(hoek)).toFixed(1));
        tekst.setAttribute('y', (c + lr * Math.sin(hoek) + dy).toFixed(1));
        tekst.setAttribute('text-anchor', 'middle');
        tekst.setAttribute('dominant-baseline', 'middle');
        tekst.setAttribute('font-size', '6.5');
        tekst.setAttribute('font-family', '"Arial Black", sans-serif');
        tekst.setAttribute('fill', isActief ? '#ffd873' : '#8fa2d8');
        tekst.textContent = regel;
        svg.appendChild(tekst);
      });
    }
  });

  const naaf = document.createElementNS(NS, 'circle');
  naaf.setAttribute('cx', c);
  naaf.setAttribute('cy', c);
  naaf.setAttribute('r', R * 0.36);
  naaf.setAttribute('fill', '#fdf3d8');
  naaf.setAttribute('stroke', '#0b1640');
  naaf.setAttribute('stroke-width', '3');
  svg.appendChild(naaf);

  for (const [regel, dy] of [['DOELEN', -3], ['UWV', 7]]) {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', c);
    t.setAttribute('y', c + dy);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-size', labels ? '10' : '11');
    t.setAttribute('font-family', '"Arial Black", sans-serif');
    t.setAttribute('fill', '#0b1640');
    t.textContent = regel;
    svg.appendChild(t);
  }

  return svg;
}

export function doelVan(id) {
  return DOELENWIEL.find((d) => d.id === id);
}

/**
 * Zet de segmenten aan die aan een teamdoel gekoppeld zijn.
 *
 * Dit is de enige voortgangsmeter van het spel: vier sprints lang zie je het
 * wiel voller worden, en vol wiel betekent SuperCaek.
 */
export function verlichtWiel(svg, gekoppeld) {
  for (const pad of svg.querySelectorAll('path[data-doel]')) {
    const aan = gekoppeld.has(pad.dataset.doel);
    pad.setAttribute('opacity', aan ? '1' : '0.26');
    pad.classList.toggle('aan', aan);
  }
}

/** Laat één segment kort oppulsen. */
export function pulsSegment(svg, id) {
  const pad = svg.querySelector(`path[data-doel="${id}"]`);
  if (!pad) return;
  pad.classList.remove('actief');
  void pad.getBoundingClientRect();
  pad.classList.add('actief');
}
