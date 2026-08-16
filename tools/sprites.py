#!/usr/bin/env python3
"""
Maakt van een getekend spritesheet losse animatiestrips die de game afspeelt.

De vellen zijn contactvellen: vier rijen onder elkaar (WALK, IDLE, JUMP,
CHEER), elk met een eigen aantal frames, genummerde badges, een kopje in
tekst, stippellijnen ertussen en een lichte achtergrond. Niets daarvan staat
op een net raster -- Caek loopt op tien frames, Cupcaek op zeven -- dus het
script zoekt de rijen en de kolommen zelf op in plaats van ze aan te nemen.

Wat er gebeurt:

  1. achtergrond wegsnijden op kleurafstand, met de randen zacht en zonder
     lichte halo (de randpixels worden teruggerekend naar hun eigen kleur)
  2. losse kleine vlekjes weggooien: badges, kopjes, stippellijnen
  3. rijen vinden via een projectie op de y-as, kolommen per rij op de x-as
  4. de frames binnen een rij op elkaar uitlijnen
  5. per rij een horizontale strip schrijven, plus een GIF om naar te kijken
  6. een manifest schrijven dat het sprite-lab en de game inlezen

Over stap 4: tekeningen die frame voor frame los gemaakt zijn staan nooit
precies gelijk. Speel je dat af, dan trilt het. Elk frame wordt daarom
geschaald op de hoogte van het bovenlijf -- die verandert tijdens een looppas
nauwelijks, terwijl de totale hoogte juist wel op en neer gaat, en dat is de
beweging die je wilt houden. Daarna horizontaal centreren op het zwaartepunt
van de romp (de benen zwaaien, de romp niet) en de voeten op een vaste
grondlijn.

Gebruik:
    python3 tools/sprites.py                       # alles in assets/sprites/
    python3 tools/sprites.py --vel "assets/sprites/alle cycles Caek.png" \\
                             --naam caek --rijen lopen,idle,springen,juichen
"""

import argparse
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRON = os.path.join(REPO, "assets", "sprites")
UIT = os.path.join(REPO, "web", "assets", "sprites")

try:
    import numpy as np
    from PIL import Image
    from scipy import ndimage
except ImportError as fout:
    print(f"nodig: pillow, numpy, scipy ({fout})", file=sys.stderr)
    raise SystemExit(1)


# De volgorde waarin de rijen op de vellen staan. Het kopje in beeld is tekst
# en die lezen we niet; de volgorde is bij alle drie de vellen gelijk.
RIJNAMEN = ["lopen", "idle", "springen", "juichen"]

# Welk vel bij welk karakter hoort. Op naam herkennen, want de bestandsnamen
# komen met spaties en hoofdletters binnen zoals ze getekend zijn.
KARAKTERS = {
    "caek": ["caek"],
    "supercaek": ["supercaek", "super"],
    "cupcaek": ["cupcaek", "cup"],
}


# ------------------------------------------------------------------ #
# Achtergrond wegsnijden
# ------------------------------------------------------------------ #

def snij_achtergrond(vel, tolerantie=26, zacht=16):
    """
    Alles wat op de achtergrondkleur lijkt én vanaf de rand bereikbaar is,
    wordt doorzichtig. Bereikbaar-vanaf-de-rand is belangrijk: wit *in* het
    karakter -- een glimlichtje in een oog -- moet blijven staan.

    De randpixels van een tekening zijn een mengsel van karakter en
    achtergrond. Laat je die op hun gemengde kleur staan, dan krijg je een
    lichte rand tegen de donkerblauwe wereld. Daarom worden ze teruggerekend
    naar de kleur die ze zonder achtergrond gehad zouden hebben.
    """
    arr = np.asarray(vel.convert("RGB"), dtype=np.float32)
    h, b, _ = arr.shape

    rand = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    grond = np.median(rand, axis=0)

    afstand = np.abs(arr - grond).max(axis=2)

    # zachte overgang: onder `tolerantie` volledig achtergrond, daarboven
    # loopt hij in `zacht` stappen naar volledig karakter
    alfa = np.clip((afstand - tolerantie) / max(zacht, 1), 0.0, 1.0)

    # Ingesloten wit -- de spleet tussen twee voeten, maar ook het glimlichtje
    # in een oog -- gaat er hier allemaal uit. Welke daarvan terug moet, is op
    # velniveau niet te zien: een spleet en een glimlicht zijn even klein en
    # even compact. Wat ze wél onderscheidt is waar ze zitten, en dat weten we
    # pas als de frames uitgeknipt zijn. Zie vul_glimlichten().

    # halo weg: kleur terugrekenen alsof de achtergrond er niet was. Waar
    # niets staat blijft de oorspronkelijke kleur bewaard, want een glimlicht
    # dat straks terugkomt moet nog wit zijn en niet zwart.
    veilig = np.maximum(alfa, 0.25)[..., None]
    ontmengd = np.clip((arr - (1.0 - alfa[..., None]) * grond) / veilig, 0, 255)
    kleur = np.where(alfa[..., None] > 0.0, ontmengd, arr)

    uit = np.dstack([kleur, alfa * 255.0]).astype(np.uint8)
    return Image.fromarray(uit, "RGBA")


