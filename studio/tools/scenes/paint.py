# 2D painterly landscape renderer + ordered dither, in the style of Dan's references.
import numpy as np, sys, os
from PIL import Image
W, H = int(os.environ.get('SW', 320)), int(os.environ.get('SH', 200))
R = np.random.default_rng
def C(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], float) / 255
def mix(a, b, t):
    t = np.asarray(t, float)
    if t.ndim: t = t[..., None]
    return a * (1 - t) + b * t
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def vn(w, h, fx, fy, seed):
    g = R(seed).random((int(fy) + 3, int(fx) + 3))
    x = np.linspace(0, fx, w, endpoint=False); y = np.linspace(0, fy, h, endpoint=False)
    xi = x.astype(int); yi = y.astype(int); xf = sm(x - xi); yf = sm(y - yi)
    a = g[np.ix_(yi, xi)]; b = g[np.ix_(yi, xi + 1)]; c = g[np.ix_(yi + 1, xi)]; d = g[np.ix_(yi + 1, xi + 1)]
    return (a * (1 - xf) + b * xf) * (1 - yf[:, None]) + (c * (1 - xf) + d * xf) * yf[:, None]
def fbm(fx, fy, seed, oct=5, gain=.5, w=None, h=None):
    w = w or W; h = h or H; s = 0; a = 1; t = 0
    for o in range(oct):
        s = s + a * vn(w, h, fx * 2 ** o, fy * 2 ** o, seed + 17 * o); t += a; a *= gain
    return s / t
def f1(f, seed, oct=5, gain=.5): return fbm(f, 1, seed, oct, gain, W, 1)[0] * 2 - 1
Y, X = np.mgrid[0:H, 0:W].astype(float); yn = Y / H; xn = X / W; xs = np.arange(W) / W

# ---------- sky and clouds
def sky(top, mid, low, hy, sunx, sun, glow=.35):
    t = np.clip(yn / hy, 0, 1)
    c = np.where((t < .6)[..., None], mix(top, mid, sm(t / .6)), mix(mid, low, (t - .6) / .4))
    d = np.hypot((xn - sunx) * 1.2 * W / H, (yn - hy) * 2.2)
    return mix(c, sun, np.clip(1 - d / glow, 0, 1) ** 1.6 * .9)
def clouds(img, y0, y1, seed, shade, body, lit, cover=.55, fx=5, fy=1.2, soft=.12):
    n = fbm(fx, fy * 7, seed, 6, .55); n2 = fbm(fx * 4, fy * 14, seed + 5, 4, .6)
    c = (y0 + y1) / 2; hw = (y1 - y0) / 2
    prof = f1(2.5, seed + 9, 3) * hw * .5
    band = np.clip(1 - np.abs((yn - c - prof) / hw), 0, 1)
    o = band - (1 - cover)
    v = ((n * .72 + n2 * .28) - .48) / .11 + np.where(o < 0, o * 12, o * 3)
    th = 0
    m = sm((v - th) / (soft * 5))
    up = v - np.roll(v, 4, 0); dn = v - np.roll(v, -4, 0)
    col = mix(APRICOT, body, sm(v / 1.6))
    col = mix(col, lit, np.clip(up * 1.4 - .1, 0, 1) * .9)
    col = mix(col, shade, np.clip(dn * 1.1, 0, 1) * .7)
    col = mix(col, lit, np.clip((v - th - 2) * .4, 0, 1) * .5)
    return mix(img, col, m * .95)

# ---------- terrain layers
def ridge(base, amp, f, seed, oct=5, tilt=0., gain=.5, shape=None):
    r = f1(f, seed, oct, gain)
    y = base - amp * r - tilt * (xs - .5)
    if shape is not None: y = y - shape
    return y * H
def fill(img, top, col, mask=None):
    m = Y >= top[None, :]
    if mask is not None: m &= mask
    img[m] = col[m] if np.ndim(col) == 3 else col
    return m
def hill_shade(top, base, lit, dark, sunx, seed, rough=.6, rim=None, f=6):
    # pseudo relief: interior fbm + slope of the ridgeline + falloff below the crest
    d = np.clip((Y - top[None, :]) / H, 0, 1)
    slope = np.gradient(top)[None, :] / (H / W) * (1 if sunx > .5 else -1)  # facing sun -> negative dy/dx
    n = fbm(f, f * .8, seed, 5, .55)
    l = .5 - np.clip(slope, -2, 2) * .18 + (n - .5) * rough - d * 1.2
    col = mix(dark, base, sm(l * 1.6))
    col = mix(col, lit, sm((l - .45) * 2.2))
    if rim is not None: col = mix(col, rim, np.clip(1 - d * H / 2.5, 0, 1) * .6)
    return col
