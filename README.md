# CAEK — PI in de Mix

Een korte 2.5D comedy-sidescroller waarin **Caek** en **Cupcaek** één PI proberen te
overleven. Afscheidscadeau voor cluster CAEK (Cluster Afnemers en Ketenpartners, UWV).

> Druk bezig zijn levert geen punten op. Waarde leveren wel.

Dit is de **vertical slice**: één level, van Start PI tot de Value Oven, met de
onderdelen uit het design doc die de boodschap dragen. Geen uitgebreide game —
een digitale goodie die je in een Teams-link kwijt kunt.

---

## Spelen

Alles in `web/` is statisch: geen build, geen npm install, geen bundler.

```bash
npx http-server web -p 8080 -c-1
# of
python3 -m http.server 8080 --directory web
```

Daarna http://localhost:8080. `file://` werkt níet — ES modules en de GLB
hebben een echte server nodig.

**Besturing**

| | |
|---|---|
| `←` `→` of `A` `D` | lopen |
| `spatie` / `↑` / `W` | springen |
| `E` / `Enter` | praten, pakken, knoppen indrukken |
| `Shift` | SuperCaek (als de Value Energy vol is) |

Val je van een platform? PLOP. Je verschijnt bij het laatste checkpoint.
Op touch verschijnt onderin een duimbalk.

## Deployen

Vercel serveert `web/` als statische map; zie `vercel.json`. Er is geen
build-stap, dus "Other / no framework" met output directory `web` volstaat ook
in de UI.

---

## Wat er in de slice zit

| Sectie | Mechaniek | Boodschap |
|---|---|---|
| PI Planning Oven | het PI-recept oppakken, Doelenwiel, gouden lijn naar het strategische doel | een PI begint met richting, niet met een compleet plan |
| Sprint 1 | ingrediënten verzamelen, Scope Creep groeit van wat je onnodig oppakt, sorteren bij het bord | niet alles wat je kunt oppakken hoort erbij |
| Metriekenlab | drie meetinstrumenten, daarna één van drie routes kiezen | meten → begrijpen → aanpassen (niet: meten → dashboard → klaar) |
| Dependency Pretzel | BUSINESS + IV + KETENPARTNER aanzetten, dan wordt de knoop een brug | afhankelijkheden los je samen op |
| Cluster Review | kijken, delen, luisteren; daarna één sprinkle kiezen | je hoeft niet álle feedback te verwerken |
| De Demo | knop A (PowerPoint, 83 slides) of knop B (laat het zien) | laten zien slaat praten |
| Value Oven | alles erin, PING, eindscherm met het Doelenwiel | de PI eindigt bij de strategie waar hij begon |

Onderweg: BAU op een lopende band, technical debt in een broodrooster, een
impediment dat pas weggaat als je het zichtbaar maakt, een priority change en
een "kort overleg — 15 min" dat 1:15 duurt.

**Value** komt uitsluitend van acties die aan het PI-doel bijdragen. Rondrennen
en spullen verzamelen levert niets op — dat is het hele punt. De meter capt op
97%; op het eindscherm gooit Cupcaek er nog één sprinkle op en dan is het 98%.
100% bestaat niet.

---

## Hoe het in elkaar zit

```
assets/                    de losse Blender/Mixamo-exports (bron, niet gebruikt door de game)
tools/build_caek_glb.py    voegt die exports samen tot één web-klare GLB
web/
  index.html               HUD, schermen, importmap
  assets/caek.glb          gegenereerd — 1 MB in plaats van 38
  vendor/three/            three.js r185, vendored (geen CDN, werkt offline)
  src/
    main.js                Spel-klasse: lus, staat, waarde, SuperCaek, finale
    config.js              alle draaiknoppen: natuurkunde, camera, waarde, teksten
    render/
      shaders.js           GLSL van de hele pipeline
      composer.js          de zes passes + kwaliteitsprofielen
    engine/
      input.js             toetsen + duimbalk
      audio.js             geluid uit oscillatoren, geen bestanden
    world/
      materialen.js        palet, verf-materialen, canvas-tekst
      props.js             ovens, borden, pretzels, papierrommel, cipressen
      level.js             levelbouwer: vloeren, muren, interacties, zones
    game/
      caek.js              speler: GLB + AnimationMixer + natuurkunde
      cupcaek.js           sidekick (PLACEHOLDER-model, zie hieronder)
      scopecreep.js        het groeiende deegmonster
      secties.js           het hele level, sectie voor sectie
    ui/
      hud.js dialoog.js paneel.js wiel.js eindscherm.js ui.css
```

