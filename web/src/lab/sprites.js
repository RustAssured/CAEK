/* CAEK — sprite-lab.
 *
 * Leest het manifest dat tools/sprites.py schrijft en speelt elke animatie af.
 * Bedoeld om snel te kijken: loopt de looppas rond, trilt er niets, klopt de
 * maatverhouding tussen de drie karakters.
 *
 * De sprites zijn horizontale strips. In plaats van een canvas zetten we de
 * strip als achtergrond van een div en schuiven we hem per frame op -- dat is
 * scherper, goedkoper, en het browsergeheugen doet de rest. */

const $ = (s) => document.querySelector(s);
const MAP = './assets/sprites/';

/* Wereldhoogtes uit config.js. Hier hardgecodeerd zodat het lab ook werkt als
 * de game niet laadt; wijken ze af, dan is dat meteen het signaal. */
const WERELDHOOGTE = { caek: 2.0, supercaek: 2.44, cupcaek: 1.78 };

/* Hoe snel elke animatie hoort te draaien. Het lab kan er globaal overheen. */
const TEMPO = { lopen: 12, idle: 6, springen: 10, juichen: 11 };

const staat = {
  fps: 12,
  schaal: 200,
  draait: true,
  frame: 0,
  spiegel: false,
  grondlijn: true,
  achtergrond: 'nacht',
};

const spelers = [];

/* ------------------------------------------------------------------ *
 * Eén speler
 * ------------------------------------------------------------------ */

/**
 * @param {object} info uit het manifest: { bestand, frames, breedte, hoogte }
 * @param {object} opties
 */
function maakSpeler(info, { label = '', hoogtePx = null, animatie = '' } = {}) {
  const wikkel = document.createElement('div');
  wikkel.className = 'speler';

  const vloer = document.createElement('div');
  vloer.className = 'vloer';

  const doos = document.createElement('div');
  doos.className = 'doos';
  doos.style.backgroundImage = `url("${MAP}${info.bestand}")`;
  // de strip is `frames` keer zo breed als één frame
  doos.style.backgroundSize = `${info.frames * 100}% 100%`;
  vloer.appendChild(doos);
  wikkel.appendChild(vloer);

  if (label) {
    const naam = document.createElement('div');
    naam.className = 'naam';
    naam.innerHTML = label;
    wikkel.appendChild(naam);
  }

  const speler = {
    wikkel, doos, vloer, info, animatie,
    hoogtePx,
    zetMaat() {
      const h = this.hoogtePx ?? staat.schaal;
      const b = h * (info.breedte / info.hoogte);
      doos.style.width = `${Math.round(b)}px`;
      doos.style.height = `${Math.round(h)}px`;
    },
    teken(tijd) {
      const fps = staat.draait ? (TEMPO[animatie] ?? 10) * (staat.fps / 12) : 0;
      const i = staat.draait
        ? Math.floor(tijd * fps) % info.frames
        : ((staat.frame % info.frames) + info.frames) % info.frames;
      // background-position in procenten loopt van 0 tot 100 over (frames - 1)
      const p = info.frames > 1 ? (i / (info.frames - 1)) * 100 : 0;
      doos.style.backgroundPosition = `${p}% 0`;
      this.huidigFrame = i;
    },
  };
  speler.zetMaat();
  spelers.push(speler);
  return speler;
}

/* ------------------------------------------------------------------ *
 * Opbouw
 * ------------------------------------------------------------------ */

