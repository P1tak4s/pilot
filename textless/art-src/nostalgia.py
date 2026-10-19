"""The nostalgia set: the waiting things old computers showed, on their own, without the computer around them.
- boot: three blue blocks sliding through a rounded track, the way an old boot screen waited.
- hourglass: a pixel hourglass that drains, tips over and starts again.
- copy: a sheet of paper flying from one folder to another above a filling bar.
- progress: a grey bevelled bar filling with navy chunks, stalling near the end like it always did.
- dvd: the word DVD bouncing round the card, a new colour on every wall, now and then landing right in a corner.
- ajax: the ring of grey dots from early web pages, one bright dot running round.
- invaders: a wave of little robots marching down while the ship below shoots them one by one.
- snake: the old phone game, eating, growing, blinking and starting over.
- pong: two paddles, top and bottom, keeping a square ball going between them.
Fitted whole (data-fit="contain") so nothing is ever cropped.
Run: python nostalgia.py -> ../plugin/hooks/scenes/nostalgia/*.svg
"""
import math
import random

from pixkit import H, W, Pix, num, timeline, write

MX, MY = W // 2, H // 2
# Claude's own colours, used for everything in the set
O, OL, OD, ODD = '#d97757', '#eba88d', '#b0563a', '#8a4430'
CREAM, TAN, GREY, INK = '#f0eee6', '#c2b8a3', '#8a8780', '#1f1e1d'
BLACK = INK


SQ = H  # the games are square: the middle H by H of the canvas, from SX to SX + SQ
SX = (W - SQ) // 2


def svg(body, bg=None, zoom=1, square=False):
    """`zoom` above 1 shows only the middle of the canvas, so a small object fills more of the card. `square` is for
    the games: they play in the middle square of the canvas."""
    back = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ''
    vw, vh = W / zoom, H / zoom
    box = f'{num(MX - vw / 2)} {num(MY - vh / 2)} {num(vw)} {num(vh)}'
    w, h = 560, round(560 * H / W)
    # A square game paints its background the whole width but plays in the middle square, and is not fitted whole:
    # the card fills its box and crops the sides first, so a narrow window loses background, never the game.
    fit = '' if square else ' data-fit="contain"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg"{fit} width="{w}" height="{h}" '
            f'viewBox="{box}" shape-rendering="crispEdges">{back}{body}</svg>')


def steps(values, dur, attr):
    """A discrete attribute track: one value after another, evenly spaced, on a loop."""
    return (f'<animate attributeName="{attr}" calcMode="discrete" values="{";".join(str(v) for v in values)}" '
            f'dur="{num(dur)}s" repeatCount="indefinite"/>')


def boot():
    tw, th = 44, 9
    x0, y0 = MX - tw // 2, MY - th // 2
    track = Pix()
    edge = GREY
    track.rect(x0 + 1, y0, tw - 2, 1, edge).rect(x0 + 1, y0 + th - 1, tw - 2, 1, edge)
    track.rect(x0, y0 + 1, 1, th - 2, edge).rect(x0 + tw - 1, y0 + 1, 1, th - 2, edge)
    blocks = Pix()
    for i in range(3):
        bx = i * 5
        blocks.rect(bx, 0, 4, 1, OL).rect(bx, 1, 4, 3, O).rect(bx, 4, 4, 1, OD)
    inner_x, inner_w = x0 + 2, tw - 4
    xs = list(range(-14, inner_w + 1))
    clip = (f'<clipPath id="bt"><rect x="{inner_x}" y="{y0 + 2}" width="{inner_w}" height="{th - 4}"/></clipPath>')
    slide = (f'<g clip-path="url(#bt)"><g>'
             f'<animateTransform attributeName="transform" type="translate" calcMode="discrete" '
             f'values="{";".join(f"{inner_x + x},{y0 + 2}" for x in xs)}" dur="2.4s" repeatCount="indefinite"/>'
             f'{blocks.svg()}</g></g>')
    write('nostalgia/boot', svg(f'<defs>{clip}</defs>' + track.svg() + slide, zoom=1.8))


