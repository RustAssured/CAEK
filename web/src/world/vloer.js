/* CAEK — de geschilderde vloer.
 *
 * Eén tegel die overal terugkomt: grond, platforms, alles waar je op staat.
 * De plaat is mét perspectief geschilderd -- loopvlak dat naar achteren wijkt,
 * daaronder de zijkant van de stoep -- dus één staand vlak volstaat waar eerst
 * een romp, een deklaag en een kassei per anderhalve meter stond.
 *
 * Hij moet vóór het bouwen geladen zijn, want props.platform() kijkt bij het
 * maken of de textuur er is. Vandaar dat main.js hierop wacht. */

import * as THREE from 'three';
import { zetTexturen } from './props.js';
import { zetBlokKaart } from './materialen.js';

const MAP = './assets/textuur/';
const lader = new THREE.TextureLoader();

/* Hoe elke plaat herhaalt. De vloer en de kratten tegelen alleen zijwaarts,
 * de blokplaat in beide richtingen, en losse objecten helemaal niet. */
const HERHALING = {
  vloer: [THREE.RepeatWrapping, THREE.ClampToEdgeWrapping],
  springblok: [THREE.RepeatWrapping, THREE.ClampToEdgeWrapping],
  blok: [THREE.RepeatWrapping, THREE.RepeatWrapping],
  hout: [THREE.RepeatWrapping, THREE.RepeatWrapping],
  publiek: [THREE.RepeatWrapping, THREE.ClampToEdgeWrapping],
};

async function haal(bestand, naam) {
  const textuur = await lader.loadAsync(`${MAP}${bestand}`);
  const [s, t] = HERHALING[naam] || [THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping];
  textuur.colorSpace = THREE.SRGBColorSpace;
  textuur.wrapS = s;
  textuur.wrapT = t;
  textuur.minFilter = THREE.LinearMipmapLinearFilter;
  textuur.magFilter = THREE.LinearFilter;
  textuur.anisotropy = 4;
  return textuur;
}

/**
 * Laadt alle geschilderde platen die de wereld gebruikt.
 *
 * Moet klaar zijn vóór bouwLevel(): props.platform() en props.teamstand()
 * kijken bij het maken of hun plaat bestaat en kiezen daar hun opbouw op.
 */
export async function laadTexturen() {
  let manifest;
  try {
    const antwoord = await fetch(`${MAP}manifest.json`, { cache: 'no-cache' });
    manifest = antwoord.ok ? await antwoord.json() : {};
  } catch {
    return {};
  }

  const gevonden = {};
  await Promise.all(Object.entries(manifest).map(async ([naam, info]) => {
    try {
      gevonden[naam] = await haal(info.bestand, naam);
    } catch (fout) {
      console.warn(`CAEK: textuur "${naam}" niet geladen:`, fout.message);
    }
  }));

  zetTexturen(gevonden);
  if (gevonden.blok) zetBlokKaart(gevonden.blok);
  return gevonden;
}
