#!/usr/bin/env python3
"""Draw the link-preview card, public/share-card-wall.png.

    python3 scripts/build-share-card.py

The card is the page in one picture: the Akibwa mark at the top left of a wall of the records
played most, each redrawn as a block print in the mark's own nine colours and hung in the mark's
ink and gold frame (Dan, 26 November 2026, of the card that was a photograph of the page: "can we
create a super tasteful image here that represents what it is"; "the akibwa logo on the left and
the albums to right maybe, like sketched out versions similar to the draceland one versions of my
favourit albums"; "fill the white space so there is albums everwyehere", "so it feels like the
wall of albums"; "put him top left and then see how everything else fits").

- The wall is a grid of small squares; a record takes one, four or nine of them, the two most
  played the nine. The mark's square takes twenty-five and its halo and rays stand in the row
  above, with paper beside them: two sleeves hung there were taken down ("lets remove them ones I
  think above his head").
- The sleeves are chosen, not taken in order: only those that are a picture and nothing else, with
  no face and no lettering to speak of ("lets not select ones with text or faces on as it makes
  them look a bit weird", "the abstract ones are better"), the most played of those first. Sleep
  Well Beast, Man Alive! and Before and After Science are there because he picked them out
  ("64 52 are cool", "37").
- A print keeps the sleeve's shapes and gives up its colours for the mark's: the picture is
  painted flat, its tones spread to the mark's range, each part given the nearest of the mark's
  eight fills with the mark's own mottle, and the dark and the dark side of every edge inked.
  Warm colours stay warm and cool ones fall to the mark's greys, since the mark has no blue.

Needs numpy and Pillow, and node with the repository's sharp to draw the mark from its SVG. Link
previews keep the copy they have: when the card changes, give it a new file name here and in
app/layout.jsx.
"""
import subprocess
import tempfile
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'public/album-art'
OUT = ROOT / 'public/share-card-wall.png'

W, H = 1200, 630
K = 2                                   # drawn at twice the size and made small, for clean edges
PITCH, GAP = 84, 8                      # a small square and the paper between two
LEFT, TOP = 16, 25                      # the wall's margins; the mark's rays rise a little over its top line

# The mark's colours (public/akibwa-mark.svg) and the page's paper (app/globals.css).
INK, GOLD, PAPER = '#21190f', '#d69d53', '#f3ecdf'
FILLS = ['#4a433c', '#6d645a', '#b5512b', '#d48a62', '#d69d53', '#e8bd7f', '#e8d6b8', '#f2e6d0']

# The mark's square: column, row and squares across. Its halo and rays stand in the row above.
MARK = (0, 1, 5)
# Where each record hangs: column, row, squares across, and its artwork in public/album-art.
PLAN = [
    (5, 0, 3, '043'),                           # Music for Psychedelic Therapy
    (9, 3, 3, 'lf-dbbd05ddffe94ea5'),           # Discreet Music
    (8, 0, 2, '135'),                           # Ants From Up There
    (10, 0, 2, 'lf-4cb306fbca55133f'),          # Thursday Afternoon
    (12, 0, 2, 'lf-b1b131517ca6b745'),          # Merriweather Post Pavilion
    (5, 3, 2, '199'),                           # Reset
    (7, 3, 2, 'lf-9a73a1e5602a994d'),           # Graceland
    (12, 3, 2, 'lf-1fa6c02e2ebbf849'),          # Space Heavy
    (5, 5, 2, '232'),                           # Sleep Well Beast
    (7, 5, 2, '001'),                           # Man Alive!
    (12, 5, 2, '140'),                          # Before and After Science
    (8, 2, 1, '164'),                           # channel ORANGE
    (9, 2, 1, '246'),                           # The Disintegration Loops
    (10, 2, 1, '182'),                          # This Old Dog
    (11, 2, 1, '191'),                          # Space 1.8
    (12, 2, 1, '133'),                          # Apocalypse
    (13, 2, 1, 'history-49f86f14ae8ef784'),     # Paradise Valley
    (9, 6, 1, '200'),                           # Panda Bear Meets the Grim Reaper
    (10, 6, 1, 'history-7bc48260f470bc47'),     # Nightmare Ending
    (11, 6, 1, 'lf-1747dde45fc90f62'),          # Playing Robots Into Heaven
    (0, 6, 1, 'history-7abaf827ee921950'),      # Music for Airports
    (1, 6, 1, '186'),                           # Congratulations
    (2, 6, 1, 'lf-4ec689292a6d66c0'),           # Getting Killed
    (3, 6, 1, '127'),                           # Strawberry Jam
    (4, 6, 1, 'lf-328e6892dab57d60'),           # Knock Knock
]
# Lettering prints as scratches, so the little there is on the two largest is painted out first:
# left, top, right and bottom, as parts of the sleeve's side.
CLEAN = {
    '043': [(0.02, 0.025, 0.15, 0.185)],
    'lf-dbbd05ddffe94ea5': [(0.42, 0.15, 0.96, 0.20)],
}


