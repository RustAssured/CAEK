#!/usr/bin/env python3
"""
Maakt van een getekend contactvel een spriteblad dat de game kan afspelen.

Je levert bijvoorbeeld een walk cycle als raster van 5 x 2 met genummerde
badges op een witte achtergrond. Dit script:

  1. knipt het raster in losse frames
  2. gooit de genummerde badge weg
  3. maakt de witte achtergrond transparant (flood fill vanaf de rand, zodat
     wit *in* het karakter blijft staan)
  4. lijnt de frames op elkaar uit -- dit is het belangrijkste deel, zie hieronder
  5. schrijft een horizontale strip die de game rechtstreeks inleest
  6. schrijft een geanimeerde GIF zodat je kunt kijken of het loopt

Over stap 4: tekeningen die frame voor frame los gemaakt zijn staan nooit
precies gelijk. Het karakter staat een paar pixels hoger, is net iets groter,
schuift opzij. Speel je dat af, dan trilt het. Daarom wordt elk frame
geschaald op de hoogte van het bovenlijf, horizontaal gecentreerd op het
zwaartepunt van dat bovenlijf (de benen zwaaien, de romp niet) en verticaal op
de voeten gezet. Wat overblijft is de beweging die je getekend hebt.

Gebruik:
    python3 tools/sprites.py assets/sprites/caek_lopen.png --raster 5x2
    python3 tools/sprites.py bron.png --raster 5x2 --naam caek_lopen --badge 0.22
    python3 tools/sprites.py bron.png --raster 1x1 --naam caek_idle --geen-uitlijning

Uitvoer:
    web/assets/sprites/<naam>_<aantal>.png     de strip
    web/assets/sprites/<naam>_preview.gif      om naar te kijken
"""

import argparse
import os
import sys
from collections import deque

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UIT = os.path.join(REPO, "web", "assets", "sprites")

try:
    from PIL import Image
except ImportError:
    print("Pillow is nodig: pip install pillow", file=sys.stderr)
    raise SystemExit(1)


# ------------------------------------------------------------------ #
# Achtergrond weghalen
# ------------------------------------------------------------------ #

