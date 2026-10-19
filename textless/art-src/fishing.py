"""Fishing: Clawd at the end of a jetty at sunset, rod out, legs swinging over the edge. The bobber bobs and rings
spread round it, the sun's reflection shimmers, birds cross the sky and now and then a fish jumps.
Run: python fishing.py -> ../plugin/hooks/scenes/fishing.svg
"""
import math
import random

from pixkit import CLAWD, EYE, H, W, Clawd, Pix, block, hexrgb, hops, layer, new_layer, ramp, scene, timeline, write

rng = random.Random(8)

SKY = [hexrgb(c) for c in ['#3d3a7c', '#59468a', '#7c4f8e', '#a5578a', '#d0687c', '#ec8a68', '#f6ad62', '#fbcd7c']]
HORIZON = 46
WATER = [hexrgb(c) for c in ['#6b5a8e', '#55508a', '#45467c', '#383b6c', '#2e315e']]
SUN = (98, HORIZON)
JETTY_Y = 52
PLANK = hexrgb('#8a6446')
PLANK_LIT = hexrgb('#b07f56')
PLANK_DARK = hexrgb('#5e4230')


def background():
    img = new_layer()
    px = img.load()
    for y in range(H):
        for x in range(W):
            if y < HORIZON:
                px[x, y] = ramp(SKY, y / HORIZON, x, y) + (255,)
            else:
                px[x, y] = ramp(WATER, (y - HORIZON) / (H - HORIZON), x, y) + (255,)
    # The sun sitting on the horizon, a little warm halo round it.
    sx, sy = SUN
    for y in range(sy - 12, sy):
        for x in range(sx - 12, sx + 13):
            d = math.hypot(x - sx, (y - sy) * 1.0)
            if d < 8:
                px[x, y] = (255, 236, 170, 255)
            elif d < 11 and (x + y) % 2 == 0:
                px[x, y] = (252, 206, 130, 255)
    # Far headland on the left with a few dark trees.
    for x in range(0, 60):
        top = int(HORIZON - 2 - 4 * math.exp(-((x - 18) / 16) ** 2) - (2 if x % 7 in (2, 3) and x < 40 else 0))
        for y in range(top, HORIZON):
            px[x, y] = (70, 48, 92, 255)
    # Clouds as thin bars catching the light.
    for cx, cy, ln in [(30, 14, 22), (70, 22, 16), (108, 10, 18), (48, 30, 12), (18, 34, 10)]:
        for x in range(cx, cx + ln):
            if 0 <= x < W:
                px[x, cy] = (250, 190, 160, 255)
                if cx + 2 < x < cx + ln - 3:
                    px[x, cy + 1] = (214, 130, 140, 255)
    # Jetty: planks on top, a dark front edge and posts into the water.
    for x in range(0, 66):
        px[x, JETTY_Y] = PLANK_LIT + (255,)
        px[x, JETTY_Y + 1] = (PLANK if x % 6 else PLANK_DARK) + (255,)
        px[x, JETTY_Y + 2] = PLANK + (255,)
        px[x, JETTY_Y + 3] = PLANK_DARK + (255,)
    for post in (6, 30, 62):
        for y in range(JETTY_Y + 4, H):
            px[post, y] = PLANK_DARK + (255,)
            px[post + 1, y] = PLANK + (255,)
            px[post + 2, y] = PLANK_DARK + (255,)
    # A jar of bait on the jetty.
    for y in range(JETTY_Y - 5, JETTY_Y):
        for x in range(14, 18):
            px[x, y] = (150, 190, 200, 255) if y > JETTY_Y - 5 else (200, 120, 70, 255)
    return img


def shimmer(frame):
    """Broken horizontal glints under the sun and a few cool ripples across the water."""
    r = random.Random(40 + frame)
    p = Pix()
    sx = SUN[0]
    for y in range(HORIZON + 1, H, 2):
        spread = 4 + (y - HORIZON) // 2
        for _ in range(3):
            ln = r.randrange(2, 6)
            x = sx + r.randrange(-spread, spread)
            col = '#ffe7a6' if y < HORIZON + 10 else '#f6ad62' if y < HORIZON + 22 else '#d0687c'
            p.rect(x, y, ln, 1, col)
    for _ in range(10):
        x, y = r.randrange(0, W), r.randrange(HORIZON + 4, H)
        if abs(x - sx) > 14:
            p.rect(x, y, r.randrange(2, 5), 1, '#8a7fb4')
    return p


# ---------- Clawd ----------
C = Clawd(40, 36, 2, facing='r')  # body 24 by 16, sitting on the jetty's end


