// The look of the mod's accent: violet (the brand) or Claude orange. Every violet in the mod is one hex of the same
// family, so the theme turns them in one place instead of keeping two sets of colours: any #rrggbb in a violet hue is
// moved to the orange hue, neutrals and the other signal colours (green, yellow, red, blue) are left alone.

export type ThemeName = 'violet' | 'orange' | 'rose'
export const THEMES: readonly ThemeName[] = ['violet', 'orange', 'rose']
// The hue each theme turns the violets to. Rose is a cherry-blossom pink; its sparkles are drawn as falling petals (see petals).
const HUES: Record<Exclude<ThemeName, 'violet'>, number> = { orange: 15, rose: 340 }

let current: ThemeName = 'violet'
// Light appearance: the panels are drawn for a dark app; on a light one every colour is turned (lightHex) so the surfaces
// come out pale and the text and accents deep. It sits on top of the theme's hue, so every theme has a light form.
let light = false
export const setLight = (on: boolean) => {
  if (on !== light) lmemo.clear()
  light = on
}
export const isLight = () => light
export const setTheme = (name: ThemeName) => {
  // The turned colours are remembered per hex, so a new theme starts with none: orange's would show in rose.
  if (name !== current) memo.clear()
  current = name
}
export const getTheme = () => current

/** The brand violet, the colour the rest of the family is turned from. */
export const VIOLET = '#a79cf7'

// Claude's orange (#d97757) sits at hue 15, saturation 63%, lightness 60%. The brand violet is lighter and stronger, so
// the saturation and the lightness of what turns come down to meet it.
const hexRe = /#[0-9a-fA-F]{6}\b/g
const memo = new Map<string, string>()
const lmemo = new Map<string, string>()

function toHsl(r: number, g: number, b: number): [number, number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }
  return [h, s, l, d]
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const byte = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

