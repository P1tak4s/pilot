"""The status set: plain signs that say Claude is working, in the done card's bold 5x7 pixel letters.
Landscape cards, 128x80 drawn at 560x350 like the meadow, so they fill a wide pane. The word stays on one line:
the card is an image that scales as a whole, so a wrapped word would never unwrap.
- working-text: see-through, just the big orange word with its darker drop, and counting dots.
- working-sit: the word in peach, Clawd sitting on the corner of the G with a steaming cup, legs swinging.
- working-hop: Clawd hops along the top of the letters and back.
- working-push: Clawd pushes the word from the left; it will not budge, he puffs and tries again.
- working-lift: Clawd holds the word over his head and does squats with it.
- working-paint: Clawd walks under the word with a long brush and paints it in, letter by letter.
- working-<scene>: a scene from the see-through Clawd set with the word in the room above him (OVER).
art-src/frames.html?s=status/working-hop&t=0.5,1,2 shows a scene frozen at a few times, for checking.
Run: python status.py -> ../plugin/hooks/scenes/status/*.svg
"""
import pixkit
from pixkit import CLAWD, EYE, W, Clawd, Pix, block, even, hops, timeline, write

H = pixkit.H = 80
ORANGE = '#d97757'
DROP = '#a8573c'
FONT = {
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'G': ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
}
SCALE = 2  # each font cell is 2x2 scene pixels
LINES = ['WORKING']  # one line: the card scales as an image, so the word never wraps
LINE_GAP = 10


def word_cells(text):
    """Bold letters (each stroke doubled one cell right), as font cells, plus the width in cells."""
    cells = set()
    x = 0
    for ch in text:
        for y, row in enumerate(FONT[ch]):
            for k, on in enumerate(row):
                if on == '#':
                    cells.add((x + k, y))
                    cells.add((x + k + 1, y))
        x += len(FONT[ch][0]) + 2
    return cells, x - 1  # the bold doubling reaches one cell past the last glyph


def layout():
    """Scene-pixel cells of both lines, centred; plus where the dots go (after ING) and each line's box."""
    total_h = len(LINES) * 7 * SCALE + (len(LINES) - 1) * LINE_GAP
    top = (H - total_h) // 2
    px = {}
    boxes = []
    for i, t in enumerate(LINES):
        cells, wc = word_cells(t)
        extra = 3 * 4 + 3 if i == len(LINES) - 1 else 0  # the last line carries the dots, centre it with them
        left = (W - wc * SCALE - extra) // 2
        y0 = top + i * (7 * SCALE + LINE_GAP)
        boxes.append((left, y0, wc * SCALE))
        for cx, cy in cells:
            px[(left + cx * SCALE, y0 + cy * SCALE)] = True
    x_end = boxes[-1][0] + boxes[-1][2]
    dots_at = (x_end + 3, boxes[-1][1] + 7 * SCALE - 2)
    return px, boxes, dots_at


def dots(x0, y0, color, n_on):
    p = Pix()
    for i in range(n_on):
        p.rect(x0 + i * 4, y0, 2, 2, color)
    return p


def dot_timeline(dx, dy, color):
    frames = [dots(dx, dy, color, k).svg() for k in range(4)]
    return timeline(frames, [(0, 0.5), (1, 0.5), (2, 0.5), (3, 0.9)])


def svg(body):
    # data-fit="contain": the card fits the whole box instead of cropping the sides, so WORKING is never cut.
    return (f'<svg xmlns="http://www.w3.org/2000/svg" data-fit="contain" width="560" height="{round(560 * H / W)}" '
            f'viewBox="0 0 {W} {H}" shape-rendering="crispEdges">{body}</svg>')


