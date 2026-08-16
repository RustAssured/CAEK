/* CAEK — palet en materialen.
 *
 * De 3D-scene blijft expres simpel geshaded: de olieverf ontstaat pas in de
 * post-processing. Wat hier telt is dat vlakken een duidelijke, verzadigde
 * kleur hebben en dat er genoeg licht/donker-verschil is voor het flowveld. */

import * as THREE from 'three';

export const PALET = {
  blauwDiep: 0x0b1640,
  blauw: 0x17307d,
  blauwLicht: 0x3f63c9,
  goud: 0xf5b229,
  goudLicht: 0xffd873,
  oranje: 0xe8721f,
  room: 0xfdf3d8,
  roze: 0xf2799f,
  rozeDiep: 0xc85a80,
  groen: 0x63a844,
  rood: 0xcf3a2c,
  paars: 0x7a4fb5,
  toast: 0xd99a3c,
  korst: 0x8a5a12,
  steen: 0x2a3f7e,
  papier: 0xe8e0c8,
};

const cache = new Map();

/** Mat, vlak materiaal — het beeld moet van vorm en kleur komen, niet van glans. */
export function verf(kleur, { emissief = 0.16, plat = false, doorzichtig = 0, dubbel = false } = {}) {
  const sleutel = `${kleur}|${emissief}|${plat}|${doorzichtig}|${dubbel}`;
  if (cache.has(sleutel)) return cache.get(sleutel);
  const m = new THREE.MeshLambertMaterial({
    color: kleur,
    emissive: new THREE.Color(kleur).multiplyScalar(emissief),
    flatShading: plat,
    transparent: doorzichtig > 0,
    opacity: doorzichtig > 0 ? doorzichtig : 1,
    side: dubbel ? THREE.DoubleSide : THREE.FrontSide,
  });
  cache.set(sleutel, m);
  return m;
}

/**
 * Zet hoeveel verf er over dit materiaal heen mag: 0 = helemaal niet, 1 = het
 * volle werk. De renderketen leest dit uit het alfakanaal van de scene.
 *
 * De diepte doet het meeste werk -- achterin dikker dan vooraan -- maar
 * sommige dingen horen scherp te blijven ongeacht waar ze staan. Caeks
 * gezicht bijvoorbeeld, en alles waar tekst op staat. Een grap die je niet
 * kunt lezen is geen grap.
 *
 * Werkt alleen op ondoorzichtige materialen: bij transparante materialen gaat
 * het alfakanaal op in de blending en komt er niets van terecht.
 */