def hill_light(top, sunx, seed, rough=.6, f=5, fall=1.2):
    d = np.clip((Y - top[None, :]) / H, 0, 1)
    sl = np.gradient(top)[None, :] / (H / W) * (1 if sunx > .5 else -1)
    n = fbm(f, f * .5, seed, 5, .55)
    return np.clip(.55 + np.clip(sl, -2, 2) * .2 + (n - .5) * rough - d * fall, 0, 1)
def haze(col, hz, a): return mix(col, hz, a)

def trees(img, region, n, seed, rmin, rmax, pal, sun=(.6, -.7), light=None, hz=None, hza=0., sizey=None, shift=0.):
    g = R(seed); ys, xs_ = np.nonzero(region)
    if len(ys) == 0: return
    n = int(n * W * H / 64000); idx = g.integers(0, len(ys), n); pts = sorted(zip(ys[idx], xs_[idx]))
    sx, sy = sun; sz = np.sqrt(max(0, 1 - sx * sx - sy * sy)); P = np.array(pal)
    for (cy, cx) in pts:
        t = np.clip((cy / H) if sizey is None else sizey(cy), 0, 1.4)
        r = rmin + (rmax - rmin) * t * g.uniform(.7, 1.3)
        ri = int(np.ceil(r * 1.3)) + 1
        y0, y1 = max(0, cy - ri), min(H, cy + ri + 1); x0, x1 = max(0, cx - ri), min(W, cx + ri + 1)
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
        dx = (xx - cx) / r; dy = (yy - cy) / (r * .85)
        ang = np.arctan2(dy, dx); ph = g.uniform(0, 6.3)
        rr = 1 + .16 * np.sin(ang * 5 + ph) + .08 * np.sin(ang * 9 + ph * 2)
        q = dx * dx + dy * dy; m = q <= rr * rr
        if not m.any(): continue
        nz = np.sqrt(np.clip(1 - q / (rr * rr), 0, 1))
        l = np.clip(dx / rr * sx + dy / rr * sy + nz * sz, 0, 1) * .8 + g.uniform(-.06, .08) + shift
        if light is not None: l = l * .7 + light[cy, cx] * .75 - .25
        k = np.clip(l * (len(P) - 1), 0, len(P) - 1.001); i = k.astype(int); fr = k - i
        col = P[i] * (1 - fr[..., None]) + P[i + 1] * fr[..., None]
        if hz is not None: col = mix(col, hz, hza)
        sub = img[y0:y1, x0:x1]; sub[m] = col[m]

def forest(img, top, seed, n, rmin, rmax, sunx=.7, hza=0., rough=.7, f=5, rim=True, extra=None, pal=None):
    pal = pal or FOR
    L = hill_light(top, sunx, seed, rough, f)
    P = np.array(pal); k = np.clip(L * (len(P) - 1), 0, len(P) - 1.001); i = k.astype(int)
    base = P[i] * (1 - (k - i))[..., None] + P[i + 1] * (k - i)[..., None]
    base = mix(base, HAZE, hza)
    m = fill(img, top, base, extra)
    t0 = top.min() / H
    trees(img, m, n, seed + 1, rmin, rmax, pal, sun=((1 if sunx > .5 else -1) * .6, -.7), light=L, hz=HAZE, hza=hza,
          sizey=lambda y: (y / H - t0) / (1 - t0) * 1.6 + .2)
    if rim:
        edge = m & ~np.roll(m, 1, 0)
        img[edge] = mix(img[edge], mix(pal[-1], SUN, .3), .5)
    return m, L

