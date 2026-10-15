"""Encode canonical PNGs from assets/source for web delivery.

Requires Pillow with WebP support. Run from the repository root.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source"
PUBLIC = ROOT / "client" / "public"
for name, bounds in {
    "logo-main": (880, 880),
    "prize_beer": (480, 480),
    "prize_wine": (480, 480),
    "prize_shots": (480, 480),
}.items():
    source = SOURCE / f"{name}.png"
    target = PUBLIC / f"{name}.webp"
    with Image.open(source) as image:
        image.thumbnail(bounds, Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=88, method=6)
    print(f"{source.name}: {source.stat().st_size:,} → {target.stat().st_size:,} bytes")
