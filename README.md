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
  lab.html                 het verflab: live aan de stijl draaien
  assets/caek.glb          gegenereerd — 1 MB in plaats van 38
  vendor/three/            three.js r185, vendored (geen CDN, werkt offline)
  src/
    main.js                Spel-klasse: lus, staat, waarde, SuperCaek, finale
    config.js              alle draaiknoppen: natuurkunde, camera, waarde, teksten
    render/
      shaders.js           GLSL van de hele pipeline
      composer.js          de passes aan elkaar + kwaliteitsprofielen + STIJL
      streken.js           penseelstreken als instanced geometrie
    lab/
      lab.js regelaars.js lab.css     het verflab (web/lab.html)
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

En dan **pass 7: penseelstreken als geometrie** (`render/streken.js`). Dit is
het verschil tussen "gefilterde 3D" en iets dat eruitziet alsof er halen op een
doek staan. Per laag één instanced draw call met duizenden quads; elk quad
leest op zijn ankerpunt de kleur uit het Kuwahara-resultaat en de richting uit
het flowveld, draait zichzelf daarlangs en zet zich neer. Drie lagen: een grove
grondlaag over het hele doek, en twee fijnere die zich beperken tot plekken
waar contouren zitten — een schilder pakt ook pas een fijn penseel waar iets te
zien is.

Dat levert twee dingen op die een filter niet kan: streken lopen over
silhouetranden heen zoals verf dat doet, en waar halen elkaar overlappen ligt
de verf dikker. Die dikte gaat als tweede MRT-uitgang naar de finale-pass, dus
het impasto is echt reliëf in plaats van een truc met helderheid.

De ankers schuiven mee met de camera (`uVerschuiving` in `streken.js`). Zonder
dat plakken de streken aan het scherm en zwemt het hele doek zodra je loopt —
het "douchedeur"-effect dat elke screen-space schilderfilter verraadt. Omdat de
camera in een sidescroller alleen pant en nooit draait, is één screen-space
verschuiving genoeg.

De SuperCaek-modus is geen los effect maar dezelfde keten met één uniform
omhoog: `uSuper` crossfadet naar posterisatie, dikke inktlijnen, halftoonraster
en speedlines. Twintig seconden lang wisselt de héle game van genre.

### Het verflab

`web/lab.html` is een aparte pagina die exact dezelfde renderketen aanstuurt,
met een schuifregelaar op elke uniform. Bedoeld om te kijken en te draaien.

- **Vergelijk A/B** — verticale wisser tussen alleen-filter en met streken
- **Weergave** — het eindbeeld of één tussenstap: kale scene, Kuwahara,
  streken, het hoogteveld, of het flowveld als kleur (handig om te zien of de
  streekrichting klopt)
- **Uitsnede** — vaste camerastandpunten, van totaal tot Caek van dichtbij
- **Camera pant** — laat de camera heen en weer gaan; zo zie je meteen of de
  streken aan de wereld plakken of meezwemmen met het scherm
- **Kopieer als JS** — geeft je huidige instellingen terug als een `STIJL`-blok
  dat je zo over dat in `render/composer.js` heen plakt

Instellingen blijven in `localStorage` staan; *Standaard* zet ze terug.
`H` verbergt het paneel.

De proefopstelling bevat met opzet van elk materiaal iets — glad, gestreept,
gloeiend, donker, egale kleurvlakken, een karakter met een textuur en veel
lucht. Een stijl die op één type oppervlak mooi is, is nog geen stijl.

### Stijl finetunen

Draai aan `STIJL` in `render/composer.js` (of gebruik het lab en plak het
resultaat terug):

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

Twee dure passes: de Kuwahara (een elliptische kernel × 8 sectoren per pixel)
en de streken (tienduizenden quads met flinke overdraw). Er zijn vier profielen
— `hoog`, `midden`, `laag`, `uit` — te kiezen op het startscherm; `laag` zet de
streken uit en valt terug op de filter, die er nog steeds goed uitziet. Op
**automatisch** meet de game de framerate en zakt een trap terug zodra hij
onder ~26 fps komt. De grootste knoppen zijn `renderSchaal`, dan de
streekdichtheid per laag, dan `straal`.

WebGL2 is vereist (HalfFloat render targets en dynamische luslimieten in
GLSL ES 3.00).

---

## Wat er nog niet in zit

- Streken in wereldruimte in plaats van meeschuivend met de camera; nu
  klopt het zolang de camera alleen pant, maar de achtergrond schuift er met
  parallax iets onderdoor
- Streekgrootte laten meeschalen met de diepte, zodat dingen ver weg vanzelf
  grover geschilderd worden — daar is een dieptebuffer voor nodig
- Kleuren snappen naar een echt Van Gogh-palet
- Cupcaek en SuperCaek als eigen rigged modellen
- Levels uit Blender laden (nu declaratief in `secties.js`, wat voor deze
  omvang prettiger hackt)
- Muziek; er is alleen oscillator-geluid
- Opslaan van voortgang — de slice duurt 7–10 minuten, dus dat hoeft niet

## Credits

three.js r185 (MIT, `web/vendor/three/LICENSE`). Karakters, Doelenwiel en
huisstijl: CAEK branding suite.
