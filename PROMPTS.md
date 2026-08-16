# CAEK — renderprompts

Alles wat er geschilderd moet worden, met de eisen erbij die makkelijk over het
hoofd te zien zijn en die het verschil maken tussen bruikbaar en weggooien.

**Werkwijze.** Zet het stijlblok vóór elke prompt. Lever aan in `assets/`.
Verwerken gaat met `tools/backdrop.py` (platen) of `tools/sprites.py`
(karakters); die snijden het magenta weg, maken de naad dicht en schrijven WebP.

---

## Stijlblok — zet dit vóór elke prompt

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

**Drie regels die overal gelden.**

1. **Geen vluchtpunt.** Dit is de fout die de eerste straattegel onbruikbaar
   maakte: de voegen liepen naar één punt in het midden toe, en bij herhaling
   kwam dat punt elke tegel terug. Diepte mag alleen uit schaal en uit
   overlapping komen, nooit uit convergerende lijnen.
2. **Magenta voor transparantie.** Beeldgeneratoren leveren geen alfakanaal.
   Vlak `#FF00FF` waar niets hoort te staan; dat komt in een nachtelijk Van
   Gogh-palet verder nergens voor, dus het snijdt schoon weg.
3. **Geen tekst.** Alle tekst wordt in het spel zelf gerenderd, zodat de teams
   en de grappen aan te passen zijn zonder opnieuw te renderen. Een bord krijgt
   dus een leeg paneel.

---

## Ronde 1 — het meeste rendement

### 1. `straat.png` — de vloer (opnieuw)

2048 × 1024, dekkend, geen magenta. Vervangt `tiles side.png`.

Twee dingen moeten anders dan de vorige. Er zat een vluchtpunt in, en het
loopvlak besloeg tweederde van de plaat — daardoor dekte de straat in het spel
alles af wat erachter stond, inclusief de zeventien teamstands van de Cluster
Review. Nu omgekeerd: veel stoeprand, weinig wegwijkend loopvlak.

```
[stijlblok]

A seamless horizontal strip of cobblestone street, drawn as a flat side
elevation with the ground receding only slightly.

TOP 35% of the canvas: the walking surface, seen from a very shallow angle.
Rows of cobbles running strictly horizontally, parallel to the top and bottom
edges. The rows get slightly shorter and closer together toward the top to
suggest depth, but the joints between stones must stay VERTICAL and PARALLEL —
absolutely no lines converging toward a centre point, no vanishing point, no
fish-eye. Worn stones in deep blue and violet with warm gold and amber stones
scattered irregularly among them, as if catching lamplight.

BOTTOM 65% of the canvas: the vertical cut face of the kerb below the street,
in darker blue-violet stone. Same painterly treatment, heavier and cooler.

A crisp horizontal line separates the two, at exactly 35% from the top,
running edge to edge without interruption.

Seamlessly tileable horizontally: the left and right edges must continue into
each other. Nothing distinctive on either edge. No objects, no plants, no
lamps, no shadows cast by anything outside the image.
```

### 2. `springblok.png` — de blokken waar je op springt

1024 × 1024, **magenta achtergrond**.

Deze horen er nadrukkelijk anders uit te zien dan de straat: het zijn geen
stukken stoep die in de lucht hangen maar bakkersgerei. Zo lees je meteen
waar je op kúnt staan.

```
[stijlblok]

A single thick wooden bakery crate seen straight from the front, filling the
frame edge to edge horizontally. Heavy planks of warm brown and amber wood
with visible grain, bound by dark iron straps at the corners. The top edge
carries a narrow band of pale stone-coloured dusting, like flour, catching the
light — this is where a character stands.

Drawn as a flat front elevation. The top surface is visible only as a thin
sliver along the upper edge, because the viewer is nearly level with it.

The crate occupies the full width and the lower 80% of the canvas. Everything
above and around it is flat solid magenta #FF00FF, completely uniform, no
gradient, no texture, no paint strokes in the magenta area.

Seamlessly tileable horizontally: two of these side by side must read as one
longer crate, so the left and right edges continue into each other.
```

### 3. `blok.png` — de algemene doostextuur

1024 × 1024, dekkend, in twee richtingen tegelbaar.

Gaat naar de 906 dozen die er nog staan: borden, kozijnen, podia, tafelbladen,
alles wat nu een egaal blauw vlak is. Eén plaat, honderden objecten.

```
[stijlblok]

A seamless square texture of painted plaster wall, seen absolutely flat and
straight on. Deep cobalt and ultramarine blue, worked with heavy visible
brushstrokes running in shifting directions, with occasional warmer violet and
faint gold flecks where the light catches the ridges of paint.

No objects, no edges, no borders, no corners, no frame, no seams, no bricks,
no pattern that repeats within the image. Just the surface itself, uniform in
tone across the whole canvas so it can be scaled to any size.

Seamlessly tileable in BOTH directions: top to bottom and left to right.
Nothing distinctive anywhere near the edges.
```

### 4. `teamstand.png` — het kraampje van één team

1024 × 1024, **magenta achtergrond**. Komt 71 keer terug.

```
[stijlblok]

A small market stall for a bakery, seen straight from the front. A sturdy
wooden trestle table with a striped awning above it on two thin posts. On the
table stands one small round cake with cream icing and a cherry. Beside the
table, at ground level, a squat cast-iron oven with a small arched door glowing
warm amber.

Above the awning, a blank hanging sign board: an empty wooden panel with a
painted frame and NOTHING written on it. Leave it completely blank — the name
is added by the game.

The whole stall sits on the bottom edge of the canvas and fills the lower 85%.
Everything above and around it is flat solid magenta #FF00FF, completely
uniform, no gradient, no texture.
```

