"""Draw the Oh Life! logo and mark as pixel SVGs from the typeface's glyphs.

python3 studio/tools/type/logo.py -> studio/site/assets/logo.svg, logo-cream.svg, studio/site/favicon.svg
"""
import os
from build import load, HERE
PUB = os.path.join(HERE, '..', '..', 'site')
INK, CREAM = '#1b2517', '#fdf6e1'
# the bang leans into the sky; sunset ramp from apricot to coral, dithered where it changes
BANG = ['..####', '..####', '..####', '.####.', '.####.', '.####.', '.###..', '.###..', '.###..', '......', '.###..', '.###..']
RAMP = ['#ec9560', '#e07a50', '#d26545', '#bd5038']

def bang_colour(r, c):
    t = r / (len(BANG) - 1) * (len(RAMP) - 1)
    i = int(t); f = t - i
    if i >= len(RAMP) - 1: return RAMP[-1]
    return RAMP[i + 1] if ((r + c) % 2 == 0 and f > .35) or f > .7 else RAMP[i]

def text_pixels(s, g, x0, base, scale=1):
    px = []; x = x0
    for ch in s:
        if ch == ' ': x += 3 * scale; continue
        rows = g[ch]; w = max(len(r) for r in rows)
        for r, row in enumerate(rows):
            for c, v in enumerate(row):
                if v == '#': px.append((x + c * scale, base - 7 * scale + r * scale, scale))
        x += (w + 1) * scale
    return px, x

def runs(px, colour):
    # merge pixels of one colour into horizontal runs for a small file
    out = []; rows = {}
    for (x, y, s) in px: rows.setdefault((y, s), []).append(x)
    for (y, s), xs in sorted(rows.items()):
        xs.sort(); start = prev = xs[0]
        for x in xs[1:] + [None]:
            if x is not None and x == prev + s: prev = x; continue
            out.append(f'<rect x="{start}" y="{y}" width="{prev + s - start}" height="{s}" fill="{colour}"/>')
            if x is not None: start = prev = x
    return out

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 4}" height="{h * 4}" shape-rendering="crispEdges" role="img" aria-label="{title}">'
            f'<title>{title}</title>' + ''.join(body) + '</svg>\n')

def logo(ink, path):
    g = load(); S = 2
    px, x = text_pixels('Oh Life', g, 0, 12 * S, S)
    body = runs(px, ink)
    bx = x; top = 12 * S - len(BANG) * S
    for r, row in enumerate(BANG):
        for c, v in enumerate(row):
            if v == '#': body.append(f'<rect x="{bx + c * S}" y="{top + r * S}" width="{S}" height="{S}" fill="{bang_colour(r, c)}"/>')
    w = bx + 6 * S
    sp, sx = text_pixels('STUDIOS', g, 0, 12 * S + 11, 1)
    off = w - sx + 1                       # right-align "STUDIOS" under the bang
    body += runs([(a + off, b, s) for (a, b, s) in sp], ink)
    open(os.path.join(PUB, 'assets', path), 'w').write(svg(w, 12 * S + 11, body, 'Oh Life! Studios'))

def mark():
    # 16 x 16 tile: dusk sky, a hill, and the bang standing up out of it
    px = {}
    for y in range(16):
        for x in range(16):
            c = '#fdf6e1'
            if y in (10, 11) and (x + y) % 2 == 0: c = '#f6d5a8'
            if y == 11 and (x + y) % 2: c = '#eca58c'
            px[(x, y)] = c
    for x in range(16):
        top = 12 + (0 if 3 <= x <= 12 else 1) - (1 if 6 <= x <= 9 else 0)
        for y in range(top, 16): px[(x, y)] = '#344925' if y == top else '#1b2517'
    big = ['.####', '.####', '.####', '####.', '####.', '###..', '###..', '.....', '###..', '###..']
    for r, row in enumerate(big):
        for c, v in enumerate(row):
            if v == '#': px[(5 + c, 1 + r)] = RAMP[min(3, 1 + r * 3 // 10)]
    body = [f'<rect x="{x}" y="{y}" width="1" height="1" fill="{c}"/>' for (x, y), c in px.items()]
    s = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
         '<clipPath id="c"><path d="M2 0h12v1h1v1h1v12h-1v1h-1v1H2v-1H1v-1H0V2h1V1h1z"/></clipPath><g clip-path="url(#c)">' + ''.join(body) + '</g></svg>\n')
    open(os.path.join(PUB, 'favicon.svg'), 'w').write(s)

if __name__ == '__main__':
    logo(INK, 'logo.svg'); logo(CREAM, 'logo-cream.svg'); mark(); print('ok')
