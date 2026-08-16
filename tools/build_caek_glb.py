#!/usr/bin/env python3
"""
Bouwt één web-klare caek.glb uit de losse export-bestanden in assets/.

De vijf bron-GLB's bevatten allemaal dezelfde mesh, hetzelfde skelet en
dezelfde 2048x2048 texture -- alleen de animatie verschilt. Vijf keer
downloaden is 38 MB. Dit script neemt CAEK_idle.glb als basis, plakt de
animatieclips uit de andere bestanden erin (kanalen worden op botnaam
gehermapt, niet op index), schaalt de texture terug en schrijft één GLB.

Gebruik:
    python3 tools/build_caek_glb.py
    python3 tools/build_caek_glb.py --texture 2048 --format png

Uitvoer: web/assets/caek.glb
"""

import argparse
import io
import json
import os
import struct
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "assets")
OUT = os.path.join(REPO, "web", "assets", "caek.glb")

# Per karakter: bronbestand -> clipnaam die de game gebruikt.
# Het eerste bestand levert mesh, skelet en texture; de rest alleen animatie.
KARAKTERS = {
    "caek": {
        "uit": "caek.glb",
        "clips": [
            ("CAEK_idle.glb", "idle"),
            ("CAEK_lopen.glb", "lopen"),
            ("CAEK_rennen.glb", "rennen"),
            ("CAEK_spring.glb", "springen"),
            ("CAEK_rig.glb", "bind"),
        ],
    },
    # SuperCaek deelt het skelet van Caek (zelfde 24 joints, zelfde namen),
    # dus hij heeft aan zijn eigen renclip genoeg — de rest leent hij van Caek
    # op de AnimationMixer. Eén los model, geen dubbele animaties nodig.
    "supercaek": {
        "uit": "supercaek.glb",
        "clips": [("Supercaek_run.glb", "rennen")],
    },
    # Cupcaek deelt hetzelfde skelet als Caek en SuperCaek. Ze heeft idle en
    # lopen; rennen en springen kan ze desgewenst van Caek lenen.
    "cupcaek": {
        "uit": "cupcaek.glb",
        "clips": [
            ("Cupcaek_idle.glb", "idle"),
            ("cupcaek_loop.glb", "lopen"),
        ],
    },
}

GLB_MAGIC = 0x46546C67
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942


def read_glb(path):
    with open(path, "rb") as f:
        magic, version, _length = struct.unpack("<III", f.read(12))
        if magic != GLB_MAGIC:
            raise ValueError(f"{path} is geen GLB")
        if version != 2:
            raise ValueError(f"{path}: GLB versie {version} wordt niet ondersteund")
        gltf, binary = None, b""
        while True:
            header = f.read(8)
            if len(header) < 8:
                break
            clen, ctype = struct.unpack("<II", header)
            chunk = f.read(clen)
            if ctype == CHUNK_JSON:
                gltf = json.loads(chunk.decode("utf-8"))
            elif ctype == CHUNK_BIN:
                binary = chunk
        if gltf is None:
            raise ValueError(f"{path} mist een JSON-chunk")
        return gltf, binary


def view_bytes(gltf, binary, index):
    bv = gltf["bufferViews"][index]
    start = bv.get("byteOffset", 0)
    return binary[start : start + bv["byteLength"]]


def pad4(n):
    return (4 - n % 4) % 4


class BufferBuilder:
    """Verzamelt bufferViews in één nieuwe binaire blob, 4-byte uitgelijnd."""

    def __init__(self):
        self.chunks = []
        self.length = 0
        self.views = []

    def add(self, data, template=None):
        self.length += pad4(self.length)
        offset = self.length
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if template and "byteStride" in template:
            view["byteStride"] = template["byteStride"]
        if template and "target" in template:
            view["target"] = template["target"]
        if template and "name" in template:
            view["name"] = template["name"]
        self.chunks.append((offset, data))
        self.length += len(data)
        self.views.append(view)
        return len(self.views) - 1

    def build(self):
        blob = bytearray(self.length + pad4(self.length))
        for offset, data in self.chunks:
            blob[offset : offset + len(data)] = data
        return bytes(blob)


