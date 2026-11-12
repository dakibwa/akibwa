"""Build the Oh Life! Pixel typeface from glyphs.txt.

python3 studio/tools/type/build.py  ->  studio/site/assets/ohlife-pixel.woff2 (needs fontTools + brotli)
One pixel is 100 font units; caps are 7 pixels tall, descenders 2.
"""
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'ohlife-pixel.woff2')
PX = 100; CAP = 7

def load():
    glyphs = {}; cur = None
    for line in open(os.path.join(HERE, 'glyphs.txt'), encoding='utf-8'):
        line = line.rstrip('\n')
        if line.startswith('#') and not set(line) <= set('#.'): continue
        if line.startswith('= '): cur = line[2:]; glyphs[cur] = []; continue
        if cur and line and set(line) <= set('#.'): glyphs[cur].append(line)
    return glyphs

def draw(rows):
    pen = TTGlyphPen(None)
    for r, row in enumerate(rows):
        top = (CAP - r) * PX; bot = top - PX; c = 0
        while c < len(row):               # one rectangle per horizontal run, drawn clockwise
            if row[c] != '#': c += 1; continue
            s = c
            while c < len(row) and row[c] == '#': c += 1
            x0, x1 = s * PX, c * PX
            pen.moveTo((x0, bot)); pen.lineTo((x0, top)); pen.lineTo((x1, top)); pen.lineTo((x1, bot)); pen.closePath()
    return pen.glyph()

def build():
    g = load()
    order = ['.notdef', 'space', 'nbspace'] + [f'uni{ord(ch):04X}' for ch in g]
    cmap = {32: 'space', 0xA0: 'nbspace'}; glyf = {}; hmtx = {}
    empty = TTGlyphPen(None).glyph()
    glyf['.notdef'] = draw(['####', '#..#', '#..#', '#..#', '#..#', '#..#', '####']); hmtx['.notdef'] = (500, 0)
    for n in ('space', 'nbspace'): glyf[n] = empty; hmtx[n] = (400, 0)
    for ch, rows in g.items():
        name = f'uni{ord(ch):04X}'; cmap[ord(ch)] = name
        glyf[name] = draw(rows); w = max(len(r) for r in rows)
        hmtx[name] = ((w + 1) * PX, 0)
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics({k: (v[0], glyf[k].xMin if hasattr(glyf[k], 'xMin') and glyf[k].numberOfContours else 0) for k, v in hmtx.items()})
    fb.setupHorizontalHeader(ascent=900, descent=-300)
    fb.setupNameTable({'familyName': 'Oh Life Pixel', 'styleName': 'Regular', 'uniqueFontIdentifier': 'OhLifePixel-1.0',
                       'fullName': 'Oh Life Pixel', 'psName': 'OhLifePixel-Regular', 'version': 'Version 1.000'})
    fb.setupOS2(sTypoAscender=900, sTypoDescender=-300, sTypoLineGap=0, usWinAscent=900, usWinDescent=300, sxHeight=500, sCapHeight=700)
    fb.setupPost(); fb.setupDummyDSIG() if hasattr(fb, 'setupDummyDSIG') else None
    fb.font.flavor = 'woff2'; fb.save(OUT)
    print('wrote', os.path.relpath(OUT), len(g), 'glyphs')

if __name__ == '__main__': build()