# ---------- dither
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - .47
def dither(img, ncol=40, spread=.15):
    img = np.clip(img, 0, 1); h, w = img.shape[:2]
    pil = Image.fromarray((img * 255).astype(np.uint8))
    pal = np.array(pil.quantize(ncol, method=Image.Quantize.MEDIANCUT, kmeans=3).getpalette()[:ncol * 3]).reshape(-1, 3) / 255
    off = np.tile(B4, (h // 4 + 1, w // 4 + 1))[:h, :w]
    v = img + off[..., None] * spread
    d = ((v[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
    return Image.fromarray((pal[d.argmin(-1)] * 255).astype(np.uint8))

# ---------- palette shared by all scenes (Dan's references)
CREAM = C('fdf6e1'); CREAM2 = C('fbeccb'); PEACH = C('f6d5a8'); SUN = C('fff4d6')
PINK = C('d99a98'); SALMON = C('eca58c'); APRICOT = C('f4bd8a'); CLOUDLIT = C('fde6c4')
HAZE = C('e6d6c0'); MAUVE1 = C('cbb8ab'); MAUVE2 = C('ab9c8f'); MAUVE3 = C('8e8b76')
FOR = [C('1b2517'), C('26351e'), C('344925'), C('4a612d'), C('6a8137'), C('93a148'), C('bdb966')]
FIELD = [C('5b7239'), C('769043'), C('97aa4d'), C('b5bc5c'), C('cfc576'), C('dcc37b')]

def smooth1(a, s):
    if s < .5: return a
    k = np.exp(-.5 * (np.arange(-int(3 * s), int(3 * s) + 1) / s) ** 2); k /= k.sum()
    p = np.pad(a, len(k) // 2, mode='edge'); return np.convolve(p, k, 'valid')

def range_(img, top, seed, lit, dark, sunx, snow=None, haze_a=.3, scales=(1, 2, 4, 7, 12, 20, 32, 50)):
    # mountain faces: slope of the silhouette smoothed more with depth -> triangular facets
    d = np.clip(Y - top[None, :], 0, None)
    S = np.array([np.gradient(smooth1(top, s)) for s in scales])        # (k, W)
    si = np.interp(d * .7, scales, np.arange(len(scales)))
    i0 = np.floor(si).astype(int); i1 = np.minimum(i0 + 1, len(scales) - 1); fr = si - i0
    sl = S[i0, X.astype(int)] * (1 - fr) + S[i1, X.astype(int)] * fr
    sgn = 1 if sunx > .5 else -1
    g = fbm(10, 5, seed, 5, .6)
    G = fbm(30, 3, seed + 3, 4, .55, W * 2, H)
    xa = np.clip(X + W / 2 + d * .9, 0, 2 * W - 1).astype(int); xb = np.clip(X + W / 2 - d * .9, 0, 2 * W - 1).astype(int)
    gul = np.maximum(G[Y.astype(int), xa], G[Y.astype(int), xb])
    l = np.clip(.5 + np.tanh(sl * sgn * 1.8) * .4 + (g - .5) * .3 + (gul - .5) * .9 - d / H * .4, 0, 1)
    col = mix(dark, lit, sm(l * 1.2 - .05))
    if snow is not None:
        sy, slit, sdark = snow
        sn = Y < (sy * H + (g - .5) * H * .12 + np.abs(sl) * 4)
        col = np.where(sn[..., None], mix(sdark, slit, sm(l * 1.3 - .1)), col)
    col = mix(col, HAZE, haze_a + np.clip(d / H, 0, 1) * .25)
    return fill(img, top, col)

def meadow(img, top, seed, c0, c1, y1=1.0, tex=.18):
    v = np.clip((Y - top[None, :]) / ((y1 * H) - top[None, :] + 1e-6), 0, 1)
    n = fbm(12, 30, seed, 4, .6); n2 = fbm(3, 3, seed + 1, 3)
    col = mix(c0, c1, np.clip(v + (n2 - .5) * .8, 0, 1)) * (1 + (n[..., None] - .5) * tex)
    return fill(img, top, col)

def hills():
    hy = .5; img = sky(CREAM, CREAM2, PEACH, hy, .7, SUN, .5)
    img = clouds(img, .26, .48, 11, PINK, SALMON, CLOUDLIT, .6, 3.5, .8)
    img = clouds(img, .42, .50, 4, PINK, APRICOT, CLOUDLIT, .45, 6, 1.6)
    t = (.49 - .03 * np.exp(-((xs - .72) / .1) ** 2) + .008 * f1(5, 2)) * H
    range_(img, t, 3, mix(MAUVE1, SUN, .2), MAUVE2, .8, haze_a=.35)
    t = (.545 + .015 * f1(4, 5) - .02 * xs) * H
    forest(img, t, 6, 900, .8, 1.6, .8, hza=.45, rough=.5)
    t = (.43 + .19 * sm((xs - .02) * 1.35) + .02 * f1(6, 8) - .02 * np.exp(-((xs - .15) / .08) ** 2)) * H
    forest(img, t, 9, 1700, 1.0, 3.0, .8, hza=.08, rough=.8, f=4)
    t2 = (.66 + .02 * f1(3, 12) - .025 * xs) * H
    fields(img, t2, 21, .66, .95)
    clumps(img, 31, t2, 8)
    t3 = (.86 - .07 * sm(1 - xs * 2.2) + .015 * f1(4, 40)) * H
    meadow(img, t3, 41, C('d6c070'), C('8f9a46'))
    t4 = (.95 - .12 * sm((xs - .62) * 3)) * H
    forest(img, t4, 44, 120, 3, 6, .8, rough=.4, rim=False)
    return img

def fields(img, top, seed, y0, y1, pal=FIELD, hza=0):
    m = Y >= top[None, :]
    v = np.clip((Y - top[None, :]) / ((y1 * H) - top[None, :] + 1e-6), 0, 1)
    warp = fbm(2, 2, seed, 3) * 1.2 + xn * .6
    pv = v ** .6 * 8 + warp
    band = np.floor(pv).astype(int)
    plot = np.floor(xn * (6 + band * .3) + fbm(2, 3, seed + 1, 3) * 2 + band * 1.7).astype(int)
    rnd = (np.sin(band * 12.9898 + plot * 78.233 + seed) * 43758.5453) % 1
    P = np.array(pal); k = np.clip(rnd * (len(P) - 1), 0, len(P) - 1.001); i = k.astype(int)
    col = P[i] * (1 - (k - i))[..., None] + P[i + 1] * (k - i)[..., None]
    rows = (np.sin(pv * 34 + xn * 9) > .55) * .06
    col = col * (1 - rows[..., None])
    hedge = (pv % 1) < .1 + v * .04
    col = np.where(hedge[..., None], mix(col, FOR[2], .7), col)
    col = mix(col, HAZE, np.clip(1 - v * 2.5, 0, 1) * .3 + hza)
    img[m] = col[m]
    return m

def clumps(img, seed, top, n=9):
    g = R(seed)
    for k in range(n):
        cx = g.uniform(0, W); cy = top[int(np.clip(cx, 0, W - 1))] + g.uniform(4, H * .22)
        reg = (np.hypot((X - cx) / 2.2, Y - cy) < g.uniform(3, 9) * (cy / H) * 1.6)
        trees(img, reg, 30, seed + k, 1.5, 4.5, FOR[0:6], sizey=lambda y: (y / H - .5) * 2.2)

def valley():
    hy = .45; img = sky(CREAM, CREAM2, PEACH, hy, .42, SUN, .45)
    img = clouds(img, .24, .42, 21, PINK, SALMON, CLOUDLIT, .55, 3.5, .8)
    for i, (b, a, f, sd, tl, lit, dk, hz) in enumerate([
            (.46, .02, 3, 31, .06, MAUVE1, MAUVE2, .55), (.49, .035, 4, 32, -.10, MAUVE1, MAUVE2, .35),
            (.55, .04, 4, 33, -.10, mix(MAUVE2, SUN, .25), MAUVE3, .22)]):
        t = ridge(b, a, f, sd, tilt=tl); range_(img, t, 40 + i, lit, dk, .3, haze_a=hz)
    t = (.60 - .04 * xs + .02 * f1(5, 35)) * H
    forest(img, t, 35, 1100, .8, 1.6, .3, hza=.4, rough=.5)
    t = (.70 - .08 * sm((xs - .25) * 1.5) + .02 * f1(6, 36)) * H
    forest(img, t, 37, 1600, 1, 3.2, .3, hza=.05, rough=.8)
    t2 = (.77 + .02 * f1(4, 38) + .02 * xs) * H
    fields(img, t2, 39, .77, 1.15, pal=[C('7d9a44'), C('93ab4c'), C('a9b955'), C('c2c262'), C('d1c672')])
    # river: an S curve coming toward us, reflecting the sky
    yy = np.clip((Y / H - .79) / .21, 0, 1)
    cx = .12 + .25 * yy + .12 * np.sin(yy * 5.5 + .5) - .3 * yy ** 2
    w = .012 + .09 * yy ** 1.3
    riv = (np.abs(xn - cx) < w) & (Y > t2[None] + 4)
    bank = (np.abs(xn - cx) < w + .006 + .01 * yy) & (Y > t2[None] + 3) & ~riv
    rc = mix(C('f3ead6'), C('b7c1b8'), np.clip((np.abs(xn - cx) / (w + 1e-6)) ** 2 + fbm(3, 40, 42, 3) * .3, 0, 1))
    img[bank] = mix(img[bank], FOR[2], .6); img[riv] = rc[riv]
    clumps(img, 43, t2, 6)
    return img

def mountains():
    hy = .45; img = sky(CREAM, CREAM2, PEACH, hy, .3, SUN, .45)
    img = clouds(img, .12, .30, 51, PINK, SALMON, CLOUDLIT, .5, 3.5, .8)
    r = np.abs(f1(5, 52, 6, .55))
    t = (.52 - .26 * (1 - r) ** 2.2 - .05 * np.exp(-((xs - .62) / .12) ** 2)) * H
    range_(img, t, 53, C('e0c4b2'), C('6f6a80'), .25, snow=(.36, C('fffaf0'), C('c4b9d0')), haze_a=.1)
    t = ridge(.58, .03, 4, 54, tilt=.06); range_(img, t, 55, mix(MAUVE2, SUN, .2), MAUVE3, .25, haze_a=.3)
    t = (.64 + .04 * f1(4, 56) + .05 * xs) * H
    forest(img, t, 57, 1100, .9, 2, .3, hza=.3, rough=.6)
    t = (.75 - .06 * sm((.7 - xs) * 2) + .02 * f1(5, 58)) * H
    forest(img, t, 59, 1300, 1.2, 3.4, .3, hza=.0, rough=.8)
    t2 = (.88 - .02 * xs + .015 * f1(4, 60)) * H
    fields(img, t2, 61, .88, 1.2, pal=[C('8a9a45'), C('a5b04f'), C('c1bf60'), C('d4c672')])
    clumps(img, 62, t2, 5)
    return img

def ocean():
    hy = .56; img = sky(CREAM, CREAM2, PEACH, hy, .42, SUN, .5)
    img = clouds(img, .28, .47, 61, PINK, SALMON, CLOUDLIT, .58, 3.5, .8)
    img = clouds(img, .45, .53, 62, PINK, APRICOT, CLOUDLIT, .38, 6, 1.6)
    d = np.clip((Y - hy * H) / (H * (1 - hy)), 0, 1)
    sea = mix(C('ead6bd'), C('79979a'), d ** .6)
    wn = fbm(5, 30, 63, 4, .6); wav = np.sin((d ** .45) * 150 + wn * 10)
    gl = np.exp(-((xn - .42) / (.03 + d * .16)) ** 2)
    sea = mix(sea, C('fff3d8'), gl * (wav > .3) * .95)
    sea = mix(sea, C('5f7f84'), (wav < -.7) * (.2 + d * .3))
    fill(img, np.full(W, hy * H), sea)
    # far island
    isl = np.exp(-((xs - .18) / .07) ** 2) * .025 + np.exp(-((xs - .26) / .04) ** 2) * .012
    t = (hy - isl) * H; t = np.where(isl > .002, t, H + 1)
    fill(img, t, mix(MAUVE1, HAZE, .3), Y <= hy * H)
    # headland: forest over a cliff, with foam at its foot
    t = (.40 + .30 * sm((.80 - xs) * 4.5) + .02 * f1(6, 65)) * H
    t = np.where(xs > .58, t, H + 1)
    foot = (hy + .035 + .05 * sm((xs - .6) * 3)) * H
    m, L = forest(img, t, 66, 1100, 1.5, 4.5, .3, rough=.8, extra=Y < foot[None] - 6)
    cl = (Y >= foot[None] - 6) & (Y < foot[None]) & (Y >= t[None])
    cc = mix(C('6d6673'), C('b9a39a'), fbm(20, 6, 67, 3))
    img[cl] = cc[cl]
    foam = (Y >= foot[None]) & (Y < foot[None] + 1.5) & (xn > .58)
    img[foam] = C('fff6e4')
    return img

SC = dict(hills=hills, valley=valley, mountains=mountains, ocean=ocean)
if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for n in (sys.argv[2:] or SC):
        im = SC[n](); dither(im).save(f'{out}/{n}.png'); Image.fromarray((np.clip(im, 0, 1) * 255).astype(np.uint8)).save(f'{out}/{n}-raw.png')
