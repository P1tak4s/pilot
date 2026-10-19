"""Sit: Clawd sits three-quarter turned on a wooden crate, a steaming mug held in both hands. He looks around,
swings his legs now and then, lifts the mug for a sip with happy closed eyes, and looks up at nothing much.
No backdrop: the crate and a soft shadow sit straight on the chat.
Run: python sit.py -> ../plugin/hooks/scenes/sit.svg
"""
from coffee import mug_upright, rotate, steam
from pixkit import CLAWD, EYE, H, W, Clawd, Pix, block, even, timeline, write

C = Clawd(48, 30, 3, facing='r')  # body 30 by 24
SEAT = C.oy + C.h  # top of the crate
LOOP = 14.0


def bare(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 {W} {H}" '
            f'shape-rendering="crispEdges">{body}</svg>')


def poly(points, color):
    """Pixels inside a polygon, rasterised with PIL so slanted crate edges step like hand-placed pixels."""
    from PIL import Image, ImageDraw
    m = Image.new('1', (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=1)
    px = m.load()
    return Pix({(x, y): color for y in range(H) for x in range(W) if px[x, y]})


def crate():
    """A crate turned three quarters like Clawd: the face he looks along, a darker side going back to the left,
    and the lid between them."""
    x0, x1 = 54, 81
    top, bot = SEAT + 3, SEAT + 17
    vx, vy = -8, -3  # the way the box recedes
    p = Pix()
    p.rect(x0 + vx - 1, bot, x1 - x0 - vx + 3, 1, '#000000@0.16').rect(x0 + vx + 1, bot + 1, x1 - x0 - vx - 1, 1, '#000000@0.16')
    p.merge(poly([(x0, top), (x0 + vx, top + vy), (x0 + vx, bot + vy), (x0, bot)], '#5f3f28'))
    p.merge(poly([(x0, top), (x1, top), (x1 + vx, top + vy), (x0 + vx, top + vy)], '#9a6a45'))
    p.rect(x0, top, x1 - x0, bot - top, '#7d5436')
    for py in (top + 5, top + 10):
        p.rect(x0, py, x1 - x0, 1, '#5f3f28')
    p.rect(x1 - 3, top, 3, bot - top, '#6b4830')  # one post, at the far corner; the near one fought the side face
    return p


def legs(kick):
    """Legs hang over the crate face he looks along. The far pair sits a step back and a pixel higher, so the legs
    turn with him. kick 0: still; 1 and 2: the lower legs swing opposite ways."""
    p = Pix()
    lw = C.s
    pairs = [((59, CLAWD), (63, CLAWD)), ((70, CLAWD), (74, CLAWD))]
    for i, ((fx, fc), (nx, nc)) in enumerate(pairs):
        for k, (x, c, drop) in enumerate(((fx, fc, -1), (nx, nc, 0))):
            dx = 0 if not kick else (2 if (i + k + kick) % 2 else -1)
            # Thigh lying forward on the lid, a knee at the front edge, then the shin hanging down over it.
            p.rect(x, SEAT, lw + 2, 3 + drop, c)
            p.rect(x + 2, SEAT + 3 + drop, lw, 3, c)
            p.rect(x + 2 + dx, SEAT + 6 + drop, lw, 2, c)
    return p.svg()


def eyes(kind):
    p = Pix()
    for ex, ey, ew, eh in C.eyes():
        if kind == 'right':
            p.rect(ex + 1, ey, ew, eh, EYE)
        elif kind == 'left':
            p.rect(ex - 3, ey, ew, eh, EYE)
        elif kind == 'up':
            p.rect(ex, ey - 2, ew, eh, EYE)
        elif kind == 'blink':
            p.rect(ex + 1, ey + eh - 2, ew, 1, EYE)
    if kind == 'happy':
        p = C.eye_pix('happy', 1)  # chunky arcs, scaled to his size
    return p.svg()


def hands(x, y):
    return block(Pix(), x, y, 3, 4).svg()


MX, MY = 66, 48  # the mug's rim, held at the chest


def poses():
    mug = mug_upright()
    rest = Pix().merge(mug, MX, MY).svg() + hands(MX - 2, MY + 3) + hands(MX + 8, MY + 4)
    # Short wisps, so they curl between the eyes rather than over them.
    puffs = [Pix({k: c for k, c in steam(i).items() if k[1] >= -7}).moved(MX, MY).svg() for i in range(4)]
    rest += timeline(puffs, even(4, 1.0))
    lift = rotate(mug, -12, 5, 5).moved(MX + 1, MY - 5).svg() + hands(MX - 1, MY - 2) + hands(MX + 9, MY - 1)
    sip = rotate(mug, -38, 5, 5).moved(MX + 4, MY - 11).svg() + hands(MX + 2, MY - 6) + hands(MX + 11, MY - 4)
    return [rest, lift, sip]


def build():
    pose_sched = [(0, 5.5), (1, 0.25), (2, 1.5), (1, 0.25), (0, 6.5)]
    eye_frames = [eyes(k) for k in ('right', 'left', 'up', 'blink', 'happy')]
    eye_sched = [(0, 2.0), (3, 0.12), (1, 1.88), (0, 1.5), (4, 2.0), (4, 1.5), (2, 1.5), (0, 1.5), (3, 0.12), (0, 1.88)]
    kick = [(0, 4.0)] + [(1, 0.2), (2, 0.2)] * 4 + [(0, 5.0)] + [(1, 0.2), (2, 0.2)] * 4 + [(0, 1.8)]
    assert abs(sum(d for _, d in pose_sched) - LOOP) < 1e-6
    assert abs(sum(d for _, d in eye_sched) - LOOP) < 1e-6
    assert abs(sum(d for _, d in kick) - LOOP) < 1e-6
    svg = bare(
        crate().svg()
        + timeline([legs(0), legs(1), legs(2)], kick)
        + C.body(legs=False, arms='lr').svg()  # the side stubs stay, like the glyph's ears
        + timeline(eye_frames, eye_sched)
        + timeline(poses(), pose_sched)
    )
    write('sit', svg)



def beanbag():
    """A soft beanbag turned the same way as Clawd: a squashed round lump, a lighter top where he sinks in, a darker
    underside, and a seam."""
    p = Pix()
    cx, cy, rx, ry = C.ox + C.w // 2 + 4, SEAT + 7, 24, 10
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            if dx * dx + dy * dy > 1:
                continue
            col = '#5d7fb4' if dy < -0.3 else '#4a6a9e' if dy < 0.45 else '#3a5585'
            p.px(x, y, col)
    for x in range(cx - rx + 4, cx + rx - 3):
        p.px(x, cy + 2 + round(2 * ((x - cx) / rx) ** 2), '#2f466e')  # the seam
    p.rect(cx - rx + 2, cy + ry + 1, 2 * rx - 4, 1, '#000000@0.16')
    return p


def laptop_lap():
    """Clawd sunk into a beanbag, turned like the coffee Clawd, with a laptop on his lap: the base on his thighs, the lid
    leaning back at the far end with its back to us and the Claude spark on it. His hands tap the keys in bursts
    and his legs swing now and then."""
    base_y = SEAT - 3
    bx0, bx1 = C.ox + C.w - 8, C.ox + C.w + 24  # keys reach out past his body; the lid stands at the far end
    base = Pix().rect(bx0, base_y, bx1 - bx0, 3, '#aeb4c0').rect(bx0, base_y, bx1 - bx0, 1, '#d6dae2')
    lid = Pix()
    top = base_y - 18
    for y in range(top, base_y):
        lean = (base_y - y) // 4
        xa, xb = bx1 - 12 + lean, bx1 + lean
        lid.rect(xa, y, xb - xa, 1, '#5b6170')
        lid.px(xb - 1, y, '#4a4f5c').px(xa, y, '#9fd8ff')
    lid.rect(bx1 - 12 + (base_y - top) // 4, top, 12, 1, '#7a8090')
    sx, sy = bx1 - 6 + (base_y - top) // 8, (top + base_y) // 2
    def spark(col):
        p = Pix()
        for dx, dy in ((0, 0), (0, -1), (0, -2), (0, 1), (0, 2), (-1, 0), (-2, 0), (1, 0), (2, 0), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            p.px(sx + dx, sy + dy, col)
        return p.svg()
    logo = timeline([spark('#d97757'), spark('#e8a07f')], [(0, 2.2), (1, 0.6)])
    edge = C.ox + C.w  # his body's front
    # His arms are Clawd's own stubs: a short block, a little longer than square, tight against his front. They hammer
    # the keys by bobbing up and slamming down, the two in turn; a key flashes where one lands.
    def hammer(near_up, far_up):
        p = Pix()
        for far, up in ((True, far_up), (False, near_up)):
            # A 6 px block; down, its bottom sits on the keyboard's top edge (base_y), up it lifts 5 px clear.
            x = edge - 1 + (4 if far else 0)
            y = base_y - 6 - (1 if far else 0) - (5 if up else 0)
            p.rect(x, y, 6, 6, CLAWD)
            if not up:
                p.rect(x + 1, base_y, 4, 1, '#ffffff')
        return p.svg()
    frames = [hammer(False, False), hammer(True, False), hammer(False, True)]
    burst = [(1, 0.1), (2, 0.1)] * 8
    sched = burst + [(0, 0.8)] + [(1, 0.09), (2, 0.09)] * 10 + [(0, 0.6)] + burst
    total = sum(d for _, d in sched)
    eyes_ = timeline([eyes('right'), eyes('blink'), eyes('happy'), eyes('up')],
                     [(0, total * 0.4), (1, 0.12), (0, total * 0.2 - 0.12), (3, total * 0.12), (0, total * 0.13), (2, total * 0.15)])
    kick = [(0, total * 0.5)] + [(1, 0.2), (2, 0.2)] * 3 + [(0, total * 0.5 - 1.2)]
    svg = bare(
        beanbag().svg()
        + timeline([legs(0), legs(1), legs(2)], kick)
        + C.body(legs=False, arms='l').svg()
        + eyes_
        + base.svg() + timeline(frames, sched) + lid.svg() + logo
    )
    write('laptop-bare', svg)


if __name__ == '__main__':
    build()
    laptop_lap()
