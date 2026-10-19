// Grades the runs bench/hard/run.sh made. A run solved its bug when tests/ is untouched and the full test suite passes
// in its copy (`claude plugin test`, local, calls no model). Prints a table per setup and a task x setup grid,
// writes hard-scored.json next to the runs.
// Usage: node bench/hard/score.cjs [jobs]   (EFFBENCH_HARD_DIR picks the bench folder, as in run.sh)
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os')
const B = process.env.EFFBENCH_HARD_DIR || path.join(process.env.TEMP || os.tmpdir(), 'effbench-hard')
const JOBS = Number(process.argv[2]) || 4
const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks.json'), 'utf8'))
const walk = (d, base = d) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (['node_modules', '.git', '.claude'].includes(e.name) ? [] : walk(path.join(d, e.name), base))
    : [path.relative(base, path.join(d, e.name)).replace(/\\/g, '/')])
const read = (dir, f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8') } catch { return null } }
const pristineDir = path.join(B, 'pristine')
const pristineFiles = walk(pristineDir)
/** Files the run added, changed or removed, against the pristine copy (the planted bug counts as a change). */
const changed = dir => {
  const now = walk(dir), had = new Set(pristineFiles)
  return [...new Set([...now.filter(f => !had.has(f) || read(dir, f) !== read(pristineDir, f)), ...pristineFiles.filter(f => !now.includes(f))])]
}

/** The full suite in dir: { pass, fail }. NaN counts mean it did not get to the summary. */
function suite(dir) {
  return new Promise(resolve => {
    const child = cp.spawn('claude plugin test .', { cwd: dir, shell: true, env: { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '1' } })
    let out = ''
    child.stdout.on('data', d => (out += d))
    child.stderr.on('data', d => (out += d))
    const timer = setTimeout(() => child.kill(), 300_000)
    child.on('close', () => {
      clearTimeout(timer)
      const n = re => Number((out.match(re) || [])[1] ?? NaN)
      const failed = [...out.matchAll(/^\(fail\) (.+?)(?: \[[\d.]+m?s\])?\s*$/gm)].map(m => m[1].trim())
      resolve({ pass: n(/^\s*(\d+) pass/m), fail: n(/^\s*(\d+) fail/m), failed })
    })
  })
}

async function grade(tag) {
  const [, model, task, cond, rep] = tag.split('-')
  const dir = path.join(B, 'w', tag)
  const row = { tag, model, task, cond, rep: Number(rep), difficulty: (tasks.find(t => t.id === task) || {}).difficulty }
  let j = null
  try { j = JSON.parse(fs.readFileSync(path.join(B, 'r', tag + '.json'), 'utf8')) } catch {}
  if (!j) row.error = 'no result JSON'
  else Object.assign(row, { dry: !!j.dry, cost: Number(j.total_cost_usd) || 0, ms: j.duration_ms || 0, turns: j.num_turns || 0, isError: !!j.is_error })
  if (!fs.existsSync(dir)) return { ...row, solved: false, why: 'no work copy' }
  const ch = changed(dir)
  const t = tasks.find(x => x.id === task)
  const touchedTests = ch.filter(f => f.startsWith('tests/'))
  row.changed = ch
  // The fix put back exactly what HEAD had (line endings aside), or fixed it another way.
  const lf = s => (s ?? '').replace(/\r\n/g, '\n')
  row.exact = t ? lf(read(dir, t.file)) === lf(read(pristineDir, t.file)) : false
  const r = await suite(dir)
  row.pass = r.pass; row.fail = r.fail; row.failed = r.failed
  row.solved = touchedTests.length === 0 && r.fail === 0 && r.pass > 0
  row.why = touchedTests.length ? 'changed tests: ' + touchedTests.join(' ') : row.solved ? '' : Number.isNaN(r.fail) ? 'suite did not run' : r.fail ? `${r.fail} failing: ${r.failed.slice(0, 2).join(' | ')}` : ''
  let log = ''
  try { log = fs.readFileSync(path.join(B, 'r', tag + '.proof.log'), 'utf8') } catch {}
  row.picked = [...new Set([...log.matchAll(/effort \w+ -> (\w+)/g)].map(m => m[1]))].join('/')
  return row
}

;(async () => {
  if (!fs.existsSync(pristineDir)) { console.error(`no ${pristineDir}: run bench/hard/run.sh first`); process.exit(1) }
  const tags = fs.readdirSync(path.join(B, 'w')).filter(f => f.startsWith('hd-')).sort()
  const rows = []
  let next = 0
  await Promise.all(Array.from({ length: JOBS }, async () => { while (next < tags.length) rows.push(await grade(tags[next++])) }))
  rows.sort((a, b) => a.tag.localeCompare(b.tag, 'en', { numeric: true }))
  fs.writeFileSync(path.join(B, 'hard-scored.json'), JSON.stringify(rows, null, 1))

  const label = { m: 'medium, no effortless', h: 'high, no effortless', x: 'xhigh, no effortless', on: 'effortless on (app on medium)' }
  const order = ['m', 'h', 'x', 'on']
  const sum = (a, k) => a.reduce((s, r) => s + (r[k] || 0), 0)
  const money = v => '$' + v.toFixed(v < 1 ? 3 : 2)
  for (const model of [...new Set(rows.map(r => r.model))]) {
    const mine = rows.filter(r => r.model === model && !r.error)
    const conds = order.filter(c => mine.some(r => r.cond === c))
    const ids = tasks.map(t => t.id).filter(id => mine.some(r => r.task === id))
    console.log(`\n### ${model}${mine.some(r => r.dry) ? ' (dry run: no model was called, costs are 0)' : ''}`)
    console.log('| Setup | Runs | Solved | Solved % | Total cost | Avg cost/task | Avg time | Cost per solved |')
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const c of conds) {
      const a = mine.filter(r => r.cond === c), ok = a.filter(r => r.solved).length, cost = sum(a, 'cost')
      console.log(`| ${label[c]} | ${a.length} | ${ok} | ${Math.round((100 * ok) / a.length)}% | ${money(cost)} | ${money(cost / a.length)} | ${(sum(a, 'ms') / a.length / 1000).toFixed(0)} s | ${ok ? money(cost / ok) : 'n/a'} |`)
    }
    console.log(`\n| Task | Difficulty | ${conds.map(c => c).join(' | ')} |`)
    console.log(`| --- | --- | ${conds.map(() => '---').join(' | ')} |`)
    for (const id of ids) {
      const cells = conds.map(c => {
        const a = mine.filter(r => r.task === id && r.cond === c)
        if (!a.length) return ''
        const ok = a.filter(r => r.solved).length
        const mark = a.length === 1 ? (ok ? '✓' : '✗') : `${ok}/${a.length}`
        return `${mark} ${money(sum(a, 'cost') / a.length)}`
      })
      console.log(`| ${id} | ${(tasks.find(t => t.id === id) || {}).difficulty || ''} | ${cells.join(' | ')} |`)
    }
    const solved = mine.filter(r => r.solved)
    if (solved.length) console.log(`\nsolved runs that put back HEAD's code exactly: ${solved.filter(r => r.exact).length} of ${solved.length}`)
    const on = mine.filter(r => r.cond === 'on' && r.picked)
    if (on.length) {
      const picks = {}
      for (const r of on) for (const e of r.picked.split('/')) picks[e] = (picks[e] || 0) + 1
      console.log('\neffort effortless picked (runs): ' + JSON.stringify(picks))
    }
  }
  console.log('\nNot solved:')
  for (const r of rows.filter(r => r.error || !r.solved)) console.log(`- ${r.tag}: ${r.error || r.why}`)
  console.log(`\nwrote ${path.join(B, 'hard-scored.json')}`)
})()
