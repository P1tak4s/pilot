"""See-through Clawd at work: no backdrop, frame-by-frame pixel motion.
- teacher: Clawd at a whiteboard, writing lines of code with a marker, tapping them, turning to check you get it.
- painter: Clawd at an easel painting a little landscape stroke by stroke.
- gardener: Clawd waters a pot; a sprout grows, buds and blooms.
- gym: Clawd curls two dumbbells in turn, a sweat drop now and then.
Run: python bare3.py -> ../plugin/hooks/scenes/*.svg
"""
from pixkit import CLAWD, EYE, H, W, Clawd, Pix, block, hops, timeline, write

SHADOW = '#000000@0.16'
INK = '#3a2a22'


def bare(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" '
            f'shape-rendering="crispEdges">{body}</svg>')


def shadow(cx, y, half):
    return Pix().rect(cx - half, y, 2 * half, 1, SHADOW).rect(cx - half + 2, y + 1, 2 * half - 4, 1, SHADOW).svg()


def arm(x, y, s=3):
    return block(Pix(), x, y, s, 2 * s).svg()


def line(a, b, color, tip=None):
    """Pixels on a straight line from a to b (a held stick, pointer or brush); tip colours the last two."""
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    p = Pix()
    for k in range(n + 1):
        p.px(round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), tip if tip and k >= n - 1 else color)
    return p


