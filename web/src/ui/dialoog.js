/* CAEK — tekstballonnen. Eén regel tegelijk, doorklikken met spatie/E/klik.
 * Alles async, zodat een scene gewoon `await dialoog.zeg(...)` kan doen. */

const SPREKERS = {
  caek: { naam: 'CAEK', avatar: '🍞', klasse: 'caek' },
  cupcaek: { naam: 'CUPCAEK', avatar: '🧁', klasse: 'cupcaek' },
  supercaek: { naam: 'SUPERCAEK', avatar: '💥', klasse: 'supercaek' },
  verteller: { naam: '', avatar: '📋', klasse: 'verteller' },
  publiek: { naam: 'HET PUBLIEK', avatar: '👥', klasse: 'verteller' },
  scopecreep: { naam: 'SCOPE CREEP', avatar: '🥟', klasse: 'verteller' },
};

export class Dialoog {
  constructor(geluid) {
    this.el = document.querySelector('#dialoog');
    this.bubbel = this.el.querySelector('.bubbel');
    this.naamEl = this.el.querySelector('.spreker b');
    this.avatarEl = this.el.querySelector('.avatar');
    this.tekstEl = this.el.querySelector('p');
    this.geluid = geluid;
    this.bezig = false;
    this.wachtOpKlik = null;

    const verder = () => this.#verder();
    this.el.addEventListener('pointerdown', verder);
    addEventListener('keydown', (e) => {
      if (!this.bezig) return;
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        verder();
      }
    });
  }

  #verder() {
    if (this.snelheid) {
      // eerst de regel afmaken, dan pas doorgaan
      this.klaarMetTypen = true;
      return;
    }
    if (this.wachtOpKlik) {
      const f = this.wachtOpKlik;
      this.wachtOpKlik = null;
      f();
    }
  }

  /**
   * @param {string} wie sleutel uit SPREKERS
   * @param {string} tekst
   * @param {object} [opties] `{ wacht: seconden }` toont zonder klik-vereiste
   */
  async zeg(wie, tekst, opties = {}) {
    // Start er een nieuwe regel terwijl de vorige nog op een klik wacht, dan
    // moet die belofte alsnog los — anders blijft een await eeuwig hangen en
    // komt bezigMetScene nooit meer op nul.
    if (this.wachtOpKlik) { const f = this.wachtOpKlik; this.wachtOpKlik = null; f(); }

    const spreker = SPREKERS[wie] || SPREKERS.verteller;
    this.bezig = true;
    this.el.hidden = false;
    this.el.className = spreker.klasse;
    this.naamEl.textContent = spreker.naam;
    this.avatarEl.textContent = spreker.avatar;
    this.tekstEl.textContent = '';

    // typemachine
    this.snelheid = true;
    this.klaarMetTypen = false;
    const tekens = [...tekst];
    for (let i = 0; i < tekens.length; i++) {
      if (this.klaarMetTypen) {
        this.tekstEl.textContent = tekst;
        break;
      }
      this.tekstEl.textContent += tekens[i];
      if (i % 3 === 0 && tekens[i] !== ' ' && this.geluid) this.geluid.toon(340 + (i % 5) * 40, 0.02, 'square', 0.12);
      await pauze(opties.traag ? 34 : 16);
    }
    this.tekstEl.textContent = tekst;
    this.snelheid = false;

    if (opties.wacht) {
      await pauze(opties.wacht * 1000);
    } else {
      await new Promise((res) => { this.wachtOpKlik = res; });
    }
    this.bezig = false;
    this.el.hidden = true;
  }

  /** Meerdere regels achter elkaar: [['cupcaek', 'tekst'], ...] */
  async scene(regels) {
    for (const [wie, tekst, opties] of regels) {
      await this.zeg(wie, tekst, opties);
    }
  }

  sluit() {
    this.bezig = false;
    this.el.hidden = true;
  }
}

export const pauze = (ms) => new Promise((r) => setTimeout(r, ms));
