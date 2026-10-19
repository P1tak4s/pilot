import type { Register } from 'claude-code'
import { SCENES } from './art'
import { readable, sceneCells } from './terminal-art'
import { bestMoveAsync, CHESS_LEVELS, type ChessLevel } from './chess-engine'
import { describe as describeMove, inCheck, legalMoves, type Move, outcome, type Outcome, parseFen, picture, play, type Position, START, squareName, toFen, uci } from './chess-rules'
import { checkFile } from './market-rules'
import { onceMs, quoteCard, stillCard } from './quill'
import { QUOTES } from './quotes-list'
import { GITHUB_OVER_HTTPS, isNewer, latestRelease, NEW_CHAT, noClaudeHint, pluginDirIn, RELEASES_PATH, RELEASES_URL, RELOAD_ARGS, type Release, SITE_URL, syncPlan, UPDATE_CHECK_MS, UPDATE_LOAD_WAIT_MS, UPDATE_LOADING, UPDATED_CARD_MS, type UpdateCard, updateCardTree, updateFailure, updateSnoozed, claudeCandidates } from './update'

// textless: once a turn shows it is more than a quick answer (its first tool call, or 5 s passed), the
// turn's first step is drawn as a tall card with art and its later steps and text as nothing. When the turn ends
// every row is drawn whole again. The desktop gives the spinner a one-line slot, so the card lives in a tool row.
const LONG_AFTER_MS = 3000
const BASELINE_MS = 1500
const ART_PX = 440
// The card always stands this tall, whatever the pane's width: a narrow pane crops the scene's sides (most fade out
// there) instead of shrinking it. Taller and it would scroll inside its own row.
const ART_H = 420

// One module serves every open chat, so everything about a running turn is kept per chat, keyed by its session id.
type Chat = {
  // textless on or off in this chat pane only; kept per chat in the store, on unless switched off there.
  on: boolean
  // A turn is running, whether or not the card is on; `working` is that and the card being on.
  running: boolean
  working: boolean
  long: boolean
  // The prompt that started this turn, and whether the card hangs under it: only when no earlier message reads the
  // same, since a row is known by its text alone. Otherwise the card waits for the turn's first step.
  prompt: string
  underPrompt: boolean
  // This turn's own text blocks, and the answer and length the turn ended with: what the done line keeps folded.
  turnTexts: Set<string>
  lastText: string
  // Answers a Stop hook sent back for more work: the turn goes on, but each was an answer the person has to see.
  kept: string[]
  // Until then, a row drawn that is not running is taken as already in the chat: right after a reload the mod has
  // seen none of the chat's rows, and the redraw that shows the card would otherwise take them all as this turn's.
  baselineUntil: number
  answer: string
  durationMs: number
  // Subagents still working for this chat: a turn whose agents run in the background ends before they do.
  agents: Set<string>
  // The main turn ended while agents still ran; the card goes when the last one is done.
  mainDone: boolean
  // The turn ended without an answer: stopped by the person, an API error or a refusal.
  stopped: boolean
  // When the card first showed this turn, the zero of its animation.
  longAt: number
  turns: number
  // Messages the person sent in this chat, and the one that last carried the note on questions.
  prompts: number
  hintedAt: number | null
  // Cover mode: the text block the big card takes the place of, and its word. undefined: not read from the store yet.
  cover?: { host: string; word: string; asks?: string[]; recs?: string[] } | null
  // Show the chat was pressed: this chat stays uncovered, with textless on, until Claude starts on the next message.
  uncovered?: boolean
  // The chat's title as the app names it, for the cover card: which chat is this.
  title?: string
  // A planning turn (a document written, plan mode left): textless steps aside for it. The step that showed it carries
  // the small label.
  planKey?: string
  startedAt: number
  // Steps that ran during this turn, oldest first; only these can carry the card. Rows of earlier turns are redrawn
  // by the same invalidate, and they never ran in this turn, so they draw as usual.
  steps: string[]
  // The step whose row holds the card: the turn's first, then the newest whenever the card scrolls out of view.
  cardKey: string
  timer: { cancel: () => void } | null
  ticker: { cancel: () => void } | null
  // The last finished turn's answer: textless's buttons sit under it, on or off. Kept per chat in the store.
  newest: string
  // The folded turn that ended last (its index in `done`), or -1 when the last turn was a quick one: the buttons sit on
  // its row even when it has no answer to hang them under (a stopped turn).
  newestAt: number
  // The scene this turn shows (an index into sceneList), chosen when the turn starts; -1 before that.
  sceneAt: number
  // Background work still running when the turn's answer came (from the Stop hook), by id: the newest answer's row
  // names it until each task's notification says it ended.
  background: { id: string; description: string }[]
  // Claude keeps a task list this turn: the app draws it under the card, so the card goes to one line unless the
  // person asked for full size this turn.
  listed?: boolean
  fullAnyway?: boolean
}
const chats = new Map<string, Chat>()
// Off for every chat when the person turns it off with the icon or /textless; kept in the mod's store.
let registered = false
// Text blocks drawn while no turn ran: earlier replies, which stay visible. Any other text block is this turn's, and is
// hidden once the card shows, so only the finished reply is read.
const oldTexts = new Set<string>()
// The person's messages already in the chat, for telling the turn's own prompt apart from an earlier one.
const oldPrompts = new Set<string>()
// Steps already in the chat when no turn ran; any other step is this turn's, running or already done (a quick read
// can finish before it is ever drawn running).
const oldTools = new Set<string>()
// Finished turns stay folded: their steps and in-between text are kept hidden, and a line under the prompt says how
// many steps and how long, with a button that opens them. Kept for this session; older turns are left as they are.
// first: the step whose row draws the done line when there is no answer to hang the done card under.
// stopped: the turn did not end on an answer (the person stopped it, an API error, a refusal).
type Done = { first: string; steps: number; ms: number; open: boolean; answer: string; scene: number; stopped: boolean; labels: string[] }
const done: Done[] = []
// A finished turn's answer text, to its entry in done: the done card hangs under that block.
const doneAnswers = new Map<string, number>()
// What each step did, in a few words, by its tool_use_id: "show steps" lists these inside the done card, because the
// app does not reliably redraw the old step rows when asked.
const stepLabels = new Map<string, string>()
function stepLabel(tool: string, input: any) {
  const i = input && typeof input === 'object' ? input : {}
  // A path shows its last two parts: the file and its folder, not a drive prefix that hides the name.
  const file = i.file_path ?? i.path
  const short = typeof file === 'string' ? file.split(/[\\/]+/).filter(Boolean).slice(-2).join('/') : undefined
  const what = i.description ?? i.command ?? short ?? i.pattern ?? i.url ?? i.query ?? i.prompt ?? ''
  const one = String(what).replace(/\s+/g, ' ').trim()
  return one ? `${tool}  ${one.length > 80 ? one.slice(0, 79) + '…' : one}` : tool
}
const foldedTools = new Map<string, number>()
const foldedTexts = new Map<string, number>()

// The person's own scenes: any GIF, PNG, WebP, JPG or SVG dropped in ~/.claude/textless/scenes joins the
// rotation. A picture is wrapped in an SVG as a data URI, so it has to fit the engine's 131072-character cap.
const SVG_CAP = 131072
const IMAGE_TYPES: Record<string, string> = { gif: 'image/gif', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' }
type Own = { name: string; mtimeMs: number; svg: string }
let own: Own[] = []
// The drawn scenes the mod ships, read once. Files straight in hooks/scenes are the Clawd set; each folder in it is
// another set, named after the folder (hooks/scenes/abstract is the Abstract set).
type Scene = { name: string; svg: string; set: string; file?: string }
let builtIn: Scene[] | null = null
const CLAWD_SET = 'clawd'
// The set the card rotates through, for every chat. The person's own scenes are their own set, 'yours'.
let set = CLAWD_SET
// The scene the person picked with the next button, by place in the list; null rotates one per turn.
let pick: number | null = null
// The person's own sets, made on the settings page: a name and scenes from any set, each "<set>/<scene>".
type Mix = { id: string; name: string; scenes: string[] }
let mixes: Mix[] = []
function keptMixes(raw: unknown): Mix[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((m: any) => m && typeof m.id === 'string' && /^mix-[a-z0-9]{1,24}$/.test(m.id) && typeof m.name === 'string' && Array.isArray(m.scenes))
    .map((m: any) => ({ id: m.id, name: String(m.name).slice(0, 32), scenes: m.scenes.map(String).slice(0, 60) }))
}

async function loadBuiltIn($: any) {
  if (builtIn) return
  const root = `${$.plugin.root}/hooks/scenes`
  const top = ((await $.fs.list(root).catch(() => [])) as { name: string; kind: string }[])
  const folders = [{ dir: root, set: CLAWD_SET }, ...top.filter(f => f.kind === 'dir').map(f => ({ dir: `${root}/${f.name}`, set: f.name }))]
  const found: Scene[] = []
  for (const { dir, set: name } of folders) {
    const files = ((await $.fs.list(dir).catch(() => [])) as { name: string; kind: string }[])
      .filter(f => f.kind === 'file' && f.name.endsWith('.svg'))
      .sort((a, b) => a.name.localeCompare(b.name))
    const read = await Promise.all(files.map(f => $.fs.read(`${dir}/${f.name}`).catch(() => '')))
    files.forEach((f, i) => found.push({ name: f.name.replace(/\.svg$/, ''), svg: String(read[i]), set: name }))
  }
  // The chess scene is only the settings page's tile: chess is started with /chess, never drawn by the card's rotation.
  builtIn = found.filter(b => b.set !== INTERACTIVE_CHESS && b.svg.includes('<svg') && b.svg.length <= SVG_CAP)
  // The quotes set is drawn, not read: each quote's card is made the first time something asks for it, then kept.
  for (const [id, text, author] of QUOTES) {
    let made: string | null = null
    builtIn.push({ name: id, set: 'quotes', get svg() { return (made ??= quoteCard(text, author)) } })
  }
}

// When each play-once scene (a quote being written) was first on the card, by set and name. Once it has had its full
// time it is shown finished from then on, so a redraw or a later turn never writes it again.
const firstShown = new Map<string, number>()

// The on/off switch in the model strip: a pill in Clawd's orange with the knob right when on, grey with the knob left
// when off. The knob carries a small T, struck through while the text is hidden.
function switchSvg(on: boolean) {
  const pill = on ? '<rect x=".5" y=".5" width="29" height="15" rx="7.5" fill="#d77757" stroke="#d77757"/>' : '<rect x=".5" y=".5" width="29" height="15" rx="7.5" fill="#2c2c31" stroke="#4a4a52"/>'
  const kx = on ? 22 : 8
  const ink = on ? '#d77757' : '#2c2c31'
  const t = `<rect x="${kx - 2.5}" y="4.5" width="5" height="1.4" fill="${ink}"/><rect x="${kx - 0.7}" y="4.5" width="1.4" height="7" fill="${ink}"/>`
  const strike = on ? `<rect x="${kx - 4}" y="7.3" width="8" height="1.3" fill="${ink}" transform="rotate(-35 ${kx} 8)"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="16" viewBox="0 0 30 16">${pill}<circle cx="${kx}" cy="8" r="6" fill="${on ? '#ffffff' : '#8b8b93'}"/>${t}${strike}</svg>`
}
const tooBig = new Set<string>()

async function scenesDir($: any) {
  const home = String((await $.env.get('USERPROFILE').catch(() => '')) || (await $.env.get('HOME').catch(() => '')) || '')
  const sep = home.includes('\\') ? '\\' : '/'
  return [home, '.claude', 'textless', 'scenes'].join(sep)
}

function wrapImage(mime: string, base64: string, width = ART_PX, height = ART_PX) {
  // Drawn at the card's size, kept in proportion, with hard pixel edges so pixel art stays crisp when scaled.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="data:${mime};base64,${base64}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/></svg>`
}

// Reads the folder again, reusing files that did not change. A file too big for the card is skipped and named once.
async function loadOwn($: any) {
  const dir = await scenesDir($)
  const entries = ((await $.fs.list(dir).catch(() => [])) as { name: string; kind: string; mtimeMs: number }[])
    .filter(f => f.kind === 'file')
    .sort((a, b) => a.name.localeCompare(b.name))
  const next: Own[] = []
  for (const f of entries) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (ext !== 'svg' && !IMAGE_TYPES[ext]) continue
    const kept = own.find(o => o.name === f.name && o.mtimeMs === f.mtimeMs)
    if (kept) {
      next.push(kept)
      continue
    }
    const path = `${dir}/${f.name}`
    const svg = ext === 'svg'
      ? String(await $.fs.read(path).catch(() => ''))
      : wrapImage(IMAGE_TYPES[ext], String(((await $.fs.read(path, { as: 'bytes' }).catch(() => null)) as { base64?: string } | null)?.base64 ?? ''))
    if (!svg || svg.length > SVG_CAP || !svg.includes('<svg')) {
      if (!tooBig.has(f.name)) {
        tooBig.add(f.name)
        void Promise.resolve().then(() => $.ui.toast(`textless: ${f.name} is too big or not a picture (keep it under about 95 KB)`)).catch(() => undefined)
      }
      continue
    }
    next.push({ name: f.name, mtimeMs: f.mtimeMs, svg })
  }
  own = next
}

async function openFolder($: any) {
  const dir = await scenesDir($)
  await $.fs.write(`${dir}/README.txt`, 'Drop GIF, PNG, WebP, JPG or SVG files here (under about 95 KB each). They show in the textless card while Claude works.\n').catch(() => undefined)
  // Explorer answers 1 even when it opens the window, so any answer counts; only a refusal to start moves on to the
  // next way. If none starts, the person is told, and the panel's Copy path still gets them there.
  const ways = dir.includes('\\')
    ? [['explorer.exe', dir], ['cmd', '/c', 'start', '""', dir]]
    : [['open', dir], ['xdg-open', dir]]
  for (const argv of ways) {
    const started = await $.process.run(argv, { timeoutMs: 5000 }).then(() => true, () => false)
    if (started) return dir
  }
  void Promise.resolve().then(() => $.ui.toast(`textless: could not open the folder. It is at ${dir}`)).catch(() => undefined)
  return dir
}

// The scene market (market/ in this repo): community scenes, one click to use. TEXTLESS_MARKET_API and
// TEXTLESS_MARKET_SITE point the plugin elsewhere, such as the local dev Worker (http://127.0.0.1:8788).
const MARKET_API = 'https://textless-market.isac-ehrstedt.workers.dev'
const MARKET_SITE = 'https://textless-preview.isac-ehrstedt.workers.dev/market/'
type Listed = { id: string; name: string; author: string; link?: string; description?: string; width: number; height: number; created: string; file: string; stars?: number }
// Ids name the saved file, so only plain ones are taken: never a name or path the server sends.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/
type Market = { scenes: Listed[]; error: string; loading: boolean; at: number }
let market: Market = { scenes: [], error: '', loading: false, at: 0 }
// Thumbnails for the Community tab, checked like a download before they are drawn; '' marks one that failed.
const thumbs = new Map<string, string>()
// The market names of saved scenes, by id, so the scene list says "Rain cloud" and not the id.
let marketNames: Record<string, { name: string; author: string }> = {}
let paneTab: 'settings' | 'community' = 'settings'

async function marketUrls($: any) {
  const api = String((await $.env.get('TEXTLESS_MARKET_API').catch(() => '')) || MARKET_API).replace(/\/+$/, '')
  const site = String((await $.env.get('TEXTLESS_MARKET_SITE').catch(() => '')) || MARKET_SITE)
  return { api, site }
}

async function listMarket($: any): Promise<Listed[]> {
  const { api } = await marketUrls($)
  const res = await $.http.fetch(`${api}/scenes`)
  if (!res.ok) throw new Error(`the market answered ${res.status}`)
  const data = JSON.parse(res.text)
  // Most starred first; the market already lists newest first, and sort keeps that order among equal stars.
  return (Array.isArray(data?.scenes) ? data.scenes : [])
    .filter((s: any) => typeof s?.id === 'string' && SAFE_ID.test(s.id))
    .sort((a: any, b: any) => (Number(b.stars) || 0) - (Number(a.stars) || 0))
}

function bytesOf(base64: string) {
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Downloads one listed scene and runs the market's own checks on it again. Returns it as the SVG the card draws: an
// SVG as it is, a picture wrapped as a data URI (the plugin can only write text). Throws with the reason to tell.
async function downloadScene($: any, s: Listed) {
  const { api } = await marketUrls($)
  const ext = String(s.file ?? '').split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? ''
  if (ext !== 'svg' && !IMAGE_TYPES[ext]) throw new Error('it is not a picture the card can show')
  // Fetched from the market's own file route by id, whatever address the listing gives.
  const url = `${api}/f/${s.id}.${ext}`
  let svg: string
  if (ext === 'svg') {
    const res = await $.http.fetch(url)
    if (!res.ok) throw new Error(`the market answered ${res.status}`)
    const verdict = checkFile(`${s.id}.svg`, new TextEncoder().encode(res.text))
    if (verdict.problems.length) throw new Error(verdict.problems.join('; '))
    svg = res.text
  } else {
    const res = await $.http.fetch(`${url}?as=base64`)
    if (!res.ok) throw new Error(`the market answered ${res.status}`)
    const base64 = res.text.replace(/\s+/g, '')
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) throw new Error('the market sent something that is not a picture')
    const verdict = checkFile(`${s.id}.${ext}`, bytesOf(base64))
    if (verdict.problems.length) throw new Error(verdict.problems.join('; '))
    svg = wrapImage(IMAGE_TYPES[ext], base64, verdict.width, verdict.height)
  }
  if (svg.length > SVG_CAP) throw new Error('it is too big for the card (pictures have to stay under about 95 KB)')
  return svg
}

// Saves a listed scene as ~/.claude/textless/scenes/<id>.svg and makes it the scene every chat shows.
async function useScene($: any, s: Listed) {
  const svg = await downloadScene($, s)
  const dir = await scenesDir($)
  await $.fs.write(`${dir}/${s.id}.svg`, svg)
  marketNames = { ...marketNames, [s.id]: { name: String(s.name).slice(0, 40), author: String(s.author).slice(0, 40) } }
  await $.store.set('marketNames', marketNames).catch(() => undefined)
  await loadOwn($)
  await loadBuiltIn($)
  await setSet($, 'yours')
  await setPick($, Math.max(0, sceneList().findIndex(sc => sc.file === `${s.id}.svg`)))
  return `${s.name} by ${s.author} is on. It plays the next time Claude works.`
}

async function getScene($: any, id: string) {
  if (!SAFE_ID.test(id)) return `"${id}" is not a scene id. The site's Use in textless button copies the right command.`
  let scenes: Listed[]
  try {
    scenes = await listMarket($)
  } catch {
    return 'The scene market could not be reached. Your scenes keep working; try again later.'
  }
  const s = scenes.find(x => x.id === id)
  if (!s) return `No scene ${id} in the market. It was not found or was taken down.`
  try {
    return await useScene($, s)
  } catch (err) {
    return `${s.name} was not added: ${String((err as any)?.message ?? err)}.`
  }
}

// Fills the Community tab: the listing, then each thumbnail as it arrives. Kept for a minute between opens.
async function refreshMarket($: any, force = false) {
  if (market.loading || (!force && market.at && Date.now() - market.at < 60000)) return
  market = { ...market, loading: true }
  $.ui.invalidate('ui.render')
  try {
    market = { scenes: await listMarket($), error: '', loading: false, at: Date.now() }
  } catch {
    market = { ...market, error: 'The scene market could not be reached. Your scenes keep working.', loading: false, at: Date.now() }
  }
  $.ui.invalidate('ui.render')
  for (const s of market.scenes.slice(0, 24)) {
    if (thumbs.has(s.id)) continue
    thumbs.set(s.id, await downloadScene($, s).catch(() => ''))
    $.ui.invalidate('ui.render')
  }
}

