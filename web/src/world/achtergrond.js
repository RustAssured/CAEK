/* CAEK — de geschilderde achtergrond in drie parallaxlagen.
 *
 * Drie brede olieverfplaten die met verschillende snelheden meeschuiven: ver
 * (lucht, heuvels, water), midden (de bakkerijstraat) en dichtbij (cipressen
 * en lantaarns). Elke laag is één tegel die horizontaal herhaalt.
 *
 * Twee dingen die minder vanzelf spreken dan ze klinken.
 *
 * EEN: deze platen krijgen géén olieverffilter overheen. Ze zíjn al olieverf,
 * en er nog een laag Kuwahara op leggen maakt er pap van. Dat regelt het
 * alfamasker uit render/composer.js: de laag schrijft alfa 0 en dan slaat de
 * hele filterketen dat gebied over. Meteen ook goedkoper, want dat is het
 * grootste stuk beeld.
 *
 * TWEE: de lagen schuiven niet zelf op, hun textuur schuift. Het vlak blijft
 * netjes voor de camera hangen en alleen de uv-offset loopt mee. Zo is één
 * quad per laag genoeg, hoe lang de wereld ook wordt.
 *
 * Zonder platen valt alles terug op de oude procedurele achtergrond, zodat het
 * spel het ook doet als er niets geleverd is. */

import * as THREE from 'three';
import * as props from './props.js';
import { ACHTERGROND, WERELD_EINDE } from '../config.js';

const lader = new THREE.TextureLoader();

async function laadManifest() {
  try {
    const antwoord = await fetch(`${ACHTERGROND.map}manifest.json`, { cache: 'no-cache' });
    return antwoord.ok ? await antwoord.json() : {};
  } catch {
    return {};
  }
}

/**
 * Hangt de lagen in de scene en geeft een update-functie terug.
 *
 * @param {THREE.Scene} scene
 * @param {import('../world/level.js').Level} level
 * @returns {Promise<boolean>} of er echte platen gevonden zijn
 */
export async function zetAchtergrond(scene, level) {
  const manifest = await laadManifest();
  const lagen = [];

  for (const [index, opzet] of ACHTERGROND.lagen.entries()) {
    const info = manifest[opzet.id];
    if (!info) continue;

    let textuur;
    try {
      textuur = await lader.loadAsync(`${ACHTERGROND.map}${info.bestand}`);
    } catch (fout) {
      console.warn(`CAEK: achtergrondlaag "${opzet.id}" niet geladen:`, fout.message);
      continue;
    }
    textuur.colorSpace = THREE.SRGBColorSpace;
    textuur.wrapS = THREE.RepeatWrapping;
    textuur.wrapT = THREE.ClampToEdgeWrapping;
    textuur.minFilter = THREE.LinearMipmapLinearFilter;
    textuur.magFilter = THREE.LinearFilter;
    textuur.anisotropy = 4;

    const materiaal = new THREE.MeshBasicMaterial({
      map: textuur,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    /* Het verfmasker zit hier in de blending en niet in de shader.
     *
     * Dat is geen slordigheid maar noodzaak: het alfakanaal doet twee dingen
     * tegelijk. Het is de dekking waarmee de plaat over de laag erachter
     * gemengd wordt, én het is het masker waaraan de filterketen ziet hoeveel
     * verf er nog overheen mag. Zet je het in de shader op nul -- wat het
     * masker wil -- dan wordt de kleurbijdrage ook nul en verdwijnt de hele
     * plaat.
     *
     * Dus: kleur mengt gewoon op de dekking van de tekening, en de alfa die
     * wegge- schreven wordt staat los daarvan vast op nul. Dan weet de
     * filterketen dat hier al verf ligt, ook waar de plaat doorzichtig is en
     * er een laag achter doorschijnt. */
    materiaal.blending = THREE.CustomBlending;
    materiaal.blendSrc = THREE.SrcAlphaFactor;
    materiaal.blendDst = THREE.OneMinusSrcAlphaFactor;
    materiaal.blendEquation = THREE.AddEquation;
    materiaal.blendSrcAlpha = THREE.ZeroFactor;
    materiaal.blendDstAlpha = THREE.ZeroFactor;
    materiaal.blendEquationAlpha = THREE.AddEquation;

    const vlak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materiaal);
    vlak.frustumCulled = false;
    vlak.renderOrder = -10 + index;      // ver eerst, dichtbij als laatste
    scene.add(vlak);

    lagen.push({ ...opzet, vlak, textuur, verhouding: info.hoogte / info.breedte });
  }

  if (!lagen.length) return false;

  // Elk frame: het vlak voor de camera houden en de textuur laten meeschuiven.
  level.tik((dt, speler, spel) => {
    const camera = spel.camera;
    const halveHoek = (camera.fov * Math.PI) / 360;

    for (const laag of lagen) {
      const afstand = Math.abs(camera.position.z - laag.z);
      const beeldHoogte = 2 * afstand * Math.tan(halveHoek);
      // ruim breder dan het beeld, zodat er bij een snelle pan nooit een rand
      // in beeld schuift
      const breedte = beeldHoogte * camera.aspect * 1.3;

      // Eén tegel is `hoogteDeel` van de schermhoogte; zijn breedte volgt uit
      // de verhouding van de plaat.
      const tegelHoogte = beeldHoogte * laag.hoogteDeel;
      const tegel = tegelHoogte / laag.verhouding;

      laag.vlak.scale.set(breedte, tegelHoogte, 1);
      laag.vlak.position.set(camera.position.x, laag.bodem + tegelHoogte / 2, laag.z);

      laag.textuur.repeat.x = breedte / tegel;
      // De camera staat in het midden van het vlak, dus de linkerrand ligt een
      // halve breedte terug; die verschuiving hoort er ook in, anders springt
      // de plaat zodra het beeld van formaat verandert.
      laag.textuur.offset.x = (camera.position.x * laag.factor - breedte / 2) / tegel;
    }
  });

  return true;
}

/** De oude procedurele achtergrond. Terugval als er geen platen zijn. */
export function zetProcedureleAchtergrond(level) {
  const achter = props.achtergrondBakkerij(WERELD_EINDE + 80, 7);
  level.plaats(achter, WERELD_EINDE / 2, 0, 0);

  for (let x = 6; x < WERELD_EINDE; x += 27) {
    const boom = props.cipres(7 + (x % 5));
    level.plaats(boom, x + (x % 7), -0.4, -13 - (x % 4));
  }
  for (let x = 14; x < WERELD_EINDE; x += 19) {
    level.plaats(props.lantaarn(4.6), x, 0, -3.4);
  }
}
