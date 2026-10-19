// The plugin re-checks every downloaded community scene with the same rules the market Worker runs. The plugin
// ships on its own, so it carries a copy of market/rules.mjs: this writes it. `--check` only reports a stale copy.
// Run: node scripts/sync-market-rules.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const source = readFileSync(new URL('market/rules.mjs', root), 'utf8')
const target = new URL('plugin/hooks/market-rules.ts', root)
const copy = `// @ts-nocheck\n// A copy of market/rules.mjs, written by scripts/sync-market-rules.mjs. Edit that file, not this one.\n${source}`
let current = ''
try { current = readFileSync(target, 'utf8') } catch {}
// Git may check either file out with CRLF line ends; only the text counts.
const text = s => s.replace(/\r\n/g, '\n')
if (process.argv.includes('--check')) {
  if (text(current) !== text(copy)) { console.error('plugin/hooks/market-rules.ts is out of date: run node scripts/sync-market-rules.mjs'); process.exit(1) }
  console.log('market rules in sync')
} else {
  writeFileSync(target, copy)
  console.log('wrote plugin/hooks/market-rules.ts')
}
