"""Laptop: Clawd at a desk at night, typing furiously on a small laptop. Stub arms hammer the keys in bursts,
code scrolls up the screen while a new line types itself, and the screen's glow flickers on Clawd and the desk.
Run: python laptop.py -> ../plugin/hooks/scenes/laptop.svg
"""
import random

from pixkit import EYE, H, W, Clawd, Pix, block, even, hexrgb, layer, new_layer, num, ramp, scene, timeline, write

rng = random.Random(5)

WALL = [hexrgb(c) for c in ['#55639a', '#4f5c90', '#4a5687']]
DESK_Y = 60
DESK_TOP = hexrgb('#a0765a')
DESK_EDGE = hexrgb('#b98a6a')
DESK_FRONT = [hexrgb(c) for c in ['#7d5a45', '#6f4f3c', '#624533']]
NIGHT = [hexrgb(c) for c in ['#17204a', '#1f2b5a', '#2a386a', '#36467a']]
WIN = (104, 6, 22, 26)  # x, y, w, h of the window glass


def background():
    img = new_layer()
    px = img.load()
    for y in range(H):
        for x in range(W):
            px[x, y] = ramp(WALL, y / DESK_Y, x, y) + (255,)
    # Window with a night sky, a moon and a far skyline.
    wx, wy, ww, wh = WIN
    for y in range(wy, wy + wh):
        for x in range(wx, wx + ww):
            px[x, y] = ramp(NIGHT, (y - wy) / wh, x, y) + (255,)
    moon = hexrgb('#f4e9c8')
    for y in range(wy + 3, wy + 10):
        for x in range(wx + 11, wx + 19):
            if (x - wx - 14.5) ** 2 + (y - wy - 6.5) ** 2 <= 12 and (x - wx - 16.5) ** 2 + (y - wy - 5.5) ** 2 > 9:
                px[x, y] = moon + (255,)
    sky_line = [3, 3, 5, 5, 5, 2, 2, 7, 7, 7, 7, 4, 4, 4, 6, 6, 3, 3, 3, 8, 8, 8, 5, 5, 2, 2, 4, 4, 4, 3]
    for i, hgt in enumerate(sky_line):
        x = wx + i
        if x >= wx + ww:
            break
        for y in range(wy + wh - hgt, wy + wh):
            px[x, y] = (24, 30, 58, 255)
            if y > wy + wh - hgt + 1 and (x * 3 + y * 5) % 11 == 0:
                px[x, y] = (255, 214, 120, 255)
    frame = hexrgb('#2a3156')
    for y in range(wy - 2, wy + wh + 2):
        for x in range(wx - 2, wx + ww + 2):
            inner = wx <= x < wx + ww and wy <= y < wy + wh
            if not inner or x == wx + ww // 2:
                px[x, y] = frame + (255,)
    # A poster with the Claude spark, slightly lighter than the wall.
    for y in range(6, 21):
        for x in range(26, 39):
            edge = x in (26, 38) or y in (6, 20)
            px[x, y] = (228, 214, 190, 255) if not edge else (196, 180, 156, 255)
    spark = hexrgb('#d97757')
    for (dx, dy) in [(0, -4), (0, -3), (0, -2), (0, 2), (0, 3), (0, 4), (-4, 0), (-3, 0), (-2, 0), (2, 0), (3, 0), (4, 0),
                     (-2, -2), (2, -2), (-2, 2), (2, 2), (-1, -1), (1, -1), (-1, 1), (1, 1), (0, -1), (0, 1), (-1, 0), (1, 0), (0, 0),
                     (-3, -3), (3, -3), (-3, 3), (3, 3)]:
        px[32 + dx, 13 + dy] = spark + (255,)
    # Desk.
    for x in range(W):
        px[x, DESK_Y] = DESK_EDGE + (255,)
        px[x, DESK_Y + 1] = DESK_TOP + (255,)
        for y in range(DESK_Y + 2, H):
            c = ramp(DESK_FRONT, (y - DESK_Y - 2) / (H - DESK_Y - 2), x, y)
            px[x, y] = (c if y != DESK_Y + 2 else tuple(v - 20 for v in DESK_FRONT[0])) + (255,)
    # A plant on the desk's right end.
    pot = hexrgb('#c96f4f')
    for y in range(DESK_Y - 6, DESK_Y):
        for x in range(110, 117):
            px[x, y] = (pot if x < 115 else tuple(int(v * 0.8) for v in pot)) + (255,)
    leaves = [(108, 51), (107, 50), (109, 50), (106, 49), (110, 49), (108, 49), (108, 48), (105, 48), (111, 48), (107, 47), (109, 47),
              (108, 46), (104, 47), (112, 47), (106, 46), (110, 45)]
    for i, (x, y) in enumerate(leaves):
        x, y = x + 5, y + 2
        px[x, y] = ((95, 165, 95) if i % 3 else (70, 135, 80)) + (255,)
    return img


