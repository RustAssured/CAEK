#!/usr/bin/env python3
"""
CAEK — contactvel van renders, zodat een beoordelaar ze náást elkaar ziet.

Een vision-model geeft onbetrouwbare absolute cijfers maar rangschikt prima.
Daarvoor moeten de kandidaten wel in één beeld staan; los na elkaar bekeken
verschuift het oordeel met elk plaatje.

Gebruik:
    python3 contactvel.py rendermap uitsnede uit.png [kolommen] [tegelbreedte]
"""

import glob
import os
import sys

from PIL import Image, ImageDraw

ACHTERGROND = (14, 20, 44)
LABEL = (255, 216, 115)


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    rendermap, uitsnede, uitpad = sys.argv[1:4]
    kolommen = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    tegelbreedte = int(sys.argv[5]) if len(sys.argv) > 5 else 400

    paden = sorted(glob.glob(os.path.join(rendermap, f'*__{uitsnede}.png')))
    if not paden:
        print(f'geen renders voor uitsnede {uitsnede} in {rendermap}')
        return 1

    proef = Image.open(paden[0])
    tegelhoogte = round(tegelbreedte * proef.height / proef.width)
    balk = 26
    rijen = (len(paden) + kolommen - 1) // kolommen

    vel = Image.new('RGB', (kolommen * tegelbreedte, rijen * (tegelhoogte + balk)), ACHTERGROND)
    tekenaar = ImageDraw.Draw(vel)

    for i, pad in enumerate(paden):
        naam = os.path.basename(pad).split('__')[0]
        img = Image.open(pad).convert('RGB').resize((tegelbreedte, tegelhoogte), Image.LANCZOS)
        x = (i % kolommen) * tegelbreedte
        y = (i // kolommen) * (tegelhoogte + balk)
        vel.paste(img, (x, y + balk))
        tekenaar.text((x + 8, y + 6), naam, fill=LABEL)
        tekenaar.rectangle([x, y, x + tegelbreedte - 1, y + balk + tegelhoogte - 1], outline=(40, 60, 120))

    vel.save(uitpad)
    print(f'{uitpad}: {len(paden)} tegels, {vel.width}x{vel.height}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
