#!/usr/bin/env python3
"""Generate a downsized, watermarked public preview from an HD artwork file.

Supports two invocation styles:
1) argparse flags used by artwork-preview.service.js
2) positional args + metadata.json used by artwork-media.service.js
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, PngImagePlugin


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
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size=size)
            except OSError:
                continue
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


def draw_corner_watermark(image: Image.Image, text: str) -> Image.Image:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_size = max(18, min(base.width, base.height) // 18)
    font = load_font(font_size)
    padding = max(12, font_size // 2)

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    positions = [
        (padding, padding),
        (max(padding, base.width - text_width - padding), padding),
        (padding, max(padding, base.height - text_height - padding)),
        (
            max(padding, base.width - text_width - padding),
            max(padding, base.height - text_height - padding),
        ),
        (
            max(padding, (base.width - text_width) // 2),
            max(padding, (base.height - text_height) // 2),
        ),
    ]

    for x, y in positions:
        draw.rectangle(
            (x - 6, y - 4, x + text_width + 6, y + text_height + 4),
            fill=(5, 8, 16, 110),
        )
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 170))

    return Image.alpha_composite(base, overlay)


def save_with_metadata(image: Image.Image, output_path: Path, meta: dict) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    copyright_notice = str(meta.get("copyright") or "All rights reserved — Make it Art")
    usage = str(
        meta.get("usageTerms")
        or "No AI training, scraping, or automated collection without explicit license."
    )

    rgb = image.convert("RGB")
    suffix = output_path.suffix.lower()

    if suffix == ".png":
        pnginfo = PngImagePlugin.PngInfo()
        pnginfo.add_text("Copyright", copyright_notice)
        pnginfo.add_text("Artist", str(meta.get("artist") or ""))
        pnginfo.add_text("Title", str(meta.get("title") or ""))
        pnginfo.add_text("UsageTerms", usage)
        pnginfo.add_text("AITraining", "prohibited")
        rgb.save(output_path, format="PNG", optimize=True, pnginfo=pnginfo)
        return

    if suffix in {".jpg", ".jpeg"}:
        rgb.save(
            output_path,
            format="JPEG",
            quality=82,
            optimize=True,
            progressive=True,
        )
        return

    rgb.save(output_path, format="WEBP", quality=80, method=4)


def run_argparse_mode() -> int:
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


def run_metadata_mode() -> int:
    if len(sys.argv) != 4:
        print(
            "Usage: generate_artwork_preview.py <input> <output> <metadata.json>",
            file=sys.stderr,
        )
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    meta = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

    max_size = int(meta.get("maxSize") or 800)
    watermark = str(meta.get("watermark") or "Make it Art — preview only")

    with Image.open(input_path) as source:
        source = source.convert("RGBA")
        source.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        watermarked = draw_corner_watermark(source, watermark)
        save_with_metadata(watermarked, output_path, meta)

    print(json.dumps({"ok": True, "output": str(output_path)}))
    return 0


def main() -> int:
    if any(arg.startswith("--") for arg in sys.argv[1:]):
        return run_argparse_mode()
    return run_metadata_mode()


if __name__ == "__main__":
    raise SystemExit(main())
