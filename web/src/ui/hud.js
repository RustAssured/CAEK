/* CAEK — de HUD. Rechtsboven staat geen score maar een VALUE METER, en dat
 * is het hele punt van de game. */

import { PI, WAARDE } from '../config.js';
import { maakWiel } from './wiel.js';

const $ = (s) => document.querySelector(s);

export class Hud {
  constructor() {
    this.wortel = $('#hud');
    this.valueGetal = $('#value-getal');
    this.valueVul = $('#value-vul');
    this.energieVul = $('#energie-vul');
    this.energieBalk = document.querySelector('.energie-balk');
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

    const wielHouder = $('#wiel-mini');
    this.wiel = maakWiel({ actief: PI.strategisch });
    wielHouder.appendChild(this.wiel);
  }

  toon(zichtbaar) {
    this.wortel.hidden = !zichtbaar;
  }

  zetValue(waarde) {
    const pct = Math.min(waarde, WAARDE.plafond);
    this.valueGetal.textContent = `${Math.round(pct)}%`;
    this.valueVul.style.width = `${pct}%`;
  }

  zetEnergie(fractie) {
    this.energieVul.style.width = `${Math.min(1, fractie) * 100}%`;
    this.energieBalk.classList.toggle('vol', fractie >= 1);
  }

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

  /** Gouden +Value die opstijgt, plus een pulsje op het Doelenwiel: elke
   *  waardevolle actie loopt zichtbaar terug naar het strategische doel. */
  plusValue(punten, label = '') {
    const el = document.createElement('div');
    el.className = 'pluspje';
    el.textContent = label ? `+${punten} ${label}` : `+${punten} Value`;
    this.pluspjes.appendChild(el);
    setTimeout(() => el.remove(), 1700);

    const segment = this.wiel.querySelector('.actief');
    if (segment) {
      segment.classList.remove('actief');
      void segment.getBoundingClientRect();
      segment.classList.add('actief');
    }
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
