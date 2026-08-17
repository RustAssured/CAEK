/* CAEK — de 3D-props.
 *
 * De wereld is 2.5D: karakters en de meeste decorstukken zijn geschilderde
 * platen. Dat leest mooi, maar een plaat blijft een sticker -- pan je de
 * camera, dan draait er niets mee. Voor een handjevol hero-objecten is dat
 * zonde. Een oven waar je doorheen de vlammen ziet en waarvan de openstaande
 * deuren met de camera meedraaien, verkoopt de diepte van de hele scène.
 *
 * Dus: een klein register van echte modellen. Wie er een heeft, gebruikt hem;
 * wie niet, valt terug op de geschilderde plaat en daaronder op de opbouw uit
 * blokjes. Drie niveaus, en het spel werkt op alle drie.
 *
 * De modellen worden één keer geladen en daarna gekloond. Materialen worden
 * gedeeld -- het zijn er vijf van hetzelfde, geen vijf verschillende ovens.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { zetModellen } from './props.js';
import { maskeer } from './materialen.js';

const MAP = './assets/';

/* Per model: het bestand, hoe hoog het in de wereld hoort te zijn bij schaal 1,
 * en hoeveel olieverf eroverheen mag. Een geschilderd model heeft weinig
 * filter nodig -- de textuur ís al geschilderd -- maar helemaal nul laat het
 * los staan van de rest. */
const MODELLEN = {
  oven: { bestand: 'oven3d.glb', hoogte: 8.8, masker: 0.14 },
  // De deurpoort is bijna net zo breed als hoog, en er staan er drie op vier
  // eenheden van elkaar. Dus is de hoogte hier ondergeschikt aan de breedte;
  // zie sprints.js, waar de drie deuren ook uit elkaar zijn getrokken.
  deur: { bestand: 'deur3d.glb', hoogte: 4.4, masker: 0.12 },
};

const lader = new GLTFLoader();

/**
 * Laadt de modellen en zet ze klaar in het register van props.js.
 *
 * Moet net als de texturen vóór bouwLevel() klaar zijn: props.oven() kijkt
 * bij het maken of er een model is en kiest daar zijn opbouw op. Ontbreekt er
 * een bestand, dan is dat geen fout maar gewoon de plaat.
 */
export async function laadModellen() {
  const gevonden = {};

  await Promise.all(Object.entries(MODELLEN).map(async ([naam, info]) => {
    try {
      const gltf = await lader.loadAsync(`${MAP}${info.bestand}`);
      const wortel = gltf.scene;

      // op maat brengen en op de grond zetten, zodat de aanroeper alleen nog
      // een positie hoeft te geven en niet hoeft te weten hoe groot het model
      // toevallig geëxporteerd is
      const doos = new THREE.Box3().setFromObject(wortel);
      const maat = doos.getSize(new THREE.Vector3());
      const factor = info.hoogte / Math.max(maat.y, 0.001);
      wortel.scale.setScalar(factor);
      wortel.position.set(
        -(doos.min.x + maat.x / 2) * factor,
        -doos.min.y * factor,
        -(doos.min.z + maat.z / 2) * factor,
      );

      wortel.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false;
        o.receiveShadow = false;

        // Modelleerpakketten exporteren graag met metalness op de textuur.
        // In een scène zonder environment map betekent metaal "spiegel niets",
        // en dan wordt een prachtig beschilderd model een donkere vlek. De
        // verf zit al ín de textuur; wat we hier willen is dat het licht van
        // de wereld erop valt, net als op al het andere.
        const m = o.material;
        if (m && 'metalness' in m) {
          m.metalness = 0;
          m.roughness = 0.9;
          m.needsUpdate = true;
        }

        // De verf mag er licht overheen, anders staat het model als enige
        // scherpe ding in een geschilderde wereld.
        maskeer(m, info.masker);
      });

      gevonden[naam] = {
        wortel,
        hoogte: info.hoogte,
        breedte: maat.x * factor,
        diepte: maat.z * factor,
      };
    } catch (fout) {
      console.warn(`CAEK: model "${naam}" niet geladen:`, fout.message);
    }
  }));

  zetModellen(gevonden);
  return gevonden;
}
