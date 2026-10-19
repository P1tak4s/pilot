// The quotes set, drawn when a quote is shown instead of shipped as one file each: the line in italic Georgia settles
// in word by word while a pixel quill dips once in its inkwell, then the author's name shows. Pure (no $), so the
// card and the tests both call it.
//
// The SVG's own attributes are the finished card (every letter inked, the quill resting in the inkwell); the
// animations only play the words in up to it. Taking the animations out, as stillCard does, leaves the finished card,
// and the root's data-once says after how many seconds that is the right thing to show.
import { INKWELL, ITALIC, QUILL, UPRIGHT } from './quill-data'

const VW = 560
const VH = 350
const INK = '#d97757'
const GREY = '#8a8780'
const FAMILY = "Georgia, 'Times New Roman', serif"
const WELL_X = 52 // bottom left, clear of the author on the right; the tilted feather stays inside the card
const WELL_Y = VH - 40
const REST_ANGLE = 14

const num = (v: number) => {
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return s === '' || s === '-0' ? '0' : s
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// A line's width at a font size: the sum of its letters' advances (no kerning), measured from Georgia once.
function measure(table: Record<string, number>, text: string, size: number) {
  let w = 0
  for (const ch of text) w += table[ch] ?? 500
  return (w * size) / 1000
}

function wrap(text: string, size: number, limit: number): [string, number][] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word
    if (measure(ITALIC, trial, size) <= limit) line = trial
    else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines.map(l => [l, measure(ITALIC, l, size)])
}

// The biggest size whose wrapped lines fit four rows in the writing area, with no lonely last word.
export function quoteLayout(text: string): { size: number; lines: [string, number][] } {
  for (let size = 46; size >= 18; size--) {
    const lines = wrap(text, size, 470)
    const widest = Math.max(...lines.map(([, w]) => w))
    // at most four lines, and never so tall that the last one reaches down to the quill in its corner
    const tall = size * 1.35 * (lines.length - 1) + size
    if (lines.length <= 4 && tall <= 190 && !(lines.length > 1 && lines[lines.length - 1][1] < 0.3 * widest)) return { size, lines }
  }
  return { size: 18, lines: wrap(text, 18, 430) }
}

export function quoteCard(text: string, author: string): string {
  const { size, lines } = quoteLayout(text)
  const lead = size * 1.35
  const blockW = Math.max(...lines.map(([, w]) => w))
  const blockH = lead * (lines.length - 1) + size
  const authSize = Math.max(14, Math.round(size * 0.55))
  const top = (VH - (blockH + authSize * 1.8)) / 2 + size * 0.8 // baseline of the first line
  const left = (VW - blockW) / 2

  // The quill stays in its inkwell and dips once; the words settle in one after another, left to right, and the
  // author follows. Quick and quiet: nothing crosses the line while it is read.
  const words = lines.flatMap(([line]) => line.split(' '))
  const step = Math.min(0.08, 1.1 / words.length)
  const start = 0.35
  const fade = 0.45
  const inked = start + step * (words.length - 1) + fade
  const total = Math.max(2, inked + 0.6)
  const dur = `${num(total)}s`
  const k = (v: number) => num(Math.min(1, v / total))

  let w = 0
  const rows = lines.map(([line, lw], i) => {
    const spans = line.split(' ').map((word, j) => {
      const t0 = start + step * w++
      const show = `values="0;0;1;1" keyTimes="0;${k(t0)};${k(t0 + fade)};1" dur="${dur}" fill="freeze"`
      return `<tspan>${j ? ' ' : ''}${esc(word)}<animate attributeName="fill-opacity" ${show}/>` +
        `<animate attributeName="stroke-opacity" ${show}/></tspan>`
    })
    return `<text x="${num((VW - lw) / 2)}" y="${num(top + i * lead)}" xml:space="preserve">${spans.join('')}</text>`
  })
  const ay = top + (lines.length - 1) * lead + authSize * 1.9
  // The author sits under the quote's right edge, moved right if a long name would reach the inkwell corner.
  const aw = measure(UPRIGHT, author, authSize) + author.length
  const ax = Math.min(VW - 24, Math.max(left + blockW, 150 + aw))
  const sign = `<text x="${num(ax)}" y="${num(ay)}" text-anchor="end" font-size="${authSize}" fill="${GREY}" stroke="none" ` +
    `font-style="normal" letter-spacing="1">${esc(author)}<animate attributeName="opacity" values="0;0;1;1" ` +
    `keyTimes="0;${k(inked - 0.2)};${k(inked + 0.3)};1" dur="${dur}" fill="freeze"/></text>`
  // one dip: down into the ink and back, tilting a little, at the start
  const dip = `<animateTransform attributeName="transform" type="translate" values="0,0;0,7;0,0;0,0" keyTimes="0;${k(0.25)};${k(0.55)};1" dur="${dur}" fill="freeze"/>`
  const tilt = `<animateTransform attributeName="transform" type="rotate" values="${REST_ANGLE};${REST_ANGLE - 6};${REST_ANGLE};${REST_ANGLE}" keyTimes="0;${k(0.25)};${k(0.55)};1" dur="${dur}" fill="freeze"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" data-fit="contain" data-once="${num(total)}" width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}">` +
    `<g font-family="${FAMILY}" font-style="italic" font-size="${size}" fill="${INK}" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round">${rows.join('')}${sign}</g>` +
    `<g shape-rendering="crispEdges"><g transform="translate(${WELL_X},${WELL_Y})">${INKWELL}</g>` +
    `<g transform="translate(${WELL_X},${WELL_Y})"><g>${dip}<g transform="rotate(${REST_ANGLE})">${tilt}${QUILL}</g></g></g></g></svg>`
}

// A play-once card with its animations taken out: the finished card, as it should stay once it has been written.
export function stillCard(svg: string): string {
  return svg.replace(/<(animate\w*|set)\b[^>]*\/>/g, '').replace(/<(animate\w*|set)\b[^>]*>[\s\S]*?<\/\1>/g, '')
}

// How long a play-once card takes, in milliseconds, or null for a scene that loops.
export function onceMs(svg: string): number | null {
  const m = svg.match(/<svg\b[^>]*\sdata-once="([\d.]+)"/)
  return m ? Number(m[1]) * 1000 : null
}