def letters(px, face, drop):
    p = Pix()
    for (x, y) in px:
        p.rect(x, y + SCALE // 2, SCALE, SCALE, drop)
    for (x, y) in px:
        p.rect(x, y, SCALE, SCALE, face)
    return p


def working_block():
    px, boxes, (dx, dy) = layout()
    tile = Pix()
    for y in range(H):
        for x in range(W):
            tile.px(x, y, ORANGE)
    # The orange runs far past the box, so a card letterboxed to fit still looks solid edge to edge.
    far = 2000
    bleed = (f'<path fill="{ORANGE}" d="M-{far} -{far}h{W + 2 * far}v{far}h-{W + 2 * far}z'
             f'M-{far} {H}h{W + 2 * far}v{far}h-{W + 2 * far}zM-{far} 0h{far}v{H}h-{far}zM{W} 0h{far}v{H}h-{far}z"/>')
    # The letters are holes in the tile, the chat showing through; a darker band under each gives the badge drop.
    for (x, y) in px:
        for sy in range(SCALE):
            for sx in range(SCALE):
                tile.pop((x + sx, y + sy), None)
    for (x, y) in px:
        for sx in range(SCALE):
            for sy in range(SCALE // 2):
                below = (x + sx, y + SCALE + sy)
                if below in tile:
                    tile[below] = DROP
    write('status/working-block', svg(bleed + tile.svg() + dot_timeline(dx, dy, DROP)))


def working_text():
    px, boxes, (dx, dy) = layout()
    body = letters(px, ORANGE, DROP).svg() + dot_timeline(dx, dy + 2, DROP) + dot_timeline(dx, dy, ORANGE)
    write('status/working-text', svg(body))


def working_sit():
    """The word in peach so Clawd stands out; he sits on the top right corner of the G, legs over its end, a steaming
    cup in his hands."""
    cells, wc = word_cells('WORKING')
    x0 = (W - wc * SCALE) // 2 - 6  # nudged left to leave room for his legs past the G
    y0 = (H - 7 * SCALE) // 2 + 6
    px = {(x0 + cx * SCALE, y0 + cy * SCALE): True for cx, cy in cells}
    text = letters(px, '#eab196', '#c27a5c')
    edge = x0 + wc * SCALE  # the G's right edge
    C = Clawd(edge - 13, y0 - 16, 2, facing='r')
    seat = y0

    def legs(kick):
        p = Pix()
        for i, x in enumerate((edge + 1, edge + 5)):
            sw = 0 if not kick else (1 if (i + kick) % 2 else -1)
            p.rect(x, seat, 2, 2, CLAWD).rect(x + 1, seat + 2, 2, 3, CLAWD).rect(x + 1 + sw, seat + 5, 2, 2, CLAWD)
        return p.svg()
    kick = [(0, 3.0)] + [(1, 0.2), (2, 0.2)] * 4 + [(0, 3.4)] + [(1, 0.2), (2, 0.2)] * 3 + [(0, 1.0)]
    total = sum(d for _, d in kick)
    # The cup is held out in front of him by his near arm, clear of his face, so both eyes show; a sip lifts it
    # to the front edge of his face, level with his eyes.
    cx0, cy0 = C.ox + C.w + 2, C.oy + 8

    def cup(dx, dy_):
        x, y = cx0 + dx, cy0 + dy_
        p = Pix().rect(x, y, 6, 6, '#efe6d8').rect(x + 1, y, 4, 1, '#5b3a26').rect(x, y + 5, 6, 1, '#cfc2ae')
        p.rect(x + 6, y + 1, 1, 3, '#cfc2ae')
        p.rect(C.ox + C.w, y + 3, x - (C.ox + C.w), 2, CLAWD)  # the near arm reaching to the cup
        return p.svg()

    def steam(k):
        p = Pix()
        for j, bx in enumerate((1, 4)):
            for yy in range(5):
                if (yy + k + j) % 4 == 3:
                    continue
                p.px(cx0 + bx + ((yy + k + j) % 3 == 0), cy0 - 2 - yy, '#ffffff@0.6' if yy < 3 else '#ffffff@0.35')
        return p.svg()
    rest = cup(0, 0) + timeline([steam(k) for k in range(4)], even(4, 1.0))
    sip = cup(-2, -5)

    def happy():
        # An upturned arc in 2 px blocks: at this size the shared 1 px arc is too small to read.
        p = Pix()
        for ex, ey, ew, eh in C.eyes():
            x = ex + ew // 2 - 3
            p.rect(x, ey + 2, 2, 2, EYE).rect(x + 2, ey, 2, 2, EYE).rect(x + 4, ey + 2, 2, 2, EYE)
        return p.svg()
    look = lambda d: C.eye_pix('open', d).svg()
    # Eyes close happily while he sips, open and look around between sips.
    eyes = timeline([look(1), look(-1), happy(), C.eye_pix('blink', 1).svg()],
                    [(0, 2.0), (3, 0.12), (0, 1.88), (2, 1.6), (0, 0.8), (1, 1.6), (0, total - 8.0)])
    body = (text.svg() + C.body(legs=False, arms='l').svg() + eyes
            + timeline([rest, sip], [(0, 4.0), (1, 1.6), (0, total - 5.6)])
            + timeline([legs(0), legs(1), legs(2)], kick))
    write('status/working-sit', svg(body))

PEACH, PEACH_DROP = '#eab196', '#c27a5c'


def word_at(x0, y0, only=None):
    """WORKING in peach at (x0, y0); `only` keeps just those letters (by index)."""
    cells, wc = word_cells('WORKING')
    keep = {(x0 + cx * SCALE, y0 + cy * SCALE): True for cx, cy in cells if only is None or cx // 7 in only}
    return letters(keep, PEACH, PEACH_DROP), wc * SCALE


def clawd_frame(ox, oy, facing, eyes='open', look=0, arms='lr', legs=True):
    C = Clawd(ox, oy, 2, facing=facing)
    return C.body(legs=legs, arms=arms).svg() + C.eye_pix(eyes, look).svg()


def working_hop():
    """Clawd hops along the top of the word, letter to letter, and back."""
    x0, y0 = 16, 44
    text, ww = word_at(x0, y0)
    top = y0 - 20
    spots = [x0 + i * 14 for i in range(6)]
    frames, sched = [], []

    def add(svg_, d):
        frames.append(svg_)
        sched.append((len(frames) - 1, d))
    for facing, path in (('r', spots), ('l', spots[::-1])):
        look = 1 if facing == 'r' else -1
        add(clawd_frame(path[0], top, facing, 'happy', look), 1.2)
        for a, b_ in zip(path, path[1:]):
            add(clawd_frame(a, top + 1, facing, 'open', look), 0.18)          # crouch
            add(clawd_frame((a + b_) // 2, top - 7, facing, 'open', look), 0.2)  # in the air
            add(clawd_frame(b_, top, facing, 'open', look), 0.45)             # landed
    write('status/working-hop', svg(text.svg() + timeline(frames, sched)))


def working_push():
    """Clawd pushes the word from the left with all he has. It does not budge; he puffs, looks at us, tries again."""
    x0, y0 = 28, 40
    text, ww = word_at(x0, y0)
    ox, oy = x0 - 22, y0 - 6

    def body(dx, eyes, look, step):
        C = Clawd(ox + dx, oy, 2, facing='r')
        p = C.body(legs=False, arms='r')
        for i, lx in enumerate((1, 3, 6, 8)):
            back = 1 if (i + step) % 2 and step >= 0 else 0
            p.rect(C.ox + lx * 2 - back, oy + 16, 2, 4, CLAWD)
        return p.svg() + C.eye_pix(eyes, look).svg()
    sweat = Pix().px(ox + 4, oy - 2, '#9fd3ef').px(ox + 4, oy - 1, '#9fd3ef').svg()
    frames = [body(0, 'open', 1, -1), body(1, 'blink', 1, 0), body(1, 'blink', 1, 1) + sweat,
              body(-1, 'happy', 0, -1), body(0, 'open', 0, -1)]
    push = [(1, 0.25), (2, 0.25)] * 5
    sched = [(0, 1.0)] + push + [(3, 1.3), (4, 0.9)] + push + [(3, 1.0), (0, 0.6)]
    # The word shivers a pixel while he pushes, the only give it has.
    shake = [(0 if i % 2 else 1, d) for i, (_, d) in enumerate(sched)]
    shake = [(0 if k in (0, 3, 4) else s_, d) for (k, d), (s_, _) in zip(sched, shake)]
    word = hops([(0, 0), (1, 0)], shake, text.svg())
    write('status/working-push', svg(word + timeline(frames, sched)))


def working_lift(arm=(5, 6, 6), name='working-lift'):  # arm size A, Isac's pick
    """Clawd holds the word over his head on his raised stubs and does squats with it,
    eyes open, then a long hold with eyes squeezed and a sweat drop, and a smile back at the top."""
    aw, up_, dn = arm  # arm width, how far it reaches above his top, how far down his side
    x0, y0 = 16, 38 - up_ - 15  # the word's drop rests on his raised arms
    text, ww = word_at(x0, y0)
    s_ = 3
    ox = 64 - 18

    def body(oy, eyes, leg, sweat=False):
        C = Clawd(ox, oy, s_)
        p = C.body(legs=False, arms='')
        for lx in (1, 3, 8, 10):
            p.rect(ox + lx * s_, oy + C.h, s_, leg, CLAWD)
        # His stubs, raised: a short block either side of his head, a little taller than wide, holding the word.
        for ax in (ox - aw, ox + C.w):
            p.rect(ax, oy - up_, aw, up_ + dn, CLAWD)
        if sweat:
            p.rect(ox + C.w - 5, oy - 4, 2, 3, '#9fd3ef')
        out = p.svg()
        if eyes == 'happy':
            for ex, ey, ew, eh in C.eyes():
                x = ex + ew // 2 - 3
                out += Pix().rect(x, ey + 2, 2, 2, EYE).rect(x + 2, ey, 2, 2, EYE).rect(x + 4, ey + 2, 2, 2, EYE).svg()
        else:
            out += C.eye_pix(eyes, 0).svg()
        return out
    # Eyes stay open through the squats; they squeeze shut only on the long hold and smile once he is back up.
    up, mid, down = body(38, 'open', 6), body(40, 'open', 4), body(42, 'open', 2)
    hold, proud = body(42, 'blink', 2, True), body(38, 'happy', 6)
    rep = [(0, 0.8), (1, 0.12), (2, 0.5), (1, 0.12)]
    sched = rep * 3 + [(0, 0.5), (1, 0.12), (3, 1.4), (1, 0.12), (4, 1.6)]
    sink = [(0, 0), (0, 2), (0, 4), (0, 4), (0, 0)]
    word = hops(sink, sched, text.svg())
    write(f'status/{name}', svg(word + timeline([up, mid, down, hold, proud], sched)))


def working_paint():
    """Clawd walks along under the word with a long brush and paints it in, letter by letter; then it fades and he
    walks back to start again."""
    x0, y0 = 16, 22
    oy = 48
    per, hold, fade = 0.7, 2.6, 0.6
    walk = 0.15

    def body(ox, facing, brush, eyes='open'):
        C = Clawd(ox, oy, 2, facing=facing)
        out = C.body(arms='r' if facing == 'r' else 'l').svg() + C.eye_pix(eyes, 1 if facing == 'r' else -1).svg()
        if brush is not None:
            ax = C.ox + C.w + 1 if facing == 'r' else C.ox - 2
            b = Pix().rect(ax, y0 + 17, 1, oy + 10 - (y0 + 17), '#8a5a3a').rect(ax - 1 + brush, y0 + 15, 3, 2, PEACH)
            out += b.svg()
        return out
    spot = lambda i: x0 + i * 14 + 6 - 21
    frames, sched = [], []

    def add(svg_, d):
        frames.append(svg_)
        sched.append((len(frames) - 1, d))
    for i in range(7):
        add(body(spot(i), 'r', 0), per / 2)
        add(body(spot(i), 'r', 1), per / 2)
    add(body(spot(6), 'r', None, 'happy'), hold + fade)
    for i in range(6, -1, -1):
        add(body(spot(i), 'l', None), walk)
    total = sum(d for _, d in sched)
    word = ''
    for i in range(7):
        t_on = i * per
        letter, _ = word_at(x0, y0, only={i})
        word += timeline([letter.svg(), ''], [(1, t_on), (0, total - t_on - 7 * walk), (1, 7 * walk)] if t_on else
                         [(0, total - 7 * walk), (1, 7 * walk)])
    f0 = 7 * per + hold
    kts = [0, f0 / total, (f0 + fade / 3) / total, (f0 + 2 * fade / 3) / total, (f0 + fade) / total]
    fader = (f'<animate attributeName="opacity" calcMode="discrete" values="1;0.66;0.33;0;1" '
             f'keyTimes="{";".join(f"{k:.4f}" for k in kts)}" dur="{total:.2f}s" repeatCount="indefinite"/>')
    write('status/working-paint', svg(f'<g>{fader}{word}</g>' + timeline(frames, sched)))


# Clawd scenes from the see-through set with room above him: WORKING goes in that room, outside the edge fade.
# scene file -> card name; sit.svg (the crate) becomes working-crate, since working-sit is the one on the G.
OVER = {'reading': 'reading', 'laptop-bare': 'laptop', 'gym': 'gym', 'nap': 'nap', 'sit': 'crate', 'gardener': 'gardener',
        'campfire-bare': 'campfire'}


def working_over(name, card):
    import os
    src = open(os.path.join(pixkit.OUT, f'{name}.svg'), encoding='utf-8').read()
    text, ww = word_at((W - 96) // 2, 5)
    # Fitted whole, like the other status cards, so a narrow pane never cuts the word.
    out = src.replace('<svg ', '<svg data-fit="contain" ', 1)
    out = out[:out.rindex('</svg>')] + text.svg() + '</svg>'
    write(f'status/working-{card}', out)


if __name__ == '__main__':
    for n, card in OVER.items():
        working_over(n, card)
    working_text()
    working_sit()
    working_hop()
    working_push()
    working_lift()
    working_paint()