def hourglass_pix(fill):
    """An hourglass 15 wide and 23 tall, as a dict of cells. `fill` 0..1 is how much sand has fallen."""
    wood, glass, sand = ODD, CREAM, O
    p = Pix()
    p.rect(0, 0, 15, 2, wood).rect(0, 21, 15, 2, wood)
    half = [6, 6, 5, 5, 4, 3, 2, 1, 1]  # half-width of the glass bulb per row, top row first
    cells = {}
    for r, hw in enumerate(half):
        for y in (2 + r, 20 - r):
            for x in range(7 - hw, 8 + hw):
                cells[(x, y)] = None
    cells[(7, 11)] = None
    for (x, y) in cells:
        p.px(x, y, glass + '@0.35')
    top_rows = [y for y in range(2, 11)]
    bottom_rows = [y for y in range(20, 11, -1)]
    total_top = sum(1 for (x, y) in cells if y in top_rows)
    left = round(total_top * (1 - fill))
    # sand in the top sits low, at the neck; in the bottom it piles from the floor up
    for y in reversed(top_rows):
        for x in sorted((x for (x, yy) in cells if yy == y), key=lambda x: abs(x - 7)):
            if left > 0:
                p.px(x, y, sand)
                left -= 1
    fallen = round(total_top * fill)
    for y in bottom_rows:
        for x in sorted((x for (x, yy) in cells if yy == y), key=lambda x: abs(x - 7)):
            if fallen > 0:
                p.px(x, y, sand)
                fallen -= 1
    if 0 < fill < 1:
        for y in range(11, 19):
            p.px(7, y, sand)
    p.rect(1, 2, 1, 19, wood).rect(13, 2, 1, 19, wood)
    return p


def hourglass():
    ox, oy = MX - 7, MY - 11
    frames, sched = [], []
    n = 10
    for k in range(n + 1):
        frames.append(hourglass_pix(k / n).moved(ox, oy).svg())
        sched.append((k, 0.5 if 0 < k < n else 0.9))
    # tipping over: the full-bottom glass lying on its side, then upright again with the sand on top
    side = Pix()
    for (x, y), c in hourglass_pix(1.0).items():
        side.px(MX - 11 + (22 - y), MY - 7 + x, c)
    frames.append(side.svg())
    sched.append((len(frames) - 1, 0.35))
    write('nostalgia/hourglass', svg(timeline(frames, sched), zoom=1.6))


def folder(p, x, y, open_=False):
    p.rect(x, y, 7, 3, OD).rect(x, y + 2, 18, 12, O)
    p.rect(x, y + 13, 18, 1, OD)
    if open_:
        p.rect(x + 2, y + 3, 14, 2, CREAM)


def paper(x, y):
    p = Pix().rect(x, y, 7, 9, CREAM)
    for r in range(2, 8, 2):
        p.rect(x + 1, y + r, 5, 1, TAN)
    return p.svg()


def copy():
    base = Pix()
    lx, rx, fy = 18, 92, 26
    folder(base, lx, fy, open_=True)
    folder(base, rx, fy, open_=True)
    bx, by, bw = 28, 52, 72
    base.rect(bx, by, bw, 1, GREY).rect(bx, by + 7, bw, 1, GREY)
    base.rect(bx, by, 1, 8, GREY).rect(bx + bw - 1, by, 1, 8, GREY)
    n = 14
    flights = []
    for i in range(n + 1):
        t = i / n
        x = round(lx + 6 + (rx - lx) * t)
        y = round(fy - 2 - math.sin(t * math.pi) * 12)
        flights.append(paper(x, y))
    fill = []
    chunks = 12
    for c in range(chunks + 1):
        p = Pix()
        for j in range(c):
            p.rect(bx + 2 + j * 6, by + 2, 5, 4, O)
        fill.append(p.svg())
    # each sheet is one flight; the bar gains one chunk per sheet, then empties and starts again
    hop = 0.07
    fly = timeline(flights, [(i, hop) for i in range(len(flights))])
    bar = timeline(fill, [(c, hop * len(flights)) for c in range(chunks + 1)])
    write('nostalgia/copy', svg(base.svg() + bar + fly, zoom=1.25))