# ---------- teacher ----------
def teacher():
    """Instructor Clawd: a slide of code is up on the board. He points his stick at one line after another, taps
    it, turns to you to explain, and moves to the next; then the board switches to the next slide."""
    C = Clawd(30, 36, 3, facing='r')
    ground = C.oy + C.h + 2 * C.s
    bx, by, bw, bh = 66, 10, 50, 34
    board = Pix().rect(bx - 2, by - 2, bw + 4, bh + 4, '#9a958c').rect(bx, by, bw, bh, '#f4f2ec')
    board.rect(bx + 6, by + bh + 2, 2, ground - by - bh - 2, '#9a958c').rect(bx + bw - 8, by + bh + 2, 2, ground - by - bh - 2, '#9a958c')
    board.rect(bx + 4, by + bh, bw - 8, 2, '#b7b1a6')
    slides = [
        [[(4, 6, '#d97757'), (12, 10, INK)], [(8, 8, '#4f6fa8'), (18, 6, INK), (26, 8, '#6aa26a')], [(8, 14, INK), (24, 6, '#d97757')], [(4, 4, '#4f6fa8'), (10, 12, INK)]],
        [[(4, 10, '#6aa26a'), (16, 8, INK)], [(8, 6, INK), (16, 10, '#d97757')], [(8, 4, '#4f6fa8'), (14, 14, INK), (30, 6, '#6aa26a')], [(4, 8, '#d97757')]],
    ]
    def slide(lines):
        p = Pix()
        for i, ln in enumerate(lines):
            for x, w, c in ln:
                p.rect(bx + x, by + 5 + i * 7, w, 2, c)
        return p.svg()
    rx, ry, _, _ = C.arm('r')
    hand = (rx + 3, ry + 1)
    rest_tip = (bx - 4, ry - 2)
    # Per slide: point at each line's start, tap twice, then turn to explain; four lines a slide.
    poles, pole_sched, eye_sched = [], [], []
    def pole(tip):
        poles.append(line(hand, tip, '#8a6040', '#c0392b').svg())
        return len(poles) - 1
    rest = pole(rest_tip)
    for lines in slides:
        for i in range(len(lines)):
            tip = (bx + lines[i][0][0] - 1, by + 6 + i * 7)
            at, tap = pole(tip), pole((tip[0] - 1, tip[1] + 1))
            pole_sched += [(at, 0.35), (tap, 0.15), (at, 0.15), (tap, 0.15), (at, 0.5), (rest, 0.9)]
            eye_sched += [(0, 1.3), (1, 0.9)]
    total = sum(d for _, d in pole_sched)
    half = total / 2
    stick = timeline(poles, pole_sched)
    boards = timeline([slide(slides[0]), slide(slides[1])], [(0, half), (1, half)])
    eyes = timeline([C.eye_pix('open', 1).svg(), C.eye_pix('open', -2).svg()], eye_sched)
    arm_r = Pix().rect(rx, ry, 3, 6, CLAWD).svg()
    body = (shadow(46, ground, 20) + shadow(bx + bw // 2, ground, 28) + board.svg() + boards
            + C.body(arms='l').svg() + eyes + arm_r + stick)
    write('teacher', bare(body))


# ---------- painter ----------
def painter():
    C = Clawd(32, 38, 3, facing='r')
    ground = C.oy + C.h + 2 * C.s
    cx, cy, cw, ch = 70, 14, 40, 30
    easel = Pix()
    for k in range(ground - cy):
        easel.px(cx + 4 - k // 8, cy + k, '#8a6040').px(cx + cw - 4 + k // 8, cy + k, '#8a6040')
    easel.rect(cx + cw // 2, cy - 4, 2, ground - cy + 4, '#6e4a2e')
    easel.rect(cx - 2, cy + ch, cw + 4, 2, '#8a6040')
    canvas = Pix().rect(cx, cy, cw, ch, '#f6efe1').rect(cx, cy, cw, 1, '#e2d6bf')
    # The painting, built stroke by stroke: sky, sun, far hill, near hill, a tree.
    strokes = [
        Pix().rect(cx + 2, cy + 2, cw - 4, 12, '#a9cce8'),
        Pix().rect(cx + 28, cy + 4, 6, 6, '#f2b632').rect(cx + 29, cy + 3, 4, 8, '#f2b632'),
        Pix().rect(cx + 2, cy + 14, cw - 4, 6, '#7fb26a').rect(cx + 8, cy + 12, 14, 2, '#7fb26a'),
        Pix().rect(cx + 2, cy + 20, cw - 4, 8, '#4f8650').rect(cx + 20, cy + 18, 16, 2, '#4f8650'),
        Pix().rect(cx + 10, cy + 10, 2, 8, '#6e4a2e').rect(cx + 7, cy + 6, 8, 5, '#3f7a44'),
    ]
    frames, done = [], Pix()
    for st in strokes:
        done = Pix(dict(done)).merge(st)
        frames.append(done.svg())
    step = 1.1
    sched = [(k, step) for k in range(len(frames))] + [(len(frames) - 1, 2.0)]
    total = step * len(frames) + 2.0
    rx, ry, _, _ = C.arm('r')
    tips = [(cx + 10, cy + 6), (cx + 31, cy + 7), (cx + 14, cy + 15), (cx + 26, cy + 22), (cx + 11, cy + 9)]
    hand = (rx + 4, ry - 1)
    path, psched = [], []
    for tx, ty in tips:
        for dx, dy, d in ((0, 0, 0.4), (2, 1, 0.3), (-1, 1, 0.3)):
            path.append((tx + dx, ty + dy))
            psched.append((len(path) - 1, step * d))
    path.append((cx - 3, cy + ch - 4))
    psched.append((len(path) - 1, 2.0))
    brushes = [line(hand, pt, '#8a6040', '#d97757').svg() for pt in path]
    brush = timeline(brushes, psched)
    palette = Pix().rect(C.ox - 8, C.oy + 14, 10, 6, '#d8c3a0')
    for i, col in enumerate(['#d97757', '#a9cce8', '#4f8650', '#f2b632']):
        palette.rect(C.ox - 7 + (i % 2) * 4, C.oy + 15 + (i // 2) * 3, 2, 2, col)
    arm_r = Pix().rect(rx, ry - 2, 4, 6, CLAWD)
    eyes = timeline([C.eye_pix('open', 1).svg(), C.eye_pix('blink', 1).svg(), C.eye_pix('happy').svg()],
                    [(0, 2.5), (1, 0.12), (0, step * 5 - 2.62), (2, 2.0)])
    wipe = timeline(['', canvas.svg()], [(0, total - 0.25), (1, 0.25)])
    # Bob Ross: a round perm of warm curls, taller than wide at the top and coming down both sides of his head to
    # frame his face, a darker scalloped rim; and his light blue shirt with a collar and buttons.
    import math as _m
    # A plain round afro in one flat brown, like Clawd's flat orange: a dome on his head, a softly bumpy edge,
    # down the sides only to just above his eyes.
    afro = Pix()
    hx, hy = C.ox + C.w / 2, C.oy + 1
    rx_, ry_ = C.w / 2 + 4, 12
    for y in range(int(hy - ry_) - 1, C.oy + 5):
        for x in range(int(hx - rx_) - 1, int(hx + rx_) + 2):
            dx, dy = (x + 0.5 - hx) / rx_, (y + 0.5 - hy) / ry_
            r = 1 + 0.05 * _m.cos(_m.atan2(dy, dx) * 9)
            on_face = C.ox + 2 <= x < C.ox + C.w - 2 and y >= C.oy + 1
            if dx * dx + dy * dy <= r * r and not on_face:
                afro.px(x, y, '#6b4128')
    shirt = Pix()
    top = C.oy + 13
    shirt.rect(C.ox, top, C.w, C.oy + C.h - top, '#a9c6e8').rect(C.ox, C.oy + C.h - 1, C.w, 1, '#8fb0d8')
    neck = C.ox + round(C.w * 0.6)
    for k in range(4):
        shirt.rect(neck - 3 + k, top + k, 7 - 2 * k, 1, CLAWD)  # the open neck: a V of Clawd showing
    shirt.rect(neck - 5, top, 3, 2, '#d6e5f5').rect(neck + 3, top, 3, 2, '#d6e5f5')  # collar points
    for by_ in range(top + 5, C.oy + C.h - 1, 3):
        shirt.px(neck, by_, '#7fa1cc')
    sleeve_l = Pix().rect(C.ox - 3, C.oy + 12, 3, 6, '#a9c6e8')
    arm_r = Pix().rect(rx, ry - 2, 4, 6, '#a9c6e8').rect(rx + 3, ry - 1, 1, 4, CLAWD)
    body = (shadow(36, ground, 18) + easel.svg() + canvas.svg() + timeline(frames, sched) + wipe
            + C.body(arms='l').svg() + shirt.svg() + sleeve_l.svg() + afro.svg() + palette.svg() + eyes + arm_r.svg() + brush)
    write('painter', bare(body))
    assert abs(total - sum(d for _, d in psched)) < 1e-6


# ---------- gardener ----------
def gardener():
    C = Clawd(22, 34, 3, facing='r')
    ground = C.oy + C.h + 2 * C.s
    px0 = 76
    pot = Pix().rect(px0, ground - 12, 18, 12, '#c96f4f').rect(px0 - 2, ground - 14, 22, 3, '#b85f41').rect(px0 + 13, ground - 11, 3, 10, '#a85538')
    soil = Pix().rect(px0 + 1, ground - 15, 16, 1, '#5a3a24')
    stem = '#4f8650'
    leaf = '#7cc35e'
    def plant(stage):
        p = Pix()
        top = ground - 15
        h = [2, 6, 11, 16, 18][stage]
        p.rect(px0 + 8, top - h, 2, h, stem)
        if stage >= 1:
            p.rect(px0 + 5, top - 4, 3, 2, leaf).rect(px0 + 10, top - 5, 3, 2, leaf)
        if stage >= 2:
            p.rect(px0 + 4, top - 9, 4, 2, leaf).rect(px0 + 10, top - 10, 4, 2, leaf)
        if stage == 3:
            p.rect(px0 + 7, top - h - 3, 4, 3, '#e8a07f')
        if stage == 4:
            p.rect(px0 + 5, top - h - 4, 8, 6, '#f2a7c3').rect(px0 + 7, top - h - 6, 4, 10, '#f2a7c3').rect(px0 + 7, top - h - 2, 4, 2, '#f2b632')
        return p.svg()
    stages = [(0, 1.6), (1, 1.6), (2, 1.6), (3, 1.6), (4, 3.2)]
    total = sum(d for _, d in stages)
    rx, ry, _, _ = C.arm('r')

    from coffee import rotate

    def can_sprite():
        # The watering can upright, as one object: body, rim, handle on the left, a straight spout rising to the
        # right with a sprinkler rose. Origin at the body's top-left corner.
        p = Pix().rect(0, 0, 12, 9, '#9fb3c8').rect(0, 0, 12, 1, '#c3d2e0').rect(10, 1, 2, 8, '#7d93aa')
        p.rect(-3, 1, 3, 1, '#7d93aa').rect(-3, 1, 1, 5, '#7d93aa').rect(-3, 5, 3, 1, '#7d93aa')
        p.merge(line((12, 5), (18, 1), '#7d93aa')).merge(line((12, 6), (18, 2), '#7d93aa'))
        rose = Pix().rect(18, -1, 3, 4, '#5f7590')
        return p.merge(rose), rose

    upright, rose = can_sprite()
    tilt = 40  # tipped forward: the spout comes down toward the pot, the whole can turning with it
    pivot = (6, 4)
    tipped = rotate(upright, tilt, *pivot)
    rose_t = [k for k, c in tipped.items() if c == '#5f7590']  # the rose's own colour finds it after the turn
    rcx = sum(x for x, _ in rose_t) / len(rose_t)
    rcy = max(y for _, y in rose_t)
    ox_, oy_ = rx + 6, ry - 12
    held = tipped.moved(ox_, oy_)
    tip = (round(rcx) + ox_, rcy + oy_ + 1)
    put_down = upright.moved(54, ground - 9)
    arm_r = Pix().rect(rx, ry - 6, 3, 6, CLAWD).rect(rx + 3, ry - 6, 2, 3, CLAWD)
    # Water: a fan of streams from the rose, spreading as they fall onto the soil.
    soil_y = ground - 15
    drops = ''
    n = 5
    for j, spread in enumerate((-3, -1, 1, 3)):
        target = (px0 + 8 + spread * 2, soil_y)
        path = [(round((target[0] - tip[0]) * k / n), round((target[1] - tip[1]) * k / n)) for k in range(n + 1)]
        sched = [(k, 0.1) for k in range(n + 1)]
        shift = (j * 2) % (n + 1)
        for d in range(2):
            sh = (shift + d * 3) % (n + 1)
            drops += hops(path, sched[sh:] + sched[:sh], Pix().rect(tip[0] + spread // 2, tip[1], 1, 2, '#6fa8dc').svg())
    watering = timeline([held.svg() + arm_r.svg() + drops, ''], [(0, total - 3.2), (1, 3.2)])
    resting = timeline(['', put_down.svg() + Pix().rect(rx, ry, 3, 6, CLAWD).svg()], [(0, total - 3.2), (1, 3.2)])
    eyes = timeline([C.eye_pix('open', 1).svg(), C.eye_pix('blink', 1).svg(), C.eye_pix('happy').svg()],
                    [(0, 2.0), (1, 0.12), (0, total - 3.2 - 2.12), (2, 3.2)])
    body = (shadow(42, ground, 20) + shadow(px0 + 9, ground, 14) + timeline([plant(i) for i in range(5)], stages)
            + pot.svg() + soil.svg() + C.body(arms='l').svg() + eyes + watering + resting)
    write('gardener', bare(body))


# ---------- gym ----------
def dumbbell(x, y):
    return Pix().rect(x, y, 3, 7, '#4a4f5c').rect(x + 3, y + 2, 6, 3, '#8a8f9c').rect(x + 9, y, 3, 7, '#4a4f5c').svg()


def gym():
    C = Clawd(46, 34, 3)
    ground = C.oy + C.h + 2 * C.s
    lx, ly, _, _ = C.arm('l')
    rx, ry, _, _ = C.arm('r')
    def pose(left_up, right_up):
        p = ''
        for side, up in (('l', left_up), ('r', right_up)):
            ax = lx if side == 'l' else rx
            ay = (ly if side == 'l' else ry) - (8 if up else 0)
            p += arm(ax, ay)
            p += dumbbell(ax - 4 if side == 'l' else ax - 5, ay + (6 if not up else -6))
        return p
    frames = [pose(False, False), pose(True, False), pose(False, True)]
    sched = [(0, 0.5), (1, 0.45), (0, 0.35), (2, 0.45), (0, 0.35), (1, 0.45), (0, 0.35), (2, 0.45), (0, 1.0)]
    total = sum(d for _, d in sched)
    sweat = hops([(0, 0), (0, 2), (0, 4), (0, 6)], [(0, total - 1.2), (1, 0.4), (2, 0.4), (3, 0.4)],
                 timeline(['', Pix().rect(C.ox + C.w - 4, C.oy - 2, 2, 3, '#8fc3e8').svg()], [(0, total - 1.2), (1, 1.2)]))
    focus = Pix()
    for ex, ey, ew, eh in C.eyes():
        focus.rect(ex, ey + 2, ew, eh - 2, EYE)
    eyes = timeline([focus.svg(), C.eye_pix('happy').svg()], [(0, total - 1.0), (1, 1.0)])
    body = shadow(64, ground, 22) + C.body(arms='').svg() + eyes + timeline(frames, sched) + sweat
    write('gym', bare(body))


# ---------- computer ----------
def computer():
    """Clawd at a desk, turned three quarters to his laptop like the coffee Clawd on his crate: thin stub arms, small
    hands on the keyboard. The lid stands at an angle in front of him, its back to us with the Claude spark on it."""
    C = Clawd(26, 34, 3, facing='r')
    desk_y = C.oy + C.h + 1
    desk = Pix().rect(16, desk_y, 96, 2, '#b98a6a').rect(16, desk_y + 2, 96, 2, '#8a6450')
    for lx in (19, 106):
        desk.rect(lx, desk_y + 4, 3, 12, '#7d5a45')
    floor = Pix().rect(14, desk_y + 16, 100, 1, SHADOW).rect(18, desk_y + 17, 92, 1, SHADOW)
    # Keyboard base on the desk in front of him, then the lid: a panel leaning back at an angle, back towards us.
    base = Pix().rect(C.ox + C.w, desk_y - 3, 36, 3, '#aeb4c0').rect(C.ox + C.w, desk_y - 3, 36, 1, '#d6dae2')
    lid = Pix()
    top, bottom = desk_y - 24, desk_y - 3
    for y in range(top, bottom):
        lean = (bottom - y) // 4
        x_a, x_b = 70 + lean, 90 + lean
        lid.rect(x_a, y, x_b - x_a, 1, '#5b6170')
        lid.px(x_b - 1, y, '#4a4f5c').px(x_a, y, '#9fd8ff')  # its far edge in shadow, the screen's glow on the near edge
    lid.rect(70 + (bottom - top) // 4, top, 20, 1, '#7a8090')
    sx, sy = 80 + (bottom - top) // 8, (top + bottom) // 2
    def spark(col):
        p = Pix()
        for dx, dy in ((0, 0), (0, -1), (0, -2), (0, 1), (0, 2), (-1, 0), (-2, 0), (1, 0), (2, 0), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            p.px(sx + dx, sy + dy, col)
        return p.svg()
    logo = timeline([spark('#d97757'), spark('#e8a07f')], [(0, 2.2), (1, 0.6)])
    # Hands on the keys, like his hands on the mug: small blocks, the far one a step further along; they tap in turn.
    def hands(near_up, far_up):
        # Each arm is one piece stepping down from his side to the keyboard; the far arm starts higher and lands
        # further along, behind the near one. Typing lifts only the hand at the end.
        p = Pix()
        key = desk_y - 3
        for far, up in ((True, far_up), (False, near_up)):
            x0 = C.ox + C.w - 1 + (4 if far else 0)
            y0 = key - 9 - (2 if far else 0)
            for k in range(3):
                lift = 2 if (up and k == 2) else 0
                p.rect(x0 + k * 3, y0 + k * 3 - lift, 4, 3, CLAWD)
        return p.svg()
    frames = [hands(False, False), hands(True, False), hands(False, True)]
    burst = [(1, 0.1), (2, 0.1)] * 7
    sched = burst + [(0, 0.7)] + [(1, 0.09), (2, 0.09)] * 9 + [(0, 0.5)] + burst[:8]
    total = sum(d for _, d in sched)
    look = lambda k: C.eye_pix(k, 2).svg()
    eyes = timeline([look('open'), look('blink'), C.eye_pix('happy', 1).svg()],
                    [(0, total * 0.45), (1, 0.12), (0, total * 0.35 - 0.12), (2, total * 0.2)])
    body = (floor.svg() + C.body(legs=False, arms='l').svg() + eyes + desk.svg() + base.svg()
            + timeline(frames, sched) + lid.svg() + logo)
    write('laptop-bare', bare(body))

if __name__ == '__main__':
    teacher()
    painter()
    gardener()
    gym()
