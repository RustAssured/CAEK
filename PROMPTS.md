# CAEK — renderprompts

Alles wat er nog geschilderd of gemodelleerd kan worden, met de eisen erbij die
makkelijk over het hoofd te zien zijn en die het verschil maken tussen bruikbaar
en weggooien.

**Werkwijze.** Lever aan in `assets/`. Verwerken gaat met `tools/backdrop.py`
(platen), `tools/sprites.py` (karakters) of `tools/glbslank.py` (3D-modellen);
die maken de naad dicht, verkleinen de texturen en schrijven het spelformaat.

---

## Drie afspraken die overal gelden

1. **Resolutie staat in de prompt.** Niet ernaast, niet in een instelling —
   in de tekst zelf, want dan houdt de generator zich eraan.
2. **"Transparant as a printable sticker."** Die zin levert betrouwbaar een
   echt alfakanaal op. Geen magenta meer nodig; `backdrop.py` snijdt het nog
   steeds weg als het er toch in zit, maar echte transparantie is beter.
3. **Geen tekst in het beeld.** Alle tekst wordt in het spel gerenderd, zodat
   teamnamen en grappen aan te passen zijn zonder opnieuw te renderen. Een
   bord krijgt dus een leeg paneel. Dit is geen stijlkeuze maar een harde eis:
   er staan zeventien teams in dit spel en die lijst mag veranderen.

En één die alleen voor tegelbare platen geldt: **geen vluchtpunt**. Voegen die
naar één punt toe lopen komen bij elke herhaling terug als een streep in het
beeld. Diepte mag uit schaal en overlapping komen, nooit uit convergerende
lijnen.

---

## Het stijlblok — zet dit vóór elke prompt

```
Oil painting in the style of Vincent van Gogh. Thick impasto, heavy visible
directional brushstrokes, palette-knife texture, canvas grain. Night scene.
Deep cobalt and ultramarine blues (#0b1640, #17307d, #3f63c9) against warm
gold and amber (#f5b229, #ffd873, #e8721f), with cream highlights (#fdf3d8).
No people, no text, no letters, no numbers, no logos, no watermark, no
signature. Flat front-on elevation view, no perspective convergence, no
vanishing point. Even lighting across the whole image, no spotlight or
vignette.
```

De wereld is een bakkerij die 's nachts doorwerkt aan een PI. Dus: gebak,
gietijzer, meel en gouden lantaarns — en tussendoor het gereedschap van een
IV-afdeling dat door de bakkerij heen is gegroeid. Dat contrast is de grap.
Nooit uitgelegd, altijd zichtbaar.

---

## Wat er nu het meeste toe doet: 3D

`assets/oven3d.glb` heeft bewezen dat dit de goede richting is. Een echte
oven waarvan de openstaande deuren met de camera meedraaien en waar je de
vlammen in kijkt, doet iets wat geen plaat kan. Precies de 2.5D-diepte waar
het om ging.

**Eisen voor elk model.** Glue, één mesh mag, maximaal ~15.000 driehoeken,
één baseColor-textuur van 2048² (die wordt automatisch teruggebracht naar
1024 met `tools/glbslank.py`). Geen skelet, geen animatie nodig. Voorkant naar
+Z, staand op y = 0, en het model gecentreerd in x en z — de loader schaalt en
zet hem zelf op de grond, maar hij moet wel de goede kant op kijken.

### A. `springkrat.glb` — de kratten waar je op springt

Het belangrijkste model dat er nog niet is. Er staan er ongeveer vijftig in het
spel en het is het object waar je het meeste contact mee hebt: je landt erop,
je zet je erop af, en juist dáár wil je zien dat het diepte heeft.

```
A sturdy wooden bakery crate, 3D model, quads or triangles, under 8000 polys,
single 2048x2048 baseColor texture, no rig, no animation.

A rectangular crate of thick planks in warm amber and brown wood, bound at
every corner by dark blue-black iron straps with visible rivets. The planks
are worn, with a heavy oil-painting brushstroke texture in the wood grain —
thick impasto strokes in the style of Van Gogh, not photorealistic timber.
A dusting of pale cream flour lies along the top edges and in the seams.

On the front face, branded into the wood, a simple round bakery stamp shape
with NOTHING written in it — leave the disc completely blank.

Proportions roughly 2 wide by 1.5 high by 1.5 deep. Front face toward +Z,
standing on the ground plane at y=0, centred in x and z.
Colours: deep cobalt and ultramarine blue (#0b1640, #17307d) for the iron,
warm gold and amber (#f5b229, #e8721f) for the wood, cream (#fdf3d8) for the
flour.
```

### B. `lantaarn.glb` — de straatlantaarn

Staat er tientallen keren. Sinds de bloei erin zit worden lampen echte
lichtbronnen, en dan wordt dit het object dat de nachtsfeer draagt.

```
An ornate cast-iron street lantern, 3D model, under 5000 polys, single
2048x2048 baseColor texture, no rig, no animation.

A slender fluted post in dark blue-black iron rising to a four-sided glass
lamp housing with a small peaked roof and a curl of ironwork at the top. The
glass panes glow warm amber from within, painted with thick visible
brushstrokes so the light looks like paint and not like a bulb. A small
decorative bracket halfway up the post holds a hanging pretzel-shaped iron
ornament — this is a baker's street.

Tall and narrow, roughly 1 wide by 5 high. Front face toward +Z, standing on
the ground plane at y=0, centred in x and z.
Colours: deep cobalt and blue-black iron (#0b1640, #17307d), warm amber and
gold glass (#f5b229, #ffd873).
```