def rgb(colour):
    return np.array([int(colour[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255


def to_lab(a):
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], dtype=np.float32)
    xyz = lin @ m.T / np.array([0.95047, 1.0, 1.08883], dtype=np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def blur(a, sigma):
    r = max(1, int(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r, r)
        p = np.pad(a, pad, mode='edge')
        out = np.zeros_like(a)
        for i, w in enumerate(k):
            cut = [slice(None)] * a.ndim
            cut[axis] = slice(i, i + a.shape[axis])
            out += w * p[tuple(cut)]
        a = out
    return a


def paint_flat(a, lum, r):
    """Each point takes the mean of whichever of the four quarters round it is calmest (Kuwahara):
    paint, not photograph."""
    h, w = lum.shape
    n = r + 1

    def box(x):
        p = np.pad(x, [(n, n), (n, n)] + [(0, 0)] * (x.ndim - 2), mode='edge')
        c = np.pad(p.cumsum(0).cumsum(1), [(1, 0), (1, 0)] + [(0, 0)] * (x.ndim - 2))
        return (c[n:, n:] - c[:-n, n:] - c[n:, :-n] + c[:-n, :-n]) / (n * n)

    mean, square, colour = box(lum), box(lum * lum), box(a)
    calmest, out = None, None
    for dy in (0, r):
        for dx in (0, r):
            ys, xs = n - r + dy, n - r + dx
            spread = (square - mean ** 2)[ys:ys + h, xs:xs + w]
            part = colour[ys:ys + h, xs:xs + w]
            if calmest is None:
                calmest, out = spread.copy(), part.copy()
            else:
                pick = spread < calmest
                calmest = np.where(pick, spread, calmest)
                out = np.where(pick[..., None], part, out)
    return out


def mottle(shape, sigma, seed):
    grain = blur(np.random.default_rng(seed).standard_normal(shape).astype(np.float32), sigma)
    return grain / (grain.std() + 1e-6)


def block_print(sleeve, side, work, seed):
    """A sleeve as a block print in the mark's colours, `side` across, worked at `work` across:
    the smaller it is worked, the bolder its shapes."""
    a = np.asarray(sleeve.resize((work, work), Image.LANCZOS)).astype(np.float32) / 255
    flat = paint_flat(to_lab(a), to_lab(a)[..., 0], 3)
    # Warm colours keep their colour; cool ones fall to grey.
    hue = np.arctan2(flat[..., 2], flat[..., 1])
    warmth = np.clip(np.cos(hue - np.radians(55)), 0, 1) ** 0.6
    L, A, B = flat[..., 0], flat[..., 1] * warmth, flat[..., 2] * warmth
    # A shape stands out from what is round it, so a pale shape on white paper is still a shape.
    L = L + 0.7 * (L - blur(L, work / 12))
    # Its tones are spread about their middle to the mark's range, by no more than 1.9 times: a
    # dark sleeve stays dark and a pale one keeps its shapes.
    low, high = np.percentile(L, [2, 98])
    span = min(84.0, (high - low) * 1.9)
    floor = float(np.clip((low + high) / 2 - span / 2, 8, 92 - span))
    L = floor + (L - low) * (span / (high - low) if high - low > 1 else 1.0)
    L = np.clip(L, floor - 0.2 * span, floor + span)

    fills = to_lab(np.stack([rgb(c) for c in FILLS]))
    vivid = 0.95 * 1.5
    here = np.stack([L + mottle(L.shape, work / 40, seed) * 3.2, A * vivid, B * vivid], -1)
    there = fills * np.array([1, 0.95, 0.95], dtype=np.float32)
    nearest = ((here[:, :, None, :] - there[None, None]) ** 2).sum(-1).argmin(-1).astype(np.uint8)
    nearest = np.asarray(Image.fromarray(nearest).filter(ImageFilter.ModeFilter(7)))

    # Ink: the dark, and the dark side of every edge (an extended difference of Gaussians).
    grey = np.clip(L, 0, 100) / 100
    fine = work / 300
    inked = (9 * blur(grey, fine) - 8 * blur(grey, fine * 1.6) < 0.27).astype(np.float32)

    out = np.zeros((work, work, 3), dtype=np.float32)
    most = np.full((work, work), -1.0, dtype=np.float32)
    for index, colour in enumerate(FILLS):
        cover = blur((nearest == index).astype(np.float32), 1.6)
        pick = cover > most
        most = np.where(pick, cover, most)
        out = np.where(pick[..., None], rgb(colour), out)
    ink = np.clip((blur(inked, 1.1) - 0.45) * 7, 0, 1)[..., None]
    out = out * (1 - ink) + rgb(INK) * ink
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((side, side), Image.LANCZOS)


def framed(print_):
    """The mark's own frame, the same weight on every sleeve whatever its size: ink, gold, a hair
    of ink."""
    a = np.asarray(print_).astype(np.float32) / 255
    n = a.shape[0]
    yy, xx = np.mgrid[0:n, 0:n]
    edge = np.minimum(np.minimum(xx, yy), np.minimum(n - 1 - xx, n - 1 - yy))
    a = np.where((edge < 6.6 * K)[..., None], rgb(INK), a)
    a = np.where(((edge >= 3.0 * K) & (edge < 5.2 * K))[..., None], rgb(GOLD), a)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def sleeve(art):
    picture = Image.open(ART / f'{art}-large.webp').convert('RGB')
    for box in CLEAN.get(art, []):
        x0, y0, x1, y1 = (round(part * picture.width) for part in box)
        # Painted out with what stands just left of the lettering or, at the sleeve's edge, under it.
        over = picture.getpixel((x0 - 6, (y0 + y1) // 2)) if x0 > 12 else picture.getpixel(((x0 + x1) // 2, y1 + 6))
        picture.paste(over, (x0, y0, x1, y1))
    return picture


def mark(width):
    """The mark drawn `width` across, and how far down it its square begins."""
    draw = "require('sharp')(process.argv[1], { density: 300 }).resize({ width: +process.argv[3] }).png().toFile(process.argv[2])"
    with tempfile.TemporaryDirectory() as folder:
        drawn = Path(folder) / 'mark.png'
        subprocess.run(['node', '-e', draw, str(ROOT / 'public/akibwa-mark.svg'), str(drawn), str(width)], check=True, cwd=ROOT)
        picture = Image.open(drawn).convert('RGBA').copy()
    solid = np.asarray(picture)[..., 3] > 40
    return picture, int(np.where(solid.sum(1) > solid.shape[1] * 0.9)[0].min())


def card():
    out = Image.new('RGB', (W * K, H * K), tuple(int(v * 255) for v in rgb(PAPER)))
    at = lambda column, row: ((LEFT + column * PITCH) * K, (TOP + row * PITCH) * K)
    for column, row, across, art in PLAN:
        side = (across * PITCH - GAP) * K
        work = {1: 240, 2: 360}.get(across, 480)
        out.paste(framed(block_print(sleeve(art), side, work, zlib.crc32(art.encode()) % 1000)), at(column, row))
    column, row, across = MARK
    picture, square = mark((across * PITCH - GAP) * K)
    x, y = at(column, row)
    out.paste(picture, (x, y - square), picture)
    return out.resize((W, H), Image.LANCZOS)


if __name__ == '__main__':
    # Flat colour needs few colours: an eighth of the file, with nothing lost to the eye.
    card().quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(OUT, optimize=True)
    print(f'{OUT.relative_to(ROOT)} written, {OUT.stat().st_size // 1024} KB')