async function begin() {
  let manifest;
  try {
    const antwoord = await fetch(`${MAP}manifest.json`, { cache: 'no-store' });
    if (!antwoord.ok) throw new Error(`manifest.json gaf ${antwoord.status}`);
    manifest = await antwoord.json();
  } catch (fout) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="fout">
        <b>Geen manifest gevonden.</b><br>
        Draai eerst <code>python3 tools/sprites.py</code> — die schrijft de
        strips en <code>web/assets/sprites/manifest.json</code>.<br>
        <small>${fout.message}</small>
      </div>`);
    $('#samenvatting').textContent = 'niets geladen';
    return;
  }

  // vaste volgorde: hoofdrol, zusje, mascotte -- niet alfabetisch
  const volgorde = ['caek', 'cupcaek', 'supercaek'];
  const karakters = Object.keys(manifest)
    .sort((a, b) => (volgorde.indexOf(a) + 99) % 99 - (volgorde.indexOf(b) + 99) % 99);
  const totaalAnimaties = karakters.reduce((n, k) => n + Object.keys(manifest[k]).length, 0);
  const totaalFrames = karakters.reduce(
    (n, k) => n + Object.values(manifest[k]).reduce((m, a) => m + a.frames, 0), 0,
  );
  $('#samenvatting').textContent =
    `${karakters.length} karakters · ${totaalAnimaties} animaties · ${totaalFrames} frames getekend`;

  /* --- podium: de drie naast elkaar op ware verhouding --- */
  const podium = $('#podium');
  const grootste = Math.max(...karakters.map((k) => WERELDHOOGTE[k] ?? 2));
  for (const k of karakters) {
    const info = manifest[k].lopen || Object.values(manifest[k])[0];
    if (!info) continue;
    const hoogte = (WERELDHOOGTE[k] ?? 2) / grootste;
    const speler = maakSpeler(info, {
      label: `<b>${k}</b> · ${(WERELDHOOGTE[k] ?? 2).toFixed(2)} m`,
      animatie: 'lopen',
    });
    speler.verhouding = hoogte;
    podium.appendChild(speler.wikkel);
  }

  /* --- alle animaties per karakter --- */
  const rasters = $('#rasters');
  for (const k of karakters) {
    const rooster = document.createElement('div');
    rooster.className = 'rooster';
    const kop = document.createElement('h3');
    kop.textContent = k;
    rooster.appendChild(kop);

    for (const [animatie, info] of Object.entries(manifest[k])) {
      const speler = maakSpeler(info, {
        label: `${animatie} · <b>${info.frames}</b> frames`,
        animatie,
      });
      rooster.appendChild(speler.wikkel);
    }
    rasters.appendChild(rooster);
  }

  koppelBalk();
  werkStijlBij();
  lus(0);
}

/* ------------------------------------------------------------------ *
 * Bediening
 * ------------------------------------------------------------------ */

function koppelBalk() {
  const fps = $('#fps');
  const schaal = $('#schaal');

  fps.addEventListener('input', () => {
    staat.fps = +fps.value;
    $('#fps-uit').value = fps.value;
  });
  schaal.addEventListener('input', () => {
    staat.schaal = +schaal.value;
    $('#schaal-uit').value = schaal.value;
    for (const s of spelers) {
      s.hoogtePx = s.verhouding ? staat.schaal * 1.35 * s.verhouding : null;
      s.zetMaat();
    }
  });
  // de podiumspelers krijgen hun hoogte uit de wereldverhouding
  schaal.dispatchEvent(new Event('input'));

  $('#pauze').addEventListener('click', (e) => {
    staat.draait = !staat.draait;
    e.target.textContent = staat.draait ? 'pauze' : 'speel';
  });
  $('#terug').addEventListener('click', () => { staat.draait = false; staat.frame--; $('#pauze').textContent = 'speel'; });
  $('#vooruit').addEventListener('click', () => { staat.draait = false; staat.frame++; $('#pauze').textContent = 'speel'; });

  $('#spiegel').addEventListener('change', (e) => {
    staat.spiegel = e.target.checked;
    werkStijlBij();
  });
  $('#grondlijn').addEventListener('change', (e) => {
    staat.grondlijn = e.target.checked;
    werkStijlBij();
  });
  $('#achtergrond').addEventListener('change', (e) => {
    staat.achtergrond = e.target.value;
    werkStijlBij();
  });

  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); $('#pauze').click(); }
    if (e.code === 'ArrowLeft') $('#terug').click();
    if (e.code === 'ArrowRight') $('#vooruit').click();
  });
}

function werkStijlBij() {
  for (const s of spelers) {
    s.doos.classList.toggle('gespiegeld', staat.spiegel);
    s.vloer.classList.toggle('geen-lijn', !staat.grondlijn);
    s.vloer.className = `vloer achter-${staat.achtergrond}${staat.grondlijn ? '' : ' geen-lijn'}`;
  }
  document.querySelector('.podium').className = `podium achter-${staat.achtergrond}`;
}

function lus(nu) {
  requestAnimationFrame(lus);
  const tijd = nu / 1000;
  for (const s of spelers) s.teken(tijd);
}

begin();
