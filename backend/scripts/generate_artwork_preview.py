#!/usr/bin/env python3
"""Generate a downsized, watermarked public preview from an HD artwork file.

Supports two invocation styles:
1) argparse flags used by artwork-preview.service.js
2) positional args + metadata.json used by artwork-media.service.js

Public previews always receive a visible anti-AI / anti-copy watermark baked
into the pixels (not only CSS), plus copyright metadata when the format allows.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, PngImagePlugin


DEFAULT_WATERMARK = "Make It Art · Preview · No AI training"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Absolute path to the HD source image")
    parser.add_argument("--output", required=True, help="Absolute path for the preview JPEG")
    parser.add_argument("--max-width", type=int, default=1600)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--watermark", default=DEFAULT_WATERMARK)
    parser.add_argument(
        "--apply-watermark",
        action="store_true",
        default=True,
        help="Always applied by default; kept for backward compatibility",
    )
    parser.add_argument(
        "--no-watermark",
        action="store_true",
        help="Disable watermark (internal/tests only)",
    )
    parser.add_argument("--title", default="")
    parser.add_argument("--artist", default="")
    parser.add_argument("--copyright", default="")
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
    font = load_font(max(22, min(base.size) // 14))
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    step_x = max(text_width + 48, base.width // 4)
    step_y = max(text_height + 64, base.height // 5)

    for y in range(-base.height, base.height * 2, step_y):
        for x in range(-base.width, base.width * 2, step_x):
            # Soft shadow then bright tile — harder for scrapers/AI clean-up
            draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 90))
            draw.text((x, y), text, font=font, fill=(255, 255, 255, 92))

    rotated = overlay.rotate(32, expand=False, resample=Image.BICUBIC)
    composed = Image.alpha_composite(base, rotated)
    return ImageEnhance.Brightness(composed).enhance(0.97)


def draw_corner_watermark(image: Image.Image, text: str) -> Image.Image:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_size = max(18, min(base.width, base.height) // 16)
    font = load_font(font_size)
    padding = max(14, font_size // 2)

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
            (x - 8, y - 6, x + text_width + 8, y + text_height + 6),
            fill=(5, 8, 16, 150),
        )
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 210))

    return Image.alpha_composite(base, overlay)


def draw_ai_banner(image: Image.Image) -> Image.Image:
    """Bottom banner stating AI training / copying is prohibited."""
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    banner_h = max(36, base.height // 18)
    draw.rectangle((0, base.height - banner_h, base.width, base.height), fill=(5, 8, 16, 170))

    notice = "Make It Art - Preview only - AI training & scraping prohibited"
    font = load_font(max(14, banner_h // 2))
    bbox = draw.textbbox((0, 0), notice, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = max(12, (base.width - text_width) // 2)
    y = base.height - banner_h + max(4, (banner_h - text_height) // 2)
    draw.text((x, y), notice, font=font, fill=(220, 230, 245, 230))

    return Image.alpha_composite(base, overlay)


def apply_full_watermark(image: Image.Image, text: str) -> Image.Image:
    watermarked = apply_diagonal_watermark(image, text)
    watermarked = draw_corner_watermark(watermarked, text)
    watermarked = draw_ai_banner(watermarked)
    return watermarked.convert("RGB")


def build_meta(
    *,
    watermark: str,
    title: str = "",
    artist: str = "",
    copyright_notice: str = "",
) -> dict:
    return {
        "watermark": watermark,
        "title": title or "Protected artwork",
        "artist": artist or "Make it Art artist",
        "copyright": copyright_notice
        or "All rights reserved - Make it Art. No AI training without license.",
        "usageTerms": (
            "No AI training, scraping, crawling, or automated collection "
            "without an explicit license from the rights holder."
        ),
    }


def save_with_metadata(image: Image.Image, output_path: Path, meta: dict, quality: int = 82) -> None:
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
        pnginfo.add_text("Watermark", str(meta.get("watermark") or ""))
        rgb.save(output_path, format="PNG", optimize=True, pnginfo=pnginfo)
        return

    exif = Image.Exif()
    try:
        # 0x8298 = Copyright, 0x013B = Artist, 0x010E = ImageDescription
        exif[0x8298] = copyright_notice[:128]
        if meta.get("artist"):
            exif[0x013B] = str(meta["artist"])[:64]
        description = f"{meta.get('title') or 'Artwork'} — AI training prohibited"
        exif[0x010E] = description[:128]
    except Exception:
        exif = None

    save_kwargs = {
        "format": "JPEG" if suffix in {".jpg", ".jpeg"} else "WEBP",
        "quality": max(40, min(95, quality)),
        "optimize": True,
    }
    if suffix in {".jpg", ".jpeg"}:
        save_kwargs["progressive"] = True
        if exif is not None:
            save_kwargs["exif"] = exif.tobytes()
    elif suffix == ".webp":
        save_kwargs["method"] = 4

    if suffix not in {".jpg", ".jpeg", ".webp"}:
        rgb.save(output_path, format="JPEG", quality=save_kwargs["quality"], optimize=True)
        return

    rgb.save(output_path, **save_kwargs)


def run_argparse_mode() -> int:
    args = parse_args()
    source = Path(args.input)
    target = Path(args.output)

    if not source.exists():
        print(f"Source image not found: {source}", file=sys.stderr)
        return 1

    watermark_text = (args.watermark or DEFAULT_WATERMARK).strip() or DEFAULT_WATERMARK
    meta = build_meta(
        watermark=watermark_text,
        title=args.title,
        artist=args.artist,
        copyright_notice=args.copyright,
    )

    with Image.open(source) as image:
        rgb = image.convert("RGB")
        max_width = max(320, args.max_width)
        if rgb.width > max_width:
            ratio = max_width / float(rgb.width)
            rgb = rgb.resize((max_width, max(1, int(rgb.height * ratio))), Image.LANCZOS)

        if not args.no_watermark:
            rgb = apply_full_watermark(rgb, watermark_text)

        save_with_metadata(rgb, target, meta, quality=args.quality)

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
    meta_raw = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

    max_size = int(meta_raw.get("maxSize") or 800)
    watermark = str(meta_raw.get("watermark") or DEFAULT_WATERMARK).strip() or DEFAULT_WATERMARK
    meta = build_meta(
        watermark=watermark,
        title=str(meta_raw.get("title") or ""),
        artist=str(meta_raw.get("artist") or ""),
        copyright_notice=str(meta_raw.get("copyright") or ""),
    )
    meta["usageTerms"] = str(meta_raw.get("usageTerms") or meta["usageTerms"])

    with Image.open(input_path) as source:
        source = source.convert("RGB")
        source.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        watermarked = apply_full_watermark(source, watermark)
        save_with_metadata(watermarked, output_path, meta)

    print(json.dumps({"ok": True, "output": str(output_path), "watermarkApplied": True}))
    return 0


def main() -> int:
    if any(arg.startswith("--") for arg in sys.argv[1:]):
        return run_argparse_mode()
    return run_metadata_mode()


if __name__ == "__main__":
    raise SystemExit(main())
