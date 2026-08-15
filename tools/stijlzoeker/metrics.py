#!/usr/bin/env python3
"""
CAEK — beeldstatistieken om verfstijl mee te meten.

Waarom niet gewoon een model laten kijken en een cijfer laten geven? Omdat dat
ruist. Een vision-model ziet betrouwbaar dat streken "te klein" zijn, maar niet
het verschil tussen 0,048 en 0,052 — en een zoeklus die op ruis stuurt jaagt
uren achter niets aan. Deze getallen zijn stabiel en goedkoop, en vangen
verrassend veel van wat "ziet eruit als olieverf" eigenlijk is:

    streekschaal    radiaal gemiddeld spectrum: hoe groot zijn de vlekken
    samenhang       verdeling van de anisotropie: hoe gericht is het penseel
    kleur           tintverdeling, verzadiging, en hoe sterk kleur lokaal varieert
    relief          hoogfrequente energie op twee schalen
    randen          gemiddelde en piek van de gradiënt

Een model beoordeelt daarna wat getallen níet kunnen: leest dit als Van Gogh,
en leest het nog steeds als CAEK.

Gebruik:
    python3 metrics.py leer  referentie/*.png  -> doelprofiel.json
    python3 metrics.py meet  render.png                 -> profiel als JSON
    python3 metrics.py scoor doelprofiel.json render/*.png
"""

import glob
import json
import math
import sys

import numpy as np
from PIL import Image

# Hoeveel elke groep meetelt in de afstand. Streekschaal weegt het zwaarst:
# dat is het eerste wat je ziet en het minst afhankelijk van wat er ís afgebeeld.
GEWICHTEN = {
    'streekschaal': 0.34,
    'samenhang': 0.20,
    'kleurvariatie': 0.18,
    'kleur': 0.12,
    'relief': 0.10,
    'randen': 0.06,
}

MAAT = 512   # alles op gelijke hoogte brengen, anders meet je resolutie


def laad(pad):
    img = Image.open(pad).convert('RGB')
    schaal = MAAT / img.height
    img = img.resize((max(1, round(img.width * schaal)), MAAT), Image.LANCZOS)
    # midden uitsnijden op 1:1, zodat brede en smalle bronnen vergelijkbaar zijn
    b = img.width
    if b > MAAT:
        links = (b - MAAT) // 2
        img = img.crop((links, 0, links + MAAT, MAAT))
    a = np.asarray(img, dtype=np.float64) / 255.0
    return a


def luminantie(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def gauss(a, sigma):
    """Separabele gaussian zonder scipy."""
    straal = max(1, int(sigma * 3))
    x = np.arange(-straal, straal + 1)
    k = np.exp(-(x ** 2) / (2 * sigma * sigma))
    k /= k.sum()
    uit = np.apply_along_axis(lambda r: np.convolve(r, k, mode='same'), 1, a)
    uit = np.apply_along_axis(lambda c: np.convolve(c, k, mode='same'), 0, uit)
    return uit


def streekschaal(l):
    """Radiaal gemiddeld vermogensspectrum, in acht logaritmische banden.

    Grote strepen zetten energie in de lage frequenties, fijne dabs in de hoge.
    Genormaliseerd op de som, zodat helderheid en contrast er niet in lekken."""
    f = np.fft.fftshift(np.abs(np.fft.fft2(l - l.mean())) ** 2)
    h, w = f.shape
    y, x = np.indices((h, w))
    r = np.hypot(y - h / 2, x - w / 2)
    maxr = min(h, w) / 2
    randen = np.geomspace(2.0, maxr, 9)
    banden = []
    for i in range(8):
        masker = (r >= randen[i]) & (r < randen[i + 1])
        banden.append(f[masker].sum())
    banden = np.array(banden)
    som = banden.sum()
    return banden / som if som > 0 else banden


def tensor(l):
    gy, gx = np.gradient(l)
    E = gauss(gx * gx, 2.0)
    F = gauss(gx * gy, 2.0)
    G = gauss(gy * gy, 2.0)
    disc = np.sqrt(np.maximum((E - G) ** 2 + 4 * F * F, 0))
    l1 = 0.5 * (E + G + disc)
    l2 = 0.5 * (E + G - disc)
    noemer = l1 + l2
    anis = np.where(noemer > 1e-9, (l1 - l2) / np.maximum(noemer, 1e-9), 0.0)
    return anis, np.sqrt(np.maximum(l1, 0))


def samenhang(anis):
    """Verdeling van de anisotropie: een geschilderd doek heeft overal richting,
    een gladde render heeft dat alleen op de randen."""
    hist, _ = np.histogram(anis, bins=8, range=(0, 1))
    hist = hist / hist.sum()
    return np.append(hist, anis.mean())


def kleurprofiel(a):
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    v = mx
    s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)

    # tint via de standaardformule, zonder colorsys per pixel
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.select(
        [mx == r, mx == g, mx == b],
        [((g - b) / d) % 6, (b - r) / d + 2, (r - g) / d + 4],
        default=0.0,
    ) / 6.0
    gewicht = s * v
    hist, _ = np.histogram(h, bins=12, range=(0, 1), weights=gewicht)
    som = hist.sum()
    hist = hist / som if som > 0 else hist
    return np.concatenate([hist, [s.mean(), s.std(), v.mean(), v.std()]])


