"""Done card variants: the pixel word under a finished answer (DONE, or NEEDS YOU when Claude asks something),
drawn in a 5x7 pixel font with a small mark beside it. Writes previews to art-src/done/ for picking one;
the chosen variant then goes into register.tsx's pixelWord/GLYPHS.
Run: python donecards.py
"""
import os

from pixkit import CLAWD, EYE, HERE, Clawd, Pix, num, timeline

OUT = os.path.join(HERE, 'done')
PX = 4  # screen pixels per art pixel, as in the card
SHADE = '#a8573c'

# 5x7 glyphs. '#' is ink.
FONT = {
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
}


def word(text, color, x0=0, y0=0, bold=False, shadow=None):
    """Pixels of a word; bold doubles each stroke one pixel right, shadow drops a darker copy one pixel down."""
    p = Pix()
    x = x0
    for ch in text:
        g = FONT[ch]
        w = len(g[0])
        for y, row in enumerate(g):
            for i, c in enumerate(row):
                if c == '#':
                    for dx in ((0, 1) if bold else (0,)):
                        if shadow:
                            p.px(x + i + dx, y0 + y + 1, shadow)
            for i, c in enumerate(row):
                if c == '#':
                    for dx in ((0, 1) if bold else (0,)):
                        p.px(x + i + dx, y0 + y, color)
        x += w + (2 if bold else 1)
    return p, x - x0 - 1


def check(x0, y0, color):
    return Pix().put([(6, 0), (5, 1), (6, 1), (4, 2), (5, 2), (0, 3), (3, 3), (4, 3), (0, 4), (1, 4), (2, 4), (3, 4), (1, 5), (2, 5)], color, x0, y0 + 1)


def qmark(x0, y0, color):
    return Pix().put([(1, 0), (2, 0), (3, 0), (0, 1), (4, 1), (4, 2), (3, 3), (2, 4), (2, 6)], color, x0, y0)


def badge(x0, y0, kind):
    """A 9x9 orange tile with the mark knocked out in the chat's own colour (transparent)."""
    p = Pix().rect(x0, y0, 9, 9, CLAWD)
    hole = check(x0 + 1, y0 + 1, None) if kind == 'done' else qmark(x0 + 2, y0 + 1, None)
    for k in hole:
        p.pop(k, None)
    return p


def tiny_clawd(x0, y0, kind):
    """Clawd at one art pixel per unit: body 12x8, thin arms, legs. Happy eyes when done; open eyes and arms up
    when he needs you."""
    c = Clawd(x0 + 1, y0, 1)
    p = c.body(arms='lr' if kind == 'done' else '')
    if kind == 'ask':
        p.rect(x0, y0 + 1, 1, 2, CLAWD).rect(x0 + 13, y0 + 1, 1, 2, CLAWD)
    for ex, ey, ew, eh in c.eyes():
        if kind == 'done':
            p.px(ex - 1, ey + 1, EYE).px(ex, ey, EYE).px(ex + 1, ey + 1, EYE)
        else:
            p.rect(ex, ey, ew, eh, EYE)
    return p


def svg(p, w, h, extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w * PX}" height="{h * PX}" viewBox="0 0 {w} {h}" '
            f'shape-rendering="crispEdges">{p.svg()}{extra}</svg>')


def build():
    os.makedirs(OUT, exist_ok=True)
    texts = {'done': 'DONE', 'ask': 'NEEDS YOU'}
    for kind, text in texts.items():
        # A: plain 5x7 word with a pixel tick or question mark in front.
        mark = check(0, 0, CLAWD) if kind == 'done' else qmark(1, 0, CLAWD)
        wp, ww = word(text, CLAWD, 10)
        out = {'a': svg(mark.merge(wp), 10 + ww, 7)}
        # B: tiny Clawd as the mark; on NEEDS YOU he waves both arms in turn.
        cl = tiny_clawd(0, 0, kind)
        wp, ww = word(text, CLAWD, 17, 1)
        extra = ''
        if kind == 'ask':
            up_l = Pix().rect(0, 1, 1, 2, CLAWD)
            up_r = Pix().rect(13, 1, 1, 2, CLAWD)
            dn_l = Pix().rect(0, 4, 1, 2, CLAWD)
            dn_r = Pix().rect(13, 4, 1, 2, CLAWD)
            for k in list(cl):
                if k[0] in (0, 13):
                    cl.pop(k)
            extra = timeline([up_l.svg() + dn_r.svg(), dn_l.svg() + up_r.svg()], [(0, 0.45), (1, 0.45)])
        out['b'] = svg(cl.merge(wp), 17 + ww, 10, extra)
        # C: bold word with a darker drop, a knocked-out badge as the mark.
        bp = badge(0, 0, kind)
        wp, ww = word(text, CLAWD, 12, 1, bold=True, shadow=SHADE)
        out['c'] = svg(bp.merge(wp), 12 + ww, 9)
        for v, s in out.items():
            with open(os.path.join(OUT, f'{v}-{kind}.svg'), 'w', encoding='utf-8') as f:
                f.write(s)
            print(f'{v}-{kind}.svg', len(s))


if __name__ == '__main__':
    build()