### C. `doelenwiel3d.glb` — het Doelenwiel

Het symbool van het hele spel; het hangt boven elke Cluster Review. In 3D kan
het langzaam draaien en licht vangen, en dan wordt het een object in plaats
van een poster.

Belangrijk: de acht segmenten lichten in het spel één voor één op als er
teamdoelen aan gekoppeld raken. Dus alle acht in hun eigen kleur, maar
**gedempt** — de gloed komt er in het spel overheen.

```
A large circular wheel of eight equal pie segments, 3D model, under 6000
polys, single 2048x2048 baseColor texture, no rig, no animation.

A thick disc, like a decorated cake seen from above but standing upright as a
wheel. Eight equal wedge segments separated by raised cream-coloured ridges of
icing. The segments run clockwise from the top: deep red, warm yellow, mustard
yellow, light green, mid green, olive green, orange, amber orange — every one
painted in thick impasto but kept MUTED and low in brightness, as if lit only
by moonlight. They must look unlit.

A heavy gold ring runs around the rim with round brass studs set into it. In
the centre, a raised cream hub with NOTHING written or drawn on it — leave it
completely blank. The rim has real thickness, about a tenth of the diameter,
so the wheel reads as a solid object from the side.

Perfectly circular, roughly 4 across and 0.4 deep. Face toward +Z, centred at
the origin in x and y.
```

---

## 2D — wat er nog ontbreekt

De platen voor ronde 1 tot en met 3 zitten er allemaal in. Wat nu nog zou
helpen, op volgorde van opbrengst.

### 1. `publiek2.png` — een tweede rij toeschouwers

2048 × 512, transparant. De huidige strook herhaalt zichtbaar zodra de zaal
breed genoeg is; een tweede variant die ertussendoor gehusseld wordt haalt dat
patroon eruit.

```
[stijlblok]

2048 x 512 pixels. Transparant as a printable sticker.

A row of seated spectators seen from behind and slightly above, as if you are
standing behind the back row of an audience. Only heads and shoulders are
visible, cut off by the bottom edge. Two staggered rows: a nearer row lower
and larger, a further row higher and smaller.

The figures are simple rounded silhouettes in warm bread tones, dusty pink,
cream and gold, over dark blue shoulders — no faces, no detail, no
recognisable individuals. Painterly and loose, like a crowd suggested in a few
strokes. Here and there someone holds up a small round cake or a mug of
coffee, and one head wears a paper baker's hat — a cluster review is still a
room full of people who came for the cake.

The heads occupy the lower 60%; everything above them is transparent.
Seamlessly tileable horizontally, with the heads irregularly spaced so the
repeat is not obvious. Make this row noticeably different from an earlier
version: different spacing, different heights, different colours.
```

### 2. `obeya.png` — de Obeya-muur

1536 × 1024, transparant. Komt drie keer terug en is nu een blauwe doos.

```
[stijlblok]

1536 x 1024 pixels. Transparant as a printable sticker.

A large wall-mounted planning board on a heavy wooden frame, seen straight
from the front. The board surface is dark blue-violet, divided by thick gold
lines into a grid of six empty rectangular panels — every panel COMPLETELY
BLANK, no text, no sticky notes, no marks inside them. The game writes on it.

Around the frame, the bakery has crept in: a rolling pin hangs from a hook on
the left, a small cast-iron oven door is set into the wall on the right with a
faint amber glow behind it, and a dusting of flour lies along the bottom rail
of the frame. Two thin cables run out of the top corners and off the edge of
the canvas.

The board fills the upper 80%; the wooden legs the rest. Everything around it
is transparent.
```

### 3. `bus.png` — de bus

1536 × 768, transparant. Eén instantie maar een hero-moment: hij rijdt weg en
je moet erin.

```
[stijlblok]

1536 x 768 pixels. Transparant as a printable sticker.

An old boxy delivery van seen from the side, painted like a bakery van: deep
cobalt blue body with warm gold panels and cream trim, big round headlamps,
chrome bumper, a stubby chimney on the roof puffing a curl of smoke. Round
wheels with gold spokes. Three square windows along the side, each a flat
cream rectangle with NOTHING visible through them — no faces, no shapes.

On the side panel, a large oval badge with a thick gold border and a
COMPLETELY EMPTY interior — leave it blank, the game writes the name on it.

The van fills the full width and the lower 90%. Everything around it is
transparent. It faces to the right.
```

---

## Wat níet gerenderd wordt

Ingrediënten, sprinkles, kabels, de pretzel, de papierrommel, de broodrooster,
het stokbrood, de scope creep, het radiootje. Klein, weinig van, wisselende
vormen — en met de bloei en de deeltjes eroverheen zien die er in primitieven
prima uit.

**De vuistregel:** een asset is het waard als hij vijf keer of vaker terugkomt,
óf als het een hero-object is waar de camera even bij stilstaat. Alles daaronder
blijft zoals het is. Dat is een eindige lijst en geen hellend vlak.