def vul_glimlichten(frame, gatgrens=420):
    """
    Zet ingesloten wit terug dat een glimlichtje is, en laat de rest weg.

    Onderscheid op positie: ogen zitten in de bovenste helft van een figuur,
    de spleet tussen twee voeten in de onderste. Daar komt nog bij dat een
    glimlicht ongeveer even breed als hoog is en een spleet langgerekt.

    Dit kan pas als het frame uitgeknipt is -- op een heel contactvel weet je
    niet welk gat bij welk figuur hoort, laat staan hoe hoog het erin zit.
    """
    arr = np.array(frame)
    leeg = arr[..., 3] < 8
    labels, n = ndimage.label(leeg)
    if not n:
        return frame

    randlabels = set(labels[0].tolist()) | set(labels[-1].tolist())
    randlabels |= set(labels[:, 0].tolist()) | set(labels[:, -1].tolist())
    randlabels.discard(0)

    maten = ndimage.sum(leeg, labels, range(1, n + 1))
    dozen = ndimage.find_objects(labels)
    hoogte = arr.shape[0]

    terug = set()
    for i, m in enumerate(maten):
        if (i + 1) in randlabels or m >= gatgrens:
            continue
        doos = dozen[i]
        if doos is None:
            continue
        hh = doos[0].stop - doos[0].start
        bb = doos[1].stop - doos[1].start
        midden = (doos[0].start + doos[0].stop) / 2
        if midden > hoogte * 0.55:      # onderin: spleet tussen benen of voeten
            continue
        if hh / max(bb, 1) > 1.8:       # langgerekt: ook een spleet
            continue
        terug.add(i + 1)

    if terug:
        arr[..., 3] = np.where(np.isin(labels, list(terug)), 255, arr[..., 3])
    return Image.fromarray(arr, "RGBA")


def gooi_vlekjes_weg(afbeelding, minimum=900):
    """
    Badges, kopjes en stippellijnen zijn kleine losse vlekjes; een karakter is
    een groot samenhangend geheel. Alles onder de drempel gaat eruit.
    """
    arr = np.array(afbeelding)
    massief = arr[..., 3] > 24
    labels, n = ndimage.label(massief)
    if not n:
        return afbeelding, 0
    maten = ndimage.sum(massief, labels, range(1, n + 1))
    weg = {i + 1 for i, m in enumerate(maten) if m < minimum}
    if weg:
        arr[..., 3] = np.where(np.isin(labels, list(weg)), 0, arr[..., 3])
    return Image.fromarray(arr, "RGBA"), len(weg)


# ------------------------------------------------------------------ #
# Rijen en kolommen zoeken
# ------------------------------------------------------------------ #

def banden(profiel, minimum_gat, minimum_maat):
    """Aaneengesloten stukken waar iets staat, met kleine gaten dichtgeplakt."""
    aan = profiel > 0
    stukken = []
    begin = None
    for i, v in enumerate(aan):
        if v and begin is None:
            begin = i
        elif not v and begin is not None:
            stukken.append([begin, i])
            begin = None
    if begin is not None:
        stukken.append([begin, len(aan)])

    samen = []
    for s in stukken:
        if samen and s[0] - samen[-1][1] <= minimum_gat:
            samen[-1][1] = s[1]
        else:
            samen.append(s)
    return [s for s in samen if s[1] - s[0] >= minimum_maat]


