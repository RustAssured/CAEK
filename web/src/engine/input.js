/* CAEK — invoer. Zo simpel mogelijk: dit moet ook werken voor collega's die
 * nooit games spelen. Pijltjes of WASD, spatie, E, Shift. Op touch verschijnt
 * een duimbalk. */

const KAART = {
  ArrowLeft: 'links', KeyA: 'links', KeyQ: 'links',
  ArrowRight: 'rechts', KeyD: 'rechts',
  ArrowUp: 'springen', KeyW: 'springen', Space: 'springen', KeyZ: 'springen',
  KeyE: 'actie', Enter: 'actie', KeyF: 'actie',
  ShiftLeft: 'super', ShiftRight: 'super',
  Escape: 'escape',
};

export class Invoer {
  constructor() {
    this.aan = { links: false, rechts: false, springen: false, actie: false, super: false };
    this.gedruktNu = new Set();
    this.geblokkeerd = false;
    this.raakteAan = false;

    addEventListener('keydown', (e) => {
      const knop = KAART[e.code];
      if (!knop) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.aan[knop]) this.gedruktNu.add(knop);
      this.aan[knop] = true;
    });

    addEventListener('keyup', (e) => {
      const knop = KAART[e.code];
      if (!knop) return;
      this.aan[knop] = false;
    });

    addEventListener('blur', () => {
      for (const k of Object.keys(this.aan)) this.aan[k] = false;
    });

    this.#touch();
  }

  /** true op precies één frame, de frame waarin de toets omlaag ging */
  gedrukt(knop) {
    return this.gedruktNu.has(knop) && !this.geblokkeerd;
  }

  ingedrukt(knop) {
    return !this.geblokkeerd && this.aan[knop];
  }

  /** Roep dit aan aan het eind van elk frame. */
  spoel() {
    this.gedruktNu.clear();
  }

  #touch() {
    if (!matchMedia('(hover: none)').matches && !('ontouchstart' in window)) return;
    const balk = document.createElement('div');
    balk.id = 'duimbalk';
    balk.innerHTML = `
      <button data-knop="links" aria-label="links">◀</button>
      <button data-knop="rechts" aria-label="rechts">▶</button>
      <button data-knop="actie" aria-label="actie">E</button>
      <button data-knop="springen" aria-label="springen">▲</button>`;
    Object.assign(balk.style, {
      position: 'fixed', left: 0, right: 0, bottom: '0', display: 'flex',
      justifyContent: 'space-between', padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
      gap: '8px', zIndex: 15, pointerEvents: 'none',
    });
    for (const knop of balk.querySelectorAll('button')) {
      Object.assign(knop.style, {
        pointerEvents: 'auto', width: '17vw', maxWidth: '86px', aspectRatio: '1',
        borderRadius: '50%', border: '3px solid #0b1640', background: 'rgba(253,243,216,.82)',
        color: '#0b1640', font: '700 22px/1 "Arial Black", sans-serif', touchAction: 'none',
      });
      const naam = knop.dataset.knop;
      const neer = (e) => { e.preventDefault(); this.raakteAan = true; if (!this.aan[naam]) this.gedruktNu.add(naam); this.aan[naam] = true; };
      const op = (e) => { e.preventDefault(); this.aan[naam] = false; };
      knop.addEventListener('pointerdown', neer);
      knop.addEventListener('pointerup', op);
      knop.addEventListener('pointercancel', op);
      knop.addEventListener('pointerleave', op);
    }
    this.duimbalk = balk;
    document.body.appendChild(balk);
    balk.hidden = true;
  }

  toonDuimbalk(zichtbaar) {
    if (this.duimbalk) this.duimbalk.hidden = !zichtbaar;
  }
}
