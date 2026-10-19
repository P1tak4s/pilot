// Working-card scenes: Clawd, the Claude Code pixel creature, at work. Pixel art on a grid, animated frame by frame
// (discrete steps, no tweening), on a transparent background so the card has no box.
const P = 14 // screen pixels per art pixel
const GW = 64 // grid width
const GH = 30 // grid height
const W = GW * P
const H = GH * P

const PALETTE: Record<string, string> = {
  '#': '#d77757', // Clawd
  k: '#1e1b1a', // screen / dark
  g: '#4a4340', // grey frame
  l: '#8a7f78', // light grey
  w: '#e8e0da', // white
  o: '#d77757', // orange accent
  b: '#6b5d57', // block
}

// Draws a sprite of rows of palette letters at grid (ox, oy); '.' and ' ' are empty. Same-colour pixels in a row are
// merged into one run, and each colour is one path in grid units, which keeps the SVG well under the engine's cap.
const sprite = (rows: string[], ox: number, oy: number) => {
  const paths: Record<string, string> = {}
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let end = x + 1
      while (end < row.length && row[end] === c) end++
      if (PALETTE[c]) paths[c] = (paths[c] ?? '') + `M${ox + x} ${oy + y}h${end - x}v1h-${end - x}z`
      x = end
    }
  })
  return Object.entries(paths).map(([c, d]) => `<path fill="${PALETTE[c]}" d="${d}"/>`).join('')
}

// Shows each frame in turn for an equal share of `dur` seconds, with hard cuts between them.
const frames = (list: string[], dur: number) => {
  const n = list.length
  const keyTimes = list.map((_, i) => (i / n).toFixed(4)).join(';')
  return list
    .map((body, i) => {
      const values = list.map((_, j) => (j === i ? 1 : 0)).join(';')
      return `<g opacity="${i === 0 ? 1 : 0}">${body}<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/></g>`
    })
    .join('')
}

// Clawd, 18 x 5, from the welcome screen's block glyphs. Eye holes on row 1; arms on row 2 by default.
const clawd = (o: { blink?: boolean; armL?: 1 | 2 | 3; armR?: 1 | 2 | 3; step?: boolean } = {}) => {
  const rows = [
    '...############...',
    o.blink ? '...############...' : '...##.######.##...',
    '..##############..',
    '...############...',
    o.step ? '...#.#......#.#...' : '....#.#....#.#....',
  ].map(r => [...r])
  const armL = o.armL ?? 2
  const armR = o.armR ?? 2
  rows[armL][1] = '#'
  rows[armR][16] = '#'
  // Terminal glyph quadrants are twice as tall as wide, so each row is drawn twice.
  return rows.flatMap(r => [r.join(''), r.join('')])
}

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${GW} ${GH}" shape-rendering="crispEdges">${body}</svg>`

// Scene 1: typing at a laptop, arms tapping, code filling the screen line by line.
const LAPTOP = [
  'gggggggggggggggg',
  'gkkkkkkkkkkkkkkg',
  'gkkkkkkkkkkkkkkg',
  'gkkkkkkkkkkkkkkg',
  'gkkkkkkkkkkkkkkg',
  'gkkkkkkkkkkkkkkg',
  'gkkkkkkkkkkkkkkg',
  'gkkkkkkkkkkkkkkg',
  'gggggggggggggggg',
  'llllllllllllllllll',
]
const CODE = ['oooo.lllll', 'lllllll', '..oooll', '..llllllll', 'ooo', 'llll.oo']
const codeUpTo = (n: number) => sprite(CODE.slice(0, n), 34, 14)
const typingClawd = (i: number) =>
  sprite(clawd({ armL: i % 2 ? 3 : 2, armR: i % 2 ? 2 : 3, blink: i === 9 }), 12, 12)
const typing = wrap(
  sprite(LAPTOP, 32, 12) +

    frames(
      Array.from({ length: 12 }, (_, i) => codeUpTo(Math.min(CODE.length, Math.floor(i / 2) + 1)) + typingClawd(i)),
      2.4,
    ),
)