export function maskeer(doel, sterkte = 0.12) {
  const materialen = [];
  if (doel?.isMaterial) materialen.push(doel);
  else doel?.traverse?.((o) => { if (o.isMesh && o.material) materialen.push(o.material); });

  for (const origineel of materialen) {
    if (origineel.userData?.maskerSterkte === sterkte) continue;
    if (origineel.transparent) continue;   // zie hierboven: heeft geen zin
    const m = origineel;
    m.userData = { ...m.userData, maskerSterkte: sterkte };
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>\n  gl_FragColor.a = ${sterkte.toFixed(3)};`,
      );
    };
    m.customProgramCacheKey = () => `masker${sterkte}`;
    m.needsUpdate = true;
  }
  return doel;
}

/**
 * Als maskeer(), maar het materiaal wordt eerst gekloond. Nodig omdat verf()
 * materialen deelt via een cache: één gemaskeerd bordje zou anders elk object
 * met dezelfde kleur meenemen.
 */
export function maskeerEigen(object, sterkte = 0.12) {
  object?.traverse?.((o) => {
    if (!o.isMesh || !o.material || o.material.transparent) return;
    o.material = o.material.clone();
    maskeer(o.material, sterkte);
  });
  return object;
}

/** Lichtgevend materiaal voor ovengloed, gouden lijnen en energie. */
export function gloed(kleur, sterkte = 1) {
  const sleutel = `gloed|${kleur}|${sterkte}`;
  if (cache.has(sleutel)) return cache.get(sleutel);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(kleur).multiplyScalar(sterkte) });
  cache.set(sleutel, m);
  return m;
}

/** Canvas met dikke letters -> textuur. Post-processing smeert alles uit, dus
 *  liever te groot en te veel contrast dan te netjes. */
export function tekstTextuur(regels, {
  breedte = 512, hoogte = 256, achtergrond = '#0b1640', kleur = '#fdf3d8',
  rand = '#f5b229', grootte = 64, randDikte = 10,
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = breedte;
  canvas.height = hoogte;
  const c = canvas.getContext('2d');

  if (achtergrond !== 'geen') {
    c.fillStyle = achtergrond;
    c.fillRect(0, 0, breedte, hoogte);
  }
  if (rand !== 'geen') {
    c.strokeStyle = rand;
    c.lineWidth = randDikte;
    c.strokeRect(randDikte / 2, randDikte / 2, breedte - randDikte, hoogte - randDikte);
  }

  const lijst = Array.isArray(regels) ? regels : [regels];
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const regelhoogte = grootte * 1.18;
  const start = hoogte / 2 - (lijst.length - 1) * regelhoogte / 2;
  lijst.forEach((regel, i) => {
    c.font = `900 ${grootte}px "Arial Black", Impact, sans-serif`;
    c.fillStyle = kleur;
    c.strokeStyle = 'rgba(11,22,64,.85)';
    c.lineWidth = grootte * 0.14;
    c.lineJoin = 'round';
    c.strokeText(regel, breedte / 2, start + i * regelhoogte);
    c.fillText(regel, breedte / 2, start + i * regelhoogte);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Getekend gezicht in plaats van een emoji. Een emoji is te fijn: de
 *  Kuwahara maakt er een gekleurde vlek van. Dikke ogen en een dikke mond
 *  overleven de verf wél. */
export function gezichtTextuur(expressie = 'blij', {
  maat = 256, inkt = '#0b1640', blos = 'rgba(207,58,44,.45)',
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = maat;
  const c = canvas.getContext('2d');
  const s = maat / 256;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = inkt;
  c.fillStyle = inkt;

  const ogen = [[86, 108], [170, 108]];
  const knipoog = expressie === 'knipoog';
  const dicht = expressie === 'slaapt';

  ogen.forEach(([x, y], i) => {
    if (dicht || (knipoog && i === 1)) {
      c.lineWidth = 9 * s;
      c.beginPath();
      c.arc(x * s, y * s, 16 * s, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
      return;
    }
    c.beginPath();
    c.ellipse(x * s, y * s, 17 * s, expressie === 'verbaasd' ? 24 * s : 20 * s, 0, 0, 7);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc((x + 6) * s, (y - 7) * s, 6 * s, 0, 7);
    c.fill();
    c.fillStyle = inkt;
  });

  c.lineWidth = 11 * s;
  c.beginPath();
  if (expressie === 'verbaasd') {
    c.ellipse(128 * s, 172 * s, 17 * s, 22 * s, 0, 0, 7);
    c.stroke();
  } else if (expressie === 'streng') {
    c.moveTo(96 * s, 176 * s);
    c.lineTo(160 * s, 176 * s);
    c.stroke();
  } else if (expressie === 'boos') {
    c.moveTo(96 * s, 184 * s);
    c.quadraticCurveTo(128 * s, 158 * s, 160 * s, 184 * s);
    c.stroke();
  } else {
    c.moveTo(92 * s, 162 * s);
    c.quadraticCurveTo(128 * s, 200 * s, 164 * s, 162 * s);
    c.stroke();
  }

  c.fillStyle = blos;
  for (const x of [62, 194]) {
    c.beginPath();
    c.ellipse(x * s, 150 * s, 20 * s, 12 * s, 0, 0, 7);
    c.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Emoji als losse textuur met transparante achtergrond. */
export function emojiTextuur(emoji, maat = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = maat;
  const c = canvas.getContext('2d');
  c.font = `${maat * 0.72}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(emoji, maat / 2, maat * 0.54);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