def stars():
    pts = [(107, 9), (110, 15), (113, 8), (108, 20), (122, 19), (118, 24), (115, 13)]
    out = ''
    for i, (x, y) in enumerate(pts):
        on = Pix().px(x, y, '#ffffff').svg()
        dim = Pix().px(x, y, '#9fb0e0').svg()
        sched = [(0, 1.1 + (i * 0.37) % 1.3), (1, 0.4), (0, 0.6 + (i * 0.53) % 0.9), (1, 0.3)]
        out += timeline([on, dim], sched)
    return out


# ---------- Clawd and the laptop ----------
C = Clawd(24, 36, 3, facing='r')  # body 36 by 24, seated behind the desk
LX = C.ox + C.w + 3  # laptop's left edge


def laptop():
    p = Pix()
    # Screen lid with a dark bezel, hinged on the base.
    p.rect(LX + 5, 34, 28, 22, '#2b2f3a')
    p.rect(LX + 5, 34, 28, 1, '#3d4250')
    # Base and keyboard seen from just above.
    p.rect(LX, 56, 36, 4, '#c3c8d2')
    p.rect(LX, 56, 36, 1, '#dde1e8')
    p.rect(LX + 1, 59, 34, 1, '#9aa0ac')
    for kx in range(LX + 3, LX + 32, 2):
        p.px(kx, 57, '#8a909c')
        p.px(kx + 1, 58, '#8a909c')
    return p


SCR = (LX + 7, 36, 24, 19)  # x, y, w, h of the lit display
CODE = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#e6edf3', '#e6edf3']


def code_line(r, x, y, maxw):
    p = Pix()
    indent = r.choice([0, 0, 2, 2, 4, 6])
    cx = x + 1 + indent
    for _ in range(r.randrange(1, 4)):
        seg = r.randrange(2, 7)
        if cx + seg > x + maxw - 1:
            break
        p.rect(cx, y, seg, 1, r.choice(CODE))
        cx += seg + 1
    return p


def screen():
    sx, sy, sw, sh = SCR
    out = Pix().rect(sx, sy, sw, sh, '#1b2236').svg()
    # A tape of code lines slides up two pixels a step, clipped to the display.
    r = random.Random(9)
    n = 16
    tape = Pix()
    lines = [code_line(r, sx, 0, sw) for _ in range(n)]
    for copy in range(2):
        for i, ln in enumerate(lines):
            tape.merge(ln, 0, sy + 1 + (copy * n + i) * 2)
    step = 0.6
    sched = [(i, step) for i in range(n)]
    offsets = [(0, -2 * i) for i in range(n)]
    vals = ';'.join(f'{dx} {dy}' for dx, dy in offsets)
    kts = ';'.join(num(i / n) for i in range(n))
    out += (f'<g clip-path="url(#scr)"><g><animateTransform attributeName="transform" type="translate" calcMode="discrete" '
            f'values="{vals}" keyTimes="{kts}" dur="{num(step * n)}s" repeatCount="indefinite"/>{tape.svg()}</g></g>')
    # The bottom line types itself out, a few characters at a time, with a block cursor.
    out += Pix().rect(sx, sy + sh - 3, sw, 3, '#232c45').svg()
    full = code_line(random.Random(4), sx, sy + sh - 2, sw - 2)
    xs = sorted({x for x, _ in full})
    frames = []
    for k in range(6):
        cut = xs[0] + (xs[-1] - xs[0] + 1) * k // 5 if xs else sx
        part = Pix({pt: c for pt, c in full.items() if pt[0] < cut})
        cur = Pix().rect(max(cut, sx + 1), sy + sh - 2, 1, 1, '#ffffff')
        frames.append(part.merge(cur).svg())
    out += timeline(frames, even(6, step))
    return out, sched


