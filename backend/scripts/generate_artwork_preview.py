#!/usr/bin/env python3
"""Generate a watermarked, downscaled preview with anti-training metadata."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin


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


def draw_watermark(image: Image.Image, text: str) -> Image.Image:
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


def apply_metadata(image: Image.Image, meta: dict) -> Image.Image:
    copyright_notice = str(meta.get("copyright") or "All rights reserved — Make it Art")
    artist = str(meta.get("artist") or "Make it Art artist")
    title = str(meta.get("title") or "Protected artwork")
    usage = str(
        meta.get("usageTerms")
        or "No AI training, scraping, or automated collection without explicit license."
    )

    image.info["copyright"] = copyright_notice
    image.info["artist"] = artist
    image.info["title"] = title
    image.info["comment"] = usage
    return image


def save_image(image: Image.Image, output_path: Path, meta: dict) -> None:
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


def main() -> int:
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
        watermarked = draw_watermark(source, watermark)
        watermarked = apply_metadata(watermarked, meta)
        save_image(watermarked, output_path, meta)

    print(json.dumps({"ok": True, "output": str(output_path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