def progress():
    bw, bh = 86, 14
    x0, y0 = MX - bw // 2, MY - bh // 2
    base = Pix().rect(x0, y0, bw, bh, '#dcd6c8')
    base.rect(x0, y0, bw, 1, '#f7f5ef').rect(x0, y0, 1, bh, '#f7f5ef')
    base.rect(x0, y0 + bh - 1, bw, 1, '#6b665c').rect(x0 + bw - 1, y0, 1, bh, '#6b665c')
    base.rect(x0 + 2, y0 + 2, bw - 4, 1, GREY).rect(x0 + 2, y0 + 2, 1, bh - 4, GREY)
    chunks = 13
    frames = []
    for c in range(chunks + 1):
        p = Pix()
        for j in range(c):
            p.rect(x0 + 4 + j * 6, y0 + 4, 5, bh - 7, O)
        frames.append(p.svg())
    # quick at first, slower in the middle, a long stall on the last chunk, then done
    times = [0.25, 0.2, 0.2, 0.3, 0.5, 0.25, 0.25, 0.6, 0.3, 0.4, 0.8, 0.35, 2.6, 1.0]
    write('nostalgia/progress', svg(base.svg() + timeline(frames, list(enumerate(times))), zoom=1.3))


DVD_D = ['#######..', '########.', '##....###', '##.....##', '##.....##', '##.....##', '##....###', '########.',
         '#######..']
DVD_V = ['##.....##', '##.....##', '.##...##.', '.##...##.', '.##...##.', '..##.##..', '..##.##..', '...###...',
         '....#....']


def dvd_cells():
    """The word DVD in fat slanted pixel letters over a flat disc, 32 by 16. Our own letters, not the real logo."""
    cells = set()
    for i, glyph in enumerate([DVD_D, DVD_V, DVD_D]):
        for y, row in enumerate(glyph):
            lean = (8 - y) // 3  # lean right towards the top, like the old box art
            for x, ch in enumerate(row):
                if ch == '#':
                    cells.add((1 + i * 10 + x + lean - 1, y))
    for y in range(11, 16):
        dy = (y - 13) / 2.6
        half = 15 * (1 - dy * dy) ** 0.5
        for x in range(32):
            dx = x + 0.5 - 16
            if abs(dx) <= half and not (y == 13 and abs(dx) < 4):
                cells.add((x, y))
    return cells


def dvd():
    cells = dvd_cells()
    rows = {}
    for x, y in cells:
        rows.setdefault(y, []).append(x)
    rects = []
    for y, xs in sorted(rows.items()):
        xs.sort()
        start = xs[0]
        for k, x in enumerate(xs):
            if k + 1 == len(xs) or xs[k + 1] != x + 1:
                rects.append(f'<rect x="{start}" y="{y}" width="{x - start + 1}" height="1"/>')
                if k + 1 < len(xs):
                    start = xs[k + 1]
    # ranges 96 and 64 share a factor, so the logo lands exactly in a corner every 192 steps
    xr, yr = W - 32, H - 16
    xs = list(range(0, xr + 1)) + list(range(xr - 1, 0, -1))
    ys = list(range(0, yr + 1)) + list(range(yr - 1, 0, -1))
    step = 0.05
    period = 2 * 192
    hits = sorted({t for t in range(0, period, xr)} | {t for t in range(0, period, yr)})
    colours = [O, CREAM, OL, TAN, OD, GREY]
    fill = (f'<animate attributeName="fill" calcMode="discrete" '
            f'values="{";".join(colours[i % len(colours)] for i in range(len(hits)))}" '
            f'keyTimes="{";".join(num(t / period) for t in hits)}" dur="{num(period * step)}s" repeatCount="indefinite"/>')
    body = (f'<g><animateTransform attributeName="transform" type="translate" calcMode="discrete" '
            f'values="{";".join(f"{x},0" for x in xs)}" dur="{num(len(xs) * step)}s" repeatCount="indefinite"/>'
            f'<g fill="{colours[0]}"><animateTransform attributeName="transform" type="translate" calcMode="discrete" '
            f'values="{";".join(f"0,{y}" for y in ys)}" dur="{num(len(ys) * step)}s" repeatCount="indefinite"/>'
            f'{fill}{"".join(rects)}</g></g>')
    write('nostalgia/dvd', svg(body))


