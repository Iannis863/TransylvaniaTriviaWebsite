# Source artwork

These PNGs are the canonical source artwork retained for editing, reproducible
image exports, and upload regression tests. They are deliberately outside
`client/public/`, so Vite does not copy the large originals into the website's
static deployment.

| File | Purpose |
| --- | --- |
| `logo-original.png` | Original supplied Transilvania Trivia artwork, previously stored as root `Logo.png`. |
| `logo-main.png` | Transparent website master derived from that original. Also used by the large-upload browser regression. |
| `prize_beer.png` | Source artwork for the beer prize. |
| `prize_wine.png` | Source artwork for the wine prize. |
| `prize_shots.png` | Source artwork for the shots prize. |

The cleanup moved these files without modifying their bytes. Duplicate copies
and superseded logo variants were removed; the source files above are retained
in one place. No separate license was present for the supplied artwork; this
directory does not grant additional usage rights.

To recreate the transparent logo master and email-sized PNG from the original,
run from the repository root:

```sh
python3 script/transparent-logo.py assets/source/logo-original.png
```

Then regenerate the website's optimized logo and prize images:

```sh
python3 script/optimize-web-images.py
```

Both scripts require Python with Pillow installed; WebP export additionally
requires Pillow's WebP support. Run them only when intentionally regenerating
artwork, and review the resulting changes. The transparency script expects the
original artwork, not an already transparent output.

The public delivery assets remain in `client/public/`: `logo-main.webp`, the
three `prize_*.webp` images, `email-logo.png`, and `favicon.png`. Preserve the
email logo's public URL because previously sent email messages reference it.
