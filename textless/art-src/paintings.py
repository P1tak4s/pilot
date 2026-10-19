"""The paintings set: Bob Ross style landscapes, finished and still, with small living details on top: glints on
the water, drifting clouds, chimney smoke, snow, falling leaves, gulls.

The paintings are built in his order (sky in criss-cross strokes, knife mountains, tapped trees, water, the big trees)
and every pixel keeps the time its stroke reaches it. Painting.svg() can still play that back stroke by stroke; the
set ships the still version (Painting.still()), since a card that opens mid-loop would show half a painting.
Run: python paintings.py -> ../plugin/hooks/scenes/paintings/*.svg
"""
import math
import random

import numpy as np

import pixkit
from pixkit import BAYER4, H, W, Pix, even, hexrgb, hops, num, png_uri, timeline, write

STEP = 0.4      # seconds per reveal step
PAINT = 24.0    # the painting is done by then
HOLD = 9.0      # then it stays up, finished
FADE = 1.2      # fades out in steps
GAP = 0.6       # a moment of empty card before the next one starts
TOTAL = PAINT + HOLD + FADE + GAP

YS, XS = np.mgrid[0:H, 0:W]
BAY = BAYER4[YS % 4, XS % 4]


def rgb(c):
    return np.array(hexrgb(c), dtype=float)


def ramp(colors, t):
    """Colours along t (0..1, an HxW array) with an ordered dither between neighbours. Returns HxWx3."""
    pal = np.array([hexrgb(c) for c in colors], dtype=float)
    i = np.clip((np.clip(t, 0, 1) * (len(colors) - 1) + BAY - 0.5).astype(int), 0, len(colors) - 1)
    return pal[i]