def ajax():
    n, rad = 8, 9
    spots = []
    for i in range(n):
        a = i * 2 * math.pi / n - math.pi / 2
        spots.append((round(MX + math.cos(a) * rad) - 1, round(MY + math.sin(a) * rad) - 1))
    shades = [OL, O, '#c86a4c', OD, '#9c4c35', ODD, '#7a3d2b', '#7a3d2b']
    frames = []
    for k in range(n):
        p = Pix()
        for i, (x, y) in enumerate(spots):
            p.rect(x, y, 3, 3, shades[(k - i) % n])
        frames.append(p.svg())
    write('nostalgia/ajax', svg(timeline(frames, [(i, 0.1) for i in range(n)]), zoom=1.8))


BOTS = [  # three little robots of our own, two leg poses each
    (['...#...', '.#####.', '##.#.##', '#######', '.#.#.#.', '#.....#'],
     ['...#...', '.#####.', '##.#.##', '#######', '.#.#.#.', '.#...#.'], O),
    (['#.....#', '#.###.#', '##.#.##', '#######', '..#.#..', '.#...#.'],
     ['#.....#', '#.###.#', '##.#.##', '#######', '..#.#..', '#.....#'], OL),
    (['..###..', '.#####.', '#..#..#', '#######', '#.#.#.#', '.......'],
     ['..###..', '.#####.', '#..#..#', '#######', '.#.#.#.', '#.....#'], OD),
]
SHIP = ['....#....', '...###...', '.#######.', '#########', '##.###.##']
BOOM = ['#..#..#', '.#.#.#.', '..#.#..', '##...##', '..#.#..', '.#.#.#.']


def cells_svg(rows, ox, oy):
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x] == '#':
                s = x
                while x < len(row) and row[x] == '#':
                    x += 1
                out.append(f'<rect x="{ox + s}" y="{oy + y}" width="{x - s}" height="1"/>')
            else:
                x += 1
    return ''.join(out)