/** One hex in the current theme: violets turn orange, everything else stays. */
export function tintHex(hex: string): string {
  if (current === 'violet') return hex
  const key = hex.toLowerCase()
  const hit = memo.get(key)
  if (hit) return hit
  const n = parseInt(key.slice(1), 16)
  const [h, s, l, chroma] = toHsl((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
  // Violet hues with real colour in them; the greys that lean blue (hardly any chroma or saturation) are not in the family.
  const out = h >= 235 && h <= 300 && chroma >= 0.03 && s >= 0.15 ? fromHsl(HUES[current], Math.min(1, s * (current === 'rose' ? 0.9 : 0.75)), l > 0.5 ? Math.max(0.5, l - (current === 'rose' ? 0.08 : 0.19)) : l) : hex
  memo.set(key, out)
  return out
}

// A cherry-blossom petal, and the fall it makes: each sparkle of the art becomes a petal at the same place, falling slowly
// and turning as it goes. The drawing's own CSS animates sparkles in place; the petals bring their own.
const PETAL = 'M0 -2.2C1.7 -1.7 1.9 0.9 0 2.2C-1.9 0.9 -1.7 -1.7 0 -2.2Z'
const PETAL_CSS = '.pt{fill:#ffb3cf;opacity:0;animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes fall{0%{opacity:0;transform:translate(0,-4px) rotate(0deg)}12%{opacity:.6}85%{opacity:.5}100%{opacity:0;transform:translate(-16px,34px) rotate(280deg)}}'
function petals(text: string): string {
  if (!text.includes('class="sp"')) return text
  return text
    .replace(/<path class="sp" style="transform-origin:([\d.]+)px [\d.]+px;animation-duration:([\d.]+)s;animation-delay:([\d.]+)s" d="[^"]*"\/>/g, (_m, x: string, dur: string, delay: string) =>
      `<g transform="translate(${x} 0)"><path class="pt" style="animation-duration:${(Number(dur) * 2.2).toFixed(1)}s;animation-delay:${delay}s" d="${PETAL}"/></g>`)
    .replace('</style>', `${PETAL_CSS}</style>`)
}

/**
 * One hex turned for a light app. A surface that was dark comes out pale. Text that was light comes out deep, as light as
 * it can be while still reading on the pale surfaces (4.6:1), so violet stays violet and green stays green; text that was
 * already dark is only darkened if it would not read. Drawn art has no role, so it follows its own lightness. An
 * eight-digit hex keeps its alpha.
 */
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16)
  const f = (v: number) => (v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
// The palest and the deepest of the turned surfaces: text has to read on both.
const PALE_REF = luminance('#e3e0ed')
export function lightHex(hex: string, role: 'text' | 'surface' | 'art' = 'art'): string {
  const key = hex.toLowerCase()
  const memoKey = role + key
  const hit = lmemo.get(memoKey)
  if (hit) return hit
  const n = parseInt(key.slice(1, 7), 16)
  const [h, s, l] = toHsl((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
  const asText = role === 'text' || (role === 'art' && l >= 0.5)
  let out: string
  if (asText) {
    const sat = Math.min(s, 0.72)
    // Greys keep their order (main text darker than dim); strong colours start a little lighter so they stay colours.
    let at = l >= 0.5 ? Math.max(0.12, Math.min(0.5, 1 - l + (s >= 0.35 ? 0.2 : 0))) : l
    out = fromHsl(h, sat, at)
    while (at > 0.12 && (PALE_REF + 0.05) / (luminance(out) + 0.05) < 4.6) {
      at -= 0.01
      out = fromHsl(h, sat, at)
    }
  } else {
    // Near white like the app's own light panels: the darkest surfaces (the panel itself) come out lightest, and the
    // lighter ones (hover, edges, header) a step darker, as they were a step lighter on dark.
    // A tinted surface (an alert band, the brand panel) keeps more of its colour, so cold still reads blue and swamp green.
    const top = s >= 0.2 ? 0.955 : 0.99
    out = l >= 0.5 ? key.slice(0, 7) : fromHsl(h, Math.min(s, s >= 0.2 ? 0.6 : 0.35), Math.max(0.8, Math.min(top, top - (l - 0.07) * 0.9)))
  }
  const result = key.length === 9 ? out + key.slice(7) : out
  lmemo.set(memoKey, result)
  return result
}
const lightRe = /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?(?![0-9a-fA-F])/g

/** Every hex in a string (an SVG, a style) in the current theme. */
export function tint(text: string): string {
  if (current === 'violet' && !light) return text
  const turned = current === 'violet' ? text : text.replace(hexRe, tintHex)
  // Petals only where the art was violet and has turned pink: the green, yellow, blue and red cards keep their sparkles.
  const drawn = current === 'rose' && turned !== text ? petals(turned) : turned
  if (!light) return drawn
  // A shape marked data-keep (a switch's knob) keeps its colour: it sits on a colour of its own, not on the panel.
  return drawn.replace(/(<[^>]*>)|([^<]+)/g, (part: string, tag?: string) =>
    tag && tag.includes('data-keep') ? part : part.replace(lightRe, hex => lightHex(hex)))
}

/** The accent as text colour. */
export const accent = () => tintHex(VIOLET)

type Component = (props: Record<string, unknown>) => unknown
const wrapped = new WeakMap<object, Component>()

/** The Svg element that draws its source in the theme. In violet it is the app's own, untouched. */
export function themedSvg<T>(Svg: T): T {
  if ((current === 'violet' && !light) || typeof Svg !== 'function') return Svg
  let wrap = wrapped.get(Svg as object)
  if (!wrap) {
    const inner = Svg as unknown as Component
    wrap = props => inner(typeof props.source === 'string' ? { ...props, source: tint(props.source) } : props)
    wrapped.set(Svg as object, wrap)
  }
  return wrap as unknown as T
}

const PAINT = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']
const paint = (v: unknown, role: 'text' | 'surface') => (typeof v === 'string' && /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(v) ? lightHex(v, role) : v)
/** A props object with its hex colours (and those of its hover) turned for a light app. */
export function lightProps(props: Record<string, unknown>): Record<string, unknown> {
  let out = props
  for (const k of PAINT) {
    const turned = paint(props[k], k === 'color' ? 'text' : 'surface')
    if (turned !== props[k]) out = { ...out, [k]: turned }
  }
  const hover = props.hover
  if (hover && typeof hover === 'object') out = { ...out, hover: lightProps(hover as Record<string, unknown>) }
  return out
}
const lightWrapped = new WeakMap<object, Component>()
const lit = (Part: unknown): unknown => {
  if (typeof Part !== 'function') return Part
  let wrap = lightWrapped.get(Part as object)
  if (!wrap) {
    const inner = Part as unknown as Component
    wrap = props => inner(props && typeof props === 'object' ? lightProps(props) : props)
    lightWrapped.set(Part as object, wrap)
  }
  return wrap
}

/** The parts `$.ui.resolve` hands over, with the Svg in the theme and, in a light app, the Box, Text and Button turned light. Absent stays absent. */
export function themedEls<T extends object>(els: T): T {
  const out: Record<string, unknown> = { ...els }
  if ('Svg' in els) out.Svg = themedSvg((els as { Svg: unknown }).Svg)
  if (light) for (const part of ['Box', 'Text', 'Button']) if (part in els) out[part] = lit((els as Record<string, unknown>)[part])
  return out as T
}
