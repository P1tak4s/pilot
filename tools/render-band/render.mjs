#!/usr/bin/env node
// Render rig for the effortless dashboard band, as the Claude desktop app (Code tab) draws it above the prompt.
//
//   node tools/render-band/render.mjs --percent 45 --width 768 --glow
//
// 1. Runs the real mod (hooks/register.tsx) in a temporary copy under `claude plugin test`, drives it into the asked
//    state and dumps the element tree it returns for the desktop band.
// 2. Writes a page that draws that tree with the installed desktop app's own renderer chunk and stylesheets
//    (see page.js), at the app's density, theme and zoom.
// 3. Opens it in headless Chrome at the app's zoom (as the device scale factor) and saves a PNG of the band plus a
//    JSON of measured boxes (CSS px).
//
// Nothing in hooks/ is changed. --glow flips HANDOFF_GLOW in the temporary copy only.
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')

// --- Arguments -------------------------------------------------------------------------------------------------------
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 || i + 1 >= argv.length ? fallback : argv[i + 1]
}
if (flag('help')) {
  console.log(readFileSync(join(HERE, 'README.md'), 'utf8'))
  process.exit(0)
}
const params = {
  percent: Number(opt('percent', '19')),
  cacheMinutes: opt('cache', '59') === 'off' ? null : Number(opt('cache', '59')),
  effort: opt('effort', 'medium'),
  reason: opt('reason', 'a small fix in one file'),
  model: opt('model', 'opus'),
  handoff: opt('handoff', '') || '',
  judged: !flag('fresh'),
  judging: flag('judging'),
  working: flag('working'),
  auto: opt('auto', 'on') !== 'off',
  bodyColumns: Number(opt('columns', '100')),
  press: (opt('press', '') || '').split(',').filter(Boolean),
  command: opt('command', '') || '',
  trace: Number(opt('trace', '0')),
  options: Object.fromEntries((opt('options', '') || '').split(',').filter(Boolean).map((kv) => kv.split('='))),
}
const width = Number(opt('width', '768')) // CSS px of the band slot (the composer column; 768 at a wide window)
const zoom = opt('zoom', 'app') === 'app' ? appZoom() : Number(opt('zoom'))
const mode = opt('mode', 'dark')
// The Code tab's CDS provider sets data-density on its own root (compact unless the person or a touch screen asks
// for comfortable; index.html's comfortable is only the boot page). 152.png/157.png match compact.
const density = opt('density', 'compact')
const glow = flag('glow')
const out = resolve(opt('out', join(HERE, 'out', `band-${params.percent}-${width}${glow ? '-glow' : ''}.html`)))
const serveOnly = flag('serve')
const treeFile = opt('tree', null)

