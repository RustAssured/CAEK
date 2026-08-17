#!/usr/bin/env python3
"""
Maakt een GLB lichter door de ingebakken texturen te verkleinen.

Waarom dit een eigen tooltje is: een modelleerpakket exporteert graag een
2048x2048 JPEG op kwaliteit 95, en dat is voor één prop in een sidescroller
vier en een halve megabyte die de speler eerst moet downloaden voordat er
iets beweegt. Op de schaal waarop het ding in beeld staat -- een oven van
tweehonderd pixels hoog -- is 1024 al ruim, en met de olieverf eroverheen
merk je het verschil helemaal niet.

De GLB wordt opnieuw opgebouwd in plaats van gepatcht: alle bufferViews
worden in volgorde opnieuw weggeschreven met bijgewerkte offsets. Dat is
langer dan een gat in de buffer laten vallen, maar het levert een bestand op
dat elke loader accepteert.

Gebruik:
    python3 tools/glbslank.py assets/oven3d.glb web/assets/oven3d.glb
    python3 tools/glbslank.py in.glb uit.glb --maat 768 --kwaliteit 78
"""

import argparse
import io
import json
import os
import struct
import sys

try:
    from PIL import Image
except ImportError as fout:
    print(f"nodig: pillow ({fout})", file=sys.stderr)
    raise SystemExit(1)

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def lees(pad):
    rauw = open(pad, "rb").read()
    magie, _versie, _lengte = struct.unpack_from("<4sII", rauw, 0)
    if magie != b"glTF":
        raise SystemExit(f"{pad} is geen GLB")
    js, binair = None, b""
    off = 12
    while off < len(rauw):
        lengte, soort = struct.unpack_from("<II", rauw, off)
        blok = rauw[off + 8: off + 8 + lengte]
        if soort == JSON_CHUNK:
            js = json.loads(blok)
        elif soort == BIN_CHUNK:
            binair = blok
        off += 8 + lengte + (-lengte % 4)
    return js, binair


def vul(blok, teken=b"\x00"):
    return blok + teken * (-len(blok) % 4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bron")
    ap.add_argument("doel")
    ap.add_argument("--maat", type=int, default=1024, help="langste zijde van een textuur")
    ap.add_argument("--kwaliteit", type=int, default=82)
    args = ap.parse_args()

    js, binair = lees(args.bron)
    views = js.get("bufferViews", [])

    # welke bufferViews zijn een plaatje, en wat komt er nieuw voor in de plaats
    vervanging = {}
    for beeld in js.get("images", []):
        idx = beeld.get("bufferView")
        if idx is None:
            continue
        v = views[idx]
        start = v.get("byteOffset", 0)
        origineel = binair[start: start + v["byteLength"]]
        plaat = Image.open(io.BytesIO(origineel))
        was = plaat.size
        if max(plaat.size) > args.maat:
            f = args.maat / max(plaat.size)
            plaat = plaat.resize((max(1, round(plaat.width * f)), max(1, round(plaat.height * f))), Image.LANCZOS)
        buf = io.BytesIO()
        if plaat.mode in ("RGBA", "LA", "P"):
            plaat.convert("RGBA").save(buf, "PNG", optimize=True)
            mime = "image/png"
        else:
            plaat.convert("RGB").save(buf, "JPEG", quality=args.kwaliteit, optimize=True, progressive=True)
            mime = "image/jpeg"
        vervanging[idx] = (buf.getvalue(), mime)
        beeld["mimeType"] = mime
        print(f"  {beeld.get('name', idx)}: {was[0]}x{was[1]} {len(origineel)//1024} kB"
              f" -> {plaat.width}x{plaat.height} {len(buf.getvalue())//1024} kB")

    # buffer opnieuw opbouwen, views in volgorde
    nieuw = bytearray()
    for i, v in enumerate(views):
        if i in vervanging:
            data = vervanging[i][0]
        else:
            start = v.get("byteOffset", 0)
            data = binair[start: start + v["byteLength"]]
        # accessors rekenen vanaf byteOffset binnen de view, dus de uitlijning
        # van de view zelf moet blijven kloppen: vier bytes is genoeg voor
        # elk gltf-componenttype
        opvulling = -len(nieuw) % 4
        nieuw += b"\x00" * opvulling
        v["byteOffset"] = len(nieuw)
        v["byteLength"] = len(data)
        nieuw += data

    js["buffers"] = [{"byteLength": len(nieuw)}]

    jsblok = vul(json.dumps(js, separators=(",", ":")).encode("utf-8"), b" ")
    binblok = vul(bytes(nieuw))
    totaal = 12 + 8 + len(jsblok) + 8 + len(binblok)
    uit = bytearray()
    uit += struct.pack("<4sII", b"glTF", 2, totaal)
    uit += struct.pack("<II", len(jsblok), JSON_CHUNK) + jsblok
    uit += struct.pack("<II", len(binblok), BIN_CHUNK) + binblok

    os.makedirs(os.path.dirname(os.path.abspath(args.doel)), exist_ok=True)
    open(args.doel, "wb").write(bytes(uit))
    print(f"{args.bron} {os.path.getsize(args.bron)//1024} kB"
          f" -> {args.doel} {os.path.getsize(args.doel)//1024} kB")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
