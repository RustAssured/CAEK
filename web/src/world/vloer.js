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
import { zetVloerTextuur } from './props.js';

const MAP = './assets/textuur/';

export async function laadVloer() {
  let manifest;
  try {
    const antwoord = await fetch(`${MAP}manifest.json`, { cache: 'no-cache' });
    manifest = antwoord.ok ? await antwoord.json() : {};
  } catch {
    return false;
  }
  if (!manifest.vloer) return false;

  try {
    const textuur = await new THREE.TextureLoader().loadAsync(`${MAP}${manifest.vloer.bestand}`);
    textuur.colorSpace = THREE.SRGBColorSpace;
    textuur.wrapS = THREE.RepeatWrapping;
    textuur.wrapT = THREE.ClampToEdgeWrapping;
    textuur.minFilter = THREE.LinearMipmapLinearFilter;
    textuur.magFilter = THREE.LinearFilter;
    textuur.anisotropy = 4;
    zetVloerTextuur(textuur);
    return true;
  } catch (fout) {
    console.warn('CAEK: vloertextuur niet geladen:', fout.message);
    return false;
  }
}
