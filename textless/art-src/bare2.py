"""More see-through Clawd scenes: no backdrop, the props sit straight on the chat, frame-by-frame pixel motion.
- meadow-bare: the meadow without its sky; Clawd lies on a tuft of grass, a butterfly flutters, two small clouds
  drift above him.
- reading: Clawd sits on a stack of books with an open book, turns a page now and then, blinks, smiles.
- nap: Clawd naps on a pillow, breathing, little Z's float up.
- paperplane: Clawd throws a paper plane that loops round him and comes back to his hand.
Run: python bare2.py -> ../plugin/hooks/scenes/*.svg
"""
import math
import random

from meadow import butterfly, clawd_lying
from pixkit import CLAWD, EYE, H, W, Clawd, Pix, block, even, hops, timeline, write

SHADOW = '#000000@0.16'


def bare(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" '
            f'shape-rendering="crispEdges">{body}</svg>')


def shadow(cx, y, half):
    return Pix().rect(cx - half, y, 2 * half, 1, SHADOW).rect(cx - half + 2, y + 1, 2 * half - 4, 1, SHADOW).svg()


# ---------- meadow-bare ----------
GRASS = ['#7cc35e', '#66b04f', '#529c44', '#428a3c']


def tuft(frame):
    """A low mound of grass under Clawd with blades that lean one way, then the other."""
    r = random.Random(3)
    p = Pix()
    for x in range(30, 99):
        d = abs(x - 64) / 34
        top = 60 + round(3 * d * d)
        for y in range(top, 64):
            p.px(x, y, GRASS[min(3, (y - top) + (x * 7 % 3 == 0))])
    for i in range(32):
        x = 32 + i * 2 + r.randrange(0, 2)
        d = abs(x - 64) / 34
        base = 60 + round(3 * d * d)
        tall = r.randrange(2, 5)
        lean = 1 if (frame + (i % 3 == 0)) % 2 else 0
        for k in range(tall):
            p.px(x + (lean if k >= tall - 1 else 0), base - k, '#a6dc78' if k == tall - 1 else GRASS[1])
    for x, y, c in [(36, 62, '#ffffff'), (52, 61, '#ffe27a'), (77, 61, '#f6a8c8'), (92, 62, '#ffffff'), (60, 62, '#ffe27a')]:
        p.px(x, y, c)
    return p.svg()


