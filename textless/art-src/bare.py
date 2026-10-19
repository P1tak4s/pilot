"""Bare scenes: Clawd and a few props on a transparent background, so the card melts into the chat in dark and
light mode alike. No backdrop, no edge fade needed.
- juggle: Clawd juggles three balls in a shower pattern, the low pass going behind the body.
- hop: Clawd hops in place with squash and stretch, kicking up two puffs of dust on landing.
Run: python bare.py -> ../plugin/hooks/scenes/juggle.svg and hop.svg
"""
import math

from pixkit import CLAWD, EYE, H, W, Clawd, Pix, block, hops, timeline, write

SHADOW = '#000000@0.16'
DUST = '#a39a90@0.7'


def bare(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" '
            f'shape-rendering="crispEdges">{body}</svg>')


def shadow(cx, y, half):
    p = Pix()
    p.rect(cx - half, y, 2 * half, 1, SHADOW)
    p.rect(cx - half + 2, y + 1, 2 * half - 4, 1, SHADOW)
    return p


# ---------- juggle ----------
def ball(color):
    return Pix().rect(1, 0, 2, 4, color).rect(0, 1, 4, 2, color)


def juggle():
    C = Clawd(46, 40, 3)  # body 36 by 24, standing, feet at y 70
    lx, ly, _, _ = C.arm('l')
    rx, ry, _, _ = C.arm('r')
    hand_l = (lx - 3, ly - 4)  # just outside each side, so a throw never starts behind him
    hand_r = (rx + 2, ry - 4)
    # One loop of the path: a high arc from the left hand to the right, then a quick low pass back behind Clawd.
    path = []
    n_arc, n_back = 12, 4
    for i in range(n_arc):
        t = i / n_arc
        x = hand_l[0] + (hand_r[0] - hand_l[0]) * t
        y = hand_l[1] - math.sin(t * math.pi) * 34
        path.append((round(x), round(y)))
    for i in range(n_back):
        t = i / n_back
        path.append((round(hand_r[0] + (hand_l[0] - hand_r[0]) * t), hand_r[1] + 7))
    step = 0.09
    n = len(path)
    balls = ''
    for k, color in enumerate(['#e8443a', '#f2b632', '#4f8fd8']):
        sched = [(i, step) for i in range(n)]
        shift = k * n // 3
        sched = sched[shift:] + sched[:shift]
        balls += hops(path, sched, ball(color).svg())
    loop = n * step
    # Arms pop up as each ball leaves a hand: three throws per loop on each side.
    arm_up_l = block(Pix(), lx, ly - 3, C.s, 2 * C.s).svg()
    arm_dn_l = block(Pix(), lx, ly, C.s, 2 * C.s).svg()
    arm_up_r = block(Pix(), rx, ry - 3, C.s, 2 * C.s).svg()
    arm_dn_r = block(Pix(), rx, ry, C.s, 2 * C.s).svg()
    third = loop / 3
    arms_l = timeline([arm_up_l, arm_dn_l], [(0, step * 2), (1, third - step * 2)] * 3)
    off = n_arc * step % third
    arms_r = timeline([arm_up_r, arm_dn_r], [(1, off)] + [(0, step * 2), (1, third - step * 2)] * 2 + [(0, step * 2), (1, third - step * 2 - off)])
    # Eyes follow the balls upward, blink now and then.
    look_up = C.eye_pix('open').moved(0, -2).svg()
    blink = C.eye_pix('blink').moved(0, -2).svg()
    happy = C.eye_pix('happy').svg()
    eyes = timeline([look_up, blink, happy], [(0, 2.6), (1, 0.12), (0, 2.0), (2, 1.2), (0, 0.84)])
    body = C.body(arms='')
    # Balls in front of him: the low pass crosses his belly under the eyes, never hidden.
    svg = bare(shadow(C.ox + C.w // 2, C.oy + C.h + 2 * C.s, 22).svg() + body.svg() + eyes + arms_l + arms_r + balls)
    write('juggle', svg)


# ---------- hop ----------
def clawd_box(cx, base, w, hgt, leg, arms_up=False):
    """Clawd's glyph stretched to any body size, standing on `base` (the y under the feet), centred on cx."""
    p = Pix()
    x0 = cx - w // 2
    y0 = base - leg - hgt
    u = w / 12
    for lx in (1, 3, 8, 10):
        p.rect(x0 + round(lx * u), base - leg, max(1, round(u)), leg, CLAWD)
    p.rect(x0, y0, w, hgt, CLAWD)
    ah = max(2, round(hgt / 4))
    aw = max(1, round(u))
    ay = y0 + (round(hgt * 0.2) if arms_up else round(hgt / 2))
    for ax in (x0 - aw, x0 + w):
        p.rect(ax, ay, aw, ah, CLAWD)
    ew, eh = max(1, round(u)), max(2, round(hgt / 4))
    for ex in (2, 9):
        p.rect(x0 + round(ex * u), y0 + round(hgt / 4), ew, eh, EYE)
    return p


def hop():
    cx, ground = 64, 66
    # (body w, body h, legs, lift above ground, arms up)
    poses = [(36, 24, 6, 0, False),   # 0 stand
             (42, 19, 3, 0, False),   # 1 crouch
             (31, 29, 6, 5, True),    # 2 stretch, taking off
             (35, 25, 6, 16, True),   # 3 near the top
             (36, 24, 6, 20, True),   # 4 top
             (32, 28, 6, 8, False),   # 5 falling
             (44, 18, 2, 0, False)]   # 6 landing squash
    frames = []
    for w, hgt, leg, lift, up in poses:
        p = clawd_box(cx, ground - lift, w, hgt, leg, up)
        half = max(6, 20 - lift // 2)
        frames.append(shadow(cx, ground, half).svg() + p.svg())
    dust_a = Pix().rect(cx - 26, ground - 3, 3, 2, DUST).rect(cx + 23, ground - 3, 3, 2, DUST).rect(cx - 23, ground - 1, 2, 1, DUST).rect(cx + 21, ground - 1, 2, 1, DUST)
    dust_b = Pix().rect(cx - 31, ground - 5, 2, 2, DUST).rect(cx + 29, ground - 5, 2, 2, DUST).px(cx - 28, ground - 2, DUST).px(cx + 27, ground - 2, DUST)
    sched = [(0, 0.7), (1, 0.14), (2, 0.08), (3, 0.08), (4, 0.18), (3, 0.08), (5, 0.08), (6, 0.14), (1, 0.08), (0, 0.6),
             (1, 0.14), (2, 0.08), (3, 0.08), (4, 0.18), (3, 0.08), (5, 0.08), (6, 0.14), (0, 0.9)]
    total = sum(d for _, d in sched)
    # Dust right after each landing.
    land_times = []
    t = 0.0
    for f, d in sched:
        if f == 6:
            land_times.append(t + d)
        t += d
    ds, prev = [], 0.0
    for lt in land_times:
        ds += [(2, lt - prev), (0, 0.12), (1, 0.14)]
        prev = lt + 0.26
    ds.append((2, total - prev))
    dust = timeline([dust_a.svg(), dust_b.svg(), ''], ds)
    write('hop', bare(timeline(frames, sched) + dust))


if __name__ == '__main__':
    juggle()
    hop()
