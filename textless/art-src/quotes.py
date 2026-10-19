"""The quotes set's fixed parts, measured and drawn once: letter widths for Georgia (italic for the quote, upright for
the author), the pixel quill and the pixel inkwell. They go to plugin/hooks/quill-data.ts, which the plugin's renderer
(plugin/hooks/quill.ts) uses to write any quote from plugin/hooks/quotes-list.ts at the moment it is shown.
Run: python quotes.py -> ../plugin/hooks/quill-data.ts
Website previews of every quote: node --experimental-strip-types ../scripts/quote-previews.mjs <out dir>
"""
import json
import math
import os
import re

from PIL import ImageFont

PX = 4  # one pixel of the quill, in view units
FEATHER, FEATHER_DARK, SHAFT, NIB = '#eba88d', '#d97757', '#b0563a', '#3d3929'
POT, POT_LIT, POT_RIM = '#4a4540', '#6b655c', '#8a8780'
ITALIC = 'C:/Windows/Fonts/georgiai.ttf'
UPRIGHT = 'C:/Windows/Fonts/georgia.ttf'
HERE = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(HERE, '..', 'plugin', 'hooks', 'quotes-list.ts')
OUT = os.path.join(HERE, '..', 'plugin', 'hooks', 'quill-data.ts')


def quotes():
    src = open(LIST, encoding='utf-8').read()
    return json.loads(re.sub(r',\s*]\s*$', ']', src[src.index('= [') + 2:].strip()))


def widths(font_path, chars):
    """Advance width of each character in thousandths of the font size. Lines are measured as the plain sum."""
    f = ImageFont.truetype(font_path, 1000)
    return {c: round(f.getlength(c)) for c in sorted(chars)}


def quill():
    """A feather lying from the top right down to the nib at (0, 0), in pixels of PX units: a solid vane either
    side of the shaft, widest two thirds of the way up, darker on its lower edge."""
    ax, ay, bx, by = 0.5, 0.5, 11.5, -16.5  # nib to tip, in pixel centres
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    cells = {}
    for y in range(-18, 2):
        for x in range(-4, 15):
            px, py = x + 0.5 - ax, y + 0.5 - ay
            t = (px * ux + py * uy) / L  # 0 at the nib, 1 at the tip
            side = px * uy - py * ux  # signed distance from the shaft
            if not 0 <= t <= 1:
                continue
            if abs(side) < 0.55:
                cells[(x, y)] = NIB if t < 0.14 else SHAFT
            elif t > 0.3:
                spread = math.sin(min(1, (t - 0.3) / 0.68) * math.pi) ** 0.7 * 3.4
                if abs(side) <= spread:
                    cells[(x, y)] = FEATHER_DARK if side > spread - 1.1 else FEATHER
    return ''.join(f'<rect x="{x * PX}" y="{y * PX}" width="{PX}" height="{PX}" fill="{c}"/>'
                   for (x, y), c in cells.items())


def inkwell():
    """A squat pot whose mouth is at (0, 0)."""
    def r(dx, dy, w, h, c):
        return f'<rect x="{dx * PX}" y="{dy * PX}" width="{w * PX}" height="{h * PX}" fill="{c}"/>'
    return (r(-3, 0, 6, 1, POT_RIM) + r(-2, -1, 4, 1, POT_RIM) + r(-4, 1, 8, 4, POT) + r(-3, 1, 2, 3, POT_LIT)
            + r(-5, 5, 10, 1, POT))


if __name__ == '__main__':
    qs = quotes()
    text_chars = set(''.join(q[1] for q in qs)) | set(' .,;:!?\'"-')
    author_chars = set(''.join(q[2] for q in qs)) | set(' ')
    data = (
        '// Made by art-src/quotes.py from the Georgia fonts; do not edit by hand.\n'
        f'export const ITALIC: Record<string, number> = {json.dumps(widths(ITALIC, text_chars), ensure_ascii=False)}\n'
        f'export const UPRIGHT: Record<string, number> = {json.dumps(widths(UPRIGHT, author_chars), ensure_ascii=False)}\n'
        f'export const QUILL = {json.dumps(quill())}\n'
        f'export const INKWELL = {json.dumps(inkwell())}\n'
    )
    open(OUT, 'w', encoding='utf-8').write(data)
    print('quill-data.ts', len(data), 'chars,', len(qs), 'quotes')
