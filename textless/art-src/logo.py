"""textless logo drafts, in the card's pixel language: bold 5x7 letters with a darker drop, Clawd orange.
- wordmark: "textless" in lowercase pixels; the last letters break up into loose pixels, the text going away.
- icons on a 16x16 grid, made to read at 32 px:
  a bubble: a speech bubble whose text lines dissolve into pixels.
  b peek:   Clawd peeking over the edge of a speech bubble.
  c strike: "Aa" with a line struck through it.
  d tile:   Clawd's face on an orange tile, the tile's corner crumbling into pixels.
Each is written as a crisp SVG and as PNGs (1x and enlarged) under ../brand/drafts/.
Run: python logo.py
"""
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'brand', 'drafts')
ORANGE = '#d97757'
DROP = '#a8573c'
EYE = '#2a1d18'

LOWER = {
    't': ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.'],
    'e': ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
    'x': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    'l': ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    's': ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
}


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_svg(cells, w, h, scale):
    """cells: {(x, y): colour}. One rect per pixel run, crisp."""
    by = {}
    for (x, y), c in cells.items():
        by.setdefault(c, []).append((x, y))
    parts = []
    for c, pts in by.items():
        d = ''.join(f'M{x} {y}h1v1h-1z' for x, y in sorted(pts, key=lambda p: (p[1], p[0])))
        parts.append(f'<path fill="{c}" d="{d}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w * scale}" height="{h * scale}" viewBox="0 0 {w} {h}" '
            f'shape-rendering="crispEdges">{"".join(parts)}</svg>')


def to_png(cells, w, h, scale, path):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for (x, y), c in cells.items():
        px[x, y] = hexrgb(c) + (255,)
    img.resize((w * scale, h * scale), Image.NEAREST).save(path)


def save(name, cells, w, h, scale, png_scales):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f'{name}.svg'), 'w', encoding='utf-8') as f:
        f.write(to_svg(cells, w, h, scale))
    for s in png_scales:
        to_png(cells, w, h, s, os.path.join(OUT, f'{name}-{w * s}.png'))
    print(name, w, 'x', h)


def wordmark():
    """'textless', bold strokes with a drop; 'less' crumbles: its pixels thin out and scatter to the right."""
    r = random.Random(5)
    cells = {}
    x = 1
    word = 'textless'
    for i, ch in enumerate(word):
        g = LOWER[ch]
        fade = max(0, i - 3) / 5  # 0 for "text", rising through "less"
        for y, row in enumerate(g):
            for k, on in enumerate(row):
                if on != '#':
                    continue
                for dx in (0, 1):
                    px, py = x + k + dx, y + 1
                    if fade and r.random() < fade * 0.55:
                        # This pixel has come loose: drift it right and up a little, or drop it.
                        if r.random() < 0.5:
                            continue
                        px += r.randrange(1, 4)
                        py -= r.randrange(0, 3)
                        cells[(px, py)] = ORANGE
                        continue
                    cells.setdefault((px, py + 1), DROP)
                    cells[(px, py)] = ORANGE
        x += len(g[0]) + 2
    w, h = x + 4, 11
    save('wordmark', cells, w, h, 6, [1, 4, 8])


def bubble_shape(x0, y0, w, h):
    cells = set()
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            corner = (x in (x0, x0 + w - 1)) and (y in (y0, y0 + h - 1))
            if not corner:
                cells.add((x, y))
    for k in range(3):  # the tail, down-left
        for j in range(3 - k):
            cells.add((x0 + 2 + j, y0 + h + k))
    return cells


def icon_bubble():
    cells = {p: ORANGE for p in bubble_shape(1, 2, 14, 10)}
    # Text lines cut out of the bubble, the lower ones breaking into single pixels.
    for x in range(3, 13):
        cells.pop((x, 4), None)
    for x in range(3, 11):
        if x % 3 != 2:
            cells.pop((x, 7), None)
    for x in (4, 7, 10):
        cells.pop((x, 10), None)
    return cells


def icon_peek():
    cells = {p: ORANGE for p in bubble_shape(1, 7, 14, 6)}
    for x in range(3, 13, 2):
        cells.pop((x, 9), None)
    # Clawd's head and eyes over the top edge, his stub arms hooked on it.
    for y in range(2, 7):
        for x in range(4, 12):
            cells[(x, y)] = ORANGE
    cells[(6, 4)] = cells[(6, 5)] = EYE
    cells[(9, 4)] = cells[(9, 5)] = EYE
    cells[(3, 6)] = cells[(12, 6)] = ORANGE
    for x in range(1, 15):
        if (x, 7) in cells:
            cells[(x, 7)] = DROP
    return cells


def icon_strike():
    A = ['.##.', '#..#', '#..#', '####', '#..#', '#..#']
    a = ['....', '.##.', '...#', '.###', '#..#', '.###']
    cells = {}
    for gx, g in ((2, A), (9, a)):
        for y, row in enumerate(g):
            for k, on in enumerate(row):
                if on == '#':
                    cells[(gx + k, 5 + y + 1)] = DROP
    for gx, g in ((2, A), (9, a)):
        for y, row in enumerate(g):
            for k, on in enumerate(row):
                if on == '#':
                    cells[(gx + k, 5 + y)] = ORANGE
    for x in range(0, 16):  # the strike, a little above the middle
        cells[(x, 8)] = EYE if 1 <= x <= 14 else cells.get((x, 8), EYE)
    return cells


def icon_tile():
    cells = {}
    for y in range(1, 15):
        for x in range(1, 15):
            if (x, y) in ((1, 1), (14, 1), (1, 14), (14, 14)):
                continue
            cells[(x, y)] = ORANGE
    # Clawd's eyes, tall like the glyph.
    for y in (5, 6, 7, 8):
        cells[(5, y)] = EYE
        cells[(10, y)] = EYE
    # The bottom-right corner crumbles into loose pixels.
    r = random.Random(2)
    for y in range(9, 15):
        for x in range(9, 15):
            if (x - 8) + (y - 8) > 7 and (x, y) in cells and r.random() < 0.6:
                del cells[(x, y)]
    for x, y in ((15, 12), (13, 15), (15, 15), (12, 15)):
        cells[(x, y)] = ORANGE
    return cells


if __name__ == '__main__':
    wordmark()
    for name, fn in (('icon-a-bubble', icon_bubble), ('icon-b-peek', icon_peek), ('icon-c-strike', icon_strike), ('icon-d-tile', icon_tile)):
        save(name, fn(), 16, 16, 16, [1, 2, 8])
