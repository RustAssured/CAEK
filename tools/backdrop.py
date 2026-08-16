#!/usr/bin/env python3
"""
Maakt van de geschilderde platen tegelbare parallaxlagen.

Wat er binnenkomt: drie brede olieverfplaten. De verste is dekkend (lucht,
heuvels, water). De twee ervoor staan op vlak magenta, want beeldgeneratoren
leveren geen alfakanaal en magenta komt in een nachtelijk Van Gogh-palet
verder nergens voor.

Wat eruit komt: dezelfde platen met een alfakanaal, met de linker- en
rechterrand in elkaar overvloeiend zodat ze naadloos kunnen herhalen, geschaald
en als WebP weggeschreven.

Over die naad: een beeldgenerator maakt niet echt tegelbaar werk, hoe vaak je
het ook vraagt. Daarom wordt de rechterrand hier over de linker heen gevloeid.
Bij olieverf met veel textuur valt dat niet op -- het wordt hooguit een iets
drukker stukje doek. Bij strakke horizontale lijnen zou het wel opvallen, maar
die zitten er niet in.

Gebruik:
    python3 tools/backdrop.py
    python3 tools/backdrop.py --naad 0.14 --breedte 2048
"""

import argparse
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRON = os.path.join(REPO, "assets")
UIT = os.path.join(REPO, "web", "assets", "achtergrond")

try:
    import numpy as np
    from PIL import Image
except ImportError as fout:
    print(f"nodig: pillow, numpy ({fout})", file=sys.stderr)
    raise SystemExit(1)


LAGEN = ["ver", "midden", "dichtbij"]


