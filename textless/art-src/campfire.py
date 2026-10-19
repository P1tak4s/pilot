"""Campfire: Clawd on a log by a fire at night, toasting a marshmallow. Flames lick in pixel frames, sparks drift up,
the firelight flickers on Clawd, the marshmallow browns, gets eaten, and a fresh one goes on.
Run: python campfire.py -> ../plugin/hooks/scenes/campfire.svg
"""
import math
import random

from pixkit import CLAWD, EYE, H, W, Clawd, Pix, block, even, hexrgb, hops, layer, new_layer, ramp, scene, timeline, write

rng = random.Random(21)

SKY = [hexrgb(c) for c in ['#141a3a', '#19214a', '#202959', '#2a3163', '#383a6c']]
HORIZON = 50
GROUND = [hexrgb(c) for c in ['#2c3b30', '#26342b', '#202c25', '#1a251f']]
LIT = [hexrgb(c) for c in ['#3d3a2c', '#54452f', '#6c5233', '#86603a']]
TREE = hexrgb('#0e1820')
TREE_LIT = hexrgb('#2a2a2a')
FX, FY = 80, 62  # fire base centre


def ground_top(x):
    return HORIZON + 1.5 * math.sin(x / 11) + math.sin(x / 5 + 1)


def pine(px, cx, base, height, width, lit_side=0):
    for k in range(height):
        y = base - k
        tier = k % (height // 4 + 1)
        half = max(0, int(width * (1 - k / height) * (0.6 + 0.4 * (1 - tier / (height // 4 + 1)))))
        for x in range(cx - half, cx + half + 1):
            if 0 <= x < W and 0 <= y < H:
                lit = lit_side and (x - cx) * lit_side > half - 2 and k < height * 0.6
                px[x, y] = (TREE_LIT if lit else TREE) + (255,)
    for y in range(base, base + 3):
        if 0 <= y < H:
            px[cx, y] = (40, 30, 24, 255)


def background():
    img = new_layer()
    px = img.load()
    for y in range(H):
        for x in range(W):
            if y < ground_top(x):
                px[x, y] = ramp(SKY, y / HORIZON, x, y) + (255,)
            else:
                d = math.hypot((x - FX) / 46, (y - FY) / 14)
                if d < 1:
                    px[x, y] = ramp(LIT, 1 - d, x, y) + (255,)
                else:
                    px[x, y] = ramp(GROUND, (y - HORIZON) / (H - HORIZON), x, y) + (255,)
    # Far hills.
    for x in range(W):
        top = int(HORIZON - 4 + 2.5 * math.sin(x / 9 + 2) + 1.5 * math.sin(x / 4))
        for y in range(top, int(ground_top(x))):
            px[x, y] = (24, 32, 52, 255)
    for cx, base, hgt, wd in [(8, 54, 34, 9), (19, 53, 26, 7), (112, 54, 36, 9), (122, 53, 28, 7), (100, 52, 20, 5)]:
        pine(px, cx, base, hgt, wd, lit_side=-1 if cx > FX else 1)
    # Grass tufts and pebbles round the fire.
    for _ in range(50):
        x = rng.randrange(W)
        y = int(ground_top(x)) + rng.randrange(2, H - int(ground_top(x)))
        if y < H:
            px[x, y] = (58, 82, 58, 255) if abs(x - FX) > 22 else (120, 95, 60, 255)
    for a in range(0, 360, 30):
        x = int(FX + 13 * math.cos(math.radians(a)))
        y = int(FY + 1 + 3 * math.sin(math.radians(a)))
        px[x, y] = (110, 104, 100, 255)
        px[x + 1, y] = (82, 78, 76, 255)
    # The log seat.
    for y in range(58, 64):
        for x in range(34, 68):
            c = (120, 78, 48) if y > 58 else (150, 102, 64)
            if y == 63 or (x * 7 + y * 3) % 13 == 0:
                c = (92, 58, 36)
            px[x, y] = c + (255,)
    for y in range(58, 64):
        px[67, y] = (196, 150, 104, 255) if 59 < y < 62 else (150, 102, 64, 255)
    return img


def stars():
    pts = [(30, 6), (44, 12), (58, 4), (66, 15), (90, 8), (104, 18), (78, 24), (50, 22), (36, 30), (96, 30), (70, 6)]
    out = ''
    for i, (x, y) in enumerate(pts):
        sched = [(0, 0.9 + (i * 0.41) % 1.5), (1, 0.35), (0, 0.7 + (i * 0.29) % 1.1), (1, 0.25)]
        out += timeline([Pix().px(x, y, '#ffffff').svg(), Pix().px(x, y, '#8890c0').svg()], sched)
    return out


# ---------- fire ----------
FLAME = ['#fff4c2', '#ffd36b', '#ff9f43', '#ea5a32', '#b8372a']


def logs():
    p = Pix()
    for i in range(16):
        p.rect(FX - 9 + i, FY - 1 + (i // 6), 2, 2, '#5a3a24')
        p.rect(FX + 8 - i, FY - 1 + (i // 6), 2, 2, '#6e4a2e')
    p.rect(FX - 6, FY + 1, 12, 2, '#3a2416')
    p.rect(FX - 3, FY + 1, 6, 1, '#ff9f43')
    return p


def flame(frame):
    r = random.Random(100 + frame)
    p = Pix()
    for dx in range(-8, 9):
        prof = (1 - (abs(dx) / 9) ** 1.6)
        hgt = int(prof * 15 * (0.75 + 0.45 * r.random()) + (2 if (dx + frame) % 4 == 0 else 0))
        for k in range(hgt):
            t = k / max(1, hgt) * 0.75 + abs(dx) / 9 * 0.5
            c = FLAME[min(len(FLAME) - 1, int(t * len(FLAME)))]
            p.px(FX + dx, FY - 1 - k, c)
    # Loose tongues breaking off the top.
    for _ in range(3):
        dx = r.randrange(-5, 6)
        y = FY - 15 - r.randrange(0, 5)
        p.px(FX + dx, y, FLAME[2]).px(FX + dx, y - 1, FLAME[3])
    return p


def sparks():
    out = ''
    for i in range(6):
        r = random.Random(i * 7 + 1)
        x0 = FX + r.randrange(-5, 6)
        path = [(0, 0)]
        for k in range(9):
            path.append((path[-1][0] + r.choice((-1, 0, 0, 1)), path[-1][1] - 3))
        steps = [(k, 0.16) for k in range(len(path))]
        shift = i * 3
        steps = steps[shift % len(steps):] + steps[:shift % len(steps)]
        col = '#ffd36b' if i % 2 else '#ff9f43'
        out += hops(path, steps, Pix().px(x0, FY - 14, col).svg())
    return out


# ---------- Clawd ----------
C = Clawd(40, 42, 2, facing='r')  # body 24 by 16 sitting on the log, legs hanging over its front


MALLOW = ['#fbf7ee', '#f3d38e', '#c98a4a']


def stick_and_mallow():
    ax, ay, aw, ah = C.arm('r')
    tip = (FX - 4, 43)
    p = Pix()
    n = tip[0] - (ax + aw)
    for i in range(n + 1):
        p.px(ax + aw - 1 + i, ay + 2 - round(i * (ay + 2 - tip[1]) / n), '#b88a5c')
    stick = p.svg()
    frames = []
    for c in MALLOW:
        m = Pix().rect(tip[0], tip[1] - 2, 3, 3, c)
        m.px(tip[0], tip[1] - 2, '#ffffff' if c == MALLOW[0] else MALLOW[0] if c == MALLOW[1] else MALLOW[1])
        frames.append(m.svg())
    frames.append('')  # eaten
    # White, golden, toasted, then gone while Clawd munches, then a fresh one.
    sched = [(0, 3.5), (1, 3.5), (2, 2.5), (3, 2.5)]
    return stick + timeline(frames, sched), sched


def eyes():
    return timeline([C.eye_pix(k, 1).svg() for k in ('open', 'blink', 'happy')], [(0, 2.8), (1, 0.12), (0, 4.0), (1, 0.12), (0, 2.46), (2, 2.5)])


def munch():
    # Little chews while the marshmallow is gone: the body hops a pixel.
    return [(0, 9.5)] + [(1, 0.2), (0, 0.2)] * 6 + [(0, 0.1)]


def build():
    ax, ay, _, _ = C.arm('r')
    stick, _ = stick_and_mallow()
    body = C.body(arms='l').svg() + eyes()
    arm = block(Pix(), ax, ay - 1, C.s, 2 * C.s).svg()
    clawd = hops([(0, 0), (0, -1)], munch(), body + arm + stick)
    svg = scene(
        layer(background()) + stars()
        + clawd
        + logs().svg()
        + timeline([flame(i).svg() for i in range(4)], [(0, 0.14), (1, 0.12), (2, 0.15), (3, 0.13), (1, 0.12), (2, 0.14)])
        + sparks()
    )
    write('scenery/campfire', svg)



def build_bare():
    """The campfire with no night: Clawd on his log, the fire, sparks and the marshmallow straight on the chat."""
    ax, ay, _, _ = C.arm('r')
    stick, _ = stick_and_mallow()
    body = C.body(arms='l').svg() + eyes()
    arm = block(Pix(), ax, ay - 1, C.s, 2 * C.s).svg()
    clawd = hops([(0, 0), (0, -1)], munch(), body + arm + stick)
    seat = Pix()
    for y in range(58, 64):
        for x in range(34, 68):
            c = '#784e30' if y > 58 else '#966640'
            if y == 63 or (x * 7 + y * 3) % 13 == 0:
                c = '#5c3a24'
            seat.px(x, y, c)
    seat.rect(67, 59, 1, 3, '#c49668')
    stones = Pix()
    for a in range(0, 360, 30):
        x = int(FX + 13 * math.cos(math.radians(a)))
        y = int(FY + 1 + 3 * math.sin(math.radians(a)))
        stones.rect(x, y, 2, 1, '#8a8480')
    shade = Pix().rect(30, 64, 42, 1, '#000000@0.16').rect(FX - 14, FY + 4, 28, 1, '#000000@0.16')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">'
           + shade.svg() + seat.svg() + stones.svg() + clawd + logs().svg()
           + timeline([flame(i).svg() for i in range(4)], [(0, 0.14), (1, 0.12), (2, 0.15), (3, 0.13), (1, 0.12), (2, 0.14)])
           + sparks() + '</svg>')
    write('campfire-bare', svg)


if __name__ == '__main__':
    build()
    build_bare()
