#!/usr/bin/env python3
"""
CAEK — kandidaat-stijlen genereren voor de zoeker.

Twee soorten:

  ablaties   dezelfde stijl met één ding uitgezet. Die zijn er niet om te
             winnen maar om te laten zien wát een ingreep oplevert; zonder
             ablatie weet je nooit of een verbetering ergens anders vandaan kwam.

  varianten  een gestratificeerde greep uit de parameterruimte. Geen volledig
             raster (dat kost honderden renders) maar een Latijns vierkant:
             elke parameter komt in elke band één keer voor.

Gebruik:
    python3 tools/stijlzoeker/kandidaten.py 16 > kandidaten.json
"""

import json
import random
import sys

# De middenwaarden waar we vanaf werken: de huidige STIJL.
BASIS = {
    'alfa': 1.0,
    'scherpte': 8.0,
    'korrel': 0.105,
    'warmte': 0.55,
    'vignet': 0.42,
    'belichting': 1.06,
    'streken': {
        'dekking': 0.94,
        'haren': 0.75,
        'hoogte': 1.0,
        'hoekRuis': 0.5,
        'randKrimp': 9.0,
        'anisotropie': 0.7,
        'basisHoogte': 0.3,
        'tintRuis': 0.035,
        'waardeRuis': 0.28,
        'kleurSpreiding': 1.0,
        'vonken': 0.6,
        'wervel': 0.85,
        'wervelSchaal': 3.2,
        'lagen': [
            {'lengte': 0.052, 'breedte': 0.018, 'dichtheid': 1.4, 'detail': 0},
            {'lengte': 0.024, 'breedte': 0.0078, 'dichtheid': 1.5, 'detail': 0.55},
            {'lengte': 0.011, 'breedte': 0.0034, 'dichtheid': 1.3, 'detail': 0.95},
        ],
    },
}

# (pad, min, max). Het pad is puntgescheiden; cijfers indexeren een lijst.
RUIMTE = [
    ('streken.tintRuis', 0.0, 0.09),
    ('streken.waardeRuis', 0.05, 0.6),
    ('streken.vonken', 0.0, 1.0),
    ('streken.kleurSpreiding', 0.0, 3.0),
    ('streken.wervel', 0.0, 1.0),
    ('streken.wervelSchaal', 1.5, 6.5),
    ('streken.dekking', 0.75, 1.0),
    ('streken.haren', 0.4, 1.0),
    ('streken.hoekRuis', 0.2, 1.0),
    ('streken.lagen.0.lengte', 0.032, 0.075),
    ('streken.lagen.0.breedte', 0.011, 0.026),
    ('streken.lagen.1.lengte', 0.016, 0.034),
    ('korrel', 0.05, 0.20),
    ('warmte', 0.3, 0.9),
]

ABLATIES = {
    'basis': {},
    'geen-kleurvariatie': {'streken': {'tintRuis': 0.0, 'waardeRuis': 0.0, 'kleurSpreiding': 0.0, 'vonken': 0.0}},
    'geen-wervel': {'streken': {'wervel': 0.0}},
    'geen-vonken': {'streken': {'vonken': 0.0}},
    'grove-halen': {'streken': {'lagen': [{'lengte': 0.075, 'breedte': 0.026}, {}, {'dichtheid': 0.6}]}},
}


def zet(doel, pad, waarde):
    delen = pad.split('.')
    for i, deel in enumerate(delen[:-1]):
        sleutel = int(deel) if deel.isdigit() else deel
        doel = doel[sleutel]
    laatste = delen[-1]
    doel[int(laatste) if laatste.isdigit() else laatste] = waarde


def diep_kopie(o):
    return json.loads(json.dumps(o))


def samenvoegen(doel, bron):
    for sleutel, waarde in bron.items():
        if isinstance(waarde, list):
            for i, item in enumerate(waarde):
                if isinstance(item, dict):
                    samenvoegen(doel[sleutel][i], item)
                else:
                    doel[sleutel][i] = item
        elif isinstance(waarde, dict):
            samenvoegen(doel.setdefault(sleutel, {}), waarde)
        else:
            doel[sleutel] = waarde


def main():
    aantal = int(sys.argv[1]) if len(sys.argv) > 1 else 16
    rng = random.Random(20260815)
    kandidaten = []

    # Ablaties moeten volledige stijlen zijn, niet losse overschrijvingen: de
    # renderbank voegt elke stijl samen met wat er al stond, dus een sparse
    # ablatie erft stiekem van de vorige kandidaat en meet dan niets.
    for naam, overschrijving in ABLATIES.items():
        stijl = diep_kopie(BASIS)
        samenvoegen(stijl, overschrijving)
        kandidaten.append({'id': f'a-{naam}', 'notitie': f'ablatie: {naam}', 'stijl': stijl})

    # Latijns vierkant: elke parameter krijgt elke band precies één keer.
    banden = {pad: rng.sample(range(aantal), aantal) for pad, _, _ in RUIMTE}
    for i in range(aantal):
        stijl = diep_kopie(BASIS)
        beschrijving = []
        for pad, laag, hoog in RUIMTE:
            band = banden[pad][i]
            t = (band + rng.random()) / aantal
            waarde = round(laag + t * (hoog - laag), 5)
            zet(stijl, pad, waarde)
            beschrijving.append(f'{pad.split(".")[-1]}={waarde}')
        kandidaten.append({
            'id': f'v{i:02d}',
            'notitie': ' '.join(beschrijving),
            'stijl': stijl,
        })

    json.dump(kandidaten, sys.stdout, indent=1)


if __name__ == '__main__':
    main()