async function useFromPane($: any, s: Listed) {
  const said = await useScene($, s).catch(err => `${s.name} was not added: ${String((err as any)?.message ?? err)}.`)
  void Promise.resolve().then(() => $.ui.toast(`textless: ${said}`)).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

async function chatOf($: any): Promise<Chat> {
  const id = String(await $.session.id().catch(() => ''))
  let chat = chats.get(id)
  if (!chat) {
    chat = { on: true, running: false, working: false, long: false, prompt: '', underPrompt: false, turnTexts: new Set<string>(), lastText: '', kept: [], baselineUntil: 0, answer: '', durationMs: 0, longAt: 0, agents: new Set<string>(), mainDone: false, stopped: false, turns: 0, prompts: 0, hintedAt: null, startedAt: 0, steps: [], cardKey: '', timer: null, ticker: null, newest: '', newestAt: -1, sceneAt: -1, background: [] }
    chats.set(id, chat)
    chat.on = (await $.store.get(`on:${id}`).catch(() => null)) !== false
    const newest = await $.store.get(`newest:${id}`).catch(() => null)
    chat.newest = typeof newest === 'string' ? newest : ''
  }
  return chat
}

// Debug log: what the mod did and when, one file per chat as ~/.claude/textless/debug-<chat>.log, the last 300 lines.
// One file per chat because every chat keeps its own buffer and would overwrite the others.
const logLines: string[] = []
// Off unless switched on with /textless debug (kept in the store, every pane) or TEXTLESS_DEBUG=1; then it writes the
// log below.
let debugOn: boolean | null = null
function dbg($: any, line: string) {
  if (debugOn === null) {
    debugOn = false
    void Promise.all([$.store.get('debug').catch(() => null), Promise.resolve($.env.get('TEXTLESS_DEBUG')).catch(() => '')])
      .then(([kept, env]: any[]) => { debugOn = kept === true || String(env ?? '') === '1' })
      .catch(() => undefined)
  }
  if (!debugOn) return
  logLines.push(`${new Date().toISOString().slice(11, 23)} ${line}`)
  if (logLines.length > 300) logLines.shift()
  void Promise.all([scenesDir($), $.session.id().catch(() => 'unknown')])
    .then(([dir, id]) => $.fs.write(dir.replace(/scenes$/, `debug-${String(id).slice(0, 8)}.log`), logLines.join('\n')))
    .catch(() => undefined)
}

function goLong($: any, chat: Chat) {
  dbg($, `goLong working=${chat.working} long=${chat.long} steps=${chat.steps.length}`)
  if (!chat.working || chat.long) return
  chat.long = true
  chat.longAt = Date.now()
  // No redraw on a clock: every redraw of an image starts its animation over, which reads as a stutter.
  $.ui.invalidate('ui.render')
}

// Marks a step as part of this turn when the app reports it running, and says where it stands in the turn.
function track($: any, chat: Chat, key: string, isRunning: boolean) {
  if (!key) return 'other'
  if ((isRunning || !oldTools.has(key)) && !chat.steps.includes(key)) {
    chat.steps.push(key)
    dbg($, `step ${chat.steps.length} ${key.slice(-8)} running=${isRunning}`)
    goLong($, chat)
    // A new step may be the one that puts the card far enough up to move it down.
    if (chat.long && chat.cardKey) reanchor($, chat, undefined)
  }
  if (!chat.steps.includes(key)) return 'other'
  // The card stays in the turn's first step: the app does not redraw rows it already drew, so a card moved to the
  // newest step left its old copy behind (two cards) and rebuilt itself every step (flicker).
  if (!chat.cardKey) chat.cardKey = chat.steps[0] ?? ''
  return key === chat.cardKey ? 'card' : 'later'
}

// The rows hidden under the card still take the app's spacing, and its own "Ran 3 commands" lines come in below, so
// a long turn pushes the card up and out of view. Where the app says which rows the viewport shows, the card moves
// once more than half of its row has scrolled away. The desktop does not say (onScreen stays undefined), so there it
// moves once REANCHOR_STEPS steps have come in below it, about when it starts to leave the screen. It moves to the
// newest step's row, at the bottom; the old row redraws to nothing.
const REANCHOR_STEPS = 3
function reanchor($: any, chat: Chat, onScreen: any) {
  const newest = chat.steps[chat.steps.length - 1]
  if (!newest || newest === chat.cardKey) return false
  const below = chat.steps.length - 1 - chat.steps.indexOf(chat.cardKey)
  const away = onScreen === undefined
    ? below >= REANCHOR_STEPS
    : onScreen === null || (typeof onScreen?.first === 'number' && typeof onScreen?.of === 'number' && onScreen.first > onScreen.of / 2)
  if (!away) return false
  dbg($, `card moves down ${chat.cardKey.slice(-8)} -> ${newest.slice(-8)} below=${below} onScreen=${JSON.stringify(onScreen)}`)
  chat.cardKey = newest
  void Promise.resolve().then(() => $.ui.invalidate('ui.render'))
  return true
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Every scene there is, by set: the person's own as 'yours', then the shipped ones (the old drawn-in-code ones only
// if those cannot be read).
function allScenes(): Scene[] {
  // The drawn quotes are always there; the old drawn-in-code scenes stand in only when no scene file could be read.
  const files = (builtIn ?? []).filter(b => b.set !== 'quotes')
  const shipped = files.length > 0 ? (builtIn as Scene[]) : [...SCENES.map((svg, i) => ({ name: `scene ${i + 1}`, svg, set: CLAWD_SET })), ...(builtIn ?? [])]
  const label = (file: string) => marketNames[file.replace(/\.svg$/, '')]?.name ?? file.replace(/\.[^.]+$/, '')
  const base = [...own.map(o => ({ name: label(o.name), svg: o.svg, set: 'yours', file: o.name })), ...shipped]
  // Each of the person's sets holds the scenes it names that this computer has, in the order they were ticked.
  const made = mixes.flatMap(m => m.scenes.flatMap(ref => base.filter(b => `${b.set}/${b.name}` === ref).slice(0, 1).map(b => ({ ...b, set: m.id }))))
  return [...base, ...made]
}

// The sets there are, the Clawd set first, the person's own last.
function setList() {
  const names = [...new Set(allScenes().map(s => s.set))]
  // Clawd first, then the shipped sets, the person's own folder, and the sets they made last.
  const rank = (n: string) => (n === CLAWD_SET ? 0 : n.startsWith('mix-') ? 3 : n === 'yours' ? 2 : 1)
  return names.sort((a, b) => rank(a) - rank(b) || (a.startsWith('mix-') ? 0 : a.localeCompare(b)))
}

const setLabel = (name: string) => (name === 'yours' ? 'Your own' : mixes.find(m => m.id === name)?.name ?? name[0].toUpperCase() + name.slice(1))

// The scenes the card rotates through: the chosen set, or the Clawd set if that one is gone.
function sceneList() {
  const all = allScenes()
  const inSet = all.filter(s => s.set === set)
  return inSet.length > 0 ? inSet : all.filter(s => s.set === CLAWD_SET).length > 0 ? all.filter(s => s.set === CLAWD_SET) : all
}

function sceneIndex(chat: Chat) {
  const n = sceneList().length
  if (pick !== null) return pick % n
  return chat.sceneAt >= 0 && chat.sceneAt < n ? chat.sceneAt : (Math.max(1, chat.turns) - 1) % n
}

// Which scene a new turn shows: random, but never one of the last RECENT_SCENES shown in any chat (at most half the
// set, so a set of three still changes every turn). A fixed order by turn number gave every new chat the same first
// few scenes and left the end of a long set unseen. A scene picked by hand (pick) wins and is not drawn here.
const RECENT_SCENES = 50
let recentScenes: string[] = []
function chooseScene($: any): number {
  const list = sceneList()
  const key = (i: number) => `${list[i].set}/${list[i].name}`
  const window = Math.min(RECENT_SCENES, Math.floor(list.length / 2))
  const avoid = new Set(recentScenes.slice(-window))
  const fresh = list.map((_, i) => i).filter(i => !avoid.has(key(i)))
  const pool = fresh.length > 0 ? fresh : list.map((_, i) => i)
  const at = pool[Math.floor(Math.random() * pool.length)]
  recentScenes = [...recentScenes.filter(k => k !== key(at)), key(at)].slice(-200)
  void $.store.set('recentScenes', recentScenes).catch(() => undefined)
  return at
}

// SMIL's own clock: each animation begins that many seconds in the past. One that names its own begin keeps it.
function inPhase(svg: string, elapsedMs: number) {
  const ago = `-${(Math.max(0, elapsedMs) / 1000).toFixed(2)}s`
  return svg.replace(/<(animate\w*|set)([^>]*?)(\/?)>/g, (tag, name, attrs, close) => (attrs.includes('begin=') ? tag : `<${name} begin="${ago}"${attrs}${close}>`))
}

async function card($: any, e: any, chat: Chat, step: string) {
  // Minimized: one line in the card's place. (The app's working line under the chat was tried: the desktop does not
  // draw a mod's tree there, so textless vanished.)
  if (isMini(chat)) return miniLine($, e, chat)
  if (chessGame && chessAnchor === 'chat' && (await chessOwns($))) return chessCard($, e, chat, step)
  try {
    const out = await drawCard($, e, chat, step)
    dbg($, `card drawn scenes=${sceneList().length} svg=${Boolean(($.ui.resolve(e) as any).Svg)}`)
    return out
  } catch (err) {
    dbg($, `card FAILED ${String((err as any)?.stack ?? err).slice(0, 300)}`)
    const { Text } = $.ui.resolve(e) as Record<string, any>
    return <Text color="#d97757">Claude is working</Text>
  }
}

// Sets that are played, not watched. The settings page lists them under Interactive sets.
const INTERACTIVE_CHESS = 'chess'

// A terminal scene plays by being drawn again: each frame is the scene read at the card's age. The redraw runs while a
// card is being drawn and stops a moment after the last one.
const readableScenes = new Map<string, boolean>()
function terminalReadable(scene: { set: string; name: string; svg: string }) {
  const key = `${scene.set}/${scene.name}`
  let ok = readableScenes.get(key)
  if (ok === undefined) {
    ok = scene.set === 'quotes' || readable(scene.svg)
    readableScenes.set(key, ok)
  }
  return ok
}
let termTimer: { cancel: () => void } | null = null
let termDrawnAt = 0
function terminalPlay($: any, now: number) {
  termDrawnAt = now
  if (termTimer) return
  termTimer = $.clock.every(250, async () => {
    if ((await $.clock.now()) - termDrawnAt > 2000) {
      termTimer?.cancel()
      termTimer = null
      return
    }
    $.ui.invalidate('ui.render')
  })
}

async function drawCard($: any, e: any, chat: Chat, step: string) {
  const { Box, Text, Svg, Button, Raster } = $.ui.resolve(e) as Record<string, any>
  await refreshTheme($)
  // Every redraw starts the image's animation over; starting each one as far in as the card has been showing makes
  // the restart land where the last drawing was, so it cannot be seen.
  let scene = sceneList()[sceneIndex(chat)]
  // A plain terminal reads only scenes built of shapes: one made of embedded pictures is swapped for the next one of its
  // set that it can read, else any that it can.
  if (e.surface === 'terminal' && Raster && !terminalReadable(scene)) {
    const all = sceneList()
    const at = all.indexOf(scene)
    const pick = [...all.slice(at + 1), ...all.slice(0, at)]
    scene = pick.find(c => c.set === scene.set && terminalReadable(c)) ?? pick.find(terminalReadable) ?? scene
  }
  const now = await $.clock.now()
  let src = scene.svg
  const once = onceMs(src)
  if (once !== null) {
    const key = `${scene.set}/${scene.name}`
    const first = firstShown.get(key) ?? now
    firstShown.set(key, first)
    if (now - first >= once) src = stillCard(src)
  }
  const art = inPhase(src, now - chat.longAt)
  // A scene from the marketplace names who drew it, under the card's words. Shipped scenes and the person's own don't.
  const maker = scene.file ? marketNames[scene.file.replace(/\.svg$/, '')] : undefined
  // Square art with the words under it. Nothing here changes on a clock, so the drawing is only redrawn when a step
  // changes and its animation runs on undisturbed.
  // Each scene keeps its own shape: drawn at its own width and height, no wider than the card allows.
  const size = art.match(/<svg[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/)
  const artW = size ? Number(size[1]) : ART_PX
  const artH = size ? Number(size[2]) : ART_PX
  const fitW = Math.round((ART_H * artW) / artH)
  // Fill the box and crop what does not fit, centred, so a pane narrower than fitW keeps the full height. A scene whose
  // root says data-fit="contain" (a word that must stay whole) is fitted inside instead; it paints its own background
  // past its viewBox so the box still looks full.
  // A plain terminal cannot draw an SVG: pixel-art scenes are painted as coloured half blocks, a quote as its words.
  const terminal = e.surface === 'terminal'
  let terminalArt: any = null
  if (terminal) {
    const columns = Number(e.viewport?.columns) || 80
    const rows = Number(e.viewport?.rows) || 30
    const cells = Raster ? sceneCells(src, Math.min(64, columns - 4), Math.max(6, Math.min(20, rows - 12)), Math.max(0, now - chat.longAt) / 1000) : null
    const quote = scene.set === 'quotes' ? QUOTES.find(q => q[0] === scene.name) : undefined
    if (cells) {
      terminalArt = <Raster key="textless-art" columns={cells.columns} rows={cells.rows} cells={cells.cells} />
      terminalPlay($, now)
    }
    else if (quote) {
      terminalArt = (
        <Box key="textless-quote" flexDirection="column" alignItems="center" paddingX={2} marginY={1}>
          <Text color="#d97757" italic wrap="wrap">{quote[1]}</Text>
          <Text dimColor>{`— ${quote[2]}`}</Text>
        </Box>
      )
    }
  }
  const contain = /<svg\b[^>]*\sdata-fit="contain"/.test(art)
  const fit = contain ? 'xMidYMid meet' : 'xMidYMid slice'
  const cover = art.replace(/<svg\b([^>]*?)\s*preserveAspectRatio="[^"]*"/, '<svg$1').replace(/<svg\b/, `<svg preserveAspectRatio="${fit}"`)
  return (
    <Box key="textless" flexDirection="column" alignItems="center" paddingBottom={1}>
      {/* The switch, the settings (another scene mid-turn) and minimize sit in the row the top padding took, so the card is no taller for them. */}
      <Box key="textless-top" flexDirection="row" justifyContent="flex-end" width="100%" height={1}>
        {Button ? controls($, e) : null}
        {Button ? sizeButton($, e, 'minimize') : null}
      </Box>
      {terminal ? terminalArt : Svg ? <Svg source={cover} alt="Claude working" width={fitW} height={ART_H} /> : null}
      {/* Answered while a background task runs: Claude still has work under way, so it is not the person's turn yet. */}
      <Text color="#d97757" bold wrap="truncate">Claude is working</Text>
      <Text dimColor wrap="truncate">{chat.mainDone ? waitingFor(chat) : step}</Text>
      {maker ? <Text key="textless-credit" color="#6e6660" wrap="truncate">{`${maker.name} · by ${maker.author}`}</Text> : null}
    </Box>
  )
}

// The turn has answered while background work runs: the card hangs under the answer, not up among the steps.
function cardUnderAnswer(chat: Chat) {
  return chat.mainDone && chat.long && chat.answer.trim() !== ''
}

// What the turn still waits on once its answer is in: the background tasks by name, or the subagents.
function waitingFor(chat: Chat) {
  const n = chat.background.length
  if (n === 0) return 'Waiting for a background task'
  return `Waiting for ${n} background task${n === 1 ? '' : 's'}: ${chat.background.map(t => t.description).join(', ')}`
}
// The same, after the turn: on the newest answer's row, until the last one ends.
function backgroundLine($: any, e: any, chat: Chat) {
  const { Box, Text } = $.ui.resolve(e) as Record<string, any>
  const n = chat.background.length
  if (n === 0) return null
  return (
    <Box key="textless-background" flexShrink={1} minWidth={0} marginLeft={1}>
      <Text dimColor wrap="truncate">{`${n} background task${n === 1 ? '' : 's'} running: ${chat.background.map(t => t.description).join(', ')}`}</Text>
    </Box>
  )
}

// Minimize (two arrows pointing in) and full size (two arrows pointing out), drawn, in the same spot on both looks.
// Like "Aa": the icon in the flow, a blank button over it for the click, its hover clear and a lighter copy of the icon
// shown under the pointer instead.
function sizeIcon(kind: 'minimize' | 'expand', color: string) {
  const paths = kind === 'minimize'
    ? 'M14 2 9.5 6.5M9.5 3v3.5H13M2 14l4.5-4.5M3 9.5h3.5V13'
    : 'M9.5 6.5 14 2M10 2h4v4M6.5 9.5 2 14M2 10v4h4'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="${paths}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
function sizeButton($: any, e: any, kind: 'minimize' | 'expand') {
  const { Box, Svg, Button } = $.ui.resolve(e) as Record<string, any>
  const key = `textless-${kind}`
  const press = async () => {
    const chat = await chatOf($)
    // Full size on a turn with a task list holds for this turn; the choice for every turn stays as it was.
    if (kind === 'expand' && !mini) chat.fullAnyway = true
    else if (kind === 'minimize' && chat.listed) chat.fullAnyway = false
    if (kind === 'expand' && mini) await setMini($, false)
    else if (kind === 'minimize' && !chat.listed) await setMini($, true)
    else $.ui.invalidate('ui.render')
  }
  if (!Svg || e.surface === 'terminal') return <Button key={key} plain dimColor label={kind === 'minimize' ? ' Minimize ' : ' Expand '} onPress={press} />
  return (
    <Box key={`${key}-box`} flexDirection="row" alignItems="center" justifyContent="center" paddingX={1}>
      <Svg source={sizeIcon(kind, isLight ? '#8a8580' : '#8b8b93')} alt={kind === 'minimize' ? 'Minimize' : 'Full size'} width={14} height={14} />
      <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center" display="none" hover={{ scope: key, display: 'flex' }}>
        <Svg source={sizeIcon(kind, isLight ? '#1a1a1a' : '#f2f2f2')} alt={kind === 'minimize' ? 'Minimize' : 'Full size'} width={14} height={14} />
      </Box>
      <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
        <Button key={key} plain label={' '.repeat(3)} hover={{ scope: key, backgroundColor: '#00000000' }} onPress={press} />
      </Box>
    </Box>
  )
}

async function miniLine($: any, e: any, chat: Chat) {
  await refreshTheme($)
  const { Box, Text } = $.ui.resolve(e) as Record<string, any>
  return (
    <Box key="textless" flexDirection="row" alignItems="center" gap={1}>
      <Text color="#d97757" bold>textless</Text>
      <Box flexShrink={1} minWidth={0}>
        <Text dimColor wrap="truncate">{chat.mainDone ? waitingFor(chat) : 'minimized'}</Text>
      </Box>
      <Box flexGrow={1} />
      {/* No gap between the buttons, as on the big card: the row's own gap spread them. */}
      <Box flexDirection="row" alignItems="center">
        {controls($, e)}
        {sizeButton($, e, 'expand')}
      </Box>
    </Box>
  )
}

// Text said between steps is hidden, but the app can keep a row it drew while the text was still arriving (a card on
// top and the text under it until something redraws). Once the text stops changing, every row is drawn once more.
let settling: { cancel: () => void } | null = null
function settleText($: any) {
  settling?.cancel()
  settling = $.clock.after(700, () => { settling = null; $.ui.invalidate('ui.render') })
}

// Switched off while Claude works: the row the card sat in is drawn as the app draws it, with one line under it holding
// the grey Aa and the gear, so the way back on stays where the card was instead of moving up the chat.
async function offRow($: any, e: any, chat: Chat, isCardRow: boolean, next: any) {
  const inner = await next(e)
  if (!chat.running || !isCardRow) return inner
  await refreshTheme($)
  const { Box } = $.ui.resolve(e) as Record<string, any>
  const drawn = { chat, id: String(await $.session.id().catch(() => '')) }
  return (
    <Box key="textless-off-row" flexDirection="column">
      {inner}
      <Box flexDirection="row" alignItems="center">
        <Box flexGrow={1} />
        {controls($, e, drawn)}
      </Box>
    </Box>
  )
}

// The card minimized to one line, for every chat; kept in the store.
let mini = false
// One line now: minimized, or a turn with a task list (the app's own, drawn under the card).
const LIST_TOOLS = /^(TodoWrite|TaskCreate|TaskUpdate)$/
function isMini(chat: Chat) {
  return mini || (Boolean(chat.listed) && !chat.fullAnyway)
}
function noteList($: any, chat: Chat, tool: unknown) {
  if (!chat.working || chat.listed || !LIST_TOOLS.test(String(tool ?? ''))) return
  chat.listed = true
  void Promise.resolve().then(() => $.ui.invalidate('ui.render')).catch(() => undefined)
}
async function setMini($: any, on: boolean) {
  mini = on
  await $.store.set('mini', on).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

// textless's two buttons: "Aa" switches it on or off in this chat, the gear opens the settings. They sit on the
// minimized card and under the newest answer, never in a row of their own under the prompt.
// A Button cannot be coloured, so "Aa" is text (Clawd orange, bold and struck through while textless hides the steps,
// plain grey while off) with a blank button laid over it to take the click.
// The button's own hover box is clear: drawn over the text it hid it; the text lights up instead.
function controls($: any, e: any, drawn?: { chat: Chat; id: string }) {
  const { Box, Text, Button } = $.ui.resolve(e) as Record<string, any>
  const on = drawn ? drawn.chat.on : true
  // A plain terminal draws no hover or overlay: the switch and the settings are two labelled buttons.
  if (e.surface === 'terminal') {
    return [
      <Button key="textless-switch" plain dimColor={!on} label={on ? ' Aa ' : ' Aa off '} onPress={() => toggle($, undefined, drawn)} />,
      <Button key="textless-settings" plain dimColor label=" ⚙ " onPress={() => openWebSettings($)} />,
    ]
  }
  return [
    <Box key="textless-switch-box" flexDirection="row" alignItems="center" paddingX={1}>
      <Text color={on ? '#d77757' : undefined} dimColor={!on} bold={on} strikethrough={on} hover={{ scope: 'textless-switch', color: on ? '#f0a080' : hoverText() }}>Aa</Text>
      <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
        <Button key="textless-switch" plain label={' '.repeat(3)} hover={{ scope: 'textless-switch', backgroundColor: '#00000000' }} onPress={() => toggle($, undefined, drawn)} />
      </Box>
    </Box>,
    <Button key="textless-settings" plain dimColor label=" ⚙︎ " hover={{ scope: 'textless-settings', backgroundColor: hoverBg() }} onPress={() => openWebSettings($)} />,
  ]
}

// Under the newest answer: the answer as drawn, then one row with the buttons at its end ("Aa" says on or off).
function isNewest(chat: Chat, text: string) {
  const answer = chat.newest.trim()
  const block = text.trim()
  return Boolean(answer && block && answer.endsWith(block))
}
async function newestRow($: any, e: any, inner: unknown, left?: unknown) {
  await setUp($)
  const { Box } = $.ui.resolve(e) as Record<string, any>
  await refreshTheme($)
  const drawn = { chat: await chatOf($), id: String(await $.session.id().catch(() => '')) }
  const row = (
    <Box key="textless-newest" flexDirection="row" alignItems="center">
      {left ?? null}
      {backgroundLine($, e, drawn.chat)}
      <Box flexGrow={1} />
      {controls($, e, drawn)}
    </Box>
  )
  return (
    <Box key="textless-answer" flexDirection="column" gap={1}>
      {inner}
      {row}
      {await updBelow($, e)}
      {chessBelow($, e)}
    </Box>
  )
}

async function openSettings($: any) {
  await loadOwn($)
  await loadBuiltIn($)
  await $.ui.open({ id: 'textless-settings', title: 'textless' })
}

// The settings page on the website. This computer gets a random key the first time; the page saves under it on the
// market Worker and every chat reads it back from there, so nothing has to be pasted.
// Parked: textless draws art only and leaves answers alone. The cover card, the questions, links and next step under
// answers, and the note telling Claude how to word questions all stay off while this is false. The full version lives
// on the branch backup/answer-cards (tag answer-cards-backup).
export const ANSWERS = false
// Questions, links and the next step under a finished answer; /textless summary off leaves only the done line.
let summaryOn = ANSWERS
// Cover mode: once Claude is done, the whole chat hides behind one big card saying whose move it is. Off by default.
let coverOn = false
let syncKey = ''
let remoteUpdated = 0
let watchUntil = 0
let lastPull = 0

async function keyOf($: any) {
  if (syncKey) return syncKey
  const kept = await $.store.get('syncKey').catch(() => null)
  if (typeof kept === 'string' && /^[0-9a-f]{32}$/.test(kept)) return (syncKey = kept)
  const bytes = globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
  syncKey = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  await $.store.set('syncKey', syncKey).catch(() => undefined)
  return syncKey
}

// The page opens on what the card shows now: the set, and the picked scene's name if one is kept.
async function openWebSettings($: any) {
  await loadOwn($)
  await loadBuiltIn($)
  const { site } = await marketUrls($)
  const scene = pick !== null ? sceneList()[pick % sceneList().length]?.name ?? '' : ''
  const page = new URL('../settings/', site).href
  const hash = `k=${await keyOf($)}&set=${encodeURIComponent(set)}&scene=${encodeURIComponent(scene)}&summary=${summaryOn ? 1 : 0}&cover=${coverOn ? 1 : 0}`
  let url = `${page}#${hash}`
  // The page cannot read this computer, so the plugin writes a copy of it here with the person's own scenes in it
  // and opens that: their pictures never leave the computer, only the pick is saved (as from the site). Offline, or
  // with no own scenes, the site itself opens.
  const mine = allScenes().filter(s => s.set === 'yours')
  // Written even with no own scenes yet, so the page can show where the folder is.
  {
    const res = await $.http.fetch(page).catch(() => null)
    if (res?.ok && String(res.text).includes('var API')) {
      const ownList = mine.slice(0, 60).map(s => ({ id: s.name, name: s.name, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.svg)}` }))
      const folder = await scenesDir($)
      const data = `<script>window.TEXTLESS_HASH=${JSON.stringify(hash)};window.TEXTLESS_DIR=${JSON.stringify(folder)};window.TEXTLESS_OWN=${JSON.stringify(ownList).replace(/</g, '\\u003c')};</script>`
      const html = String(res.text).replace('<head>', `<head><base href="${page}">`).replace('<script>\nvar API', `${data}\n<script>\nvar API`)
      const dir = (await scenesDir($)).replace(/[\\/]scenes$/, '')
      const file = `${dir}${dir.includes('\\') ? '\\' : '/'}settings.html`
      if (await $.fs.write(file, html).then(() => true, () => false)) url = file
    }
  }
  // Watch closely for a while: the person is on the page and expects a save to show at once.
  watchUntil = Number(await $.clock.now()) + 20 * 60_000
  // From the plugin's own path, not from USERPROFILE: the app sets that on a Mac too, and rundll32 does not exist there.
  const windows = /^[A-Za-z]:|\\/.test(String($.plugin.root))
  // rundll32 hands the address to the default browser and answers 0; explorer answers 1 even when it opens one.
  const ways = windows ? [['rundll32', 'url.dll,FileProtocolHandler', url], ['explorer.exe', url]] : [['open', url], ['xdg-open', url]]
  for (const argv of ways) {
    const r = await $.process.run(argv, { timeoutMs: 5000 }).then((x: any) => x, (err: any) => ({ exitCode: -1, stderr: String(err) }))
    dbg($, `settings open ${argv[0]} exit=${r.exitCode} ${String(r.stderr ?? '').slice(0, 120)}`)
    if (r.exitCode !== -1) return
  }
  // No browser would start: the settings in the app still work.
  $.ui.toast('textless: no browser would open, so the small settings panel is shown. /textless debug logs why.')
  await openSettings($)
}

// What the page saved, if it is newer than what this chat last took. Every 5 s while the page was just opened, every
// minute otherwise, and never before the page was first opened on this computer.
async function pullSettings($: any) {
  if (!syncKey) {
    const kept = await $.store.get('syncKey').catch(() => null)
    if (typeof kept !== 'string' || !/^[0-9a-f]{32}$/.test(kept)) return
    syncKey = kept
  }
  const now = Number(await $.clock.now())
  if (lastPull && now - lastPull < (now < watchUntil ? 5000 : 60_000)) return
  lastPull = now || 1
  const { api } = await marketUrls($)
  const res = await $.http.fetch(`${api}/settings/${syncKey}`).catch(() => null)
  if (!res?.ok) return
  let got: any = null
  try { got = JSON.parse(String(res.text)) } catch { return }
  if (!got || typeof got.set !== 'string' || typeof got.updated !== 'number') return
  const taken = Number(await $.store.get('remoteUpdated').catch(() => 0)) || 0
  remoteUpdated = Math.max(remoteUpdated, taken)
  if (got.updated <= remoteUpdated) return
  remoteUpdated = got.updated
  await $.store.set('remoteUpdated', got.updated).catch(() => undefined)
  await loadOwn($)
  await loadBuiltIn($)
  // The questions list under answers, on or off for every chat, when the page sent it.
  if (ANSWERS && typeof got.summary === 'boolean' && got.summary !== summaryOn) {
    summaryOn = got.summary
    await $.store.set('summary', summaryOn).catch(() => undefined)
  }
  if (ANSWERS && typeof got.cover === 'boolean' && got.cover !== coverOn) {
    coverOn = got.cover
    await $.store.set('cover', coverOn).catch(() => undefined)
  }
  if (Array.isArray(got.mixes)) {
    mixes = keptMixes(got.mixes)
    await $.store.set('mixes', mixes).catch(() => undefined)
  }
  if (!setList().includes(got.set)) return
  set = got.set
  const at = typeof got.scene === 'string' ? sceneList().findIndex(s => s.name === got.scene) : -1
  pick = at >= 0 ? at : null
  await $.store.set('set', set).catch(() => undefined)
  await $.store.set('pick', pick).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

// A scene picked in the settings, for every chat; null takes one per turn in turn.
async function setPick($: any, value: number | null) {
  pick = value
  await $.store.set('pick', value).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

// A set picked in the settings, for every chat; the card then rotates through that set from its first scene.
async function setSet($: any, name: string) {
  set = name
  pick = null
  await $.store.set('set', name).catch(() => undefined)
  await $.store.set('pick', null).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

// The next button: the scene after the one showing, kept for every chat until pressed again.
async function nextScene($: any) {
  const chat = await chatOf($)
  await loadOwn($)
  await loadBuiltIn($)
  const list = sceneList()
  pick = (sceneIndex(chat) + 1) % list.length
  await $.store.set('pick', pick).catch(() => undefined)
  void Promise.resolve().then(() => $.ui.toast(`textless: ${list[pick!].name} (${pick! + 1} of ${list.length})`)).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

// On or off for this chat pane only: other panes keep their own switch. Switched during a turn, the card goes or comes
// at once: off draws the rows and text whole again.
// The strip passes the chat and id it was drawn for: a press runs later, outside the drawing, and looking the chat up
// again there could land on another one.
async function toggle($: any, want?: boolean, drawn?: { chat: Chat; id: string }) {
  const chat = drawn?.chat ?? (await chatOf($))
  const id = drawn?.id ?? String(await $.session.id().catch(() => ''))
  const was = chat.on
  chat.on = want ?? !chat.on
  chat.working = chat.running && chat.on
  if (!chat.working) chat.long = false
  else if (!was) {
    // Back on in the middle of a turn: the rows drawn while off stay as they are (the app does not redraw them), so
    // the card starts over at the next step, under them, instead of going back up to the turn's first step.
    for (const k of chat.steps) oldTools.add(k)
    chat.steps = []
    chat.cardKey = ''
    chat.long = false
  } else if (chat.steps.length > 0) goLong($, chat)
  void Promise.resolve().then(() => $.ui.toast(chat.on ? 'textless on in this chat' : 'textless off in this chat')).catch(() => undefined)
  await $.store.set(`on:${id}`, chat.on).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

async function setUp($: any) {
  if (registered) return
  registered = true
  const kept = await $.store.get('pick').catch(() => null)
  mini = (await $.store.get('mini').catch(() => null)) === true
  const seen = await $.store.get('recentScenes').catch(() => null)
  recentScenes = Array.isArray(seen) ? seen.filter((k: unknown) => typeof k === 'string').slice(-200) : []
  pick = typeof kept === 'number' ? kept : null
  const keptSet = await $.store.get('set').catch(() => null)
  set = typeof keptSet === 'string' && keptSet ? keptSet : CLAWD_SET
  summaryOn = ANSWERS && (await $.store.get('summary').catch(() => null)) !== false
  coverOn = ANSWERS && (await $.store.get('cover').catch(() => null)) === true
  mixes = keptMixes(await $.store.get('mixes').catch(() => null))
  const keptNames = await $.store.get('marketNames').catch(() => null)
  marketNames = keptNames && typeof keptNames === 'object' ? keptNames : {}
  void $.command.register({ name: 'textless', description: 'textless on or off in this chat.' }).catch(() => undefined)
  // The scene pick and set are shared by every chat pane: one picked in a pane reaches the others through the store,
  // read here every 2 s. On or off stays per pane.
  $.clock.every(2000, () => { void syncSettings($).catch(() => undefined); void pullSettings($).catch(() => undefined) })
}

async function syncSettings($: any) {
  const keptPick = await $.store.get('pick').catch(() => null)
  const nextPick = typeof keptPick === 'number' ? keptPick : null
  const keptSet = await $.store.get('set').catch(() => null)
  const nextSet = typeof keptSet === 'string' && keptSet ? keptSet : CLAWD_SET
  if (nextPick === pick && nextSet === set) return
  const setMoved = nextSet !== set
  pick = nextPick
  set = nextSet
  if (setMoved) await loadBuiltIn($)
  $.ui.invalidate('ui.render')
}

// A hidden row takes no height: an empty Text still drew a line plus the row's gap, so hidden steps stacked up empty
// space under the card, scrolled it out of view and left a hole above the answer.
function blank($: any, e: any) {
  const { Box } = $.ui.resolve(e)
  return <Box height={0} overflow="hidden" />
}

// Background agents can outlive the turn that started them; past this the card goes even if one never reports back.
const AGENT_WAIT_MS = 10 * 60 * 1000

// A text block is part of the turn's final answer: the app draws a long answer as several blocks.
function inAnswer(chat: Chat, text: string) {
  const t = text.trim().replace(/\s+/g, ' ').slice(0, 200)
  return t.length > 0 && chat.answer.replace(/\s+/g, ' ').includes(t)
}

// A text block is part of an answer a Stop hook sent back (and the shorter versions of it drawn while it streamed).
function isKept(chat: Chat, text: string) {
  const t = text.trim().replace(/\s+/g, ' ').slice(0, 200)
  return t.length > 0 && chat.kept.some(k => k.includes(t))
}

// Done cards live in memory, so a reload of the plugin (an update, a restart) would drop them and the answer would
// show bare, with its steps and in-between text back. Each chat keeps its last turns in the store and reads them
// back the first time it draws after a reload.
type SavedTurn = { d: Done; tools: string[]; texts: string[] }
const SAVED_TURNS = 30
const loadedDone = new Set<string>()

async function saveDone($: any, index: number) {
  const id = String(await $.session.id().catch(() => ''))
  if (!id) return
  const tools = [...foldedTools].filter(([, i]) => i === index).map(([k]) => k)
  const texts = [...foldedTexts].filter(([, i]) => i === index).map(([k]) => k).filter(t => t.length <= 4000)
  const kept = ((await $.store.get(`done:${id}`).catch(() => null)) as SavedTurn[] | null) ?? []
  const turn: SavedTurn = { d: { ...done[index], open: false, labels: done[index].labels.slice(0, 40) }, tools, texts }
  await $.store.set(`done:${id}`, [...(Array.isArray(kept) ? kept : []), turn].slice(-SAVED_TURNS)).catch(() => undefined)
}

async function loadDone($: any) {
  const id = String(await $.session.id().catch(() => ''))
  if (!id || loadedDone.has(id)) return
  loadedDone.add(id)
  const kept = (await $.store.get(`done:${id}`).catch(() => null)) as SavedTurn[] | null
  if (!Array.isArray(kept)) return
  for (const t of kept) {
    if (!t?.d || (t.d.answer && doneAnswers.has(t.d.answer))) continue
    const index = done.length
    done.push({ ...t.d, open: false })
    if (t.d.answer) doneAnswers.set(t.d.answer, index)
    for (const k of t.tools ?? []) if (!foldedTools.has(k)) foldedTools.set(k, index)
    for (const k of t.texts ?? []) if (!foldedTexts.has(k)) foldedTexts.set(k, index)
  }
  if (kept.length) $.ui.invalidate('ui.render')
}

// Cover mode is on for this chat: textless is on here and the setting is on.
// Like the work card, only a turn that ran long enough for the card is covered: a quick answer leaves the chat as it is.
const covering = (chat: Chat) => chat.on && coverOn && !chat.uncovered && (chat.working ? chat.long : !!chat.cover)
async function saveCover($: any, chat: Chat) {
  const id = String(await $.session.id().catch(() => ''))
  if (id) await $.store.set(`cover:${id}`, chat.cover ?? null)
}
// After a reload the chat's cover is read back once, so the card stays where it was.
async function loadCover($: any, chat: Chat) {
  if (chat.cover !== undefined) return
  const id = String(await $.session.id().catch(() => ''))
  const kept = id ? ((await $.store.get(`cover:${id}`).catch(() => null)) as { host?: unknown; word?: unknown } | null) : null
  chat.cover = kept && typeof kept.host === 'string' && typeof kept.word === 'string' ? { host: kept.host, word: kept.word, ...(Array.isArray((kept as any).asks) ? { asks: (kept as any).asks.map(String).slice(0, 5) } : {}), ...(Array.isArray((kept as any).recs) ? { recs: (kept as any).recs.map(String).slice(0, 5) } : {}) } : null
}
// The big card that covers a finished chat: the word in large pixels, and the way back to the chat.
function coverCard($: any, e: any, chat: Chat, drawn: { chat: Chat; id: string }) {
  const { Box, Text, Button, Svg } = $.ui.resolve(e) as Record<string, any>
  const word = chat.cover?.word ?? '▶ YOUR TURN'
  const said = word.slice(2).toLowerCase().replace(/^./, c => c.toUpperCase())
  // Shown with the chat above it, the card stays at the bottom, so the chat's end stays where the view already is.
  const open = !!chat.uncovered
  return (
    <Box key="textless-cover" flexDirection="column" alignItems="center" justifyContent="center" gap={1} paddingY={open ? 2 : 6}>
      {chat.title ? <Text key="textless-cover-title" dimColor wrap="truncate">{chat.title}</Text> : null}
      {Svg
        ? <Svg source={pixelWord(word, '#d97757')} alt={said} width={pixelWidth(word) * 3} height={PIXEL_H * 3} />
        : <Text color="#d97757" bold>{said}</Text>}
      {/* What Claude asks, drawn as under answers: an orange ? and the question, an orange letter per option. */}
      {(chat.cover?.asks ?? []).length
        ? <Box key="textless-cover-asks" flexDirection="column" gap={1} paddingX={2}>
            {(chat.cover?.asks ?? []).map((text, i, all) => {
              const c = choices(text)
              return (
                <Box key={`textless-cover-ask-${i}`} flexDirection="row" alignItems="flex-start" gap={1}>
                  {all.length > 1 ? <Text color="#d97757" bold>{`${i + 1}`}</Text> : null}
                  {Svg
                    ? <Svg source={badgeSvg('?', '#d97757')} alt="Question" width={9 * BADGE_PX} height={9 * BADGE_PX} />
                    : <Text color="#d97757">?</Text>}
                  <Box flexDirection="column">
                    <Text bold wrap="wrap">{c.stem || text}</Text>
                    {chat.cover?.recs?.[i] ? recommendedLine($, e, chat.cover.recs[i]) : null}
                    {c.options.map((o, j) => (
                      <Box key={`textless-cover-ask-${i}-${j}`} flexDirection="row" gap={1}>
                        <Text color="#d97757" bold>{String.fromCharCode(65 + j)}</Text>
                        <Text wrap="wrap">{o}</Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )
            })}
          </Box>
        : null}
      {open ? null : <Text dimColor>The chat is hidden while textless covers it.</Text>}
      <Button key="textless-cover-show" plain label={open ? 'Hide the chat' : 'Show the chat'} onPress={() => {
        drawn.chat.uncovered = !open
        $.ui.invalidate('ui.render')
      }} />
    </Box>
  )
}

// Planning: a spec, plan or notes being written (a document edited), or Claude leaving plan mode. The person reads
// those turns, so folding them away hides what they are asked about.
const DOC = /\.(md|mdx|markdown|txt|rst|adoc)$/i
export function planningStep(tool: string, input: any): boolean {
  if (/^(ExitPlanMode|EnterPlanMode)$/.test(tool)) return true
  if (!/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(tool)) return false
  return DOC.test(String(input?.file_path ?? input?.path ?? input?.notebook_path ?? ''))
}
// The turn shows as Claude Code draws it from here on: the card goes, nothing folds, and it is not covered.
function stepAside($: any, chat: Chat, id: string) {
  if (!chat.working) return
  dbg($, `planning detected at ${id.slice(-8)}: textless steps aside for this turn`)
  chat.working = false
  chat.long = false
  chat.cover = null
  chat.planKey = id
  chat.timer?.cancel()
  chat.timer = null
  void saveCover($, chat).catch(() => undefined)
  void Promise.resolve().then(() => $.ui.invalidate('ui.render'))
}
// The small label on the step that showed the planning.
function planLabel($: any, e: any, inner: unknown) {
  const { Box, Text } = $.ui.resolve(e) as Record<string, any>
  return (
    <Box flexDirection="column">
      {inner as never}
      <Box key="textless-planning" flexDirection="row" gap={1}>
        <Text color="#d97757">✎ Planning detected</Text>
        <Text dimColor>textless shows this turn as it is, so you can read the plan.</Text>
      </Box>
    </Box>
  )
}

async function keepTitle($: any, raw: unknown) {
  const title = String(raw ?? '').trim()
  if (title) (await chatOf($)).title = title.slice(0, 80)
}

function endTurn($: any, chat: Chat) {
  dbg($, `endTurn working=${chat.working} long=${chat.long} steps=${chat.steps.length}`)
  // A turn the card covered stays folded once it is done: only its answer shows.
  chat.newestAt = -1
  if (chat.working && chat.long && chat.steps.length > 0) {
    const index = done.length
    chat.newestAt = index
    const answer = chat.lastText.trim() ? chat.lastText : ''
    done.push({ first: chat.steps[chat.steps.length - 1], steps: chat.steps.length, ms: chat.durationMs, open: false, answer, scene: sceneIndex(chat), stopped: chat.stopped, labels: chat.steps.map(id => stepLabels.get(id) ?? 'step') })
    if (answer) doneAnswers.set(answer, index)
    for (const id of chat.steps) foldedTools.set(id, index)
    // The answer is the turn's last text block (and the shorter versions of it drawn while it streamed), and any block
    // found in the final answer, which the app splits into several blocks when long. Only the text said along the way
    // folds.
    for (const t of chat.turnTexts) if (t.trim() && !chat.lastText.startsWith(t) && !inAnswer(chat, t) && !isKept(chat, t)) foldedTexts.set(t, index)
    void saveDone($, index).catch(() => undefined)
  }
  if (chat.working && !chat.long) {
    chat.cover = null
    void saveCover($, chat).catch(() => undefined)
  } else if (chat.working) {
    const only = asks(chat.answer) && questions(chat.answer).every(q => q.asks)
    chat.cover = { host: chat.lastText, word: chat.stopped ? '■ STOPPED' : only ? '? NEED YOUR INPUT' : '▶ YOUR TURN', asks: questions(chat.answer).filter(q => q.asks).map(q => q.text).slice(0, 5), recs: questions(chat.answer).filter(q => q.asks).map(q => recommendation(chat.answer, q.raw || q.text)).slice(0, 5) }
    void saveCover($, chat).catch(() => undefined)
  }
  chat.turnTexts = new Set<string>()
  chat.kept = []
  chat.lastText = ''
  chat.running = false
  chat.working = false
  chat.long = false
  chat.mainDone = false
  chat.agents.clear()
  chat.timer?.cancel()
  chat.ticker?.cancel()
  chat.timer = chat.ticker = null
  $.ui.invalidate('ui.render')
}

// A finished turn's rows: its first step's row says what was done and opens the rest; its other rows draw nothing
// while folded. Rows of turns textless did not cover draw as usual.
// A finished turn with no answer to hang the card under (often a stopped one): its last step's row draws the card's
// row itself. Its other rows draw nothing.
async function folded($: any, e: any, next: any, ids: string[]) {
  const at = ids.map(id => foldedTools.get(id)).find(i => i !== undefined)
  if (at === undefined) return next(e)
  const d = done[at]
  if (!ids.includes(d.first) || d.answer) return blank($, e)
  return doneRow($, e, at)
}

function isFolded(ids: string[]) {
  return ids.some(id => {
    const at = foldedTools.get(id)
    return at !== undefined && !done[at].open
  })
}

function unfold($: any, at: number) {
  done[at].open = !done[at].open
  $.ui.invalidate('ui.render')
}

// A 5x7 pixel font for the few words the cards say in pixels, drawn bold (each stroke doubled) with a darker drop
// one pixel down; each pixel PIXEL_PX square. '#' is ink.
const GLYPHS: Record<string, string[]> = {
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
}
// The marks a word may start with: a 9x9 orange badge with the mark cut out, so the chat shows through.
const BADGES: Record<string, string[]> = {
  '✓': ['.........', '.........', '.......#.', '......##.', '.....##..', '.#..##...', '.####....', '..##.....', '.........'],
  '?': ['.........', '...###...', '..#...#..', '......#..', '.....#...', '....#....', '.........', '....#....', '.........'],
  // Stopped: a block sign, a ring with a slash, cut out like the others. Keyed '■' as the turn code names it.
  '■': ['.........', '...###...', '..##..#..', '.#.#...#.', '.#..#..#.', '.#...#.#.', '..#..##..', '...###...', '.........'],
  // Your move: a play triangle (YOUR TURN) and an arrow handing over (OVER TO YOU), cut out like the others.
  '▶': ['.........', '..#......', '..##.....', '..###....', '..####...', '..###....', '..##.....', '..#......', '.........'],
  '→': ['.........', '.........', '.....#...', '.....##..', '.#######.', '.....##..', '.....#...', '.........', '.........'],
  // A thing to do: an empty checkbox, cut out like the others.
  '☐': ['.........', '.........', '..#####..', '..#...#..', '..#...#..', '..#...#..', '..#####..', '.........', '.........'],
}
// One badge alone, small enough to sit on a line of text: a question or a thing to do in the list under the YOUR TURN word.
const BADGE_PX = 2
function badgeSvg(mark: string, color: string) {
  const cells: string[] = []
  BADGES[mark].forEach((row, y) => [...row].forEach((c, x) => { if (c === '.') cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`) }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${9 * BADGE_PX}" height="${9 * BADGE_PX}" viewBox="0 0 9 9" shape-rendering="crispEdges"><g fill="${color}">${cells.join('')}</g></svg>`
}
const PIXEL_PX = 4
const PIXEL_ROWS = 9
const PIXEL_H = PIXEL_ROWS * PIXEL_PX
const DROP = '#a8573c'
// A leading mark and a space become the badge; the rest is the word.
const splitMark = (word: string) => (BADGES[word[0]] && word[1] === ' ' ? [word[0], word.slice(2)] : ['', word])
const pixelCols = (word: string) => {
  const [mark, text] = splitMark(word)
  const letters = [...text].reduce((n, c) => n + (GLYPHS[c] ?? GLYPHS[' '])[0].length + 2, -1)
  return (mark ? 12 : 0) + letters
}
const pixelWidth = (word: string) => pixelCols(word) * PIXEL_PX
function pixelWord(word: string, color: string) {
  const [mark, text] = splitMark(word)
  const ink: string[] = []
  const drop: string[] = []
  const cell = (x: number, y: number, w = 1) => `<rect x="${x}" y="${y}" width="${w}" height="1"/>`
  if (mark) {
    BADGES[mark].forEach((row, y) => [...row].forEach((c, x) => { if (c === '.') ink.push(cell(x, y)) }))
  }
  let x = mark ? 12 : 0
  for (const c of text) {
    const g = GLYPHS[c] ?? GLYPHS[' ']
    g.forEach((row, y) => [...row].forEach((on, i) => {
      if (on !== '#') return
      drop.push(cell(x + i, y + 2, 2))
      ink.push(cell(x + i, y + 1, 2))
    }))
    x += g[0].length + 2
  }
  const w = pixelCols(word)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * PIXEL_PX}" height="${PIXEL_H}" viewBox="0 0 ${w} ${PIXEL_ROWS}" shape-rendering="crispEdges"><g fill="${DROP}">${drop.join('')}</g><g fill="${color}">${ink.join('')}</g></svg>`
}
// The answer asks the person something: any of its lines ends in a question mark (markdown around it ignored), not
// only the last, since a question is often followed by options and a recommendation. Code blocks don't count.
const asks = (answer: string) =>
  answer
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .some(line => /\?\s*$/.test(line.replace(/[*_`)\]"”]+\s*$/, '')))

// What the answer asks, short enough to read at a glance under the YOUR TURN word: each question line without its markdown,
// cut to the sentence that asks when the line is long, and to a word boundary when even that is. At most three.
// Handed to the model with each prompt while textless is on: the person reads the questions under the YOUR TURN word, away
// from the rest of the answer, so each must make sense alone.
const HINT_EVERY = 20
const QUESTION_HINT = 'textless shows each question you ask the user on its own, apart from the rest of your answer. When you ask something, write each question so it makes sense alone: name what it is about (not \'it\' or \'det\'), keep it to one line ending in \'?\', and for a choice put a short question first and then the options written out (never only their letters), like \'Where does it turn white? At the first screen, or near the end?\'. textless numbers the items of a list that asks something (1, 2, 3, in your order) and letters the options of a choice (A, B, C, in your order), so the user may answer like \'1A, 2 slowly, 3 attached\': read the reply by those numbers and letters. If you recommend an answer, say it in one sentence right after the question, starting with \'I recommend\'.'

// Claude's recommendation for a question: a sentence that says so ("I recommend", "I'd suggest", "Jag föreslår", ...)
// close to the question in the answer, the nearest one winning; or an option marked "(recommended)". Shown under the
// question, so the person sees what Claude would pick.
const RECOMMEND = /\b(I(?:'d| would)? (?:recommend|suggest)|My (?:recommendation|suggestion|pick)|Recommended|Jag (?:föreslår|rekommenderar|skulle välja)|Mitt förslag|Rekommenderat)\b/i
const REC_NEAR = 600
// The recommendation as a line under its question: an orange label, then what Claude would pick.
function recommendedLine($: any, e: any, text: string) {
  const { Box, Text } = $.ui.resolve(e) as Record<string, any>
  return (
    <Box key="textless-rec" flexDirection="row" gap={1}>
      <Text color="#d97757" bold>Recommended:</Text>
      <Text wrap="wrap">{text}</Text>
    </Box>
  )
}
const REC_MAX = 170
export function recommendation(answer: string, question: string): string {
  const text = answer.replace(/```[\s\S]*?```/g, ' ')
  const marked = question.match(/([^,;?]*?)\s*\((?:recommended|rekommenderas|rekommenderat)\)/i)
  if (marked) return `${marked[1].replace(/^.*\b(?:or|eller)\s+/i, '').trim()}`
  const at = text.indexOf(question.slice(0, 40))
  if (at < 0) return ''
  const sentences = [...text.matchAll(/[^.!?\n]+[.!?]?/g)].map(m => ({ s: m[0].trim(), i: m.index ?? 0 }))
  const near = sentences
    .filter(x => RECOMMEND.test(x.s) && Math.abs(x.i - at) <= REC_NEAR && !x.s.endsWith('?'))
    .sort((a, b) => Math.abs(a.i - at) - Math.abs(b.i - at))[0]
  if (!near) return ''
  const plain = near.s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > REC_MAX ? `${plain.slice(0, REC_MAX - 1).trimEnd()}…` : plain
}
// Each option at most this long: a longer one wraps anyway, and a break at its "or" then reads as a broken sentence.
const CHOICE_MAX = 80
// A question that offers a choice, split at its "or"s (outside quotes) so each option can sit on its own line. Two
// or three options only; anything else stays one line.
function choices(q: string): { stem: string; options: string[] } {
  // A heading question first ("Where does it turn white?"), when the line has one before the choice.
  const sentences = q.split(/(?<=[?])\s+/)
  const stem = sentences.length > 1 ? sentences.slice(0, -1).join(' ') : ''
  const rest = sentences.length > 1 ? sentences[sentences.length - 1] : q
  const parts: string[] = []
  let quoted = false
  let start = 0
  const re = /["“”]|,?\s+(?:eller|or)\s+/gi
  for (let m = re.exec(rest); m; m = re.exec(rest)) {
    if (/["“”]/.test(m[0])) { quoted = !quoted; continue }
    if (quoted) continue
    parts.push(rest.slice(start, m.index))
    start = m.index + m[0].length
  }
  parts.push(rest.slice(start))
  // "A, B or C": the list before the last "or" is split at its commas too (not those inside brackets or quotes), but
  // only when it reads as a list: every item short, or every item lettered by the answer itself ("A (…), B (…)").
  // A comma inside one long option ("At the first screen, near X, or near the end") keeps it whole.
  const clean = (t: string) => t.trim().replace(/^(?:eller|or)\s+/i, '').replace(/[\s,;?]+$/, '')
  const label = /^([A-Z])(?:\s*[).:]\s*|\s+\(|\s*$)/
  if (parts.length >= 2) {
    const head = parts[0]
    const items: string[] = []
    let depth = 0
    let quote = false
    let from = 0
    for (let i = 0; i < head.length; i++) {
      const c = head[i]
      if (/["“”]/.test(c)) quote = !quote
      else if (c === '(') depth++
      else if (c === ')') depth = Math.max(0, depth - 1)
      else if (c === ',' && !depth && !quote) { items.push(head.slice(from, i)); from = i + 1 }
    }
    items.push(head.slice(from))
    const all = [...items, ...parts.slice(1)].map(clean).filter(Boolean)
    const short = all.every(t => t.split(/\s+/).length <= 3)
    const lettered = all.every(t => label.test(t))
    if (items.length > 1 && (short || lettered)) parts.splice(0, parts.length, ...all)
  }
  // Each option as a short line of its own: no trailing "?" or comma, a capital first letter. Options the answer
  // lettered itself lose that letter (A, B, C are drawn anyway, in the same order) and the brackets around the rest.
  let options = parts.map(clean).filter(Boolean)
  if (options.length >= 2 && options.every(o => label.test(o))) {
    options = options.map(o => o.replace(label, '').replace(/^\((.*)\)$/, '$1').replace(/\)$/, '').trim() || o)
  }
  options = options.map(t => t[0].toUpperCase() + t.slice(1))
  const ok = options.length >= 2 && options.length <= 5 && options.every(o => o.length >= 1 && o.length <= CHOICE_MAX)
  // Letters only under a heading question: without one the first option holds the question itself.
  return ok && stem ? { stem, options } : { stem: q, options: [] }
}

// What an answer says option `letter` is, from a line that starts with it: "A: …", "A) …", "A — …", "**A** …",
// "- A. …" or "| A | …". Markdown dropped, cut to CHOICE_MAX. Nothing when no such line is found.
function letterOption(answer: string, letter: string) {
  const re = new RegExp(`^\\s*(?:[-*+]\\s+|\\|\\s*)?(?:\\*\\*|__)?(?:Option\\s+|Alternativ\\s+)?${letter}(?:\\*\\*|__)?\\s*(?:[).:|—–-]|\\*\\*)\\s*(.+)$`, 'i')
  for (const line of answer.replace(/```[\s\S]*?```/g, '').split('\n')) {
    const m = line.match(re)
    if (!m) continue
    const text = m[1].replace(/\*\*|__|`|\|/g, '').replace(/\s+/g, ' ').trim()
    if (text.length < 2) continue
    return text.length <= CHOICE_MAX ? text : `${text.slice(0, CHOICE_MAX - 1).replace(/\s+\S*$/, '')}…`
  }
  return ''
}

// A finished answer is drawn again on every redraw of the chat, and reading it for questions, links and the next step
// took about 3 ms each time; an answer never changes, so each is read once.
function once<T>(read: (answer: string) => T): (answer: string) => T {
  const seen = new Map<string, T>()
  return answer => {
    if (seen.has(answer)) return seen.get(answer) as T
    const got = read(answer)
    if (seen.size >= 200) seen.clear()
    seen.set(answer, got)
    return got
  }
}
const nextStep = once(readNextStep)
const questions = once(readQuestions)
const withoutAsked = once(readWithoutAsked)
const resources = once(readResources)

// The next step the answer proposes, only when it says so outright: a sentence naming the next step ("Next step is…",
// "Nästa steg är…"), or an offer whose action is spelled out ("Tell me if I should X", "Säg till om jag ska X"). An
// offer that only points back ("…if I should try it") leaves nothing to show, and so does an answer without either.
const NEXT_MAX = 140
function readNextStep(answer: string): string | null {
  const text = answer
    .replace(/```[\s\S]*?```/g, ' ')
    .split('\n')
    .map(line => line.replace(/^\s*(?:#+|[-*+]|\d+[.)])\s+/, '').replace(/\*\*|__|`/g, '').trim())
    .join(' ')
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
  const cut = (s: string) => (s.length <= NEXT_MAX ? s : `${s.slice(0, NEXT_MAX - 1).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '')}…`)
  const named = sentences.find(s => /\b(nästa steg|next step)\b/i.test(s) && !/\?$/.test(s))
  if (named) return cut(named)
  for (const s of sentences) {
    const m = s.match(/^(?:säg till om (?:jag ska|du vill att jag)|tell me if (?:i should|you want me to)|let me know if (?:i should|you want me to))\s+(.+?)[.!]?$/i)
    if (m && !/^\S+\s+(det|it|that|this|den)$/i.test(m[1]) && m[1].split(/\s+/).length >= 3) return cut(m[1][0].toUpperCase() + m[1].slice(1))
  }
  return null
}

const QUESTION_MAX = 200
function readQuestions(answer: string) {
  const plain = (line: string) => line
    .replace(/^\s*(?:#+|[-*+]|\d+[.)])\s+/, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_)\]"”]+\s*$/, '')
    .trim()
  const short = (q: string) => {
    if (q.length <= QUESTION_MAX) return q
    const parts = q.split(/(?<=[.!?:])\s+/)
    // From the first question on: it is usually the one that says what is asked ("Where does it turn white? At the
    // start, or near the end?"), and the sentences after it only narrow it down.
    const first = parts.findIndex(p => /\?$/.test(p))
    const fromFirst = first >= 0 ? parts.slice(first).join(' ') : ''
    if (fromFirst && fromFirst.length <= QUESTION_MAX) return fromFirst
    // Still too long: the last sentence, with the one before it when it only continues that one ("Or should I…?").
    let at = parts.length - 1
    while (at > 0 && /^(eller|or|och|and|men|but|annars|otherwise)\b/i.test(parts[at])) at--
    const asked = parts.slice(at).join(' ')
    const s = asked.length >= 12 ? asked[0].toUpperCase() + asked.slice(1) : q
    return s.length <= QUESTION_MAX ? s : `${s.slice(0, QUESTION_MAX - 1).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '')}…`
  }
  // A list that asks something is shown whole, so its other items (a screenshot to send, a step to take) come along
  // and the numbers match the answer's own list. Outside a list, only the lines that ask.
  const lines = answer.replace(/```[\s\S]*?```/g, '').split('\n')
  const isItem = (line: string) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(line)
  const out: { text: string; optional: boolean; asks: boolean; raw: string }[] = []
  const add = (line: string) => {
    const text = plain(line)
    if (!text) return
    const asks = /\?$/.test(text)
    const cut = asks ? short(text) : text.length <= QUESTION_MAX ? text : `${text.slice(0, QUESTION_MAX - 1).replace(/\s+\S*$/, '')}…`
    out.push({ text: cut, asks, raw: line.trim(), optional: !asks && /\b(om du kan|om möjligt|valfritt|if you can|if possible|optional)\b/i.test(text) })
  }
  for (let i = 0; i < lines.length; i++) {
    if (!isItem(lines[i])) {
      if (/\?$/.test(plain(lines[i]))) add(lines[i])
      continue
    }
    // One list is one kind of marker: bullets then a numbered list are two lists (options described, then the
    // questions), so the bullets do not join the numbered questions.
    const kind = (line: string) => (/^\s*\d+[.)]\s+/.test(line) ? 'n' : 'b')
    const k = kind(lines[i])
    let j = i
    while (j < lines.length && ((isItem(lines[j]) && kind(lines[j]) === k) || (!lines[j].trim() && j + 1 < lines.length && isItem(lines[j + 1]) && kind(lines[j + 1]) === k))) j++
    const items = lines.slice(i, j).filter(isItem)
    if (items.some(l => /\?$/.test(plain(l)))) items.forEach(add)
    i = j - 1
  }
  return out.slice(-5)
}

// The answer without the lines the list under the YOUR TURN word shows, so each question reads once, in the styled list.
// Only those exact lines go (outside code blocks); everything else, links and code blocks included, stays.
function readWithoutAsked(answer: string) {
  const gone = new Set(questions(answer).map(q => q.raw))
  if (!gone.size) return answer
  let fenced = false
  const kept = answer.split('\n').filter(line => {
    if (/^\s*```/.test(line)) fenced = !fenced
    return fenced || !gone.has(line.trim())
  })
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// A plain finished turn ends on a thin orange pixel line instead of a word: dithered, densest in the middle and
// thinning out to both ends, different for every turn (seeded by its index) but the same on every redraw.
// The plain DONE line: a small pixel tick on the left, then one clean orange line, 3 px tall, fading out to the
// right, with a slow wave of brightness flowing along it (TIDE). The wave starts as far into its 6 s loop as the wall
// clock is, so a redraw of the card lands where the last drawing was instead of jumping. The seed keeps ids apart.
const TIDE_S = 6
const LINE_COLS = 100
const LINE_ROWS = 5
const LINE_W = LINE_COLS * 3
const LINE_H = LINE_ROWS * 3
// A clean 7x5 tick, one pixel thick: a short stroke down into the corner, a long one up to the right.
const TICK = [[6, 0], [5, 1], [0, 2], [4, 2], [1, 3], [3, 3], [2, 4]]
function pixelLine(seed: number, nowMs: number) {
  const ago = ((nowMs / 1000) % TIDE_S).toFixed(2)
  const x0 = 10
  const w = LINE_COLS - x0
  const defs = `<defs><linearGradient id="ln${seed}" x1="0" y1="0" x2="1" y2="0">`
    + '<stop offset="0" stop-color="#d97757"/><stop offset="0.7" stop-color="#d97757"/><stop offset="1" stop-color="#d97757" stop-opacity="0"/></linearGradient>'
    + `<linearGradient id="td${seed}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="48" y2="0" spreadMethod="repeat">`
    + '<stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0.45"/>'
    + `<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="48 0" begin="-${ago}s" dur="${TIDE_S}s" repeatCount="indefinite"/>`
    + `</linearGradient><mask id="tm${seed}" maskUnits="userSpaceOnUse" x="0" y="0" width="${LINE_COLS}" height="${LINE_ROWS}"><rect width="${LINE_COLS}" height="${LINE_ROWS}" fill="url(#td${seed})"/></mask></defs>`
  const tick = TICK.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LINE_W}" height="${LINE_H}" viewBox="0 0 ${LINE_COLS} ${LINE_ROWS}">${defs}`
    + `<g fill="#d97757" shape-rendering="crispEdges">${tick}</g>`
    + `<rect x="${x0}" y="2" width="${w}" height="1" fill="url(#ln${seed})" mask="url(#tm${seed})"/></svg>`
}

// What the answer hands over to use: its web addresses and its short code blocks (a command to run, a line to paste),
// at most three, each with a copy button, so they need not be found again in the text above.
function readResources(answer: string) {
  const out: { kind: 'link' | 'code'; text: string }[] = []
  const seen = new Set<string>()
  const put = (kind: 'link' | 'code', text: string) => {
    const t = text.trim()
    if (!t || seen.has(t) || out.length >= 3) return
    seen.add(t)
    out.push({ kind, text: t })
  }
  for (const m of answer.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    const body = m[1].trim()
    if (body.split('\n').length > 3) continue
    if (/^https?:\/\/\S+$/.test(body)) put('link', body)
    else put('code', body)
  }
  const prose = answer.replace(/```[\s\S]*?```/g, ' ')
  for (const m of prose.matchAll(/https?:\/\/[^\s)<>"'`\]]+/g)) put('link', m[0].replace(/[.,;:!?]+$/, ''))
  return out
}

// The copy button says Copied for 2 s after a press, so it is clear it worked.
let copied = ''
function copyResource($: any, text: string, id: string, surface: any) {
  void $.ui.copy({ text, surface })
  copied = id
  $.ui.invalidate('ui.render')
  $.clock.after(2000, () => { if (copied === id) { copied = ''; $.ui.invalidate('ui.render') } })
}

async function resourceRows($: any, e: any, d: Done, at: number, next?: any) {
  const list = resources(d.answer)
  if (!list.length) return null
  // Each in a box like the app's own code blocks: a faint rounded border, the text, and a copy icon at the right end
  // that turns into a tick for 2 s once pressed. (Asking the app to draw a second code block here shows nothing.)
  const { Box, Text, Button } = $.ui.resolve(e) as Record<string, any>
  const line = isLight ? '#d4d4d4' : '#3a3a3a'
  const fill = isLight ? '#f5f5f5' : '#1f1f1f'
  return (
    <Box key={`done-${at}-res`} flexDirection="column" gap={1}>
      {list.map((r, i) => (
        <Box key={`done-${at}-res-${i}`} flexDirection="row" alignItems="center" justifyContent="space-between" gap={2}
          borderStyle="round" borderColor={line} backgroundColor={fill} paddingX={2} paddingY={0}>
          <Text wrap="truncate">{r.text.replace(/\n/g, ' ⏎ ')}</Text>
          <Button key={`done-${at}-res-${i}-copy`} plain dimColor={copied !== `${at}-${i}`} label={copied === `${at}-${i}` ? '✓' : '⧉'}
            hover={{ scope: `done-${at}-res-${i}-copy`, backgroundColor: hoverBg() }}
            onPress={(press: any) => copyResource($, r.text, `${at}-${i}`, press?.surface)} />
        </Box>
      ))}
    </Box>
  )
}

// The proposed next step under a finished turn, in Claude's orange, when the answer names one clearly.
function nextRow($: any, e: any, d: Done, at: number) {
  const step = nextStep(d.answer)
  if (!step) return null
  const { Box, Text } = $.ui.resolve(e) as Record<string, any>
  return (
    <Box key={`done-${at}-next`} flexDirection="row" gap={1} paddingLeft={1}>
      <Text color="#d97757" bold>→ Next</Text>
      <Text wrap="wrap">{step}</Text>
    </Box>
  )
}

// The steps of a finished turn, one dim line each, numbered.
function stepList($: any, e: any, d: Done, at: number) {
  const { Box, Text } = $.ui.resolve(e) as Record<string, any>
  return (
    <Box key={`done-${at}-steps`} flexDirection="column" paddingLeft={2}>
      {d.labels.map((l, i) => <Text key={`done-${at}-step-${i}`} dimColor wrap="truncate">{`${i + 1}. ${l}`}</Text>)}
    </Box>
  )
}

// Turns shorter than this get a quiet line under the answer, not the big word.
const SMALL_TURN_MS = 20 * 1000

// Under a finished turn's answer: one big pixel word, ✓ DONE, or YOUR TURN / NEED YOUR INPUT when the answer needs the person, with
// the steps, the time and the switch that shows them beside it. A short turn gets a quiet line instead.
// Under a finished turn's answer: the answer, then the done row.
async function doneCard($: any, e: any, next: any, at: number) {
  const { Box } = $.ui.resolve(e) as Record<string, any>
  // The questions the list below shows leave the answer text, so each reads once; links and code blocks stay in it,
  // drawn by the app with its own copy button.
  const d = done[at]
  // With cover mode on, the cover card shows the questions: the answer keeps them and the done row does not repeat them.
  const strip = summaryOn && !coverOn && !d.stopped && asks(d.answer)
  const inner = await next(strip ? { ...e, props: { ...(e.props ?? {}), text: withoutAsked(String((e.props as any)?.text ?? '')) } } : e)
  return (
    <Box key={`done-${at}`} flexDirection="column" gap={1}>
      {inner}
      {await doneRow($, e, at, next)}
      {(await chatOf($)).newestAt === at ? await updBelow($, e) : null}
      {(await chatOf($)).newestAt === at ? (await chessOwns($), chessBelow($, e)) : null}
    </Box>
  )
}

// The done row: STOPPED and YOUR TURN / NEED YOUR INPUT as the big pixel word with its badge, a plain finish as the orange line, with
// the steps, the time and show steps beside it; the steps listed under it when shown. A short plain finish gets only
// a quiet mark: a stop or a question always gets the word, however short the turn.
async function doneRow($: any, e: any, at: number, next?: any) {
  const d = done[at]
  const { Box, Text, Button, Svg } = $.ui.resolve(e) as Record<string, any>
  const ask = !d.stopped && asks(d.answer)
  const plain = !d.stopped && !ask
  // Commands when every step ran one (Bash, PowerShell), steps when it also read, edited or searched.
  const noun = d.labels.length > 0 && d.labels.every(l => /^(Bash|PowerShell)/.test(l)) ? 'command' : 'step'
  const facts = `${d.steps} ${noun}${d.steps === 1 ? '' : 's'} · ${clock(d.ms)}`
  // The done line is part of what shows under answers: off, only the way to the steps stays.
  // Under the newest answer the row also carries textless's buttons, at its end.
  if (!summaryOn) {
    const show = <Button key={`done-${at}-btn`} plain dimColor label={d.open ? `hide ${noun}s` : `show ${noun}s`} onPress={() => unfold($, at)} />
    const chat = await chatOf($)
    if (chat.newestAt === at || (d.answer && isNewest(chat, d.answer))) {
      await refreshTheme($)
      const drawn = { chat, id: String(await $.session.id().catch(() => '')) }
      return (
        <Box key={`done-${at}-row`} flexDirection="row" alignItems="center">
          {show}
          {backgroundLine($, e, chat)}
          <Box flexGrow={1} />
          {controls($, e, drawn)}
        </Box>
      )
    }
    return (
      <Box key={`done-${at}-row`} flexDirection="row">
        {show}
      </Box>
    )
  }
  // Only questions: the word says so. Anything to do as well: it hands over, YOUR TURN and OVER TO YOU taking turns
  // from one done row to the next so the wording stays fresh.
  const items = ask ? questions(d.answer) : []
  const onlyAsks = items.length > 0 && items.every(q => q.asks)
  const word = d.stopped ? '■ STOPPED'
    : onlyAsks ? '? NEED YOUR INPUT'
    : at % 2 ? '→ OVER TO YOU' : '▶ YOUR TURN'
  const said = word.slice(2).toLowerCase().replace(/^./, c => c.toUpperCase())
  const mark = !Svg
    ? <Text color="#d97757">{d.stopped ? '■' : ask ? '?' : '✓'}</Text>
    : !plain
    ? <Svg source={pixelWord(word, '#d97757')} alt={said} width={pixelWidth(word)} height={PIXEL_H} />
    : d.ms >= SMALL_TURN_MS
    ? <Svg source={pixelLine(at, await $.clock.now())} alt="Done" width={LINE_W} height={LINE_H} />
    : <Text color="#d97757">✓</Text>
  return (
    <Box key={`done-${at}-row`} flexDirection="column" gap={1}>
      <Box key={`done-${at}-card`} flexDirection="row" flexWrap="wrap" alignItems="center" gap={2}>
        {mark}
        <Text dimColor>{facts}</Text>
        <Button key={`done-${at}-btn`} plain dimColor label={d.open ? `hide ${noun}s` : `show ${noun}s`} onPress={() => unfold($, at)} />
      </Box>
      {ask && summaryOn && !coverOn
        // One question reads as it is; several get an orange number each, with air between them.
        ? <Box key={`done-${at}-asks`} flexDirection="column" paddingLeft={1}>
            {questions(d.answer).flatMap((q, i, all) => [
              // A thin orange line between questions, so each reads as its own.
              i > 0 ? <Text key={`done-${at}-sep-${i}`} color="#d97757">{'─'.repeat(16)}</Text> : null,
              <Box key={`done-${at}-ask-${i}`} flexDirection="row" alignItems="flex-start" gap={1}>
                {all.length > 1 ? <Text color="#d97757" bold>{`${i + 1}`}</Text> : null}
                {/* What it is at a glance: a question to answer, or a thing to do. */}
                {Svg
                  ? <Svg source={badgeSvg(q.asks ? '?' : '☐', '#d97757')} alt={q.asks ? 'Question' : 'To do'} width={9 * BADGE_PX} height={9 * BADGE_PX} />
                  : <Text color="#d97757">{q.asks ? '?' : '☐'}</Text>}
                {/* A choice reads as its question, then each option on a line of its own after an orange letter. */}
                <Box flexDirection="column">
                  {(() => {
                    const c = choices(q.text)
                    // "A, B or C?" with the options described further up in the answer: take each one's text from there.
                    if (c.options.length && c.options.every((o, j) => o === String.fromCharCode(65 + j))) {
                      const found = c.options.map(o => letterOption(d.answer, o))
                      if (found.every(Boolean)) c.options = found as string[]
                    }
                    return [
                      c.stem ? <Text key={`done-${at}-ask-${i}-q`} bold wrap="wrap">{c.stem}</Text> : null,
                      q.asks && recommendation(d.answer, q.raw || q.text) ? recommendedLine($, e, recommendation(d.answer, q.raw || q.text)) : null,
                      q.optional ? <Text key={`done-${at}-ask-${i}-opt`} color="#d97757">(optional)</Text> : null,
                      // Options that are only their own letters ("A, B or C?") read as one row of letters.
                      c.options.every((o, j) => o === String.fromCharCode(65 + j))
                        ? <Box key={`done-${at}-ask-${i}-letters`} flexDirection="row" gap={3}>
                            {c.options.map((o, j) => <Text key={`done-${at}-ask-${i}-l${j}`} color="#d97757" bold>{o}</Text>)}
                          </Box>
                        : null,
                      ...(c.options.every((o, j) => o === String.fromCharCode(65 + j)) ? [] : c.options).map((o, j) => (
                        <Box key={`done-${at}-ask-${i}-${j}`} flexDirection="row" gap={1}>
                          <Text color="#d97757" bold>{String.fromCharCode(65 + j)}</Text>
                          <Text wrap="wrap">{o}</Text>
                        </Box>
                      )),
                    ]
                  })()}
                </Box>
              </Box>,
            ])}
          </Box>
        : null}
      {summaryOn ? nextRow($, e, d, at) : null}
      {d.open ? stepList($, e, d, at) : null}
    </Box>
  )
}

// Light or dark, from the app's theme setting (as effortless reads it), checked at most every 4 s. The strip's hover
// box is a shade off the strip's own colour: dark grey on dark, a pale grey on light.
let isLight = false
let themeCheckedAt = 0
async function refreshTheme($: any) {
  const now = Date.now()
  if (now - themeCheckedAt < 4000) return
  themeCheckedAt = now
  const rows = await $.config.list().catch(() => [])
  const value = (rows as any[]).find(row => row.key === 'theme')?.value
  const light = typeof value === 'string' && value.startsWith('light')
  if (light === isLight) return
  isLight = light
  $.ui.invalidate('ui.render')
}
const hoverBg = () => (isLight ? '#e8e5df' : '#2a2a2e')
// Text lit by the pointer where no box can show it (the app's hover box on a blank button covered the "Aa" under it).
const hoverText = () => (isLight ? '#1a1a1a' : '#f2f2f2')

// A turn starts: from the person's prompt, or from Claude's own first step when nothing was sent (a background task
// woke it). Every row already drawn is old; the card shows once the turn has run a few seconds.
async function startTurn($: any, chat: Chat, text: string) {
  chat.running = true
  // A chat uncovered with Show the chat is covered again as soon as Claude starts on the next message.
  chat.uncovered = false
  chat.planKey = undefined
  chat.mainDone = false
  chat.listed = false
  chat.fullAnyway = false
  chat.prompt = text
  dbg($, `turn start on=${chat.on} text=${chat.prompt.slice(0, 40)}`)
  chat.baselineUntil = Date.now() + BASELINE_MS
  // Every row drawn once now, inside the window, so what the chat already holds is known before the card shows.
  $.ui.invalidate('ui.render')
  // The person's row takes only a text rewrite, not a drawing, so the card lives in the turn's first step instead.
  chat.underPrompt = false
  chat.working = chat.on
  chat.long = false
  chat.turns += 1
  await loadOwn($)
  await loadBuiltIn($)
  chat.sceneAt = pick === null ? chooseScene($) : -1
  chat.startedAt = await $.clock.now()
  chat.steps = []
  chat.cardKey = ''
  chat.timer?.cancel()
  // Only once a step exists: the card lives in a step row, so a plain text answer with no steps would otherwise be
  // hidden after 3 s with nothing in its place until it finished. A later first step goes long through track().
  chat.timer = $.clock.after(LONG_AFTER_MS, () => { if (chat.steps.length > 0) goLong($, chat) })
}

// The update card (see update.tsx for its look and the pure parts).
// One updCard for every chat: the module is shared by the chats of this app.
let updCard: UpdateCard | null = null
let updLastCheck = 'not checked yet'
let updLoaded = false
let updTimer: { cancel: () => void } | null = null

function setCard($: any, next: UpdateCard | null) {
  updCard = next
  $.ui.invalidate('ui.render')
}


// This install's id: textless@<the marketplace it came from>, read off the cache folder it runs from.
const pluginId = ($: any) => `textless@${String($.plugin.root).match(/cache[\\/]([^\\/]+)[\\/]/)?.[1] ?? 'effortless'}`
const pluginsHomeOf = ($: any) => String($.plugin.root).replace(/[\\/]cache[\\/].*$/, '')

async function installedVersion($: any): Promise<string | undefined> {
  const text = await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`).catch(() => '')
  try {
    const v = (JSON.parse(typeof text === 'string' ? text : '') as { version?: unknown }).version
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}

async function updHome($: any): Promise<string | undefined> {
  return String((await $.env.get('USERPROFILE').catch(() => '')) || (await $.env.get('HOME').catch(() => '')) || '') || undefined
}

async function runClaudeCli($: any, args: string[], opts: Record<string, unknown>) {
  let last: unknown
  for (const bin of claudeCandidates(await updHome($))) {
    try {
      return (await $.process.run([bin, ...args], opts)) as { exitCode: number; stdout: string; stderr: string }
    } catch (error) {
      last = error
      if (!NOT_STARTED.test(String(error))) throw error
    }
  }
  throw last
}

/** public.json from the stable branch, read with git: no web cache in the way. Nothing before textless is public there. */
async function latestFromGit($: any): Promise<Release | undefined> {
  const dir = `${pluginsHomeOf($)}/data/textless-release-check`
  const git = (...args: string[]) => $.process.run(['git', '-C', dir, ...args], { timeoutMs: 60_000 })
  if ((await git('rev-parse', '--git-dir').catch(() => null))?.exitCode !== 0) {
    await $.process.run(['git', 'init', '-q', dir], { timeoutMs: 30_000 })
    await git('remote', 'add', 'origin', 'https://github.com/HeyCubit/effortless.git')
  }
  const fetched = await git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', 'stable')
  if (fetched.exitCode !== 0) return undefined
  const shown = await git('show', `FETCH_HEAD:${RELEASES_PATH}`)
  return shown.exitCode === 0 ? latestRelease(shown.stdout) : undefined
}


/** public.json in the marketplace's copy on this computer, after `claude plugin marketplace update`. */
async function latestFromMarketplace($: any): Promise<Release | undefined> {
  const name = pluginId($).split('@')[1]
  await runClaudeCli($, ['plugin', 'marketplace', 'update', name], { timeoutMs: 120_000, env: GITHUB_OVER_HTTPS }).catch(() => null)
  const known = await $.fs.read(`${pluginsHomeOf($)}/known_marketplaces.json`).catch(() => '')
  let at = `${pluginsHomeOf($)}/marketplaces/${name}`
  try {
    const loc = (JSON.parse(String(known)) as Record<string, { installLocation?: unknown }>)[name]?.installLocation
    if (typeof loc === 'string' && loc) at = loc
  } catch { /* the default place */ }
  const dir = pluginDirIn(String(await $.fs.read(`${at}/.claude-plugin/marketplace.json`).catch(() => ''))) ?? 'textless/plugin'
  return latestRelease(String(await $.fs.read(`${at}/${dir}/public.json`).catch(() => '')))
}

/** The newest public release: git first; where git is missing or offline, the web and the marketplace's copy. */
async function latestAvailable($: any): Promise<{ latest?: Release; how: string }> {
  const fromGit = await latestFromGit($).catch(() => undefined)
  const res = fromGit ? null : await $.http.fetch(`${RELEASES_URL}&t=${Date.now()}`, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'textless' } }).catch((error: unknown) => ({ ok: false, status: 0, text: String(error) }))
  const fromWeb = res?.ok ? latestRelease(res.text) : undefined
  const local = await latestFromMarketplace($).catch(() => undefined)
  const best = [fromGit, fromWeb, local].filter((r): r is Release => !!r).reduce<Release | undefined>((a, r) => (!a || isNewer(r.version, a.version) ? r : a), undefined)
  return { latest: best, how: `git ${fromGit?.version ?? '-'}; web ${fromWeb?.version ?? (res ? `- (${res.status})` : 'skipped')}; marketplace ${local?.version ?? '-'}` }
}

/** Looks for a newer version and offers it, unless Later put that version away less than a day ago. */
async function checkUpdate($: any) {
  if (updCard && updCard.stage !== 'offer') {
    updLastCheck = `skipped while the ${updCard.stage} card shows`
    return
  }
  const { latest, how } = await latestAvailable($)
  const mine = await installedVersion($)
  updLastCheck = `installed ${mine ?? 'unreadable'}; ${how}`
  if (!latest || !mine || !isNewer(latest.version, mine)) {
    if (updCard) setCard($, null)
    return
  }
  // A copy run straight from a folder is not an install: there is nothing for the card's Update to do.
  // (TEXTLESS_OFFER_ANYWHERE=1 is for the tests, which run from a plain folder.)
  if (!/[\\/]cache[\\/]/.test(String($.plugin.root)) && String(await $.env.get('TEXTLESS_OFFER_ANYWHERE').catch(() => '')) !== '1') return
  const now = await $.clock.now()
  const hidden = (await $.store.get('updateHidden').catch(() => null)) as { version: string; at: number } | null
  if (updateSnoozed(hidden, latest.version, now)) return
  if (updCard?.version !== latest.version) setCard($, { stage: 'offer', version: latest.version, note: latest.note, at: now })
}

/** /textless update: look now, ignoring Later, and say what was found. */
async function checkUpdateNow($: any): Promise<string> {
  await $.store.set('updateHidden', null).catch(() => undefined)
  if (updCard && (updCard.stage === 'done' || updCard.stage === 'failed')) updCard = null
  await checkUpdate($).catch((error: unknown) => { updLastCheck = `check failed: ${String(error).slice(0, 120)}` })
  if (updCard?.stage === 'offer') return `textless ${updCard.version} is out: press Update on the card under the newest answer, or run /textless update now if the card is not there. (${updLastCheck})`
  // Run from a folder (a local marketplace or --plugin-dir), not a downloaded copy: the folder itself is the version,
  // so "up to date" says nothing.
  if (!/[\\/]cache[\\/]/.test(String($.plugin.root))) return `textless runs straight from its folder here (${$.plugin.root}), so it is always the version in that folder. The update card is for installs from GitHub. (${updLastCheck})`
  return `textless is up to date. (${updLastCheck})`
}


// The desktop app keeps a chat on the folder it started with, and a reload reads that folder again: so the new
// version's files go into it, or the reload would bring back the old code.
async function syncRunningCopy($: any) {
  const record = JSON.parse(String(await $.fs.read(`${pluginsHomeOf($)}/installed_plugins.json`))) as { plugins?: Record<string, { installPath?: unknown }[]> }
  const installed = record.plugins?.[pluginId($)]?.map(x => x.installPath).filter((x): x is string => typeof x === 'string').at(-1)
  const argv = syncPlan(String($.plugin.root), installed)
  if (!argv) return
  const r = await $.process.run(argv, { timeoutMs: 120_000 })
  if (argv[0] === 'robocopy' ? r.exitCode >= 8 : r.exitCode !== 0) throw new Error(`copy failed (${r.exitCode})`)
}

let updTyped = ''
// Types a command into an empty prompt box for the person to send with Enter, where the app takes none from a plugin.
async function typeUpdCommand($: any, text: string): Promise<boolean> {
  try {
    const draft = String((await $.prompt.read()).text ?? '').trim()
    if (draft !== '' && draft !== updTyped) return false
    const filled = await $.prompt.fill({ text })
    if (filled.isFilled) updTyped = text
    return !!filled.isFilled
  } catch {
    return false
  }
}

/** Update pressed: the marketplace and the plugin are updated as `claude plugin` does, then the plugins reloaded. */
async function runUpdate($: any, from: UpdateCard) {
  setCard($, { ...from, stage: 'updating' })
  const step = async (args: string[]) => {
    const r = await runClaudeCli($, args, { timeoutMs: 180_000, env: GITHUB_OVER_HTTPS })
    if (r.exitCode !== 0) throw new Error(updateFailure(r.stderr || r.stdout) || `claude ${args.join(' ')} failed`)
  }
  try {
    await step(['plugin', 'marketplace', 'update', pluginId($).split('@')[1]])
    await step(['plugin', 'update', pluginId($)])
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error)
    // A copy run straight from a folder (a developer's) is not an install, so there is nothing for the CLI to update.
    const notInstalled = /not installed/i.test(message) ? 'textless runs straight from a folder on this computer, so there is nothing to update here. Update that folder.' : undefined
    setCard($, { ...from, stage: 'failed', detail: notInstalled ?? noClaudeHint(message, await updHome($)) ?? message })
    return
  }
  await syncRunningCopy($).catch(() => undefined)
  const now = await $.clock.now()
  await $.store.set('updatedTo', { version: from.version, note: from.note, at: now })
  setCard($, { ...from, stage: 'done', at: now, detail: UPDATE_LOADING })
  const reloaded = await $.command.run({ command: 'reload-plugins', args: RELOAD_ARGS }).then(() => true, () => false)
  if (!reloaded && (await typeUpdCommand($, `/reload-plugins ${RELOAD_ARGS}`))) setCard($, updCard ? { ...updCard, detail: 'Press Enter to load it' } : updCard)
  // Still this code's words after a while: the reload did not load the new version, so a new chat has to.
  $.clock.after(UPDATE_LOAD_WAIT_MS, () => { if (updCard && updCard.at === now && updCard.detail === UPDATE_LOADING) setCard($, { ...updCard, detail: NEW_CHAT }) })
}

/** Once per load: "Updated" when this load is the version the updCard installed, then a look for a newer one, and every
 * six hours after. A reload has no session start, so the first draw runs it too. */
async function afterLoad($: any) {
  if (updLoaded) return
  updLoaded = true
  updTimer?.cancel()
  updTimer = $.clock.every(UPDATE_CHECK_MS, () => void checkUpdate($).catch(() => undefined))
  const updatedTo = (await $.store.get('updatedTo').catch(() => null)) as { version: string; note: string; at: number } | null
  if (updatedTo && typeof updatedTo.version === 'string') {
    await $.store.set('updatedTo', null).catch(() => undefined)
    const fresh = (await installedVersion($)) === updatedTo.version
    setCard($, { stage: 'done', version: updatedTo.version, note: updatedTo.note, at: await $.clock.now(), ...(fresh ? {} : { detail: NEW_CHAT }) })
  }
  await checkUpdate($).catch(() => undefined)
}

/** /textless card offer|updating|done|failed|off: draws the updCard with made-up words, to look at it. */
async function previewCard($: any, stage: string): Promise<string> {
  if (stage === 'off') {
    setCard($, null)
    return 'Update card cleared.'
  }
  if (!['offer', 'updating', 'done', 'failed'].includes(stage)) return 'Use /textless card offer, updating, done, failed or off.'
  setCard($, { stage: stage as UpdateCard['stage'], version: '9.9.9', note: 'Questions from Claude show as a numbered list under its answer.', at: await $.clock.now(), ...(stage === 'done' ? { detail: 'Loaded in this chat.' } : stage === 'failed' ? { detail: 'could not reach github.com' } : {}) })
  return `The update card shows its "${stage}" look (a preview). /textless card off clears it.`
}


/** The updCard to draw above the prompt now, or null. Desktop only: the terminal has /textless update. */
// The update card under the newest answer. The spot above the prompt is no use for it: effortless draws its own strip
// there and, in its usual layout, never hands that spot on, so a hook of ours there does not run beside it.
async function updBelow($: any, e: any) {
  const upd = await shownUpdateCard($, String(e.surface ?? ''))
  return upd ? updateCardOf($, e, upd) : null
}

let lastBand = ''
async function shownUpdateCard($: any, surface: string): Promise<UpdateCard | null> {
  if (surface === 'terminal' || !updCard) return null
  if (updCard.stage === 'done' && (await $.clock.now()) - updCard.at >= UPDATED_CARD_MS) return null
  if (updCard.stage === 'done') $.clock.after(UPDATED_CARD_MS + 100, () => $.ui.invalidate('ui.render'))
  return updCard
}


// The update card, drawn with what each of its presses does.
function updateCardOf($: any, e: any, c: UpdateCard) {
  const share = async () => {
    const r = await $.ui.copy({ text: SITE_URL, surface: e.surface }).catch(() => ({ isCopied: false }))
    $.ui.toast(r?.isCopied ? 'Link copied. Send it to a friend.' : 'textless: could not copy the link')
  }
  const hide = async () => {
    if (c.stage === 'offer') await $.store.set('updateHidden', { version: c.version, at: await $.clock.now() }).catch(() => undefined)
    setCard($, null)
  }
  const copy = async (text: string) => {
    const r = await $.ui.copy({ text, surface: e.surface }).catch(() => ({ isCopied: false }))
    $.ui.toast(r?.isCopied ? 'Install command copied. Paste it in PowerShell or Terminal, then reopen the app.' : `textless: run ${text}`)
  }
  return updateCardTree($.ui.resolve(e), c, { update: () => void runUpdate($, c), hide: () => void hide(), share: () => void share(), copy: t => void copy(t), id: pluginId($) })
}

// ---- Chess with Claude ----
// Chess against Claude, in the chat. The board sits above the prompt: a click on a piece and a click on where it goes
// plays the person's move (white), sent as a message; Claude answers in the chat and ends with a MOVE: line, which this
// module reads, checks against the rules and plays. The rules live here, so Claude only ever chooses a move.

type ChessGame = {
  fen: string
  moves: string[]
  waiting: 'you' | 'claude'
  // Who answers: the engine inside textless (the default: instant, no tokens) or Claude itself, one chat turn a move.
  vs?: 'engine' | 'claude'
  // How hard the engine plays; hard when not set.
  level?: ChessLevel
  // The side the person plays, drawn at the bottom; white when not set. Chosen by chance for each new game.
  side?: 'w' | 'b'
  // Claude's tries at a legal move this turn; after two misses a legal move is played for it so the game never stalls.
  tries: number
  last?: [number, number]
  over?: string
  // Only the title line is drawn; the sounds are off.
  mini?: boolean
  quiet?: boolean
}

const CHESS_KEY = 'chess'
const CHESS_GLYPH: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const CHESS_LIGHT = '#c9b49a'
const CHESS_DARK = '#8f6a52'
const CHESS_PICKED = '#7a9e5c'
const CHESS_TARGET = '#a6c081'
const CHESS_LAST = '#b8a07e'

let chessGame: ChessGame | null = null
let chessLoaded = false
let chessPicked: number | null = null
const CHESS_MARK = '\n\n[textless chess, for Claude]\n'

// One board at a time across chats: the game is kept for every chat, and the chat that started or took it last owns it.
// The others draw nothing for it, and a click there does nothing. A chat checks with the store when it draws.
const CHESS_OWNER = 'chessOwner'
let chessOwned = true
async function chessOwns($: any, claim = false): Promise<boolean> {
  try {
    const id = String(await $.session.id().catch(() => 'unknown'))
    const owner = await $.store.get(CHESS_OWNER).catch(() => null)
    if (!owner || claim) {
      await $.store.set(CHESS_OWNER, id).catch(() => undefined)
      chessOwned = true
    } else chessOwned = owner === id
  } catch {
    chessOwned = true
  }
  return chessOwned
}

// This chat takes the game from the chat that had it, with the moves it made there.
async function chessTake($: any) {
  if (await chessOwns($)) return
  await chessOwns($, true)
  chessLoaded = false
  chessGame = null
  chessPicked = null
  await chessLoad($)
}

async function chessLoad($: any) {
  if (chessLoaded) return
  chessLoaded = true
  const saved = await $.store.get(CHESS_KEY).catch(() => null)
  if (saved && typeof saved === 'object' && typeof (saved as ChessGame).fen === 'string') chessGame = saved as ChessGame
}

async function chessSave($: any) {
  await $.store.set(CHESS_KEY, chessGame).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

const CHESS_ENDINGS: Record<Exclude<Outcome, null>, string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate, a draw',
  fifty: 'Draw by the fifty-move rule',
  material: 'Draw, neither side can mate',
}

function chessEnding(p: Position): string | undefined {
  const o = outcome(p)
  if (!o) return undefined
  const rival = chessGame?.vs === 'claude' ? 'Claude' : 'The computer'
  // The side to move is the one mated.
  if (o === 'checkmate') return p.turn === (chessGame?.side ?? 'w') ? `Checkmate. ${rival} wins.` : 'Checkmate. You win!'
  return `${CHESS_ENDINGS[o]}.`
}

function chessContextFor(p: Position, g: ChessGame): string {
  const legal = legalMoves(p).map(uci).join(' ')
  return [
    `textless chess: you are playing ${g.side === 'b' ? 'white' : 'black'} against the person, in this chat. The textless mod keeps the board and the rules; you only choose your move.`,
    `Position (FEN): ${toFen(p)}`,
    `Board, white at the bottom (capitals are white):\n${picture(p)}`,
    `Moves so far: ${g.moves.join(' ') || '(none)'}`,
    `Your legal moves: ${legal}`,
    `Choose one of those legal moves and play to win. Answer in one or two short, friendly sentences, like an opponent across the board, with no lists and no questions. Use no tools. End with a line that is exactly "MOVE: " and the move as written in the list, for example "MOVE: ${g.side === 'b' ? 'e2e4' : 'e7e5'}".`,
  ].join('\n')
}

// The move goes to Claude with the position and its legal moves under a marker. A plugin's own prompt never passes
// its own prompt.submit hook, so the position cannot ride along as hidden context; the chat shows the message only up
// to the marker instead (see chessShown).
async function chessAsk($: any, text: string) {
  const g = chessGame!
  const full = `${text}${CHESS_MARK}${chessContextFor(parseFen(g.fen), g)}`
  await $.prompt.submit({ text: full, asUser: true }).catch(() => $.ui.toast('textless chess: could not send the move to Claude.'))
}

// A chess message as the chat draws it: the line the person would have said, without the position under it.
function chessShown(e: any): any {
  const text = String(e.props?.text ?? '')
  const cut = text.indexOf(CHESS_MARK)
  return cut < 0 ? e : { ...e, props: { ...e.props, text: text.slice(0, cut) } }
}

// A short sound for a move: wav files in hooks/sounds, played by the system's own player (the app's audio call plays
// nothing in a Windows terminal). Fire and forget; off when the game says quiet.
// Your own sounds win: a wav named move, capture, check or end in ~/.claude/textless/sounds replaces the bundled one.
// Either folder may hold several of a kind (move.wav, movealt1.wav, movealt2.wav ...): one is picked by chance, so a
// run of moves is not one click repeated.
const soundFolders = new Map<string, Promise<{ dir: string; names: string[] }>>()
async function soundIn($: any, dir: string, kind: string): Promise<string | null> {
  if (!soundFolders.has(dir)) {
    soundFolders.set(dir, Promise.resolve($.fs.list(dir)).catch(() => []).then((list: any) => ({ dir, names: (list as { name: string }[]).map(f => f.name) })))
  }
  const found = await soundFolders.get(dir)!
  const files = found.names.filter(n => n === `${kind}.wav` || new RegExp(`^${kind}alt\\d+\\.wav$`).test(n))
  if (!files.length) return null
  const sep = dir.includes('\\') ? '\\' : '/'
  return `${dir}${sep}${files[Math.floor(Math.random() * files.length)]}`
}

async function chessSound($: any, kind: 'move' | 'capture' | 'check' | 'end' | 'win' | 'lose') {
  if (chessGame?.quiet) return
  const own = (await scenesDir($)).replace(/scenes$/, 'sounds')
  const bundled = `${$.plugin.root}/hooks/sounds`
  // Your folder first, then the bundled one; a kind with no file anywhere plays as a move.
  const file =
    (await soundIn($, own, kind).catch(() => null)) ??
    (await soundIn($, bundled, kind).catch(() => null)) ??
    (await soundIn($, own, 'move').catch(() => null)) ??
    `${bundled}/move.wav`
  const windows = /^[A-Za-z]:|\\/.test(String($.plugin.root))
  const argv = windows
    ? ['powershell', '-NoProfile', '-NonInteractive', '-Command', `(New-Object Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`]
    : ['sh', '-c', 'afplay "$1" 2>/dev/null || paplay "$1" 2>/dev/null || aplay -q "$1" 2>/dev/null', 'sound', file]
  void Promise.resolve($.process.run(argv, { timeoutMs: 5000 })).catch(() => undefined)
}

// Which sound a move makes, from the position before it and the one after.
function chessKind(before: Position, move: Move, after: Position, over?: string, mine = false) {
  if (over) return /^Checkmate/.test(over) ? (mine ? 'win' as const : 'lose' as const) : 'end' as const
  if (inCheck(after)) return 'check' as const
  if (before.board[move.to]) return 'capture' as const
  return 'move' as const
}

// How long the built-in opponent seems to think: a second or two, a little different each move, so its reply does not
// snap back the moment you let go of the piece.
const chessThink = () => 900 + Math.floor(Math.random() * 1100)

async function chessNew($: any, vs: 'engine' | 'claude' = chessGame?.vs ?? 'engine', side: 'w' | 'b' = Math.random() < 0.5 ? 'w' : 'b') {
  chessGame = { fen: START, moves: [], waiting: side === 'w' ? 'you' : 'claude', tries: 0, vs, level: chessGame?.level, side, quiet: chessGame?.quiet }
  chessPicked = null
  await chessSave($)
  // The person plays black: the opponent opens.
  if (side === 'b') {
    // A moment after the command has printed its row: a message sent from inside the command is not reliable.
    if (vs === 'claude') $.clock.after(300, () => void chessAsk($, '♟ You play white and open. I play black.').catch(() => undefined))
    else $.clock.after(chessThink(), () => void chessEngineMove($).catch(() => undefined))
  }
}

// Where the board is drawn: in the row of the /chess command until the next message is sent, after that in the card's
// place while Claude works and under the newest answer otherwise. One board at a time, never above the prompt: the band
// there holds twelve rows, shared with other mods' bars, and drops a taller tree whole.
let chessAnchor: 'command' | 'chat' = 'command'
let chessOut = ''

async function chessLevel($: any) {
  const g = chessGame
  if (!g) return
  g.level = CHESS_LEVELS[(CHESS_LEVELS.indexOf(g.level ?? 'hard') + 1) % CHESS_LEVELS.length]
  await chessSave($)
}

async function chessFlag($: any, flag: 'mini' | 'quiet') {
  const g = chessGame
  if (!g) return
  g[flag] = !g[flag]
  await chessSave($)
}

async function chessEnd($: any) {
  chessGame = null
  chessPicked = null
  await chessSave($)
}

async function chessPress($: any, sq: number) {
  if (!(await chessOwns($))) {
    $.ui.invalidate('ui.render')
    return
  }
  const g = chessGame
  // The opponent's turn and nothing thinking: its timer was lost (a reload, a closed chat). A click wakes it, so a game
  // never sits waiting for a move that is not coming.
  if (g && !g.over && g.waiting === 'claude' && g.vs !== 'claude' && !chessThinking) {
    void chessEngineMove($).catch(() => undefined)
    return
  }
  dbg($, `chess press sq=${sq} picked=${chessPicked} waiting=${g?.waiting} over=${g?.over ?? '-'}`)
  if (!g || g.over || g.waiting !== 'you') return
  const p = parseFen(g.fen)
  const mine = Boolean(p.board[sq]) && (p.board[sq] === p.board[sq].toUpperCase()) === ((g.side ?? 'w') === 'w')
  if (chessPicked === null || mine) {
    // A piece clicked again stays picked: the highlight can be a moment late, and a second click in that moment must not
    // undo the first. Another square or another piece changes it.
    chessPicked = mine ? sq : null
    $.ui.invalidate('ui.render')
    return
  }
  // A pawn reaching the far side becomes a queen.
  const move = legalMoves(p).find(m => m.from === chessPicked && m.to === sq && (!m.promo || m.promo === 'q'))
  if (!move) return
  chessPicked = null
  await chessYourMove($, p, move)
}

async function chessYourMove($: any, p: Position, move: Move) {
  const g = chessGame!
  const words = describeMove(p, move)
  const next = play(p, move)
  g.fen = toFen(next)
  g.moves.push(uci(move))
  g.last = [move.from, move.to]
  g.over = chessEnding(next)
  g.waiting = g.over ? 'you' : 'claude'
  g.tries = 0
  chessSound($, chessKind(p, move, next, g.over, true))
  await chessSave($)
  if (g.vs !== 'claude') {
    if (!g.over) $.clock.after(chessThink(), () => void chessEngineMove($).catch(() => undefined))
    return
  }
  if (g.over) await $.prompt.submit({ text: `♟ I play ${words}. ${g.over}`, asUser: true }).catch(() => undefined)
  else await chessAsk($, `♟ I play ${words}. Your move.`)
}

// The built-in opponent's reply, a moment after the person's move so it can be seen first.
let chessThinking = false
async function chessEngineMove($: any) {
  const g = chessGame
  if (!g || g.over || g.vs === 'claude' || g.waiting !== 'claude' || chessThinking) return
  chessThinking = true
  try {
    const p = parseFen(g.fen)
    // Thinks in slices, giving the app a turn between them, so a click or a typed key is never held up by the think.
    const move = await bestMoveAsync(p, g.level ?? 'hard', () => new Promise<void>(done => void $.clock.after(0, () => done())))
    if (!move || chessGame !== g || g.waiting !== 'claude') return
    const next = play(p, move)
    g.fen = toFen(next)
    g.moves.push(uci(move))
    g.last = [move.from, move.to]
    g.over = chessEnding(next)
    g.waiting = 'you'
    chessSound($, chessKind(p, move, next, g.over))
    await chessSave($)
  } finally {
    chessThinking = false
  }
}

// Claude's move from its answer: the last "MOVE: e7e5" line, checked against the legal moves.
function chessMoveFrom(answer: string, p: Position): Move | null {
  const all = [...answer.matchAll(/MOVE:\s*`?\s*([a-h][1-8])\s*-?\s*([a-h][1-8])\s*=?([qrbnQRBN])?/g)]
  const hit = all[all.length - 1]
  if (!hit) return null
  const want = hit[1] + hit[2] + (hit[3] ?? '').toLowerCase()
  const legal = legalMoves(p)
  return legal.find(m => uci(m) === want) ?? legal.find(m => uci(m) === `${want}q`) ?? null
}

async function chessAnswered($: any, answer: string) {
  const g = chessGame
  if (!g || g.waiting !== 'claude' || g.vs !== 'claude') return
  const p = parseFen(g.fen)
  let move = chessMoveFrom(answer, p)
  if (!move) {
    g.tries++
    if (g.tries < 2) {
      await chessSave($)
      await chessAsk($, '♟ That move is not legal here. Pick one from your legal moves and end with the MOVE: line.')
      return
    }
    const legal = legalMoves(p)
    move = legal[Math.floor(Math.random() * legal.length)]
    $.ui.toast(`textless chess: Claude's move did not read, so ${uci(move)} was played for it.`)
  }
  const next = play(p, move)
  g.fen = toFen(next)
  g.moves.push(uci(move))
  g.last = [move.from, move.to]
  g.over = chessEnding(next)
  g.waiting = 'you'
  g.tries = 0
  chessSound($, chessKind(p, move, next, g.over))
  await chessSave($)
}

// A piece as a picture, big and the same on every platform: the solid glyph in the side's colour with an outline in the
// other's, so it reads on a light square and on a dark one. The square's own colour is the Box behind it.
const CHESS_SOLID: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const pieceSvgs = new Map<string, string>()
function pieceSvg(piece: string) {
  let svg = pieceSvgs.get(piece)
  if (!svg) {
    const white = piece === piece.toUpperCase()
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 48 48"><text x="24" y="38" text-anchor="middle" font-size="42" font-family="'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','DejaVu Sans',serif" fill="${white ? '#fbf6ee' : '#1e1713'}" stroke="${white ? '#3b2a1e' : '#e9dccb'}" stroke-width="1.4" paint-order="stroke">${CHESS_SOLID[piece.toLowerCase()]}&#xFE0E;</text></svg>`
    pieceSvgs.set(piece, svg)
  }
  return svg
}
// A square in cells on the desktop's character grid, from how many columns the row has: the board takes most of the
// width, the most 12 cells a square, and a square is about as high as wide (a cell is about 2.4 times as high as wide).
function boardCells(e: any) {
  const columns = Math.max(30, Number(e.viewport?.columns) || 80)
  const w = Math.max(4, Math.min(12, Math.floor((columns - 18) / 8)))
  const h = Math.max(2, Math.round(w / 2.6))
  return { w, h, piece: Math.round(Math.min(w * 9, h * 22) * 0.72) }
}

// Squares for a plain terminal, in its own character cells (a cell is about twice as high as wide): as wide as the window
// allows up to 6, half as high, and low enough that the board fits the rows when the window says how many it has.
function terminalCells(e: any) {
  const columns = Math.max(30, Number(e.viewport?.columns) || 80)
  const rows = Number(e.viewport?.rows) || 0
  let w = Math.max(3, Math.min(6, Math.floor((columns - 4) / 8)))
  if (rows > 0) w = Math.min(w, Math.max(3, Math.floor((rows - 6) / 4)))
  return { w, h: Math.max(1, Math.round(w / 2)) }
}

function chessBoardView($: any, e: any) {
  const { Box, Text, Button, Svg } = $.ui.resolve(e) as Record<string, any>
  const cell = boardCells(e)
  // The terminal has an Svg element too but cannot draw pictures in a plain window: it gets letters on coloured squares.
  const plain = !Svg || e.surface === 'terminal'
  const g = chessGame!
  const p = parseFen(g.fen)
  const targets = new Set(chessPicked === null ? [] : legalMoves(p).filter(m => m.from === chessPicked).map(m => m.to))
  const rival = g.vs === 'claude' ? 'Claude' : 'The computer'
  const status = g.over ?? (g.waiting === 'you' ? 'Your move' : `${rival} is thinking…`)
  const rows = []
  // The person's side is at the bottom: white's rank 1 and file a, or black's rank 8 and file h.
  const down = (g.side ?? 'w') === 'b'
  for (let ri = 0; ri < 8; ri++) {
    const r = down ? ri : 7 - ri
    const cells = []
    for (let fi = 0; fi < 8; fi++) {
      const f = down ? 7 - fi : fi
      const sq = r * 8 + f
      const piece = p.board[sq]
      const shade = sq === chessPicked ? CHESS_PICKED : targets.has(sq) ? CHESS_TARGET : g.last?.includes(sq) ? CHESS_LAST : (r + f) % 2 ? CHESS_LIGHT : CHESS_DARK
      if (plain) {
        // The terminal: the square's colour is the Box and a column of blank buttons (one per line, so a click anywhere
        // counts) fills it. The piece sits in the middle line between two buttons, in the flow: a layer on top of the buttons
        // took every click on a piece. It is a filled shape in white or near-black so the two sides read apart.
        const tc = terminalCells(e)
        const white = piece ? piece === piece.toUpperCase() : false
        const mid = Math.floor((tc.h - 1) / 2)
        const left = Math.floor((tc.w - 1) / 2)
        const blank = (n: number) => ' '.repeat(n)
        const press = () => chessPress($, sq)
        cells.push(
          <Box key={`chess-cell-${sq}`} width={tc.w} height={tc.h} flexShrink={0} flexDirection="column" backgroundColor={shade}>
            {Array.from({ length: tc.h }, (_, line) => {
              const name = line === 0 ? `chess-${sq}` : `chess-${sq}-${line}`
              if (!piece || line !== mid) return <Button key={name} plain label={blank(tc.w)} onPress={press} />
              return (
                <Box key={`${name}-row`} flexDirection="row">
                  {left > 0 ? <Button key={name} plain label={blank(left)} onPress={press} /> : null}
                  <Text key={`${name}-piece`} bold color={white ? '#ffffff' : '#0b0b0b'}>{CHESS_SOLID[piece.toLowerCase()]}</Text>
                  <Button key={`${name}-r`} plain label={blank(tc.w - 1 - left)} onPress={press} />
                </Box>
              )
            })}
          </Box>,
        )
        continue
      }
      // The square is a Box of the right colour and size, the piece a picture in it, and over both a column of blank
      // buttons (one per line) so a click anywhere on the square counts. The Box has no gap to its neighbours.
      // No-break spaces a little under twice the square's width in cells: the text face is not a grid, a space is about half
      // a cell wide, so w spaces covered under half the square. Any longer and the button cuts the label with an ellipsis,
      // which showed as dots on every square.
      const squareFill = ' '.repeat(Math.floor(cell.w * 1.95))
      cells.push(
        <Box key={`chess-cell-${sq}`} width={cell.w} height={cell.h} flexShrink={0} backgroundColor={shade} alignItems="center" justifyContent="center">
          {piece ? <Svg source={pieceSvg(piece)} alt={piece} width={cell.piece} height={cell.piece} /> : null}
          <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="column">
            {Array.from({ length: cell.h }, (_, line) => (
              <Button key={line === 0 ? `chess-${sq}` : `chess-${sq}-${line}`} plain label={squareFill} hover={{ scope: `chess-${sq}`, backgroundColor: '#00000000' }} onPress={() => chessPress($, sq)} />
            ))}
          </Box>
        </Box>,
      )
    }
    rows.push(
      <Box key={`chess-row-${r}`} flexDirection="row" alignItems="center">
        <Box width={2} flexShrink={0}><Text dimColor>{`${r + 1}`}</Text></Box>
        {cells}
      </Box>,
    )
  }
  return (
    <Box key="chess" flexDirection="column">
      <Box key="chess-head" flexDirection="row" flexWrap="wrap" gap={1} alignItems="center">
        <Text color="#d97757" bold>{`♟ Chess${g.vs === 'claude' ? ' with Claude' : ''} · ${status}`}</Text>
        {g.vs === 'claude' ? null : (
          <Button key="chess-level" plain dimColor label={`Level: ${g.level ?? 'hard'}`} onPress={() => chessLevel($)} />
        )}
        <Button key="chess-new" plain dimColor label="New game" onPress={() => chessNew($)} />
        <Button key="chess-sound" plain dimColor label={g.quiet ? 'Sound: off' : 'Sound: on'} onPress={() => chessFlag($, 'quiet')} />
        <Button key="chess-mini" plain dimColor label={g.mini ? 'Show board' : 'Minimize'} onPress={() => chessFlag($, 'mini')} />
        <Button key="chess-end" plain dimColor label="Close" onPress={() => chessEnd($)} />
      </Box>
      {g.mini ? null : rows}
      {g.mini ? null : !plain ? (
        <Box key="chess-files" flexDirection="row">
          <Box width={2} flexShrink={0} />
          {(down ? 'hgfedcba' : 'abcdefgh').split('').map(l => (
            <Box key={`chess-file-${l}`} width={cell.w} flexShrink={0} justifyContent="center"><Text dimColor>{l}</Text></Box>
          ))}
        </Box>
      ) : (
        <Box key="chess-files" flexDirection="row">
          <Box width={2} flexShrink={0} />
          {(down ? 'hgfedcba' : 'abcdefgh').split('').map(l => (
            <Box key={`chess-file-${l}`} width={terminalCells(e).w} flexShrink={0} justifyContent="center"><Text dimColor>{l}</Text></Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

// One hooks module per plugin, each event once: register.tsx calls these from its own hooks.

async function chessStart($: any) {
  await chessLoad($)
  if (chessGame && !chessGame.over && chessGame.waiting === 'claude' && chessGame.vs !== 'claude') $.clock.after(chessThink(), () => void chessEngineMove($).catch(() => undefined))
  void $.command.register({ name: 'chess', description: 'Play chess in this chat: against the computer, or /chess claude against Claude.' }).catch(() => undefined)
}

// /chess: a new game, the one in play, or the board closed. Null when the command is not chess.
async function chessCommand($: any, e: any): Promise<{ text: string } | null> {
  if (e.command !== 'chess' && !String(e.command).endsWith(':chess')) return null
  await chessLoad($)
  await chessTake($)
  const arg = String(e.args ?? '').trim().toLowerCase()
  if (arg === 'end' || arg === 'close') {
    await chessEnd($)
    return { text: 'Chess board closed.' }
  }
  const words = arg.split(/\s+/).filter(Boolean)
  const want = words.includes('claude') ? 'claude' : words.includes('engine') || words.includes('computer') ? 'engine' : undefined
  const side = words.includes('white') ? 'w' : words.includes('black') ? 'b' : undefined
  chessAnchor = 'command'
  chessOut = `chess ${Date.now()}`
  if (!chessGame || chessGame.over || words.includes('new') || side || (want && want !== chessGame.vs)) {
    await chessNew($, want, side)
    const mine = chessGame!.side === 'b' ? 'black, so the opponent opens' : 'white'
    return { text: `${chessOut}: New game against ${chessGame!.vs === 'claude' ? 'Claude' : 'the computer'}. You play ${mine}. Click a piece, then where it goes.` }
  }
  $.ui.invalidate('ui.render')
  return { text: `${chessOut}: Your game is below. /chess new starts over, /chess claude plays against Claude instead, /chess end closes it.` }
}

async function chessTurn($: any, e: any) {
  if (e.agentId || (e.reason ?? 'answer') !== 'answer') return
  await chessLoad($)
  await chessAnswered($, String(e.answer ?? ''))
}

// The board in the chat, where it is drawn once a message has been sent: under the newest answer, or null.
function chessBelow($: any, e: any) {
  return chessGame && chessAnchor === 'chat' && chessOwned ? chessBoardView($, e) : null
}

// The card's place while Claude works and a game is open: the board with the card's own buttons above it. No size
// limit here, it is a row of the chat and not the band above the prompt.
function chessCard($: any, e: any, chat: Chat, step: string) {
  const { Box, Text, Button } = $.ui.resolve(e) as Record<string, any>
  return (
    <Box key="textless" flexDirection="column" paddingBottom={1}>
      <Box key="textless-top" flexDirection="row" justifyContent="flex-end" width="100%" height={1}>
        {Button ? controls($, e) : null}
        {Button ? sizeButton($, e, 'minimize') : null}
      </Box>
      {chessBoardView($, e)}
      <Text dimColor wrap="truncate">{`Claude is working · ${chat.mainDone ? waitingFor(chat) : step}`}</Text>
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await setUp($)
    await chessStart($)
    void afterLoad($).catch(() => undefined)
    return next(e)
  })
  on('command.run', async ($, e, next) => {
    const chess = await chessCommand($, e)
    if (chess) return chess
    if (e.command !== 'textless' && !String(e.command).endsWith(':textless')) return next(e)
    await setUp($)
    const raw = String(e.args ?? '').trim()
    const arg = raw.toLowerCase()
    if (arg.startsWith('get ')) return { text: await getScene($, raw.slice(4).trim()) }
    if (arg === 'next') {
      await nextScene($)
      return { text: 'Next scene picked.' }
    }
    if (arg.startsWith('set')) {
      await loadOwn($)
      await loadBuiltIn($)
      const want = arg.slice(3).trim()
      const sets = setList()
      const found = sets.find(n => n === want || setLabel(n).toLowerCase() === want)
      if (!found) return { text: `Sets: ${sets.map(setLabel).join(', ')}. Pick one with /textless set <name>.` }
      await setSet($, found)
      return { text: `textless set: ${setLabel(found)}.` }
    }
    if (arg === 'update') return { text: await checkUpdateNow($) }
    // Where the card does not fit above the prompt (a short window, another bar there), the command does what Update does.
    if (arg === 'update now') {
      const said = await checkUpdateNow($)
      if (updCard?.stage !== 'offer') return { text: said }
      await runUpdate($, updCard)
      return { text: updCard?.stage === 'failed' ? `textless could not update: ${updCard.detail ?? 'see the card'}` : 'textless updated. Run /reload-plugins to load it.' }
    }
    if (arg.startsWith('card')) return { text: await previewCard($, arg.slice(4).trim()) }
    if (arg === 'debug') {
      debugOn = !debugOn
      await $.store.set('debug', debugOn).catch(() => undefined)
      return { text: debugOn ? 'textless debug log on: ~/.claude/textless/debug-<chat>.log' : 'textless debug log off.' }
    }
    if (!ANSWERS && (arg.startsWith('cover') || arg.startsWith('summary')))
      return { text: 'textless only draws the art for now. The cover card and the lines under answers are parked.' }
    if (arg.startsWith('cover')) {
      const want = arg.slice(5).trim()
      coverOn = want === 'on' ? true : want === 'off' ? false : !coverOn
      await $.store.set('cover', coverOn).catch(() => undefined)
      $.ui.invalidate('ui.render')
      return { text: coverOn ? 'textless covers a finished chat with one big card. Show the chat on the card brings it back until you send the next message.' : 'textless no longer covers finished chats.' }
    }
    if (arg.startsWith('summary')) {
      const want = arg.slice(7).trim()
      summaryOn = want === 'on' ? true : want === 'off' ? false : !summaryOn
      await $.store.set('summary', summaryOn).catch(() => undefined)
      $.ui.invalidate('ui.render')
      return { text: summaryOn ? 'textless shows the done line, questions, links and next step under answers.' : 'textless shows only a show steps link under answers.' }
    }
    if (arg === 'settings') {
      await openWebSettings($)
      return { text: 'textless settings opened on the website (the ⚙ on the card does the same). /textless panel opens the small version inside the app.' }
    }
    if (arg === 'panel') {
      await openSettings($)
      return { text: 'textless settings opened in the app. /textless settings opens the full page on the website.' }
    }
    if (arg === 'folder') {
      const dir = await openFolder($)
      return { text: `Your scenes folder: ${dir}. Drop GIF, PNG, WebP, JPG or SVG files in it (under about 95 KB each).` }
    }
    // A word this version does not know (a command from a newer one) must not flip the card on or off.
    if (arg !== '' && arg !== 'on' && arg !== 'off') {
      return { text: `textless does not know "${arg}" in this version. Commands: on, off, settings, panel, set <name>, next, get <id>, folder, update, update now, debug. If it should exist, this chat runs an older copy: open a new chat after updating.` }
    }
    await toggle($, arg === 'on' ? true : arg === 'off' ? false : undefined)
    return { text: (await chatOf($)).on ? 'textless on in this chat.' : 'textless off in this chat.' }
  })
  on('prompt.submit', async ($, e, next) => {
    await setUp($)
    const chat = await chatOf($)
    dbg($, `prompt.submit seen running=${chat.running} mainDone=${chat.mainDone}`)
    // A message sent: the board leaves the /chess row and moves down with the card and the newest answer.
    if (chessGame && !String((e as any).text ?? '').startsWith('♟')) {
      await chessLoad($)
      // A piece still picked when a message goes out is let go: the board is redrawn in its new place without it.
      if (chessAnchor !== 'chat' || chessPicked !== null) {
        chessAnchor = 'chat'
        chessPicked = null
        $.ui.invalidate('ui.render')
      }
    }
    // A message sent while a turn runs, before its card shows, joins that turn. Once the card shows (or the turn has
    // answered and only background tasks run), the turn so far folds into its done line and a new card starts under
    // the message, so the card always sits below the latest thing the person said.
    // While textless is on, the model is told that its questions get lifted out of the answer, so it writes them to
    // stand alone. The note stays in the chat once sent, so it goes with the first message and then every HINT_EVERY
    // messages (sent every time it added about 170 tokens to each message).
    const hint = chat.on && summaryOn && (chat.hintedAt === null || chat.prompts - chat.hintedAt >= HINT_EVERY)
    if (hint) chat.hintedAt = chat.prompts
    chat.prompts += 1
    const sent = hint ? { ...e, context: [...(((e as any).context ?? []) as string[]), QUESTION_HINT] } : e
    if (chat.running && !chat.mainDone && !chat.long) return next(sent)
    if (chat.running) endTurn($, chat)
    await startTurn($, chat, String((e as any).text ?? ''))
    return next(sent)
  })
  // A subagent's steps name it, so the agents still working are known before they finish. A main-thread step with no
  // turn running is a turn Claude started without a prompt (a background task finished and woke it): it starts here.
  on('turn.step', async function* ($, e, next) {
    const chat = await chatOf($)
    if (e.agentId !== undefined) chat.agents.add(String(e.agentId))
    else if (!chat.running || chat.mainDone) {
      // A main step after the main turn answered (its background tasks still running) is a new turn Claude began on
      // its own: the answered one folds into its done card first.
      if (chat.mainDone) endTurn($, chat)
      await setUp($)
      dbg($, 'turn start without a prompt')
      await startTurn($, chat, '')
    }
    const done = yield* next(e)
    // The app does not draw the task tools as rows, so the step's own tool calls say a task list was made.
    if (e.agentId === undefined) for (const t of ((done as any)?.toolUses ?? []) as any[]) noteList($, chat, t?.name)
    return done
  })
  // A Stop hook that blocks sends Claude back to work inside the same turn, so the answer it just gave would fold as
  // text said along the way. It was an answer: it stays shown, and the turn's last answer still gets the done line.
  // The app hands the chat's title along with each message and at the start; the cover card shows it.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    await keepTitle($, (e as any).session_title)
    return next(e)
  })
  on('classic.SessionStart', async ($, e, next) => {
    await keepTitle($, (e as any).session_title)
    return next(e)
  })
  on('classic.Stop', async ($, e, next) => {
    const r = (await next(e)) as { block?: string } | undefined
    const chat = await chatOf($)
    const tasks = (((e as any).background_tasks ?? []) as any[]).filter(t => !/^(completed|failed|killed|stopped|cancelled)$/i.test(String(t?.status ?? '')))
    chat.background = tasks.map(t => ({ id: String(t.id ?? ''), description: String(t.description ?? t.type ?? 'task').replace(/\s+/g, ' ').trim() }))
    if (chat.background.length > 0) $.ui.invalidate('ui.render')
    const said = String((e as any).last_assistant_message ?? '').replace(/\s+/g, ' ').trim()
    if (r?.block && chat.working && said) {
      chat.kept.push(said)
      dbg($, `stop hook blocked, answer kept ${said.slice(0, 40)}`)
      $.ui.invalidate('ui.render')
    }
    return r
  })
  on('turn.complete', async ($, e, next) => {
    await chessTurn($, e)
    const chat = await chatOf($)
    const agentId = (e as any).agentId
    if (agentId) {
      // One subagent's run ended, not the chat's turn. The card stays unless the main turn is already over and this
      // was the last agent working.
      chat.agents.delete(String(agentId))
      if (chat.mainDone && chat.agents.size === 0) endTurn($, chat)
      return next(e)
    }
    chat.stopped = ((e as any).reason ?? 'answer') !== 'answer'
    chat.answer = String((e as any).answer ?? '')
    chat.newest = chat.answer
    void Promise.resolve($.session.id()).then((id: unknown) => $.store.set(`newest:${String(id)}`, chat.newest)).catch(() => undefined)
    chat.durationMs = Number((e as any).durationMs ?? 0)
    if (chat.agents.size > 0 && chat.working) {
      chat.mainDone = true
      $.ui.invalidate('ui.render')
      chat.timer?.cancel()
      chat.timer = $.clock.after(AGENT_WAIT_MS, () => endTurn($, chat))
      return next(e)
    }
    endTurn($, chat)
    return next(e)
  })
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const chat = await chatOf($)
    const p = (e.props ?? {}) as Record<string, any>
    const stepId = String(p.tool_use_id ?? '')
    noteList($, chat, p.tool)
    if (chat.working && !oldTools.has(stepId) && Date.now() >= chat.baselineUntil && planningStep(String(p.tool ?? ''), p.input)) stepAside($, chat, stepId)
    if (chat.planKey && stepId === chat.planKey) return planLabel($, e, await next(e))
    if (covering(chat) && (!chat.working || oldTools.has(String(p.tool_use_id ?? '')))) {
      oldTools.add(String(p.tool_use_id ?? ''))
      return blank($, e)
    }
    if (!chat.working) {
      await loadDone($)
      oldTools.add(String(p.tool_use_id ?? ''))
      if (!chat.on) return offRow($, e, chat, stepId === chat.cardKey, next)
      return folded($, e, next, [String(p.tool_use_id ?? '')])
    }
    // A step of an earlier turn textless folded: it stays folded while the next turn runs. Sending a message redraws
    // every row, and these went through as rows of no turn and opened up.
    if (foldedTools.has(stepId) && !chat.steps.includes(stepId)) return folded($, e, next, [stepId])
    if (Date.now() < chat.baselineUntil && p.isRunning !== true) oldTools.add(String(p.tool_use_id ?? ''))
    if (p.tool_use_id) stepLabels.set(String(p.tool_use_id), stepLabel(String(p.tool ?? 'step'), p.input))
    const place = track($, chat, String(p.tool_use_id ?? ''), p.isRunning === true)
    dbg($, `ToolUse ${String(p.tool_use_id ?? '').slice(-8)} running=${p.isRunning} place=${place} long=${chat.long} on=${JSON.stringify(p.onScreen)}`)
    if (place === 'other') return next(e)
    if (place === 'later' || chat.underPrompt) return blank($, e)
    if (reanchor($, chat, p.onScreen)) return blank($, e)
    if (cardUnderAnswer(chat)) return blank($, e)
    return card($, e, chat, String(p.input?.description ?? p.tool ?? ''))
  })
  // Parallel tool calls are folded into a group; while the group is this turn's first step, it is the card.
  // The desktop folds a turn's steps into a group that collapses. A group holding the card's step draws the card
  // itself, so the card never folds away into it; a group of this turn's later steps draws nothing.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const chat = await chatOf($)
    const p = (e.props ?? {}) as Record<string, any>
    const ids = (Array.isArray(p.calls) ? p.calls : []).map((c: any) => String(c?.tool_use_id ?? c?.id ?? '')).filter(Boolean)
    const planned = (Array.isArray(p.calls) ? p.calls : []).find((c: any) => planningStep(String(c?.tool ?? ''), c?.input))
    const plannedId = planned ? String(planned.tool_use_id ?? planned.id ?? '') : ''
    if (planned && chat.working && !oldTools.has(plannedId) && Date.now() >= chat.baselineUntil) stepAside($, chat, plannedId)
    if (chat.planKey && ids.includes(chat.planKey)) return planLabel($, e, await next(e))
    if (covering(chat) && (!chat.working || ids.every((id: string) => oldTools.has(id)))) {
      for (const id of ids) oldTools.add(id)
      return blank($, e)
    }
    if (!chat.working) {
      await loadDone($)
      for (const id of ids) oldTools.add(id)
      if (!chat.on) return offRow($, e, chat, ids.includes(chat.cardKey), next)
      return folded($, e, next, ids)
    }
    // An earlier turn's folded group stays folded while the next turn runs (see ToolUse).
    if (ids.length > 0 && ids.every((id: string) => foldedTools.has(id) && !chat.steps.includes(id))) return folded($, e, next, ids)
    if (Date.now() < chat.baselineUntil && p.isActive !== true) for (const id of ids) oldTools.add(id)
    for (const c of Array.isArray(p.calls) ? p.calls : []) if (c?.tool_use_id) stepLabels.set(String(c.tool_use_id), stepLabel(String(c.tool ?? 'step'), c.input))
    for (const c of Array.isArray(p.calls) ? p.calls : []) noteList($, chat, c?.tool)
    for (const id of ids) track($, chat, id, p.isActive === true)
    dbg($, `ToolGroup n=${ids.length} active=${p.isActive} first=${ids.includes(chat.cardKey)}`)
    if (!ids.some((id: string) => chat.steps.includes(id))) return next(e)
    if (!ids.includes(chat.cardKey) || chat.underPrompt) return blank($, e)
    if (reanchor($, chat, p.onScreen)) return blank($, e)
    if (cardUnderAnswer(chat)) return blank($, e)
    return card($, e, chat, 'Running several steps')
  })
  // The settings pane: on or off, which scene, and the person's own scenes folder.
  on('ui.render', { component: 'Pane', requestId: 'textless-settings' }, async ($, e) => {
    const { Box, Text, Button, Svg, Link } = $.ui.resolve(e) as Record<string, any>
    const tabs = (
      <Box key="tabs" flexDirection="row" gap={1}>
        <Button key="tab-settings" variant={paneTab === 'settings' ? 'primary' : undefined} label="Settings" onPress={() => { paneTab = 'settings'; $.ui.invalidate('ui.render') }} />
        <Button key="tab-community" variant={paneTab === 'community' ? 'primary' : undefined} label="Community" onPress={() => { paneTab = 'community'; $.ui.invalidate('ui.render'); void refreshMarket($) }} />
      </Box>
    )
    if (paneTab === 'community') {
      const { site } = await marketUrls($)
      const showing = set === 'yours' && pick !== null ? sceneList()[pick % sceneList().length]?.file : undefined
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
          {tabs}
          <Text dimColor wrap="wrap">Scenes people made and shared. Use one and it plays while Claude works, in every chat.</Text>
          {market.error ? <Text color="#d97757" wrap="wrap">{market.error}</Text> : null}
          {market.loading && !market.scenes.length ? <Text dimColor>Loading the market…</Text> : null}
          {!market.loading && !market.error && market.at && !market.scenes.length ? <Text dimColor>No scenes shared yet.</Text> : null}
          {market.scenes.map(s => {
            const file = `${s.id}.svg`
            const state = showing === file ? 'In use' : own.some(o => o.name === file) ? 'Added' : ''
            const thumb = thumbs.get(s.id)
            const tw = 200
            const th = s.width && s.height ? Math.round((tw * Number(s.height)) / Number(s.width)) : tw
            return (
              <Box key={`m-${s.id}`} flexDirection="column" gap={0}>
                {Svg && thumb ? <Svg source={thumb} alt={String(s.name)} width={tw} height={Math.min(th, 300)} /> : <Text dimColor>{thumb === '' ? '(no preview)' : '…'}</Text>}
                <Box flexDirection="row" gap={2} alignItems="center">
                  <Text bold wrap="truncate">{String(s.name)}</Text>
                  <Text dimColor wrap="truncate">{`by ${String(s.author)}`}</Text>
                  {Number(s.stars) > 0 ? <Text color="#d77757">{`★ ${Number(s.stars)}`}</Text> : null}
                </Box>
                <Box flexDirection="row" gap={2} alignItems="center">
                  {state
                    ? <Text color="#d77757">{state}</Text>
                    : <Button key={`m-${s.id}-use`} variant="primary" label="Use" onPress={() => useFromPane($, s)} />}
                  {state === 'Added' ? <Button key={`m-${s.id}-again`} label="Use" onPress={() => useFromPane($, s)} /> : null}
                  {/* A Link takes only https: or http://localhost, so any other address is left out. */}
                  {Link && /^(https:\/\/|http:\/\/localhost[:/])/.test(site) ? <Link href={`${site}#${s.id}`} label="Report" /> : null}
                </Box>
              </Box>
            )
          })}
          <Button key="m-refresh" plain label="Refresh" onPress={() => refreshMarket($, true)} />
        </Box>
      )
    }
    const list = sceneList()
    const dir = await scenesDir($)
    const shown = pick !== null ? list[pick % list.length] : null
    const preview = shown ?? list[0]
    const size = preview?.svg.match(/<svg[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/)
    const chatOn = (await chatOf($)).on
    const pw = 280
    const ph = size ? Math.round((Number(size[2]) / Number(size[1])) * pw) : pw
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
        {tabs}
        <Box flexDirection="row" gap={2} alignItems="center">
          <Text bold>Hide the text while Claude works</Text>
          <Button key="pane-toggle" variant={chatOn ? 'primary' : undefined} label={chatOn ? 'On' : 'Off'} onPress={() => toggle($)} />
        </Box>
        <Text bold>Set</Text>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {setList().map(name => (
            <Button key={`set-${name}`} variant={name === (setList().includes(set) ? set : CLAWD_SET) ? 'primary' : undefined} label={setLabel(name)} onPress={() => setSet($, name)} />
          ))}
        </Box>
        <Text bold>Scene</Text>
        {Svg && preview ? <Svg source={preview.svg} alt={preview.name} width={pw} height={ph} /> : null}
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1} alignItems="center">
            <Text color={pick === null ? '#d77757' : undefined} dimColor={pick !== null}>{pick === null ? '●' : '○'}</Text>
            <Button key="pick-rotate" plain label="A different one each turn" onPress={() => setPick($, null)} />
          </Box>
          {list.map((sc, i) => (
            <Box key={`pick-${i}`} flexDirection="row" gap={1} alignItems="center">
              <Text color={pick === i ? '#d77757' : undefined} dimColor={pick !== i}>{pick === i ? '●' : '○'}</Text>
              <Button key={`pick-${i}-btn`} plain label={sc.name} onPress={() => setPick($, i)} />
            </Box>
          ))}
        </Box>
        <Text bold>Your own scenes</Text>
        <Text dimColor wrap="wrap">Drop GIF, PNG, WebP, JPG or SVG files (under about 95 KB) in this folder and they join the list.</Text>
        <Text dimColor wrap="truncate">{dir}</Text>
        <Box flexDirection="row" gap={2}>
          <Button key="pane-folder" label="Open folder" onPress={() => openFolder($)} />
          <Button key="pane-copy" label="Copy path" onPress={(press: any) => { void $.ui.copy({ text: dir, surface: press.surface }) }} />
        </Box>
      </Box>
    )
  })
  // The card hangs under the prompt that started the turn, so it shows a few seconds in, before the first step, and
  // never moves.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const chat = await chatOf($)
    const text = String((e.props as any)?.text ?? '')
    // A background task's notification: it ended, so the newest answer's row stops naming it.
    const task = (e.props as any)?.task
    if (task?.id && chat.background.some(t => t.id === String(task.id))) {
      chat.background = chat.background.filter(t => t.id !== String(task.id))
      void Promise.resolve().then(() => $.ui.invalidate('ui.render')).catch(() => undefined)
    }
    if (covering(chat) && !(chat.working && text === chat.prompt)) return blank($, e)
    // Switched off while Claude works: the steps show as the app draws them, and the message that started the turn
    // keeps a grey "Aa" under it to turn textless back on, so its buttons never all go at once.
    if (chat.running && !chat.on && !chat.cardKey && text && text === chat.prompt) {
      const { Box } = $.ui.resolve(e) as Record<string, any>
      await refreshTheme($)
      const inner = await next(chessShown(e))
      const drawn = { chat, id: String(await $.session.id().catch(() => '')) }
      return (
        <Box key="textless-off" flexDirection="column">
          {inner}
          <Box flexDirection="row">
            <Box flexGrow={1} />
            {controls($, e, drawn)[0]}
          </Box>
        </Box>
      )
    }
    if (!chat.working || Date.now() < chat.baselineUntil) {
      if (text !== chat.prompt || !chat.working) oldPrompts.add(text)
      return next(chessShown(e))
    }
    if (!chat.long || !chat.underPrompt || text !== chat.prompt) return next(chessShown(e))
    const inner = await next(chessShown(e))
    const { Box } = $.ui.resolve(e) as Record<string, any>
    return (
      <Box flexDirection="column">
        {inner}
        {await card($, e, chat, chat.steps.length > 0 ? 'Working through the steps' : 'Thinking')}
      </Box>
    )
  })
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const chat = await chatOf($)
    const text = String((e.props as any)?.text ?? '')
    // Uncovered with Show the chat: the last answer, and the card staying under it with Hide the chat.
    if (chat.uncovered && !chat.working && chat.cover && text === chat.cover.host) {
      const mine = doneAnswers.get(text)
      const inner = mine === undefined ? await next(e) : await doneCard($, e, next, mine)
      const { Box } = $.ui.resolve(e) as Record<string, any>
      return (
        <Box flexDirection="column">
          {inner}
          {coverCard($, e, chat, { chat, id: '' })}
        </Box>
      )
    }
    if (covering(chat)) {
      await loadCover($, chat)
      if (!chat.working) {
        oldTexts.add(text)
        if (chat.cover && text === chat.cover.host) return coverCard($, e, chat, { chat, id: String(await $.session.id().catch(() => '')) })
        return blank($, e)
      }
      // Working: what the chat held before this turn stays hidden; this turn's text goes the usual way.
      if (oldTexts.has(text) || Date.now() < chat.baselineUntil) return blank($, e)
    }
    if (!chat.working) {
      oldTexts.add(text)
      // Off shows the chat as Claude Code draws it, finished turns too, with one line under the newest answer.
      if (!chat.on) return isNewest(chat, text) ? newestRow($, e, await next(e)) : next(e)
      await loadDone($)
      const at = foldedTexts.get(text)
      if (at !== undefined) return blank($, e)
      const mine = doneAnswers.get(text)
      if (mine === undefined) return isNewest(chat, text) ? newestRow($, e, await next(e)) : next(e)
      return doneCard($, e, next, mine)
    }
    // An earlier turn textless folded keeps its look while the next one runs: the text said along the way hidden, the
    // answer with its done row.
    if (!chat.turnTexts.has(text)) {
      await loadDone($)
      if (foldedTexts.has(text)) return blank($, e)
      const mine = doneAnswers.get(text)
      if (mine !== undefined) return doneCard($, e, next, mine)
    }
    if (Date.now() < chat.baselineUntil) oldTexts.add(text)
    if (oldTexts.has(text)) return next(e)
    if (isKept(chat, text)) return next(e)
    // The main turn has answered while background tasks still run: its answer may ask something, so it shows. Only
    // that answer: anything said after it belongs to whatever comes next and stays hidden.
    if (chat.mainDone && inAnswer(chat, text)) {
      dbg($, `text shown (answer while agents run) ${text.slice(0, 40)}`)
      // The card leaves the steps above and waits under the answer's last block, at the foot of the chat.
      if (!cardUnderAnswer(chat) || !chat.answer.trim().endsWith(text.trim())) return next(e)
      const { Box } = $.ui.resolve(e) as Record<string, any>
      const inner = await next(e)
      return (
        <Box key="textless-waiting" flexDirection="column" gap={1}>
          {inner}
          {await card($, e, chat, '')}
        </Box>
      )
    }
    const isNew = !chat.turnTexts.has(text)
    chat.turnTexts.add(text)
    chat.lastText = text
    if (!chat.long) {
      dbg($, `text shown (not long yet) ${text.slice(0, 40)}`)
      return next(e)
    }
    // Only text not seen before asks for the redraw: the redraw draws this text again, and asking on every draw made
    // a loop, a redraw of the whole chat every 0.7 s, which flickered the card.
    if (isNew) settleText($)
    return blank($, e)
  })
  // /chess prints its board in its own output row, in the place the command was run, until the next message.
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    const p = (e.props ?? {}) as Record<string, any>
    if (p.command !== 'chess' && !String(p.command).endsWith(':chess')) return next(e)
    await chessLoad($)
    const text = String(p.text ?? '')
    if (!chessGame || !chessOut || !text.includes(chessOut) || chessAnchor !== 'command') return next(e)
    const { Box, Text } = $.ui.resolve(e) as Record<string, any>
    if (!(await chessOwns($))) return <Text key="chess-out" dimColor>The chess board is open in another chat. /chess brings it here.</Text>
    return (
      <Box key="chess-out" flexDirection="column" gap={1}>
        <Text dimColor wrap="truncate">{text.replace(`${chessOut}: `, '')}</Text>
        {chessBoardView($, e)}
      </Box>
    )
  })
  // A new version: offered, updating, or just updated, above the prompt. Another mod may draw there too, so its band
  // stays, under the card.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    void afterLoad($).catch(() => undefined)
    // Where the update card used to be drawn; it sits under the newest answer now (updBelow). Kept for the log.
    {
      const seen = `${e.surface} card=${updCard?.stage ?? '-'} maxRows=${String((e.props as any)?.maxRows ?? '-')}`
      if (seen !== lastBand) { lastBand = seen; dbg($, `band above prompt: ${seen}`) }
    }
    return next(e)
  })
  // The model strip under the prompt is left to the app: on the desktop it is a row of its own, and textless's buttons
  // sit in the chat instead (the minimized card and the newest answer).
}
