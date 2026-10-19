// Grades the runs bench/helpers/run.sh made: cost, whether each answer is right, and the effort each helper got.
const fs = require('fs'), path = require('path'), cp = require('child_process')
const B = process.env.EFFORTLESS_BENCH_DIR || path.join(process.env.TEMP || '/tmp', 'effbench')
const pristine = f => fs.readFileSync(path.join(B, 'pristine', f), 'utf8')
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (['node_modules', '.git', '.claude'].includes(e.name) ? [] : walk(path.join(d, e.name), base))
    : [path.relative(base, path.join(d, e.name)).replace(/\\/g, '/')])
const pristineFiles = new Set(walk(path.join(B, 'pristine')))
const changed = dir => walk(dir).filter(f => !pristineFiles.has(f) || fs.readFileSync(path.join(dir, f), 'utf8') !== pristine(f))
const trueTests = (pristine('tests/effortless.test.ts').match(/(^|[^.\w])test\(/gm) || []).length
const trueHooks = fs.readdirSync(path.join(B, 'pristine', 'hooks')).filter(f => /\.tsx?$/.test(f)).length
const rows = []
for (const f of fs.readdirSync(path.join(B, 'r')).filter(f => f.startsWith('hb-') && f.endsWith('.json'))) {
  const tag = f.replace('.json', '')
  const [, model, eff, task, cond, rep] = tag.split('-')
  let j
  try { j = JSON.parse(fs.readFileSync(path.join(B, 'r', f), 'utf8')) } catch { rows.push({ tag, model, eff, task, cond, rep, error: 'no result' }); continue }
  const dir = path.join(B, 'w', tag)
  const ch = changed(dir)
  const text = String(j.result || '')
  let ok = false, why = ''
  if (task === 's1') { ok = ch.length === 0 && /COLD_MIN_TOKENS/.test(text) && /SWAMP_TOKENS/.test(text); why = ch.length ? 'changed files' : ok ? '' : 'missed a constant' }
  if (task === 's2') { ok = ch.length === 0 && new RegExp('\\b' + trueTests + '\\b').test(text); why = ok ? '' : `truth ${trueTests}` }
  if (task === 's3') {
    const need = [/runUpdate/, /syncRunningCopy|syncPlan/, /reload-plugins|RELOAD_ARGS|--force/]
    const missing = need.filter(r => !r.test(text)).map(String)
    ok = ch.length === 0 && missing.length === 0
    why = ch.length ? 'changed files' : missing.length ? 'missing ' + missing.join(' ') : ''
  }
  if (task === 's4') {
    let out = ''
    try { out = cp.execFileSync('node', ['tools/count-hooks.mjs'], { cwd: dir, encoding: 'utf8', timeout: 20000 }) } catch { out = 'ERR' }
    const n = (out.match(/\d+/) || [])[0]
    ok = Number(n) === trueHooks && new RegExp('\\b' + trueHooks + '\\b').test(text)
    why = ok ? '' : `script says ${n ?? out.slice(0, 40)}, truth ${trueHooks}`
  }
  let log = ''
  try { log = fs.readFileSync(path.join(B, 'r', tag + '.proof.log'), 'utf8') } catch {}
  const helpers = [...log.matchAll(/helper \S+ "[^"]*": (\w+)/g)].map(m => m[1])
  const sub = Object.entries(j.modelUsage || {}).map(([m, u]) => `${m.replace('claude-', '')} $${(u.costUSD || 0).toFixed(3)}`).join(', ')
  rows.push({ tag, model, eff, task, cond, rep, ok, why, helpers, cost: j.total_cost_usd, turns: j.num_turns, ms: j.duration_ms, sub })
}
fs.writeFileSync(path.join(B, 'helpers-scored.json'), JSON.stringify(rows, null, 1))
const sum = (a, k) => a.reduce((t, r) => t + (r[k] || 0), 0)
const good = rows.filter(r => !r.error)
const label = { off: 'Helpers off (app effort)', on: 'Helpers on (judge picks)' }
for (const key of [...new Set(good.map(r => r.model + ' at ' + r.eff))]) {
  const mine = good.filter(r => r.model + ' at ' + r.eff === key)
  console.log('\n### ' + key)
  console.log('| Setup | Runs | Correct | Total cost | Avg cost/task | Avg time |')
  console.log('| --- | --- | --- | --- | --- | --- |')
  for (const c of ['off', 'on']) {
    const a = mine.filter(r => r.cond === c)
    if (a.length) console.log(`| ${label[c]} | ${a.length} | ${a.filter(r => r.ok).length} | $${sum(a, 'cost').toFixed(2)} | $${(sum(a, 'cost') / a.length).toFixed(3)} | ${(sum(a, 'ms') / a.length / 1000).toFixed(0)} s |`)
  }
  // Per task, so one expensive task does not hide the rest.
  console.log('\n| Task | Off avg | On avg | Change |')
  console.log('| --- | --- | --- | --- |')
  for (const t of [...new Set(mine.map(r => r.task))].sort()) {
    const off = mine.filter(r => r.task === t && r.cond === 'off'), on = mine.filter(r => r.task === t && r.cond === 'on')
    if (!off.length || !on.length) continue
    const a = sum(off, 'cost') / off.length, b = sum(on, 'cost') / on.length
    console.log(`| ${t} | $${a.toFixed(3)} | $${b.toFixed(3)} | ${((b / a - 1) * 100).toFixed(0)}% |`)
  }
  const off = mine.filter(r => r.cond === 'off'), on = mine.filter(r => r.cond === 'on')
  if (off.length && on.length) console.log(`\nHelpers on vs off: ${(100 * (1 - (sum(on, 'cost') / on.length) / (sum(off, 'cost') / off.length))).toFixed(0)}% cheaper per task`)
  const picks = {}; for (const r of on) for (const e of r.helpers) picks[e] = (picks[e] || 0) + 1
  console.log('effort the judge gave helpers (counts): ' + JSON.stringify(picks))
}
console.log('\nFailures:')
for (const r of rows.filter(r => r.error || !r.ok)) console.log('- ' + r.tag + ': ' + (r.error || r.why))
