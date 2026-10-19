import { getTheme, tintHex } from './theme'

// Art for the terminal's bands: a small Raster of `▀` cells, each two pixels tall (foreground on top, background
// below). Pure functions of the kind and a frame count, so the art can be tested and blitted from a timer.

export type ArtKind = 'cold' | 'swamp' | 'hot' | 'down' | 'brand' | 'calm' | 'compacting' | 'done'

/** The size every band's art is drawn at: 16 columns by 2 rows, 16 by 4 pixels. */
export const ART_COLUMNS = 16
export const ART_ROWS = 2
/** Below this many columns the band leaves its art out, so the words keep their room. */
export const ART_MIN_WIDTH = 90
/** One frame every this many milliseconds while a moving band shows. */
export const ART_FRAME_MS = 100

/** The kinds that move; the rest are drawn once. */
export const MOVING: ReadonlySet<ArtKind> = new Set(['cold', 'swamp', 'hot', 'down', 'compacting'])

type Rgb = readonly [number, number, number]

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const pack = (c: Rgb) => ((Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2])) >>> 0
// A fixed pseudo-random number per seed, so particles keep their lanes from frame to frame.
const rand = (seed: number) => {
  const s = Math.sin(seed * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

// Each kind's ground (the band's background) and its light colour.
const PALETTE: Record<ArtKind, { ground: Rgb; deep: Rgb; light: Rgb; glow: Rgb }> = {
  cold: { ground: hex('#0e1820'), deep: hex('#2f5c80'), light: hex('#dff1ff'), glow: hex('#7cc4ff') },
  swamp: { ground: hex('#111710'), deep: hex('#22351c'), light: hex('#cfe8b8'), glow: hex('#a7c98f') },
  hot: { ground: hex('#1a110c'), deep: hex('#b8461b'), light: hex('#ffb06a'), glow: hex('#f08a3c') },
  down: { ground: hex('#12141b'), deep: hex('#39415a'), light: hex('#b4b8c4'), glow: hex('#6b7288') },
  brand: { ground: hex('#15121f'), deep: hex('#4a3f80'), light: hex('#e4dfff'), glow: hex('#a79cf7') },
  // The dashboard's: the brand's sparkles in grey, since it shows all the time.
  calm: { ground: hex('#141416'), deep: hex('#2a2a2f'), light: hex('#d4d4d8'), glow: hex('#6e6e76') },
  compacting: { ground: hex('#15121f'), deep: hex('#4a3f80'), light: hex('#e4dfff'), glow: hex('#a79cf7') },
  done: { ground: hex('#0f1c15'), deep: hex('#2f7a4c'), light: hex('#d8f5e3'), glow: hex('#5ec48a') },
}

// The violet kinds in the current theme; the rest are not touched by it. Cached per theme so a pixel does not recolour.
const themed = new Map<string, (typeof PALETTE)[ArtKind]>()
function paletteOf(kind: ArtKind) {
  const base = PALETTE[kind]
  if (getTheme() === 'violet' || (kind !== 'brand' && kind !== 'compacting')) return base
  const key = `${getTheme()}-${kind}`
  let p = themed.get(key)
  if (!p) {
    const turn = (c: Rgb): Rgb => hex(tintHex(`#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`))
    p = { ground: turn(base.ground), deep: turn(base.deep), light: turn(base.light), glow: turn(base.glow) }
    themed.set(key, p)
  }
  return p
}

// The done tick, as pixels on the 16 by 4 grid (x, y).
const TICK: ReadonlyArray<readonly [number, number]> = [[9, 2], [10, 3], [11, 2], [12, 1], [13, 0]]

/** The colour of one pixel of `kind` at frame `t`: x from 0 to columns - 1, y from 0 (top) to rows * 2 - 1. */
export function artPixel(kind: ArtKind, t: number, x: number, y: number, cols = ART_COLUMNS, rows = ART_ROWS): number {
  const p = PALETTE[kind]
  const h = rows * 2
  // The scene, then faded in from the left over six columns like the desktop art's mask.
  let c: Rgb = mix(p.ground, p.deep, (y / (h - 1)) * 0.45)
  if (kind === 'cold') {
    // Frost along the bottom; flakes falling, each in its own lane, drifting a little.
    if (y === h - 1) c = mix(c, p.glow, 0.35 + 0.15 * rand(x))
    for (let i = 0; i < 5; i++) {
      const lane = 4 + Math.floor(rand(i + 1) * (cols - 4))
      const fy = (t / (5 + i) + rand(i + 9) * h) % (h + 1)
      const fx = lane + Math.round(Math.sin(t / 7 + i))
      if (x === fx && y === Math.floor(fy)) c = p.light
    }
  } else if (kind === 'swamp') {
    // Bubbles rising, each lane on its own pace; they pale as they near the top.
    for (let i = 0; i < 4; i++) {
      const lane = 5 + Math.floor(rand(i + 3) * (cols - 5))
      const by = h - 1 - ((t / (6 + i * 2) + rand(i + 5) * h) % (h + 1))
      if (x === lane && y === Math.round(by)) c = mix(p.glow, p.light, 1 - by / h)
    }
  } else if (kind === 'hot') {
    // A glowing bottom row that flickers; embers rising and dimming.
    if (y === h - 1) c = mix(p.deep, p.glow, 0.5 + 0.5 * Math.abs(Math.sin(t / 3 + x)))
    for (let i = 0; i < 5; i++) {
      const lane = 4 + Math.floor(rand(i + 7) * (cols - 4))
      const ey = h - 1 - ((t / (3 + i) + rand(i + 2) * h) % h)
      if (x === lane && y === Math.round(ey) && y < h - 1) c = mix(p.light, p.glow, 1 - ey / h)
    }
  } else if (kind === 'down') {
    // Still flecks under a slow pulse: the judge is not answering.
    const pulse = 0.5 + 0.5 * Math.sin(t / 8)
    if (rand(x * 7 + y * 13) > 0.82) c = mix(c, p.light, 0.25 + 0.35 * pulse)
  } else if (kind === 'brand' || kind === 'calm' || kind === 'compacting') {
    // Sparkles in fixed places: still for brand, twinkling while compacting.
    if (rand(x * 5 + y * 11 + 3) > 0.84) {
      const twinkle = kind === 'compacting' ? 0.5 + 0.5 * Math.sin(t / 2 + x * 1.7 + y) : 0.8
      c = mix(p.glow, p.light, twinkle)
    }
  } else if (kind === 'done') {
    if (TICK.some(([tx, ty]) => tx === x && ty === y)) c = p.light
  }
  return pack(mix(p.ground, c, Math.min(1, x / 6)))
}

/** One frame of `kind`'s art as Raster cells: base64 of `[codePoint, top, bottom]` per cell, row-major. */
export function artFrame(kind: ArtKind, t: number, cols = ART_COLUMNS, rows = ART_ROWS): string {
  const words = new Uint32Array(cols * rows * 3)
  for (let row = 0; row < rows; row++)
    for (let x = 0; x < cols; x++) {
      const i = (row * cols + x) * 3
      words[i] = 0x2580 // ▀: the foreground paints the top pixel, the background the bottom one
      words[i + 1] = artPixel(kind, t, x, row * 2, cols, rows)
      words[i + 2] = artPixel(kind, t, x, row * 2 + 1, cols, rows)
    }
  return new Uint8Array(words.buffer).toBase64()
}
