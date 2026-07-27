#!/usr/bin/env python3
"""Generate a downsized, watermarked public preview from an HD artwork file."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Absolute path to the HD source image")
    parser.add_argument("--output", required=True, help="Absolute path for the preview JPEG")
    parser.add_argument("--max-width", type=int, default=1600)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--watermark", default="Make It Art")
    parser.add_argument("--apply-watermark", action="store_true")
    return parser.parse_args()


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def apply_diagonal_watermark(image: Image.Image, text: str) -> Image.Image:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = load_font(max(18, min(base.size) // 18))
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    step_x = max(text_width + 80, base.width // 3)
    step_y = max(text_height + 100, base.height // 4)

    for y in range(-base.height, base.height * 2, step_y):
        for x in range(-base.width, base.width * 2, step_x):
            draw.text((x, y), text, font=font, fill=(255, 255, 255, 56))

    rotated = overlay.rotate(28, expand=False, resample=Image.BICUBIC)
    composed = Image.alpha_composite(base, rotated)
    return ImageEnhance.Brightness(composed).enhance(0.98).convert("RGB")


def main() -> int:
    args = parse_args()
    source = Path(args.input)
    target = Path(args.output)

    if not source.exists():
        print(f"Source image not found: {source}", file=sys.stderr)
        return 1

    target.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as image:
        rgb = image.convert("RGB")
        max_width = max(320, args.max_width)
        if rgb.width > max_width:
            ratio = max_width / float(rgb.width)
            rgb = rgb.resize((max_width, max(1, int(rgb.height * ratio))), Image.LANCZOS)

        if args.apply_watermark and args.watermark.strip():
            rgb = apply_diagonal_watermark(rgb, args.watermark.strip())

        rgb.save(target, format="JPEG", quality=max(40, min(95, args.quality)), optimize=True)

    print(str(target))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
