"""Coffee: a close-up of Clawd behind a kitchen table, sipping from a mug with the Claude spark on it.
Steam curls up from the mug, Clawd blinks, lifts the mug for a long happy sip, blushes, and sets it down.
Run: python coffee.py -> ../plugin/hooks/scenes/coffee.svg
"""
import math
import random

from pixkit import (CLAWD, EYE, Clawd, block, H, W, Pix, even, hexrgb, hops, layer, new_layer, ramp, scene,
                    timeline, write)

rng = random.Random(3)

WALL = [hexrgb(c) for c in ['#9cb8a2', '#8eab95', '#809e88', '#72907b', '#65836f']]
FRAME = hexrgb('#efe4cf')
FRAME_SHADE = hexrgb('#cdbfa6')
SKY = [hexrgb(c) for c in ['#8ec7ec', '#a6d4f0', '#c0e2f4', '#d9eef7']]
TABLE_TOP = hexrgb('#c08a5c')
TABLE_EDGE = hexrgb('#d9a273')
TABLE_FRONT = [hexrgb(c) for c in ['#97643f', '#895937', '#7a4e30']]
TABLE_SEAM = hexrgb('#6a4129')
TABLE_Y = 64


def background():
    img = new_layer()
    px = img.load()
    for y in range(H):
        for x in range(W):
            # Darker away from the window at the upper left.
            d = math.hypot((x - 20) / W, (y - 20) / H * 0.8)
            c = ramp(WALL, min(1, d * 1.15), x, y)
            # A soft beam of window light falling down and to the right.
            u = x - 0.55 * y
            if 22 < u < 46 and y > 12 and y < TABLE_Y:
                edge = min(u - 22, 46 - u) / 6
                if edge + (0.5 - (x * 7 + y * 3) % 4 / 4) * 0.4 > 0.5:
                    c = tuple(min(255, v + 12) for v in c)
            px[x, y] = c + (255,)
    # Window with a little sky, a cross bar and a sill.
    wx, wy, ww, wh = 6, 6, 30, 36
    for y in range(wy, wy + wh):
        for x in range(wx, wx + ww):
            px[x, y] = ramp(SKY, (y - wy) / wh, x, y) + (255,)
    for (cx, cy, r) in [(14, 15, 3), (18, 14, 4), (22, 16, 3), (29, 27, 2), (32, 26, 3)]:
        for y in range(cy - r, cy + r):
            for x in range(cx - r - 1, cx + r + 1):
                if (x - cx) ** 2 / 1.6 + (y - cy) ** 2 <= r * r and y <= cy and wx <= x < wx + ww:
                    px[x, y] = (255, 255, 255, 255)
    for y in range(wy - 2, wy + wh + 2):
        for x in range(wx - 2, wx + ww + 2):
            inner = wx <= x < wx + ww and wy <= y < wy + wh
            bar = x in (wx + ww // 2 - 1, wx + ww // 2) or y in (wy + wh // 2 - 1, wy + wh // 2)
            if not inner or bar:
                px[x, y] = (FRAME if (x + y) % 7 else FRAME_SHADE) + (255,)
    for y in range(wy + wh + 2, wy + wh + 4):
        for x in range(wx - 4, wx + ww + 4):
            px[x, y] = (FRAME if y == wy + wh + 2 else FRAME_SHADE) + (255,)
    # Pot plant on the sill.
    pot = hexrgb('#4f6fa8')
    pot_dark = hexrgb('#3d5689')
    for y in range(36, 42):
        for x in range(27 - (y < 37), 33 + (y < 37)):
            px[x, y] = (pot_dark if x >= 31 else pot) + (255,)
    leaf = [hexrgb('#5aa05a'), hexrgb('#3f8446'), hexrgb('#7cc06a')]
    for (x, y, c) in [(29, 35, 0), (30, 35, 1), (28, 34, 0), (31, 34, 2), (27, 33, 1), (32, 33, 0), (26, 32, 0), (33, 32, 2),
                      (29, 33, 2), (30, 32, 0), (30, 31, 1), (29, 30, 2), (31, 30, 0), (28, 31, 0), (25, 31, 1), (34, 31, 1)]:
        px[x, y] = leaf[c] + (255,)
    # Shelf with books, a jar and a cactus.
    for x in range(98, 128):
        px[x, 24] = TABLE_EDGE + (255,)
        px[x, 25] = TABLE_FRONT[1] + (255,)
    books = [(100, 9, '#c95b5b'), (103, 11, '#e0b44a'), (106, 8, '#5b7fc9'), (109, 10, '#6aa26a')]
    for bx, bh, c in books:
        for y in range(24 - bh, 24):
            for x in range(bx, bx + 3):
                px[x, y] = hexrgb(c) + (255,) if x < bx + 2 else tuple(int(v * 0.8) for v in hexrgb(c)) + (255,)
            px[bx + 1, 24 - bh + 2] = (245, 235, 220, 255)
    for y in range(17, 24):
        for x in range(114, 120):
            px[x, y] = (210, 230, 240, 255) if (x in (114, 119) or y == 17) else (232, 200, 120, 255)
    for y in range(18, 24):
        px[123, y] = (90, 150, 90, 255)
        px[124, y] = (70, 125, 75, 255)
    px[122, 20] = (90, 150, 90, 255)
    px[125, 19] = (90, 150, 90, 255)
    for x in range(121, 127):
        px[x, 23] = (180, 100, 70, 255)
    # Table.
    for x in range(W):
        px[x, TABLE_Y] = TABLE_EDGE + (255,)
        px[x, TABLE_Y + 1] = TABLE_TOP + (255,)
        px[x, TABLE_Y + 2] = TABLE_TOP + (255,)
        for y in range(TABLE_Y + 3, H):
            c = ramp(TABLE_FRONT, (y - TABLE_Y - 3) / (H - TABLE_Y - 3), x, y)
            if y == TABLE_Y + 3 or (y - TABLE_Y) % 6 == 0:
                c = TABLE_SEAM
            px[x, y] = c + (255,)
    for _ in range(40):
        x, y = rng.randrange(W), rng.randrange(TABLE_Y + 4, H)
        if (y - TABLE_Y) % 6:
            px[x, y] = TABLE_FRONT[0] + (255,)
    return img


# ---------- Clawd ----------
C = Clawd(38, 40, 3)  # body 36 by 24, its bottom hidden behind the table edge
EYES = C.eyes()


def body():
    return C.body(legs=False, arms='l')


def eyes(kind):
    return C.eye_pix(kind)


def blush():
    p = Pix()
    for ex, ey, ew, eh in EYES:
        p.rect(ex - 3, ey + eh + 1, 4, 2, '#f0a08a')
        p.rect(ex + ew - 1, ey + eh + 1, 4, 2, '#f0a08a')
    return p


# ---------- the mug ----------
MUG = '#efe6d8'
MUG_LIT = '#fffaf2'
MUG_SHADE = '#cfc2ae'
MUG_DEEP = '#b3a58f'
COFFEE = '#5b3a26'
CREMA = '#8a5a3a'


def mug_upright():
    """9 wide, 9 tall, handle to the right; origin at the top-left of the rim. Flat colours, like Clawd."""
    p = Pix()
    p.rect(0, 0, 9, 1, MUG)
    p.rect(1, 1, 7, 1, COFFEE)
    p.px(0, 1, MUG).px(8, 1, MUG)
    p.rect(0, 2, 9, 7, MUG)
    p.rect(1, 8, 7, 1, MUG_SHADE)
    for (x, y) in [(4, 3), (3, 4), (4, 4), (5, 4), (4, 5), (3, 6), (5, 6), (3, 3)]:
        p.px(x, y, CLAWD)
    for (x, y) in [(9, 3), (10, 3), (11, 4), (11, 5), (10, 6), (9, 6)]:
        p.px(x, y, MUG_SHADE)
    return p


def rotate(p, deg, cx, cy):
    """Nearest-neighbour rotation of a sprite about (cx, cy): chunky, like a hand-tilted pixel sprite."""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    xs = [x for x, _ in p]
    ys = [y for _, y in p]
    r = int(max(max(xs) - min(xs), max(ys) - min(ys))) + 4
    out = Pix()
    for y in range(int(cy) - r, int(cy) + r):
        for x in range(int(cx) - r, int(cx) + r):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            sx = math.floor(cx + dx * ca + dy * sa)
            sy = math.floor(cy - dx * sa + dy * ca)
            c = p.get((sx, sy))
            if c:
                out.px(x, y, c)
    return out


def steam(frame):
    p = Pix()
    for j, bx in enumerate((2, 6)):
        for yy in range(9):
            k = yy + frame * 3 + j * 5
            if k % 7 == 6:
                continue
            x = bx + round(1.4 * math.sin(k / 2.2 + j * 1.7))
            op = '0.75' if yy < 3 else '0.55' if yy < 6 else '0.3'
            p.px(x, -2 - yy, f'#ffffff@{op}')
    return p


def arm(x, y):
    return block(Pix(), x, y, C.s, 2 * C.s)


def poses():
    mug = mug_upright()
    ax, ay, _, _ = C.arm('r')
    rest_x, rest_y = ax + 4, TABLE_Y - 9
    rest = Pix().merge(mug, rest_x, rest_y)
    p0 = rest.svg() + arm(ax, ay).svg() + timeline([steam(i).moved(rest_x, rest_y).svg() for i in range(4)], even(4, 1.0))

    lift = rotate(mug, 14, 5, 5).moved(rest_x - 1, rest_y - 7)
    p1 = lift.svg() + arm(ax, ay - 4).svg()

    sip = rotate(mug, 40, 5, 5).moved(ax - 7, ay - 11)
    p2 = sip.svg() + arm(ax - 1, ay - 8).svg()
    return [p0, p1, p2]


def heart():
    p = Pix()
    p.put([(1, 0), (3, 0), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (3, 2), (2, 3)], '#ff8a94')
    return p


def motes():
    # A few specks of dust drifting in the window light, one pixel at a time.
    out = ''
    for i, (x, y) in enumerate([(30, 30), (40, 46), (24, 52)]):
        path = [(0, 0), (1, -1), (1, -2), (2, -2), (2, -3), (1, -4), (1, -5), (0, -5), (0, -4), (-1, -3), (-1, -2), (0, -1)]
        sched = [(k, 0.7) for k in range(len(path))]
        sched = sched[i * 4:] + sched[:i * 4]
        out += hops(path, sched, Pix().px(x, y, '#fff8e0@0.7').svg())
    return out


def build():
    bg = layer(background())
    # One loop of 7.2 s: rest with a blink, lift, a long sip with closed eyes, set down, blush and a heart, look up.
    pose_sched = [(0, 3.0), (1, 0.25), (2, 1.5), (1, 0.25), (0, 2.2)]
    eye_frames = [eyes('open').svg(), eyes('blink').svg(), eyes('happy').svg()]
    eye_sched = [(0, 1.4), (1, 0.15), (0, 1.65), (2, 3.0), (0, 0.5), (1, 0.12), (0, 0.38)]
    happy_sched = [(1, 4.75), (0, 1.45), (1, 1.0)]  # blush and heart after the sip
    heart_svg = hops([(0, 0), (1, -2), (0, -4), (1, -6)], [(0, 4.75), (1, 0.35), (2, 0.35), (3, 1.75)],
                     heart().moved(C.ox + C.w + 2, C.oy - 8).svg())
    svg = scene(
        bg + motes()
        + body().svg()
        + timeline(eye_frames, eye_sched)
        + timeline([blush().svg() + heart_svg, ''], happy_sched)
        + timeline(poses(), pose_sched)
    )
    write('scenery/coffee', svg)


if __name__ == '__main__':
    build()
