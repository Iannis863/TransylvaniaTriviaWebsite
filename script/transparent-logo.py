"""Remove a black matte while retaining the supplied logo's gold/purple glow.
Usage: python3 script/transparent-logo.py assets/source/logo-original.png
Requires Pillow. Never run on an already transparent output.
"""
from pathlib import Path
import sys
from PIL import Image

source = Image.open(sys.argv[1]).convert("RGB")
result = Image.new("RGBA", source.size)
pixels = []
for r, g, b in source.getdata():
    # Soft alpha avoids jagged edges. Unmatting keeps the luminous details from
    # acquiring a dark halo against the site's purple background.
    brightness = max(r, g, b)
    alpha = max(0.0, min(1.0, (brightness - 8) / 88))
    pixels.append((min(255, round(r / alpha)), min(255, round(g / alpha)), min(255, round(b / alpha)), round(alpha * 255)) if alpha else (0, 0, 0, 0))
result.putdata(pixels)
root = Path(__file__).resolve().parents[1]
public = root / "client" / "public"
result.save(root / "assets" / "source" / "logo-main.png", optimize=True)
result.resize((368, 368), Image.Resampling.LANCZOS).save(public / "email-logo.png", optimize=True)