// --- The installed app ------------------------------------------------------------------------------------------------
const ionDist = resolve(opt('app', '') || findApp())
const assets = join(ionDist, 'assets', 'v1')
const indexHtml = readFileSync(join(ionDist, 'index.html'), 'utf8')
const stylesheets = [...indexHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1])
const inlineStyles = [...indexHtml.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
  .filter((m) => !m[1].includes('static-composer'))
  .map((m) => m[2])
const chunks = readdirSync(assets).filter((f) => f.endsWith('.js'))
const renderer = chunks.find((f) => {
  const s = readFileSync(join(assets, f), 'utf8')
  return s.includes('data-press-cue') && s.includes('--engine-band-line') && s.includes('data-engine-tree')
})
if (!renderer) fail('could not find the renderer chunk (data-press-cue / --engine-band-line) in ' + assets)
const rendererSource = readFileSync(join(assets, renderer), 'utf8')
// The three imports the renderer's draw path really uses; everything else it imports is stubbed in the page.
const importsOf = [...rendererSource.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/([^"]+)"/g)].flatMap((m) =>
  m[1].split(',').map((p) => {
    const [name, local] = p.trim().split(/\s+as\s+/)
    return { name, local: local ?? name, file: m[2] }
  }),
)
const definitionOf = (file, exported) => {
  const s = readFileSync(join(assets, file), 'utf8')
  const ex = s.slice(s.lastIndexOf('export{'))
  const esc = (x) => x.replace(/[$]/g, '\\$')
  const m = new RegExp('([\\w$]+) as ' + esc(exported) + '[,}]').exec(ex) ?? new RegExp('[{,]' + esc(exported) + '[,}]').exec(ex)
  if (!m) return ''
  const local = m[1] ?? exported
  const d = new RegExp('(function ' + esc(local) + '\\(|[,; ]' + esc(local) + '=)').exec(s)
  return d ? s.slice(d.index, d.index + 300) : ''
}
const keyOf = (i) => `${i.file.replace(/-[\w-]{8}\.js$/, '')}:${i.name}`
const sourceOf = (i) => readFileSync(join(assets, i.file), 'utf8')
const tokensImport = importsOf.find((i) => sourceOf(i).startsWith('var e={radius:{cssVar:'))
const purifyImport = importsOf.find((i) => i.name === 't' && sourceOf(i).includes('DOMPurify') && /export\{\w+ as t\};?\s*$/.test(sourceOf(i)))
const windowImport = importsOf.find((i) => /^function \w+\(e\)\{return e\?\(\w+\(e\)\?e:e\.ownerDocument\)\?\.defaultView\?\?null:null\}/.test(definitionOf(i.file, i.name)))
const elementImport = importsOf.find((i) => /^function \w+\(e\)\{return e\?\.nodeType===1\?e:null\}/.test(definitionOf(i.file, i.name)))
if (!tokensImport || !windowImport || !elementImport)
  fail(`renderer imports changed: tokens ${!!tokensImport}, ownerWindow ${!!windowImport}, asElement ${!!elementImport}`)
const names = rendererNames(rendererSource)

// --- 1. The tree, from the real mod -------------------------------------------------------------------------------------
const dumped = treeFile ? JSON.parse(readFileSync(treeFile, 'utf8')) : dumpTree()
// --at <seconds>: hold every CSS animation inside the Svg leaves (the glow's pulse, the thinking dots) at that moment,
// so a screenshot is repeatable. Without it they run, and the shot lands wherever the pulse is.
const at = opt('at', null)
const trace = dumped.trace ?? null
const tree = trace ? trace[0].tree : at === null ? dumped : freeze(dumped, Number(at))

// --- 2. The page --------------------------------------------------------------------------------------------------------
mkdirSync(dirname(out), { recursive: true })
const rig = {
  tree,
  rendererUrl: `/assets/v1/${renderer}`,
  realModules: [tokensImport, purifyImport].filter(Boolean).map((i) => ({ key: keyOf(i), url: `/assets/v1/${i.file}`, export: i.name })),
  matchZoom: serveOnly ? zoom : 0,
  windowImport: keyOf(windowImport),
  elementImport: keyOf(elementImport),
  names,
  hit: (opt('hit', '') || '').split(',').filter(Boolean),
  used: [],
  trace,
}
const page = `<!doctype html>
<html lang="en" data-theme="claude" data-mode="${mode}" data-density="comfortable" data-color-version="v2" class="cds-root antialiased">
<head>
<meta charset="utf-8">
<title>effortless band render</title>
${stylesheets.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
${inlineStyles.map((s) => `<style>${s}</style>`).join('\n')}
<style>
  /* The rig's own frame: the page around the band slot. Everything inside [data-rig-band] is the app's. */
  body { margin: 0; padding: 16px; }
  [data-rig-frame] { width: ${width}px; }
</style>
</head>
<body class="bg-surface-1 text-primary font-sans">
<!-- The CDS provider root the Code tab renders inside (Ha in shared-frame-*.js). -->
<div class="cds-root text-primary" data-density="${density}" data-mode="${mode}" data-platform="desktop" data-font="anthropic" style="font-size:var(--cds-font-size-body)">
<div data-rig-frame>
  <!-- The AbovePrompt site as the app's React component (zm in ${renderer}) builds it: the band's wrapper classes
       (cn(bandRow(), "items-start py-[calc((40px-1lh)/2)]", ...) after tailwind-merge), the engine site, the drawn host. -->
  <div data-rig-band class="min-h-0 min-w-0 text-body text-primary gap-[5px] w-full min-h-[40px] p-[8px] rounded-[10px] bg-alpha-1 items-start py-[calc((40px-1lh)/2)] pointer-events-none block max-h-[calc(11lh+40px)] [&>[data-engine-site]]:[scrollbar-width:none] [&>[data-engine-site]]:box-content [&>[data-engine-site]]:-my-[calc((40px-1lh)/2)] [&>[data-engine-site]]:py-[calc((40px-1lh)/2)] [&>[data-engine-site]]:scroll-py-[calc((40px-1lh)/2)] [&>[data-engine-site]]:-mx-[8px] [&>[data-engine-site]]:px-[8px] [&>[data-engine-site]]:pointer-events-none [&>[data-engine-site]>*]:pointer-events-auto">
    <div tabindex="-1" data-engine-site="AbovePrompt" data-engine-site-instance="above-prompt" data-engine-site-drawn="true" class="pointer-events-auto isolate -mx-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-1 outline-none [contain:paint] [scrollbar-gutter:stable]">
      <div style="display:block;min-width:0">
        <div data-plugin-drawn="AbovePrompt" class="[contain:none]"></div>
      </div>
    </div>
  </div>
</div>
</div>
<script>window.RIG = ${JSON.stringify(rig).replace(/</g, '\\u003c')}</script>
<script src="/rig/page.js"></script>
</body>
</html>
`
writeFileSync(out, page)
writeFileSync(out.replace(/\.html$/, '.tree.json'), JSON.stringify(tree, null, 1))

// --- 3. Serve and shoot -------------------------------------------------------------------------------------------------
const server = await serve()
const url = `http://127.0.0.1:${server.address().port}/out/${encodeURIComponent(out.split(/[\\/]/).pop())}`
if (serveOnly) {
  console.log(`serving ${url}  (zoom the browser to ${zoom.toFixed(4)} to match the app; Ctrl+C to stop)`)
} else {
  const png = out.replace(/\.html$/, '.png')
  const shot = await screenshot(url, png)
  writeFileSync(out.replace(/\.html$/, '.measure.json'), JSON.stringify({ zoom, width, params, glow, renderer, ...shot.measure }, null, 1))
  console.log(`renderer  ${renderer} (${ionDist})`)
  console.log(`state     ${JSON.stringify({ ...params, glow })}`)
  console.log(`page      ${out}`)
  console.log(`png       ${png}  (${shot.size}, zoom ${zoom.toFixed(4)})`)
  const { hit, ...boxes } = shot.measure
  console.log(`measure   ${JSON.stringify(boxes)}`)
  if (hit) console.log(hitTable(hit))
  server.close()
}

// ======================================================================================================================

function freeze(node, seconds) {
  if (typeof node !== 'object' || node === null) return node
  const hold = `<style>*{animation-delay:-${seconds}s !important;animation-play-state:paused !important}</style>`
  const props = node.type === 'Svg' && typeof node.props?.source === 'string'
    ? {
        ...node.props,
        // An element's own delay (a frame of the countdown starts at its second) is kept, shifted by the held time: an
        // inline !important beats the stylesheet's.
        // The element delays are shifted first, then the hold is put in: shifting after would rewrite the hold's own.
        source: node.props.source
          .replace(/animation-delay:\s*(-?[\d.]+)s/g, (_m, d) => `animation-delay:${(Number(d) - seconds).toFixed(3)}s !important`)
          .replace(/(<svg\s[^>]*>)/, (m) => m + hold),
      }
    : node.props
  return { ...node, props, ...(node.children ? { children: node.children.map((c) => freeze(c, seconds)) } : {}) }
}

/** The redraws of a --trace run, in order: each RIG-STEP line (time, act, tree) with the RIG-RENDER lines before it. */
function traceOf(text) {
  const steps = []
  let renders = 0
  for (const line of text.split(/\r?\n/)) {
    if (line.includes('RIG-RENDER')) renders++
    const i = line.indexOf('RIG-STEP ')
    if (i !== -1) {
      steps.push({ renders, ...JSON.parse(line.slice(i + 'RIG-STEP '.length)) })
      renders = 0
    }
  }
  if (!steps.length) fail(`--trace: the mod logged no steps:\n${text.slice(-3000)}`)
  return steps
}

/**
 * The local names of the renderer's own functions that the page calls. The bundler renames them on every app build
 * (shapeTree was `hh`, then `Mm`), so each is found by what it does: a string, a property name or a shape that only
 * that function has. A miss, or two candidates, stops the run and names the function that moved.
 */
function rendererNames(src) {
  const id = '[\\w$]+'
  const esc = (x) => x.replace(/[$]/g, '\\$')
  const names = {}
  const find = (role, what, pattern, group = 1) => {
    const hits = new Set([...src.matchAll(new RegExp(pattern, 'g'))].map((m) => m[group]))
    if (hits.size !== 1)
      fail(`renderer chunk changed: ${hits.size ? `${hits.size} candidates (${[...hits].join(', ')})` : 'not found'} for ${role}, ${what}`)
    names[role] = [...hits][0]
  }
  // The AbovePrompt site hands the band's tree shaper and surface CSS to the shared site component as named props.
  find('shapeTree', "the band's tree shaper (the AbovePrompt site's default shapeTree)",
    `component:"AbovePrompt"[^}]*?shapeTree:(?:${id}\\.shapeTree\\?\\?)?(${id})`)
  find('surfaceCss', "the band's surface CSS (the AbovePrompt site's surfaceCss, which sets --engine-band-line)",
    `component:"AbovePrompt"[^}]*?surfaceCss:(${id})`)
  // Opens the host's shadow root once and puts the engine CSS plus the site's CSS in a <style> as its first child.
  find('attachRoot', 'the shadow-root setup (if (host.shadowRoot) return it; else attachShadow and add the engine CSS)',
    `function (${id})\\((${id}),${id}\\)\\{if\\(\\2\\.shadowRoot\\)return \\2\\.shadowRoot;let ${id}=\\2\\.attachShadow\\(`)
  // A fresh collector for what one draw leaves behind: the image leaves, the hover rules, the groups.
  find('newMarks', 'the marks collector (() => ({leaves: [], hoverRules: [], ...}))', `(${id})=\\(\\)=>\\(\\{leaves:\\[\\],hoverRules:\\[\\]`)
  // The element renderer takes the marks collector's result as a default parameter, after the colour resolver.
  find('buildTree', 'the element renderer (tree, handlers, colorOf = ..., marks = newMarks(), ...)',
    `function (${id})\\(${id},${id},${id}=${id},${id}=${esc(names.newMarks)}\\(\\)`)
  find('colorOf', "the colour resolver (the element renderer's default colorOf)",
    `function ${esc(names.buildTree)}\\(${id},${id},${id}=(${id}),`)
  // Where the shared site draws, the ink (the host's computed colour and font) comes from a helper called on the host.
  find('inkOf', "the host's ink (the argument the site passes the element renderer before liftsHoverCards)",
    `${esc(names.buildTree)}\\(${id},${id}\\.handlers,${id},${id},(${id})\\(${id}\\),${id}\\.liftsHoverCards`)
  // Writes the collected hover rules into one <style>, wrapped in @media (hover:hover).
  find('applyHover', 'the hover-rule writer (one <style> with @media (hover:hover){...})',
    `function (${id})\\((${id}),(${id})\\)\\{let ${id}=\\3\\.length===0\\?"":\`@media \\(hover:hover\\)\\{`)
  return names
}

/** --hit results as text: per key, its box and its buttons' boxes, then a grid of the button key each point hits. */
function hitTable(results) {
  const b = (r) => (r ? `x ${r.x} y ${r.y} w ${r.w} h ${r.h}` : 'clipped away')
  const lines = []
  for (const r of results) {
    lines.push('', `hit ${r.key}${r.kind ? ` (${r.kind})` : ''}`)
    if (r.error) {
      lines.push(`  ${r.error}`)
      continue
    }
    lines.push(`  box      ${b(r.box)}`, `  visible  ${b(r.visible)}`)
    for (const btn of r.buttons) lines.push(`  button   ${btn.key}: ${b(btn.box)}; visible ${b(btn.visible)}`)
    const head = ['', ...r.rows[0].hits.map((h) => `${h.x} (${h.at[0]})`)]
    const grid = [head, ...r.rows.map((row) => [`${row.y} (${row.hits[0].at[1]})`, ...row.hits.map((h) => h.hit)])]
    const widths = head.map((_, i) => Math.max(...grid.map((g) => g[i].length)))
    for (const g of grid) lines.push('  ' + g.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd())
  }
  return lines.join('\n').replace(/^\n/, '')
}

function fail(message) {
  console.error(`render-band: ${message}`)
  process.exit(1)
}

function findApp() {
  try {
    const loc = execFileSync('powershell', ['-NoProfile', '-Command', '(Get-AppxPackage -Name Claude).InstallLocation'], { encoding: 'utf8' }).trim()
    const dir = join(loc.split(/\r?\n/).pop(), 'app', 'resources', 'ion-dist')
    if (existsSync(join(dir, 'index.html'))) return dir
  } catch {}
  fail('could not find the Claude desktop app; pass --app <...>/app/resources/ion-dist')
}

/** The app's page zoom: Chromium stores it per host as a level, factor 1.2^level. */
function appZoom() {
  const prefs = join(process.env.LOCALAPPDATA ?? '', 'Packages', 'Claude_pzs8sxrjxfjjc', 'LocalCache', 'Roaming', 'Claude', 'Preferences')
  const other = join(process.env.APPDATA ?? '', 'Claude', 'Preferences')
  for (const p of [prefs, other]) {
    try {
      const levels = JSON.parse(readFileSync(p, 'utf8')).partition?.per_host_zoom_levels ?? {}
      for (const hosts of Object.values(levels)) if (typeof hosts['claude.ai'] === 'number') return 1.2 ** hosts['claude.ai']
    } catch {}
  }
  return 1
}

function dumpTree() {
  const work = mkdtempSync(join(tmpdir(), 'effortless-render-'))
  try {
    for (const part of ['.claude-plugin', 'hooks', 'commands', 'sounds', 'types', 'tsconfig.json'])
      if (existsSync(join(REPO, part))) cpSync(join(REPO, part), join(work, part), { recursive: true })
    if (glow) {
      const file = join(work, 'hooks', 'register.tsx')
      const src = readFileSync(file, 'utf8')
      const patched = src.replace(/const HANDOFF_GLOW = false/, 'const HANDOFF_GLOW = true')
      if (patched === src && !/const HANDOFF_GLOW = true/.test(src)) fail('--glow: no HANDOFF_GLOW constant in hooks/register.tsx')
      writeFileSync(file, patched)
    }
    if (params.trace) {
      // Each ui.render of the band says so on stdout, between the template's RIG-STEP lines.
      const file = join(work, 'hooks', 'register.tsx')
      const src = readFileSync(file, 'utf8')
      const patched = src.replace(/(\r?\n\s*)renderCalls\+\+/, "$1renderCalls++$1void $.store.set('__rigRenders', renderCalls)")
      if (patched === src) fail('--trace: no renderCalls++ in the AbovePrompt hook')
      writeFileSync(file, patched)
    }
    mkdirSync(join(work, 'tests'), { recursive: true })
    const test = readFileSync(join(HERE, 'dump.template.ts'), 'utf8').replace('const P: Params = __PARAMS__', () => `const P: Params = ${JSON.stringify(params)}`)
    writeFileSync(join(work, 'tests', 'dump.test.ts'), test)
    // `claude` is a .cmd shim on Windows, so it runs through the shell; the folder is ours (a temp dir), quoted.
    const run = spawnSync(`claude plugin test "${work}"`, {
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '1' },
      maxBuffer: 64 * 1024 * 1024,
    })
    const text = `${run.stdout}\n${run.stderr}`
    if (params.trace) return { trace: traceOf(text) }
    const line = text.split(/\r?\n/).find((l) => l.includes('DUMP-TREE '))
    if (!line) fail(`the mod did not draw a band:\n${text.slice(-3000)}`)
    return JSON.parse(line.slice(line.indexOf('DUMP-TREE ') + 'DUMP-TREE '.length))
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
  const roots = { '/assets/': join(ionDist, 'assets'), '/rig/': HERE, '/out/': dirname(out) }
  const srv = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const prefix = Object.keys(roots).find((p) => path.startsWith(p))
    const file = prefix && resolve(roots[prefix], '.' + path.slice(prefix.length - 1))
    if (!file || !file.startsWith(roots[prefix]) || !existsSync(file)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'access-control-allow-origin': '*' })
    res.end(readFileSync(file))
  })
  return new Promise((ok) => srv.listen(Number(opt('port', '0')), '127.0.0.1', () => ok(srv)))
}

