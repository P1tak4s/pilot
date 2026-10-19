"""Builds the meadow scene: Clawd lying in anime-style pixel grass under a big sky.

Layers are drawn on a small pixel grid and embedded as PNG data URIs in one SVG, so the
card scales them up with hard pixel edges. The edges fade to nothing with an ordered
(Bayer) dither, so the picture breaks into pixels instead of blurring out.
Run: python meadow.py  -> ../plugin/hooks/scenes/meadow.svg and a preview.html here.
"""
import base64
import io
import math
import os
import random

import numpy as np
from PIL import Image

W, H = 128, 80
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'plugin', 'hooks', 'scenes', 'scenery')
rng = random.Random(7)

BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def bayer(x, y):
    return BAYER4[y % 4, x % 4]


def png_uri(img):
    buf = io.BytesIO()
    # A palette image keeps the file small; RGBA layers keep their own alpha.
    if img.mode == 'RGBA':
        img = img.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    img.save(buf, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


# ---------- sky ----------
SKY = [hexrgb(c) for c in ['#2a55a8', '#3266b8', '#3b77c6', '#4a88d0', '#5d99d9', '#76abe1', '#93bfe8', '#b4d3ef']]
HORIZON = 52


def sky_layer():
    img = Image.new('RGBA', (W, H))
    px = img.load()
    for y in range(H):
        t = min(1.0, y / HORIZON) * (len(SKY) - 1)
        for x in range(W):
            i = int(t + bayer(x, y) - 0.5)
            px[x, y] = SKY[max(0, min(len(SKY) - 1, i))] + (255,)
    return img


# ---------- clouds (a band twice the width, drifting left and wrapping) ----------
CLOUD_LIGHT = hexrgb('#f6f7fc')
CLOUD_MID = hexrgb('#dfe3f4')
CLOUD_SHADE = hexrgb('#b9c2e3')
CLOUD_DEEP = hexrgb('#98a3d2')


def cloud_layer():
    cw = W * 2
    mask = np.zeros((H, cw), bool)
    shade = np.zeros((H, cw))
    # Cumulus heaps: a flat-ish base with puffs stacked above it.
    heaps = [(20, 33, 15), (88, 25, 12), (150, 36, 17), (218, 28, 12)]
    for hx, base, size in heaps:
        puffs = [(hx + rng.uniform(-size, size), base - rng.uniform(0, size * 0.9), rng.uniform(size * 0.35, size * 0.6)) for _ in range(9)]
        puffs.append((hx, base - size * 0.5, size * 0.75))
        for cx, cy, r in puffs:
            for dx in (-cw, 0, cw):
                ys, xs = np.ogrid[:H, :cw]
                d = ((xs - cx - dx) ** 2 + ((ys - cy) * 1.25) ** 2) <= r * r
                d &= ys <= base + 2
                mask |= d
                # Lit from the upper left: higher and further left is brighter.
                nx = (xs - cx - dx) / r
                ny = (ys - cy) / r
                lit = np.clip(0.55 - 0.45 * nx - 0.75 * ny, 0, 1)
                shade = np.where(d, np.maximum(shade, lit), shade)
    img = Image.new('RGBA', (cw, H), (0, 0, 0, 0))
    px = img.load()
    for y in range(H):
        for x in range(cw):
            if not mask[y, x]:
                continue
            v = shade[y, x] + (bayer(x, y) - 0.5) * 0.18
            c = CLOUD_LIGHT if v > 0.72 else CLOUD_MID if v > 0.48 else CLOUD_SHADE if v > 0.25 else CLOUD_DEEP
            px[x, y] = c + (255,)
    return img


# ---------- hills and grass ----------
FAR_HILL = [hexrgb('#5e9f6a'), hexrgb('#6fb075')]
GRASS = [hexrgb(c) for c in ['#7cc35e', '#66b04f', '#529c44', '#428a3c', '#357835', '#2a6630']]
BLADE_LIGHT = hexrgb('#a6dc78')
FLOWERS = [hexrgb(c) for c in ['#ffffff', '#ffe27a', '#f6a8c8', '#ffffff']]


def ground_top(x):
    return 55 + 2.0 * math.sin(x / 19.0) + 1.2 * math.sin(x / 8.0 + 1.2)


def ground_layer():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    for x in range(W):
        hill = 49 + 2.2 * math.sin(x / 15.0 + 0.6) + 1.4 * math.sin(x / 6.0)
        top = ground_top(x)
        for y in range(H):
            if y >= top:
                t = (y - top) / (H - top) * (len(GRASS) - 1)
                i = int(t + bayer(x, y) - 0.5)
                px[x, y] = GRASS[max(0, min(len(GRASS) - 1, i))] + (255,)
            elif y >= hill:
                px[x, y] = FAR_HILL[1 if bayer(x, y) > 0.5 else 0] + (255,)
    # Short light blades along the meadow and a scatter of flowers.
    for _ in range(130):
        x = rng.randrange(W)
        y = int(ground_top(x)) + rng.randrange(1, H - int(ground_top(x)) - 1)
        if y < H - 1:
            px[x, y] = BLADE_LIGHT + (255,)
            px[x, y - 1] = GRASS[0] + (255,)
    for _ in range(26):
        x = rng.randrange(W)
        y = int(ground_top(x)) + rng.randrange(3, 22)
        if y < H:
            px[x, y] = rng.choice(FLOWERS) + (255,)
    return img


def front_grass(frame):
    """Tall blades in front of Clawd, leaning one way or the other, so the grass sways."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    r = random.Random(11)
    for i in range(W // 2):
        x = i * 2 + r.randrange(0, 2)
        base = int(ground_top(x)) + 9 + r.randrange(0, 3)
        tall = r.randrange(3, 7)
        lean = (1 if (frame + (i % 3 == 0)) % 2 else 0)
        for k in range(tall):
            xx = x + (lean if k >= tall - 2 else 0)
            yy = base - k
            if 0 <= xx < W and 0 <= yy < H:
                px[xx, yy] = (BLADE_LIGHT if k == tall - 1 else GRASS[1 + (k % 2)]) + (255,)
    return img


# ---------- the fade to nothing ----------
# An 8x8 ordered dither gives 64 steps of density instead of 16, so the thinning reads as a gradient, not as bands.
BAYER8 = np.array([[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
                   [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
                   [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]])
BAYER8 = (BAYER8 + 0.5) / 64


def edge_amount(x, y):
    """1 in the middle, 0 at the rim, eased so the fall-off is gentle at both ends."""
    dx = (x + 0.5 - W / 2) / (W / 2)
    dy = (y + 0.5 - H / 2) / (H / 2)
    # A rounded rectangle (superellipse), wider than tall: not a circle, not a stretched one.
    d = (abs(dx) ** 3.2 + abs(dy) ** 3.2) ** (1 / 3.2)
    t = max(0.0, min(1.0, (0.99 - d) / 0.32))
    return t * t * (3 - 2 * t)


FADE_LEVELS = 5  # opacity steps between solid and gone: 100, 80, 60, 40, 20, 0 %


def fade_mask():
    """A grey mask: each art pixel is one of a few opacity steps, with a light dither between neighbouring steps, so the
    picture thins out in square pixels and melts into whatever is behind it (dark or light chat alike)."""
    img = Image.new('L', (W, H), 0)
    px = img.load()
    for y in range(H):
        for x in range(W):
            level = int(edge_amount(x, y) * FADE_LEVELS + BAYER8[y % 8, x % 8])
            px[x, y] = round(min(FADE_LEVELS, level) / FADE_LEVELS * 255)
    return img


# ---------- Clawd lying in the grass ----------
CLAWD = '#d77757'
EYE = '#2a1d18'


CS = 2  # Clawd is drawn at twice the scene's pixel size: a chunky mascot on a finer landscape.


def rects(cells, color, ox, oy):
    return ''.join(f'<rect x="{ox + x * CS}" y="{oy + y * CS}" width="{CS}" height="{CS}" fill="{color}"/>' for x, y in cells)


def clawd_lying(ox, oy):
    # Body 16 wide, 7 tall (the glyph rows doubled, legs hidden in the grass), stub arms out to the sides.
    body = [(x, y) for y in range(7) for x in range(1, 15)]
    body += [(0, 4), (0, 5), (15, 4), (15, 5)]
    # Content closed eyes, a soft upward curve each: the happy look from the flag clip.
    eyes_closed = [(3, 2), (4, 1), (5, 2), (10, 2), (11, 1), (12, 2)]
    eyes_open = [(4, 1), (4, 2), (11, 1), (11, 2)]
    breathe = '<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="0 0;0 -1;0 0" keyTimes="0;0.45;0.9" dur="3.6s" repeatCount="indefinite"/>'
    # Eyes stay closed and open for a moment now and then, like peeking at the sky.
    peek = '<animate attributeName="opacity" calcMode="discrete" values="0;1;0" keyTimes="0;0.82;0.9" dur="9s" repeatCount="indefinite"/>'
    shut = '<animate attributeName="opacity" calcMode="discrete" values="1;0;1" keyTimes="0;0.82;0.9" dur="9s" repeatCount="indefinite"/>'
    return (f'<g>{breathe}{rects(body, CLAWD, ox, oy)}'
            f'<g>{shut}{rects(eyes_closed, EYE, ox, oy)}</g>'
            f'<g opacity="0">{peek}{rects(eyes_open, EYE, ox, oy)}</g></g>')


def butterfly():
    # Two wing frames and a path of hops with uneven holds, so it flutters rather than glides.
    up = '<rect x="0" y="0" width="1" height="1"/><rect x="2" y="0" width="1" height="1"/><rect x="1" y="1" width="1" height="1"/>'
    down = '<rect x="0" y="1" width="1" height="1"/><rect x="2" y="1" width="1" height="1"/><rect x="1" y="1" width="1" height="1"/>'
    flap = lambda first: f'<animate attributeName="opacity" calcMode="discrete" values="{"1;0" if first else "0;1"}" keyTimes="0;0.5" dur="0.32s" repeatCount="indefinite"/>'
    path = '80 42;83 40;85 41;88 38;90 39;87 36;84 37;81 39;79 41;80 42'
    move = f'<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="{path}" keyTimes="0;0.08;0.2;0.28;0.42;0.5;0.62;0.74;0.88;1" dur="7s" repeatCount="indefinite"/>'
    return f'<g fill="#fff3b0">{move}<g>{flap(True)}{up}</g><g opacity="0">{flap(False)}{down}</g></g>'


def build():
    sky = png_uri(sky_layer())
    clouds = png_uri(cloud_layer())
    ground = png_uri(ground_layer())
    fg_a = png_uri(front_grass(0))
    fg_b = png_uri(front_grass(1))
    mask = png_uri(fade_mask())
    cx, cy = 48, int(ground_top(64)) - 4
    img = lambda uri, w=W: f'<image href="{uri}" x="0" y="0" width="{w}" height="{H}" style="image-rendering:pixelated"/>'
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">'
        f'<defs><mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">{img(mask)}</mask></defs>'
        f'<g mask="url(#fade)">'
        f'{img(sky)}'
        # The cloud band slides one full width over a minute and wraps, so the sky never stops moving.
        f'<g><animateTransform attributeName="transform" type="translate" values="0 0;-{W} 0" dur="80s" repeatCount="indefinite"/>{img(clouds, W * 2)}</g>'
        f'{img(ground)}'
        f'{clawd_lying(cx, cy)}'
        f'{butterfly()}'
        f'<g>{img(fg_a)}<animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;0.5" dur="1.4s" repeatCount="indefinite"/></g>'
        f'<g opacity="0">{img(fg_b)}<animate attributeName="opacity" calcMode="discrete" values="0;1" keyTimes="0;0.5" dur="1.4s" repeatCount="indefinite"/></g>'
        f'</g></svg>'
    )
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'meadow.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)
    with open(os.path.join(HERE, 'preview.html'), 'w', encoding='utf-8') as f:
        f.write(f'<body style="background:#1a1a1a;margin:0;padding:20px"><img src="data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}" style="width:560px;height:350px;display:block"></body>')
    print('meadow.svg', len(svg), 'chars (cap 131072)')


if __name__ == '__main__':
    build()