def vind_figuren(afbeelding, minimum=900):
    """Elke losse figuur op het vel, als (y0, y1, x0, x1)."""
    massief = np.array(afbeelding)[..., 3] > 24
    labels, n = ndimage.label(massief)
    if not n:
        return []
    maten = ndimage.sum(massief, labels, range(1, n + 1))
    dozen = ndimage.find_objects(labels)
    uit = []
    for i, doos in enumerate(dozen):
        if doos is None or maten[i] < minimum:
            continue
        uit.append((doos[0].start, doos[0].stop, doos[1].start, doos[1].stop))
    return uit


def cluster_rijen(figuren, aantal):
    """
    Deel de figuren op in rijen.

    Eerst geprobeerd met een projectie op de y-as, maar op de transparante
    vellen raakt dat vast: tussen de sprong- en juichrij zit geen witruimte
    meer -- een figuur die hoog springt overlapt met een figuur eronder die
    zijn armen omhoog gooit. Losse figuren clusteren op hun middelpunt werkt
    wel, want binnen een rij liggen die dicht bij elkaar en tussen rijen niet.

    Het aantal rijen komt van buiten (uit --rijen), want dat weet je gewoon.
    """
    if not figuren:
        return []
    middens = sorted((f[0] + f[1]) / 2 for f in figuren)
    if aantal <= 1 or len(middens) <= aantal:
        return [figuren]

    sprongen = sorted(
        ((middens[i + 1] - middens[i], i) for i in range(len(middens) - 1)),
        reverse=True,
    )[: aantal - 1]
    grenzen = sorted((middens[i] + middens[i + 1]) / 2 for _, i in sprongen)

    groepen = [[] for _ in range(aantal)]
    for f in figuren:
        m = (f[0] + f[1]) / 2
        k = sum(1 for g in grenzen if m > g)
        groepen[k].append(f)
    groepen = [g for g in groepen if g]
    return [sorted(g, key=lambda f: f[2]) for g in groepen]


def splits_brede(figuren):
    """
    Twee figuren die elkaar raken zijn één samenhangend geheel geworden.
    Een doos die veel breder is dan de rest wordt daarom opgedeeld.
    """
    if len(figuren) < 2:
        return figuren
    normaal = float(np.median([f[3] - f[2] for f in figuren]))
    uit = []
    for y0, y1, x0, x1 in figuren:
        breedte = x1 - x0
        stukken = max(1, round(breedte / normaal))
        if stukken < 2 or breedte < normaal * 1.5:
            uit.append((y0, y1, x0, x1))
            continue
        for k in range(stukken):
            a = x0 + round(breedte * k / stukken)
            b = x0 + round(breedte * (k + 1) / stukken)
            uit.append((y0, y1, a, b))
    return uit


# ------------------------------------------------------------------ #
# Uitlijnen
# ------------------------------------------------------------------ #

def meet(frame):
    doos = frame.getbbox()
    if not doos:
        return None
    x0, y0, x1, y1 = doos
    alfa = np.array(frame.crop(doos))[..., 3].astype(np.float32)
    # zwaartepunt van het bovenlijf: de romp staat stil, de benen zwaaien
    boven = alfa[: max(1, int(alfa.shape[0] * 0.55))]
    kolomgewicht = boven.sum(axis=0)
    totaal = kolomgewicht.sum()
    midden = x0 + (np.arange(len(kolomgewicht)) * kolomgewicht).sum() / totaal if totaal else (x0 + x1) / 2
    return {"doos": doos, "romp": (y1 - y0) * 0.55, "midden": midden, "bodem": y1}


def lijn_uit(frames, marge=0.07):
    metingen = [meet(f) for f in frames]
    geldig = [m for m in metingen if m]
    if not geldig:
        return frames

    doelromp = float(np.median([m["romp"] for m in geldig]))
    schalen = [doelromp / m["romp"] for m in geldig]
    hoogtes = [(m["doos"][3] - m["doos"][1]) * s for m, s in zip(geldig, schalen)]
    breedtes = [(m["doos"][2] - m["doos"][0]) * s for m, s in zip(geldig, schalen)]

    H = int(max(hoogtes) * (1 + marge * 2))
    B = int(max(breedtes) * (1 + marge * 2))
    grondlijn = int(H * (1 - marge))

    uit = []
    for f, m in zip(frames, metingen):
        vel = Image.new("RGBA", (B, H), (0, 0, 0, 0))
        if m:
            s = doelromp / m["romp"]
            nieuw = f.resize((max(1, round(f.width * s)), max(1, round(f.height * s))), Image.LANCZOS)
            vel.alpha_composite(nieuw, (round(B / 2 - m["midden"] * s), round(grondlijn - m["bodem"] * s)))
        uit.append(vel)
    return uit