// Scene 2: building, blocks landing one by one on a stack while Clawd swings a hammer.
const BLOCK = ['bbbb', 'bbbb', 'bbbb']
const BLOCK_O = ['oooo', 'oooo', 'oooo']
const STACK: [string[], number, number][] = [
  [BLOCK, 34, 21],
  [BLOCK_O, 39, 21],
  [BLOCK, 44, 21],
  [BLOCK_O, 36, 18],
  [BLOCK, 41, 18],
  [BLOCK_O, 38, 15],
]
const HAMMER_UP = ['.ww', '.ww', '.l.', '.l.', '.l.']
const HAMMER_DOWN = ['...', 'lllww', '....ww']
const building = wrap(
  sprite(['llllllllllllllllllllllll'], 30, 24) +
    frames(
      Array.from({ length: 14 }, (_, i) => {
        const placed = Math.min(STACK.length, Math.floor(i / 2) + 1)
        const blocks = STACK.slice(0, placed)
          .map(([b, x, y], k) => sprite(b, x, k === placed - 1 && i % 2 === 0 && i < 12 ? y - 2 : y))
          .join('')
        const down = i % 2 === 1
        return blocks + sprite(clawd({ armR: down ? 3 : 1, blink: i === 11 }), 8, 14) + sprite(down ? HAMMER_DOWN : HAMMER_UP, down ? 24 : 24, down ? 19 : 11)
      }),
      2.8,
    ),
)

// Scene 3: searching a page, Clawd holding a magnifier that hops across the lines.
const PAGE = [
  'wwwwwwwwwwww',
  'wkkkkk.kkk.w',
  'w..........w',
  'wkkkk.kkkkkw',
  'w..........w',
  'wkkkkkkk...w',
  'w..........w',
  'wkk.kkkkkk.w',
  'w..........w',
  'wkkkkk.kk..w',
  'wwwwwwwwwwww',
].map(r => r.replace(/\./g, 'w').replace(/k/g, 'l'))
const GLASS = ['.ggg.', 'g...g', 'g...g', 'g...g', '.ggg.', '.....l', '......l']
const SPOTS: [number, number][] = [
  [35, 9],
  [40, 10],
  [37, 12],
  [41, 14],
  [36, 15],
  [39, 11],
]
const searching = wrap(
  sprite(PAGE, 34, 9) +
    frames(
      SPOTS.map(([x, y], i) => sprite(GLASS, x, y) + sprite(clawd({ armR: i % 2 ? 1 : 2, step: i % 2 === 1, blink: i === 4 }), 12, 13)),
      3,
    ),
)


// Environment scenes: a pixel panel with its own sky and ground, Clawd taking it easy in it.
const box = (x: number, y: number, w: number, h: number, fill: string) => `<path fill="${fill}" d="M${x} ${y}h${w}v${h}h-${w}z"/>`
const disc = (cx: number, cy: number, r: number, fill: string) =>
  Array.from({ length: r * 2 + 1 }, (_, i) => {
    const dy = i - r
    const half = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8))
    return box(cx - half, cy + dy, half * 2 + 1, 1, fill)
  }).join('')
// The panel: x 8..55, y 2..25, with its corner pixels cut, coloured row by row.
const PX = 8
const PY = 2
const PW = 48
const PH = 24
const panel = (colourOf: (row: number) => string) =>
  Array.from({ length: PH }, (_, r) => {
    const inset = r === 0 || r === PH - 1 ? 1 : 0
    return box(PX + inset, PY + r, PW - inset * 2, 1, colourOf(r))
  }).join('')

