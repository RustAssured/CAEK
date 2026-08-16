#!/usr/bin/env python3
"""
Kijkt of een looppas echt een cyclus is, of alleen een rij losse poses.

Naar frames kijken werkt niet. Ik heb een set frames goedgekeurd op het oog
die daarna bij meting geen enkele passeerstand bleek te hebben -- acht keer
dezelfde brede pas. Vandaar dit ding: het meet wat je met je ogen niet ziet
maar wel voelt als het afspeelt.

Wat een echte looppas moet doen:

  1. De afstand tussen de voeten gaat twee keer naar bijna nul. Dat zijn de
     passeerstanden: de benen gaan langs elkaar heen. Zonder die twee is het
     geen cyclus maar een diavoorstelling.
  2. De afstand gaat ook twee keer naar een maximum: de twee contactstanden.
  3. De kop gaat twee keer op en neer. Dat is het gewicht.
  4. De verschillen tussen opeenvolgende frames zijn ongeveer even groot.
     Ongelijke sprongen lezen als haperen.

Gebruik:
    python3 tools/loopcheck.py "assets/sprites/caek test.png"
    python3 tools/loopcheck.py vel.png --rij 1 --rijen 4
"""

import argparse
import os
import sys

try:
    import numpy as np
    from PIL import Image
    from scipy import ndimage