def arm(x, y):
    return block(Pix(), x, y, C.s, 2 * C.s)


def arms():
    lx, ly, _, _ = C.arm('l')
    rx, ry, _, _ = C.arm('r')
    # Right arm reaches the keys; the left one bobs along out of step.
    right_dn = arm(rx + 2, ry + 3).merge(arm(rx, ry + 3))
    right_up = arm(rx + 2, ry).merge(arm(rx, ry + 1))
    left_dn = arm(lx, ly + 2)
    left_up = arm(lx, ly)
    frames = [right_dn.svg() + left_up.svg(), right_up.svg() + left_dn.svg(), right_dn.svg() + left_dn.svg()]
    burst = [(0, 0.08), (1, 0.08)] * 7
    sched = burst + [(2, 0.5)] + [(0, 0.07), (1, 0.07)] * 9 + [(2, 0.32)] + burst[:8]
    return timeline(frames, sched), sum(d for _, d in sched)


def eyes():
    look = 1  # eyes on the screen
    return timeline([C.eye_pix('open', look).svg(), C.eye_pix('blink', look).svg(), C.eye_pix('happy', look).svg()],
                    [(0, 2.2), (1, 0.12), (0, 2.6), (2, 0.9), (0, 1.4), (1, 0.12), (0, 0.4)])


def glow():
    """The screen's light on Clawd's right side and on the desk: lighter pixels, dithered thinner away from the screen,
    flickering between two strengths."""
    def pix(strength):
        p = Pix()
        for x in range(LX - 6, LX + 38):
            if (x + strength * 3) % 2 == 0 or strength > 1.1:
                p.px(x, DESK_Y + 1, '#c49a80')
        return p.svg()
    return timeline([pix(1.0), pix(1.3), pix(0.7)], [(1, 0.7), (0, 0.15), (1, 0.9), (2, 0.1), (1, 0.5), (0, 0.2), (1, 0.75)])


def build():
    sx, sy, sw, sh = SCR
    scr, _ = screen()
    arm_svg, _ = arms()
    svg = scene(
        f'<defs><clipPath id="scr"><rect x="{sx}" y="{sy}" width="{sw}" height="{sh - 3}"/></clipPath></defs>'
        + layer(background()) + stars()
        + C.body(legs=False, arms='').svg()
        + glow()
        + eyes()
        + laptop().svg() + scr
        + arm_svg
    )
    write('scenery/laptop', svg)



def build_bare():
    """The same desk scene with no room: Clawd, a small wooden desk and the laptop straight on the chat."""
    sx, sy, sw, sh = SCR
    scr, _ = screen()
    arm_svg, _ = arms()
    desk = Pix().rect(16, DESK_Y, 94, 2, '#b98a6a').rect(16, DESK_Y + 2, 94, 2, '#8a6450')
    for lx in (19, 103):
        desk.rect(lx, DESK_Y + 4, 3, 12, '#7d5a45')
    floor = Pix().rect(14, DESK_Y + 16, 98, 1, '#000000@0.16').rect(18, DESK_Y + 17, 90, 1, '#000000@0.16')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">'
           f'<defs><clipPath id="scr"><rect x="{sx}" y="{sy}" width="{sw}" height="{sh - 3}"/></clipPath></defs>'
           + floor.svg() + C.body(legs=False, arms='').svg() + eyes() + desk.svg() + laptop().svg() + scr + arm_svg + '</svg>')
    write('laptop-bare', svg)


if __name__ == '__main__':
    build()