def smooth_noise(rng, cell, lo=0.0, hi=1.0):
    """Blocky value noise: one random value per cell x cell square, read back per pixel."""
    g = rng.random((H // cell + 2, W // cell + 2))
    return lo + (hi - lo) * g[YS // cell, XS // cell]


# ---------- stroke timing: when each pixel gets painted ----------
def crisscross(t0, t1, y0, y1, band=6):
    """Bob's sky: rows of X strokes from the top down, each row crossing the canvas with a slanted front."""
    row = np.clip((YS - y0) // band, 0, None)
    rows = max(1, math.ceil((y1 - y0) / band))
    slant = np.where(row % 2 == 0, 1, -1) * ((YS - y0) % band) * 1.5
    p = np.clip((XS + slant + band * 1.5) / (W + band * 3), 0, 1)
    return t0 + (row + p) / rows * (t1 - t0)


def sweep(t0, t1, y0, y1):
    """Water and snow: flat strokes pulled sideways, one line after another."""
    n = max(1, y1 - y0)
    return t0 + np.clip(((YS - y0) + XS / W) / n, 0, 1) * (t1 - t0)


def knife(t0, t1, x0, x1, width=5):
    """Palette knife: strips left to right, each pulled down from the ridge."""
    g = np.clip((XS - x0) // width, 0, None)
    n = max(1, math.ceil((x1 - x0) / width))
    return t0 + np.clip((g + YS / H) / n, 0, 1) * (t1 - t0)


def tap(t0, t1, top, bottom):
    """Little trees: tapped in from the top down."""
    return t0 + np.clip((YS - top) / max(1, bottom - top), 0, 1) * (t1 - t0)


def dab(rng, t0, t1, cell=3):
    """Bushes, leaves, foam: dabs in no particular order."""
    return t0 + smooth_noise(rng, cell) * (t1 - t0)


# ---------- the canvas ----------
class Painting:
    def __init__(self, seed):
        self.rng = np.random.default_rng(seed)
        self.r = random.Random(seed)
        self.layers = []  # (mask, colours HxWx3, times HxW, live): live draws an animated layer in the still
        self.live = []    # overlays on top of the still, each a function of the finished painting

    def paint(self, mask, color, times=0.0, live=None):
        if isinstance(color, str):
            color = np.broadcast_to(rgb(color), (H, W, 3))
        times = np.broadcast_to(np.asarray(times, dtype=float), (H, W))
        self.layers.append((mask.copy(), np.array(color), np.array(times), live))
        return len(self.layers) - 1

    def composite(self):
        img = np.zeros((H, W, 3))
        for m, c, _, _ in self.layers:
            img[m] = c[m]
        return img

    def visible(self, i):
        """The pixels of layer i that nothing painted later covers."""
        m = self.layers[i][0].copy()
        for lm, _, _, _ in self.layers[i + 1:]:
            m &= ~lm
        return m

    def still(self):
        """The finished painting: still layers merged into as few PNGs as possible, animated layers in their place."""
        out, seg = [], None
        for m, c, _, live in self.layers:
            if live is None:
                if seg is None:
                    seg = [np.zeros((H, W, 3)), np.zeros((H, W), bool)]
                seg[0][m] = c[m]
                seg[1] |= m
            else:
                if seg:
                    out.append(image(seg[1], seg[0]))
                    seg = None
                out.append(live(m, c))
        if seg:
            out.append(image(seg[1], seg[0]))
        return pixkit.scene(''.join(out) + ''.join(f(self) for f in self.live))

    def svg(self):
        steps = {}
        for m, c, t, _ in self.layers:
            k = np.where(m, np.maximum(1, np.ceil(t / STEP)).astype(int), 0)
            for s in np.unique(k[m]):
                sel = k == s
                img = steps.setdefault(int(s), np.zeros((H, W, 4), np.uint8))
                img[sel, :3] = np.clip(c[sel], 0, 255).astype(np.uint8)
                img[sel, 3] = 255
        from PIL import Image
        off = (PAINT + HOLD + FADE) / TOTAL
        out = []
        for s in sorted(steps):
            a = steps[s]
            ys, xs = np.nonzero(a[:, :, 3])
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            crop = Image.fromarray(a[y0:y1, x0:x1], 'RGBA')
            on = min(s * STEP, PAINT) / TOTAL
            out.append(f'<g opacity="0"><animate attributeName="opacity" calcMode="discrete" values="0;1;0" '
                       f'keyTimes="0;{num(on)};{num(off)}" dur="{num(TOTAL)}s" repeatCount="indefinite"/>'
                       f'<image href="{png_uri(crop, 32)}" x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" '
                       f'style="image-rendering:pixelated"/></g>')
        f0 = PAINT + HOLD
        kts = [0, f0, f0 + FADE / 3, f0 + 2 * FADE / 3, f0 + FADE]
        fade = (f'<animate attributeName="opacity" calcMode="discrete" values="1;0.66;0.33;0;1" '
                f'keyTimes="{";".join(num(k / TOTAL) for k in kts)}" dur="{num(TOTAL)}s" repeatCount="indefinite"/>')
        return pixkit.scene(f'<g>{fade}{"".join(out)}</g>')


# ---------- living details ----------
def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in np.clip(c, 0, 255))


def image(m, c):
    from PIL import Image
    a = np.zeros((H, W, 4), np.uint8)
    a[m, :3] = np.clip(c[m], 0, 255).astype(np.uint8)
    a[m, 3] = 255
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    uri = png_uri(Image.fromarray(a[y0:y1, x0:x1], 'RGBA'))
    return (f'<image href="{uri}" x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" '
            f'style="image-rendering:pixelated"/>')


def mask_pix(m, c):
    p = Pix()
    for y, x in np.argwhere(m):
        p.px(x, y, c if isinstance(c, str) else hexc(c[y, x]))
    return p


def drift(m, c):
    """Clouds: drift a few pixels right and back, one pixel every few seconds."""
    return hops([(0, 0), (1, 0), (2, 0), (3, 0), (2, 0), (1, 0)], even(6, 21.0), image(m, c))


def sparkle(vis, rng, n=9, frames=6, dur=3.0, color='#eef4f8'):
    """Light catching the water: short sideways glints that come and go."""
    ok = vis & np.roll(vis, -1, 1) & np.roll(vis, -2, 1) & (YS % 2 == 0)
    spots = np.argwhere(ok)
    out = []
    for _ in range(frames):
        p = Pix()
        for y, x in spots[rng.choice(len(spots), n, replace=False)]:
            p.rect(x, y, 2 + rng.integers(0, 2), 1, color if rng.random() < 0.5 else color + '@0.6')
        out.append(p.svg())
    return timeline(out, even(frames, dur))


# ---------- shapes ----------
def ridge(peaks, rng, jag=1.0):
    """Top edge of a range: each peak (x, y, slope) is a cone, the range is their lowest envelope, roughened."""
    x = np.arange(W)
    tops = np.array([py + s * np.abs(x - px) for px, py, s in peaks])
    top = tops.min(axis=0)
    walk = np.cumsum(rng.choice([-1, 0, 0, 1], W)) * 0.35 * jag
    walk -= np.convolve(walk, np.ones(9) / 9, mode='same')
    return top + walk, tops.argmin(axis=0)


def mountain(P, peaks, base, dark, lit, shade, t0, t1, mist=None, snow=0.55):
    top, who = ridge(peaks, P.rng)
    body = (YS >= top[XS]) & (YS < base)
    depth = (YS - top[XS]) / np.maximum(1, base - top[XS])
    if mist:
        col = ramp([dark, dark, dark, mist], np.clip((depth - 0.45) / 0.55, 0, 1))
    else:
        col = np.broadcast_to(rgb(dark), (H, W, 3)).copy()
    P.paint(body, col, knife(t0, t0 + (t1 - t0) * 0.6, 0, W))
    # The knife highlights: lit on the side facing the light (left of each peak), shade on the other. The snow line
    # wanders, so it reads as pulled paint, not a ruler.
    px = np.array([p[0] for p in peaks])[who][XS]
    knots = P.rng.random(W // 6 + 2)
    wander = np.interp(np.arange(W), np.arange(len(knots)) * 6, knots)
    reach = snow * (0.55 + 0.7 * wander[XS]) + (BAY - 0.5) * 0.08
    hi = body & (depth < reach)
    lit_side = XS < px
    P.paint(hi & lit_side, ramp(lit, depth / snow), knife(t0 + (t1 - t0) * 0.6, t1, 0, W, 4))
    P.paint(hi & ~lit_side, ramp(shade, depth / snow), knife(t0 + (t1 - t0) * 0.6, t1, 0, W, 4))


def evergreen(P, cx, top, bottom, w, dark, light, t0, t1, snow=None):
    """A tall pine: a sawtooth of branch tiers. Light catches the top left edge of each tier, snow sits on top."""
    h = bottom - top
    m = np.zeros((H, W), bool)
    for y in range(top, min(bottom, H)):
        rel = (y - top) / h
        tier = ((y - top) % 4) / 3
        half = w / 2 * rel ** 0.8 * (0.35 + 0.65 * tier) + P.r.choice([0, 0, 0.5, -0.5])
        x0, x1 = int(round(cx - half)), int(round(cx + half))
        m[y, max(0, x0):min(W, x1 + 1)] = True
    m[top:min(bottom, H), cx] = True
    above = np.zeros_like(m)
    above[1:] = m[:-1]
    edge = m & ~above & (XS != cx)
    col = np.broadcast_to(rgb(dark), (H, W, 3)).copy()
    noise = P.rng.random((H, W))
    col[edge & (XS < cx) & (noise < 0.8)] = rgb(light)
    if snow:
        below = np.zeros_like(edge)
        below[1:] = edge[:-1]
        col[(edge & (noise < 0.8)) | (below & m & (XS < cx) & (noise < 0.45))] = rgb(snow)
    P.paint(m, col, tap(t0, t1, top, bottom))
    trunk = (XS == cx) & (YS >= bottom) & (YS < bottom + 2)
    P.paint(trunk, '#3a2616', t1)


def blob(P, cx, cy, r, n, squash=1.0):
    """A cluster of circles, the shape of a bush, a cloud or a tree crown."""
    m = np.zeros((H, W), bool)
    for _ in range(n):
        a = P.r.uniform(0, 2 * math.pi)
        d = P.r.uniform(0, r * 0.6)
        bx, by, br = cx + math.cos(a) * d, cy + math.sin(a) * d * squash, P.r.uniform(r * 0.35, r * 0.6)
        m |= ((XS - bx) ** 2 + ((YS - by) / squash) ** 2) <= br * br
    m |= ((XS - cx) ** 2 + ((YS - cy) / squash) ** 2) <= (r * 0.55) ** 2
    return m


def lit_ramp(cx, cy, r, P, colors, lx=-0.6, ly=-0.8):
    """Colours lit from the upper left, with dab-sized noise so it reads as paint, not a gradient."""
    d = ((XS - cx) * lx + (YS - cy) * ly) / max(1, r)
    t = 0.5 + 0.45 * d + (smooth_noise(P.rng, 2) - 0.5) * 0.5
    return ramp(colors, t)


def reflect(P, y0, y1, axis, darken=0.75, tint='#1d3550', mix=0.3, lines='#dfe8f0'):
    """The lake: what sits above the shore, flipped and darkened, with sideways highlight lines."""
    img = P.composite()
    src = np.clip(2 * axis - YS, 0, H - 1)
    col = img[src, XS] * darken * (1 - mix) + rgb(tint) * mix
    water = (YS >= y0) & (YS < y1)
    i = P.paint(water, col, sweep(PAINT_T['water'][0], PAINT_T['water'][1], y0, y1))
    P.live.append(lambda P: sparkle(P.visible(i), P.rng))
    ln = water & (P.rng.random((H, W // 4 + 2))[YS, (XS + YS * 3) // 4 % (W // 4 + 2)] > 0.9) & (YS % 2 == 0)
    P.paint(ln, lines, PAINT_T['water'][1])


PAINT_T = {}


def clouds(P, spots, t0, t1, top='#f6f4ee', bottom='#b9bccb'):
    for cx, cy, r in spots:
        m = blob(P, cx, cy, r, 7, squash=0.45)
        t = (YS - (cy - r * 0.5)) / max(1, r)
        P.paint(m, ramp([top, top, bottom], t), dab(P.rng, t0, t1), live=drift)


# ---------- the paintings ----------
def mountain_lake():
    P = Painting(11)
    P.paint(YS < 54, ramp(['#1b3a6b', '#28508a', '#3a6aa3', '#5a88b8', '#86a9c8', '#b9c9cf', '#ece0b0'], YS / 50),
            crisscross(0.4, 4.0, 0, 54))
    clouds(P, [(30, 12, 9), (92, 9, 8), (64, 20, 6)], 4.0, 5.4)
    mountain(P, [(22, 31, 0.75), (54, 27, 0.7), (104, 29, 0.8)], 52, '#8a93b6', ['#d9dcea', '#b7bdd6'],
             ['#a9b1cc', '#8f98ba'], 5.4, 7.0, snow=0.3)
    mountain(P, [(70, 9, 0.78), (44, 24, 0.85), (92, 25, 0.9)], 52, '#3b4466', ['#fbfbfd', '#e2e6f0', '#c4cbe0'],
             ['#9aa7cb', '#7c89b0', '#65729b'], 7.0, 11.5, mist='#9fadc8')
    # the far tree line at the foot of the mountains
    base = np.full(W, 52.0)
    for x in range(W):
        if P.r.random() < 0.45:
            base[x] -= P.r.choice([2, 3, 4, 5])
    line = (YS >= base[XS]) & (YS < 54)
    P.paint(line, ramp(['#20383c', '#2f4f55'], (YS - 46) / 8), tap(11.5, 13.0, 46, 54))
    PAINT_T['water'] = (13.0, 15.5)
    reflect(P, 54, 71, 53, darken=0.95, tint='#3d6894', mix=0.3)
    gt = 57 + 11 * np.exp(-((XS[0] - 62) / 19.0) ** 2) - np.clip((XS[0] - 90) / 14, 0, 2)
    gt = gt + np.where(P.rng.random(W) < 0.3, -1, 0)
    ground = YS >= gt[XS]
    shade = (YS - gt[XS]) / 6 + (smooth_noise(P.rng, 2) - 0.5) * 0.9
    P.paint(ground, ramp(['#c3c25a', '#86a038', '#4f6e26', '#2b4220', '#1b2a17'], shade), dab(P.rng, 15.5, 18.5))
    evergreen(P, 102, 38, 66, 9, '#17271d', '#3e5e2c', 18.5, 19.6)
    evergreen(P, 27, 30, 70, 12, '#17271d', '#3e5e2c', 19.6, 20.9)
    evergreen(P, 113, 18, 74, 22, '#122019', '#3a5a2a', 20.9, 22.3)
    evergreen(P, 14, 10, 76, 26, '#122019', '#3a5a2a', 22.3, 23.8)
    return P


def winter_cabin():
    P = Painting(23)
    P.paint(YS < 52, ramp(['#2a2b55', '#4a3f73', '#7a4f7f', '#b0607a', '#de8a74', '#f2b878', '#f7dca0'], YS / 46),
            crisscross(0.4, 4.0, 0, 52))
    glow = ((XS - 86) ** 2 + (YS - 38) ** 2) <= 25
    P.paint(glow, ramp(['#fff6d8', '#fde4a6'], np.sqrt((XS - 86) ** 2 + (YS - 38) ** 2) / 5), tap(4.0, 4.8, 33, 43))
    mountain(P, [(28, 34, 0.55), (78, 29, 0.5), (122, 35, 0.6)], 52, '#6b5f8f', ['#f0d7dc', '#d8b9c8'],
             ['#9d8fb6', '#857aa6'], 4.8, 7.6, mist='#b49ab4', snow=0.5)
    base = np.full(W, 52.0)
    for x in range(W):
        if P.r.random() < 0.5:
            base[x] -= P.r.choice([2, 3, 4, 6])
    P.paint((YS >= base[XS]) & (YS < 53), '#2c2840', tap(7.6, 9.0, 45, 53))
    rolls = 51 + 2 * np.sin(XS[0] / 13) + np.where(XS[0] > 80, (XS[0] - 80) / 12, 0)
    snow = YS >= rolls[XS]
    sh = (YS - rolls[XS]) / 28 + (smooth_noise(P.rng, 3) - 0.5) * 0.35 + np.abs(XS - 64) / 160
    P.paint(snow, ramp(['#f6f2f4', '#e3e1ee', '#c9cce2', '#a9afd0'], sh), sweep(9.0, 11.6, 50, 80))
    # the cabin
    cab = np.zeros((H, W), bool)
    cab[47:59, 54:73] = True
    col = np.broadcast_to(rgb('#5a3b27'), (H, W, 3)).copy()
    col[(YS % 3 == 0) & cab] = rgb('#3e281b')
    col[(YS >= 50) & (YS < 54) & (XS >= 57) & (XS < 61)] = rgb('#ffd36b')
    col[(YS >= 51) & (YS < 59) & (XS >= 65) & (XS < 69)] = rgb('#2a1a12')
    P.paint(cab, col, tap(11.6, 12.8, 47, 59))
    roof = (YS >= 39) & (YS < 48) & (np.abs(XS - 63.5) <= (YS - 39) * 1.25 + 1.5)
    P.paint(roof, ramp(['#fbfbfd', '#e3e3ee', '#b7b9d4'], (YS - 39) / 9 + (XS - 52) / 40), tap(12.8, 13.8, 39, 48))
    P.paint((XS >= 67) & (XS < 70) & (YS >= 37) & (YS < 42), '#4a3426', 13.8)
    path = (YS >= 59) & (np.abs(XS - (67 - (YS - 59) * 0.9 + 3 * np.sin((YS - 59) / 4))) <= 2 + (YS - 59) * 0.35)
    P.paint(path, ramp(['#b9bcd6', '#9aa0c4'], (YS - 59) / 21), sweep(13.8, 15.0, 59, 80))
    evergreen(P, 96, 36, 62, 9, '#1b2a2a', '#36504a', 15.0, 16.2, snow='#eef0f6')
    evergreen(P, 30, 28, 66, 12, '#1b2a2a', '#36504a', 16.2, 17.6, snow='#eef0f6')
    evergreen(P, 110, 16, 72, 20, '#152222', '#30484a', 17.6, 19.6, snow='#eef0f6')
    evergreen(P, 16, 10, 74, 22, '#152222', '#30484a', 19.6, 21.8, snow='#eef0f6')
    bush = blob(P, 44, 60, 4, 4, 0.7) | blob(P, 84, 62, 3, 4, 0.7)
    P.paint(bush, lit_ramp(64, 55, 20, P, ['#1d2a26', '#2f4440', '#e9ebf4']), dab(P.rng, 21.8, 23.6))
    P.live += [lambda P: smoke(68, 36), lambda P: window(), lambda P: snowfall(P.rng)]
    return P


def smoke(x, y, frames=8, dur=4.0):
    out = []
    for f in range(frames):
        p = Pix()
        for j in range(3):
            a = (f + j * frames // 3) % frames
            size = 2 if a < frames // 2 else 1
            p.rect(x + a // 2 + (a % 3 == 0), y - a * 2, size, size, f'#dcd8e6@{num(0.85 - a * 0.09)}')
        out.append(p.svg())
    return timeline(out, even(frames, dur))


def window():
    warm = Pix().rect(57, 50, 4, 4, '#ffbf4a').rect(58, 51, 2, 2, '#ffe08a').svg()
    return timeline(['', warm], [(0, 1.4), (1, 0.15), (0, 0.6), (1, 0.1), (0, 2.2), (1, 0.2), (0, 1.0)])


def snowfall(rng, n=14, frames=40, dur=10.0):
    flakes = [(int(rng.integers(8, W - 8)), int(rng.integers(0, H))) for _ in range(n)]
    out = []
    for f in range(frames):
        p = Pix()
        for k, (x0, y0) in enumerate(flakes):
            y = (y0 + f * 2) % H
            p.px(x0 + round(math.sin(y / 7 + k)), y, '#ffffff' if k % 3 else '#ffffff@0.6')
        out.append(p.svg())
    return timeline(out, even(frames, dur))


def sunset_sea():
    P = Painting(37)
    P.paint(YS < 42, ramp(['#3b2a5a', '#6a3762', '#a8476a', '#d86a62', '#f09a5c', '#f8c870', '#fde9b0'], YS / 40),
            crisscross(0.4, 4.0, 0, 42))
    sun = ((XS - 62) ** 2 + (YS - 36) ** 2) <= 42
    P.paint(sun, ramp(['#fffaf0', '#fff0c4', '#fde0a0'], np.sqrt((XS - 62) ** 2 + (YS - 36) ** 2) / 7),
            tap(4.0, 4.8, 29, 42))
    st = np.zeros((H, W), bool)
    for y, xa, xb in [(13, 10, 50), (15, 24, 70), (19, 70, 118), (22, 84, 124), (17, 4, 30), (25, 30, 62)]:
        st |= (YS == y) & (XS >= xa) & (XS < xb) & ((XS + y) % 9 != 0)
        st |= (YS == y + 1) & (XS >= xa + 4) & (XS < xb - 6)
    P.paint(st, ramp(['#7a3a64', '#94506e'], (XS % 7) / 7), sweep(4.8, 6.0, 12, 27))
    sea = YS >= 42
    sh = (YS - 42) / 38 + (smooth_noise(P.rng, 2) - 0.5) * 0.25
    P.paint(sea, ramp(['#4d6a7c', '#33576a', '#244458', '#18303f'], sh), sweep(6.0, 9.0, 42, 80))
    dashes = P.rng.random((H, W // 3 + 2))[YS, ((XS + YS * 2) // 3) % (W // 3 + 2)]
    path = sea & (np.abs(XS - 62) <= 2 + (YS - 42) * 0.45) & (dashes > 0.4) & ((YS % 2) == 0)
    cone = sea & (np.abs(XS - 62) <= 2 + (YS - 42) * 0.45) & ((YS % 2) == 0)

    def shimmer(m, c):
        frames = [m, np.roll(m, 2, 1) & cone, np.roll(m, -2, 1) & cone, np.roll(m, 1, 1) & cone]
        cc = ramp(['#fde9b0', '#f8c870', '#e09058'], (YS - 42) / 30 + BAY * 0.3)
        return timeline([mask_pix(f, cc).svg() for f in frames], even(4, 2.0))
    P.paint(path, ramp(['#fde9b0', '#f8c870', '#e09058'], (YS - 42) / 30 + BAY * 0.3), sweep(9.0, 10.4, 42, 80),
            live=shimmer)
    swell = sea & (((YS - 42) % 5) == 3) & (smooth_noise(P.rng, 4) > 0.5)
    P.paint(swell, '#5f8c96', sweep(10.4, 11.4, 42, 80))
    # the big wave, curling over from the right
    crest = 47 + ((XS - 104) / 14.0) ** 2 * 6
    body = (XS >= 78) & (YS >= crest) & (YS < 66) & ~((XS > 112) & (YS < 54))
    wv = (YS - crest) / 16 + (XS - 104) / 70
    P.paint(body, ramp(['#8fd0bd', '#5aa79c', '#2f7480', '#1d4c5c'], wv), knife(11.4, 14.0, 78, W))
    foam = body & ((YS - crest < 2.5) | ((XS > 106) & (YS - crest < 6) & (smooth_noise(P.rng, 2) > 0.4)))
    def churn(m, c):
        return timeline([mask_pix(m, c).svg(), mask_pix(m, np.roll(c, 1, 1)).svg(),
                         mask_pix(m, np.roll(c, -1, 0)).svg()], even(3, 1.5))
    P.paint(foam, ramp(['#ffffff', '#e6eeea', '#b8cfcc'], smooth_noise(P.rng, 1)), dab(P.rng, 14.0, 16.0, 2),
            live=churn)
    spray = (YS < crest) & (YS > crest - 5) & (XS > 96) & (XS < 124) & (smooth_noise(P.rng, 1) > 0.8)
    P.paint(spray, '#f2f6f2', dab(P.rng, 16.0, 16.8, 1))
    # rocks at the front left, foam around them
    rock = blob(P, 30, 67, 11, 6, 0.6) | blob(P, 48, 71, 6, 4, 0.6)
    P.paint(rock, lit_ramp(34, 67, 14, P, ['#140e10', '#2a1e20', '#4a3a3a', '#7a5f58']), tap(16.8, 20.0, 60, 80))
    ring = blob(P, 32, 67, 14, 6, 0.6) & ~rock & (YS > 61)
    P.paint(ring & (smooth_noise(P.rng, 1) > 0.3), ramp(['#ffffff', '#d4e2e0'], smooth_noise(P.rng, 1)),
            dab(P.rng, 20.0, 22.0, 2))
    P.live.append(lambda P: gulls([(36, 18), (44, 22)]))
    return P


def gulls(spots):
    up, down = [(-2, -1), (-1, -1), (0, 0), (1, -1), (2, -1)], [(-2, 1), (-1, 0), (0, 0), (1, 0), (2, 1)]
    frames = []
    for k in range(2):
        p = Pix()
        for i, (gx, gy) in enumerate(spots):
            p.put(up if (k + i) % 2 else down, '#3b2440', gx, gy)
        frames.append(p.svg())
    flap = timeline(frames, even(2, 0.8))
    return hops([(0, 0), (1, 0), (2, -1), (3, -1), (4, 0), (3, 0), (2, 1), (1, 1)], even(8, 12.0), flap)


def autumn():
    P = Painting(51)
    P.paint(YS < 52, ramp(['#2d5a96', '#3f6fa8', '#6390bd', '#97b5cf', '#cfd6d6', '#ecdfbf'], YS / 48),
            crisscross(0.4, 4.0, 0, 52))
    clouds(P, [(40, 10, 8), (96, 14, 7)], 4.0, 5.2)
    mountain(P, [(30, 32, 0.6), (82, 28, 0.55), (120, 34, 0.7)], 52, '#7b8aa0', ['#c4cbd8', '#a9b2c4'],
             ['#93a0b4', '#7f8ca4'], 5.2, 7.2, snow=0.25, mist='#a6b0be')
    far = np.zeros((H, W), bool)
    for x in range(8, 124, 5):
        far |= blob(P, x + P.r.uniform(-1, 1), 48 + P.r.uniform(-1, 1), P.r.uniform(3, 5), 3, 0.8)
    far &= YS < 53
    P.paint(far, ramp(['#c0a070', '#a88a5e', '#8a6e50', '#6e5a48'], (YS - 43) / 10 + smooth_noise(P.rng, 2) * 0.3),
            dab(P.rng, 7.2, 9.0, 2))
    PAINT_T['water'] = (9.0, 11.4)
    reflect(P, 53, 62, 52, darken=0.8, tint='#264a6a', mix=0.25)
    gt = 61 + np.where(XS[0] < 50, -(50 - XS[0]) / 10, 0) + np.where(XS[0] > 84, -(XS[0] - 84) / 9, 0)
    gt = gt + np.where(P.rng.random(W) < 0.3, -1, 0)
    ground = YS >= gt[XS]
    sh = (YS - gt[XS]) / 10 + (smooth_noise(P.rng, 2) - 0.5) * 0.8
    P.paint(ground, ramp(['#d2b24a', '#a8862e', '#7a6a2a', '#4f4420', '#33291a'], sh), dab(P.rng, 11.4, 14.0))
    path = (YS >= 62) & (np.abs(XS - (66 + (YS - 62) * 0.6 - 4 * np.sin((YS - 62) / 5))) <= 1 + (YS - 62) * 0.45)
    P.paint(path, ramp(['#d8c29a', '#b89c76', '#977c5c'], (YS - 62) / 18 + BAY * 0.2), sweep(14.0, 15.2, 62, 80))
    leaves = ['#4a1a10', '#8a2a18', '#c4501c', '#e08a2a', '#f2c24a']
    for i, (cx, cy, r, tw) in enumerate([(88, 56, 6, 64), (40, 57, 7, 66), (110, 52, 14, 76), (18, 54, 16, 78)]):
        t0 = 15.2 + i * 2.2
        trunk = (np.abs(XS - cx) <= (1 if r > 8 else 0)) & (YS >= cy) & (YS < tw)
        for k in (-1, 1):
            trunk |= (np.abs(XS - (cx + k * (YS - cy) * -0.8)) < 0.6) & (YS >= cy - r * 0.4) & (YS < cy + 2)
        P.paint(trunk, '#3a2616', tap(t0, t0 + 0.5, cy - r, tw))
        crown = blob(P, cx, cy - r * 0.75, r, 9, 0.85)
        P.paint(crown, lit_ramp(cx, cy - r * 0.75, r, P, leaves), dab(P.rng, t0 + 0.5, t0 + 2.2, 2))
    P.live.append(lambda P: falling_leaves([(18, 46, 16), (110, 45, 14), (40, 52, 7), (88, 51, 6)], leaves[1:]))
    return P


def falling_leaves(crowns, colors, frames=32, dur=8.0):
    """A few leaves let go of each crown and drift down, swaying, to the grass."""
    out = []
    for f in range(frames):
        p = Pix()
        for i, (cx, y0, r) in enumerate(crowns):
            for j in range(2 if r > 8 else 1):
                a = (f + i * 7 + j * 16) % frames
                y = y0 + a * (78 - y0) / frames
                x = cx - r // 3 + j * r // 2 + a // 5 + round(1.5 * math.sin(a / 2.5))
                p.px(x, y, colors[(i + j) % len(colors)])
        out.append(p.svg())
    return timeline(out, even(frames, dur))


if __name__ == '__main__':
    for name, fn in [('mountain-lake', mountain_lake), ('winter-cabin', winter_cabin), ('sunset-sea', sunset_sea),
                     ('autumn', autumn)]:
        write(f'paintings/{name}', fn().still())
