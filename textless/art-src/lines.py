"""Done-line variants: the thin dithered orange line under a plain DONE answer, made alive with smooth SMIL.
Same 96x3 dither as register.tsx's pixelLine (same seed maths), drawn at 288x9. Every animation is a plain loop on
its own dur, so the card can phase it to the wall clock (begin = -(now % dur)) and a redraw lands on the same spot.
- static: the line as shipped today.
- glint: a soft light band slides along the line now and then.
- breathe: the whole line eases between dim and full.
- tide: a slow wave of brightness travels along it.
Run: python lines.py -> art-src/done/line-*.svg and art-src/done/lines.html
"""
import os

from pixkit import HERE

OUT = os.path.join(HERE, 'done')
COLS, ROWS = 96, 3
CLAY = '#d97757'


def dither(seed=7):
    r = (seed * 2654435761 + 12345) & 0xFFFFFFFF

    def rand():
        nonlocal r
        r = (r * 1664525 + 1013904223) & 0xFFFFFFFF
        return r / 4294967296

    rects = []
    for x in range(COLS):
        t = 1 - abs(x / (COLS - 1) - 0.5) * 2
        for y in range(ROWS):
            keep = 0.25 + 0.75 * t if y == 1 else 0.6 * t * t
            if rand() < keep:
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" opacity="{1 if y == 1 else 0.55}"/>')
    return ''.join(rects)


def svg(body, defs=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{COLS * 3}" height="{ROWS * 3}" viewBox="0 0 {COLS} {ROWS}" '
            f'shape-rendering="crispEdges">{defs}{body}</svg>')


def static(d):
    return svg(f'<g fill="{CLAY}">{d}</g>')


def glint(d):
    # A pale band 24 cells wide crosses the line in 2.8 s, then rests off the end until the 7 s loop comes round.
    defs = (f'<defs><mask id="ln" maskUnits="userSpaceOnUse" x="0" y="0" width="{COLS}" height="{ROWS}"><g fill="#fff">{d}</g></mask>'
            '<linearGradient id="gl"><stop offset="0" stop-color="#fbe6d8" stop-opacity="0"/>'
            '<stop offset="0.5" stop-color="#fbe6d8" stop-opacity="0.9"/><stop offset="1" stop-color="#fbe6d8" stop-opacity="0"/></linearGradient></defs>')
    band = ('<rect x="-24" y="0" width="24" height="3" fill="url(#gl)" mask="url(#ln)" shape-rendering="auto">'
            '<animate attributeName="x" values="-24;96;96" keyTimes="0;0.4;1" calcMode="spline" '
            'keySplines="0.45 0 0.55 1;0 0 1 1" dur="7s" repeatCount="indefinite"/></rect>')
    return svg(f'<g fill="{CLAY}">{d}</g>{band}', defs)


def breathe(d):
    return svg(f'<g fill="{CLAY}"><animate attributeName="opacity" values="0.55;1;0.55" keyTimes="0;0.5;1" calcMode="spline" '
               f'keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="5s" repeatCount="indefinite"/>{d}</g>')


def tide(d):
    # A repeating soft gradient used as a mask, slid along by one period per loop: brightness flows left to right.
    defs = ('<defs><linearGradient id="td" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="48" y2="0" spreadMethod="repeat">'
            '<stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/>'
            '<stop offset="1" stop-color="#fff" stop-opacity="0.35"/>'
            '<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="48 0" dur="6s" repeatCount="indefinite"/>'
            f'</linearGradient><mask id="tm" maskUnits="userSpaceOnUse" x="0" y="0" width="{COLS}" height="{ROWS}">'
            f'<rect width="{COLS}" height="{ROWS}" fill="url(#td)"/></mask></defs>')
    return svg(f'<g fill="{CLAY}" mask="url(#tm)">{d}</g>', defs)


def build():
    os.makedirs(OUT, exist_ok=True)
    d = dither()
    names = []
    for name, fn in [('static', static), ('glint', glint), ('breathe', breathe), ('tide', tide)]:
        s = fn(d)
        with open(os.path.join(OUT, f'line-{name}.svg'), 'w', encoding='utf-8') as f:
            f.write(s)
        names.append(name)
        print(f'line-{name}.svg', len(s))
    rows = ''.join(f'<div class="row"><span class="tag">{n}</span><img src="line-{n}.svg"><span>14 steps · 2m 05s</span><span>show steps</span></div>' for n in names)
    page = ('<!doctype html><meta charset="utf-8"><title>done lines</title><style>body{margin:0;display:flex;font:13px ui-monospace,monospace}'
            '.pane{flex:1;padding:28px;display:flex;flex-direction:column;gap:26px}.dark{background:#1f1e1d;color:#8a8580}'
            '.light{background:#faf9f5;color:#6f6a64}.row{display:flex;align-items:center;gap:16px}.tag{width:64px;font:12px system-ui}</style>'
            f'<div class="pane dark">{rows}</div><div class="pane light">{rows}</div>')
    with open(os.path.join(OUT, 'lines.html'), 'w', encoding='utf-8') as f:
        f.write(page)


if __name__ == '__main__':
    build()
