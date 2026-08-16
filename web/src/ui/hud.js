/* CAEK — de HUD.
 *
 * Rechtsboven staat geen scorebalk maar het Doelenwiel, en dat is het hele
 * punt: alles wat je doet hangt aan een segment, en vier sprints lang zie je
 * het voller worden. Eén meter met één betekenis.
 *
 * Waarde bestaat nog wel, maar die zie je pas bij Inspect & Adapt, als
 * beloofd naast geleverd. Tussendoor krijg je alleen een gouden +N die
 * opstijgt: dat is feedback, geen meter. */

import { DOELENWIEL, PI } from '../config.js';
import { maakWiel, verlichtWiel, pulsSegment } from './wiel.js';

const $ = (s) => document.querySelector(s);

export class Hud {
  constructor() {
    this.wortel = $('#hud');
    this.wielTeller = $('#wiel-teller');
    this.sectieNaam = $('#sectie-naam');
    this.sprintdoel = $('#sprintdoel');
    this.pluspjes = $('#value-pluspjes');
    this.superPrompt = $('#super-prompt');
    this.prompt = $('#prompt');
    this.promptTekst = this.prompt.querySelector('span');
    this.titelkaart = $('#titelkaart');

    this.tellers = {
      mand: $('#teller-mand'),
      metrics: $('#teller-metrics'),
      sprinkles: $('#teller-sprinkles'),
    };

    this.wielHouder = $('#wiel-mini');
    this.wiel = maakWiel({ actief: PI.strategisch });
    this.wielHouder.appendChild(this.wiel);
    this.zetWiel(new Set([PI.strategisch]));
  }

  toon(zichtbaar) {
    this.wortel.hidden = !zichtbaar;
  }

  /* ---------------- het Doelenwiel als voortgangsmeter ---------------- */

  /** @param {Set<string>} gekoppeld ids van segmenten met een teamdoel eraan */
  zetWiel(gekoppeld, netGekoppeld = null) {
    verlichtWiel(this.wiel, gekoppeld);
    this.wielTeller.textContent = `${gekoppeld.size}/${DOELENWIEL.length}`;
    this.wielHouder.classList.toggle('vol', gekoppeld.size >= DOELENWIEL.length);
    if (netGekoppeld) pulsSegment(this.wiel, netGekoppeld);
  }

  /* ---------------- de rest ---------------- */

  zetTeller(naam, waarde) {
    const el = this.tellers[naam];
    if (!el || el.textContent === String(waarde)) return;
    el.textContent = waarde;
    const doos = el.closest('.teller');
    doos.classList.remove('puls');
    void doos.offsetWidth;
    doos.classList.add('puls');
  }

  zetSectie(naam, doel = '') {
    this.sectieNaam.textContent = naam;
    this.sprintdoel.textContent = doel;
    this.sprintdoel.classList.remove('af');
  }

  streepSprintdoelDoor() {
    this.sprintdoel.classList.add('af');
  }

  /** Gouden +Value die opstijgt. Feedback dat déze actie ertoe deed. */
  plusValue(punten, label = '') {
    const el = document.createElement('div');
    el.className = 'pluspje';
    el.textContent = label ? `+${punten} ${label}` : `+${punten} Value`;
    this.pluspjes.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  toonPrompt(tekst) {
    if (!tekst) {
      this.prompt.hidden = true;
      return;
    }
    this.promptTekst.textContent = tekst;
    this.prompt.hidden = false;
  }

  toonSuperPrompt(zichtbaar) {
    this.superPrompt.hidden = !zichtbaar;
  }

  raak(wie) {
    const el = document.querySelector(`#portret-${wie}`);
    if (!el) return;
    el.classList.remove('geraakt');
    void el.offsetWidth;
    el.classList.add('geraakt');
  }

  /** Grote sectietitel die even in beeld staat. */
  kaart(titel, onder = '', duur = 2400) {
    clearTimeout(this.#kaartTimer);
    this.titelkaart.querySelector('b').textContent = titel;
    this.titelkaart.querySelector('i').textContent = onder;
    this.titelkaart.classList.remove('weg');
    this.titelkaart.hidden = false;
    void this.titelkaart.offsetWidth;
    this.#kaartTimer = setTimeout(() => {
      this.titelkaart.classList.add('weg');
      this.#kaartTimer = setTimeout(() => { this.titelkaart.hidden = true; }, 500);
    }, duur);
  }

  #kaartTimer = 0;
}
