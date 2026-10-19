// Plants one task's bug in a repo copy and prints the bug report (the prompt's first part). Exits 1 if the snippet is
// not there exactly once, so a run never starts on a copy without its bug.
// Usage: node bench/hard/plant.cjs <task id> <copy dir>
const fs = require('fs'), path = require('path')
const [id, dir] = process.argv.slice(2)
const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks.json'), 'utf8'))
const t = tasks.find(x => x.id === id)
if (!t) { console.error(`no task ${id} in tasks.json`); process.exit(1) }
const f = path.join(dir, t.file)
const src = fs.readFileSync(f, 'utf8')
const count = src.split(t.find).length - 1
if (count !== 1) { console.error(`${id}: snippet occurs ${count} times in ${t.file}`); process.exit(1) }
fs.writeFileSync(f, src.replace(t.find, () => t.replace))
process.stdout.write(t.report)