// Scene 4: surfing at sunset, waves rolling under the board.
const SKY_DUSK = ['#2a1f3d', '#2a1f3d', '#2a1f3d', '#2a1f3d', '#3d2747', '#3d2747', '#3d2747', '#3d2747', '#5e3450', '#5e3450', '#5e3450', '#8a4652', '#8a4652', '#8a4652']
const SEA = ['#1d3557', '#1d3557', '#1d3557', '#18304d', '#18304d', '#18304d', '#18304d', '#14273f', '#14273f', '#14273f']
const BOARD = ['..wwwwwwwwwwwwwwww', '.wwwwwwwwwwwwwwwwww', '..llllllllllllllll']
const waves = (f: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const x = PX + 1 + ((k * 9 + f * 2) % (PW - 4))
    return box(x, PY + 17, 3, 1, '#9fc4e0') + box(x + 1, PY + 16, 1, 1, '#9fc4e0')
  }).join('')
const glints = (f: number) =>
  [0, 2, 4].map(k => box(PX + 35 + ((k + f) % 3) * 2, PY + 15 + k, 3 - (k % 2), 1, '#e8935f')).join('')
const surfing = wrap(
  panel(r => (r < SKY_DUSK.length ? SKY_DUSK[r] : SEA[r - SKY_DUSK.length])) +
    // the sun sets behind the sea: drawn over the sky, then the sea rows cover its lower half
    disc(PX + 37, PY + 13, 5, '#e8935f') +
    SEA.map((c, i) => box(PX + (i === SEA.length - 1 ? 1 : 0), PY + SKY_DUSK.length + i, PW - (i === SEA.length - 1 ? 2 : 0), 1, c)).join('') +
    frames(
      Array.from({ length: 4 }, (_, f) => {
        const bob = f % 2
        return waves(f) + glints(f) + sprite(BOARD, PX + 13, PY + 18 + bob) + sprite(clawd({ armL: 1, armR: 1, blink: f === 3 }), PX + 13, PY + 8 + bob)
      }),
      1.6,
    ),
)

// Scene 5: lying in a field at night, stars twinkling, a cloud drifting, grass swaying.
const NIGHT = ['#141830', '#141830', '#141830', '#181d3a', '#181d3a', '#181d3a', '#1d2344', '#1d2344', '#1d2344', '#232a4d', '#232a4d', '#262d50', '#262d50', '#262d50']
const GROUND = ['#1f3a2a', '#24452e', '#24452e', '#24452e', '#2d5737', '#2d5737', '#2d5737', '#2d5737', '#2d5737', '#2d5737']
const STARS: [number, number][] = [[5, 2], [12, 4], [19, 1], [27, 3], [34, 5], [41, 2], [9, 8], [30, 9], [44, 7], [16, 10]]
const CLOUD = ['..llll....', '.llllllll.', 'llllllllll']
const FLOWERS: [number, number, string][] = [[4, 19, '#e8935f'], [11, 21, '#e8e0da'], [37, 20, '#e8935f'], [43, 22, '#e8e0da'], [31, 22, '#e8935f']]
const blades = (f: number) =>
  Array.from({ length: 16 }, (_, k) => {
    const x = PX + 1 + k * 3
    const lean = (k + f) % 2
    return box(x + lean, PY + 13, 1, 1, '#3f7a4a') + box(x, PY + 14, 1, 1, '#3f7a4a')
  }).join('')
const field = wrap(
  panel(r => (r < NIGHT.length ? NIGHT[r] : GROUND[r - NIGHT.length])) +
    disc(PX + 40, PY + 5, 3, '#e8e0da') +
    FLOWERS.map(([x, y, c]) => box(PX + x, PY + y, 1, 1, c)).join('') +
    frames(
      Array.from({ length: 6 }, (_, f) =>
        STARS.filter((_, k) => (k + f) % 3 !== 0).map(([x, y]) => box(PX + x, PY + y, 1, 1, '#cfd6ff')).join('') +
        sprite(CLOUD, PX + 2 + f * 2, PY + 3) +
        blades(f) +
        sprite(clawd({ armL: 1, armR: 1, blink: f >= 4 }), PX + 15, PY + 9),
      ),
      3,
    ),
)

export const SCENES = [surfing, typing, field, building, searching]
export const SCENE_SIZE = { width: W, height: H }