def maak_transparant(afbeelding, drempel=232, marge=26):
    """
    Flood fill vanaf de rand: alles wat licht is én vanaf buiten bereikbaar,
    wordt transparant. Wit binnen het karakter -- een lichtje in het oog, een
    glans op de schoen -- blijft dus gewoon staan.
    """
    afbeelding = afbeelding.convert("RGBA")
    b, h = afbeelding.size
    px = afbeelding.load()

    def licht(x, y):
        r, g, bl, a = px[x, y]
        return a > 0 and r >= drempel and g >= drempel and bl >= drempel

    gezien = bytearray(b * h)
    rij = deque()
    for x in range(b):
        for y in (0, h - 1):
            if licht(x, y):
                rij.append((x, y))
                gezien[y * b + x] = 1
    for y in range(h):
        for x in (0, b - 1):
            if licht(x, y):
                rij.append((x, y))
                gezien[y * b + x] = 1

    while rij:
        x, y = rij.popleft()
        px[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < b and 0 <= ny < h and not gezien[ny * b + nx] and licht(nx, ny):
                gezien[ny * b + nx] = 1
                rij.append((nx, ny))

    # randjes van de anti-aliasing: bijna-wit dat blijft staan leest als een
    # vies halo tegen de donkerblauwe wereld
    px = afbeelding.load()
    for y in range(h):
        for x in range(b):
            r, g, bl, a = px[x, y]
            if a and r >= drempel - marge and g >= drempel - marge and bl >= drempel - marge:
                buur_leeg = any(
                    0 <= x + dx < b and 0 <= y + dy < h and px[x + dx, y + dy][3] == 0
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                )
                if buur_leeg:
                    px[x, y] = (r, g, bl, 0)
    return afbeelding


def wis_badge(frame, deel=0.22):
    """Gum de linkerbovenhoek uit; daar zit het nummertje en nooit het karakter."""
    b, h = frame.size
    hoek = Image.new("RGBA", (int(b * deel), int(h * deel)), (255, 255, 255, 0))
    frame.paste(hoek, (0, 0))
    return frame


# ------------------------------------------------------------------ #
# Uitlijnen
# ------------------------------------------------------------------ #

def kader(frame):
    doos = frame.getbbox()
    return doos


def zwaartepunt_boven(frame, doos, deel=0.55):
    """Horizontaal zwaartepunt van het bovenste deel: de romp, niet de benen."""
    x0, y0, x1, y1 = doos
    hoogte = int((y1 - y0) * deel)
    strook = frame.crop((x0, y0, x1, y0 + max(1, hoogte)))
    alfa = strook.getchannel("A")
    som = 0
    gewicht = 0
    data = alfa.load()
    b, h = strook.size
    for y in range(h):
        for x in range(b):
            a = data[x, y]
            if a:
                som += x * a
                gewicht += a
    return x0 + (som / gewicht if gewicht else b / 2)


def lijn_uit(frames, doelbreedte=None, doelhoogte=None, marge=0.06):
    """
    Zet elk frame op dezelfde schaal en dezelfde grondlijn.

    Schaal komt van de hoogte van het bovenlijf: die verandert tijdens een
    looppas nauwelijks, terwijl de totale hoogte juist wel op en neer gaat --
    en dat laatste is de beweging die je wilt hóuden, niet wegpoetsen.
    """
    metingen = []
    for f in frames:
        doos = kader(f)
        if not doos:
            metingen.append(None)
            continue
        x0, y0, x1, y1 = doos
        romp = (y1 - y0) * 0.55
        metingen.append({
            "doos": doos,
            "romp": romp,
            "midden": zwaartepunt_boven(f, doos),
            "bodem": y1,
        })

    geldig = [m for m in metingen if m]
    if not geldig:
        return frames

    doelromp = sum(m["romp"] for m in geldig) / len(geldig)
    # hoe hoog en breed het uiteindelijke frame wordt
    hoogtes = [(m["doos"][3] - m["doos"][1]) * (doelromp / m["romp"]) for m in geldig]
    breedtes = [(m["doos"][2] - m["doos"][0]) * (doelromp / m["romp"]) for m in geldig]
    H = doelhoogte or int(max(hoogtes) * (1 + marge * 2))
    B = doelbreedte or int(max(breedtes) * (1 + marge * 2))
    grondlijn = int(H * (1 - marge))

    uit = []
    for f, m in zip(frames, metingen):
        vel = Image.new("RGBA", (B, H), (0, 0, 0, 0))
        if m:
            s = doelromp / m["romp"]
            nieuw = f.resize((max(1, int(f.width * s)), max(1, int(f.height * s))), Image.LANCZOS)
            # het frame zo plakken dat de voeten op de grondlijn staan en het
            # zwaartepunt van de romp in het midden
            dx = int(B / 2 - m["midden"] * s)
            dy = int(grondlijn - m["bodem"] * s)
            vel.paste(nieuw, (dx, dy), nieuw)
        uit.append(vel)
    return uit


def zet_naast_elkaar(frames):
    B, H = frames[0].size
    strip = Image.new("RGBA", (B * len(frames), H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * B, 0), f)
    return strip


# ------------------------------------------------------------------ #

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bron")
    ap.add_argument("--raster", default="1x1", help="kolommen x rijen, bijvoorbeeld 5x2")
    ap.add_argument("--naam", help="uitvoernaam; standaard de bestandsnaam van de bron")
    ap.add_argument("--badge", type=float, default=0.22, help="deel van het frame linksboven dat gewist wordt (0 = niet)")
    ap.add_argument("--drempel", type=int, default=232, help="vanaf welke helderheid iets als achtergrond telt")
    ap.add_argument("--geen-uitlijning", action="store_true")
    ap.add_argument("--hoogte", type=int, default=320, help="hoogte van één frame in de strip")
    ap.add_argument("--fps", type=int, default=12, help="tempo van de preview-GIF")
    ap.add_argument("--overslaan", default="", help="frames die je niet wilt, 1-gebaseerd: 1,10")
    args = ap.parse_args()

    kolommen, rijen = (int(v) for v in args.raster.lower().split("x"))
    naam = args.naam or os.path.splitext(os.path.basename(args.bron))[0]
    overslaan = {int(v) for v in args.overslaan.split(",") if v.strip()}

    vel = Image.open(args.bron).convert("RGBA")
    cb = vel.width / kolommen
    ch = vel.height / rijen
    print(f"bron: {vel.width}x{vel.height}, raster {kolommen}x{rijen} -> cel {cb:.0f}x{ch:.0f}")

    frames = []
    nummer = 0
    for r in range(rijen):
        for k in range(kolommen):
            nummer += 1
            if nummer in overslaan:
                continue
            cel = vel.crop((round(k * cb), round(r * ch), round((k + 1) * cb), round((r + 1) * ch)))
            if args.badge > 0:
                cel = wis_badge(cel, args.badge)
            cel = maak_transparant(cel, args.drempel)
            if cel.getbbox() is None:
                print(f"  frame {nummer}: leeg, overgeslagen")
                continue
            frames.append(cel)

    if not frames:
        print("geen enkel frame bevatte iets", file=sys.stderr)
        return 1
    print(f"frames gevonden: {len(frames)}")

    if not args.geen_uitlijning:
        frames = lijn_uit(frames)
        print(f"uitgelijnd op {frames[0].width}x{frames[0].height}")

    # naar de doelhoogte schalen; de game rekent toch in wereldhoogte
    if args.hoogte and frames[0].height != args.hoogte:
        s = args.hoogte / frames[0].height
        frames = [f.resize((max(1, round(f.width * s)), args.hoogte), Image.LANCZOS) for f in frames]

    os.makedirs(UIT, exist_ok=True)
    strip = zet_naast_elkaar(frames)
    strippad = os.path.join(UIT, f"{naam}_{len(frames)}.png")
    strip.save(strippad, optimize=True)
    print(f"strip: {os.path.relpath(strippad, REPO)}  ({strip.width}x{strip.height}, {os.path.getsize(strippad)/1024:.0f} kB)")

    # preview op een donkere ondergrond, want daar komt hij te staan
    achter = []
    for f in frames:
        vlak = Image.new("RGBA", f.size, (13, 27, 76, 255))
        vlak.alpha_composite(f)
        achter.append(vlak.convert("P", palette=Image.ADAPTIVE))
    gifpad = os.path.join(UIT, f"{naam}_preview.gif")
    achter[0].save(gifpad, save_all=True, append_images=achter[1:],
                   duration=round(1000 / args.fps), loop=0, disposal=2)
    print(f"preview: {os.path.relpath(gifpad, REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
