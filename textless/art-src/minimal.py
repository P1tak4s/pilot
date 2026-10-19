"""The minimal set: for someone who wants the space and nothing to look at. One small orange thing in the middle of an
empty, see-through card, moving slowly or barely at all. No scene, no figure to follow, no text.
- dot: one small square that breathes, brighter and fainter over four seconds.
- dots: three small squares lighting one after another, unhurried.
- line: a thin line with a short brighter stretch gliding along it and back.
- spark: Claude's thinking spinner, big: a dot growing through star shapes and back.
- orbit: a small square outline with one pixel walking round its edge.
- clawd: a tiny Clawd who only blinks now and then.
Fitted whole (data-fit="contain") so the one thing always sits in the middle of the card.
Run: python minimal.py -> ../plugin/hooks/scenes/minimal/*.svg
"""
import pixkit
from pixkit import CLAWD, H, W, Clawd, Pix, even, num, timeline, write

C = CLAWD
MX, MY = W // 2, H // 2


def svg(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" data-fit="contain" width="560" height="{round(560 * H / W)}" '
            f'viewBox="0 0 {W} {H}" shape-rendering="crispEdges">{body}</svg>')


def breathe(values, dur):
    """A slow opacity loop: values eased by plain linear interpolation, the gentlest motion SVG has."""
    vals = ';'.join(num(v) for v in values)
    return f'<animate attributeName="opacity" values="{vals}" dur="{num(dur)}s" repeatCount="indefinite"/>'


def dot():
    s = 8
    write('minimal/dot', svg(f'<rect x="{MX - s // 2}" y="{MY - s // 2}" width="{s}" height="{s}" fill="{C}">'
                             f'{breathe([1, 0.35, 1], 4)}</rect>'))


def dots():
    s, gap = 3, 4
    x0 = MX - (3 * s + 2 * gap) // 2
    frames = []
    for k in range(4):
        p = Pix()
        for i in range(3):
            p.rect(x0 + i * (s + gap), MY - 1, s, s, C if i == k else C + '@0.25')
        frames.append(p.svg())
    write('minimal/dots', svg(timeline(frames, [(0, 0.7), (1, 0.7), (2, 0.7), (3, 0.9)])))


def line():
    w = 48
    x0 = MX - w // 2
    track = f'<rect x="{x0}" y="{MY}" width="{w}" height="1" fill="{C}" fill-opacity="0.25"/>'
    run = (f'<rect y="{MY}" width="8" height="1" fill="{C}"><animate attributeName="x" '
           f'values="{x0};{x0 + w - 8};{x0}" dur="5s" repeatCount="indefinite"/></rect>')
    write('minimal/line', svg(track + run))


def spark():
    """Claude's own thinking spinner, big: the sunburst grows from a dot through fuller star shapes and back, the way
    Claude Code's spinner steps through its glyphs. Rays are solid wedges, wide at the core and pointed at the tip."""
    import math
    # (ray lengths, base half-width); the last one is the full logo with uneven rays
    shapes = [([], 0), ([5, 5, 5, 5], 0.9), ([8, 7, 8, 7, 8, 7], 1.0), ([11, 9, 11, 9, 11, 9, 11, 9], 1.1),
              ([15, 11, 13, 16, 12, 14, 15, 11, 13, 12], 1.2)]
    frames = []
    for k, (rays, wide) in enumerate(shapes):
        p = Pix()
        core = 1.6 + 0.35 * k
        n = len(rays)
        for y in range(MY - 18, MY + 19):
            for x in range(MX - 18, MX + 19):
                dx, dy = x + 0.5 - (MX + 0.5), y + 0.5 - (MY + 0.5)
                if dx * dx + dy * dy <= core * core:
                    p.px(x, y, C)
                    continue
                for r, length in enumerate(rays):
                    a = r * 2 * math.pi / n - math.pi / 2 + 0.2
                    t = dx * math.cos(a) + dy * math.sin(a)
                    side = abs(-dx * math.sin(a) + dy * math.cos(a))
                    if 0 <= t <= length and side <= wide * (1 - 0.45 * t / length) + 0.2:
                        p.px(x, y, C)
                        break
        frames.append(p.svg())
    order = list(range(len(shapes))) + list(range(len(shapes) - 2, 0, -1))
    hold = {0: 0.5, len(shapes) - 1: 0.6}
    write('minimal/spark', svg(timeline(frames, [(i, hold.get(i, 0.15)) for i in order])))


def orbit():
    n = 10
    x0, y0 = MX - n // 2, MY - n // 2
    edge = [(x0 + i, y0) for i in range(n)] + [(x0 + n - 1, y0 + i) for i in range(1, n)]
    edge += [(x0 + n - 1 - i, y0 + n - 1) for i in range(1, n)] + [(x0, y0 + n - 1 - i) for i in range(1, n - 1)]
    box = Pix()
    for x, y in edge:
        box.px(x, y, C + '@0.25')
    frames = [Pix().px(x, y, C).svg() for x, y in edge[::2]]
    write('minimal/orbit', svg(box.svg() + timeline(frames, even(len(frames), 6.0))))


def clawd():
    K = Clawd(MX - 6, MY - 5, 1)
    open_, shut = K.eye_pix('open').svg(), Pix()
    for ex, ey, ew, eh in K.eyes():
        shut.rect(ex, ey + eh - 1, ew, 1, pixkit.EYE)
    eyes = timeline([open_, shut.svg()], [(0, 4.2), (1, 0.15), (0, 2.6), (1, 0.15)])
    write('minimal/clawd', svg(K.body().svg() + eyes))


if __name__ == '__main__':
    dot()
    dots()
    line()
    spark()
    orbit()
    clawd()