def snij_magenta(vel, tolerantie=70, zacht=45):
    """
    Vlak magenta eruit, met een zachte rand en zonder roze halo.

    Magenta is rood en blauw hoog, groen laag. Hoe verder een pixel van dat
    patroon af zit, hoe meer hij bij de tekening hoort. De randpixels zijn een
    mengsel van tekening en magenta; die worden teruggerekend naar hun eigen
    kleur, anders krijg je een roze gloed rond elk dak.
    """
    arr = np.asarray(vel.convert("RGB"), dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # hoe magenta is deze pixel: rood en blauw hoog, groen laag
    magenta = np.minimum(r, b) - g
    alfa = np.clip((tolerantie - magenta) / max(zacht, 1), 0.0, 1.0)

    grond = np.array([255.0, 0.0, 255.0])
    veilig = np.maximum(alfa, 0.3)[..., None]
    ontmengd = np.clip((arr - (1.0 - alfa[..., None]) * grond) / veilig, 0, 255)
    kleur = np.where(alfa[..., None] > 0.0, ontmengd, arr)

    return Image.fromarray(np.dstack([kleur, alfa * 255.0]).astype(np.uint8), "RGBA")


def heeft_magenta(vel):
    arr = np.asarray(vel.convert("RGB"), dtype=np.float32)
    magenta = np.minimum(arr[..., 0], arr[..., 2]) - arr[..., 1]
    return float((magenta > 120).mean()) > 0.03


def maak_naadloos(vel, deel=0.12):
    """
    Vloei de rechterrand over de linker, zodat de plaat op zichzelf aansluit.

    De plaat wordt smaller: het overlappende stuk telt maar één keer mee.
    """
    arr = np.asarray(vel, dtype=np.float32)
    h, b = arr.shape[:2]
    n = max(2, int(b * deel))
    if n * 2 >= b:
        return vel

    kern = arr[:, : b - n].copy()
    staart = arr[:, b - n:]
    # De staart wordt over de kop gevloeid, en wel zo dat de nieuwe linkerrand
    # de kolom is die in het origineel direct naast de nieuwe rechterrand lag.
    # Dan sluiten ze per definitie aan. Andersom om -- wat ik eerst deed --
    # maakt de naad juist erger.
    weging = np.linspace(0.0, 1.0, n, dtype=np.float32)[None, :, None]
    kern[:, :n] = kern[:, :n] * weging + staart * (1.0 - weging)
    return Image.fromarray(np.clip(kern, 0, 255).astype(np.uint8), "RGBA")


def naar_detailkaart(vel, sterkte=0.5, midden=0.88):
    """
    Maak van een geschilderd oppervlak een kaart die kleur moduleert.

    De blokplaat gaat naar honderden dozen die elk hun eigen kleur hebben --
    goud, groen, rood. Zou je de plaat rechtstreeks als textuur gebruiken, dan
    werd alles blauw pleisterwerk en was de kleurcodering weg. Als grijswaarde
    rond middengrijs vermenigvuldigt hij juist met die kleur: het blok houdt
    zijn kleur en krijgt er penseelwerk bij.
    """
    arr = np.asarray(vel.convert("RGB"), dtype=np.float32) / 255
    grijs = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # Rond 0.88 en niet rond 0.5: deze kaart wordt vermenigvuldigd met de
    # kleur van het materiaal, en middengrijs zou alles halveren. Nu wordt
    # het penseelwerk zichtbaar zonder dat de hele wereld donkerder wordt.
    grijs = midden + (grijs - float(grijs.mean())) * sterkte
    grijs = np.clip(grijs, 0.55, 1.0) * 255
    uit = np.dstack([grijs, grijs, grijs, np.asarray(vel.convert("RGBA"))[..., 3]])
    return Image.fromarray(uit.astype(np.uint8), "RGBA")


def naadfout(vel):
    """Hoe erg botst de linkerrand met de rechter? Puur ter informatie."""
    arr = np.asarray(vel, dtype=np.float32)
    return float(np.abs(arr[:, 0] - arr[:, -1]).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--naad", type=float, default=0.12, help="hoeveel van de breedte overvloeit (0 = niet)")
    ap.add_argument("--breedte", type=int, default=2048, help="maximale breedte van de uitvoer")
    ap.add_argument("--kwaliteit", type=int, default=90)
    ap.add_argument("--lagen", default=",".join(LAGEN))
    ap.add_argument("--bestand", help="losse plaat verwerken in plaats van de vaste lagen")
    ap.add_argument("--naam", help="uitvoernaam bij --bestand")
    ap.add_argument("--uit", help="uitvoermap (standaard web/assets/achtergrond)")
    ap.add_argument("--grijs", action="store_true",
                    help="omzetten naar een grijze detailkaart rond middengrijs, zodat hij de kleur van het materiaal moduleert in plaats van vervangt")
    args = ap.parse_args()

    uitmap = os.path.join(REPO, args.uit) if args.uit else UIT
    os.makedirs(uitmap, exist_ok=True)

    manifestpad = os.path.join(uitmap, "manifest.json")
    manifest = {}
    if os.path.exists(manifestpad):
        with open(manifestpad, encoding="utf-8") as f:
            manifest = json.load(f)

    if args.bestand:
        opdrachten = [(args.naam or os.path.splitext(os.path.basename(args.bestand))[0],
                       os.path.join(REPO, args.bestand))]
    else:
        opdrachten = [(n.strip(), os.path.join(BRON, f"{n.strip()}.png"))
                      for n in args.lagen.split(",") if n.strip()]

    for naam, bron in opdrachten:
        if not os.path.exists(bron):
            print(f"  {naam}: geen {os.path.relpath(bron, REPO)} gevonden, overgeslagen")
            continue

        vel = Image.open(bron)
        print(f"\n{naam}.png  {vel.width}x{vel.height}  {vel.mode}")

        if heeft_magenta(vel):
            vel = snij_magenta(vel)
            dekking = float(np.asarray(vel)[..., 3].mean()) / 255
            print(f"  magenta weggesneden, {dekking * 100:.0f}% van het beeld is beschilderd")
        else:
            vel = vel.convert("RGBA")
            print("  geen magenta gevonden, plaat blijft dekkend")

        if args.grijs:
            vel = naar_detailkaart(vel)
            print("  omgezet naar detailkaart rond middengrijs")

        voor = naadfout(vel)
        if args.naad > 0:
            vel = maak_naadloos(vel, args.naad)
            print(f"  naad gevloeid over {args.naad * 100:.0f}%: verschil {voor:.0f} -> {naadfout(vel):.0f}")

        if vel.width > args.breedte:
            h = round(vel.height * args.breedte / vel.width)
            vel = vel.resize((args.breedte, h), Image.LANCZOS)

        bestand = f"{naam}.webp"
        vel.save(os.path.join(uitmap, bestand), quality=args.kwaliteit, method=6)
        kb = os.path.getsize(os.path.join(uitmap, bestand)) / 1024
        print(f"  -> {bestand}  {vel.width}x{vel.height}  {kb:.0f} kB")
        manifest[naam] = {"bestand": bestand, "breedte": vel.width, "hoogte": vel.height}

    with open(manifestpad, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nmanifest: {os.path.relpath(manifestpad, REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
