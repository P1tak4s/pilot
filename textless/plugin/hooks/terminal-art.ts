// Pixel-art scenes for a plain terminal. A terminal cannot draw an SVG, but it can paint cells with a glyph, a foreground
// and a background colour: this reads the shapes of a scene (rectangles, alone or as paths of rectangles) into a grid of
// pixels, shrinks it to the room there is, and packs two pixel rows into each row of half-block cells. Pure functions, no
// `$`: the card hands the result to the terminal's Raster element.

type Pixel = { r: number; g: number; b: number; a: number }

const NAMED: Record<string, string> = { black: '#000000', white: '#ffffff', red: '#ff0000', none: '' }

function colour(value: string | undefined): [number, number, number] | null {
  const v = String(value ?? '').trim().toLowerCase()
  const hex = (NAMED[v] ?? v).replace('#', '')
  if (/^[0-9a-f]{3}$/.test(hex)) return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)]
  if (/^[0-9a-f]{6}$/.test(hex)) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
  return null
}

const attr = (attrs: string, name: string) => attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`))?.[1]

/** The rectangles of a path's data: every subpath that is an axis-aligned box (M, H, V, L, Z in either case). */
function pathBoxes(d: string): [number, number, number, number][] {
  const boxes: [number, number, number, number][] = []
  let x = 0
  let y = 0
  let pts: [number, number][] = []
  const flush = () => {
    if (pts.length >= 3) {
      const xs = pts.map(p => p[0])
      const ys = pts.map(p => p[1])
      const x0 = Math.min(...xs)
      const x1 = Math.max(...xs)
      const y0 = Math.min(...ys)
      const y1 = Math.max(...ys)
      if (pts.every(p => (p[0] === x0 || p[0] === x1) && (p[1] === y0 || p[1] === y1))) boxes.push([x0, y0, x1 - x0, y1 - y0])
    }
    pts = []
  }
  for (const m of d.matchAll(/([MmHhVvLlZz])([^MmHhVvLlZz]*)/g)) {
    const cmd = m[1]
    const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)
    const rel = cmd === cmd.toLowerCase()
    const up = cmd.toUpperCase()
    if (up === 'M') {
      flush()
      x = rel ? x + n[0] : n[0]
      y = rel ? y + n[1] : n[1]
      pts.push([x, y])
    } else if (up === 'H') {
      x = rel ? x + n[0] : n[0]
      pts.push([x, y])
    } else if (up === 'V') {
      y = rel ? y + n[0] : n[0]
      pts.push([x, y])
    } else if (up === 'L') {
      x = rel ? x + n[0] : n[0]
      y = rel ? y + n[1] : n[1]
      pts.push([x, y])
    } else if (up === 'Z') flush()
  }
  flush()
  return boxes
}

/** An animation's value at `t` seconds: its values stepped by keyTimes (discrete) or blended between them. Numbers only;
 * a translate is read as a pair. Null when it has nothing this can read. */
function animated(attrs: string, t: number): number[] | null {
  const values = (attr(attrs, 'values') ?? '').split(';').map(v => v.trim().split(/[\s,]+/).map(Number))
  if (!values.length || values.some(v => v.some(Number.isNaN))) return null
  const dur = parseFloat(attr(attrs, 'dur') ?? '')
  if (!(dur > 0)) return values[0]
  const raw = attr(attrs, 'keyTimes')
  const times = raw ? raw.split(';').map(Number) : values.map((_, i) => (values.length === 1 ? 0 : i / (values.length - 1)))
  if (times.length !== values.length) return values[0]
  const repeat = attr(attrs, 'repeatCount')
  const done = repeat !== 'indefinite' && t >= dur * (Number(repeat) || 1)
  const p = done ? 1 : (t % dur) / dur
  const discrete = attr(attrs, 'calcMode') === 'discrete'
  let i = 0
  while (i + 1 < times.length && times[i + 1] <= p) i++
  if (discrete || i + 1 >= times.length || done) return values[i]
  const span = times[i + 1] - times[i]
  const f = span > 0 ? (p - times[i]) / span : 0
  return values[i].map((v, k) => v + (values[i + 1][k] - v) * f)
}

/** The scene at `t` seconds as pixels: a grid of the viewBox's units. Groups that start hidden are skipped, groups an
 * opacity animation starts at 1 are shown; transforms and animations are otherwise ignored. */
export function sceneGrid(svg: string, t = 0): { w: number; h: number; px: Pixel[] } | null {
  const root = svg.match(/<svg\b([^>]*)>/)
  if (!root) return null
  const vb = attr(root[1], 'viewBox')?.trim().split(/[\s,]+/).map(Number)
  const w = Math.round(vb?.[2] ?? Number(attr(root[1], 'width')))
  const h = Math.round(vb?.[3] ?? Number(attr(root[1], 'height')))
  if (!w || !h || w > 1024 || h > 1024) return null
  const px: Pixel[] = Array.from({ length: w * h }, () => ({ r: 0, g: 0, b: 0, a: 0 }))
  const paint = (x0: number, y0: number, bw: number, bh: number, rgb: [number, number, number], alpha: number) => {
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(h, Math.round(y0 + bh)); y++) {
      for (let x = Math.max(0, Math.round(x0)); x < Math.min(w, Math.round(x0 + bw)); x++) {
        const p = px[y * w + x]
        const out = alpha + p.a * (1 - alpha)
        if (out <= 0) continue
        p.r = (rgb[0] * alpha + p.r * p.a * (1 - alpha)) / out
        p.g = (rgb[1] * alpha + p.g * p.a * (1 - alpha)) / out
        p.b = (rgb[2] * alpha + p.b * p.a * (1 - alpha)) / out
        p.a = out
      }
    }
  }
  // One entry per open <g>: shown or not, its opacity, how far it is moved, and the fill its shapes inherit.
  type Group = { shown: boolean; opacity: number; dx: number; dy: number; fill?: string; fillOpacity: number }
  const stack: Group[] = []
  const hidden = () => stack.some(g => !g.shown)
  const opacity = () => stack.reduce((o, g) => o * g.opacity, 1)
  const dx = () => stack.reduce((o, g) => o + g.dx, 0)
  const dy = () => stack.reduce((o, g) => o + g.dy, 0)
  const inherited = () => {
    let fill: string | undefined
    let fo = 1
    for (const g of stack) {
      if (g.fill !== undefined) fill = g.fill
      fo *= g.fillOpacity
    }
    return { fill, fo }
  }
  // A shape that holds an animation of its own (its x or y) is painted when it closes, once the animation was read.
  let open: { name: string; attrs: string; x?: number; y?: number } | null = null
  const shape = (name: string, attrs: string, over?: { x?: number; y?: number }) => {
    if (hidden()) return
    const inh = inherited()
    const rgb = colour(attr(attrs, 'fill') ?? inh.fill)
    if (!rgb) return
    const alpha = Math.min(1, Number(attr(attrs, 'fill-opacity') ?? 1) * inh.fo * Number(attr(attrs, 'opacity') ?? 1) * opacity())
    if (alpha <= 0) return
    if (name === 'rect') {
      const rw = Number(attr(attrs, 'width'))
      const rh = Number(attr(attrs, 'height'))
      if (rw > 0 && rh > 0) paint((over?.x ?? Number(attr(attrs, 'x') ?? 0)) + dx(), (over?.y ?? Number(attr(attrs, 'y') ?? 0)) + dy(), rw, rh, rgb, alpha)
    } else if (name === 'path') {
      for (const [bx, by, bw, bh] of pathBoxes(attr(attrs, 'd') ?? '')) paint(bx + dx(), by + dy(), bw, bh, rgb, alpha)
    }
  }
  for (const m of svg.matchAll(/<(\/?)([A-Za-z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const closing = m[1] === '/'
    const name = m[2]
    const attrs = m[3]
    if (name === 'g') {
      if (closing) stack.pop()
      else if (m[4] !== '/') {
        const o = attr(attrs, 'opacity')
        const tr = attr(attrs, 'transform')?.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)?/)
        stack.push({
          shown: o === undefined || Number(o) > 0,
          opacity: o === undefined ? 1 : Number(o) || 0,
          dx: tr ? Number(tr[1]) : 0,
          dy: tr ? Number(tr[2] ?? 0) : 0,
          fill: attr(attrs, 'fill'),
          fillOpacity: Number(attr(attrs, 'fill-opacity') ?? 1),
        })
      }
      continue
    }
    if (closing) {
      if (open && open.name === name) {
        shape(open.name, open.attrs, open)
        open = null
      }
      continue
    }
    if (name === 'animate' && open && (attr(attrs, 'attributeName') === 'x' || attr(attrs, 'attributeName') === 'y')) {
      const v = animated(attrs, t)
      if (v) { if (attr(attrs, 'attributeName') === 'x') open.x = v[0]; else open.y = v[0] }
      continue
    }
    if (name === 'animate' && attr(attrs, 'attributeName') === 'opacity' && stack.length) {
      // How the group looks at `t`.
      const v = animated(attrs, t)
      const top = stack[stack.length - 1]
      if (v) {
        top.shown = v[0] > 0
        top.opacity = Math.max(0, Math.min(1, v[0]))
      }
      continue
    }
    if (name === 'animateTransform' && attr(attrs, 'type') === 'translate' && stack.length) {
      const v = animated(attrs, t)
      const top = stack[stack.length - 1]
      if (v) { top.dx = v[0]; top.dy = v[1] ?? 0 }
      continue
    }
    if ((name === 'rect' || name === 'path') && m[4] !== '/') open = { name, attrs }
    else shape(name, attrs)
  }
  return px.some(p => p.a > 0) ? { w, h, px } : null
}

const base64 = (bytes: Uint8Array) => {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += abc[(n >> 18) & 63] + abc[(n >> 12) & 63] + (i + 1 < bytes.length ? abc[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? abc[n & 63] : '=')
  }
  return out
}

const DEFAULT = 0x01000000
const rgbInt = (p: Pixel) => (Math.round(p.r) << 16) | (Math.round(p.g) << 8) | Math.round(p.b)

/** The scene as terminal cells: shrunk by whole pixels to fit `maxCols` columns and `maxRows` rows, two pixel rows to a
 * row of half blocks. Null when the scene has nothing this can read (a quote, a picture). */
export function sceneCells(svg: string, maxCols: number, maxRows: number, t = 0): { columns: number; rows: number; cells: string } | null {
  const grid = sceneGrid(svg, t)
  if (!grid) return null
  const k = Math.max(1, Math.ceil(grid.w / Math.max(8, maxCols)), Math.ceil(grid.h / (Math.max(4, maxRows) * 2)))
  const columns = Math.ceil(grid.w / k)
  const pixelRows = Math.ceil(grid.h / k)
  const rows = Math.ceil(pixelRows / 2)
  // Each shrunk pixel takes the colour most of its block is painted in, so a two-pixel eye stays an eye and is not
  // blended into the body; it counts as painted when at least half the block is.
  const small: Pixel[] = []
  for (let y = 0; y < rows * 2; y++) {
    for (let x = 0; x < columns; x++) {
      const votes = new Map<number, { n: number; p: Pixel }>()
      let a = 0
      let n = 0
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const sx = x * k + dx
          const sy = y * k + dy
          if (sx >= grid.w || sy >= grid.h) continue
          const p = grid.px[sy * grid.w + sx]
          n++
          a += p.a
          if (p.a < 0.5) continue
          const key = rgbInt(p)
          const v = votes.get(key)
          if (v) v.n++
          else votes.set(key, { n: 1, p })
        }
      }
      let best: { n: number; p: Pixel } | null = null
      for (const v of votes.values()) if (!best || v.n > best.n) best = v
      small.push(best ? { r: best.p.r, g: best.p.g, b: best.p.b, a: a / Math.max(1, n) } : { r: 0, g: 0, b: 0, a: 0 })
    }
  }
  const words = new Uint32Array(columns * rows * 3)
  const solid = (p: Pixel) => p.a >= 0.5
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const top = small[row * 2 * columns + col]
      const bottom = small[(row * 2 + 1) * columns + col]
      const i = (row * columns + col) * 3
      if (solid(top) && solid(bottom)) { words[i] = 0x2580; words[i + 1] = rgbInt(top); words[i + 2] = rgbInt(bottom) }
      else if (solid(top)) { words[i] = 0x2580; words[i + 1] = rgbInt(top); words[i + 2] = DEFAULT }
      else if (solid(bottom)) { words[i] = 0x2584; words[i + 1] = rgbInt(bottom); words[i + 2] = DEFAULT }
      else { words[i] = 0x20; words[i + 1] = DEFAULT; words[i + 2] = DEFAULT }
    }
  }
  return { columns, rows, cells: base64(new Uint8Array(words.buffer)) }
}

/** Whether the terminal can show this scene: it is built of shapes it reads, not of embedded pictures, and something is
 * painted in it at some moment. */
export function readable(svg: string): boolean {
  if (/<image\b/.test(svg)) return false
  return [0.3, 2.1, 4.7, 7.9].some(t => sceneGrid(svg, t) !== null)
}
