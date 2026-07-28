#!/usr/bin/env python3
"""Invisible forensic watermark (Webtoon / Toon Radar style).

Embeds a compact viewer payload into image pixels via repeated LSB encoding
on the blue channel. Designed so screenshots of the displayed preview still
carry the viewer identity for leak tracing.

Usage:
  embed:  forensic_watermark.py embed --input in.jpg --output out.jpg --payload-b64 ...
  extract: forensic_watermark.py extract --input leak.jpg
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path

from PIL import Image

MAGIC = b"MIAF"
VERSION = 1
REDUNDANCY = 8
HEADER_BITS_HINT = 64  # used only for progress; payload length is fixed by format


def bits_from_bytes(data: bytes):
    for byte in data:
        for shift in range(7, -1, -1):
            yield (byte >> shift) & 1


def bytes_from_bits(bits):
    out = bytearray()
    current = 0
    count = 0
    for bit in bits:
        current = (current << 1) | (bit & 1)
        count += 1
        if count == 8:
            out.append(current)
            current = 0
            count = 0
    return bytes(out)


def expand_bits(bits, redundancy: int = REDUNDANCY):
    for bit in bits:
        for _ in range(redundancy):
            yield bit


def majority_collapse(bits, redundancy: int = REDUNDANCY):
    chunk = []
    for bit in bits:
        chunk.append(bit)
        if len(chunk) == redundancy:
            yield 1 if sum(chunk) >= (redundancy / 2) else 0
            chunk = []


def embed_payload(image: Image.Image, payload: bytes) -> Image.Image:
    rgb = image.convert("RGB")
    pixels = list(rgb.getdata())
    capacity = len(pixels)
    bit_stream = list(expand_bits(bits_from_bytes(payload)))
    if len(bit_stream) > capacity:
        raise ValueError(
            f"Payload too large for image ({len(bit_stream)} bits > {capacity} pixels)"
        )

    new_pixels = []
    for index, (r, g, b) in enumerate(pixels):
        if index < len(bit_stream):
            b = (b & 0xFE) | bit_stream[index]
        new_pixels.append((r, g, b))

    out = Image.new("RGB", rgb.size)
    out.putdata(new_pixels)
    return out


def extract_payload(image: Image.Image, payload_len: int) -> bytes:
    rgb = image.convert("RGB")
    pixels = list(rgb.getdata())
    needed = payload_len * 8 * REDUNDANCY
    if len(pixels) < needed:
        raise ValueError("Image too small to contain forensic payload")

    raw_bits = [(b & 1) for (_, _, b) in pixels[:needed]]
    collapsed = list(majority_collapse(raw_bits))
    return bytes_from_bits(collapsed)


def cmd_embed(args: argparse.Namespace) -> int:
    payload = base64.b64decode(args.payload_b64)
    source = Image.open(args.input)
    watermarked = embed_payload(source, payload)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    # PNG is required: JPEG quantization destroys spatial LSBs (confirmed ~95% bit loss at q=95).
    # Personalized previews are served as PNG so the invisible ID survives until display/screenshot.
    suffix = output.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        output = output.with_suffix(".png")
    watermarked.save(output, format="PNG", optimize=False)
    print(
        json.dumps(
            {
                "ok": True,
                "output": str(output),
                "payloadBytes": len(payload),
                "format": "PNG",
            }
        )
    )
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    payload_len = int(args.length)
    source = Image.open(args.input)
    payload = extract_payload(source, payload_len)
    print(
        json.dumps(
            {
                "ok": True,
                "payloadB64": base64.b64encode(payload).decode("ascii"),
                "payloadHex": payload.hex(),
            }
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    embed = sub.add_parser("embed")
    embed.add_argument("--input", required=True)
    embed.add_argument("--output", required=True)
    embed.add_argument("--payload-b64", required=True)

    extract = sub.add_parser("extract")
    extract.add_argument("--input", required=True)
    extract.add_argument("--length", type=int, required=True)

    args = parser.parse_args()
    if args.command == "embed":
        return cmd_embed(args)
    if args.command == "extract":
        return cmd_extract(args)
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001 - surface to Node caller
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