### De 3D-assets

`assets/` bevat vijf exports van hetzelfde model met verschillende animaties —
samen 38 MB, waarvan 7 MB texture die vijf keer wordt gedownload. Het script
voegt ze samen tot één GLB met alle clips en schaalt de texture terug:

```bash
python3 tools/build_caek_glb.py                      # -> web/assets/caek.glb, ~1 MB
python3 tools/build_caek_glb.py --texture 2048 --format png   # scherper, ~4 MB
```

Animatiekanalen worden op **botnaam** gehermapt, niet op index, dus nieuwe
exports met een andere nodevolgorde blijven werken.

**Cupcaek is nog een placeholder.** Het rigged model was tijdens het bouwen van
deze slice nog onderweg. `web/src/game/cupcaek.js` bouwt haar uit primitieven
volgens de character sheet. Zodra `CUPCAEK_*.glb` er is: zet die in `assets/`,
draai het buildscript, en vervang `maakPlaceholder()` door een GLTF-laad zoals
in `caek.js`. Het volggedrag en de blokkeerlogica blijven gewoon werken.

SuperCaek gebruikt voorlopig hetzelfde model met een cape en een comic-tint —
de echte transformatie zit in de renderer, niet in het model.

---

## De olieverf-pipeline

De stijl zit in de post-processing, niet in de assets. De 3D-scene is expres
simpel geshaded; alles wordt verf in zes passes (`render/composer.js`):

1. **Scene** — procedurele Sterrennacht-lucht (domain-warped fbm met wervels
   rond drie sterren) en daarna de scene, in één HalfFloat render target.
2. **Structuurtensor** — Sobel → `(E, F, G)`, op halve resolutie.
3. **+ 4. Separabele gaussian** over die tensor → een stabiel flowveld.
5. **Anisotrope Kuwahara** (Kyprianidis) — 8 sectoren, polynoomweging, een
   elliptische kernel die met het flowveld meedraait.
6. **Finale** — LIC-smeer langs het flowveld, impasto-reliëf (luminantie als
   hoogteveld, strijklicht linksboven, glans langs de borstelharen),
   borstelkorrel, blauw-oranje split-toning, vignet, sRGB.

De SuperCaek-modus is geen los effect maar dezelfde keten met één uniform
omhoog: `uSuper` crossfadet naar posterisatie, dikke inktlijnen, halftoonraster
en speedlines. Twintig seconden lang wisselt de héle game van genre.

### Stijl finetunen

Draai aan `STIJL` in `render/composer.js`:

```js
alfa       // excentriciteit van de penseelellips (hoger = ronder)
scherpte   // q: hoe hard de scherpste sector wint
korrel     // borstelharen in het reliëf
warmte     // blauw/oranje split-toning
vignet, belichting
```

en per kwaliteitsprofiel `renderSchaal`, `straal` (kernelgrootte),
`licStappen`, `impasto`. In de console:

```js
CAEK.schilder.zetKwaliteit('hoog')
CAEK.schilder.kuwahara.materiaal.uniforms.uStraal.value = 7
CAEK.speler.positie.x = 250     // ergens anders kijken
```

**Staan de streken dwars op de randen in plaats van erlangs?** Dan staat de
flow-vector 90° gedraaid: `vec2 t = vec2(l1 - E, -F)` in `flowInfo()`
(shaders.js) omwisselen voor de loodrechte. Klassiek tensor-valkuiltje.

### Prestaties

De Kuwahara is de dure pass (een elliptische kernel × 8 sectoren per pixel).
Er zijn vier profielen — `hoog`, `midden`, `laag`, `uit` — te kiezen op het
startscherm. Op **automatisch** meet de game de framerate en zakt een trap
terug zodra hij onder ~26 fps komt. De grootste knop is `renderSchaal`, daarna
`straal`.

WebGL2 is vereist (HalfFloat render targets en dynamische luslimieten in
GLSL ES 3.00).

---

## Wat er nog niet in zit

- Cupcaek en SuperCaek als eigen rigged modellen
- Levels uit Blender laden (nu declaratief in `secties.js`, wat voor deze
  omvang prettiger hackt)
- Muziek; er is alleen oscillator-geluid
- Opslaan van voortgang — de slice duurt 7–10 minuten, dus dat hoeft niet

## Credits

three.js r185 (MIT, `web/vendor/three/LICENSE`). Karakters, Doelenwiel en
huisstijl: CAEK branding suite.