def cloud(x, y, w):
    p = Pix()
    p.rect(x + 2, y, w - 4, 1, '#d7deef').rect(x, y + 1, w, 2, '#d7deef').rect(x + 1, y + 3, w - 2, 1, '#b3bdd9')
    p.rect(x + 3, y - 1, w // 3, 1, '#d7deef')
    return p.svg()


def meadow_bare():
    clouds = (hops([(0, 0), (1, 0), (2, 0), (3, 0), (2, 0), (1, 0)], [(i, 1.1) for i in range(6)], cloud(30, 16, 14))
              + hops([(0, 0), (-1, 0), (-2, 0), (-1, 0)], [(i, 1.4) for i in range(4)], cloud(76, 10, 18)))
    body = (shadow(64, 64, 34) + clouds
            + clawd_lying(48, 46)
            + timeline([tuft(0), tuft(1)], even(2, 1.4))
            + butterfly().replace('#fff3b0', '#e39b2f'))  # amber: the meadow's pale yellow vanishes on a light chat
    write('meadow-bare', bare(body))


# ---------- reading ----------
def reading():
    C = Clawd(46, 26, 3)  # body 36 by 24
    seat = C.oy + C.h
    books = Pix()
    for i, (dx, w, col, spine) in enumerate([(-2, 42, '#4f6fa8', '#3d5689'), (1, 38, '#c95b5b', '#a84646'), (-1, 40, '#6aa26a', '#4f8650')]):
        y = seat + 2 + i * 5
        books.rect(C.ox + dx - 1, y, w, 5, col).rect(C.ox + dx - 1, y + 4, w, 1, spine).rect(C.ox + dx + w - 4, y + 1, 2, 3, '#f1e6d2')
    legs = Pix()
    for lx, ly, lw, lh in C.legs():
        legs.rect(lx, seat, lw, 3, CLAWD)
    # The open book held in front: two cream pages over a cover, lines of grey text.
    bx, by = C.ox + 6, C.oy + 16  # low enough that his eyes show over it
    def book(turn):
        """The open book seen from behind: its cover faces us, the pages face him. A cream page edge shows along the
        top, and a turning page rises above it from right to left."""
        p = Pix().rect(bx - 1, by, 26, 11, '#8a3b3b')
        p.rect(bx - 1, by, 12, 1, '#a34c4c').rect(bx + 14, by, 11, 1, '#a34c4c')
        p.rect(bx + 11, by - 1, 3, 12, '#6e2e2e')  # the spine, closest to us
        p.rect(bx, by - 1, 11, 1, '#efe6d3').rect(bx + 14, by - 1, 10, 1, '#efe6d3')  # page edges
        p.rect(bx + 3, by + 4, 5, 3, '#c9a24a').rect(bx + 17, by + 4, 5, 3, '#c9a24a')  # gold title blocks
        if turn == 1:
            p.rect(bx + 15, by - 4, 8, 3, '#fbf6ea')
        elif turn == 2:
            p.rect(bx + 11, by - 6, 3, 5, '#fbf6ea')
        elif turn == 3:
            p.rect(bx + 2, by - 4, 8, 3, '#fbf6ea')
        return p.svg()
    hands = block(Pix(), bx - 3, by + 3, 3, 5).svg() + block(Pix(), bx + 24, by + 3, 3, 5).svg()
    eye = lambda kind: (C.eye_pix(kind).moved(0, 1) if kind != 'happy' else C.eye_pix('happy')).svg()
    eyes = timeline([eye('open'), eye('blink'), eye('happy')], [(0, 2.4), (1, 0.12), (0, 2.2), (2, 1.2), (0, 2.0), (1, 0.12), (0, 0.96)])
    pages = timeline([book(0), book(1), book(2), book(3)], [(0, 4.0), (1, 0.16), (2, 0.16), (3, 0.16), (0, 4.5)])
    # Half-moon reading glasses sitting low: the frame's top cuts across the bottom of his eyes, so he peeks over
    # them; a low bridge and thin arms out to the sides.
    glasses = Pix()
    (lx, ly, ew, eh), (rx, _, _, _) = C.eyes()
    top = ly + eh - 2
    for ex in (lx, rx):
        glasses.rect(ex - 2, top + 1, ew + 4, 3, '#ffffff@0.2')
        glasses.rect(ex - 2, top, ew + 4, 1, '#3a2a22')
        glasses.rect(ex - 2, top, 1, 4, '#3a2a22').rect(ex + ew + 1, top, 1, 4, '#3a2a22')
        glasses.rect(ex - 1, top + 4, ew + 2, 1, '#3a2a22')
    glasses.rect(lx + ew + 2, top + 1, rx - lx - ew - 4, 1, '#3a2a22')
    glasses.rect(C.ox, top, lx - 2 - C.ox, 1, '#3a2a22').rect(rx + ew + 2, top, C.ox + C.w - rx - ew - 2, 1, '#3a2a22')
    body = (shadow(64, seat + 18, 26) + books.svg() + legs.svg() + C.body(legs=False, arms='lr').svg() + eyes + glasses.svg() + pages + hands)
    write('reading', bare(body))


# ---------- nap ----------
def zee(size, col):
    s = size
    p = Pix().rect(0, 0, s, 1, col).rect(0, s - 1, s, 1, col)
    for k in range(1, s - 1):
        p.px(s - 1 - k, k, col)
    return p


def nap():
    pillow = Pix().rect(28, 56, 22, 6, '#e9e4f2').rect(27, 57, 24, 4, '#e9e4f2').rect(29, 61, 20, 1, '#c8c0da')
    blanket = Pix().rect(56, 56, 40, 8, '#7d8fc4').rect(56, 56, 40, 1, '#9aaad6').rect(56, 63, 40, 1, '#62719f')
    for x in range(58, 96, 6):
        blanket.rect(x, 58, 2, 2, '#9aaad6')
    snooze = ''
    for i, (s, col) in enumerate([(3, '#9a8fb8'), (4, '#8a7fab'), (5, '#7a6f9e')]):
        path = [(0, 0), (1, -2), (1, -4), (2, -6), (2, -8), (3, -10)]
        sched = [(k, 0.5) for k in range(len(path))]
        shift = i * 2
        z = zee(s, col).moved(54 + i * 6, 40 - i * 4).svg()
        snooze += hops(path, sched[shift:] + sched[:shift], timeline([z, ''], [(0, 2.5), (1, 0.5)]))
    body = (shadow(64, 64, 34) + pillow.svg() + clawd_lying(34, 50) + blanket.svg() + snooze)
    write('nap', bare(body))


# ---------- paper plane ----------
PAPER = '#dcd4c4'
FOLD = '#8f8573'


def plane(tilt=0, facing=1):
    """A paper plane, each paper pixel drawn 2x2. facing 1 flies right, -1 left; tilt 1 lifts the nose, -1 dips it."""
    cells = {(0, 0): PAPER, (1, 0): PAPER, (2, 1): PAPER, (3, 1): PAPER, (4, 2): PAPER, (1, 1): PAPER, (2, 2): PAPER,
             (3, 2): PAPER, (0, 3): PAPER, (1, 3): PAPER, (2, 3): PAPER, (1, 2): FOLD, (2, 3): FOLD}
    big = Pix()
    for (x, y), c in cells.items():
        y2 = y - round(tilt * (x - 2) / 2)
        x2 = x if facing > 0 else 4 - x
        big.rect(x2 * 2 - 4, y2 * 2 - 4, 2, 2, c)
    return big.svg()


def paperplane():
    """He throws from his right hand; the plane climbs, banks round over his head and glides down into his left
    hand. He passes it back across to his right hand and throws again. The nose always points where it flies."""
    C = Clawd(46, 34, 3)
    ground = C.oy + C.h + 2 * C.s
    rx, ry, _, _ = C.arm('r')
    lx, ly, _, _ = C.arm('l')
    right = (rx + 2, ry - 8)
    left = (lx + 1, ly - 8)
    cx = (right[0] + left[0]) / 2
    half = (right[0] - left[0]) / 2
    n = 26
    flight = []
    for k in range(n + 1):
        t = k / n
        import math as _m
        wide = half + (44 - half) * _m.sin(_m.pi * t) ** 0.6
        x = cx + wide * _m.cos(_m.pi * t)
        y = right[1] + (left[1] - right[1]) * t - 30 * _m.sin(_m.pi * t) + 6 * _m.sin(2 * _m.pi * t)
        flight.append((round(x), round(y)))
    # The hand-off: carried low across his front from the left hand back to the right.
    m = 5
    handoff = [(round(left[0] + (right[0] - left[0]) * j / m), left[1] + 6 - round(3 * math.sin(math.pi * j / m))) for j in range(1, m + 1)]
    pts = flight + handoff
    hold, step, carry_step, rest = 0.9, 0.11, 0.12, 0.5
    # Which way it points: along its motion while flying, level and facing right while held or carried.
    frames, keys = [], {}
    def frame_of(tilt, facing):
        key = (tilt, facing)
        if key not in keys:
            keys[key] = len(frames)
            frames.append(plane(tilt, facing))
        return keys[key]
    seq = [frame_of(0, 1)]
    for k in range(1, n + 1):
        dx = pts[k][0] - pts[k - 1][0]
        dy = pts[k][1] - pts[k - 1][1]
        facing = 1 if dx >= 0 else -1
        tilt = 1 if dy < -abs(dx) * 0.4 else -1 if dy > abs(dx) * 0.4 else 0
        seq.append(frame_of(tilt, facing))
    seq += [frame_of(0, 1)] * m
    durs = [hold] + [step] * n + [carry_step] * (m - 1) + [carry_step + rest]
    sched = list(zip(range(len(pts)), durs))
    total = sum(durs)
    offsets = [(x - right[0], y - right[1]) for x, y in pts]
    look_sched = list(zip(seq, durs))
    planes = f'<g transform="translate({right[0]} {right[1]})">{hops(offsets, sched, timeline(frames, look_sched))}</g>'
    up_r, fwd_r, dn_r = arm(rx, ry - 5), arm(rx + 1, ry - 2), arm(rx, ry)
    up_l, dn_l = arm(lx, ry - 5), arm(lx, ly)
    t_throw = hold
    t_catch = hold + n * step - 3 * step
    t_hand = hold + n * step
    r_arm = timeline([up_r, fwd_r, dn_r], [(0, hold), (1, 0.3), (2, t_hand - hold - 0.3), (0, total - t_hand)])
    l_arm = timeline([dn_l, up_l], [(0, t_catch), (1, t_hand - t_catch + carry_step * 2), (0, total - t_hand - carry_step * 2)])
    look = lambda dx, dy=0: C.eye_pix('open').moved(dx, dy).svg()
    eyes = timeline([look(2), look(1, -2), look(-1, -2), look(-2), C.eye_pix('happy').svg()],
                    [(0, t_throw + step * 4), (1, step * 8), (2, step * 8), (3, step * 6), (4, total - t_throw - step * 26)])
    body = shadow(64, ground, 22) + C.body(arms='').svg() + eyes + l_arm + r_arm + planes
    write('paperplane', bare(body))


def arm(x, y):
    return block(Pix(), x, y, 3, 6).svg()

if __name__ == '__main__':
    meadow_bare()
    reading()
    nap()
    paperplane()