def ontdubbel(frames, drempel=6.0):
    """
    Gooi frames weg die nauwelijks van hun voorganger verschillen.

    Getekende vellen zitten vaak vol met bijna-duplicaten: acht vakjes gevuld
    met vijf werkelijk verschillende standen. Speel je dat af, dan lijkt het
    of de animatie om de zoveel tijd blijft haken -- twee frames staan stil,
    dan een grote sprong. Eruit halen maakt de pas gelijkmatiger, ook al zijn
    het er daarna minder.
    """
    if len(frames) < 4:
        return frames, []
    maat = frames[0].size
    vlakken = [np.asarray(f.resize(maat).getchannel("A"), dtype=np.float32) / 255 for f in frames]

    houden = [0]
    weg = []
    for i in range(1, len(frames)):
        verschil = float(np.abs(vlakken[i] - vlakken[houden[-1]]).mean()) * 100
        if verschil < drempel:
            weg.append(i + 1)
        else:
            houden.append(i)
    # de laatste mag ook niet op de eerste lijken, want het loopt rond
    if len(houden) > 3:
        rond = float(np.abs(vlakken[houden[-1]] - vlakken[houden[0]]).mean()) * 100
        if rond < drempel:
            weg.append(houden.pop() + 1)
    return [frames[i] for i in houden], weg