def legs(swing):
    p = Pix()
    for i, (lx, ly, lw, lh) in enumerate(C.legs()):
        dx = (swing if i % 2 == 0 else -swing)
        p.rect(lx + dx, JETTY_Y, lw, 4, CLAWD)
    return p


def eyes():
    return timeline([C.eye_pix(k, 1).svg() for k in ('open', 'blink', 'happy')], [(0, 3.0), (1, 0.12), (0, 2.4), (2, 1.6), (0, 2.88)])


TIP = (90, 18)
BOB = (100, 56)


def rod():
    ax, ay, aw, ah = C.arm('r')
    p = Pix()
    x0, y0 = ax + aw - 1, ay + 1
    n = TIP[0] - x0
    for i in range(n + 1):
        p.px(x0 + i, y0 - round(i * (y0 - TIP[1]) / n), '#3a2a20' if i < n * 0.3 else '#5a4434')
    p.rect(x0 + 2, y0 - 2, 2, 2, '#c0c0c8')  # reel
    return p.svg()


def line(dy):
    p = Pix()
    bx, by = BOB[0], BOB[1] + dy
    n = by - TIP[1]
    for i in range(n):
        t = i / n
        x = TIP[0] + round((bx - TIP[0]) * t + 2.5 * math.sin(t * math.pi))
        p.px(x, TIP[1] + i, '#f2e4d0@0.55')
    return p


def bobber(dy):
    bx, by = BOB[0], BOB[1] + dy
    p = Pix()
    p.rect(bx - 1, by - 3, 3, 2, '#e8443a').rect(bx - 1, by - 1, 3, 1, '#ffffff')
    p.px(bx, by - 4, '#ffffff')
    return line(dy).merge(p)


def rings(k):
    p = Pix()
    bx, by = BOB
    rx = 3 + k * 2
    for x in range(bx - rx, bx + rx + 1):
        if (x - bx) % 2 == 0 or k == 0:
            p.px(x, by + (0 if abs(x - bx) > rx - 2 else 1), '#c9b8e8@0.8')
    return p


def fish():
    """A small fish leaping out of the water and back in, once in a long loop."""
    shape = [(0, 1), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2), (3, 1), (4, 0), (4, 2)]
    def at(x, y, flip=False):
        return Pix().put([(4 - a if flip else a, b) for a, b in shape], '#c8d4e8', x, y).svg()
    splash = Pix().px(115, 60, '#ffffff').px(117, 59, '#ffffff').px(119, 60, '#ffffff').svg()
    frames = ['', at(112, 58), at(114, 53), at(117, 51), at(120, 54), splash]
    sched = [(0, 7.0), (1, 0.12), (2, 0.14), (3, 0.16), (4, 0.14), (5, 0.24), (0, 1.2)]
    return timeline(frames, sched)


def birds():
    out = ''
    for i, (y, t0) in enumerate([(12, 0), (16, 3.5)]):
        a = Pix().put([(0, 0), (1, 1), (2, 0)], '#2e2450').svg()
        b = Pix().put([(0, 1), (1, 1), (2, 1)], '#2e2450').svg()
        flap = timeline([a, b], [(0, 0.3), (1, 0.3)])
        steps = 30
        path = [(130 - k * 5, y + (k // 4) % 2) for k in range(steps)] + [(140, y)]
        sched = [(k, 0.3) for k in range(steps)] + [(steps, 9.0 - steps * 0.3 + 3.0)]
        shift = int(t0 / 0.3)
        sched = sched[shift:] + sched[:shift]
        out += hops(path, sched, flap)
    return out


def build():
    ax, ay, _, _ = C.arm('r')
    bob_sched = [(0, 0.5), (1, 0.5), (0, 0.5), (1, 0.45), (2, 0.15), (1, 0.35)]
    svg = scene(
        layer(background())
        + timeline([shimmer(i).svg() for i in range(3)], [(0, 0.45), (1, 0.45), (2, 0.45)])
        + birds()
        + timeline([legs(0).svg(), legs(1).svg()], [(0, 0.6), (1, 0.6)])
        + C.body(legs=False, arms='l').svg() + eyes()
        + block(Pix(), ax, ay - 1, C.s, 2 * C.s).svg()
        + rod()
        + timeline([rings(k).svg() for k in range(3)], [(0, 0.8), (1, 0.8), (2, 0.8)])
        + timeline([bobber(0).svg(), bobber(1).svg(), bobber(3).svg()], bob_sched)
        + fish()
    )
    write('scenery/fishing', svg)


if __name__ == '__main__':
    build()
