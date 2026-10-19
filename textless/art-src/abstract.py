"""The abstract set: no Clawd, no place, just moving pixels in Claude's clay palette that melt into the chat.
Each scene is a run of whole frames on a half-resolution 64x40 grid (two scene pixels per cell), shown one after
another with discrete SMIL, inside the same edge fade as the other scenes.
- plasma: dithered interference bands rolling across, in four clay tones.
- blocks: clay squares fall and stack in a well, full rows flash and clear, then the stack drops away.
- orbit: the Claude spark turning in the middle, three rings of dots circling at their own speeds.
Run: python abstract.py -> ../plugin/hooks/scenes/abstract/*.svg
"""
import math
import os
import random

import numpy as np
from PIL import Image

import pixkit
from pixkit import BAYER4, OUT, Pix, W, hexrgb, hops, png_uri, scene, timeline

# The abstract set is square, 128x128 drawn at 560x560: with nothing to frame it can fill the card's height.
H = pixkit.H = 128

GW, GH = W // 2, H // 2
CLAY = ['#9e4a33', '#c2603f', '#d97757', '#e8a07f', '#f2c7ad']
DIR = os.path.join(OUT, 'abstract')


def frame_image(cells):
    """cells: 2D array of palette indices, -1 transparent -> an <image> at full scene size, hard pixels."""
    img = Image.new('RGBA', (GW, GH), (0, 0, 0, 0))
    px = img.load()
    for y in range(GH):
        for x in range(GW):
            v = cells[y, x]
            if v >= 0:
                px[x, y] = hexrgb(CLAY[v]) + (255,)
    return f'<image href="{png_uri(img, colors=8)}" x="0" y="0" width="{W}" height="{H}" style="image-rendering:pixelated"/>'