def resize_texture(png_bytes, size, fmt, quality):
    try:
        from PIL import Image
    except ImportError:
        print("  ! Pillow niet gevonden - texture blijft op originele grootte", file=sys.stderr)
        return png_bytes, "image/png"

    img = Image.open(io.BytesIO(png_bytes))
    if size and size < max(img.size):
        scale = size / max(img.size)
        target = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
        img = img.resize(target, Image.LANCZOS)

    out = io.BytesIO()
    if fmt == "jpeg":
        img.convert("RGB").save(out, "JPEG", quality=quality, optimize=True, progressive=True)
        return out.getvalue(), "image/jpeg"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out.getvalue(), "image/png"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--texture", type=int, default=1024, help="max texture-formaat in pixels (0 = niet schalen)")
    ap.add_argument("--format", choices=["jpeg", "png"], default="jpeg")
    ap.add_argument("--quality", type=int, default=88)
    ap.add_argument("--karakter", choices=sorted(KARAKTERS), default="caek")
    ap.add_argument("--out")
    args = ap.parse_args()

    karakter = KARAKTERS[args.karakter]
    CLIPS = karakter["clips"]
    uitpad = args.out or os.path.join(REPO, "web", "assets", karakter["uit"])

    ontbreekt = [f for f, _ in CLIPS if not os.path.exists(os.path.join(SRC, f))]
    if ontbreekt:
        print(f"ontbrekende bronbestanden: {', '.join(ontbreekt)}", file=sys.stderr)
        return 1
    leeg = [f for f, _ in CLIPS if os.path.getsize(os.path.join(SRC, f)) < 1024]
    if leeg:
        print(f"deze bestanden zijn (bijna) leeg, upload mislukt?: {', '.join(leeg)}", file=sys.stderr)
        return 1

    base, base_bin = read_glb(os.path.join(SRC, CLIPS[0][0]))
    joint_names = [n.get("name") for n in base["nodes"]]
    print(f"basis: {CLIPS[0][0]} ({len(base['nodes'])} nodes, {len(joint_names)} namen)")

    builder = BufferBuilder()

    # 1. alle bestaande bufferViews overzetten; de texture-view krijgt nieuwe bytes
    image = base["images"][0]
    image_view = image["bufferView"]
    remap = {}
    for i, bv in enumerate(base["bufferViews"]):
        data = view_bytes(base, base_bin, i)
        if i == image_view:
            before = len(data)
            data, mime = resize_texture(data, args.texture, args.format, args.quality)
            image["mimeType"] = mime
            print(f"texture: {before/1e6:.1f} MB -> {len(data)/1e6:.2f} MB ({mime})")
        remap[i] = builder.add(data, template=bv)

    for acc in base["accessors"]:
        if "bufferView" in acc:
            acc["bufferView"] = remap[acc["bufferView"]]
        for sparse_key in ("sparse",):
            if sparse_key in acc:
                raise ValueError("sparse accessors worden niet ondersteund")
    image["bufferView"] = remap[image_view]

    # 2. animaties: die van de basis hernoemen, de rest erbij plakken
    base["animations"][0]["name"] = CLIPS[0][1]
    for anim in base["animations"]:
        for sampler in anim["samplers"]:
            pass  # accessors zijn hierboven al geremapt

    for filename, clip_name in CLIPS[1:]:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print(f"  ! {filename} ontbreekt - overgeslagen", file=sys.stderr)
            continue
        src, src_bin = read_glb(path)
        src_names = [n.get("name") for n in src["nodes"]]

        acc_remap = {}

        def copy_accessor(index):
            if index in acc_remap:
                return acc_remap[index]
            acc = dict(src["accessors"][index])
            data = view_bytes(src, src_bin, acc["bufferView"])
            offset = acc.pop("byteOffset", 0)
            # accessor-offset in de view opnemen zodat de nieuwe view op 0 begint
            comp_size = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[acc["componentType"]]
            n_comp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[acc["type"]]
            span = comp_size * n_comp * acc["count"]
            acc["bufferView"] = builder.add(data[offset : offset + span])
            acc_remap[index] = len(base["accessors"])
            base["accessors"].append(acc)
            return acc_remap[index]

        clip = {"name": clip_name, "samplers": [], "channels": []}
        for sampler in src["animations"][0]["samplers"]:
            clip["samplers"].append(
                {
                    "input": copy_accessor(sampler["input"]),
                    "output": copy_accessor(sampler["output"]),
                    "interpolation": sampler.get("interpolation", "LINEAR"),
                }
            )
        dropped = 0
        for channel in src["animations"][0]["channels"]:
            target = dict(channel["target"])
            node_name = src_names[target["node"]]
            if node_name not in joint_names:
                dropped += 1
                continue
            target["node"] = joint_names.index(node_name)
            clip["channels"].append({"sampler": channel["sampler"], "target": target})
        base["animations"].append(clip)
        note = f", {dropped} kanalen zonder match" if dropped else ""
        print(f"clip '{clip_name}': {len(clip['channels'])} kanalen uit {filename}{note}")

    # 3. schrijven
    base["bufferViews"] = builder.views
    blob = builder.build()
    base["buffers"] = [{"byteLength": len(blob)}]
    base.setdefault("asset", {})["generator"] = "CAEK build_caek_glb.py"

    json_chunk = json.dumps(base, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * pad4(len(json_chunk))

    total = 12 + 8 + len(json_chunk) + 8 + len(blob)
    os.makedirs(os.path.dirname(uitpad), exist_ok=True)
    with open(uitpad, "wb") as f:
        f.write(struct.pack("<III", GLB_MAGIC, 2, total))
        f.write(struct.pack("<II", len(json_chunk), CHUNK_JSON))
        f.write(json_chunk)
        f.write(struct.pack("<II", len(blob), CHUNK_BIN))
        f.write(blob)

    src_total = sum(os.path.getsize(os.path.join(SRC, f)) for f, _ in CLIPS if os.path.exists(os.path.join(SRC, f)))
    print(f"\n{os.path.relpath(uitpad, REPO)}: {total/1e6:.2f} MB (bron: {src_total/1e6:.1f} MB)")
    print("clips:", ", ".join(a["name"] for a in base["animations"]))
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