### 5. `publiek.png` — een strook toeschouwers

2048 × 512, **magenta achtergrond**. Vervangt 128 losse bollen.

```
[stijlblok]

A row of seated spectators seen from behind and slightly above, as if you are
standing behind the back row of an audience. Only heads and shoulders are
visible, cut off by the bottom edge of the canvas. Two staggered rows: a nearer
row lower and larger, a further row higher and smaller.

The figures are simple rounded silhouettes in warm bread tones, dusty pink,
cream and gold, over dark blue shoulders — no faces, no detail, no
recognisable individuals. Painterly and loose, like a crowd suggested in a few
strokes.

The heads occupy the lower 60% of the canvas. Everything above them is flat
solid magenta #FF00FF, completely uniform.

Seamlessly tileable horizontally, with the heads irregularly spaced so the
repeat is not obvious.
```

---

## Ronde 2 — de hero-objecten

### 6. `oven.png` — de PI Planning Oven en de Value Oven

1024 × 1280 (staand), **magenta achtergrond**. Vijf instanties, en het is het
eerste én het laatste wat je ziet.

```
[stijlblok]

A tall cast-iron bakery oven seen straight from the front. A heavy blue-black
body with a wide arched door in the middle, standing open, with a fierce warm
amber and orange glow pouring out of it. Two round brass dials above the door.
A chimney rising from the top right, slightly crooked. Riveted iron bands
across the body.

Above the door, a blank rectangular nameplate: an empty brass panel with a
raised border and NOTHING written on it. Leave it completely blank.

The oven stands on the bottom edge of the canvas and fills the lower 90%.
Everything above and around it is flat solid magenta #FF00FF, uniform.
```

### 7. `doelenwiel.png` — het Doelenwiel

1024 × 1024, **magenta achtergrond**. Het symbool van het hele spel.

Belangrijk: de acht segmenten lichten in het spel één voor één op als er
teamdoelen aan gekoppeld raken. Schilder ze dus alle acht in hun eigen kleur
maar **gedempt**; de gloed komt er in het spel overheen.

```
[stijlblok]

A large circular wheel divided into eight equal pie segments, seen perfectly
straight on, dead centre, filling the frame.

The eight segments run clockwise from the top and are, in order: deep red,
warm yellow, mustard yellow, light green, mid green, olive green, orange,
amber orange. Every segment is painted in thick impasto but kept MUTED and
low in brightness, as if lit only by moonlight — they must look unlit.

Thick dark blue-black lines separate the segments. A heavy gold ring runs
around the outside. In the centre, a plain cream circular hub with NOTHING
written on it — leave it completely blank.

The wheel is perfectly circular and centred, touching the top and bottom edges.
Everything outside the ring is flat solid magenta #FF00FF, uniform.
```

### 8. `bord.png` — het bord waar de tekst op komt

1024 × 640, **magenta achtergrond**. Ongeveer vijftien instanties, en hier
staan alle grappen op.

```
[stijlblok]

A wooden signboard on a single sturdy post, seen straight from the front. A
wide rectangular panel of dark blue-violet painted wood with a thick warm gold
frame around it, weathered and chipped at the corners. The post is a rough
brown timber running down from the middle of the panel to the bottom edge.

The panel itself must be COMPLETELY EMPTY — a flat dark surface with nothing
written, drawn or carved on it. No text, no letters, no symbols, no ornament
inside the frame. The game writes on it.

The sign fills the upper 75% of the canvas, the post the rest. Everything
around it is flat solid magenta #FF00FF, uniform.
```

---

## Ronde 3 — als je er zin in hebt

### 9. `deur.png` — 1024 × 1280, magenta

```
[stijlblok]

A tall arched wooden door in a heavy stone frame, seen straight from the front
and closed. Dark blue-violet planks with iron bands and a round brass handle on
the right. Above the door, a blank rectangular panel with a raised border and
NOTHING written on it. The door fills the lower 90% of the canvas; everything
around it is flat solid magenta #FF00FF.
```

### 10. `demotafel.png` — 1024 × 768, magenta

```
[stijlblok]

A wide wooden display table seen straight from the front, draped with a heavy
cloth in deep blue and gold. On top of it stands one larger celebration cake
with cream icing, a gold band around it and a cherry on top. The table fills
the lower 85% of the canvas; everything around it is flat solid magenta
#FF00FF.
```

### 11. `scherm.png` — 1536 × 1024, magenta

```
[stijlblok]

A large presentation screen on two wooden legs, seen straight from the front.
A wide rectangular screen in a dark timber frame. The screen surface itself is
a flat pale cream rectangle, COMPLETELY EMPTY — nothing projected on it, no
text, no image, no shapes. The game projects on it.

The screen and legs fill the canvas; everything around them is flat solid
magenta #FF00FF, uniform.
```

---

## Wat níet geschilderd wordt

Ingrediënten, sprinkles, kabels, de pretzel, de papierrommel, de broodrooster,
het stokbrood, de scope creep, het radiootje. Klein, weinig van, wisselende
vormen — en juist dáár doet de olieverffilter precies waar hij voor gebouwd is.

**De vuistregel:** een plaat is het waard als hij vijf keer of vaker terugkomt,
óf als het een hero-object is. Alles daaronder blijft 3D. Dat is een eindige
lijst en geen hellend vlak.