function findChrome() {
  const candidates = [
    opt('chrome', ''),
    join(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.PROGRAMFILES ?? '', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  ]
  const found = candidates.find((c) => c && existsSync(c))
  if (!found) fail('no Chrome or Edge found; pass --chrome <path>')
  return found
}

/** Headless Chrome over the DevTools protocol: the app's zoom as the device scale factor, wait for the page, shoot. */
async function screenshot(pageUrl, png) {
  const profile = mkdtempSync(join(tmpdir(), 'effortless-render-chrome-'))
  const chrome = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' })
  try {
    const portFile = join(profile, 'DevToolsActivePort')
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100)
    const port = readFileSync(portFile, 'utf8').split('\n')[0]
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
    await new Promise((ok, no) => ((ws.onopen = ok), (ws.onerror = no)))
    let id = 0
    const pending = new Map()
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data)
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      }
    }
    const send = (method, params = {}) =>
      new Promise((ok, no) => {
        const n = ++id
        pending.set(n, (msg) => (msg.error ? no(new Error(`${method}: ${msg.error.message}`)) : ok(msg.result)))
        ws.send(JSON.stringify({ id: n, method, params }))
      })
    const viewW = width + 32
    await send('Emulation.setDeviceMetricsOverride', { width: viewW, height: 400, deviceScaleFactor: zoom, mobile: false })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] })
    await send('Page.enable')
    await send('Page.navigate', { url: pageUrl })
    let state = ''
    for (let i = 0; i < 200 && state !== 'ready' && state !== 'error'; i++) {
      await sleep(100)
      state = (await send('Runtime.evaluate', { expression: 'document.documentElement.dataset.rigStatus || ""', returnByValue: true })).result.value
    }
    if (state !== 'ready') {
      const err = (await send('Runtime.evaluate', { expression: 'document.body.innerText.slice(-2000)', returnByValue: true })).result.value
      fail(`the page did not draw (${state || 'timeout'}): ${err}`)
    }
    // --wait S: let S seconds of real time pass before the shot, so animations that run once can be seen at their end.
    await sleep(300 + Number(opt("wait", "0") || 0) * 1000)
    const measure = JSON.parse((await send('Runtime.evaluate', { expression: 'JSON.stringify(RIG_MEASURE)', returnByValue: true })).result.value)
    if (rig.hit.length) {
      const res = await send('Runtime.evaluate', { expression: 'JSON.stringify(RIG_HIT())', returnByValue: true })
      if (res.exceptionDetails) fail(`--hit: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`)
      measure.hit = JSON.parse(res.result.value)
    }
    const rect = JSON.parse(
      (await send('Runtime.evaluate', { expression: 'JSON.stringify(document.querySelector("[data-rig-band]").getBoundingClientRect())', returnByValue: true })).result.value,
    )
    const pad = 12
    const clip = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: rect.width + 2 * pad, height: rect.height + 2 * pad, scale: 1 }
    if (trace) {
      // --trace: start the replay and shoot frames as fast as the browser gives them, each named by its time (ms).
      const frames = png.replace(/\.png$/, '-frames')
      rmSync(frames, { recursive: true, force: true })
      mkdirSync(frames, { recursive: true })
      const end = trace[trace.length - 1].t + 400
      await send('Runtime.evaluate', { expression: 'RIG_PLAY()' })
      const t0 = Date.now()
      for (let n = 0; Date.now() - t0 < end; n++) {
        const t = Date.now() - t0
        const { data } = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true })
        writeFileSync(join(frames, `${String(n).padStart(4, '0')}-${String(t).padStart(5, '0')}.png`), Buffer.from(data, 'base64'))
      }
      console.log(`frames    ${frames}`)
      console.log(`redraws   ${trace.map((s) => `${s.t}ms ${s.label}: ${s.renders}`).filter((l) => !l.endsWith(': 0')).join(', ')}`)
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true })
    writeFileSync(png, Buffer.from(data, 'base64'))
    ws.close()
    return { measure, size: `${Math.round(clip.width * zoom)}x${Math.round(clip.height * zoom)} px` }
  } finally {
    chrome.kill()
    await sleep(300)
    // Chrome can hold its profile a moment after the kill; a leftover temp folder must not hide the run's own result.
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {}
  }
}

function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms))
}