def strip(frames):
    B, H = frames[0].size
    vel = Image.new("RGBA", (B * len(frames), H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        vel.alpha_composite(f, (i * B, 0))
    return vel


def schrijf_gif(frames, pad, fps=12):
    plaatjes = []
    for f in frames:
        vlak = Image.new("RGBA", f.size, (13, 27, 76, 255))
        vlak.alpha_composite(f)
        plaatjes.append(vlak.convert("P", palette=Image.ADAPTIVE))
    plaatjes[0].save(pad, save_all=True, append_images=plaatjes[1:],
                     duration=round(1000 / fps), loop=0, disposal=2)


# ------------------------------------------------------------------ #

def karakter_van(bestandsnaam):
    laag = bestandsnaam.lower()
    for naam, sleutels in KARAKTERS.items():
        if naam == "caek" and any(s in laag for s in ("supercaek", "cupcaek")):
            continue
        if any(s in laag for s in sleutels):
            return naam
    return re.sub(r"[^a-z0-9]+", "", laag.split(".")[0]) or "onbekend"


def al_transparant(vel):
    """Heeft dit vel al een bruikbaar alfakanaal, of is het een plat plaatje?"""
    if vel.mode != "RGBA":
        return False
    a = np.asarray(vel.getchannel("A"))
    # een vel met echte transparantie heeft flink wat lege ruimte tussen de
    # figuren; een plat plaatje dat toevallig RGBA is, heeft die niet
    return float((a < 8).mean()) > 0.25


def verwerk(pad, naam, rijnamen, hoogte, fps, vlekdrempel, formaat, kwaliteit, gatgrens, ontdubbelen):
    vel = Image.open(pad)
    print(f"\n{os.path.basename(pad)} -> {naam}  ({vel.width}x{vel.height})")

    if al_transparant(vel):
        # Al uitgesneden aangeleverd. Niets meer aan doen: elke extra
        # bewerking kan alleen maar kapotmaken wat al klopt.
        schoon = vel.convert("RGBA")
        print("  vel is al transparant, achtergrond ongemoeid gelaten")
    else:
        schoon = snij_achtergrond(vel)
        schoon, weggegooid = gooi_vlekjes_weg(schoon, vlekdrempel)
        print(f"  achtergrond weg, {weggegooid} vlekjes opgeruimd (badges, kopjes, stippellijnen)")

    figuren = vind_figuren(schoon, vlekdrempel)
    rijen = cluster_rijen(figuren, len(rijnamen))
    print(f"  {len(figuren)} figuren gevonden, verdeeld over {len(rijen)} rijen")

    resultaat = {}
    for i, groep in enumerate(rijen):
        rijnaam = rijnamen[i] if i < len(rijnamen) else f"rij{i + 1}"
        groep = splits_brede(groep)
        # binnen een rij hebben alle frames dezelfde uitsnede in de hoogte,
        # anders verspringt de grondlijn tussen frames onderling
        yb = min(f[0] for f in groep)
        yo = max(f[1] for f in groep)
        frames = [schoon.crop((x0, yb, x1, yo)) for _, _, x0, x1 in groep]
        frames = [vul_glimlichten(f, gatgrens) for f in frames if f.getbbox()]
        if not frames:
            continue

        frames = lijn_uit(frames)
        if ontdubbelen > 0:
            frames, weg = ontdubbel(frames, ontdubbelen)
            if weg:
                print(f"    {rijnaam:9s} {len(weg)} bijna-duplicaat frames eruit: {weg}")
        if hoogte and frames[0].height != hoogte:
            s = hoogte / frames[0].height
            frames = [f.resize((max(1, round(f.width * s)), hoogte), Image.LANCZOS) for f in frames]

        os.makedirs(UIT, exist_ok=True)
        bestand = f"{naam}_{rijnaam}_{len(frames)}.{formaat}"
        vell = strip(frames)
        if formaat == "webp":
            vell.save(os.path.join(UIT, bestand), quality=kwaliteit, method=6)
        else:
            vell.save(os.path.join(UIT, bestand), optimize=True)
        schrijf_gif(frames, os.path.join(UIT, f"{naam}_{rijnaam}_preview.gif"), fps)

        kb = os.path.getsize(os.path.join(UIT, bestand)) / 1024
        print(f"    {rijnaam:9s} {len(frames):2d} frames  {frames[0].width}x{frames[0].height}  {kb:5.0f} kB  -> {bestand}")
        resultaat[rijnaam] = {
            "bestand": bestand,
            "frames": len(frames),
            "breedte": frames[0].width,
            "hoogte": frames[0].height,
        }
    return resultaat


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vel", action="append", help="één specifiek vel; standaard alles in assets/sprites/")
    ap.add_argument("--naam", help="karakternaam bij --vel")
    ap.add_argument("--rijen", default=",".join(RIJNAMEN))
    ap.add_argument("--hoogte", type=int, default=288, help="hoogte van één frame in de strip")
    ap.add_argument("--formaat", choices=["webp", "png"], default="webp")
    ap.add_argument("--kwaliteit", type=int, default=88)
    ap.add_argument("--ontdubbelen", type=float, default=6.0,
                    help="frames die minder dan dit percentage van hun voorganger verschillen gaan eruit (0 = uit)")
    ap.add_argument("--gatgrens", type=int, default=420,
                    help="ingesloten wit kleiner dan dit blijft staan (oogglimlicht); groter gaat eruit (ruimte tussen de benen)")
    ap.add_argument("--fps", type=int, default=12)
    ap.add_argument("--vlekdrempel", type=int, default=900, help="alles kleiner dan dit aantal pixels is een badge of een letter")
    args = ap.parse_args()

    rijnamen = [r.strip() for r in args.rijen.split(",") if r.strip()]

    if args.vel:
        vellen = args.vel
    else:
        alles = sorted(
            os.path.join(BRON, f) for f in os.listdir(BRON)
            if f.lower().endswith((".png", ".webp", ".jpg"))
        )
        # Staat er van hetzelfde karakter zowel een plat als een al
        # uitgesneden vel, dan wint het uitgesneden vel: dat is precies zoals
        # de tekenaar het bedoeld heeft.
        per_karakter = {}
        for pad in alles:
            k = karakter_van(os.path.basename(pad))
            transparant = "transparant" in os.path.basename(pad).lower()
            if k not in per_karakter or (transparant and not per_karakter[k][1]):
                per_karakter[k] = (pad, transparant)
        vellen = [v[0] for v in per_karakter.values()]
        overgeslagen = [os.path.basename(p) for p in alles if p not in vellen]
        if overgeslagen:
            print("overgeslagen (er is een transparante versie):", ", ".join(overgeslagen))
    if not vellen:
        print(f"geen vellen gevonden in {BRON}", file=sys.stderr)
        return 1

    manifest = {}
    for pad in vellen:
        naam = args.naam if (args.vel and args.naam) else karakter_van(os.path.basename(pad))
        manifest[naam] = verwerk(pad, naam, rijnamen, args.hoogte, args.fps, args.vlekdrempel,
                                 args.formaat, args.kwaliteit, args.gatgrens, args.ontdubbelen)

    os.makedirs(UIT, exist_ok=True)
    with open(os.path.join(UIT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\nmanifest: {os.path.relpath(os.path.join(UIT, 'manifest.json'), REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