def write(name, svg):
    os.makedirs(DIR, exist_ok=True)
    with open(os.path.join(DIR, f'{name}.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f'abstract/{name}.svg', len(svg), 'chars')


def plasma():
    n = 12
    frames = []
    ys, xs = np.mgrid[0:GH, 0:GW]
    bay = BAYER4[ys % 4, xs % 4]
    for k in range(n):
        t = 2 * math.pi * k / n
        v = (np.sin(xs / 5.0 + t) + np.sin(ys / 4.0 - t) + np.sin((xs + ys) / 7.0 + t) + np.sin(np.hypot(xs - GW / 2, ys - GH / 2) / 4.5 - t)) / 4
        # Contour stripes: the field cut into bands, every other band left empty, each filled band its own clay
        # tone, edges dithered so the stripes ripple instead of stair-stepping.
        band = np.floor((v + 1) * 3.5 + (bay - 0.5) * 0.6).astype(int)
        cells = np.where(band % 2 == 1, np.clip(band // 2, 0, len(CLAY) - 1), -1)
        frames.append(frame_image(cells))
    write('plasma', scene(timeline(frames, [(i, 0.22) for i in range(n)])))


def blocks():
    """Clay squares fall into a well and stack; a full row flashes light and clears; at the end the stack drops out
    of the bottom and the well starts empty again, so the loop is seamless."""
    rng = random.Random(4)
    cols, rows, b = 6, 7, 8  # well of 6x7 blocks, each 8x8 cells: big enough to fill the square
    x0, y0 = (GW - cols * b) // 2, (GH - rows * b) // 2 - 1  # kept off the faded bottom edge
    well = [[-1] * cols for _ in range(rows)]  # row 0 is the top
    frames = []

    def draw(extra=(), flash=(), shift=0):
        cells = np.full((GH, GW), -1)
        for r in range(rows):
            for c in range(cols):
                col = 4 if r in flash else well[r][c]
                if col >= 0:
                    y = y0 + r * b + shift
                    if 0 <= y < GH:
                        cells[y:y + b - 1, x0 + c * b:x0 + c * b + b - 1] = col
        for r, c, col in extra:
            if r >= 0:
                cells[y0 + r * b:y0 + r * b + b - 1, x0 + c * b:x0 + c * b + b - 1] = col
        frames.append(frame_image(cells))

    clears = 0
    while clears < 1:
        # Mostly random columns so the stack grows uneven and tall before a row fills; never past the top.
        open_cols = [k for k in range(cols) if well[1][k] < 0]
        c = rng.choice(open_cols)
        col = rng.choice([1, 2, 3])
        land = max(r for r in range(rows) if well[r][c] < 0)
        for r in range(-1, land, 2):  # falls two rows a frame
            draw([(r, c, col)])
        well[land][c] = col
        full = [r for r in range(rows) if all(v >= 0 for v in well[r])]
        if full:
            draw(flash=full)
            draw()
            draw(flash=full)
            for r in full:
                del well[r]
                well.insert(0, [-1] * cols)
            clears += 1
        draw()
    for k in range(1, 8):  # the whole stack slides out of the bottom
        draw(shift=k * 3)
    draw(shift=GH)
    write('blocks', scene(timeline(frames, [(i, 0.11) for i in range(len(frames))])))


def spark(angle_step):
    """The Claude spark: eight arms of three pixels, turned in 22.5 degree steps."""
    p = Pix()
    cx, cy = 64, H // 2
    p.rect(cx - 2, cy - 2, 4, 4, '#d97757')
    for i in range(8):
        a = math.radians(i * 45 + angle_step * 22.5)
        for r in range(3, 10, 2):
            x = round(cx + math.cos(a) * r - 1)
            y = round(cy + math.sin(a) * r - 1)
            p.rect(x, y, 2, 2, '#d97757' if r < 8 else '#e8a07f')
    return p.svg()


def orbit():
    body = timeline([spark(k) for k in range(2)], [(0, 0.5), (1, 0.5)])
    for ring, (rx, ry, count, step, col) in enumerate([(20, 20, 6, 0.12, '#e8a07f'), (34, 34, 9, 0.16, '#c2603f'), (48, 48, 12, 0.22, '#f2c7ad')]):
        steps = 48
        path = [(round(64 + rx * math.cos(2 * math.pi * k / steps)) - 1, round(H // 2 + ry * math.sin(2 * math.pi * k / steps)) - 1) for k in range(steps)]
        if ring == 1:
            path = path[::-1]
        dot = Pix().rect(0, 0, 2, 2, col).svg()
        for d in range(count):
            sched = [(k, step) for k in range(steps)]
            shift = d * steps // count
            body += hops(path, sched[shift:] + sched[:shift], dot)
    write('orbit', scene(body))


def pulse():
    """A grid of clay dots that swell and shrink in a wave rolling out from the centre: calm, smooth, and every dot
    stays inside the square, so there is no edge fade to eat them."""
    n, gap = 7, 15
    x0 = (W - (n - 1) * gap) / 2
    y0 = (H - (n - 1) * gap) / 2
    dur, steps = 3.2, 8
    body = ''
    for j in range(n):
        for i in range(n):
            cx, cy = x0 + i * gap, y0 + j * gap
            dist = math.hypot(i - (n - 1) / 2, j - (n - 1) / 2) / ((n - 1) / 2 * math.sqrt(2))
            rs = [round(1.5 + 4.5 * (0.5 + 0.5 * math.cos(2 * math.pi * (k / steps - dist * 0.9))), 2) for k in range(steps)]
            rs.append(rs[0])
            col = CLAY[3] if dist < 0.3 else CLAY[2] if dist < 0.65 else CLAY[1]
            vals = ';'.join(str(r) for r in rs)
            body += (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rs[0]}" fill="{col}">'
                     f'<animate attributeName="r" values="{vals}" dur="{dur}s" repeatCount="indefinite"/></circle>')
    write('pulse', f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" viewBox="0 0 {W} {H}">{body}</svg>')

# ---------- smooth versions: continuous motion instead of frame steps ----------
def num2(v):
    return f'{v:.3f}'.rstrip('0').rstrip('.')


def crossfade(frames, step):
    """Frames that melt into each other: each one fades in over its slot while the one before fades out, linear,
    so a shape that changes between frames morphs instead of jumping."""
    n = len(frames)
    total = n * step
    out = ''
    for i, f in enumerate(frames):
        prev_t, mid_t, next_t = (i - 1) / n, i / n, (i + 1) / n
        if i == 0:
            vals, kts = '1;0;0;1', f'0;{num2(1 / n)};{num2((n - 1) / n)};1'
        else:
            vals, kts = '0;0;1;0;0', f'0;{num2(prev_t)};{num2(mid_t)};{num2(next_t)};1'
            if i == n - 1:
                vals, kts = '0;0;1;0', f'0;{num2(prev_t)};{num2(mid_t)};1'
        out += (f'<g><animate attributeName="opacity" values="{vals}" keyTimes="{kts}" dur="{num2(total)}s" '
                f'repeatCount="indefinite"/>{f}</g>')
    return out


def plasma_smooth():
    """The swirling stripe plasma at three times the frames: each frame moves the bands a small step, so it flows
    in hard pixels without any blending."""
    n = 36
    ys, xs = np.mgrid[0:GH, 0:GW]
    bay = BAYER4[ys % 4, xs % 4]
    frames = []
    for k in range(n):
        t = 2 * math.pi * k / n
        v = (np.sin(xs / 5.0 + t) + np.sin(ys / 4.0 - t) + np.sin((xs + ys) / 7.0 + t) + np.sin(np.hypot(xs - GW / 2, ys - GH / 2) / 4.5 - t)) / 4
        band = np.floor((v + 1) * 3.5 + (bay - 0.5) * 0.6).astype(int)
        frames.append(frame_image(np.where(band % 2 == 1, np.clip(band // 2, 0, len(CLAY) - 1), -1)))
    write('plasma-smooth', scene(timeline(frames, [(i, 0.1) for i in range(n)])))


def orbit_smooth():
    """The spark and three rings of dots turning continuously, each ring at its own speed and way round."""
    cx, cy = 64, H // 2
    spark_px = Pix()
    spark_px.rect(cx - 2, cy - 2, 4, 4, '#d97757')
    for i in range(8):
        a = math.radians(i * 45)
        for r in range(3, 12, 2):
            spark_px.rect(round(cx + math.cos(a) * r - 1), round(cy + math.sin(a) * r - 1), 2, 2, '#d97757' if r < 9 else '#e8a07f')
    body = (f'<g><animateTransform attributeName="transform" type="rotate" values="0 {cx} {cy};360 {cx} {cy}" dur="16s" repeatCount="indefinite"/>'
            f'{spark_px.svg()}</g>')
    for r, count, dur, col, way in [(20, 6, 7, '#e8a07f', 1), (34, 9, 11, '#c2603f', -1), (48, 12, 17, '#f2c7ad', 1)]:
        dots = Pix()
        for d in range(count):
            a = 2 * math.pi * d / count
            dots.rect(round(cx + r * math.cos(a)) - 1, round(cy + r * math.sin(a)) - 1, 3, 3, col)
        body += (f'<g><animateTransform attributeName="transform" type="rotate" values="0 {cx} {cy};{360 * way} {cx} {cy}" '
                 f'dur="{dur}s" repeatCount="indefinite"/>{dots.svg()}</g>')
    write('orbit-smooth', scene(body))


def blocks_smooth():
    """Blocks drop into a well one after another with an eased fall, stack up to the top, then the whole stack
    slides out of the bottom together and the well fills again."""
    rng = random.Random(4)
    cols, rows, b = 6, 6, 16  # scene pixels
    x0 = (W - cols * b) // 2
    floor = H - 18
    order = []
    heights = [0] * cols
    while len(order) < cols * rows:
        c = rng.choice([k for k in range(cols) if heights[k] < rows])
        order.append((c, heights[c]))
        heights[c] += 1
    drop, gap = 0.55, 0.22
    fill_end = len(order) * gap + drop
    total = fill_end + 1.2 + 1.0
    body = ''
    for i, (c, r) in enumerate(order):
        x = x0 + c * b
        land = floor - (r + 1) * b
        t0 = i * gap / total
        t1 = (i * gap + drop) / total
        t2 = (fill_end + 1.2) / total
        col = CLAY[rng.choice([1, 2, 3])]
        vals = f'-{b};-{b};{land};{land};{land + H};{land + H}'
        kts = f'0;{num2(t0)};{num2(t1)};{num2(t2)};{num2(t2 + 0.9 / total)};1'
        body += (f'<rect x="{x + 1}" y="-{b}" width="{b - 2}" height="{b - 2}" fill="{col}">'
                 f'<animate attributeName="y" values="{vals}" keyTimes="{kts}" calcMode="spline" '
                 f'keySplines="0 0 1 1;0.55 0 1 0.6;0 0 1 1;0.6 0 0.9 0.5;0 0 1 1" dur="{num2(total)}s" repeatCount="indefinite"/></rect>')
    write('blocks-smooth', scene(body))


if __name__ == '__main__':
    plasma()
    blocks()
    orbit()
    # The smooth ones (plasma_smooth, pulse, orbit_smooth, blocks_smooth) are out of the set for now; a smooth abstract
    # set of its own comes later. Their code stays here for it.