def kleurvariatie(a):
    """Hoe sterk varieert kleur *binnen* een klein gebied.

    Dit is het getal dat vlak-en-plastic van geschilderd onderscheidt: Van Gogh
    legt naast elkaar liggende halen in verschillende tinten neer, dus ook een
    ogenschijnlijk egale lucht heeft flinke lokale spreiding."""
    uit = []
    for sigma in (2.0, 5.0):
        lokaal_gem = np.stack([gauss(a[..., k], sigma) for k in range(3)], axis=2)
        verschil = a - lokaal_gem
        uit.append(np.sqrt((verschil ** 2).sum(axis=2)).mean())
        uit.append(np.abs(verschil).max(axis=2).mean())
    return np.array(uit)


def relief(l):
    uit = []
    for sigma in (1.5, 4.0):
        hoog = l - gauss(l, sigma)
        uit.append(hoog.std())
        uit.append(np.abs(hoog).mean())
    return np.array(uit)


def randen(kracht):
    p = np.percentile(kracht, [50, 90, 99])
    return np.array([kracht.mean(), *p])


def profiel(pad):
    a = laad(pad)
    l = luminantie(a)
    anis, kracht = tensor(l)
    return {
        'streekschaal': streekschaal(l).tolist(),
        'samenhang': samenhang(anis).tolist(),
        'kleur': kleurprofiel(a).tolist(),
        'kleurvariatie': kleurvariatie(a).tolist(),
        'relief': relief(l).tolist(),
        'randen': randen(kracht).tolist(),
    }


def gemiddeld(profielen):
    uit = {}
    spreiding = {}
    for sleutel in profielen[0]:
        stapel = np.array([np.array(p[sleutel]) for p in profielen])
        uit[sleutel] = stapel.mean(axis=0).tolist()
        spreiding[sleutel] = stapel.std(axis=0).tolist()
    return uit, spreiding


def afstand(doel, meting, spreiding=None):
    """Gewogen afstand per groep. Waar de referenties het onderling oneens zijn
    (grote spreiding) telt een afwijking minder zwaar — dan is het geen stijl
    maar toeval."""
    per_groep = {}
    totaal = 0.0
    for sleutel, gewicht in GEWICHTEN.items():
        d = np.array(doel[sleutel])
        m = np.array(meting[sleutel])
        schaal = np.maximum(np.abs(d), 1e-3)
        if spreiding is not None:
            schaal = np.maximum(schaal, np.array(spreiding[sleutel]))
        fout = float(np.sqrt((((m - d) / schaal) ** 2).mean()))
        per_groep[sleutel] = round(fout, 4)
        totaal += gewicht * fout
    return round(totaal, 4), per_groep


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    modus = sys.argv[1]
    paden = []
    for arg in sys.argv[2:]:
        paden.extend(sorted(glob.glob(arg)) or [arg])

    if modus == 'leer':
        profielen = [profiel(p) for p in paden]
        doel, spreiding = gemiddeld(profielen)
        uit = {'doel': doel, 'spreiding': spreiding, 'bronnen': paden}
        print(json.dumps(uit, indent=1))
        return 0

    if modus == 'meet':
        print(json.dumps(profiel(paden[0]), indent=1))
        return 0

    if modus == 'scoor':
        doelbestand = json.load(open(paden[0]))
        doel = doelbestand['doel']
        spreiding = doelbestand.get('spreiding')
        resultaten = []
        for pad in paden[1:]:
            totaal, per_groep = afstand(doel, profiel(pad), spreiding)
            resultaten.append({'bestand': pad, 'afstand': totaal, 'per_groep': per_groep})
        resultaten.sort(key=lambda r: r['afstand'])
        print(json.dumps(resultaten, indent=1))
        return 0

    print(f'onbekende modus: {modus}')
    return 1


if __name__ == '__main__':
    sys.exit(main())
