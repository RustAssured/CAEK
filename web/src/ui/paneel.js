/* CAEK — het keuzepaneel. Wordt gebruikt voor de mand-sortering, de
 * metrics-keuze, de feedback sprinkles en de twee demoknoppen. Muis werkt,
 * en dat is bewust: de helft van de spelers pakt geen toetsenbord. */

export class Paneel {
  constructor(geluid) {
    this.el = document.querySelector('#paneel');
    this.doos = this.el.querySelector('.paneel-doos');
    this.titelEl = this.doos.querySelector('h2');
    this.uitlegEl = this.doos.querySelector('.paneel-uitleg');
    this.keuzesEl = this.doos.querySelector('.paneel-keuzes');
    this.voetEl = this.doos.querySelector('.paneel-voet');
    this.geluid = geluid;
    this.open = false;
  }

  /**
   * Eén keuze uit een lijst.
   * @returns {Promise<any>} de `waarde` van de gekozen optie
   */
  kies(titel, uitleg, opties) {
    return new Promise((res) => {
      this.#zet(titel, uitleg);
      for (const optie of opties) {
        const knop = this.#knop(optie);
        knop.addEventListener('click', () => {
          if (optie.blijftOpen) {
            optie.opKlik?.(knop, this);
            return;
          }
          this.geluid?.klik();
          this.sluit();
          res(optie.waarde);
        });
        this.keuzesEl.appendChild(knop);
      }
    });
  }

  /**
   * Meervoudige selectie met een bevestigknop — de mand-sortering.
   * @returns {Promise<Set<any>>} de aangevinkte waarden
   */
  vink(titel, uitleg, opties, knoptekst = 'Klaar', mogelijkLeeg = true) {
    return new Promise((res) => {
      this.#zet(titel, uitleg);
      const gekozen = new Set();
      for (const optie of opties) {
        const knop = this.#knop(optie);
        knop.setAttribute('aria-pressed', 'false');
        knop.addEventListener('click', () => {
          const aan = !gekozen.has(optie.waarde);
          if (aan) gekozen.add(optie.waarde); else gekozen.delete(optie.waarde);
          knop.classList.toggle('aan', aan);
          knop.setAttribute('aria-pressed', String(aan));
          this.geluid?.klik();
          bevestig.disabled = !mogelijkLeeg && gekozen.size === 0;
        });
        this.keuzesEl.appendChild(knop);
      }
      const bevestig = document.createElement('button');
      bevestig.className = 'knop-primair';
      bevestig.textContent = knoptekst;
      bevestig.disabled = !mogelijkLeeg;
      bevestig.addEventListener('click', () => {
        this.geluid?.klik();
        this.sluit();
        res(gekozen);
      });
      this.voetEl.appendChild(bevestig);
    });
  }

  /** Alleen tekst met één knop eronder. */
  melding(titel, uitleg, knoptekst = 'Oké') {
    return new Promise((res) => {
      this.#zet(titel, uitleg);
      const knop = document.createElement('button');
      knop.className = 'knop-primair';
      knop.textContent = knoptekst;
      knop.addEventListener('click', () => {
        this.geluid?.klik();
        this.sluit();
        res();
      });
      this.voetEl.appendChild(knop);
    });
  }

  #knop(optie) {
    const knop = document.createElement('button');
    knop.className = 'keuze';
    knop.type = 'button';
    knop.innerHTML = `
      <span class="icoon">${optie.icoon ?? '•'}</span>
      <span>${optie.label}${optie.onder ? `<small>${optie.onder}</small>` : ''}</span>`;
    if (optie.uit) knop.disabled = true;
    return knop;
  }

  #zet(titel, uitleg) {
    this.titelEl.textContent = titel;
    this.uitlegEl.innerHTML = uitleg || '';
    this.keuzesEl.replaceChildren();
    this.voetEl.replaceChildren();
    this.el.hidden = false;
    this.open = true;
  }

  sluit() {
    this.el.hidden = true;
    this.open = false;
  }
}
