"""Remove a black matte while retaining the supplied logo's gold/purple glow.
Usage: python3 script/transparent-logo.py /path/to/original/Logo.png
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
public = Path(__file__).resolve().parents[1] / "client" / "public"
result.save(public / "logo-main.png", optimize=True)
result.resize((368, 368), Image.Resampling.LANCZOS).save(public / "email-logo.png", optimize=True)