def invaders():
    """The old arcade shooter with robots: a row of bots marches side to side and creeps down, the ship below
    picks them off one by one, and when the last one goes the wave starts again."""
    cols, rws, sx, sy = 5, 3, 10, 10
    bw = (cols - 1) * sx + 7
    ox, oy, dx = SX + 4, 8, 2
    ship_y, ship_x = H - 8, (W - 9) // 2
    alive = {(c, r) for c in range(cols) for r in range(rws)}
    killed = {}
    offs, ships, shots, t = [], [], [], 0
    bullet, cool = None, 6
    rnd = random.Random(5)
    target = None
    while (alive or t < (max(killed.values()) + 14 if killed else 0)) and t < 3000:
        if alive and t % 3 == 0:
            if not (SX + 2 <= ox + dx <= SX + SQ - 2 - bw):
                dx, oy = -dx, oy + 3
            else:
                ox += dx
        offs.append((ox, oy))
        if alive and (target not in alive):
            low = {}
            for c, r in alive:
                low[c] = max(low.get(c, -1), r)
            target = rnd.choice(sorted(low.items()))
        if alive:
            lead = dx * ((ship_y - (oy + target[1] * sy)) / 6) / 3  # aim where the bot will be
            tx = round(ox + target[0] * sx + 3 - 4 + lead)
            ship_x += max(-1, min(1, tx - ship_x))
        ships.append(ship_x)
        cool -= 1
        if bullet is None and alive and cool <= 0 and abs(ship_x - tx) <= 1:
            bullet = [ship_x + 4, ship_y - 3]
            cool = 5
        if bullet is not None:
            bullet[1] -= 6
            for c, r in list(alive):
                ax, ay = ox + c * sx, oy + r * sy
                if ax <= bullet[0] < ax + 7 and ay <= bullet[1] + 8 and bullet[1] < ay + 6:
                    alive.discard((c, r))
                    killed[(c, r)] = t
                    bullet = None
                    break
            if bullet is not None and bullet[1] < -3:
                bullet = None
        shots.append(tuple(bullet) if bullet else (-5, -5))
        t += 1
    total = t
    dur = f'{num(total * 0.07)}s'

    def track(attr, vals, kind='animate'):
        v = ';'.join(str(x) for x in vals)
        if kind == 'move':
            return (f'<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="{v}" '
                    f'dur="{dur}" repeatCount="indefinite"/>')
        return f'<animate attributeName="{attr}" calcMode="discrete" values="{v}" dur="{dur}" repeatCount="indefinite"/>'

    # legs swap every few steps: two copies of the wave, one per pose, taking turns
    pose = [(k // 6) % 2 for k in range(total)]
    layers = []
    for p in (0, 1):
        vis = ['1' if q == p else '0' for q in pose]
        out = []
        for (c, r) in sorted(killed):
            rows, colour = BOTS[r % 3][p], BOTS[r % 3][2]
            out.append(f'<g fill="{colour}">{window(0, killed[(c, r)], total, dur)}'
                       f'{cells_svg(rows, c * sx, r * sy)}</g>')
        layers.append(f'<g{"" if vis[0] == "1" else " opacity=\"0\""}>{track("opacity", vis)}{"".join(out)}</g>')
    booms = []
    for (c, r), k in killed.items():
        booms.append(f'<g fill="{OL}" opacity="0">{window(k, min(k + 3, total), total, dur)}'
                     f'{cells_svg(BOOM, c * sx, r * sy)}</g>')
    wave = f'<g>{track(None, [f"{a},{b}" for a, b in offs], "move")}{"".join(layers)}{"".join(booms)}</g>'
    ship = f'<g fill="{O}">{track(None, [f"{x},{ship_y}" for x in ships], "move")}{cells_svg(SHIP, 0, 0)}</g>'
    shot = (f'<rect width="1" height="3" fill="{OL}">{track("x", [s[0] for s in shots])}'
            f'{track("y", [s[1] for s in shots])}</rect>')
    ground = f'<rect x="0" y="{H - 2}" width="{W}" height="1" fill="{O}" fill-opacity="0.5"/>'
    write('nostalgia/invaders', svg(wave + ship + shot + ground, square=True))


def window(start, end, total, dur):
    """An opacity track that shows something from step `start` until step `end` of a `total`-step loop."""
    vals, kts = ['0', '1', '0'], [0, start / total, end / total]
    if start == 0:
        vals, kts = ['1', '0'], [0, end / total]
    if end >= total:
        vals, kts = vals[:-1], kts[:-1]
    if vals == ['1']:
        return ''
    return (f'<animate attributeName="opacity" calcMode="discrete" values="{";".join(vals)}" '
            f'keyTimes="{";".join(num(k) for k in kts)}" dur="{dur}" repeatCount="indefinite"/>')


def snake():
    """The old phone game: a snake finds its food, grows, and when it has eaten enough it blinks and starts over."""
    from collections import deque
    ink = O  # see-through like pong and invaders, so it sits on the chat's own background
    cols, rows, cell = 18, 18, 4
    gx, gy = SX + (SQ - cols * cell) // 2, (H - rows * cell) // 2
    rnd = random.Random(11)
    body = deque([(3, 9), (4, 9), (5, 9), (6, 9)])
    visits = [[p, 0, None] for p in body]  # cell, step it was entered, step it was left
    live = deque(visits)
    foods, t, meals = [], 0, 14

    def free_cell():
        while True:
            p = (rnd.randrange(cols), rnd.randrange(rows))
            if p not in body:
                return p

    food, food_from = free_cell(), 0
    while len(foods) < meals:
        blocked = set(list(body)[1:])
        prev, seen, q = {}, {body[-1]}, deque([body[-1]])
        while q:
            c = q.popleft()
            if c == food:
                break
            for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (c[0] + d[0], c[1] + d[1])
                if 0 <= n[0] < cols and 0 <= n[1] < rows and n not in seen and n not in blocked:
                    seen.add(n)
                    prev[n] = c
                    q.append(n)
        if food not in prev:
            break
        path, c = [], food
        while c != body[-1]:
            path.append(c)
            c = prev[c]
        for n in reversed(path):
            t += 1
            body.append(n)
            v = [n, t, None]
            visits.append(v)
            live.append(v)
            if n == food:
                foods.append((food, food_from, t))
                food, food_from = free_cell(), t
            else:
                body.popleft()
                live.popleft()[2] = t
    end = t + 1
    blink = 8
    total = end + blink
    dur = f'{num(total * 0.11)}s'
    hide = ' opacity="0"'
    out = []
    for (x, y), a, b in visits:
        b = end + blink if b is None else b
        out.append(f'<rect x="{gx + x * cell}" y="{gy + y * cell}" width="{cell - 1}" height="{cell - 1}"'
                   f'{"" if a == 0 else hide}>{window(a, b, total, dur)}</rect>')
    for (x, y), a, b in foods:
        cx, cy = gx + x * cell, gy + y * cell
        out.append(f'<g{"" if a == 0 else hide}>{window(a, b, total, dur)}<rect x="{cx + 1}" y="{cy}" width="1" '
                   f'height="1"/><rect x="{cx}" y="{cy + 1}" width="3" height="1"/><rect x="{cx + 1}" y="{cy + 2}" '
                   f'width="1" height="1"/></g>')
    # the whole snake blinks at the end, then the loop starts over
    flick = (f'<animate attributeName="opacity" calcMode="discrete" '
             f'values="1;{";".join("0" if k % 2 == 0 else "1" for k in range(blink))}" '
             f'keyTimes="0;{";".join(num((end + k) / total) for k in range(blink))}" dur="{dur}" '
             f'repeatCount="indefinite"/>')
    w, h = cols * cell + 5, rows * cell + 5
    frame = (f'<rect x="{gx - 3}" y="{gy - 3}" width="{w}" height="1"/><rect x="{gx - 3}" y="{gy - 3 + h - 1}" '
             f'width="{w}" height="1"/><rect x="{gx - 3}" y="{gy - 3}" width="1" height="{h}"/>'
             f'<rect x="{gx - 3 + w - 1}" y="{gy - 3}" width="1" height="{h}"/>')
    write('nostalgia/snake', svg(f'<g fill="{ink}">{frame}<g>{flick}{"".join(out)}</g></g>', square=True))


def pong():
    """The first video game turned on its side: one paddle at the top, one at the bottom, a square ball between."""
    from math import gcd
    ink = O  # see-through on any chat, light or dark, so orange rather than cream
    pw, ph, bs = 14, 2, 2
    top_y, bot_y = 5, H - 5 - ph
    lo, hi = top_y + ph, bot_y - bs  # the ball's y range, paddle face to paddle face
    xr = 48
    x0 = (W - xr - bs) // 2
    ly = hi - lo
    n = (2 * xr) * (2 * ly) // gcd(2 * xr, 2 * ly)  # one loop where x and y both come home
    bx, by = [], []
    for k in range(n):
        u, v = k % (2 * xr), k % (2 * ly)
        bx.append(x0 + (u if u <= xr else 2 * xr - u))
        by.append(lo + (v if v <= ly else 2 * ly - v))

    def track(face):
        """Each paddle heads for where the ball will meet it, and drifts back to the middle once it has hit."""
        px = (W - pw) / 2
        for lap in range(2):  # the second lap starts where the first ended, so the loop closes
            out = []
            for k in range(n):
                going = by[(k + 1) % n] - by[k]
                coming = going < 0 if face == 'top' else going > 0
                if coming:
                    j = k + 1
                    while by[j % n] not in (lo, hi):
                        j += 1
                    target = bx[j % n] + bs / 2 - pw / 2
                else:
                    target = (W - pw) / 2
                px += max(-1.6, min(1.6, target - px))
                out.append(round(px))
        return out

    dur = f'{num(n * 0.035)}s'

    def track_anim(attr, vals):
        return (f'<animate attributeName="{attr}" calcMode="discrete" values="{";".join(str(v) for v in vals)}" '
                f'dur="{dur}" repeatCount="indefinite"/>')

    net = ''.join(f'<rect x="{x}" y="{H // 2}" width="2" height="1"/>' for x in range(SX + 3, SX + SQ - 3, 6))
    net += f'<rect x="{SX}" y="0" width="1" height="{H}"/><rect x="{SX + SQ - 1}" y="0" width="1" height="{H}"/>'
    body = (f'<g fill="{ink}"><g opacity="0.45">{net}</g>'
            f'<rect y="{top_y}" width="{pw}" height="{ph}">{track_anim("x", track("top"))}</rect>'
            f'<rect y="{bot_y}" width="{pw}" height="{ph}">{track_anim("x", track("bottom"))}</rect>'
            f'<rect width="{bs}" height="{bs}">{track_anim("x", bx)}{track_anim("y", by)}</rect></g>')
    write('nostalgia/pong', svg(body, square=True))


def disc(p, cx, cy, r, c, keep=None):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r and (keep is None or keep(x, y)):
                p.px(x, y, c)
    return p


def startup():
    """The old console boot, in Claude's colours: sparks swirl into the middle, a glowing orb swells, an X cuts
    through it, a ring of light flashes out, and it all glows for a while before it starts again."""
    cx, cy = MX, MY
    frames, sched = [], []

    def add(p, d):
        frames.append(p.svg())
        sched.append((len(frames) - 1, d))

    sparks = 9
    for k in range(10):  # sparks spiralling in
        p = Pix()
        for i in range(sparks):
            a = i * 2 * math.pi / sparks + k * 0.55
            r = 30 * (1 - k / 10) + 2
            for tail in range(3):
                ta = a - tail * 0.18
                p.px(round(cx + math.cos(ta) * (r + tail)), round(cy + math.sin(ta) * (r + tail) * 0.8),
                     (OL, O, OD)[tail])
        add(p, 0.09)

    def orb(r, x_len=0, ring=None, glow=1.0):
        p = Pix()
        if ring:
            disc(p, cx, cy, ring + 1, OL + '@0.7', keep=lambda x, y: (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 >= (ring - 1) ** 2)
        disc(p, cx, cy, r + 5, O + f'@{num(0.12 * glow)}')
        disc(p, cx, cy, r + 2.5, O + f'@{num(0.3 * glow)}')
        disc(p, cx, cy, r, OD)
        disc(p, cx - r * 0.15, cy - r * 0.15, r * 0.8, O)
        disc(p, cx - r * 0.35, cy - r * 0.4, r * 0.35, OL)
        for t in range(-x_len, x_len + 1):  # the X, cut from corner to corner
            for w in (0, 1):
                p.px(cx + t - 1 + w, cy + t - 1, INK)
                p.px(cx - t - 1 + w, cy + t - 1, INK)
        return p

    for r in (2, 4, 6, 8, 10, 11, 12):  # the orb swells
        add(orb(r), 0.08)
    for n in (2, 4, 6, 8, 10):  # the X cuts through
        add(orb(12, n), 0.07)
    for ring in (15, 20, 26, 33):  # a ring of light flashes out
        add(orb(12, 10, ring, 1.6), 0.06)
    add(orb(12, 10), 2.4)
    for g in (0.6, 0.3):  # and it dims before the next start
        p = orb(12, 10, glow=g)
        frames.append(f'<g opacity="{num(g + 0.2)}">{p.svg()}</g>')
        sched.append((len(frames) - 1, 0.25))
    add(Pix(), 0.5)
    write('nostalgia/startup', svg(timeline(frames, sched), bg=INK, zoom=1.3))


if __name__ == '__main__':
    boot()
    hourglass()
    copy()
    progress()
    dvd()
    ajax()
    invaders()
    snake()
    pong()

