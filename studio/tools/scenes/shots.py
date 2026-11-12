import sys, numpy as np
from PIL import Image
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paint as p
CREAM = p.C('fdf6e1'); INK = p.C('1b2517')
def shot(src, out, w):
    im = Image.open(src).convert('RGB'); h = round(im.height * w / im.width)
    a = np.asarray(im.resize((w, h), Image.LANCZOS), float) / 255
    # warm the product's whites to the sky's cream and its blacks to forest ink
    a = INK + (CREAM - INK) * a
    p.dither(a, ncol=32, spread=.07).save(out, optimize=True)
A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'assets') + '/'
shot(A + 'features-desk-20261109.png', A + 'shots/features.png', 480)
shot(A + 'portudo-desktop-20261109.jpg', A + 'shots/portudo.png', 480)
shot(A + 'ines-desktop-20261109.jpg', A + 'shots/ines.png', 480)