except ImportError as fout:
    print(f"nodig: pillow, numpy, scipy ({fout})", file=sys.stderr)
    raise SystemExit(1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprites import (  # noqa: E402
    al_transparant, snij_achtergrond, gooi_vlekjes_weg,
    vind_figuren, cluster_rijen, splits_brede, lijn_uit,
)

BLOKJES = " ▁▂▃▄▅▆▇█"


def sparkline(waarden):
    lo, hi = min(waarden), max(waarden)
    if hi - lo < 1e-6:
        return BLOKJES[0] * len(waarden)
    return "".join(BLOKJES[int((v - lo) / (hi - lo) * (len(BLOKJES) - 1))] for v in waarden)


def meet_frame(frame):
    a = np.array(frame)[..., 3] > 40
    ys, xs = np.nonzero(a)
    if not len(ys):
        return None
    top, bodem = int(ys.min()), int(ys.max())
    hoog = max(1, bodem - top)

    # voeten: losse vlekken in de onderste 16 procent
    strook = a[max(0, bodem - int(hoog * 0.16)): bodem + 1]
    lab, n = ndimage.label(strook)
    voeten = []
    if n:
        maten = ndimage.sum(strook, lab, range(1, n + 1))
        for j, doos in enumerate(ndimage.find_objects(lab)):
            if maten[j] >= 40 and doos is not None:
                voeten.append((doos[1].start + doos[1].stop) / 2)

    return {
        "top": top,
        "hoogte": hoog,
        "spreiding": (max(voeten) - min(voeten)) if len(voeten) > 1 else 0.0,
        "voeten": len(voeten),
    }


def dalen(reeks):
    """
    Aantal echte dalen in een gesloten reeks (het loopt rond).

    Naast elkaar liggende dieptepunten tellen als één dal: twee frames waarin
    de voeten allebei tegen elkaar staan is één passeerstand, geen twee.
    """
    n = len(reeks)
    drempel = (max(reeks) - min(reeks)) * 0.25
    if drempel < 1e-6:
        return 0
    laag = []
    for i in range(n):
        v, links, rechts = reeks[i], reeks[(i - 1) % n], reeks[(i + 1) % n]
        if v <= links and v <= rechts and (max(links, rechts) - v) >= drempel:
            laag.append(i)
    if not laag:
        return 0
    # aaneengesloten reeksen samenvoegen, ook over het einde heen
    groepen = 0
    for i, k in enumerate(laag):
        vorige = laag[i - 1]
        if i == 0 or (k - vorige) % n > 1:
            groepen += 1
    if len(laag) > 1 and (laag[0] - laag[-1]) % n == 1:
        groepen -= 1
    return max(1, groepen)


def toppen(reeks):
    return dalen([-v for v in reeks])


def beoordeel(frames, naam):
    metingen = [meet_frame(f) for f in frames]
    metingen = [m for m in metingen if m]
    n = len(metingen)
    if n < 4:
        print(f"  te weinig frames ({n}) om iets zinnigs over te zeggen")
        return False

    hoogte = float(np.median([m["hoogte"] for m in metingen]))
    spreiding = [m["spreiding"] for m in metingen]
    koppen = [m["top"] for m in metingen]

    maxSpreiding = max(spreiding)
    # een passeerstand: voeten bijna of helemaal op elkaar
    passeer = sum(1 for s in spreiding if s <= maxSpreiding * 0.28)
    passeerdalen = dalen(spreiding)
    contacten = toppen(spreiding)

    kopBereik = max(koppen) - min(koppen)
    kopDalen = dalen([-k for k in koppen])   # kop hoog = top klein
    kopPct = kopBereik / hoogte * 100

    # gelijkmatigheid: hoe erg verschillen de stappen tussen frames
    arr = [np.array(f.convert("RGBA"), dtype=np.float32)[..., 3] / 255 for f in frames]
    vorm = arr[0].shape
    arr = [a if a.shape == vorm else np.array(
        Image.fromarray((a * 255).astype(np.uint8)).resize((vorm[1], vorm[0]))
    ) / 255 for a in arr]
    stappen = [float(np.abs(arr[i] - arr[(i + 1) % n]).mean()) * 100 for i in range(n)]
    ongelijk = (max(stappen) - min(stappen)) / max(np.mean(stappen), 1e-6)

    print(f"\n  {naam}: {n} frames")
    print(f"    staplengte   {sparkline(spreiding)}  {[round(s) for s in spreiding]}")
    print(f"    kophoogte    {sparkline([-k for k in koppen])}  bereik {kopBereik} px ({kopPct:.1f}% van de figuur)")
    print(f"    stapgrootte  {sparkline(stappen)}  {[round(s, 1) for s in stappen]}")

    print()
    goed = True

    if passeerdalen >= 2 and passeer >= 2:
        print(f"    [ok]   {passeerdalen} passeerstanden — de benen gaan langs elkaar heen")
    elif passeerdalen >= 1:
        print(f"    [half] maar {passeerdalen} passeerstand; een cyclus heeft er twee")
        goed = False
    else:
        print("    [FOUT] geen enkele passeerstand — de benen komen nooit bij elkaar.")
        print("           Dit is geen looppas maar een rij losse standen.")
        goed = False

    if contacten >= 2:
        print(f"    [ok]   {contacten} contactstanden — er wordt echt gestapt")
    else:
        print(f"    [FOUT] {contacten} contactstand; er horen er twee te zijn")
        goed = False

    if kopPct >= 2.5 and kopDalen >= 2:
        print(f"    [ok]   kop beweegt {kopPct:.1f}% en dipt {kopDalen}x — er zit gewicht in")
    elif kopPct < 2.5:
        print(f"    [FOUT] kop beweegt maar {kopPct:.1f}% — de figuur zweeft, er is geen gewicht")
        goed = False
    else:
        print(f"    [half] kop dipt {kopDalen}x in plaats van 2x")

    if ongelijk <= 1.2:
        print(f"    [ok]   stappen zijn gelijkmatig (spreiding {ongelijk:.2f})")
    else:
        print(f"    [half] ongelijke stappen (spreiding {ongelijk:.2f}) — kan haperen")

    print()
    print("    " + ("=> BRUIKBAAR ALS LOOPPAS" if goed else "=> NIET BRUIKBAAR ALS LOOPPAS"))
    return goed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vel")
    ap.add_argument("--rijen", type=int, default=1, help="hoeveel rijen staan er op het vel")
    ap.add_argument("--rij", type=int, default=1, help="welke rij is de looppas (1-gebaseerd)")
    ap.add_argument("--vlekdrempel", type=int, default=900)
    ap.add_argument("--ruw", action="store_true", help="meet de tekeningen zoals ze zijn, zonder uitlijnen")
    ap.add_argument("--deel", type=int, default=0, help="beoordeel ook elk N-de frame los")
    args = ap.parse_args()

    vel = Image.open(args.vel)
    print(f"{os.path.basename(args.vel)}  {vel.width}x{vel.height}  {vel.mode}")

    if al_transparant(vel):
        schoon = vel.convert("RGBA")
        print("  vel is al transparant")
    else:
        schoon = snij_achtergrond(vel)
        schoon, weg = gooi_vlekjes_weg(schoon, args.vlekdrempel)
        print(f"  achtergrond weggesneden, {weg} vlekjes opgeruimd")

    figuren = vind_figuren(schoon, args.vlekdrempel)
    rijen = cluster_rijen(figuren, args.rijen)
    print(f"  {len(figuren)} figuren in {len(rijen)} rij(en)")

    if not rijen:
        return 1
    groep = splits_brede(rijen[min(args.rij, len(rijen)) - 1])
    yb = min(f[0] for f in groep)
    yo = max(f[1] for f in groep)
    frames = [schoon.crop((x0, yb, x1, yo)) for _, _, x0, x1 in groep]
    frames = [f for f in frames if f.getbbox()]

    # Meten na het uitlijnen, want dat is wat er straks afspeelt. Losse
    # tekeningen driften nu eenmaal -- de figuur wordt per frame een tikje
    # kleiner of zakt weg -- en dat corrigeert de pijplijn al weg. Zou je de
    # ruwe frames meten, dan keur je iets af om een fout die er niet meer is.
    if not args.ruw:
        frames = lijn_uit(frames)
        print("  frames uitgelijnd (schaal op het bovenlijf, voeten op één grondlijn)")

    goed = beoordeel(frames, "looppas")

    if args.deel:
        stap = args.deel
        for begin in range(stap):
            deel = frames[begin::stap]
            if len(deel) >= 4:
                beoordeel(deel, f"elk {stap}e frame vanaf {begin + 1}")

    return 0 if goed else 2


if __name__ == "__main__":
    sys.exit(main())
