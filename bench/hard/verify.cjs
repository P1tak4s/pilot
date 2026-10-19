// Checks every planted bug against this repo's HEAD, in throwaway copies; no model is called, nothing in the repo changes.
// For each task: the find snippet occurs exactly once, the test suite fails with the bug in, and passes without it.
// Usage: node bench/hard/verify.cjs [tasks file] [--write] [--jobs N]
//   --write  stores each task's failing test names in tasks.json ("fails"; only for you, run.sh never shows them).
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os')
const REPO = path.resolve(__dirname, '../..')
const args = process.argv.slice(2)
const write = args.includes('--write')
const jobsAt = args.indexOf('--jobs')
const JOBS = jobsAt >= 0 ? Number(args[jobsAt + 1]) : 4
const file = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--jobs') || path.join(__dirname, 'tasks.json'))
const tasks = file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : require(file)
const B = path.join(process.env.TEMP || os.tmpdir(), 'effbench-hard-verify')
fs.rmSync(B, { recursive: true, force: true })
fs.mkdirSync(path.join(B, 'pristine'), { recursive: true })
cp.execFileSync('git', ['-C', REPO, 'archive', 'HEAD', '-o', path.join(B, 'src.tar')])
try { cp.execFileSync('tar', ['--force-local', '-xf', '../src.tar'], { cwd: path.join(B, 'pristine') }) }
catch { cp.execFileSync('tar', ['-xf', '../src.tar'], { cwd: path.join(B, 'pristine') }) }

/** Runs the suite in dir: { pass, fail, failed: [test names] }. Local and free: `claude plugin test` calls no model. */
function suite(dir) {
  return new Promise(resolve => {
    const child = cp.spawn('claude plugin test .', { cwd: dir, shell: true, env: { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '1' } })
    let out = ''
    child.stdout.on('data', d => (out += d))
    child.stderr.on('data', d => (out += d))
    child.on('close', () => {
      const n = re => Number((out.match(re) || [])[1] ?? NaN)
      const failed = [...out.matchAll(/^\(fail\) (.+?)(?: \[[\d.]+m?s\])?\s*$/gm)].map(m => m[1].trim())
      resolve({ pass: n(/^\s*(\d+) pass/m), fail: n(/^\s*(\d+) fail/m), failed, out })
    })
  })
}

async function check(t) {
  const src = fs.readFileSync(path.join(B, 'pristine', t.file), 'utf8')
  const count = src.split(t.find).length - 1
  if (count !== 1) return { id: t.id, ok: false, why: `find occurs ${count} times` }
  const dir = path.join(B, t.id)
  fs.cpSync(path.join(B, 'pristine'), dir, { recursive: true })
  fs.writeFileSync(path.join(dir, t.file), src.replace(t.find, () => t.replace))
  const r = await suite(dir)
  const ok = r.fail > 0 && r.failed.length > 0
  if (!ok) fs.writeFileSync(path.join(B, t.id + '.out.txt'), r.out)
  return { id: t.id, ok, why: ok ? '' : `bug not caught (pass ${r.pass}, fail ${r.fail})`, fail: r.fail, failed: r.failed }
}

;(async () => {
  const base = await suite(path.join(B, 'pristine'))
  console.log(`pristine HEAD: ${base.pass} pass, ${base.fail} fail`)
  if (!(base.fail === 0 && base.pass > 0)) { console.log(base.out.slice(-2000)); process.exit(1) }
  const results = []
  let next = 0
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (next < tasks.length) {
      const t = tasks[next++]
      const r = await check(t)
      results.push(r)
      console.log(`${r.ok ? 'ok  ' : 'BAD '} ${t.id}${r.why ? ': ' + r.why : ''}${r.ok ? `: ${r.fail} fail` : ''}`)
      for (const f of r.failed || []) console.log(`       ${f}`)
    }
  }))
  if (write && file.endsWith('.json')) {
    for (const t of tasks) t.fails = (results.find(r => r.id === t.id) || {}).failed || []
    fs.writeFileSync(file, JSON.stringify(tasks, null, 2) + '\n')
    console.log('wrote fails to ' + file)
  }
  process.exit(results.every(r => r.ok) ? 0 : 1)
})()
