"""Shared pieces for the scene generators: the 128x80 canvas, PNG layers, the edge fade, Clawd pixels merged into
paths, and frame-by-frame SMIL timelines that survive the card's inPhase begin offsets.

Every animation here loops on its own `dur` with discrete keyTimes. Nothing chains on another animation's begin, so
the card can rewind all of them by the same amount and they stay in step.
"""
import base64
import io
import os

import numpy as np
from PIL import Image

W, H = 128, 80
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'plugin', 'hooks', 'scenes')
CAP = 131072

BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16
BAYER8 = (np.array([[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
                    [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
                    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]) + 0.5) / 64

# Clawd's palette, shared so every scene shows the same mascot.
CLAWD = '#d97757'
CLAWD_LIT = '#e8906f'
CLAWD_SHADE = '#b85f41'
EYE = '#2a1d18'


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def bayer(x, y):
    return BAYER4[y % 4, x % 4]


def ramp(colors, t, x, y):
    """Pick from a list of colours at position t (0..1) with an ordered dither between neighbours."""
    i = int(t * (len(colors) - 1) + bayer(x, y) - 0.5)
    return colors[max(0, min(len(colors) - 1, i))]


def png_uri(img, colors=64):
    buf = io.BytesIO()
    if img.mode == 'RGBA':
        img = img.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    img.save(buf, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def layer(img, w=W, h=H, x=0, y=0):
    return f'<image href="{png_uri(img)}" x="{x}" y="{y}" width="{w}" height="{h}" style="image-rendering:pixelated"/>'


def new_layer(w=W, h=H):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


# ---------- the fade to nothing (same shape as meadow) ----------
FADE_LEVELS = 5


def edge_amount(x, y):
    dx = (x + 0.5 - W / 2) / (W / 2)
    dy = (y + 0.5 - H / 2) / (H / 2)
    d = (abs(dx) ** 3.2 + abs(dy) ** 3.2) ** (1 / 3.2)
    t = max(0.0, min(1.0, (0.99 - d) / 0.32))
    return t * t * (3 - 2 * t)


def fade_mask():
    img = Image.new('L', (W, H), 0)
    px = img.load()
    for y in range(H):
        for x in range(W):
            level = int(edge_amount(x, y) * FADE_LEVELS + BAYER8[y % 8, x % 8])
            px[x, y] = round(min(FADE_LEVELS, level) / FADE_LEVELS * 255)
    return img


# ---------- pixel sprites ----------
class Pix(dict):
    """(x, y) -> fill. A fill may carry an opacity as '#rrggbb@0.5'. Later writes paint over earlier ones."""

    def px(self, x, y, c):
        self[(int(x), int(y))] = c
        return self

    def rect(self, x, y, w, h, c):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self[(xx, yy)] = c
        return self

    def put(self, cells, c, ox=0, oy=0):
        for x, y in cells:
            self[(ox + x, oy + y)] = c
        return self

    def merge(self, other, ox=0, oy=0):
        for (x, y), c in other.items():
            self[(x + ox, y + oy)] = c
        return self

    def moved(self, dx, dy):
        return Pix({(x + dx, y + dy): c for (x, y), c in self.items()})

    def svg(self):
        return paths(self)


def paths(pix):
    """One <path> per colour, made of rectangles: runs along each row, then stacked rows with the same run merged."""
    by = {}
    for (x, y), c in pix.items():
        if c is None:
            continue
        by.setdefault(c, set()).add((x, y))
    out = []
    for c, cells in sorted(by.items()):
        runs = {}
        for y in sorted({y for _, y in cells}):
            xs = sorted(x for x, yy in cells if yy == y)
            start = prev = xs[0]
            for x in xs[1:] + [None]:
                if x is not None and x == prev + 1:
                    prev = x
                    continue
                runs.setdefault((start, prev), []).append(y)
                if x is not None:
                    start = prev = x
        d = []
        for (x0, x1), ys in sorted(runs.items(), key=lambda r: (r[1][0], r[0][0])):
            ys.sort()
            y0 = py = ys[0]
            for y in ys[1:] + [None]:
                if y is not None and y == py + 1:
                    py = y
                    continue
                d.append(f'M{x0} {y0}h{x1 - x0 + 1}v{py - y0 + 1}h-{x1 - x0 + 1}z')
                if y is not None:
                    y0 = py = y
        fill, _, op = c.partition('@')
        opa = f' fill-opacity="{op}"' if op else ''
        out.append(f'<path fill="{fill}"{opa} d="{"".join(d)}"/>')
    return ''.join(out)


# ---------- frame-by-frame timelines ----------
def num(v):
    s = f'{v:.4f}'.rstrip('0').rstrip('.')
    return s or '0'


def timeline(frames, schedule):
    """Show one of `frames` at a time. `schedule` is [(frame index, seconds), ...] played on a loop.
    Each frame gets one discrete opacity track over the whole loop, so repeated frames cost nothing extra."""
    total = sum(d for _, d in schedule)
    out = []
    for i, f in enumerate(frames):
        vals, kts, t = [], [], 0.0
        for idx, d in schedule:
            v = '1' if idx == i else '0'
            if not vals or vals[-1] != v:
                vals.append(v)
                kts.append(t / total)
            t += d
        if vals == ['1']:
            out.append(f)
            continue
        if vals == ['0']:
            continue
        init = '' if vals[0] == '1' else ' opacity="0"'
        out.append(f'<g{init}><animate attributeName="opacity" calcMode="discrete" values="{";".join(vals)}" '
                   f'keyTimes="{";".join(num(k) for k in kts)}" dur="{num(total)}s" repeatCount="indefinite"/>{f}</g>')
    return ''.join(out)


def hops(offsets, schedule, inner):
    """Move `inner` between pixel offsets [(dx, dy), ...] following `schedule` [(offset index, seconds), ...]."""
    total = sum(d for _, d in schedule)
    vals, kts, t = [], [], 0.0
    for idx, d in schedule:
        vals.append(f'{offsets[idx][0]} {offsets[idx][1]}')
        kts.append(t / total)
        t += d
    return (f'<g><animateTransform attributeName="transform" type="translate" calcMode="discrete" values="{";".join(vals)}" '
            f'keyTimes="{";".join(num(k) for k in kts)}" dur="{num(total)}s" repeatCount="indefinite"/>{inner}</g>')


def even(n, dur):
    """A schedule that steps through n frames in order, each for the same time."""
    return [(i, dur / n) for i in range(n)]


# ---------- Clawd ----------
# Clawd's terminal glyph read in quarter cells, in square units: body 12 by 8, eyes 1 by 2 at (2, 2) and (9, 2),
# stub arms 2 by 2 at mid height either side, four legs 1 by 2 under the body.
class Clawd:
    def __init__(self, ox, oy, s, facing=None):
        # facing 'l' or 'r' turns Clawd three quarters: both eyes bunch toward that side.
        self.ox, self.oy, self.s, self.facing = ox, oy, s, facing
        # Turned, the body reads narrower: 10 units instead of 12.
        self.bw = 10 if facing else 12
        self.w, self.h = self.bw * s, 8 * s

    def box(self, ux, uy, uw, uh):
        s = self.s
        return (self.ox + ux * s, self.oy + uy * s, uw * s, uh * s)

    def eyes(self):
        xs = {None: (2, 9), 'r': (3, 8), 'l': (1, 6)}[self.facing]
        return [self.box(x, 2, 1, 2) for x in xs]

    def arm(self, side):
        # Thin stubs, one unit wide, like the glyph. Turned, the far arm sits higher and the near one lower.
        y = 4
        if self.facing:
            y = 3 if side != self.facing else 5
        return self.box(-1 if side == 'l' else self.bw, y, 1, 2)

    def eye_pix(self, kind, look=0):
        """Eyes drawn in chunks scaled to Clawd's size, so a big Clawd gets big happy eyes too.
        kind: open, blink, happy (an upturned arc). look shifts them sideways in pixels."""
        p = Pix()
        # Never under 2 px: a 1 px arc reads as a speck, not a smile (Isac, twice). Blink shares it.
        b = max(2, round(self.s * 0.7))
        for ex, ey, ew, eh in self.eyes():
            ex += look
            cx = ex + ew // 2
            if kind == 'open':
                p.rect(ex, ey, ew, eh, EYE)
            elif kind == 'blink':
                p.rect(cx - b - b // 2, ey + eh - b - 1, 3 * b, b, EYE)
            elif kind == 'happy':
                x0 = cx - b - b // 2
                y0 = ey + eh // 2 - b
                p.rect(x0, y0 + b, b, b, EYE)
                p.rect(x0 + b, y0, b, b, EYE)
                p.rect(x0 + 2 * b, y0 + b, b, b, EYE)
        return p

    def legs(self):
        xs = {None: (1, 3, 8, 10), 'r': (1, 3, 6, 8), 'l': (1, 3, 6, 8)}[self.facing]
        return [self.box(x, 8, 1, 2) for x in xs]

    def body(self, shade=False, legs=True, arms='lr'):
        p = Pix()
        x, y, w, h = self.ox, self.oy, self.w, self.h
        if legs:
            for b in self.legs():
                p.rect(*b, CLAWD)
        for side in arms:
            block(p, *self.arm(side), shade)
        block(p, x, y, w, h, shade)
        return p


def block(p, x, y, w, h, shade=False):
    """A flat orange block, like the terminal glyph. shade=True adds a rim light, kept off by default."""
    p.rect(x, y, w, h, CLAWD)
    if shade:
        k = max(1, min(w, h) // 12)
        p.rect(x, y, w, k, CLAWD_LIT)
        p.rect(x, y, k, h, CLAWD_LIT)
        p.rect(x + w - k, y + k, k, h - k, CLAWD_SHADE)
        p.rect(x + k, y + h - k, w - k, k, CLAWD_SHADE)
    return p


def write(name, svg, preview=True):
    path = os.path.join(OUT, f'{name}.svg')  # a name like 'scenery/meadow' lands in that set's folder
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f'{name}.svg', len(svg), 'chars', 'OK' if len(svg) < CAP else 'OVER CAP')


def scene(body, mask_id='fade'):
    mask = png_uri(fade_mask())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="{round(560 * H / W)}" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">'
            f'<defs><mask id="{mask_id}" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">'
            f'<image href="{mask}" x="0" y="0" width="{W}" height="{H}" style="image-rendering:pixelated"/></mask></defs>'
            f'<g mask="url(#{mask_id})">{body}</g></svg>')
