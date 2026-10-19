// Writes every quote of the quotes set as its own SVG, for the website and for review: the plugin draws them when
// shown, so these files never ship in the plugin. Usage: node --experimental-strip-types scripts/quote-previews.mjs <dir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { register } from 'node:module'
import { join } from 'node:path'

// The plugin imports its own modules without an extension ('./quill-data'); Node needs the .ts, so add it.
register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, next) { try { return await next(s, c) } catch (e) {' +
  ' if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return next(s + ".ts", c); throw e } }'))

const { quoteCard } = await import('../plugin/hooks/quill.ts')
const { QUOTES } = await import('../plugin/hooks/quotes-list.ts')
const out = process.argv[2]
if (!out) throw new Error('usage: quote-previews.mjs <out dir>')
mkdirSync(out, { recursive: true })
for (const [id, text, author] of QUOTES) writeFileSync(join(out, `${id}.svg`), quoteCard(text, author))
console.log(`${QUOTES.length} quotes written to ${out}`)
