import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelForkResult, Register, RenderInput } from 'claude-code'

import type { AgentRec, Effort, HandoffAfter, HandoffChoice, ModelKey, Pick, SettingsDraft, Spent } from '../types'
import { agentsPane, demoAgents, demoFiles, demoSteps, importsOf, relPath, toolLine, touchOf, withTouch, withWaits } from './agents'
import { ART_COLUMNS, ART_FRAME_MS, ART_MIN_WIDTH, ART_ROWS, type ArtKind, artFrame, MOVING } from './art'
import { MARK_SVG } from './brand-mark'
import { accent, setLight, setTheme, themedEls, type ThemeName, THEMES, tintHex } from './theme'
import { GUIDE_PROMPT } from './guide'
import { PILL_H, stepsFromTodos, thinkingSvg, THINK_W, withTaskCreated, withTaskUpdated } from './progress'

// The ladders the two sliders walk, cheapest first.
export const MODELS: { key: ModelKey; label: string; long: string; id: string }[] = [
  { key: 'haiku', label: 'Haiku', long: 'Haiku 5.5', id: 'claude-haiku-5-5' },
  { key: 'sonnet', label: 'Sonnet', long: 'Sonnet 5.5', id: 'claude-sonnet-5-5' },
  { key: 'opus', label: 'Opus', long: 'Opus 5.5', id: 'claude-opus-5-5' },
  { key: 'fable', label: 'Fable', long: 'Fable 5.1', id: 'claude-fable-5-1' },
]
export const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
// What one token costs relative to an uncached input token, the same ratios on every Claude model. Measured over
// 80k requests of real Claude Code use, cache reads are about 76% of a session's cost, cache writes 16% and output 8%: effort
// mostly changes how many tool calls a prompt makes, not what one answer writes, so all four are counted.
const WEIGHT = { input: 1, write: 1.25, read: 0.1, out: 5 }
// Changing effort between two requests keeps the prompt cache on these models only. On Fable 5.1 and older Opus
// the next request rewrote 56-100% of the cache (measured), which costs more than any effort can save.
export const cacheSafe = (modelId: string) => /(opus|sonnet)-5-5/.test(modelId)
// The accent the effort in the footer is written in: the brand violet, or Claude orange when the theme says so.
let ACCENT = accent()
/** Takes the theme the settings name; the accent and every drawing follow it. */
function applyTheme() {
  setTheme(config.theme)
  ACCENT = accent()
  BRAND_BG = tintHex('#15121f')
  BRAND_EDGE = tintHex('#4a3f80')
  BRAND_HEAD = tintHex('#221c3a')
  FLASH_COLOR = tintHex('#9b7bff')
  // The panel greys lean blue beside the violet; with Claude orange they are the app's own neutral greys.
  const neutral = config.theme !== 'violet'
  DASH_BG = neutral ? '#151515' : '#141416'
  DASH_EDGE = neutral ? '#2a2a2a' : '#2a2a2f'
  DASH_HEAD = neutral ? '#191919' : '#18181b'
  CARD_HOVER = neutral ? '#1c1c1c' : '#1c1c20'
  CARD_HOVER_EDGE = neutral ? '#3b3b3b' : '#3b3b42'
  HOVER_BOX = neutral ? '#2b2b2b' : '#2b2b2f'
  applyAppearance()
}

// Claude Code's own theme, read from its /config row: a light one turns everything light when appearance is auto.
let claudeIsLight = false
let appearanceCheckedAt = -Infinity
function applyAppearance() {
  setLight(config.appearance === 'light' || (config.appearance === 'auto' && claudeIsLight))
}
/** Reads Claude Code's theme row (at most every few seconds) and redraws when light or dark changed. */
async function refreshAppearance($: EngineInterface) {
  const now = await $.clock.now().catch(() => Date.now())
  if (now - appearanceCheckedAt < 4000) return
  appearanceCheckedAt = now
  const rows = await $.config.list().catch(() => [])
  const value = rows.find(row => row.key === 'theme')?.value
  const lightNow = typeof value === 'string' && value.startsWith('light')
  if (lightNow === claudeIsLight) return
  claudeIsLight = lightNow
  applyAppearance()
  $.ui.invalidate('ui.render')
}
let BRAND_BG = '#15121f'
let BRAND_EDGE = '#4a3f80'
// The settings panel's header bar: a shade lighter than the panel, so it reads as a title bar.
let BRAND_HEAD = '#221c3a'
// The box behind the level while it is hovered: the grey of the app's own pills.
let HOVER_BOX = '#2b2b2f'
const EFFORT_LABELS: Record<Effort, string> = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh', max: 'Max' }

// Auto is two switches. `isAuto` is effort (the name stays: it is what the store and state hold);
// `isAutoModel` lets the judge suggest another model and starts off.
const isAuto = atom({ plugin: 'pilot', key: 'isAuto' } as const, true)
const JEV_TIMEOUT_MS = 3000
const JEV_URL = 'https://api.typesafe.ai/v1/systemone'
const EMPTY_SPENT: Spent = { prompts: 0, requests: 0, input: 0, write: 0, read: 0, out: 0, byEffort: {}, judge: { jev: 0, haiku: 0, ms: 0, tokens: 0 }, moved: 0, redone: 0 }
const SWITCHED_MS = 2500
// The prompt cache lives this long after the last request read or wrote it. A response may say which lifetime its
// cache writes got (usage.cache_creation: ephemeral_1h / ephemeral_5m); until one does, 1 hour is assumed: 99% of
// the cache writes in 80k requests of real Claude Code use (289k of 292k) were 1 hour.
const CACHE_TTL = { '5m': 5 * 60_000, '1h': 60 * 60_000 } as const
const CACHE_TICK_MS = 15_000
// Under this much time left the countdown turns amber: send now, or pay to write the whole context again.
// Shown minutes at or under these turn the countdown yellow, then red: grey while there is time, yellow at 20, red at 5.
const CACHE_YELLOW_MIN = 20
const CACHE_RED_MIN = 5
const ICE = '#7cc4ff'
const ICE_BG = '#0e1820'
const ICE_EDGE = '#2f5c80'
const BOG = '#a7c98f'
const BOG_BG = '#111710'
const BOG_EDGE = '#3e5a33'
const EMBER = '#f08a3c'
const EMBER_BG = '#1a110c'
const EMBER_EDGE = '#6a3418'
const SLATE = '#b4b8c4'
const SLATE_BG = '#12141b'
const SLATE_EDGE = '#39415a'
const YELLOW = '#e0a33a'
const RED = '#e5534b'
const isAutoModel = atom({ plugin: 'pilot', key: 'isAutoModel' } as const, false)
const pick = atom({ plugin: 'pilot', key: 'pick' } as const, null)
const isJudging = atom({ plugin: 'pilot', key: 'isJudging' } as const, false)
const suggestion = atom({ plugin: 'pilot', key: 'suggestion' } as const, null)
const appEffort = atom({ plugin: 'pilot', key: 'appEffort' } as const, null)
const model = atom({ plugin: 'pilot', key: 'model' } as const, null)
// The last change Auto made to the effort, shown for a moment as "Low → High" and then cleared.
const switched = atom({ plugin: 'pilot', key: 'switched' } as const, null)
// What the prompts Auto steered cost this session, measured, and what judging them took.
const saved = atom({ plugin: 'pilot', key: 'saved' } as const, EMPTY_SPENT)
// True while the session runs a model where Auto must not change effort (see cacheSafe).
const paused = atom({ plugin: 'pilot', key: 'paused' } as const, false)
// How long the main conversation's prompt cache stays warm, in whole minutes left: null before the first response,
// 0 once it has gone cold. Updated only when the minute changes, so the footer redraws once a minute at most.
const cacheLeft = atom({ plugin: 'pilot', key: 'cacheLeft' } as const, null)
const cacheMemo = atom({ plugin: 'pilot', key: 'cacheMemo' } as const, null)
const isCompacting = atom({ plugin: 'pilot', key: 'isCompacting' } as const, false)
// The compact bar: open after Compact is pressed, with a field for what the summary should keep.
const compactAsk = atom({ plugin: 'pilot', key: 'compactAsk' } as const, false)
// What is typed in that field. Kept here, not in state: a write per key would redraw the bar under the cursor.
let compactNote = ''
// The person closed the cold band; it comes back the next time the cache goes cold.
// The test pane of /effortless try pane.
// Where a handoff is: null idle, writing (the handoff turn runs), clearing (clear and resend).
const handoffStage = atom({ plugin: 'pilot', key: 'handoffStage' } as const, null)
// The handoff bar above the prompt, open with the choice shown in it, or null.
const handoffPick = atom({ plugin: 'pilot', key: 'handoffPick' } as const, null)
// The context is swamped: tokens read per request, or null below the line. Drives the swamp band.
const swamped = atom({ plugin: 'pilot', key: 'swamped' } as const, null)
// Why Haiku thinks a handoff would suit now, or null. It lights Handoff and says why; there is no percent threshold.
const handoffAdvice = atom({ plugin: 'pilot', key: 'handoffAdvice' } as const, null)
// The swamp band was closed at this many tokens; it comes back once the context has grown well past it.
// The handoff card above the prompt: shown from the start of a handoff, and once it lands ('done' in the
// cleared chat, 'copied'). It goes with the next message, its ✕, or HANDOFF_CARD_MS after it was set.
type HandoffCard = { kind: 'writing' | 'done' | 'copied' | 'compacting' | 'compacted'; full: boolean; at: number; seen: boolean }
// Kinds still under way: they stay until they land, with moving art. Compacting shares the card with the handoff.
const cardRunning = (kind: HandoffCard['kind']) => kind === 'writing' || kind === 'compacting'
// Kinds that landed well: the card turns green with a checkmark.
const cardLanded = (kind: HandoffCard['kind']) => kind === 'done' || kind === 'compacted'
const handoffCard = atom({ plugin: 'pilot', key: 'handoffCard' } as const, null)
const updateCard = atom({ plugin: 'pilot', key: 'updateCard' } as const, null)
const HANDOFF_CARD_MS = 2 * 60_000
// The handoff card's art while it is written: sparkles carried from left to right.
const HANDOFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 360 30" preserveAspectRatio="xMaxYMid slice"><style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}.d{fill:#d9d1ff;opacity:0;animation-name:go;animation-timing-function:ease-in-out;animation-iteration-count:infinite}@keyframes go{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}85%{opacity:.7}100%{opacity:0;transform:translate(190px,0)}}.br{animation:br 2.4s ease-in-out infinite}@keyframes br{0%,100%{opacity:.75}50%{opacity:1}}</style><defs><linearGradient id="bg" x1="0" x2="1"><stop offset=".43" stop-color="#7c6cf0" stop-opacity="0"/><stop offset=".7" stop-color="#7c6cf0" stop-opacity=".2"/><stop offset="1" stop-color="#b3a6ff" stop-opacity=".46"/></linearGradient><linearGradient id="fade" x1="0" x2="1"><stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="360" height="30" fill="url(#fade)"/></mask><pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".07"/></pattern></defs><g mask="url(#m)"><rect class="br" width="360" height="30" fill="url(#bg)"/><circle class="d" cx="170" cy="9.2" r="0.83" style="animation-duration:2.7s;animation-delay:-2.2s"/><circle class="d" cx="170" cy="17.8" r="0.54" style="animation-duration:2.2s;animation-delay:-3.0s"/><circle class="d" cx="170" cy="9.7" r="0.64" style="animation-duration:3.6s;animation-delay:-1.7s"/><circle class="d" cx="170" cy="22.4" r="0.79" style="animation-duration:3.1s;animation-delay:-0.5s"/><circle class="d" cx="170" cy="18.0" r="1.02" style="animation-duration:2.9s;animation-delay:-2.7s"/><circle class="d" cx="170" cy="18.8" r="0.54" style="animation-duration:3.3s;animation-delay:-2.1s"/><circle class="d" cx="170" cy="10.6" r="0.52" style="animation-duration:3.4s;animation-delay:-1.7s"/><circle class="d" cx="170" cy="19.8" r="1.03" style="animation-duration:3.2s;animation-delay:-3.3s"/><circle class="d" cx="170" cy="12.7" r="0.98" style="animation-duration:2.8s;animation-delay:-3.4s"/><circle class="d" cx="170" cy="23.3" r="0.56" style="animation-duration:2.4s;animation-delay:-0.8s"/><circle class="d" cx="170" cy="25.2" r="0.76" style="animation-duration:3.1s;animation-delay:-1.1s"/><circle class="d" cx="170" cy="15.2" r="0.73" style="animation-duration:2.7s;animation-delay:-2.1s"/><circle class="d" cx="170" cy="16.9" r="1.04" style="animation-duration:3.2s;animation-delay:-3.3s"/><circle class="d" cx="170" cy="22.8" r="1.09" style="animation-duration:3.1s;animation-delay:-0.6s"/><rect width="360" height="30" fill="url(#grain)"/></g></svg>`

async function setHandoffCard($: EngineInterface, kind: HandoffCard['kind'], full: boolean, seen = false) {
  const at = await $.clock.now()
  await update($, handoffAdvice, () => null)
  await update($, handoffCard, () => ({ kind, full, at, seen }))
  // Gone after a while even with no reply; a timer that dies with its request leaves the next reply to clear it.
  if (!cardRunning(kind)) {
    try {
      $.clock.after(HANDOFF_CARD_MS, () => void update($, handoffCard, card => (card && card.at === at ? null : card)))
    } catch {}
  }
}

// The newest reply's text, so the warning card goes under its last block and nowhere else.
const lastAnswer = atom({ plugin: 'pilot', key: 'lastAnswer' } as const, '')
const lastTurn = atom({ plugin: 'pilot', key: 'lastTurn' } as const, null)
// The weighted tokens of the main thread's requests since the prompt; kept in lastTurn when the turn ends.
let turnCost = 0
const swampHiddenAt = atom({ plugin: 'pilot', key: 'swampHiddenAt' } as const, null)
// The first-run setup is not done: the footer offers "Setup".
const setupPending = atom({ plugin: 'pilot', key: 'setupPending' } as const, false)
// Why the judge the person picked is failing (Haiku stands in), or null when it works.
// The effortless settings panel is open above the prompt.
const settingsOpen = atom({ plugin: 'pilot', key: 'settingsOpen' } as const, false)
// What was changed in the panel and not saved yet, by field; Save applies it all, the cross drops it.
// The user and plugin skills, read when the settings panel opens.
const installedSkills = atom({ plugin: 'pilot', key: 'installedSkills' } as const, [])
const settingsDraft = atom({ plugin: 'pilot', key: 'settingsDraft' } as const, {})
const judgeDown = atom({ plugin: 'pilot', key: 'judgeDown' } as const, null)
// Which part of the settings panel is open: null for the cards.
type SettingsCard = 'effort' | 'model' | 'judge' | 'handoff' | 'show'
const settingsCard = atom({ plugin: 'pilot', key: 'settingsCard' } as const, null)
/** The settings panel's parts: a card each on the overview, and what the part is for, said once it is open. */
const CARDS: readonly { id: SettingsCard; title: string; about: string }[] = [
  { id: 'effort', title: 'Effort', about: 'How hard Claude thinks. The slider tips close calls; Min and Max are hard limits.' },
  { id: 'model', title: 'Model', about: "Whether a simple prompt may run on a cheaper model, and which model writes a compaction." },
  { id: 'handoff', title: 'Handoff & alerts', about: 'The full handoff skill, when to suggest compacting, and which alerts show.' },
  { id: 'show', title: 'Customize', about: 'How effortless looks and which parts it shows. Uninstall removes it.' },
  { id: 'judge', title: 'Judge', about: 'Haiku judges prompts and handoffs. Add Jev for quicker effort calls. Test checks it answers.' },
]
// The Model card: the two ways to run. Effort follows the judge in both.
const MODEL_CHOICES = [
  { value: 'on', label: 'Cheaper when it can', tag: 'experimental', about: "A simple prompt may run on Haiku or Sonnet. Rarely pays: the other model has to reread the whole chat." },
  { value: 'off', label: "Always the chat's", tag: '', about: "Every prompt keeps the model you picked. Only effort changes." },
] as const
const BIAS_WORDS = ['Cheapest', 'Cheaper', 'Balanced', 'Smarter', 'Smartest'] as const
// The settings panel's judge test: running, or what it found. Null before a test and once the panel closes.
const judgeTest = atom({ plugin: 'pilot', key: 'judgeTest' } as const, null)
// The judge-down band was closed for this reason; a new reason shows it again.
const judgeDownHidden = atom({ plugin: 'pilot', key: 'judgeDownHidden' } as const, null)
// A usage limit is close: which window, how much is used, when it resets. Null below the line.
const hot = atom({ plugin: 'pilot', key: 'hot' } as const, null)
const limits = atom({ plugin: 'pilot', key: 'limits' } as const, [] as { kind: string; percent: number; resetsAt: string | null }[])
const bandFolded = atom({ plugin: 'pilot', key: 'bandFolded' } as const, false)
let bandFoldedLoaded = false
/** Folds the slim bar away or brings it back; kept in the store, so a new chat opens it as it was left. */
async function setFolded($: EngineInterface, folded: boolean) {
  await update($, bandFolded, () => folded)
  await $.store.set('bandFolded', folded).catch(() => undefined)
  $.ui.invalidate('ui.render')
}
const chatTokens = atom({ plugin: 'pilot', key: 'chatTokens' } as const, 0)
// The running-hot band was closed at this many percent; it returns ten points later or in a new window.
// The running-hot band closed with its cross: in which window and how full. Kept in the store too, so a new chat keeps it closed.
const hotHidden = atom({ plugin: 'pilot', key: 'hotHidden' } as const, null as HotClosed | null)
// The agent panel: this chat's subagents, and the card opened in it (hooks/agents.tsx).
const agentsState = atom({ plugin: 'pilot', key: 'agents' } as const, [])
const agentsOpen = atom({ plugin: 'pilot', key: 'agentsOpen' } as const, null)
// The panel's map: the files touched, the main chat's own steps, the module opened in its list.
const agentFiles = atom({ plugin: 'pilot', key: 'agentFiles' } as const, [])
const agentSteps = atom({ plugin: 'pilot', key: 'agentSteps' } as const, null)
const agentsModule = atom({ plugin: 'pilot', key: 'agentsModule' } as const, null)
// Save mode: Auto picks at most medium until this time (ms), when the limit resets.
const saveUntil = atom({ plugin: 'pilot', key: 'saveUntil' } as const, null)
const isColdHidden = atom({ plugin: 'pilot', key: 'isColdHidden' } as const, false)
// The setup guide above the prompt: which step it shows, or null when it is closed.
const setupStep = atom({ plugin: 'pilot', key: 'setupStep' } as const, null)
// What was picked in the setup guide and not saved yet: it is saved in one go at Done or ✕. Each saved setting reloads
// the plugin, and the app says so in the chat, so a save per click filled the chat with notices.
const setupDraft = atom({ plugin: 'pilot', key: 'setupDraft' } as const, {})

// The band above the prompt when the cache has gone cold: an icy gradient with snowflakes drifting down.
const FROST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 360 30" preserveAspectRatio="xMaxYMid slice"><style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}.f path{stroke:#eaf6ff;stroke-width:.5;stroke-linecap:round;fill:none}.f{transform-box:fill-box;transform-origin:center;animation:spin linear infinite;opacity:.75}@keyframes spin{to{transform:rotate(360deg)}}.fr{stroke:#dff1ff;stroke-width:.4;fill:none;stroke-linecap:round;opacity:.5}.gl{fill:#fff;opacity:0;animation:tw 3.6s ease-in-out infinite}@keyframes tw{0%,70%,100%{opacity:0}80%{opacity:.9}}.br{animation:br 6s ease-in-out infinite}@keyframes br{0%,100%{opacity:.85}50%{opacity:1}}</style><defs><linearGradient id="ice" x1="0" x2="1"><stop offset=".43" stop-color="#5aa9e6" stop-opacity="0"/><stop offset=".62" stop-color="#5aa9e6" stop-opacity=".12"/><stop offset=".85" stop-color="#8fd0ff" stop-opacity=".28"/><stop offset="1" stop-color="#cdeaff" stop-opacity=".42"/></linearGradient><radialGradient id="cold" cx="330" cy="15" r="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e9f6ff" stop-opacity=".22"/><stop offset="1" stop-color="#e9f6ff" stop-opacity="0"/></radialGradient><linearGradient id="rime" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".22" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient><linearGradient id="fade" x1="0" x2="1"><stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="360" height="30" fill="url(#fade)"/></mask><pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".07"/></pattern></defs><g mask="url(#m)"><rect class="br" width="360" height="30" fill="url(#ice)"/><rect width="360" height="30" fill="url(#cold)"/><rect width="360" height="30" fill="url(#rime)"/><rect width="360" height="30" fill="url(#grain)"/><path class="fr" d="M360.0 3.0L354.1 2.1M354.1 2.1L349.8 1.8M349.8 1.8L346.7 2.1M346.7 2.1L344.4 2.2M348.2 1.9L347.5 3.2M351.9 1.9L350.3 3.1M350.3 3.1L349.2 3.8M357.0 2.5L355.1 0.6M355.1 0.6L353.5 -0.5M353.5 -0.5L352.4 -1.4M356.1 1.6L354.9 1.4M360.0 27.0L354.1 27.9M354.1 27.9L349.8 28.5M349.8 28.5L346.9 29.6M346.9 29.6L345.0 30.8M348.3 29.0L347.1 28.4M351.9 28.2L350.9 29.9M350.9 29.9L350.3 31.1M357.0 27.5L355.2 29.4M355.2 29.4L353.9 30.9M353.9 30.9L352.8 31.8M356.1 28.4L354.9 28.5M350.0 30.0L348.8 26.2M348.8 26.2L347.9 23.4M347.9 23.4L347.6 21.4M347.6 21.4L347.7 19.9M348.4 24.8L348.9 23.6M349.4 28.1L350.2 26.5M350.2 26.5L350.8 25.3M352.0 0.0L351.0 3.9M351.0 3.9L350.4 6.7M350.4 6.7L349.6 8.6M349.6 8.6L349.0 10.0M350.7 5.3L349.6 5.9M351.5 1.9L352.2 3.6M352.2 3.6L352.9 4.7"/><circle class="gl" cx="228" cy="26" r="0.5" style="animation-delay:0s"/><circle class="gl" cx="205" cy="4" r="0.45" style="animation-delay:1.3s"/><circle class="gl" cx="186" cy="26" r="0.4" style="animation-delay:2.4s"/><circle class="gl" cx="262" cy="6" r="0.5" style="animation-delay:0.7s"/><circle class="gl" cx="300" cy="25" r="0.45" style="animation-delay:3.1s"/><circle class="gl" cx="330" cy="6" r="0.5" style="animation-delay:1.9s"/><g class="f" style="animation-duration:10s;animation-delay:0s"><path d="M236.0 9.0L236.0 13.2M236.0 10.9L237.0 11.8M236.0 10.9L235.0 11.8M236.0 11.9L236.7 12.6M236.0 11.9L235.3 12.6M236.0 9.0L232.4 11.1M234.4 9.9L234.0 11.2M234.4 9.9L233.1 9.6M233.5 10.5L233.2 11.4M233.5 10.5L232.6 10.2M236.0 9.0L232.4 6.9M234.4 8.1L233.1 8.4M234.4 8.1L234.0 6.8M233.5 7.5L232.6 7.8M233.5 7.5L233.2 6.6M236.0 9.0L236.0 4.8M236.0 7.1L235.0 6.2M236.0 7.1L237.0 6.2M236.0 6.1L235.3 5.4M236.0 6.1L236.7 5.4M236.0 9.0L239.6 6.9M237.6 8.1L238.0 6.8M237.6 8.1L238.9 8.4M238.5 7.5L238.8 6.6M238.5 7.5L239.4 7.8M236.0 9.0L239.6 11.1M237.6 9.9L238.9 9.6M237.6 9.9L238.0 11.2M238.5 10.5L239.4 10.2M238.5 10.5L238.8 11.4"/></g><g class="f" style="animation-duration:12s;animation-delay:-4s"><path d="M214.0 21.0L214.0 24.2M214.0 22.4L214.7 23.2M214.0 22.4L213.3 23.2M214.0 23.2L214.5 23.7M214.0 23.2L213.5 23.7M214.0 21.0L211.2 22.6M212.8 21.7L212.5 22.7M212.8 21.7L211.8 21.5M212.1 22.1L211.9 22.8M212.1 22.1L211.4 21.9M214.0 21.0L211.2 19.4M212.8 20.3L211.8 20.5M212.8 20.3L212.5 19.3M212.1 19.9L211.4 20.1M212.1 19.9L211.9 19.2M214.0 21.0L214.0 17.8M214.0 19.6L213.3 18.8M214.0 19.6L214.7 18.8M214.0 18.8L213.5 18.3M214.0 18.8L214.5 18.3M214.0 21.0L216.8 19.4M215.2 20.3L215.5 19.3M215.2 20.3L216.2 20.5M215.9 19.9L216.1 19.2M215.9 19.9L216.6 20.1M214.0 21.0L216.8 22.6M215.2 21.7L216.2 21.5M215.2 21.7L215.5 22.7M215.9 22.1L216.6 21.9M215.9 22.1L216.1 22.8"/></g><g class="f" style="animation-duration:11s;animation-delay:-7s"><path d="M194.0 8.0L194.0 10.6M194.0 9.2L194.6 9.8M194.0 9.2L193.4 9.8M194.0 9.8L194.4 10.2M194.0 9.8L193.6 10.2M194.0 8.0L191.7 9.3M193.0 8.6L192.8 9.4M193.0 8.6L192.2 8.4M192.4 8.9L192.3 9.5M192.4 8.9L191.9 8.8M194.0 8.0L191.7 6.7M193.0 7.4L192.2 7.6M193.0 7.4L192.8 6.6M192.4 7.1L191.9 7.2M192.4 7.1L192.3 6.5M194.0 8.0L194.0 5.4M194.0 6.8L193.4 6.2M194.0 6.8L194.6 6.2M194.0 6.2L193.6 5.8M194.0 6.2L194.4 5.8M194.0 8.0L196.3 6.7M195.0 7.4L195.2 6.6M195.0 7.4L195.8 7.6M195.6 7.1L195.7 6.5M195.6 7.1L196.1 7.2M194.0 8.0L196.3 9.3M195.0 8.6L195.8 8.4M195.0 8.6L195.2 9.4M195.6 8.9L196.1 8.8M195.6 8.9L195.7 9.5"/></g><g class="f" style="animation-duration:13s;animation-delay:-2s"><path d="M176.0 19.0L176.0 21.2M176.0 20.0L176.5 20.5M176.0 20.0L175.5 20.5M176.0 20.5L176.3 20.9M176.0 20.5L175.7 20.9M176.0 19.0L174.1 20.1M175.1 19.5L175.0 20.2M175.1 19.5L174.5 19.3M174.7 19.8L174.5 20.2M174.7 19.8L174.2 19.6M176.0 19.0L174.1 17.9M175.1 18.5L174.5 18.7M175.1 18.5L175.0 17.8M174.7 18.2L174.2 18.4M174.7 18.2L174.5 17.8M176.0 19.0L176.0 16.8M176.0 18.0L175.5 17.5M176.0 18.0L176.5 17.5M176.0 17.5L175.7 17.1M176.0 17.5L176.3 17.1M176.0 19.0L177.9 17.9M176.9 18.5L177.0 17.8M176.9 18.5L177.5 18.7M177.3 18.2L177.5 17.8M177.3 18.2L177.8 18.4M176.0 19.0L177.9 20.1M176.9 19.5L177.5 19.3M176.9 19.5L177.0 20.2M177.3 19.8L177.8 19.6M177.3 19.8L177.5 20.2"/></g><g class="f" style="animation-duration:14s;animation-delay:-9s"><path d="M252.0 22.0L252.0 24.4M252.0 23.1L252.5 23.6M252.0 23.1L251.5 23.6M252.0 23.7L252.4 24.1M252.0 23.7L251.6 24.1M252.0 22.0L249.9 23.2M251.1 22.5L250.9 23.3M251.1 22.5L250.3 22.3M250.5 22.8L250.4 23.4M250.5 22.8L250.0 22.7M252.0 22.0L249.9 20.8M251.1 21.5L250.3 21.7M251.1 21.5L250.9 20.7M250.5 21.2L250.0 21.3M250.5 21.2L250.4 20.6M252.0 22.0L252.0 19.6M252.0 20.9L251.5 20.4M252.0 20.9L252.5 20.4M252.0 20.3L251.6 19.9M252.0 20.3L252.4 19.9M252.0 22.0L254.1 20.8M252.9 21.5L253.1 20.7M252.9 21.5L253.7 21.7M253.5 21.2L253.6 20.6M253.5 21.2L254.0 21.3M252.0 22.0L254.1 23.2M252.9 22.5L253.7 22.3M252.9 22.5L253.1 23.3M253.5 22.8L254.0 22.7M253.5 22.8L253.6 23.4"/></g></g></svg>`
// The frost is drawn larger than the band and cut by it: wide enough for the right side, tall enough for any band.
const FROST_WIDTH = 440
const FROST_HEIGHT = 64
// TypeSafe's mark (from typesafe.ai), drawn beside the Jev button: a Button holds text only.
const TYPESAFE_MARK = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="18" viewBox="0 0 16.487 24"><style>svg{background:transparent;display:block}</style><path d="M 12.756 2.928 L 12.756 7.067 L 16.486 9.487 L 16.487 18.652 L 8.244 24 L 3.732 21.073 L 3.732 16.82 L 0 14.399 L 0 5.35 L 0.355 5.118 L 8.244 0 Z M 5.94 20.65 L 8.242 22.144 L 14.275 18.227 L 11.975 16.735 Z M 9.022 10.332 L 9.022 14.4 L 5.29 16.822 L 5.29 19.216 L 11.197 15.383 L 11.197 8.921 Z M 12.756 15.384 L 14.928 16.794 L 14.928 10.332 L 12.756 8.922 Z M 2.21 13.976 L 4.511 15.47 L 6.812 13.976 L 4.512 12.485 Z M 1.559 6.193 L 1.559 12.544 L 3.731 11.134 L 3.731 7.066 L 7.464 4.643 L 7.464 2.36 L 1.56 6.193 Z M 5.291 11.132 L 7.463 12.542 L 7.463 10.332 L 5.292 8.921 L 5.292 11.132 Z M 5.94 7.487 L 8.244 8.981 L 10.544 7.488 L 8.244 5.994 Z M 9.024 4.643 L 11.196 6.054 L 11.196 3.774 L 9.024 2.359 Z" fill="#ffffff"/></svg>`
// Claude's mark (from claude.ai) in white, drawn beside the Haiku button.
const CLAUDE_MARK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 248 248"><style>svg{background:transparent;display:block}</style><path d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z" fill="#ffffff"/></svg>`
// The band when the context is swamped: murky green, bubbles rising, slow ripples.
const SWAMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 360 30" preserveAspectRatio="xMaxYMid slice"><style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}.b{fill:none;stroke:#cfe8b8;stroke-width:.5;opacity:0;animation-name:rise;animation-timing-function:ease-in;animation-iteration-count:infinite}@keyframes rise{0%{opacity:0;transform:translate(0,0)}15%{opacity:.7}80%{opacity:.5}100%{opacity:0;transform:translate(3px,-30px)}}.rp{fill:none;stroke:#a7c98f;stroke-width:.4;stroke-linecap:round;opacity:.25;animation:drift 7s ease-in-out infinite}@keyframes drift{0%,100%{transform:translate(0,0);opacity:.15}50%{transform:translate(4px,0);opacity:.4}}.mk{animation:mk 8s ease-in-out infinite}@keyframes mk{0%,100%{opacity:.85}50%{opacity:1}}</style><defs><linearGradient id="bog" x1="0" x2="1"><stop offset=".43" stop-color="#4f7a3a" stop-opacity="0"/><stop offset=".62" stop-color="#4f7a3a" stop-opacity=".16"/><stop offset=".85" stop-color="#6f9a4f" stop-opacity=".32"/><stop offset="1" stop-color="#9cc27a" stop-opacity=".42"/></linearGradient><linearGradient id="silt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#2b3a1f" stop-opacity=".18"/><stop offset="1" stop-color="#1c2614" stop-opacity=".45"/></linearGradient><linearGradient id="fade" x1="0" x2="1"><stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="360" height="30" fill="url(#fade)"/></mask><pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".06"/></pattern></defs><g mask="url(#m)"><rect class="mk" width="360" height="30" fill="url(#bog)"/><rect width="360" height="30" fill="url(#silt)"/><rect width="360" height="30" fill="url(#grain)"/><path class="rp" style="animation-delay:-0s" d="M190 22 q6 -2 12 0 t12 0"/><path class="rp" style="animation-delay:-2.5s" d="M226 9 q6 -2 12 0 t12 0"/><path class="rp" style="animation-delay:-5s" d="M250 18 q6 -2 12 0 t12 0"/><path class="rp" style="animation-delay:-1.5s" d="M300 24 q6 -2 12 0 t12 0"/><path class="rp" style="animation-delay:-3.8s" d="M322 7 q6 -2 12 0 t12 0"/><circle class="b" cx="168" cy="32" r="1.6" style="animation-duration:6.5s;animation-delay:-0s"/><circle class="b" cx="182" cy="32" r="1.1" style="animation-duration:8s;animation-delay:-2.1s"/><circle class="b" cx="197" cy="32" r="2.0" style="animation-duration:7s;animation-delay:-4.2s"/><circle class="b" cx="210" cy="32" r="1.3" style="animation-duration:9s;animation-delay:-1.0s"/><circle class="b" cx="224" cy="32" r="1.7" style="animation-duration:7.5s;animation-delay:-3.3s"/><circle class="b" cx="238" cy="32" r="1.0" style="animation-duration:8.5s;animation-delay:-5.1s"/><circle class="b" cx="252" cy="32" r="1.4" style="animation-duration:6.8s;animation-delay:-2.6s"/><circle class="b" cx="176" cy="32" r="0.9" style="animation-duration:9.5s;animation-delay:-6.0s"/><circle class="b" cx="232" cy="32" r="0.8" style="animation-duration:10s;animation-delay:-0.5s"/></g></svg>`
// The band when a usage limit is close: embers, sparks rising.
const EMBER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 360 30" preserveAspectRatio="xMaxYMid slice"><style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}.s{fill:#ffb06a;opacity:0;animation-name:up;animation-timing-function:ease-out;animation-iteration-count:infinite}@keyframes up{0%{opacity:0;transform:translate(0,0)}12%{opacity:.95}70%{opacity:.6}100%{opacity:0;transform:translate(4px,-30px)}}.br{animation:br 3.4s ease-in-out infinite}@keyframes br{0%,100%{opacity:.8}50%{opacity:1}}.br2{animation:br2 2.2s ease-in-out infinite}@keyframes br2{0%,100%{opacity:.7}40%{opacity:1}70%{opacity:.8}}</style><defs><linearGradient id="heat" x1="0" x2="1"><stop offset=".43" stop-color="#b8461b" stop-opacity="0"/><stop offset=".62" stop-color="#b8461b" stop-opacity=".16"/><stop offset=".85" stop-color="#d9622a" stop-opacity=".32"/><stop offset="1" stop-color="#f08a3c" stop-opacity=".42"/></linearGradient><linearGradient id="glow" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#e2581f" stop-opacity=".08"/><stop offset="1" stop-color="#ff7a2e" stop-opacity=".32"/></linearGradient><linearGradient id="fade" x1="0" x2="1"><stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="360" height="30" fill="url(#fade)"/></mask><pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".06"/></pattern></defs><g mask="url(#m)"><rect class="br" width="360" height="30" fill="url(#heat)"/><rect class="br2" width="360" height="30" fill="url(#glow)"/><circle class="s" cx="166" cy="31" r="0.7" style="animation-duration:3.2s;animation-delay:-0s"/><circle class="s" cx="178" cy="31" r="0.5" style="animation-duration:4.1s;animation-delay:-1.2s"/><circle class="s" cx="191" cy="31" r="0.8" style="animation-duration:3.6s;animation-delay:-2.4s"/><circle class="s" cx="203" cy="31" r="0.5" style="animation-duration:4.6s;animation-delay:-0.7s"/><circle class="s" cx="216" cy="31" r="0.7" style="animation-duration:3.9s;animation-delay:-3.0s"/><circle class="s" cx="228" cy="31" r="0.6" style="animation-duration:4.3s;animation-delay:-1.8s"/><circle class="s" cx="241" cy="31" r="0.8" style="animation-duration:3.4s;animation-delay:-0.4s"/><circle class="s" cx="254" cy="31" r="0.5" style="animation-duration:4.8s;animation-delay:-2.9s"/><circle class="s" cx="184" cy="31" r="0.4" style="animation-duration:5.0s;animation-delay:-3.6s"/><circle class="s" cx="236" cy="31" r="0.4" style="animation-duration:4.4s;animation-delay:-2.1s"/><rect width="360" height="30" fill="url(#grain)"/></g></svg>`
// The band when the judge the person picked is failing: signal lost, a blip sweeping along a flat line.
const DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 360 30" preserveAspectRatio="xMaxYMid slice"><style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}.tr{fill:none;stroke:#e6ecf8;stroke-width:.6;stroke-linecap:round;stroke-linejoin:round}.gw{fill:none;stroke:#9fb0d6;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.35}.hd{animation:hd 4.8s linear infinite}@keyframes hd{0%{transform:translate(150px,0)}88%,100%{transform:translate(372px,0)}}.gl{animation:gl 4.8s ease-in-out infinite}@keyframes gl{0%,100%{opacity:.75}50%{opacity:1}}</style><defs><linearGradient id="steel" x1="0" x2="1"><stop offset=".43" stop-color="#5d6a86" stop-opacity="0"/><stop offset=".65" stop-color="#5d6a86" stop-opacity=".16"/><stop offset=".88" stop-color="#7d8aa8" stop-opacity=".32"/><stop offset="1" stop-color="#a3afca" stop-opacity=".42"/></linearGradient><radialGradient id="glow" cx="330" cy="15" r="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c4cee6" stop-opacity=".22"/><stop offset="1" stop-color="#8d9ab8" stop-opacity="0"/></radialGradient><pattern id="grid" width="7.5" height="7.5" patternUnits="userSpaceOnUse"><path d="M7.5 0 L0 0 L0 7.5" fill="none" stroke="#fff" stroke-opacity=".06" stroke-width=".25"/></pattern><linearGradient id="trail" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient><linearGradient id="fade" x1="0" x2="1"><stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="360" height="30" fill="url(#fade)"/></mask><mask id="sweep"><g class="hd"><rect x="-110" y="0" width="110" height="30" fill="url(#trail)"/></g></mask></defs><g mask="url(#m)"><rect class="gl" width="360" height="30" fill="url(#steel)"/><rect width="360" height="30" fill="url(#glow)"/><rect width="360" height="30" fill="url(#grid)"/><g mask="url(#sweep)"><g transform="translate(0 3.5)"><path class="gw" d="M150 15 L196 15 L196.0 15.0 L199.0 13.8 L202.0 15.0 L204.0 15.0 L205.5 16.5 L208.0 5.0 L210.5 19.0 L212.0 15.0 L216.0 15.0 L220.0 13.0 L224.0 15.0 L238 15 L238.0 15.0 L241.0 14.2 L244.0 15.0 L246.0 15.0 L247.5 16.1 L250.0 8.0 L252.5 17.8 L254.0 15.0 L258.0 15.0 L262.0 13.6 L266.0 15.0 L278 15 L278.0 15.0 L281.0 14.5 L284.0 15.0 L286.0 15.0 L287.5 15.6 L290.0 11.2 L292.5 16.5 L294.0 15.0 L298.0 15.0 L302.0 14.2 L306.0 15.0 L316 15 L316.0 15.0 L319.0 14.9 L322.0 15.0 L324.0 15.0 L325.5 15.2 L328.0 13.8 L330.5 15.5 L332.0 15.0 L336.0 15.0 L340.0 14.8 L344.0 15.0 L360 15"/><path class="tr" d="M150 15 L196 15 L196.0 15.0 L199.0 13.8 L202.0 15.0 L204.0 15.0 L205.5 16.5 L208.0 5.0 L210.5 19.0 L212.0 15.0 L216.0 15.0 L220.0 13.0 L224.0 15.0 L238 15 L238.0 15.0 L241.0 14.2 L244.0 15.0 L246.0 15.0 L247.5 16.1 L250.0 8.0 L252.5 17.8 L254.0 15.0 L258.0 15.0 L262.0 13.6 L266.0 15.0 L278 15 L278.0 15.0 L281.0 14.5 L284.0 15.0 L286.0 15.0 L287.5 15.6 L290.0 11.2 L292.5 16.5 L294.0 15.0 L298.0 15.0 L302.0 14.2 L306.0 15.0 L316 15 L316.0 15.0 L319.0 14.9 L322.0 15.0 L324.0 15.0 L325.5 15.2 L328.0 13.8 L330.5 15.5 L332.0 15.0 L336.0 15.0 L340.0 14.8 L344.0 15.0 L360 15"/></g></g></g></svg>`
// The right of the setup guide, pure decoration (the name is on the left): a purple gradient with a soft glow,
// faint light streaks and grain, a still star, and small sparkles that twinkle in and out here and there. One constant source, so the app never rebuilds its frame (a changing source flickers); the
// motion is CSS inside it.
const BRAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 360 30" preserveAspectRatio="xMaxYMid slice"><style>:root{color-scheme:light dark}html,body{margin:0}svg{background:transparent;display:block}.sp{fill:#fff;opacity:0;transform:scale(0);animation-name:gl;animation-timing-function:ease-in-out;animation-iteration-count:infinite}@keyframes gl{0%,72%,100%{opacity:0;transform:scale(0) rotate(0deg)}82%{opacity:.9;transform:scale(1) rotate(30deg)}92%{opacity:0;transform:scale(.2) rotate(60deg)}}.br{animation:br 6s ease-in-out infinite}@keyframes br{0%,100%{opacity:.85}50%{opacity:1}}</style><defs><linearGradient id="bg" x1="0" x2="1"><stop offset=".43" stop-color="#7c6cf0" stop-opacity="0"/><stop offset=".62" stop-color="#7c6cf0" stop-opacity=".16"/><stop offset=".85" stop-color="#8f7ff0" stop-opacity=".34"/><stop offset="1" stop-color="#b3a6ff" stop-opacity=".48"/></linearGradient><radialGradient id="glow" cx="320" cy="15" r="70" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c9bdff" stop-opacity=".28"/><stop offset="1" stop-color="#9a86ff" stop-opacity="0"/></radialGradient><linearGradient id="fade" x1="0" x2="1"><stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="360" height="30" fill="url(#fade)"/></mask><pattern id="grain" width="2" height="2" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#fff" fill-opacity=".07"/></pattern></defs><g mask="url(#m)"><rect class="br" width="360" height="30" fill="url(#bg)"/><rect width="360" height="30" fill="url(#glow)"/><rect width="360" height="30" fill="url(#grain)"/><line x1="186" y1="32" x2="198" y2="-2" stroke="#fff" stroke-opacity="0.04" stroke-width="3"/><line x1="204" y1="32" x2="216" y2="-2" stroke="#fff" stroke-opacity="0.05" stroke-width="1.2"/><line x1="226" y1="32" x2="238" y2="-2" stroke="#fff" stroke-opacity="0.05" stroke-width="4"/><line x1="262" y1="32" x2="274" y2="-2" stroke="#fff" stroke-opacity="0.04" stroke-width="1.5"/><line x1="290" y1="32" x2="302" y2="-2" stroke="#fff" stroke-opacity="0.05" stroke-width="3"/><line x1="320" y1="32" x2="332" y2="-2" stroke="#fff" stroke-opacity="0.04" stroke-width="1.2"/><path class="sp" style="transform-origin:168px 8px;animation-duration:4.2s;animation-delay:0.3s" d="M168 6.4 L168.34 7.66 L169.6 8 L168.34 8.34 L168 9.6 L167.66 8.34 L166.4 8 L167.66 7.66 Z"/><path class="sp" style="transform-origin:182px 22px;animation-duration:5.1s;animation-delay:2.1s" d="M182 20.7 L182.27 21.73 L183.3 22 L182.27 22.27 L182 23.3 L181.73 22.27 L180.7 22 L181.73 21.73 Z"/><path class="sp" style="transform-origin:196px 6px;animation-duration:3.8s;animation-delay:1.2s" d="M196 4.2 L196.38 5.62 L197.8 6 L196.38 6.38 L196 7.8 L195.62 6.38 L194.2 6 L195.62 5.62 Z"/><path class="sp" style="transform-origin:208px 19px;animation-duration:4.6s;animation-delay:3.4s" d="M208 17.8 L208.25 18.75 L209.2 19 L208.25 19.25 L208 20.2 L207.75 19.25 L206.8 19 L207.75 18.75 Z"/><path class="sp" style="transform-origin:221px 9px;animation-duration:5.4s;animation-delay:0.9s" d="M221 7.5 L221.31 8.69 L222.5 9 L221.31 9.31 L221 10.5 L220.69 9.31 L219.5 9 L220.69 8.69 Z"/><path class="sp" style="transform-origin:232px 23px;animation-duration:4.0s;animation-delay:2.7s" d="M232 21.9 L232.23 22.77 L233.1 23 L232.23 23.23 L232 24.1 L231.77 23.23 L230.9 23 L231.77 22.77 Z"/><path class="sp" style="transform-origin:244px 7px;animation-duration:4.8s;animation-delay:1.8s" d="M244 5.7 L244.27 6.73 L245.3 7 L244.27 7.27 L244 8.3 L243.73 7.27 L242.7 7 L243.73 6.73 Z"/><path class="sp" style="transform-origin:176px 15px;animation-duration:5.8s;animation-delay:4.0s" d="M176 14.0 L176.21 14.79 L177.0 15 L176.21 15.21 L176 16.0 L175.79 15.21 L175.0 15 L175.79 14.79 Z"/><path class="sp" style="transform-origin:214px 26px;animation-duration:4.4s;animation-delay:3.0s" d="M214 25.0 L214.21 25.79 L215.0 26 L214.21 26.21 L214 27.0 L213.79 26.21 L213.0 26 L213.79 25.79 Z"/><path class="sp" style="transform-origin:238px 15px;animation-duration:3.6s;animation-delay:0.1s" d="M238 14.0 L238.21 14.79 L239.0 15 L238.21 15.21 L238 16.0 L237.79 15.21 L237.0 15 L237.79 14.79 Z"/></g></svg>`

// The handoff card once it has landed: the brand's art in green, with a big dark checkmark on the right.
// The dashboard sits there all the time, so it is grey: purple is kept for the moments that ask for attention. Its
// art is the brand's, in grey and at 40% of its strength; only the ✦ keeps the accent.
const DASH_SVG = BRAND_SVG.replace(/stop-opacity="([0-9.]+)"/g, (_m, v: string) => `stop-opacity="${(Number(v) * 0.4).toFixed(3)}"`)
  .replace(/#(7c6cf0|8f7ff0|b3a6ff|c9bdff|9a86ff)/g, '#9a9aa2')
let DASH_BG = '#141416'
let DASH_EDGE = '#2a2a2f'
/** The settings title's word in the website hero's style: crisp, going soft and grainy at its bottom right (a radial
 * mask fades the crisp copy out there and a copy through the site's #grainy filter takes over). The app gives the image
 * the band's font. */
const SETTINGS_TITLE = `<svg xmlns="http://www.w3.org/2000/svg" width="92" height="28" viewBox="0 0 92 28"><defs><radialGradient id="c" cx="1" cy="1" r=".75" gradientTransform="matrix(.7 0 0 2.3 .3 -1.3)"><stop offset=".35" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient><radialGradient id="s" cx=".9" cy=".85" r=".55" gradientTransform="matrix(.7 0 0 2.3 .27 -1.1)"><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="mc"><rect width="92" height="28" fill="url(#c)"/></mask><mask id="ms"><rect width="92" height="28" fill="url(#s)"/></mask><filter id="g" x="-20%" y="-40%" width="140%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="moved"/><feGaussianBlur in="moved" stdDeviation="0.35" result="soft"/><feComponentTransfer in="noise" result="dots"><feFuncA type="discrete" tableValues="0 1 1 1 1"/></feComponentTransfer><feComposite in="soft" in2="dots" operator="in"/></filter></defs><g font-size="21" font-weight="600" letter-spacing="-.5"><text x="1" y="20" fill="#ffffff" mask="url(#mc)">pilot</text><g mask="url(#ms)"><text x="1" y="20" fill="#ffffff" filter="url(#g)">pilot</text></g></g></svg>`
/** The mark as the settings bar shows it: big, tilted and faint, cut off by the bar. */
const SETTINGS_MARK = MARK_SVG.replace('<g mask=', '<g opacity=".2" transform="rotate(9 50 50)" mask=')
// The dashboard's mark (see dash-mark): its size, and its look with Auto off.
const DASH_MARK_SIZE = 18
const DASH_MARK_OFF = MARK_SVG.replace('<g mask=', '<g opacity=".35" mask=')
/** How long a band's entrance runs: it is drawn only this long after the band appears, since every redraw of the band
 * (a choice, the minute tick) would replay it. */
const INTRO_MS = 1300
// The band last drawn above the prompt, and when it appeared (see introShows).
let introKind = ''
let introAt = 0
/** Whether the band of `kind` is still in its entrance: true for INTRO_MS after it replaced another band. */
/** An animated Svg drawn `elapsedMs` into its animations. Every redraw rebuilds the band and starts its images' CSS
 * animations over; with this, a redraw mid-animation picks it up where it was instead of jumping back. */
export function inPhase(svg: string, elapsedMs: number): string {
  return svg.replace('</svg>', `<style>svg *{animation-delay:${(-Math.max(0, elapsedMs) / 1000).toFixed(3)}s !important}</style></svg>`)
}
// How far the entrance on screen is, for introLayer.
let introElapsed = 0
// Set when a band replaces another, taken by the first draw of the new one.
let introFresh = false
async function introShows($: EngineInterface, kind: string): Promise<boolean> {
  const now = await $.clock.now()
  if (kind !== introKind) {
    introKind = kind
    introAt = now
    introFresh = true
    $.clock.after(INTRO_MS + 100, () => $.ui.invalidate('ui.render'))
  }
  introElapsed = now - introAt
  return introElapsed < INTRO_MS
}
/** The entrance layer (INTRO_SVG) in a band's own colours, or nothing once the entrance is over. */
// The mark beside a card's title, sized to one line of text.
const TITLE_MARK_SIZE = 16

/** A card's title with the effortless mark where the ✦ stood; the ✦ stays where the surface draws no images. */
function markTitle(els: { Box: unknown; Text: unknown; Svg?: unknown }, key: string, color: string, title: string, mark = MARK_SVG) {
  const { Box: B, Text: T, Svg: S } = els as unknown as { Box: (p: Record<string, unknown>) => unknown; Text: (p: Record<string, unknown>) => unknown; Svg?: (p: Record<string, unknown>) => unknown }
  if (!S) return <T key={key} color={color} bold wrap="truncate">{title}</T>
  return (
    <B key={key} flexDirection="row" alignItems="center" flexShrink={1} minWidth={0}>
      <B flexShrink={0} marginRight={1} alignItems="center">
        <S source={mark} alt="effortless" width={TITLE_MARK_SIZE} height={TITLE_MARK_SIZE} />
      </B>
      <T color={color} bold wrap="truncate">{title.replace(/^✦ /, '')}</T>
    </B>
  )
}

function introLayer(els: { Box: unknown; Svg?: unknown }, key: string, show: boolean, wash = '#8b6cff', light = '#b9a7ff') {
  if (!els.Svg || !show) return null
  const { Box: B, Svg: S } = els as unknown as { Box: (p: Record<string, unknown>) => unknown; Svg: (p: Record<string, unknown>) => unknown }
  return (
    <B key={`${key}-intro`} position="absolute" top={-1} left={0} right={0} bottom={-1}>
      <S source={inPhase(INTRO_SVG.replace('#8b6cff', wash).replace('#b9a7ff', light), introElapsed)} alt="" width={1600} height={240} />
    </B>
  )
}
/** The settings panel's top bar: a shade above the band. */
let DASH_HEAD = '#18181b'
const DASH_TEXT = '#d4d4d8'
/** The dashboard's quieter figures: the cache countdown while it has time left. */
const DASH_DIM = '#8b8b93'
// A settings card under the pointer: a shade up from the band, its edge a shade up from that.
let CARD_HOVER = '#1c1c20'
let CARD_HOVER_EDGE = '#3b3b42'
const DONE_SVG = BRAND_SVG
  .replace(/#7c6cf0/g, '#2fae62').replace(/#8f7ff0/g, '#3cc472').replace(/#b3a6ff/g, '#7fe0a4')
  .replace(/#c9bdff/g, '#b4f0c8').replace(/#9a86ff/g, '#4fd486')
  .replace('</g></svg>', '<path d="M323 15.5 L330 22 L345 7.5" fill="none" stroke="#0c3a20" stroke-opacity=".8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g></svg>')
const DONE_ACCENT = '#7fe0a4'
const DONE_BG = '#0f1c15'
// The Updated card: near black, a dim green edge; the green is in its title, the check and the sparkles.
const UPDATED_BG = '#08090a'
const UPDATED_EDGE = '#1f4a33'
// The brand art of the offer card, mirrored to the left and turned green: the landed card keeps its texture and sparkles
// behind the mark and title, while the links on the right stay on near black.
const UPDATED_GLOW_SVG = BRAND_SVG
  .replace('preserveAspectRatio="xMaxYMid slice"', 'preserveAspectRatio="xMinYMid slice"')
  .replace('</defs>', '</defs><g transform="translate(360 0) scale(-1 1)">').replace('</svg>', '</g></svg>')
  .replace(/#7c6cf0/g, '#2f9a5e').replace(/#8f7ff0/g, '#3fae6e').replace(/#b3a6ff/g, '#7fe0a4').replace(/#c9bdff/g, '#a8ecc2').replace(/#9a86ff/g, '#4cbf7c')
  .replace(/stop-opacity="([0-9.]+)"/g, (_m, v: string) => `stop-opacity="${(Number(v) * 0.6).toFixed(3)}"`)
// The Share icon: an arrow leaving a tray, white like the GitHub mark beside it.
const SHARE_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16"><path fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8 10V1.8M4.8 4.8L8 1.6l3.2 3.2M2.5 8.5v4.8c0 .4.3.7.7.7h9.6c.4 0 .7-.3.7-.7V8.5"/></svg>`
// A thin vertical line between the links on the Updated card.
const DIVIDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="18" viewBox="0 0 1 18"><rect width="1" height="18" fill="#ffffff" fill-opacity=".16"/></svg>`
// Hover on the near-black card: a light veil (the dark one used elsewhere is invisible here).
const UPDATED_HOVER = '#ffffff1f'
const DONE_EDGE = '#2f7a4c'
// The mark in the done green, for the titles of cards that have landed.
const DONE_MARK_SVG = MARK_SVG.replace(/#7566d8/g, '#2f9a5e').replace(/#a79cf7/g, '#7fe0a4').replace(/#cfc7ff/g, '#c8f4d8')

const JUDGE_SYSTEM = `You choose which Claude model and reasoning effort an agentic assistant (it reads files, runs tools and edits things, not only code) should use for the user's next message. Pick the cheapest pair that will still do the job well.

Models, cheapest first:
- haiku: quick questions, lookups, renames, small edits in one or two files, summaries, chit-chat. It can read files and run tools; pick it for any small, well-defined job.
- sonnet: normal coding, edits across a few files, explanations, writing.
- opus: hard debugging, architecture, large refactors, careful reviews.
- fable: the hardest long-horizon or research-level work.

Effort: low for quick answers, medium for normal work, high for hard problems, xhigh or max only for very hard ones.

Effort is relative to the model in use ("Current" names it): a stronger model needs less effort for the same job. Opus at medium does about what Sonnet does at high, and Fable is stronger again. So for one and the same task pick one step lower on Opus than on Sonnet, and lower still on Fable; on Sonnet, go one step higher for hard work than you would on Opus.

Judge the SCOPE and the amount of work, not whether it is code. A short message can ask for a lot: "go through my whole drive and clean it up", "review the entire repo", "migrate everything" are big, multi-step, tool-heavy jobs where mistakes are costly: never low, usually high. Low is only for answers that need no tools and no planning.

If the message answers a question in the assistant's last reply (picks an option, says which one, confirms a plan), judge only the work that answer starts, as the reply describes it, not the length of the answer and not the work done before the question: "B" can mean "build the complicated section B" (high), while "yes" or "no" to one small action ("should I archive this?", "delete the old ones too?") is low, and picking a value for one setting (a log level, a colour, a font) is low. But picking which way to build something ("option 1", "the same shapes", "B") starts that build: judge the build. Approving a whole plan or several steps takes the effort of that plan. A plain "yes", "ok" or "do it" after "Is that OK? Then I'll build X" or "Should I build X?" approves building X: judge X, not the word.

A message that pushes back on, corrects or adds to a plan or claim under discussion continues that work: keep at least the effort that work had, never drop to low for it. Thanks, praise or a closing remark with no new request is low. A question about how to do something, or about effort itself, that needs no tools is low.

If the person asks for deep thought ("think hard", "ultrathink", "be thorough"), pick at least high; if they ask for a quick answer, pick low.

If the message is a short follow-up to ongoing work ("yes", "go", "ok", "continue", or the same in any language), keep the current pair.

Reply with JSON only: {"model":"haiku|sonnet|opus|fable","effort":"low|medium|high|xhigh|max","sure":0.0-1.0 how sure you are of the effort,"why":"at most 6 words, in the user's language"}`

/** Reads `{ model, effort, why }` out of a reply, or nothing when it doesn't hold one. */
export function parseVerdict(text: string): { model: ModelKey; effort: Effort; why: string; sure?: number; handoff?: string } | undefined {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return undefined
  let raw: unknown
  try {
    raw = JSON.parse(match[0])
  } catch {
    return undefined
  }
  if (typeof raw !== 'object' || raw === null) return undefined
  const { model, effort, why, sure, handoff } = raw as Record<string, unknown>
  const key = typeof model === 'string' ? model.toLowerCase() : ''
  const found = MODELS.find(m => key === m.key || key === m.id || key.includes(m.key))
  if (!found || !EFFORTS.includes(effort as Effort)) return undefined
  const how = typeof sure === 'number' && sure >= 0 && sure <= 1 ? { sure } : {}
  // Only a reason counts: "handoff":"" or false is no advice.
  const advice = typeof handoff === 'string' && handoff.trim() ? { handoff: handoff.trim().slice(0, 70) } : {}
  return { model: found.key, effort: effort as Effort, why: typeof why === 'string' ? why.slice(0, 60) : '', ...how, ...advice }
}

/**
 * What the judge reads besides the new message: the person's previous message and the assistant's last reply. The
 * reply is kept long and from its end, where a question with options ("A, B or C?") sits: "B" alone looks like a
 * small job, the reply says what B sets off.
 */
async function recentContext($: EngineInterface): Promise<string> {
  return contextFrom(await $.session.messages())
}

/** The context text from the conversation so far: the last user message, short, and the assistant's last reply's end. */
export function contextFrom(messages: readonly { role: string; text: string }[]): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const lastAssistant = lastAssistantText(messages)
  return [lastUser ? `user: ${lastUser.text.slice(0, 400)}` : '', lastAssistant ? `assistant: ${lastAssistant.slice(-2000)}` : '']
    .filter(Boolean)
    .join('\n')
}

/** The assistant's last reply, or nothing. */
function lastAssistantText(messages: readonly { role: string; text: string }[]): string {
  return [...messages].reverse().find(m => m.role === 'assistant' && m.text.trim())?.text ?? ''
}


// Jev answers typed questions with probabilities; these are the options it picks between.
const JEV_EFFORTS: Record<Effort, string> = {
  low: 'quick answer, no tools, no planning',
  medium: 'normal work: a few tool calls or edits',
  high: 'hard or large multi-step job: many tool calls, costly mistakes',
  xhigh: 'very hard: a long investigation',
  max: 'the hardest research-level work',
}
const JEV_MODELS: Record<ModelKey, string> = {
  haiku: 'trivial questions, lookups, renames, chit-chat',
  sonnet: 'normal coding, edits across a few files, explanations, writing',
  opus: 'hard debugging, architecture, large refactors, careful reviews',
  fable: 'the hardest long-horizon or research-level work',
}
const JEV_TASK =
  'Choose the reasoning effort (and model) an agentic assistant should use for the next user message. It reads files, ' +
  'runs tools and edits things, not only code. Pick the cheapest that still does the job well. Judge the scope and the ' +
  'amount of work, not whether it is code: "go through my whole drive and clean it up" is a big tool-heavy job. ' +
  'Effort is relative to current_model: a stronger model needs less for the same job. Opus at medium does about what ' +
  'Sonnet does at high, so for one task pick one step lower on Opus than on Sonnet. ' +
  'A short follow-up ("yes", "go", "ok", in any language) keeps the current effort. When the message answers a ' +
  "question in the assistant's last reply (picks an option), judge only the work that answer starts, not its length and " +
  'not the work before the question: yes/no to one small action, or picking a value for one setting (a log level, a colour), is low; picking which way to build something starts that build, so judge the build; ' +
  'approving a whole plan takes the effort of that plan; a plain yes to "Then I will build X" means judge X. Pushing back on or adding to a plan under discussion continues that work: keep its effort, never low. Thanks or a closing remark with no new request is low. A ' +
  'question about how to do something that needs no tools is low. "think hard", "ultrathink" or "be thorough" means ' +
  'at least high; "quick question" means low.'

/** The skill or custom command a typed "/name args" runs, or nothing for the app's own commands and effortless's. */
async function typedSkill($: EngineInterface, text: string): Promise<{ name: string; description: string } | undefined> {
  const name = text.trim().slice(1).split(/\s+/)[0]
  if (!name) return undefined
  const found = (await $.command.list().catch(() => [])).find(c => c.name === name)
  if (!found || !['user', 'plugin', 'mcp'].includes(found.source) || found.plugin === 'effortless') return undefined
  return { name, description: found.description ?? '' }
}

const LEVEL_WORD = '(low|medium|high|xhigh|x-high|extra[- ]high|max|maximum)'
const NAMED_LEVEL = new RegExp(`\\b${LEVEL_WORD}\\s+effort\\b|\\beffort(?:\\s+level)?\\s*(?:[:=]|to|at|of|on)?\\s*${LEVEL_WORD}\\b|\\bxhigh\\b`, 'gi')
const LEVEL_OF: Record<string, Effort> = { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', 'x-high': 'xhigh', 'extra high': 'xhigh', 'extra-high': 'xhigh', max: 'max', maximum: 'max' }

/**
 * The level a prompt asks for by name ("max effort", "effort: high", "xhigh"), or nothing. The word effort must sit
 * beside the level, so "a medium sized image" names nothing, and "don't use max effort" is a no. A named level runs
 * without the judge: effort-auto found Haiku also calls prompts that only describe hard work "named".
 */
export function namedEffort(text: string): Effort | undefined {
  for (const m of text.matchAll(NAMED_LEVEL)) {
    const before = text.slice(Math.max(0, m.index - 20), m.index).toLowerCase()
    if (/\b(not|no|don'?t|never|without|instead of)\b/.test(before)) continue
    return LEVEL_OF[(m[1] ?? m[2] ?? 'xhigh').toLowerCase().replace(/\s+/, ' ')]
  }
  return undefined
}

/** A short follow-up such as "go", "ok", "yes", "continue": two words and a dozen characters at most. */
export function isFollowUp(text: string): boolean {
  const t = text.trim()
  return t.length > 0 && t.length <= 12 && t.split(/\s+/).length <= 2
}

/**
 * Whether the assistant's last reply ended on a question ("Should I archive it?", "A, B or C?"). A short message
 * after one answers it, and the answer can start a small or a big job, so it goes to the judge instead of keeping
 * the effort.
 */
export function endsOnQuestion(context: string): boolean {
  const reply = context.split('\nassistant: ').pop() ?? ''
  return context.includes('assistant: ') && reply.slice(-400).includes('?')
}

/** The message as the judge reads it: images and files it carries are named, since the judge sees only text. */
export function withAttachments(text: string, attachments?: readonly { type: string }[]): string {
  if (!attachments?.length) return text
  const counts = new Map<string, number>()
  for (const a of attachments) counts.set(a.type, (counts.get(a.type) ?? 0) + 1)
  const said = [...counts].map(([type, n]) => `${n} ${type}${n > 1 ? 's' : ''}`).join(', ')
  return `${text}

[The message comes with ${said} to look at.]`
}

/** The message as the judge reads it when it was typed while a task was still running. */
export function withMidTurn(text: string, effort: Effort): string {
  return `${text}

[Sent while the assistant was still working on the last task at ${effort} effort. If it adds to, corrects or steers that task, keep ${effort}; judge it on its own only if it is a separate new request.]`
}
// A lower verdict for a message typed mid-turn, applied when that turn ends (see prompt.submit).
let heldPick: Pick | null = null

/** A short follow-up that keeps the current effort: "go" between two steps, not an answer to a question. */
export function keepsEffort(message: string, context: string): boolean {
  return isFollowUp(message) && !endsOnQuestion(context)
}

/** The TypeSafe key in a ~/.config/jev/.env file's text, the same file the jev-* skills read. */
export function parseJevKey(text: string): string | undefined {
  const value = text.match(/^\s*TYPESAFE_API_KEY\s*=\s*(.*?)\s*$/m)?.[1].replace(/^['"]|['"]$/g, '')
  return value || undefined
}

/**
 * Jev's answer as a verdict. Below even odds on the effort it is unsure, and an unsure call keeps the
 * current effort: that is what a "go" between two steps of work should do.
 */
const UNSURE = 'unsure, keeping'
export function parseJevAnswer(text: string, current: Pick | null): { model: ModelKey; effort: Effort; why: string; sure?: number } | undefined {
  let json: Record<string, unknown>
  try {
    json = JSON.parse(text)
  } catch {
    return undefined
  }
  const answers = (json.answers ?? (json.result as Record<string, unknown> | undefined)?.answers) as
    | Record<string, { choice?: string; confidence?: number; probabilities?: Record<string, number> }>
    | undefined
  const effort = answers?.effort?.choice as Effort | undefined
  if (!effort || !EFFORTS.includes(effort)) return undefined
  const model = MODELS.find(m => m.key === answers?.model?.choice)?.key ?? current?.model ?? 'sonnet'
  const sure = answers?.effort?.confidence ?? answers?.effort?.probabilities?.[effort]
  if (current && typeof sure === 'number' && sure < 0.5) return { model, effort: current.effort, why: UNSURE, sure }
  if (typeof sure !== 'number') return { model, effort, why: '' }
  return { model, effort, why: `${Math.round(sure * 100)}% sure`, sure }
}

let askJevFile: EnvAsk | undefined
// A key was saved from the settings panel into ~/.config/jev/.env: that file wins over an older key in the settings.
let keyFromFile = false
/**
 * The TypeSafe key: from the settings, else TYPESAFE_API_KEY. Only when the person picked the jev judge outright is
 * ~/.config/jev/.env read as well: a mod should not open a file holding a secret it was not asked to use.
 */
async function jevKey($: EngineInterface): Promise<string | undefined> {
  if (config.typesafeKey && !keyFromFile) return config.typesafeKey
  const fromEnv = await envJevKey($)
  if (fromEnv) return fromEnv
  if (config.judge !== 'jev' && !keyFromFile) return undefined
  askJevFile =
    askJevFile ??
    (async () => {
      const home = (await envUserProfile($)) ?? (await envHome($))
      if (!home) return undefined
      const text = await $.fs.read(`${home}/.config/jev/.env`).catch(() => '')
      return parseJevKey(typeof text === 'string' ? text : '')
    })()
  return askJevFile
}

type Judged = { verdict?: Pick; tokens: number }

/** Why a judge the person picked could not answer, in words: what a status code means for them. */
export function judgeFailure(name: string, status: number | 'timeout'): string {
  if (status === 'timeout') return `${name} did not answer in time`
  if (status === 401 || status === 403) return `${name} rejected the key (${status})`
  if (status === 402) return `${name} is out of credits (${status})`
  if (status === 429) return `${name} is rate limited (${status})`
  return `${name} failed (${status})`
}
const warned = new Set<string>()
/** Tells the person once per session and reason that their judge failed and Haiku stands in. */
function warnJudge($: EngineInterface, reason: string) {
  // A test from the settings panel takes the reason for its own line, with no toast and no judge-down band.
  if (judgeTesting) {
    judgeTesting.reason = reason
    return
  }
  void proof($, `judge fallback: ${reason}`)
  void update($, judgeDown, () => reason).then(() => $.ui.invalidate('ui.render'))
  if (warned.has(reason)) return
  warned.add(reason)
  $.ui.toast(`pilot: ${reason}. Haiku judges for now.`)
}

/** Which judge the person picked in the plugin's settings, and what it needs. */
export type JudgeConfig = {
  judge: 'auto' | 'haiku' | 'jev'
  typesafeKey: string
  /** A skill or slash command that writes the handoff instead of the built-in prompt, e.g. "session-handoff". */
  handoffSkill: string
  /** What follows the handoff: clear and carry on, clear and wait, or keep the chat and copy the handoff. The handoff
   *  bar opens on the choice made last; this is the first one. */
  handoffAfter: HandoffAfter
  /** The effort slider, -2 (cheaper) to 2 (smarter): tips the judge's close calls that way. */
  bias: number
  /** Auto never goes below this effort. */
  floor: Effort
  /** Auto never goes above this effort. */
  ceiling: Effort
  /** What the person switched off: the footer's handoff button and any of the alert bands. */
  hide: Hideable[]
  /** The swamp band shows once the context fills this share of the window, in percent. */
  swampAt: number
  /** default: the dashboard band above the prompt; minimal: the footer's small buttons and no band. */
  layout: 'default' | 'minimal'
  /** Who writes a compaction's summary: Haiku 5.5 (the default, a fraction of the price) or the chat's own model. */
  compactWith: 'haiku' | 'session'
  /** advised: the footer slot is Compact until Haiku advises a handoff. always: it is always the Handoff button. */
  handoffButton: 'advised' | 'always'
  /** A prompt the judge calls simple runs on a cheaper model than the chat's (never a dearer one). */
  modelAuto: 'on' | 'off'
  /** on: every subagent the chat sends off gets an effort picked by the judge before it starts. */
  helpers: 'on' | 'off'
  /** The accent colour of everything effortless draws: the brand violet, Claude orange or cherry-blossom rose. */
  theme: ThemeName
  /** auto: light when Claude Code's own theme is light. dark and light fix it. */
  appearance: 'auto' | 'dark' | 'light'
}

/** The swamp thresholds the settings offer, in percent of the context window. */
export const SWAMP_STEPS = [10, 20, 30, 40, 50, 60, 70, 80] as const

/** The parts of effortless a person can switch off: the footer's (setup) and the progress bar's (setup, settings).
 * The context (swamp), running-low (hot) and cold-cache alerts can be switched off for good in Customize; the judge-down
 * alert always shows. Each alert also has its own ✕. */
export const HIDEABLE = ['handoff', 'timer', 'reason', 'progress', 'sounds', 'swamp', 'hot', 'cold'] as const
export type Hideable = (typeof HIDEABLE)[number]
// What the app passed to register, so settings kept in the store can be laid over it at session start.
let pluginOptions: Record<string, unknown> = {}
let config: JudgeConfig = {
  judge: 'auto',
  typesafeKey: '',
  handoffSkill: '',
  handoffAfter: 'continue',
  bias: 0,
  floor: 'low',
  ceiling: 'max',
  hide: ['reason'],
  swampAt: 70,
  layout: 'default',
  compactWith: 'haiku',
  handoffButton: 'advised',
  modelAuto: 'off',
  helpers: 'off',
  theme: 'violet',
  appearance: 'auto',
}

/** The settings as the engine hands them over (defaults filled in), cleaned to the shape the judge reads. */
export function readConfig(options: unknown): JudgeConfig {
  const o = (options ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const picked = str(o.judge)
  return {
    judge: picked === 'haiku' || picked === 'jev' ? picked : 'auto',
    typesafeKey: str(o.typesafeKey),
    handoffSkill: str(o.handoffSkill).replace(/^\//, ''),
    handoffAfter: (['confirm', 'copy'] as const).find(a => a === str(o.handoffAfter)) ?? 'continue',
    bias: Math.max(-2, Math.min(2, Math.round(Number(str(o.effortBias)) || 0))),
    floor: EFFORTS.includes(str(o.effortFloor) as Effort) ? (str(o.effortFloor) as Effort) : 'low',
    ceiling: EFFORTS.includes(str(o.effortCeiling) as Effort) ? (str(o.effortCeiling) as Effort) : 'max',
    swampAt: SWAMP_STEPS.includes(Number(str(o.swampAt)) as (typeof SWAMP_STEPS)[number]) ? Number(str(o.swampAt)) : 70,
    layout: str(o.layout) === 'minimal' ? 'minimal' : 'default',
    compactWith: str(o.compactWith) === 'session' ? 'session' : 'haiku',
    handoffButton: str(o.handoffButton) === 'always' ? 'always' : 'advised',
    // Off unless switched on: one prompt on another model rewrites the whole chat into that model's cache, which costs
    // more than it saves in a chat that is in use (measured 2026-10-10).
    modelAuto: str(o.modelAuto) === 'on' ? 'on' : 'off',
    helpers: str(o.helpers) === 'on' ? 'on' : 'off',
    theme: THEMES.find(t => t === str(o.theme)) ?? 'violet',
    appearance: (['dark', 'light'] as const).find(a => a === str(o.appearance)) ?? 'auto',
    // The judge's line is off until switched on; an empty string saved from the panel means everything shows.
    hide: (o.hide === undefined ? 'reason' : str(o.hide))
      .split(',')
      .map(part => part.trim())
      .filter((part): part is Hideable => (HIDEABLE as readonly string[]).includes(part)),
  }
}

/** The text the judge reads: the current pair, the last turns and the next message. */
function judgeQuestion(prompt: string, current: Pick | null, context: string): string {
  return [
    current ? `Current: ${current.model} / ${current.effort}` : 'Current: none',
    context ? `Recent conversation:\n${context}` : '',
    `Next message:\n${prompt.slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Haiku always judges; Jev is the optional quick one. Jev is asked first when a TypeSafe key is found (unless the
 * setting is haiku), and Haiku makes the call whenever Jev is unsure, down or slow. Any judge that fails or takes longer than JEV_TIMEOUT_MS falls back to
 * Haiku, which needs nothing but the session's own login. Never throws.
 */
async function judge($: EngineInterface, prompt: string, current: Pick | null): Promise<Judged> {
  const context = await recentContext($).catch(() => '')
  const key = config.judge !== 'haiku' ? await jevKey($).catch(() => undefined) : undefined
  if (key) {
    const jev = await askJev($, key, prompt, current, context)
    if (jev) return jev.verdict?.why === UNSURE ? haikuAfter($, jev, prompt, current, context) : jev
  }
  return askHaiku($, prompt, current, context)
}

/** Jev was unsure: Haiku makes the call, and both judges' tokens count. */
async function haikuAfter($: EngineInterface, jev: Judged, prompt: string, current: Pick | null, context: string): Promise<Judged> {
  const haiku = await askHaiku($, prompt, current, context)
  return haiku.verdict ? { verdict: haiku.verdict, tokens: haiku.tokens + jev.tokens } : jev
}

/** Jev on TypeSafe: an answer, or nothing when it fails, is unsure of its own format or takes too long. */
async function askJev($: EngineInterface, key: string, prompt: string, current: Pick | null, context: string): Promise<Judged | undefined> {
  try {
    // A stalled endpoint must not hold the prompt: after JEV_TIMEOUT_MS the judge falls through to Haiku.
    const res = await Promise.race([
      $.http.fetch((await envJevUrl($)) ?? JEV_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'jev-latest',
          state: {
            task: JEV_TASK,
            current_model: current?.model ?? null,
            current_effort: current?.effort ?? null,
            recent_conversation: context,
            next_message: prompt.slice(0, 4000),
          },
          questions: {
            effort: { type: 'choice', instructions: 'Which effort fits the next message?', criteria: JEV_EFFORTS },
            model: { type: 'choice', instructions: 'Which model fits the next message?', criteria: JEV_MODELS },
          },
        }),
      }),
      $.clock.sleep(JEV_TIMEOUT_MS).then(() => {
        throw new Error('jev timeout')
      }),
    ])
    if (!res.ok) warnJudge($, judgeFailure('Jev', res.status))
    const verdict = res.ok ? parseJevAnswer(res.text, current) : undefined
    if (verdict) {
      let used = 0
      try {
        const usage = (JSON.parse(res.text) as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
        used = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)
      } catch {
        // No usage in the reply: counted as 0.
      }
      if (await read($, judgeDown)) await update($, judgeDown, () => null)
      return { verdict: { ...verdict, by: 'jev' }, tokens: used }
    }
  } catch (error) {
    // Jev down or slow: fall through to Haiku, and say so.
    warnJudge($, String(error).includes('timeout') ? judgeFailure('Jev', 'timeout') : 'Jev could not be reached')
  }
  return undefined
}

// Set while the settings panel tests a judge: warnJudge leaves its reason here instead of warning.
let judgeTesting: { reason?: string } | null = null
/** The prompt a judge test sends: small and plain, so any working judge answers it. */
const JUDGE_TEST_PROMPT = 'rename one variable in a single file'

/** Asks the judge picked in the panel (its unsaved key, URL and model included) one sample prompt, and says in a line
 * whether it answered, with what and how fast, or why not. Never falls back to Haiku: the point is the judge itself. */
async function testJudge($: EngineInterface, judgeKind: string, draftKey: string): Promise<{ ok: boolean; text: string }> {
  const start = await $.clock.now()
  const took = async () => `${(((await $.clock.now()) - start) / 1000).toFixed(1)} s`
  const said = (name: string, j: Judged | undefined) =>
    j?.verdict?.why === UNSURE ? `${name} answered, unsure on the sample` : `${name} answered: ${j?.verdict?.effort}`
  judgeTesting = {}
  try {
    if (judgeKind === 'jev' || judgeKind === 'auto') {
      const key = parseJevKey(draftKey) ?? (draftKey.trim() || undefined) ?? (await jevKey($).catch(() => undefined)) ?? (await typesafeKeyAnywhere($).catch(() => undefined))
      if (!key && judgeKind === 'jev') return { ok: false, text: 'No TypeSafe key found' }
      if (key) {
        const j = await askJev($, key, JUDGE_TEST_PROMPT, null, '')
        if (j?.verdict) return { ok: true, text: `${said('Jev', j)} in ${await took()}` }
        return { ok: false, text: judgeTesting.reason ?? 'Jev gave no usable answer' }
      }
    }
    const h = await askHaiku($, JUDGE_TEST_PROMPT, null, '')
    return h.verdict ? { ok: true, text: `${said('Haiku', h)} in ${await took()}` } : { ok: false, text: 'Haiku gave no answer' }
  } catch (error) {
    return { ok: false, text: String(error).slice(0, 80) }
  } finally {
    judgeTesting = null
  }
}

/** Haiku through the session's own login: the judge that needs no key, and the fallback for the others. */
async function askHaiku($: EngineInterface, prompt: string, current: Pick | null, context: string): Promise<Judged> {
  const used = lastContext && lastContext.window ? `Context used: ${Math.round(lastContext.percent)}% of the window` : ''
  const asked = [judgeQuestion(prompt, current, context), used].filter(Boolean).join('\n\n')
  const ask = (model: string) => $.model.complete({ model, system: JUDGE_SYSTEM, prompt: asked, maxTokens: 160, effort: 'low', timeoutMs: 6000 })
  // Haiku 5.5 by name: Claude Code builds that predate it map the plain alias to Haiku 4.5, at ten times the price.
  // Where 5.5 does not answer, the alias stands in.
  let r = await ask(COMPACT_MODEL)
  if (!r.isAnswered) r = await ask('haiku')
  const verdict = r.isAnswered ? parseVerdict(r.text) : undefined
  const tokens = r.isAnswered && r.usage ? r.usage.input_tokens + r.usage.output_tokens : 0
  return { verdict: verdict && { ...verdict, by: 'haiku' }, tokens }
}

// Whether a fresh chat would now serve better than carrying on: Haiku's call, whatever judge picks the effort. It runs
// from HANDOFF_CHECK_FROM percent of context, every HANDOFF_CHECK_EVERY messages, so it costs a cent now and then. It
// reads more than the effort judge: what the chat was for, the trail of topics, the last turns, the context and the cache.
const HANDOFF_CHECK_FROM = 30
const HANDOFF_CHECK_EVERY = 2
const HANDOFF_SYSTEM = `You decide whether the person should hand off now: start a fresh chat that carries over a short summary, instead of carrying on in this one. You are shown what the chat was for, the trail of what the person asked, the last turns, the next message, how full the context is and whether the cache is cold.

Say yes only for a clear reason: the task just finished and the next message is something else, the topic has changed so the old context is dead weight, the chat keeps going in circles on the same problem, or a long chat now holds so much unrelated history that a clean start would be sharper. A normal next step of the same work is never a reason, a long chat by itself is not one, and neither is a high context share when the work is going well. When unsure, say no: a wrong yes costs the person more than a missed one.

Reply with JSON only: {"handoff":"reason of at most 8 words, in the person's language"} for yes, or {"handoff":null} for no.`

/** What the handoff check reads: the chat's purpose, a trail of the person's messages, the last reply's end. */
export function handoffEvidence(messages: readonly { role: string; text: string }[], next: string, percent: number, cold: boolean): string {
  const asked = messages.filter(m => m.role === 'user' && m.text.trim())
  const first = asked[0]?.text.slice(0, 500) ?? ''
  const trail = asked.slice(-8, -1).map(m => `- ${m.text.slice(0, 160).replace(/\s+/g, ' ')}`)
  const reply = lastAssistantText(messages).slice(-700)
  return [
    first ? `What the chat was for (first message):\n${first}` : '',
    trail.length ? `Trail of earlier messages:\n${trail.join('\n')}` : '',
    reply ? `The assistant's last reply (its end):\n${reply}` : '',
    `Next message:\n${next.slice(0, 600)}`,
    `Context used: ${Math.round(percent)}% of the window; ${asked.length} messages so far; the cache is ${cold ? 'cold' : 'warm'}.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Reads Haiku's answer: a reason, or null for no (anything unreadable is no). */
export function parseHandoffAnswer(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const { handoff } = JSON.parse(match[0]) as { handoff?: unknown }
    return typeof handoff === 'string' && handoff.trim() ? handoff.trim().slice(0, 70) : null
  } catch {
    return null
  }
}

let promptsSinceHandoffCheck = 0
/** Called with each message the person sends. Sets or clears the advice; never throws, never holds the message. */
async function checkHandoff($: EngineInterface, next: string) {
  const percent = lastContext?.percent ?? 0
  if (percent < HANDOFF_CHECK_FROM) {
    promptsSinceHandoffCheck = 0
    if ((await read($, handoffAdvice)) !== null) {
      await update($, handoffAdvice, () => null)
      $.ui.invalidate('ui.render')
    }
    return
  }
  promptsSinceHandoffCheck++
  if (promptsSinceHandoffCheck < HANDOFF_CHECK_EVERY) return
  promptsSinceHandoffCheck = 0
  try {
    const evidence = handoffEvidence(await $.session.messages(), next, percent, (await cacheMinutes($)) === 0 && cacheExpires > 0)
    const ask = (model: string) => $.model.complete({ model, system: HANDOFF_SYSTEM, prompt: evidence, maxTokens: 60, effort: 'low', timeoutMs: 8000 })
    let r = await ask(COMPACT_MODEL)
    if (!r.isAnswered) r = await ask('haiku')
    if (!r.isAnswered) return
    const reason = parseHandoffAnswer(r.text)
    void proof($, `handoff check at ${Math.round(percent)}%: ${reason ?? 'no'}`)
    if (reason !== (await read($, handoffAdvice))) {
      await update($, handoffAdvice, () => reason)
      $.ui.invalidate('ui.render')
    }
  } catch {
    // A failed check changes nothing.
  }
}

// The judge benchmark (/effortless bench): labelled prompts in bench/judge-cases.json, each run through the same
// pipeline a real prompt takes (a short follow-up keeps the current effort, anything else goes to a judge).
export type BenchCase = { id: string; kind: string; holdout?: boolean; current: Pick; context?: string; message: string; ok: Effort[] }
export type BenchAnswer = { id: string; judge: string; effort?: Effort; by?: string; why?: string; sure?: number; model?: ModelKey; ms: number; tokens: number }

/** Where an answer lands against the labels: right, too low (risks quality), too high (wastes), or no answer. */
export function benchGrade(c: BenchCase, effort: Effort | undefined): 'hit' | 'under' | 'over' | 'none' {
  if (!effort) return 'none'
  if (c.ok.includes(effort)) return 'hit'
  const rank = EFFORTS.indexOf(effort)
  return rank < Math.min(...c.ok.map(e => EFFORTS.indexOf(e))) ? 'under' : 'over'
}

/** The benchmark's table: per judge the share it got right, how it missed, and how fast it was; then per kind. */
export function benchReport(cases: BenchCase[], answers: BenchAnswer[]): string {
  const byId = new Map(cases.map(c => [c.id, c]))
  const judges = [...new Set(answers.map(a => a.judge))]
  const kinds = [...new Set(cases.map(c => c.kind))]
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '-')
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b)
    return s.length ? s[Math.floor(s.length / 2)] : 0
  }
  const lines = ['| Judge | Right | Too low | Too high | No answer | Median ms |', '| --- | --- | --- | --- | --- | --- |']
  for (const j of judges) {
    const mine = answers.filter(a => a.judge === j)
    const g = mine.map(a => benchGrade(byId.get(a.id)!, a.effort))
    const n = (k: string) => g.filter(x => x === k).length
    const asked = mine.filter(a => a.ms > 0).map(a => a.ms)
    lines.push(`| ${j} | ${pct(n('hit'), g.length)} | ${n('under')} | ${n('over')} | ${n('none')} | ${asked.length ? median(asked) : '-'} |`)
  }
  // The held-out cases were never tuned against: the honest score. The rest shaped the judge prompts.
  const sets = [
    ['tuned on', cases.filter(c => !c.holdout)],
    ['held out', cases.filter(c => c.holdout)],
  ] as const
  lines.push('', `| Set (cases) | ${judges.join(' | ')} |`, `| --- | ${judges.map(() => '---').join(' | ')} |`)
  for (const [name, set] of sets) {
    if (!set.length) continue
    const ids = set.map(c => c.id)
    const cells = judges.map(j => {
      const mine = answers.filter(a => a.judge === j && ids.includes(a.id))
      return pct(mine.filter(a => benchGrade(byId.get(a.id)!, a.effort) === 'hit').length, mine.length)
    })
    lines.push(`| ${name} (${set.length}) | ${cells.join(' | ')} |`)
  }
  lines.push('', `| Kind (cases) | ${judges.join(' | ')} |`, `| --- | ${judges.map(() => '---').join(' | ')} |`)
  for (const k of kinds) {
    const ids = cases.filter(c => c.kind === k).map(c => c.id)
    const cells = judges.map(j => {
      const mine = answers.filter(a => a.judge === j && ids.includes(a.id))
      return pct(mine.filter(a => benchGrade(byId.get(a.id)!, a.effort) === 'hit').length, mine.length)
    })
    lines.push(`| ${k} (${ids.length}) | ${cells.join(' | ')} |`)
  }
  // Does "unsure" predict a miss? The Smarter lean and the cheaper-model guard both act on it, so it is measured here.
  const judged = judges.filter(j => !j.startsWith('always'))
  const sureLines = ['', '| Judge | Sure when right | Sure when wrong | Misses under 65% sure | Misses under 85% sure | Answers under 65% | Answers under 85% |', '| --- | --- | --- | --- | --- | --- | --- |']
  for (const j of judged) {
    const mine = answers.filter(a => a.judge === j && a.effort && typeof a.sure === 'number')
    if (!mine.length) continue
    const wrong = mine.filter(a => benchGrade(byId.get(a.id)!, a.effort) !== 'hit')
    const right = mine.filter(a => benchGrade(byId.get(a.id)!, a.effort) === 'hit')
    const avg = (xs: BenchAnswer[]) => (xs.length ? `${Math.round((xs.reduce((t, a) => t + a.sure!, 0) / xs.length) * 100)}%` : '-')
    const under = (xs: BenchAnswer[], t: number) => xs.filter(a => a.sure! < t).length
    sureLines.push(`| ${j} (${mine.length} with a score) | ${avg(right)} | ${avg(wrong)} | ${under(wrong, 0.65)} of ${wrong.length} | ${under(wrong, 0.85)} of ${wrong.length} | ${under(mine, 0.65)} | ${under(mine, 0.85)} |`)
  }
  const pickLines = ['', '| Judge | Haiku | Sonnet | Opus | Other |', '| --- | --- | --- | --- | --- |']
  for (const j of judged) {
    const mine = answers.filter(a => a.judge === j && a.model)
    if (!mine.length) continue
    const n = (k: string) => mine.filter(a => a.model === k).length
    pickLines.push(`| ${j} | ${n('haiku')} | ${n('sonnet')} | ${n('opus')} | ${mine.length - n('haiku') - n('sonnet') - n('opus')} |`)
  }
  lines.push(...(sureLines.length > 3 ? sureLines : []), ...(pickLines.length > 3 ? pickLines : []))
  const misses = answers
    .filter(a => !a.judge.startsWith('always') && benchGrade(byId.get(a.id)!, a.effort) !== 'hit')
    .map(a => `- ${a.judge}${a.by && a.by !== a.judge ? ` (via ${a.by})` : ''} ${a.id}: said ${a.effort ?? 'nothing'}${a.why ? ` (${a.why})` : ''}, wanted ${byId.get(a.id)!.ok.join('/')}: "${byId.get(a.id)!.message.slice(0, 60)}"`)
  return [...lines, '', 'Misses:', ...(misses.length ? misses : ['- none'])].join('\n')
}

/** Runs every case through each available judge, a few at a time, and returns the answers. */
async function runBench($: EngineInterface, cases: BenchCase[]): Promise<BenchAnswer[]> {
  const key = await typesafeKeyAnywhere($).catch(() => undefined)
  const judges: [string, (c: BenchCase) => Promise<Judged | undefined>][] = [
    ['haiku', c => askHaiku($, c.message, c.current, c.context ?? '')],
  ]
  if (key)
    judges.push([
      'jev',
      async c => {
        const jev = await askJev($, key, c.message, c.current, c.context ?? '')
        if (!jev) return askHaiku($, c.message, c.current, c.context ?? '')
        return jev.verdict?.why === UNSURE ? haikuAfter($, jev, c.message, c.current, c.context ?? '') : jev
      },
    ])
  const answers: BenchAnswer[] = []
  // Baselines: what a fixed effort would score on the same labels.
  for (const fixed of ['medium', 'high'] as Effort[])
    for (const c of cases) answers.push({ id: c.id, judge: `always ${fixed}`, effort: fixed, ms: 0, tokens: 0 })
  const jobs = judges.flatMap(([name, ask]) => cases.map(c => ({ name, ask, c })))
  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const { name, ask, c } = jobs[next++]
      // The mod never asks a judge about a short follow-up: it keeps the current effort.
      if (keepsEffort(c.message, c.context ?? '')) {
        answers.push({ id: c.id, judge: name, effort: c.current.effort, ms: 0, tokens: 0 })
        continue
      }
      const started = await $.clock.now()
      const got = await ask(c).catch(() => undefined)
      answers.push({ id: c.id, judge: name, effort: got?.verdict?.effort, by: got?.verdict?.by, why: got?.verdict?.why, sure: got?.verdict?.sure, model: got?.verdict?.model, ms: (await $.clock.now()) - started, tokens: got?.tokens ?? 0 })
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return answers
}

function keyOf(id: string): ModelKey | undefined {
  return MODELS.find(m => id.includes(m.key))?.key
}

/** Records the model the session now runs; the pick follows it, so the band never shows a stale one. */
async function modelIs($: EngineInterface, id: string) {
  const pause = !cacheSafe(id) && keyOf(id) !== 'haiku'
  if (pause !== (await read($, paused))) await update($, paused, () => pause)
  const key = keyOf(id)
  if (!key || key === (await read($, model))) return
  await update($, model, () => key)
  // The engine's effort can differ per model, so a change across a switch is not the person's doing;
  // and a model turned down earlier may be suggested again.
  engineEffort = undefined
  declined = null
  const current = await read($, pick)
  if (current && current.model !== key) await choose($, { ...current, model: key })
  if ((await read($, suggestion)) === key) await update($, suggestion, () => null)
}

async function sessionModel($: EngineInterface): Promise<ModelKey> {
  const id = await $.session.model()
  return MODELS.find(m => id.includes(m.key))?.key ?? 'sonnet'
}


// Proof log: every verdict, /effort and request effort, written to EFFORTLESS_LOG, or to
// %TEMP%/effortless-proof.log while the mod is loaded from a dev-mods folder. Off otherwise.
const proofLines: string[] = []
// An environment variable does not change while the session runs, so each one is asked for once. The
// engine wants the name spelled out in every $.env.get call, hence one small getter per variable.
type EnvAsk = Promise<string | undefined> | undefined
let askLog: EnvAsk
let askTemp: EnvAsk
let askTmpdir: EnvAsk
let askModelUi: EnvAsk
let askJevUrl: EnvAsk
let askJevKey: EnvAsk
let askUserProfile: EnvAsk
let askHome: EnvAsk
const envLog = ($: EngineInterface) => (askLog = askLog ?? $.env.get('EFFORTLESS_LOG'))
const envTemp = ($: EngineInterface) => (askTemp = askTemp ?? $.env.get('TEMP'))
const envTmpdir = ($: EngineInterface) => (askTmpdir = askTmpdir ?? $.env.get('TMPDIR'))
const envModelUi = ($: EngineInterface) => (askModelUi = askModelUi ?? $.env.get('EFFORTLESS_MODEL_UI'))
const envJevUrl = ($: EngineInterface) => (askJevUrl = askJevUrl ?? $.env.get('JEV_URL'))
const envJevKey = ($: EngineInterface) => (askJevKey = askJevKey ?? $.env.get('TYPESAFE_API_KEY'))
const envUserProfile = ($: EngineInterface) => (askUserProfile = askUserProfile ?? $.env.get('USERPROFILE'))
const envHome = ($: EngineInterface) => (askHome = askHome ?? $.env.get('HOME'))

async function proofPath($: EngineInterface): Promise<string | undefined> {
  const named = await envLog($)
  if (named) return named
  if (!$.plugin.root.replace(/\\/g, '/').includes('/dev-mods/')) return undefined
  const tmp = (await envTemp($)) ?? (await envTmpdir($)) ?? '/tmp'
  return `${tmp}/effortless-proof.log`
}
async function proof($: EngineInterface, line: string) {
  const path = await proofPath($).catch(() => undefined)
  if (!path) return
  proofLines.push(`${new Date().toISOString()} ${line}`)
  await $.fs.write(path, proofLines.slice(-200).join('\n') + '\n').catch(() => undefined)
}

// The effort the engine itself last asked for on the main loop (the app's setting; this mod only
// rewrites the request, never the setting). It changing means the person set it (the app's Effort
// control, their own /effort): that wins and Auto goes off.
let engineEffort: string | undefined
// The pick was carried over from the last chat (the store), not made in this one: the app's effort may overrule it.
let pickCarried = false
// The last main-chat request, for /effortless debug: what the app asked for and what the mod sent instead, if anything.
let lastRequest: { index: number; appModel: string; appEffort: unknown; model: string; effort: unknown; at: number } | null = null
// The slash command this mod last typed into the prompt box.
let lastTyped = ''
// The toast about pressing Enter is shown once; on every click it is only noise.
let toldAboutEnter = false
let lastFooter = ''
// A model the person turned down; not suggested again until they pick something else.
let declined: ModelKey | null = null

/**
 * Types a slash command into the prompt box for the person to send with Enter. A command the person
 * sends is read by the app itself, so its own Model and Effort controls follow; one the mod runs
 * inside the engine is not. Never overwrites a draft: returns false when the box is not empty.
 */
async function typeCommand($: EngineInterface, text: string): Promise<boolean> {
  try {
    const draft = (await $.prompt.read()).text.trim()
    // A draft of your own is never overwritten; the mod's own earlier command is replaced.
    if (draft !== '' && draft !== lastTyped) return false
    const filled = await $.prompt.fill({ text })
    if (filled.isFilled) lastTyped = text
    if (filled.isFilled && !toldAboutEnter) {
      toldAboutEnter = true
      $.ui.toast(`Press Enter to send ${text} so the app's own control follows`)
    }
    return filled.isFilled
  } catch {
    return false
  }
}

/** A model change reloads the context, so it only happens when the person says yes. */
async function switchModel($: EngineInterface, model: ModelKey) {
  try {
    await $.command.run({ command: 'model', args: model })
    declined = null
    await update($, suggestion, () => null)
    const current = await read($, pick)
    if (current) await choose($, { ...current, model })
  } catch {
    $.ui.toast('Could not switch the model right now')
  }
}

/**
 * The tally in its current shape. A hot reload keeps the state an older version wrote ({ requests, actual,
 * baseline } before 0.2.0), so every read goes through this.
 */
export function asSpent(t: unknown): Spent {
  const v = (t ?? {}) as Partial<Spent>
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)
  const judged = (v.judge ?? {}) as Partial<Spent['judge']>
  return {
    prompts: num(v.prompts),
    requests: num(v.requests),
    input: num(v.input),
    write: num(v.write),
    read: num(v.read),
    out: num(v.out),
    byEffort: v.byEffort && typeof v.byEffort === 'object' ? v.byEffort : {},
    judge: { jev: num(judged.jev), haiku: num(judged.haiku), ms: num(judged.ms), tokens: num(judged.tokens) },
    moved: num(v.moved),
    redone: num(v.redone),
    helpers: {
      runs: v.helpers?.runs && typeof v.helpers.runs === 'object' ? v.helpers.runs : {},
      requests: num(v.helpers?.requests),
      cost: num(v.helpers?.cost),
    },
  }
}

/** A request's tokens weighted by price, in input-token terms (see WEIGHT). */
export function weighted(usage: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): number {
  return (
    (usage.input_tokens ?? 0) * WEIGHT.input +
    (usage.cache_creation_input_tokens ?? 0) * WEIGHT.write +
    (usage.cache_read_input_tokens ?? 0) * WEIGHT.read +
    (usage.output_tokens ?? 0) * WEIGHT.out
  )
}

/** Adds one request Auto steered: every kind of token it used, under the effort it ran at. */
async function tally(
  $: EngineInterface,
  effort: Effort,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
) {
  const cached = usage.cache_read_input_tokens ?? 0
  const write = usage.cache_creation_input_tokens ?? 0
  const cost = usage.input_tokens * WEIGHT.input + write * WEIGHT.write + cached * WEIGHT.read + usage.output_tokens * WEIGHT.out
  await update($, saved, old => {
    const t = asSpent(old)
    const bucket = t.byEffort[effort] ?? { prompts: 0, cost: 0 }
    return {
      ...t,
      requests: t.requests + 1,
      input: t.input + usage.input_tokens,
      write: t.write + write,
      read: t.read + cached,
      out: t.out + usage.output_tokens,
      byEffort: { ...t.byEffort, [effort]: { ...bucket, cost: bucket.cost + cost } },
    }
  })
}

/** Counts one prompt Auto judged: under its effort, and what the judge took. */
async function countPrompt($: EngineInterface, effort: Effort | undefined, by: Pick['by'] | undefined, ms: number, judgeTokens: number) {
  await update($, saved, old => {
    const t = asSpent(old)
    const judged = {
      jev: t.judge.jev + (by === 'jev' ? 1 : 0),
      haiku: t.judge.haiku + (by === 'haiku' ? 1 : 0),
      ms: t.judge.ms + ms,
      tokens: t.judge.tokens + judgeTokens,
    }
    if (!effort) return { ...t, judge: judged }
    const bucket = t.byEffort[effort] ?? { prompts: 0, cost: 0 }
    return { ...t, judge: judged, prompts: t.prompts + 1, byEffort: { ...t.byEffort, [effort]: { ...bucket, prompts: bucket.prompts + 1 } } }
  })
}

/** The cache lifetime a response's writes got, when it says; nothing when it wrote nothing or does not say. */
export function cacheTtlOf(usage: unknown): keyof typeof CACHE_TTL | undefined {
  const c = (usage as { cache_creation?: { ephemeral_1h_input_tokens?: number; ephemeral_5m_input_tokens?: number } } | null)
    ?.cache_creation
  if ((c?.ephemeral_1h_input_tokens ?? 0) > 0) return '1h'
  if ((c?.ephemeral_5m_input_tokens ?? 0) > 0) return '5m'
  return undefined
}

/** Most of the prompt came from the cache: it was still warm. */
export function mostlyCached(usage: unknown): boolean {
  const u = (usage ?? {}) as { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
  const read_ = u.cache_read_input_tokens ?? 0
  const all = read_ + (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
  return all > 0 && read_ / all > 0.5
}

/** Save mode on or off: Auto stays at medium or below until the limit resets. The hot band's button and
 *  /effortless save. Says what it did. */
async function toggleSave($: EngineInterface): Promise<string> {
  const saving = (await read($, saveUntil)) !== null
  const heat = await read($, hot)
  const until = heat?.resetsAt ? new Date(heat.resetsAt).getTime() : (await $.clock.now()) + 5 * 3600_000
  await update($, saveUntil, () => (saving ? null : until))
  return saving ? 'save mode off' : 'save mode on, Auto stays at medium or below until the limit resets'
}

/** Below this a cold cache costs too little to warn about: the next message rereads the chat at full price once. */
const COLD_MIN_TOKENS = 150_000

/** The context's tokens when the cold band is worth showing: the cache is cold, the band not closed, and the chat big
 * enough that rereading it matters. Null otherwise, and while the size is not known yet. */
async function coldWorth($: EngineInterface): Promise<number | null> {
  if ((await read($, cacheLeft)) !== 0 || config.hide.includes('cold') || (await read($, isColdHidden))) return null
  const tokens = lastContext?.tokens
  if (coldForced) return tokens ?? 0
  return tokens !== undefined && tokens >= COLD_MIN_TOKENS ? tokens : null
}

/** The countdown's colour for whole minutes left (rounded up, as cacheMinutes gives): none (grey), yellow or red. */
export function cacheColor(minutesLeft: number): string | undefined {
  const shown = minutesLeft - 1
  if (minutesLeft <= 0) return ICE
  if (shown > CACHE_YELLOW_MIN) return undefined
  return shown <= CACHE_RED_MIN ? RED : YELLOW
}

/** The footer's words for the time left: "58m", "<1m", or "Cold". */
export function cacheLabel(minutesLeft: number): string {
  if (minutesLeft <= 0) return '❄ Cold'
  if (minutesLeft === 1) return '<1m'
  return `${minutesLeft - 1}m`
}

/** The dashboard's countdown to the second: "58:41", or "Cold" once it ran out. */
export function cacheClock(msLeft: number): string {
  if (msLeft <= 0) return '❄ Cold'
  const s = Math.ceil(msLeft / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** How many seconds the countdown image carries: the band is redrawn once a minute, with some slack. */
const CLOCK_FRAMES = 75
/** The dashboard's countdown as an image that ticks by itself: one frame per second, each shown for its second by a
 * CSS animation. The band is redrawn only once a minute: every redraw rebuilds the band, which restarts every image's
 * animation (the Handoff glow restarted each second while the band was redrawn for the seconds). The app sets the
 * image's font and colour to the band's, so the digits match the text around them. */
export function cacheClockSvg(msLeft: number, color: string): string {
  const start = Math.max(0, Math.ceil(msLeft / 1000))
  const frames: string[] = []
  for (let j = 0; j < CLOCK_FRAMES && start - j > 0; j++) {
    const left = start - j
    const label = `cache ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
    frames.push(`<text x="0" y="12.5" style="animation-delay:${j}s">${label}</text>`)
  }
  frames.push(`<text x="0" y="12.5" style="animation-delay:${frames.length}s;animation-duration:100000s">❄ Cold</text>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="17" viewBox="0 0 84 17"><style>text{font-size:13px;fill:${color};opacity:0;animation:f 1s step-end 1}@keyframes f{0%{opacity:1}100%{opacity:0}}</style>${frames.join('')}</svg>`
}

let cacheTtl: keyof typeof CACHE_TTL = '1h'
let cacheExpires = 0
/** The countdown's variables live in the module, and a reload (an update, a plugin switch) starts the module over: the
 * chat's cache did not go cold for that, so the countdown is read back from the session's state before the band draws
 * (it showed "Cold" after every reload). */
let cacheRestored = false
async function restoreCache($: EngineInterface) {
  if (cacheRestored) return
  cacheRestored = true
  const memo = await read($, cacheMemo)
  if (!memo || cacheExpires !== 0 || memo.expires <= 0) {
    // Nothing to go on: a "Cold" left in the shared state by the copy before is not this chat's cache.
    if (cacheExpires === 0 && !coldForced && (await read($, cacheLeft)) === 0) await update($, cacheLeft, () => null)
    return
  }
  cacheExpires = memo.expires
  cacheTtl = memo.ttl
  lastResponseAt = memo.last
}
const rememberCache = ($: EngineInterface) => update($, cacheMemo, () => ({ expires: cacheExpires, ttl: cacheTtl, last: lastResponseAt }))
/** Writes the minutes left when they changed; the session's one timer (started in session.start) calls it. */
// What /effortless swamp shows as a test: a swamped chat's context.
const SWAMP_TOKENS = 150_000
// Closed, the band stays away until the context has grown this much more.
const SWAMP_REGROW = 50_000

/** Whether the context is swamped, from the status line's figures. Cheap: no counting, no model call. */
// A usage window this full shows the running-hot band.
const HOT_PERCENT = 80
// Closed, the running-hot band stays away for the rest of its window, and comes back once at this many percent.
export const HOT_FINAL = 95

/** The running-hot band closed with its cross: the window (kind and reset time) and how full it was then. */
export type HotClosed = { window: string; percent: number }
const hotWindow = (heat: { kind: string; resetsAt: string | null }) =>
  // To the quarter hour: the reset time the app reports can shift by seconds between checks.
  `${heat.kind} ${heat.resetsAt ? Math.round(new Date(heat.resetsAt).getTime() / 900_000) : ''}`

/** Whether the running-hot band shows: always until closed; closed, not again in that window unless it passes HOT_FINAL. */
export function hotVisible(heat: { kind: string; percent: number; resetsAt: string | null }, closed: HotClosed | null): boolean {
  if (!closed || closed.window !== hotWindow(heat)) return true
  return heat.percent >= HOT_FINAL && closed.percent < HOT_FINAL
}

let hotClosedLoaded = false
/** The closed band as the store keeps it, read once per session (a new chat starts with the atom empty). */
async function hotClosedNow($: EngineInterface): Promise<HotClosed | null> {
  if (!hotClosedLoaded) {
    hotClosedLoaded = true
    const kept = (await $.store.get('hotClosed').catch(() => null)) as HotClosed | null
    if (kept && typeof kept.window === 'string') await update($, hotHidden, () => kept)
  }
  return read($, hotHidden)
}

async function closeHot($: EngineInterface, heat: { kind: string; percent: number; resetsAt: string | null }) {
  const closed: HotClosed = { window: hotWindow(heat), percent: heat.percent }
  await update($, hotHidden, () => closed)
  await $.store.set('hotClosed', closed).catch(() => undefined)
}

/** The fullest of the 5-hour and weekly windows, once one passes HOT_PERCENT. Save mode ends with its window. */
async function checkHot($: EngineInterface, reported: readonly { kind: string; percentUsed: number; resetsAt?: string }[]) {
  const windows = reported.filter(l => l.kind === 'five_hour' || l.kind === 'seven_day')
  const seen = windows.map(l => ({ kind: l.kind, percent: l.percentUsed, resetsAt: l.resetsAt ?? null }))
  if (JSON.stringify(seen) !== JSON.stringify(await read($, limits))) {
    await update($, limits, () => seen)
    $.ui.invalidate('ui.render')
  }
  const top = [...windows].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const next = top && top.percentUsed >= HOT_PERCENT ? { kind: top.kind, percent: top.percentUsed, resetsAt: top.resetsAt ?? null } : null
  const was = await read($, hot)
  if (JSON.stringify(next) !== JSON.stringify(was)) {
    await update($, hot, () => next)
    $.ui.invalidate('ui.render')
  }
  const until = await read($, saveUntil)
  if (until !== null && (await $.clock.now()) >= until) await update($, saveUntil, () => null)
}

/** "14:20" for a reset time today, "Mon 14:20" further out. */
export function resetLabel(iso: string | null, now: number): string {
  if (!iso) return ''
  const at = new Date(iso)
  const hm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  return at.getTime() - now < 20 * 3600_000 ? hm : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at.getDay()]} ${hm}`
}

/** The usage row: each window's share left and when it resets, then the chat's tokens. "5h 58% left · 14:30". */
export function usageParts(windows: readonly { kind: string; percent: number; resetsAt: string | null }[], used: number, now: number): { text: string; low: boolean }[] {
  const name: Record<string, string> = { five_hour: '5h', seven_day: 'Week' }
  const parts = (['five_hour', 'seven_day'] as const).flatMap(kind => {
    const w = windows.find(x => x.kind === kind)
    if (!w) return []
    const left = Math.max(0, Math.round(100 - w.percent))
    const at = resetLabel(w.resetsAt, now)
    return [{ text: `${name[kind]} ${left}% left${at ? ` · ${at}` : ''}`, low: left <= 100 - HOT_PERCENT }]
  })
  return used > 0 ? [...parts, { text: `${used >= 1000 ? kTokens(used) : used} tokens`, low: false }] : parts
}

/**
 * A message that says the last answer was wrong or did not work. After a prompt ran on a cheaper model, this is the
 * signal the cheaper model missed: the retry and the next few prompts stay on the chat's own model.
 */
const REDO_RE = /^(no|nope|nah)(?![a-z'])(?! +(problem|worries|thanks|thank|need|rush|hurry))|^(that'?s |this is |it'?s )?(wrong|incorrect|not (right|correct|what i))|^(it |that |this )?(still )?(doesn'?t|didn'?t|isn'?t|does not|did not|is not) (work|fix|help|change|run|compile|pass)|^still (not|broken|wrong|failing|fails|the same|happening|doesn'?t)|^(not working|try again|do it again|redo|you missed|you forgot|you broke)|^(fel|inte rätt|funkar inte|fungerar inte|försök igen|gör om|det är fel)(?![a-zåäö])|(still (broken|wrong|failing)|try again|funkar fortfarande inte)/i
export const REDO_STAY_PROMPTS = 4
export function looksLikeRedo(text: string): boolean {
  return REDO_RE.test(text.trim().replace(/^["'“ ]+/, ''))
}

/**
 * The effort slider tips close calls only: a verdict the judge was unsure of moves one step toward cheaper or smarter.
 * The outer stops count more calls as close. A sure verdict, or one without a confidence, stays as it is.
 */
export function tipped(effort: Effort, sure: number | undefined, bias: number): Effort {
  if (!bias || sure === undefined || sure >= (Math.abs(bias) === 1 ? 0.65 : 0.85)) return effort
  const i = Math.max(0, Math.min(EFFORTS.length - 1, EFFORTS.indexOf(effort) + Math.sign(bias)))
  return EFFORTS[i]
}

/** Floor and ceiling from the settings: what Auto picks stays between them. */
export function bounded(effort: Effort, floor: Effort, ceiling: Effort): Effort {
  const lo = EFFORTS.indexOf(floor)
  const hi = Math.max(lo, EFFORTS.indexOf(ceiling))
  return EFFORTS[Math.max(lo, Math.min(hi, EFFORTS.indexOf(effort)))]
}

/** Save mode caps what Auto picks at medium; a higher pick comes down to it. */
/** The limit guard: past GUARD_AT percent of a 5-hour or weekly window, Auto stays at High or below without being
 * asked (Save mode, pressed by hand, caps lower: Medium). */
export const GUARD_AT = 85
export function guarded(effort: Effort, percent: number | null): Effort {
  return percent !== null && percent >= GUARD_AT && EFFORTS.indexOf(effort) > EFFORTS.indexOf('high') ? 'high' : effort
}

export function capped(effort: Effort, saving: boolean): Effort {
  return saving && EFFORTS.indexOf(effort) > EFFORTS.indexOf('medium') ? 'medium' : effort
}

// A main-conversation turn is running: set when a prompt is sent and at each request, cleared when the turn ends (an
// aborted one too). The swamp band and card wait for it: Compact or Handoff mid-turn would cut the reply off. A turn
// with no request for TURN_STALE_MS counts as over, so a missed end never hides the band for good.
let turnBusyAt: number | undefined
const TURN_STALE_MS = 10 * 60_000
function turnBusy(): boolean {
  return turnBusyAt !== undefined && Date.now() - turnBusyAt < TURN_STALE_MS
}
async function setTurnBusy($: EngineInterface, busy: boolean) {
  const was = turnBusyAt !== undefined
  turnBusyAt = busy ? Date.now() : undefined
  if (was !== busy) $.ui.invalidate('ui.render')
}

/** A context share to draw the bars with instead of the real one, from ~/.claude/effortless-preview.json
 * ({"contextPercent": 45}), so how a level looks can be checked on screen without filling a chat. No file, no change. */
async function previewPercent($: EngineInterface): Promise<number | undefined> {
  const home = (await envUserProfile($)) ?? (await envHome($))
  if (!home) return undefined
  const text = await $.fs.read(`${home}/.claude/effortless-preview.json`).catch(() => '')
  if (!text) return undefined
  try {
    const n = Number((JSON.parse(text) as { contextPercent?: unknown }).contextPercent)
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined
  } catch {
    return undefined
  }
}

async function checkSwamp($: EngineInterface) {
  const { context, rateLimits } = await $.session.usage()
  const preview = await previewPercent($)
  const tokens = preview === undefined ? (context.tokens ?? 0) : Math.round(((context.window || 200_000) * preview) / 100)
  // The app may leave the percent out (or give 0) while it has the tokens and the window: work it out then.
  const percent = preview ?? (context.percent || (context.window ? (tokens / context.window) * 100 : 0))
  if (preview !== undefined && !context.window) context.window = 200_000
  const wasStep = handoffGlowStep(lastContext?.percent ?? 0)
  lastContext = { tokens, window: context.window ?? 0, percent }
  // The Handoff button turns white and glows harder with the context: redraw the band when it crosses a step.
  if (handoffGlowStep(percent) !== wasStep) $.ui.invalidate('ui.render')
  await checkHot($, rateLimits ?? [])
  const over = percent >= config.swampAt
  const next = over ? tokens : null
  if (next !== (await read($, swamped))) {
    await update($, swamped, () => next)
    $.ui.invalidate('ui.render')
  }
}

// Redraws still owed after a chat was opened again: the app may draw the band before it is ready for one, so the
// session's 1 s timer asks again a few times (see redrawSoon).
let redrawsOwed = 0
// The countdown's minute the band was last redrawn for (see cacheClockSvg).
let clockMinute = -1
// When the redraws were asked for: once the band has been drawn after that, none are owed any more. Each redraw
// rebuilds the band and restarts its animations, so asking blindly 4 more times reset the cold band's spin 4 times.
let redrawAskedAt = 0
// A draw this soon after the ask may come before the app has the band up, so it does not count.
const REDRAW_SETTLE_MS = 500
function redrawSoon(times = 5) {
  redrawsOwed = Math.max(redrawsOwed, times)
  redrawAskedAt = Date.now()
}

async function showCache($: EngineInterface) {
  // No response seen by this copy yet (it loaded mid-chat, after a plugin switch or reload): a 0 left in the shared
  // state by an earlier copy is not this chat's cache, so the countdown goes blank until the next response.
  if (cacheExpires === 0) {
    if (!coldForced && (await read($, cacheLeft)) !== null) {
      await update($, cacheLeft, () => null)
      $.ui.invalidate('ui.render')
    }
    return
  }
  const minutes = await cacheMinutes($)
  const was = await read($, cacheLeft)
  if (minutes === was) return
  await update($, cacheLeft, () => minutes)
  // Going cold or warm adds or removes the band above the prompt; the desktop app redraws that site only when asked.
  if ((minutes === 0) !== (was === 0)) $.ui.invalidate('ui.render')
}

/** Minutes left, rounded up, so "1" means under a minute and 0 means cold. */
async function cacheMinutes($: EngineInterface): Promise<number> {
  const left = cacheExpires - (await $.clock.now())
  return left <= 0 ? 0 : Math.ceil(left / 60_000)
}

/** A response came back: the cache is warm again for its whole lifetime, and the countdown restarts. */
let usageLogged = false
let lastResponseAt: number | undefined
// Main-conversation replies this copy has seen, for /effortless debug.
let repliesSeen = 0
async function cacheTouched($: EngineInterface, usage: unknown) {
  const now = await $.clock.now()
  repliesSeen++
  if (!usageLogged) {
    usageLogged = true
    void proof($, `first response usage: ${JSON.stringify(usage)}`)
  }
  // When the response does not say, the cache tells by itself: read back after more than 5 minutes means 1 hour.
  const ttl = cacheTtlOf(usage) ?? (lastResponseAt !== undefined && now - lastResponseAt > CACHE_TTL['5m'] && mostlyCached(usage) ? '1h' : undefined)
  lastResponseAt = now
  coldForced = false
  // A reply that wrote only a short 5-minute tail still reads the rest from the 1-hour cache: once 1h is seen, a
  // 5m reading never pulls the countdown back down (that showed "Cold" while the cache was warm).
  if (ttl && ttl !== cacheTtl && !(ttl === '5m' && cacheTtl === '1h' && mostlyCached(usage))) {
    cacheTtl = ttl
    void proof($, `cache lifetime ${ttl}`)
  }
  cacheExpires = now + CACHE_TTL[cacheTtl]
  await rememberCache($)
  if (await read($, isColdHidden)) await update($, isColdHidden, () => false)
  await showCache($)
}

/**
 * Compacts the conversation from the footer once the cache has gone cold: the next message would write the whole
 * context to the cache again, so a summary makes it small first. The countdown hides until the next response.
 */
async function compactCold($: EngineInterface, note = '') {
  if (await read($, isCompacting)) return
  await update($, compactAsk, () => false)
  await update($, isCompacting, () => true)
  await setHandoffCard($, 'compacting', false)
  let compacted = false
  try {
    // The app's own /compact, run as if typed: nothing lands in the prompt box, nothing to send. It waits for the
    // session to be idle, where a direct $.session.compact() is refused whenever the app counts a turn as running.
    // A note goes after /compact as the app's own instructions for the summary.
    await $.command.run({ command: 'compact', args: note.trim() })
    cacheExpires = 0
    await rememberCache($)
    await update($, cacheLeft, () => null)
    compacted = true
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    void proof($, `compact failed: ${why}`)
    $.ui.toast(`pilot: compact failed: ${why.slice(0, 140)}`)
  } finally {
    await update($, isCompacting, () => false)
    // Complete, or gone when it failed (the toast says why).
    if (compacted) {
      await setHandoffCard($, 'compacted', false)
      $.clock.after(COMPACT_CARD_MS + 100, () => $.ui.invalidate('ui.render'))
    } else await update($, handoffCard, card => (card?.kind === 'compacting' ? null : card))
  }
}

// The handoff: one click writes a handoff, clears the chat and sends the handoff into it as the first message.
// The quick handoff is written by a fork, which has no tools: it says what the chat last saw and marks what it cannot
// check. The full handoff (the person's own skill) is the one that inspects git and saves files.
export const HANDOFF_PROMPT = [
  'Write a handoff so this work can continue in a fresh chat that has no other context.',
  '',
  'Start with the project, its folder and the branch. Then:',
  '- Goal: one or two lines.',
  '- Done: what changed, with file paths, and how each change was checked. Never present something planned, skipped or untested as done.',
  '- Not done: what is half done, and the concrete blocker (a failed check, a missing approval, an open question).',
  '- Git: local changes, local commits, pushed commits and open PRs, as last seen in this chat. You cannot check now, so say "as of last check".',
  '- Next steps in priority order. Make the first one runnable: a file path, a command or a specific decision. Mark every step that needs the user with "needs user".',
  '- To resume: the start command, the preview URL, and the limits on what is allowed (what needs the user\'s approval, test vs production).',
  '- Do not redo: decisions made and why, approaches that failed.',
  '',
  'Give only the final state of anything that changed during the chat. Point to specs, plans and files instead of ' +
    'copying them. Leave out what is finished and no longer matters. Never include secrets, environment values or raw ' +
    'logs. Write in the language the user writes in. Short bullets, at most about 40 lines. Do not use tools. Reply ' +
    'with the handoff only, no preamble or farewell.',
].join('\n')

/** The full handoff when no skill of the person's is picked: a turn that may check git and save the handoff, then
 * replies with it. Slower than the quick fork, and it leaves HANDOFF.md in the project for the next chat to read. */
export const HANDOFF_FULL_PROMPT = [
  'Write a handoff so this work can continue in a fresh chat that has no other context. You may use tools for this.',
  '',
  '1. Check the real state: git status, the last few commits, whether the branch is pushed, open PRs if gh is set up.',
  '2. Rewrite HANDOFF.md in the project root from scratch (keep it under 80 lines): branch and open PRs, what is half done,',
  '   next steps with the first one runnable, what only the user can do, and pointers to specs, plans and files.',
  '   Never put secrets or environment values in it.',
  '3. Reply with the handoff itself, in the same shape:',
  '',
  HANDOFF_PROMPT.split('\n').slice(2).join('\n').replace('Do not use tools. ', ''),
].join('\n')

/** The first message of the fresh chat: the handoff, then what to do with it. */
export function handoffMessage(handoff: string, after: HandoffAfter, skill?: string): string {
  const ask =
    after === 'confirm'
      ? 'Read this, say in two lines where things stand and what is next, then wait for me.'
      : 'Continue with the next step. If it is marked "needs user", say what you need and wait.'
  // A full handoff is the person's own skill: it saves the handoff (a file, memories), and its last words in the chat
  // are often only a note that it did. The new chat is told to read what the skill saved before anything else.
  if (skill)
    return (
      `Handoff from the previous chat: it ran /${skill}, which saved the handoff. Its last words there:\n\n${handoff.trim()}\n\n` +
      `First read the handoff /${skill} saved: the files named above, or HANDOFF.md in the project if none is named. ${ask}`
    )
  return `Handoff from the previous chat:\n\n${handoff.trim()}\n\n${ask}`
}

// The handoff's text once its turn has ended, waiting for the chat to go idle so it can be cleared and resent.
let handoffText: string | undefined
let handoffDriving = false

/** Starts a handoff: asks for it (built-in prompt or the person's own skill); the rest follows when it is written. */
// A handoff asked for and not begun: begun from the session's timer, where a prompt may be sent (a command or a press
// may hold the turn, and the app refuses a prompt sent from there).
let handoffQueued = false
// Quick: a fork with the built-in prompt, seconds. Full: the person's own skill as a turn, which may check and save.
let handoffFull = false
// What follows this handoff once it is written (HandoffAfter).
let handoffThen: HandoffAfter = 'continue'

async function startHandoff($: EngineInterface, full = false, after: HandoffAfter = config.handoffAfter) {
  if ((await read($, handoffStage)) !== null) return
  await update($, handoffStage, () => 'writing')
  handoffFull = full
  handoffThen = after
  handoffQueued = true
  await setHandoffCard($, 'writing', handoffFull)
}

/** The choice the handoff bar opens on: the one made last, else quick and the configured after. */
async function lastHandoffChoice($: EngineInterface): Promise<HandoffChoice> {
  const kept = (await $.store.get('handoffChoice').catch(() => null)) as Partial<HandoffChoice> | null
  const kind = kept?.kind === 'full' ? 'full' : 'quick'
  const after = (['continue', 'confirm', 'copy'] as const).find(a => a === kept?.after) ?? config.handoffAfter
  return { kind, after }
}

/** Opens the handoff bar above the prompt: the footer's ⇥ and the swamp band's Handoff. */
async function openHandoffBar($: EngineInterface) {
  if ((await read($, handoffStage)) !== null) return
  const choice = await lastHandoffChoice($)
  await update($, handoffPick, () => choice)
  $.ui.invalidate('ui.render')
}

/** The Enter mark as Claude's prompt box draws it: a return arrow, down the right side and back left. */
export function enterSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5V7.2A1.8 1.8 0 0 1 9.7 9H2.8"/><path d="M5.3 6.4 2.7 9l2.6 2.6"/></g></svg>`
}
// The narrowest bar (in cells) that still has room for a Compact button beside Auto and Handoff.
const COMPACT_BUTTON_MIN_COLUMNS = 80
/** Compact pressed: on desktop a bar asks for an optional note first; the terminal compacts at once. */
async function openCompact($: EngineInterface, e: { surface: string }) {
  if (e.surface === 'terminal') return compactCold($)
  compactNote = ''
  await update($, compactAsk, () => true)
}
async function closeHandoffBar($: EngineInterface) {
  await update($, handoffPick, () => null)
  $.ui.invalidate('ui.render')
}

/** Go in the handoff bar: keeps the choice for next time and starts the handoff. */
async function goHandoff($: EngineInterface, choice: HandoffChoice) {
  await $.store.set('handoffChoice', choice).catch(() => undefined)
  await closeHandoffBar($)
  await startHandoff($, choice.kind === 'full', choice.after)
}

/** What the handoff does, by the choice: who writes it, then what follows. */
export function handoffWhat(choice: HandoffChoice, skill: string): { by: string; then: string } {
  const by = choice.kind === 'full' ? (skill ? `/${skill}, slower` : 'Checks git and saves HANDOFF.md, slower') : 'Done in seconds'
  const then =
    choice.after === 'copy'
      ? 'Copied, chat stays.'
      : choice.after === 'confirm'
          ? 'Clears chat, then waits.'
          : 'Clears chat, carries on.'
  return { by, then }
}

/** What a handoff fork came to, in a few words for /effortless debug: its reason when it wrote nothing. */
export function forkOutcome(result: unknown, ms: number): string {
  const took = `${(ms / 1000).toFixed(1)}s`
  if (result instanceof Error) return `threw: ${result.message.slice(0, 120)} (${took})`
  const r = result as ModelForkResult | undefined
  if (!r || typeof r !== 'object' || !('isAnswered' in r)) return `threw: ${String(result).slice(0, 120)} (${took})`
  if (r.isAnswered) {
    const u = r.usage
    const input = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
    const cached = input ? Math.round((u.cache_read_input_tokens / input) * 100) : 0
    return r.text.trim() ? `answered, ${u.output_tokens} out, ${cached}% cached (${took})` : `answered with blank text (${took})`
  }
  if (r.reason === 'api-error') return `api-error ${r.status ?? 'no response'} ${r.error} (${took})`
  return `${r.reason} (${took})`
}

/** Writes the handoff: quick by a fork with the built-in prompt, full by the person's own skill as a turn. Runs from the timer. */
async function writeHandoff($: EngineInterface) {
  if (!handoffQueued) return
  handoffQueued = false
  try {
    if (handoffFull) {
      // The person's skill, or the built-in full prompt as a turn: either way its reply is the handoff.
      if (config.handoffSkill) await $.command.run({ command: config.handoffSkill, args: '' })
      else await $.prompt.submit({ text: HANDOFF_FULL_PROMPT })
      return
    }
    // A cold cache: a fork would reread the whole chat at full price and write it to the cache again (one handoff took
    // 8% of a person's 5-hour limit). Haiku writes it from the transcript instead, at a fraction of the price.
    const now = await $.clock.now().catch(() => Date.now())
    if ((await read($, cacheLeft)) === 0 || (cacheExpires > 0 && now >= cacheExpires)) {
      const messages = await $.session.messages().catch(() => [])
      const got = messages.length ? await haikuHandoff($, messages).catch(() => null) : null
      await $.store.set('lastFork', { at: Date.now(), outcome: got ? 'cold cache: written by Haiku' : 'cold cache: Haiku failed, forked' }).catch(() => undefined)
      if (got) {
        handoffText = got
        return
      }
    }
    // The built-in handoff is written by a fork: the same model over this chat as it stands, its start read from the
    // prompt cache, no tools and no turn in the chat. Much quicker than a turn that may go exploring first.
    const startedAt = Date.now()
    const forked = await $.model.fork({ prompt: HANDOFF_PROMPT }).catch((error: unknown) => error)
    const outcome = forkOutcome(forked, Date.now() - startedAt)
    // Kept in the store: before a chat's first message the mod's session may start afresh, and its variables with it.
    await $.store.set('lastFork', { at: Date.now(), outcome }).catch(() => undefined)
    const answered = forked as ModelForkResult
    if (answered?.isAnswered && answered.text.trim()) {
      handoffText = answered.text
      return
    }
    // Nothing to fork (no reply yet) or the fork failed: write it as a turn, as before, and say why.
    if (!outcome.startsWith('nothing-to-fork')) $.ui.toast(`pilot: the fork wrote no handoff (${outcome}); writing it as a turn`)
    await $.prompt.submit({ text: HANDOFF_PROMPT })
  } catch (error) {
    await update($, handoffStage, () => null)
    $.ui.toast(`pilot: handoff failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 140)}`)
  }
}

/** Clears the chat and sends the written handoff into it. Runs from the session's timer, when nothing waits on it. */
export async function finishHandoff($: EngineInterface) {
  await writeHandoff($)
  if (handoffText === undefined || handoffDriving) return
  handoffDriving = true
  const text = handoffText
  handoffText = undefined
  try {
    if (handoffThen === 'copy') {
      // The chat stays: the handoff goes to the clipboard, ready to paste into another chat. Should the clipboard
      // refuse, it goes in the prompt box instead, to cut from there.
      const message = handoffMessage(text, 'continue', handoffFull ? config.handoffSkill : undefined)
      const copied = await $.ui.copy({ text: message }).catch(() => ({ isCopied: false as const }))
      // Under the reply already there, so the next reply takes it away.
      await setHandoffCard($, 'copied', handoffFull, true)
      if (copied.isCopied) $.ui.toast('pilot: handoff copied. Paste it into a new chat.')
      else {
        await $.prompt.fill({ text: message, mode: 'replace' })
        $.ui.toast('pilot: the clipboard refused, so the handoff is in the prompt box')
      }
      return
    }
    await update($, handoffStage, () => 'clearing')
    await $.command.run({ command: 'clear', args: '' })
    // Under the first reply of the cleared chat, gone with the one after it.
    await setHandoffCard($, 'done', handoffFull)
    await $.prompt.submit({ text: handoffMessage(text, handoffThen, handoffFull ? config.handoffSkill : undefined) })
  } catch (error) {
    await update($, handoffCard, () => null)
    $.ui.toast(`pilot: handoff failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 140)}`)
  } finally {
    handoffDriving = false
    await update($, handoffStage, () => null)
  }
}

/** The user and plugin skills, for the handoff picker in the settings and the setup guide. */
async function loadInstalledSkills($: EngineInterface) {
  // Read here, once, not while drawing: a slow or refused lookup must not cost the panel.
  const installed = await $.command.list().catch(() => [])
  // At most 25, handoff-like ones first: a picker with hundreds of options is more than the slot takes.
  const names = [...new Set(installed.filter(c => c.source === 'user' || c.source === 'plugin').map(c => c.name))]
    .filter(name => !name.startsWith('effortless'))
    .sort((a, b) => Number(!/handoff/i.test(a)) - Number(!/handoff/i.test(b)) || a.localeCompare(b))
    .slice(0, 25)
  await update($, installedSkills, () => names)
}

/** Opens the effortless settings panel above the prompt: the app does not let a plugin open its /plugin dialog. */
async function openPluginSettings($: EngineInterface) {
  await loadInstalledSkills($)
  await update($, settingsOpen, () => true)
  // Before a chat's first message the app may start the mod's session afresh for each command, and the state with
  // it: the request also goes to the store, which outlives that, and the next drawing picks it up.
  // The store is shared by every chat, so the request names this one: another chat must not open its panel too.
  await $.store.set('openSettingsAt', { at: Date.now(), session: await $.session.id().catch(() => '') })
  $.ui.invalidate('ui.render')
}

/** The settings rows the panel changes, by field: saved as the plugin's own setting and used at once. */
// Small purple marks beside the settings rows' titles: text glyphs, which draw wherever text does (an Svg there did not).
const ICON_EFFORT = '◔'
const ICON_JUDGE = '⚖︎'
const ICON_HANDOFF = '⇥'
const ICON_SHOW = '◉'
const SETTING_FIELDS = {
  judge: 'judge',
  bias: 'effortBias',
  floor: 'effortFloor',
  ceiling: 'effortCeiling',
  handoffAfter: 'handoffAfter',
  handoffSkill: 'handoffSkill',
  hide: 'hide',
  swampAt: 'swampAt',
  layout: 'layout',
  compactWith: 'compactWith',
  handoffButton: 'handoffButton',
  modelAuto: 'modelAuto',
  helpers: 'helpers',
  theme: 'theme',
  appearance: 'appearance',
} as const

async function saveSetting($: EngineInterface, field: keyof typeof SETTING_FIELDS, value: string) {
  const { deny } = await $.config
    .set({ key: `pilot.${SETTING_FIELDS[field]}`, value })
    .catch((error: unknown) => ({ deny: error instanceof Error ? error.message : String(error) }))
  // Some Claude Code builds have no /config row for a plugin's settings and refuse the write: the choice is kept in
  // the mod's own store then, and read back at the next session start. A write that lands clears that copy.
  const kept = ((await $.store.get('savedSettings').catch(() => null)) ?? {}) as Record<string, string>
  const { [SETTING_FIELDS[field]]: _old, ...others } = kept
  const stored = await $.store
    .set('savedSettings', deny ? { ...kept, [SETTING_FIELDS[field]]: value } : others)
    .then(() => true)
    .catch(() => false)
  if (deny && !stored) $.ui.toast(`pilot: could not save ${field}: ${String(deny).slice(0, 120)}`)
  const raw: Record<string, unknown> = {
    judge: config.judge,
    effortBias: String(config.bias),
    effortFloor: config.floor,
    effortCeiling: config.ceiling,
    handoffAfter: config.handoffAfter,
    handoffSkill: config.handoffSkill,
    hide: config.hide.join(','),
    swampAt: String(config.swampAt),
    layout: config.layout,
    compactWith: config.compactWith,
    handoffButton: config.handoffButton,
    modelAuto: config.modelAuto,
    helpers: config.helpers,
    theme: config.theme,
    appearance: config.appearance,
    [SETTING_FIELDS[field]]: value,
  }
  config = { ...readConfig(raw), typesafeKey: config.typesafeKey }
  applyTheme()
  $.ui.invalidate('ui.render')
}

/** How long the "Settings saved" card stays above the prompt. */
const SAVED_CARD_MS = 2500
/** The card after Save: the bar's own colours, one line, nothing moving. */
function savedCardTree($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const { Box, Text } = themedEls($.ui.resolve(e))
  return (
    <Box key="saved" flexDirection="row" alignItems="center" gap={1} paddingX={1} backgroundColor={DASH_BG} borderStyle="round" borderColor={DASH_EDGE}>
      <Text color={ACCENT}>✓</Text>
      <Text bold>Settings saved</Text>
    </Box>
  )
}

/** Saves every change in the panel's draft, then closes the panel. Nothing changed applies before this. */
async function saveDraft($: EngineInterface) {
  const draft = await read($, settingsDraft)
  const { key, ...rest } = draft
  // The key goes to its file first; the settings then go through the store queue, since each one reloads the plugin.
  if (key?.trim()) await saveJevKey($, key, false)
  const changes: Record<string, string> = {}
  for (const field of Object.keys(SETTING_FIELDS) as (keyof typeof SETTING_FIELDS)[]) {
    const value = rest[field]
    if (value !== undefined) changes[field] = value
  }
  if (key?.trim() && (changes.judge ?? config.judge) !== 'jev') changes.judge = 'jev'
  await update($, settingsDraft, () => ({}))
  await update($, settingsOpen, () => false)
  // Said by a card above the prompt, not a toast. Kept in the store: each setting written reloads the plugin.
  await $.store.set('settingsSavedAt', await $.clock.now().catch(() => Date.now()))
  $.ui.invalidate('ui.render')
  await $.store.set('setupSave', changes)
  await drainSetupSave($)
}

/** A TYPESAFE_API_KEY line set in an .env file's text: replaced where it is, added where it is not. */
export function withJevKey(text: string, key: string): string {
  const line = `TYPESAFE_API_KEY=${key}`
  if (/^\s*TYPESAFE_API_KEY\s*=.*$/m.test(text)) return text.replace(/^\s*TYPESAFE_API_KEY\s*=.*$/m, line)
  return `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`
}

/**
 * A key pasted in the panel goes to ~/.config/jev/.env, the file the jev skills read: a plugin cannot write the
 * app's secret settings. From then on that file wins over an older key in the settings.
 */
async function saveJevKey($: EngineInterface, key: string, setJudge = true) {
  const clean = key.trim()
  if (!clean) return
  const home = (await envUserProfile($)) ?? (await envHome($))
  if (!home) {
    $.ui.toast('pilot: no home folder found to save the key in.')
    return
  }
  const path = `${home}/.config/jev/.env`
  const before = await $.fs.read(path).catch(() => '')
  try {
    await $.fs.write(path, withJevKey(typeof before === 'string' ? before : '', clean))
  } catch (error) {
    $.ui.toast(`pilot: could not save the key: ${(error instanceof Error ? error.message : String(error)).slice(0, 120)}`)
    return
  }
  await $.store.set('keyFromFile', true)
  keyFromFile = true
  askJevFile = undefined
  if (setJudge && config.judge !== 'jev') await saveSetting($, 'judge', 'jev')
  await update($, judgeDown, () => null)
  warned.clear()
  $.ui.toast('pilot: key saved. Jev judges from the next message.')
  $.ui.invalidate('ui.render')
}

/** A TypeSafe key the jev judge would use: the settings, TYPESAFE_API_KEY, or ~/.config/jev/.env (Jev was picked). */
async function findTypesafeKey($: EngineInterface): Promise<boolean> {
  return Boolean(await typesafeKeyAnywhere($))
}

/** The TypeSafe key from the settings, TYPESAFE_API_KEY or ~/.config/jev/.env, for a step the person asked for. */
async function typesafeKeyAnywhere($: EngineInterface): Promise<string | undefined> {
  const known = config.typesafeKey || (await envJevKey($))
  if (known) return known
  const home = (await envUserProfile($)) ?? (await envHome($))
  if (!home) return undefined
  const text = await $.fs.read(`${home}/.config/jev/.env`).catch(() => '')
  return parseJevKey(typeof text === 'string' ? text : '')
}

export type SetupStep = 'pick' | 'jev' | 'lean' | 'handoff' | 'look' | 'done'

/** The lean's five stops, cheaper to smarter: a name, and what it does to the judge's pick (see tipped). */
export const LEAN_STOPS = [
  ['Cheapest', 'more picks go lower'],
  ['Cheaper', 'unsure picks go lower'],
  ['Balanced', 'the judge decides'],
  ['Smarter', 'unsure picks go higher'],
  ['Smartest', 'more picks go higher'],
] as const

/** The guide's step after this one: the judge (with its key or URL), the lean, the handoff, then done. */
export function setupNext(step: SetupStep): SetupStep | null {
  if (step === 'pick' || step === 'jev') return 'lean'
  if (step === 'lean') return 'handoff'
  if (step === 'handoff') return 'look'
  if (step === 'look') return 'done'
  return null
}

/** The step Back goes to: the judge's key or URL goes back to the pick, as does the lean. */
export function setupBack(step: SetupStep): SetupStep | null {
  if (step === 'jev' || step === 'lean') return 'pick'
  if (step === 'handoff') return 'lean'
  if (step === 'look') return 'handoff'
  if (step === 'done') return 'look'
  return null
}

/** "2/3" for the step shown; the closing step has no number. */
export function setupCounter(step: SetupStep): string {
  const n = { pick: 1, jev: 1, lean: 2, handoff: 3, look: 4, done: 0 }[step]
  return n ? `${n}/4` : ''
}

/** Shows a step of the guide; the handoff step needs the installed skills to pick from. */
async function goSetup($: EngineInterface, step: SetupStep | null) {
  if (step === 'handoff') await loadInstalledSkills($)
  await update($, setupStep, () => step)
}

/** The guide's choices over the saved settings: what each step shows. */
export function setupShown(draft: SettingsDraft, saved: JudgeConfig) {
  return {
    judge: (draft.judge ?? saved.judge) as JudgeConfig['judge'],
    bias: draft.bias !== undefined ? Number(draft.bias) : saved.bias,
    handoffSkill: draft.handoffSkill ?? saved.handoffSkill,
    hide: (draft.hide ?? saved.hide.join(',')).split(',').filter(Boolean) as Hideable[],
    appearance: (draft.appearance ?? saved.appearance) as JudgeConfig['appearance'],
  }
}

/** Saves what the guide changed, only the fields that differ, then empties its draft. */
async function flushSetup($: EngineInterface) {
  const draft = await read($, setupDraft)
  await update($, setupDraft, () => ({}))
  const saved: Record<string, string> = {
    judge: config.judge,
    bias: String(config.bias),
    handoffSkill: config.handoffSkill,
    hide: config.hide.join(','),
    appearance: config.appearance,
  }
  const changes: Record<string, string> = {}
  for (const field of ['hide', 'judge', 'bias', 'handoffSkill', 'appearance'] as const) {
    const value = draft[field]
    if (value !== undefined && value.trim() !== saved[field]) changes[field] = value.trim()
  }
  await $.store.set('setupSave', changes)
  await drainSetupSave($)
}

let drainingSetup = false

/**
 * Saves the setup's changes one at a time from the store. Each saved setting reloads the plugin, which cuts off a loop
 * here, so a field leaves the store before it is saved and the reloaded plugin carries on with the rest.
 */
async function drainSetupSave($: EngineInterface) {
  if (drainingSetup) return
  drainingSetup = true
  try {
    for (;;) {
      const queue = ((await $.store.get('setupSave').catch(() => null)) ?? {}) as Record<string, string>
      const [field] = Object.keys(queue)
      if (!field) return
      const { [field]: value, ...rest } = queue
      await $.store.set('setupSave', Object.keys(rest).length ? rest : null)
      if (field in SETTING_FIELDS) await saveSetting($, field as keyof typeof SETTING_FIELDS, value)
    }
  } finally {
    drainingSetup = false
  }
}

/** The judge is settled (picked or skipped): the guide does not open by itself again, and the footer shows ⚙. */
async function markSetupDone($: EngineInterface) {
  await Promise.all([update($, setupPending, () => false), $.store.set('setupDone', true)])
}

/** Closes the guide at its last step, saving what was picked. */
async function finishSetup($: EngineInterface) {
  await markSetupDone($)
  await goSetup($, null)
  await flushSetup($)
}

/** The ✕: closes the guide; what was picked so far is kept. */
async function closeSetup($: EngineInterface) {
  await goSetup($, null)
  await flushSetup($)
}

/** The person picked a judge in the guide: then the judge's key or URL, or the next step. Saved at the end. */
async function pickJudge($: EngineInterface, choice: 'haiku' | 'jev') {
  // Haiku is saved as Auto: Jev whenever a TypeSafe key is there, Haiku otherwise and whenever Jev does not answer.
  await update($, setupDraft, d => ({ ...d, judge: choice === 'haiku' ? 'auto' : choice }))
  await markSetupDone($)
  if (choice === 'haiku') {
    $.ui.toast('pilot: Haiku 5.5 judges, no key needed. Add a Jev key later for faster answers.')
    return goSetup($, 'lean')
  }
  if (choice === 'jev' && (await findTypesafeKey($))) {
    $.ui.toast('pilot: Jev judges with the TypeSafe key it found.')
    return goSetup($, 'lean')
  }
  await goSetup($, choice)
}

/** 1234 -> "1.2k", 87 -> "87". */
function tokens(n: number): string {
  const v = Math.abs(n)
  const text = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
  return n < 0 ? `-${text}` : text
}

const share = (part: number, whole: number) => `${Math.round((part / whole) * 100)} %`

/**
 * What /effortless stats answers: what the prompts Auto steered cost, measured, split by kind and by effort,
 * and what the judge took. No "saved" figure: what a prompt would have cost at another effort is not known,
 * since effort mostly changes how many tool calls it makes. Cost is in tokens weighted as priced (WEIGHT).
 */
export function savedText(raw: Spent): string {
  const t = asSpent(raw)
  const judged = t.judge.jev + t.judge.haiku
  const helperRuns = EFFORTS.reduce((n, e) => n + (t.helpers.runs[e] ?? 0), 0)
  if (t.prompts === 0 && judged === 0 && t.moved === 0 && helperRuns === 0) return 'nothing measured yet'
  const input = t.input * WEIGHT.input
  const write = t.write * WEIGHT.write
  const cached = t.read * WEIGHT.read
  const out = t.out * WEIGHT.out
  const total = input + write + cached + out
  const lines = [
    `${t.prompts} prompts, ${t.requests} requests, cost about ${tokens(Math.round(total))} tokens weighted by price` +
      (total > 0 ? ` (cache reads ${share(cached, total)}, cache writes ${share(write, total)}, output ${share(out, total)})` : ''),
  ]
  const per = EFFORTS.filter(e => t.byEffort[e]?.prompts).map(e => {
    const b = t.byEffort[e]!
    return `${EFFORT_LABELS[e]} ${b.prompts}, average ${tokens(Math.round(b.cost / b.prompts))}`
  })
  if (per.length) lines.push(`Per prompt: ${per.join('; ')}`)
  if (t.moved) {
    lines.push(`Cheaper model: ${t.moved} prompt${t.moved === 1 ? '' : 's'} moved down, ${t.redone} redone (${share(t.redone, t.moved)})`)
  }
  if (helperRuns) {
    const per = EFFORTS.filter(e => t.helpers.runs[e]).map(e => `${EFFORT_LABELS[e]} ${t.helpers.runs[e]}`)
    lines.push(`Helpers: ${helperRuns} subagent${helperRuns === 1 ? '' : 's'} (${per.join(', ')}), ${t.helpers.requests} requests, cost about ${tokens(Math.round(t.helpers.cost))} tokens`)
  }
  if (judged) {
    lines.push(`Judge: Jev ${t.judge.jev}, Haiku ${t.judge.haiku}, average ${Math.round(t.judge.ms / judged)} ms, ${tokens(t.judge.tokens)} tokens in all`)
  }
  return lines.join('\n')
}

/** You picked an effort (terminal rows): Auto for effort goes off and the requests follow; Enter on /effort moves the app. */
async function pickEffort($: EngineInterface, level: Effort) {
  const t0 = Date.now()
  const inUse = (await read($, model)) ?? (await sessionModel($))
  const t1 = Date.now()
  // Together, so the app redraws once for the click and not once per write.
  await Promise.all([
    update($, isAuto, () => false),
    $.store.set('isAuto', false),
    choose($, { model: inUse, effort: level, why: 'your pick', by: 'manual' }),
  ])
  const t2 = Date.now()
  await typeCommand($, `/effort ${level}`)
  const t3 = Date.now()
  void proof($, `click ${level}: ${t3 - t0} ms (read ${t1 - t0}, state ${t2 - t1}, typed command ${t3 - t2})`)
}

async function toggleAutoEffort($: EngineInterface) {
  const turnOn = !(await read($, isAuto))
  await update($, isAuto, () => turnOn)
  await $.store.set('isAuto', turnOn)
}

async function choose($: EngineInterface, next: Pick | null) {
  pickCarried = false
  const before = await read($, pick)
  await Promise.all([update($, pick, () => next), $.store.set('pick', next)])
  // A change Auto made is shown as "Low → High" for a moment, so the switch is seen.
  if (next && next.by !== 'manual' && before && before.model !== 'haiku' && before.effort !== next.effort) {
    const change = { from: before.effort, to: next.effort }
    await update($, switched, () => change)
    $.clock.after(SWITCHED_MS, () => void update($, switched, () => null))
  }
}

/** Everything a redraw needs, read together: the reads go out at once instead of one after the other. */
// The context figures from the last usage check, for the cache tooltip.
let lastContext: { tokens: number; window: number; percent: number } | null = null

/** A small ring filled to `percent`, for the context in the swamp band. */
export function ringSvg(percent: number, color: string): string {
  const p = Math.max(0, Math.min(100, percent))
  const c = 2 * Math.PI * 6
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="2.2"/><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${((c * p) / 100).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)"/></svg>`
}

/** The dashboard's settings icon: an outlined cog of eight teeth, drawn rather than a glyph, since the gear character
 * is a different shape in every font. */
export function settingsSvg(color: string): string {
  const step = (2 * Math.PI) / 8
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const a = i * step
    const at = (f: number, r: number) => `${(7 + r * Math.cos(a + f * step)).toFixed(2)},${(7 + r * Math.sin(a + f * step)).toFixed(2)}`
    pts.push(at(-0.42, 4.6), at(-0.27, 4.6), at(-0.2, 6.1), at(0.2, 6.1), at(0.27, 4.6), at(0.42, 4.6))
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.3" stroke-linejoin="round" shape-rendering="geometricPrecision"><path d="M${pts.join('L')}Z"/><circle cx="7" cy="7" r="2"/></g></svg>`
}

/** The settings rows' icons, drawn in the cog's outline style (14 px, 1.3 stroke) rather than font glyphs, which
 * differ per font. */
export function rowIconSvg(kind: 'effort' | 'model' | 'judge' | 'handoff' | 'show' | 'quick' | 'full', color: string): string {
  const shapes = {
    // A gauge: an open arc with a needle.
    effort: '<path d="M2.6 10.4A5 5 0 1 1 11.4 10.4"/><path d="M7 8.2L9.6 5.2"/><circle cx="7" cy="8.6" r=".9"/>',
    // Layers: the models, stacked.
    model: '<path d="M7 2 12.2 4.7 7 7.4 1.8 4.7Z"/><path d="M1.8 7.3 7 10 12.2 7.3"/><path d="M1.8 9.9 7 12.6 12.2 9.9"/>',
    // Scales: a beam on a post, two pans.
    judge: '<path d="M7 2.4V11.6M4.4 11.6H9.6M2.6 4.2H11.4"/><path d="M2.6 4.2L1.2 7.6A1.5 1.5 0 0 0 4 7.6Z"/><path d="M11.4 4.2L10 7.6A1.5 1.5 0 0 0 12.8 7.6Z"/>',
    // An arrow into a bar: hand off.
    handoff: '<path d="M1.8 7H9.4M6.6 4.2L9.4 7L6.6 9.8"/><path d="M11.8 2.6V11.4"/>',
    // A pencil: customize. The tip down left, a line across the ferrule.
    show: '<path d="M9.6 2.1 11.9 4.4 4.9 11.4 2.1 11.9 2.6 9.1Z"/><path d="M8.1 3.6 10.4 5.9"/>',
    // Quick and Full are drawn solid below: an outline at 14 px was too thin to read.
    quick: '',
    full: '',
  }[kind]
  if (kind === 'quick' || kind === 'full') {
    const solid = kind === 'quick'
      // A bolt: the quick handoff, done in seconds.
      ? 'M8.6 1 2.8 8.2H6.6L5.4 13 11.2 5.8H7.4Z'
      // A pen: the full handoff, written out by your skill.
      : 'M10.2 1.5 12.5 3.8 5.3 11 2.3 11.7 3 8.7ZM9 2.7 11.3 5'
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="${solid}" fill="${color}" stroke="${color}" stroke-width="0.6" stroke-linejoin="round"/></svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">${shapes}</g></svg>`
}

/** A band's entrance: a soft violet wash that fades and a light sweep passing left to right, once, as the band
 * appears. The app has no transitions for a band (its tree is swapped at once), but a plain Svg's CSS animation starts
 * when the image is first drawn and is not restarted by a redraw with the same source. Stretched to the band
 * (preserveAspectRatio none: the app scales a Svg down to its box's width but keeps its height), behind the content. */
export const INTRO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="240" viewBox="0 0 1600 240" preserveAspectRatio="none"><style>.w{opacity:0;animation:w .7s ease-out}.s{opacity:0;animation:s 1.1s cubic-bezier(.2,.7,.2,1)}@keyframes w{from{opacity:.16}to{opacity:0}}@keyframes s{from{transform:translateX(-520px);opacity:1}80%{opacity:1}to{transform:translateX(1700px);opacity:0}}</style><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#b9a7ff" stop-opacity=".16"/><stop offset=".7" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect class="w" width="1600" height="240" fill="#8b6cff"/><rect class="s" width="480" height="240" fill="url(#g)"/></svg>`

/** k/M for token counts: 420000 -> "420k", 1000000 -> "1.0M". */
function kTokens(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`
}

async function snap($: EngineInterface) {
  const [auto, autoModel, current, judging, wanted, shownByApp, modelNow, switchedNow, pausedNow, cacheNow, compacting] = await Promise.all([
    read($, isAuto),
    read($, isAutoModel),
    read($, pick),
    read($, isJudging),
    read($, suggestion),
    read($, appEffort),
    read($, model),
    read($, switched),
    read($, paused),
    read($, cacheLeft),
    read($, isCompacting),
  ])
  return { auto, autoModel, current, judging, wanted, shownByApp, modelNow, switchedNow, pausedNow, cacheNow, compacting }
}
type Snap = Awaited<ReturnType<typeof snap>>

/** The hover cards' text: what Auto did and why, and what the cache countdown means with the context it guards. */
function hoverTips(v: Snap): { effort: string; cache: string } {
  const effortTip = !v.auto
    ? 'Auto is off: the effort stays as you set it. The power button turns Auto on.'
    : v.pausedNow
      ? 'Auto waits on this model: an effort change would rewrite its prompt cache.'
      : !effortOf(v, v.modelNow ?? 'sonnet')
        ? 'This model runs without an effort level, so Auto has nothing to set.'
      : [
          v.current ? `Auto picked ${EFFORT_LABELS[v.current.effort]}${v.current.by !== 'manual' ? ` (${v.current.by})` : ''}` : 'Auto picks the effort for each message',
          v.current?.why ? `Why: ${v.current.why}` : '',
          `Lean: ${['much cheaper', 'cheaper', 'as the judge says', 'smarter', 'much smarter'][config.bias + 2]} · range ${config.floor} to ${config.ceiling}`,
        ]
          .filter(Boolean)
          .join(' · ')
  const ctx = lastContext && lastContext.window ? ` · Context ${lastContext.percent}% · ${kTokens(lastContext.tokens)}/${kTokens(lastContext.window)}` : ''
  const cacheTip =
    v.cacheNow === 0
      ? `Prompt cache cold: the next message reads the whole chat again at full price. Compact first to save.${ctx}`
      : `Prompt cache warm for ${cacheLabel(v.cacheNow ?? 0)} more: the next message reads the chat from cache, cheap and fast.${ctx}`
  return { effort: effortTip, cache: cacheTip }
}

/** The effort to show: yours or the judge's, else what the app itself runs with; none on Haiku. */
function effortOf(v: Snap, inUse: ModelKey): Effort | undefined {
  if (inUse === 'haiku') return undefined
  if (v.current) return v.current.effort
  return EFFORTS.includes(v.shownByApp as Effort) ? (v.shownByApp as Effort) : undefined
}

// For /effortless debug: how often the app asked for the band, when, and the last error drawing it.
// /effortless probe N: 1 a bare box, 2 the panel's frame and header only, 3 the panel without pickers or fields.
let probeLevel = 0
let renderCalls = 0
let lastRenderProps = ''
let lastRenderBranch = ''
// Every time the app asked for the band, with what it sent, written to ~/.claude/effortless-render-<chat>.log each second
// (the last 300): how often the band is really redrawn in the app, which the render rig cannot see (hover flicker).
const renderLog: string[] = []
let renderLogWritten = 0
async function writeRenderLog($: EngineInterface) {
  if (renderLog.length === renderLogWritten) return
  if (renderLog.length > 600) renderLog.splice(0, renderLog.length - 300)
  renderLogWritten = renderLog.length
  const home = (await envUserProfile($)) ?? (await envHome($))
  // One file per chat: a shared file was overwritten whole by whichever chat drew last.
  if (home) await $.fs.write(`${home}/.claude/effortless-render-${loadedSession}.log`, renderLog.slice(-300).join('\n') + '\n').catch(() => undefined)
}
let lastRenderAt = 0
let loadedSession = '-'
// When this module loaded, for the render log's "first draw" line.
let loadedAt = Date.now()
let firstDrawLogged = false
let drawsTimed = 0
let lastRenderError = ''
let sessionStarted = 0
// When the app's SessionStart came and what it said, for /effortless debug: a cold band that shows late is either a
// late signal or a redraw the app did not take.
let classicStart: { at: number; said: string } | null = null
// /effortless cold shows the band whatever the chat's size, until the next response (a test of the band itself).
let coldForced = false
let handoffTimer: { cancel: () => void } | undefined
const HANDOFF_POLL_MS = 1000
// The model this prompt's requests run on when the judge picked a cheaper one than the chat's, else null. The chat's
// own model stays as it is: each request is sent to the cheaper model in turn.step, so the chat model's cache stays warm
// for the next prompt that needs it.
let routed: ModelKey | null = null
// Prompts left that stay on the chat's model, after a cheaper answer was redone.
let stayUp = 0
const MODEL_RANK: ModelKey[] = ['haiku', 'sonnet', 'opus', 'fable']
/** The model a verdict sends this prompt to: a cheaper one than the chat's, or null for the chat's own. Never Fable. */
export function routeTo(verdict: ModelKey, inUse: ModelKey): ModelKey | null {
  if (verdict === 'fable') return null
  return MODEL_RANK.indexOf(verdict) < MODEL_RANK.indexOf(inUse) ? verdict : null
}

// What one input token costs on each model, in Sonnet's price: Opus about 2x (measured: the same prompt cost 1.97x on Opus), Haiku about a third. These are the ratios
// the savings estimate uses; they only have to be right enough to tell which side of a switch is cheaper.
export const MODEL_PRICE: Record<ModelKey, number> = { haiku: 1 / 3, sonnet: 1, opus: 2, fable: 5 }
/**
 * Whether sending this one prompt to a cheaper model pays. The chat's context is read from the cache (a tenth of the input
 * price) where that model's cache is warm, and written to it (1.25 times) where it is cold. A switch to a cold model
 * writes the whole context first, which can cost more than staying on the chat's own warm one at a low effort.
 */
export function routeWorth(to: ModelKey, inUse: ModelKey, contextTokens: number, warm: { to: boolean; inUse: boolean }): boolean {
  if (!(contextTokens > 0)) return true
  // Claude Code writes the 1-hour cache, which costs twice the input price (measured), not the 5-minute 1.25.
  const write = 2
  const stay = contextTokens * MODEL_PRICE[inUse] * (warm.inUse ? WEIGHT.read : write)
  const move = contextTokens * MODEL_PRICE[to] * (warm.to ? WEIGHT.read : write)
  return move < stay
}
// Until when each model's prompt cache is warm for this chat: set by every main response on it.
const warmUntil: Partial<Record<ModelKey, number>> = {}
// On the mod's clock, the same one the cache countdown runs on.
function markWarm(modelId: string, usage: unknown, now: number) {
  const key = keyOf(modelId)
  if (key) warmUntil[key] = now + CACHE_TTL[cacheTtlOf(usage) ?? '5m']
}
const isWarm = (key: ModelKey, now: number) => (warmUntil[key] ?? 0) > now

// When Haiku last wrote a compaction (for /effortless debug).
let lastHaikuCompact = 0

// The moving art's timer: one at a time, blitting the next frame to the band that drew it. A blit the surface refuses
// (the band went away, another drew instead) ends it, so nothing has to stop it from outside.
let artTimer: { cancel(): void } | null = null
let artShown: { requestId: string; kind: ArtKind } | null = null
let artFrameCount = 0

/** A band's art on the terminal: a Raster on the right, moving for alert kinds; null where it has no room. */
function bandArt($: EngineInterface, e: RenderInput<'AbovePrompt'>, kind: ArtKind) {
  const els = themedEls($.ui.resolve(e))
  const columns = typeof e.props.bodyColumns === 'number' ? e.props.bodyColumns : 0
  if (e.surface !== 'terminal' || !('Raster' in els) || columns < ART_MIN_WIDTH) return null
  // The still sparkles (the resting dashboard, the guide) are 16 by 4 pixels: in a terminal they read as noise, not
  // art. Only the art that says something stays: the alerts, compacting and the done tick.
  if (kind === 'calm' || kind === 'brand') return null
  const { Box, Raster } = els
  artShown = { requestId: e.requestId, kind }
  if (MOVING.has(kind) && !artTimer) {
    artTimer = $.clock.every(ART_FRAME_MS, () => {
      const shown = artShown
      if (!shown || !MOVING.has(shown.kind)) {
        artTimer?.cancel()
        artTimer = null
        return
      }
      artFrameCount++
      void $.ui
        .blit({ requestId: shown.requestId, key: 'art', cells: artFrame(shown.kind, artFrameCount) })
        .then(r => {
          if ('deny' in r && r.deny) {
            artTimer?.cancel()
            artTimer = null
          }
        })
        .catch(() => undefined)
    })
  }
  return (
    <Box key="art-box" flexShrink={0}>
      <Raster key="art" columns={ART_COLUMNS} rows={ART_ROWS} cells={artFrame(kind, artFrameCount)} />
    </Box>
  )
}

/** A bar on the terminal (setup, handoff): the title and words on the left with the brand's still art beside them,
 * the controls on a row of their own that wraps, so nothing is cut at 80 columns. */
function terminalPanel($: EngineInterface, e: RenderInput<'AbovePrompt'>, key: string, title: string, words: unknown, controls: unknown[]) {
  const { Box, Text } = themedEls($.ui.resolve(e))
  return (
    <Box key={key} flexDirection="column" paddingX={1} backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
      <Box flexDirection="row" gap={1} alignItems="center">
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <Text color={ACCENT} bold wrap="truncate">{title}</Text>
          {typeof words === 'string' ? <Text key={`${key}-what`} dimColor wrap="truncate">{words}</Text> : words}
        </Box>
        {bandArt($, e, 'brand')}
      </Box>
      <Box key={`${key}-actions`} flexDirection="row" flexWrap="wrap" justifyContent="flex-end" columnGap={1} alignItems="center">
        {controls}
      </Box>
    </Box>
  )
}

type TerminalBand = { key: string; kind: ArtKind; color: string; bg: string; edge: string; title: string; detail: string; buttons: unknown[]; autoInBar?: boolean; word?: { text: string; color: string; rest: string } }

/** An alert band on the terminal: title and buttons, the detail on a line of its own, art on the right, and the effort
 * row under it, so effort stays in sight while a band shows. */
async function terminalBand($: EngineInterface, e: RenderInput<'AbovePrompt'>, b: TerminalBand) {
  const { Box, Text } = themedEls($.ui.resolve(e))
  const { rows } = await effortRows($, e, { auto: !b.autoInBar })
  return (
    <Box key={`${b.key}-col`} flexDirection="column">
      <Box key={b.key} flexDirection="row" gap={1} alignItems="center" paddingX={1} backgroundColor={b.bg} borderStyle="round" borderColor={b.edge}>
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <Box flexDirection="row" gap={1} alignItems="center">
            <Box flexShrink={0}>
              {b.word ? (
                <Box flexDirection="row">
                  <Text color={b.color} bold>{'✦ '}</Text>
                  <Text key={`${b.key}-word`} color={b.word.color} bold>{b.word.text}</Text>
                  <Text color={b.color} bold>{b.word.rest}</Text>
                </Box>
              ) : (
                <Text color={b.color} bold>{`✦ ${b.title}`}</Text>
              )}
            </Box>
            <Box flexGrow={1} />
            {b.buttons}
          </Box>
          <Text dimColor wrap="truncate">{b.detail}</Text>
        </Box>
        {bandArt($, e, b.kind)}
      </Box>
      {rows}
    </Box>
  )
}

/** The dashboard's two lines: the effort with the cache and the context, then the judge's reason and the last reply. */
export function dashboardLines(d: {
  auto: boolean
  paused: boolean
  judging: boolean
  effort: Effort | undefined
  cacheNow: number | null
  contextPercent: number | null
  reason: string
  last: { cost: number; ms: number } | null
}): { head: string; what: string; rest: string; detail: string } {
  const level = d.effort ? EFFORT_LABELS[d.effort] : 'Auto'
  // Auto on or off is the button's to say (and the terminal's effort row's), not the text's.
  const what = d.judging ? 'Deciding…' : !d.auto ? 'Off' : d.paused ? `${level} · Auto paused` : level
  const head = [
    `✦ ${what}`,
    d.cacheNow === null ? null : `cache ${cacheLabel(d.cacheNow)}`,
    d.contextPercent === null ? null : `${Math.round(d.contextPercent)}% context`,
  ]
  const last = d.last ? `last reply ≈${tokens(Math.round(d.last.cost))} tokens · ${Math.max(1, Math.round(d.last.ms / 1000))}s` : null
  const shown = head.filter(Boolean) as string[]
  return {
    head: shown.join(' · '),
    what,
    rest: shown.slice(1).map(part => ` · ${part}`).join(''),
    detail: [d.reason, last].filter(Boolean).join(' · '),
  }
}

/** How long the effort word glows after it changes: held at full colour, then faded out; and the step of the fade. */
const FLASH_HOLD_MS = 1000
const FLASH_MS = 1800
/** The fade's steps, [ms, share of the way to white]: five, so it reads as a fade without a tick. Each step is a redraw,
 * and every redraw rebuilds the band (images restart, buttons under a pointer are swapped), so keep them few. */
const FLASH_STEPS: readonly (readonly [number, number])[] = [[1000, 0.15], [1160, 0.35], [1320, 0.55], [1480, 0.75], [1640, 0.9]]
/** The glow: a stronger violet than the accent, so a switch is seen at a glance. */
let FLASH_COLOR = '#9b7bff'
/** The effort word's colour `ms` after it changed: the glow, held, then easing out to the band's white. */
export function flashColor(ms: number | null): string {
  if (ms === null || ms >= FLASH_MS) return DASH_TEXT
  if (ms < FLASH_HOLD_MS) return FLASH_COLOR
  const k = [...FLASH_STEPS].reverse().find(([at]) => ms >= at)?.[1] ?? 0
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map(i => Math.round(ch(FLASH_COLOR, i) + (ch(DASH_TEXT, i) - ch(FLASH_COLOR, i)) * k).toString(16).padStart(2, '0')).join('')}`
}
// The word the dashboard last showed and when it last changed, so a new effort glows and fades. Not while the judge
// decides: the word it lands on is compared with the one before.
let flashWord: string | null = null
let flashAt: number | null = null

async function effortFlash($: EngineInterface, what: string, judging: boolean, entering = false): Promise<string> {
  const now = await $.clock.now()
  // The dashboard coming back (after Handoff, settings or an alert) takes the word as it is: a change made while it was
  // away is not a switch to point at.
  if (entering && !judging) {
    flashWord = what
    flashAt = null
  }
  if (!judging) {
    // Auto switched off or on is not a new verdict: the switch says it, so the word changes without the flash.
    if (flashWord !== null && flashWord !== what) flashAt = what === 'Off' || flashWord === 'Off' ? null : now
    flashWord = what
  }
  const since = flashAt === null ? null : now - flashAt
  if (since === 0) {
    // One redraw at each step of the fade and one at its end, not a tick: see FLASH_STEPS.
    for (const at of [...FLASH_STEPS.map(([t]) => t), FLASH_MS]) $.clock.after(at + 20, () => $.ui.invalidate('ui.render'))
  }
  return flashColor(since)
}


// Uninstall's first press arms it; a second within UNINSTALL_ARM_MS uninstalls. Then the plugins reload and the mod is
// gone from this chat; its settings stay in settings.json, so a reinstall picks them up.
const UNINSTALL_ARM_MS = 4000
let uninstallArmedAt = 0
let uninstalling = false
const UNINSTALL_RED = '#ff6b6b'
/** A bin: the lid and its handle, the can with two ribs. */
function binSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><g fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 3.8H11.8M5.4 3.8V2.4H8.6V3.8M3.4 3.8L4 12H10L10.6 3.8M5.9 6V9.8M8.1 6V9.8"/></g></svg>`
}
const GITHUB_MARK = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'
const GITHUB_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#ffffff" d="${GITHUB_MARK}"/></svg>`
const REPO_URL = 'https://github.com/HeyCubit/effortless'
// GitHub's own dark ground, and the width of the panel that carries the star link on the Updated card.
const GITHUB_BLACK = '#000000'
const STAR_PANEL = 32
function uninstallButton($: EngineInterface, els: ReturnType<EngineInterface['ui']['resolve']>) {
  const { Box, Text, Button, Svg } = els
  const armed = Date.now() - uninstallArmedAt < UNINSTALL_ARM_MS
  const press = async () => {
    if (uninstalling) return
    if (!armed) {
      uninstallArmedAt = Date.now()
      $.ui.invalidate('ui.render')
      $.clock.after(UNINSTALL_ARM_MS + 50, () => $.ui.invalidate('ui.render'))
      return
    }
    uninstalling = true
    $.ui.invalidate('ui.render')
    const r = await runClaude($, ['plugin', 'uninstall', pluginId($)], { timeoutMs: 120_000 }).catch(error => ({ exitCode: 1, stdout: '', stderr: String(error) }))
    uninstalling = false
    if (r.exitCode !== 0) {
      const why = (r.stderr || r.stdout).trim().split('\n').pop() ?? ''
      $.ui.toast(`pilot: uninstall failed: ${noClaudeHint(why, await homeDir($)) ?? why}`)
      $.ui.invalidate('ui.render')
      return
    }
    $.ui.toast('effortless is uninstalled. Thanks for trying it.')
    const reloaded = await $.command.run({ command: 'reload-plugins', args: RELOAD_ARGS } as never).then(() => true, () => false)
    if (!reloaded) await typeCommand($, `/reload-plugins ${RELOAD_ARGS}`)
  }
  const label = uninstalling ? 'Uninstalling…' : armed ? 'Press again to uninstall' : 'Uninstall'
  if (!Svg) return <Button key="settings-uninstall" plain dimColor={!armed} label={label} onPress={press} />
  // A bin and the word, grey; red under the pointer, and red while armed (the red bin is laid over the grey one, since
  // a hover can only reveal). A blank button over both takes the press.
  const red = armed || uninstalling
  return (
    <Box key="settings-uninstall-box" position="relative" flexDirection="row" alignItems="center" flexShrink={0}>
      <Box position="relative" width={2} height={1} alignItems="center">
        <Box position="absolute" top={0} left={0}>
          <Svg source={binSvg(DASH_DIM)} alt="bin" width={14} height={14} />
        </Box>
        <Box position="absolute" top={0} left={0} display={red ? 'flex' : 'none'} hover={red ? undefined : { scope: 'uninstall', display: 'flex' }}>
          <Svg source={binSvg(UNINSTALL_RED)} alt="bin" width={14} height={14} />
        </Box>
      </Box>
      <Text color={red ? UNINSTALL_RED : DASH_DIM} hover={{ scope: 'uninstall', color: UNINSTALL_RED }}>{label}</Text>
      <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
        <Button key="settings-uninstall" plain hover={{ scope: 'uninstall', backgroundColor: '#00000000' }} label={' '.repeat(label.length + 3)} onPress={press} />
      </Box>
    </Box>
  )
}

/** The handoff or compact card: words, the moving art while it runs, green with a check once it has landed. `above` is
 * what sits over it (the reply it hangs under), or nothing for the band above the prompt. */
function handoffCardTree($: EngineInterface, e: RenderInput<'AssistantMessage'> | RenderInput<'AbovePrompt'>, fresh: HandoffCard, above: unknown, onDismiss?: () => unknown) {
  const { Box, Text, Svg, Button } = themedEls($.ui.resolve(e))
  const by = fresh.full ? 'Full' : 'Quick'
  const words = {
    writing: ['✦ Handing off…', `${by} handoff being written. ${fresh.full ? 'Your skill takes a little while.' : 'A few seconds.'}`],
    done: ['✦ Handoff complete', 'Carried on from the last chat. The old one is cleared.'],
    copied: ['✦ Handoff copied', 'Paste it into a new chat. This one stays.'],
    compacting: ['✦ Compacting…', 'The chat is being summed up. Takes a minute or so.'],
    compacted: ['✦ Compact complete', 'The chat is summed up; the next message reads far less.'],
  }[fresh.kind]
  // Compacting is a wait in the background, not a result: one quiet line over the band's calm art, not the loud glow.
  const quiet = fresh.kind === 'compacting'
  const landed = cardLanded(fresh.kind)
  // One plain row: title, what happened, ✕. The absolute art drew as a tall block in VS Code.
  const card = (
    <Box key="reply-handoff" flexDirection="row" alignItems="center" columnGap={1} paddingX={1}
      backgroundColor={landed ? DONE_BG : BRAND_BG} borderStyle="round" borderColor={landed ? DONE_EDGE : BRAND_EDGE}>
      <Text bold color={landed ? DONE_ACCENT : ACCENT}>{words[0]}</Text>
      <Text dimColor={quiet} wrap="truncate">{words[1]}</Text>
      <Box flexGrow={1} />
      {onDismiss ? <Button key="card-close" plain dimColor role="dismiss" onPress={onDismiss}>{' ✕ '}</Button> : null}
    </Box>
  )
  if (above === undefined) return card
  return (
    <Box key="reply" flexDirection="column" gap={1}>
      {above as never}
      {card}
    </Box>
  )
}

/** Where the mod learns of a new version: the newest entry of public.json on main, written only by tools/publish.sh.
 * Releases between publishes (releases.json) reach the dev channel, never this card. */
// The API, not raw.githubusercontent.com: the raw file sits behind a cache that lagged two releases behind.
const WHATS_NEW_URL = 'https://heycubit.github.io/effortless/whats-new/'
/** The site, the link Share copies for a friend. */
const SITE_URL = 'https://heycubit.github.io/effortless/'
/** Where a bug is reported: a page on the site that opens a prefilled GitHub issue. */
const REPORT_BUG_URL = 'https://heycubit.github.io/effortless/report/'
/** This install's version, read from its plugin.json at session start: the report page fills it in. */
let ownVersion = ''
/** How often a session looks for a new version, and how long ✕ on the offer keeps it away. */
const UPDATE_CHECK_MS = 6 * 3600_000
const UPDATE_SNOOZE_MS = 24 * 3600_000
/** How long "Updated" stays above the prompt when nothing else clears it. */
const UPDATED_CARD_MS = 30_000
type UpdateCard = { stage: 'offer' | 'updating' | 'done' | 'failed'; version: string; note: string; at: number; detail?: string }

/** Whether version `a` is newer than `b`, both `major.minor.patch`. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}
/** The newest release in releases.json's text (newest first), or nothing when it does not parse. */
export function latestRelease(text: string): { version: string; note: string } | undefined {
  try {
    const list = JSON.parse(text) as { version?: unknown; note?: unknown }[]
    const top = Array.isArray(list) ? list[0] : undefined
    if (!top || typeof top.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(top.version)) return undefined
    return { version: top.version, note: typeof top.note === 'string' ? top.note : '' }
  } catch {
    return undefined
  }
}
/** Whether ✕ still keeps `version` away at `now`: the same version, put away less than UPDATE_SNOOZE_MS ago. */
export function updateSnoozed(hidden: { version: string; at: number } | null, version: string, now: number): boolean {
  return !!hidden && hidden.version === version && now - hidden.at < UPDATE_SNOOZE_MS
}
async function installedVersion($: EngineInterface): Promise<string | undefined> {
  const text = await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`).catch(() => '')
  try {
    const v = (JSON.parse(typeof text === 'string' ? text : '') as { version?: unknown }).version
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}
/** Looks for a newer version and offers it, unless ✕ put that version away less than UPDATE_SNOOZE_MS ago. */
// What the last check found, for /effortless update to say (installed, git, web, marketplace).
let lastUpdateCheck = 'not checked yet'
/** public.json as it is on stable, read with git: a depth-1 fetch without file contents into a small repo of its own, then
 * the one file. Git has no cache in the way, unlike the host's web fetch, and works on the dev channel too. */
/** The newest public pilot: the version in plugin.json on main of the public repo, over the web; where that fails,
 * the marketplace's own copy after `claude plugin marketplace update pilot`. (Was HeyCubit/effortless's public.json,
 * which stays at 1.71 and so never offered pilot anything.) */
const PILOT_PLUGIN_URL = 'https://api.github.com/repos/P1tak4s/pilot/contents/.claude-plugin/plugin.json?ref=main'
export function pluginVersion(text: string): { version: string; note: string } | undefined {
  try {
    const v = (JSON.parse(text) as { version?: unknown }).version
    return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v) ? { version: v, note: '' } : undefined
  } catch {
    return undefined
  }
}
async function latestAvailable($: EngineInterface): Promise<{ latest?: { version: string; note: string }; how: string }> {
  const res = await $.http.fetch(`${PILOT_PLUGIN_URL}&t=${Date.now()}`, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'pilot' } }).catch((error: unknown) => ({ ok: false, status: 0, text: String(error) }))
  const fromWeb = res.ok ? pluginVersion(res.text) : undefined
  if (fromWeb) return { latest: fromWeb, how: `web ${fromWeb.version}` }
  const market = pluginId($).split('@')[1] || 'pilot'
  await runClaude($, ['plugin', 'marketplace', 'update', market], { timeoutMs: 120_000, env: GITHUB_OVER_HTTPS }).catch(() => null)
  const text = await $.fs.read(`${$.plugin.root.replace(/[\\/]cache[\\/].*$/, '')}/marketplaces/${market}/.claude-plugin/plugin.json`).catch(() => '')
  const local = pluginVersion(typeof text === 'string' ? text : '')
  return { latest: local, how: `web refused (${res.status || res.text.slice(0, 80)}); marketplace ${local?.version ?? 'unreadable'}` }
}
/** The session's timers. A reload starts the module over, maybe with no session start (the countdown froze on "Cold"),
 * so the band's first draw starts them too. A session start always starts them: a timer started inside a request may
 * end with it. */
let timersFrom: 'start' | 'draw' | null = null
function startTimers($: EngineInterface, from: 'start' | 'draw') {
  if (timersFrom === 'start' || (timersFrom === 'draw' && from === 'draw')) return
  timersFrom = from
  $.clock.every(UPDATE_CHECK_MS, () => void checkUpdate($).catch(() => undefined))
  // The cache countdown's clock. A timer started inside a request ends with that request, so it lives here.
  $.clock.every(CACHE_TICK_MS, () => void showCache($).catch(() => undefined))
  $.clock.every(CACHE_TICK_MS, () => void checkSwamp($).catch(() => undefined))
  // Read the usage at once too, so the context ring is there from the start rather than a tick later.
  void checkSwamp($).then(() => $.ui.invalidate('ui.render')).catch(() => undefined)
  // A written handoff is cleared and resent from here: a hook the turn waits on may not run commands.
  handoffTimer?.cancel()
  handoffTimer = $.clock.every(HANDOFF_POLL_MS, () => {
    void agentWaits($).catch(() => undefined)
    if (redrawsOwed > 0) {
      // Drawn since the ask: the band is up to date, so a redraw would only restart its animations.
      if (lastRenderAt > redrawAskedAt + REDRAW_SETTLE_MS) redrawsOwed = 0
      else {
        redrawsOwed--
        $.ui.invalidate('ui.render')
      }
    }
    // Right after a start the app may not have the usage yet: ask each second until it has, so the ring shows.
    if (!lastContext || !lastContext.window) void checkSwamp($).then(() => lastContext?.window && $.ui.invalidate('ui.render')).catch(() => undefined)
    // The dashboard's countdown ticks inside its own image; the band is redrawn once a minute to start the next one.
    if (cacheExpires > 0 && !config.hide.includes('timer'))
      void $.clock.now().then(now => {
        const minute = Math.floor((cacheExpires - now) / 60_000)
        if (now < cacheExpires + HANDOFF_POLL_MS && minute !== clockMinute) {
          clockMinute = minute
          $.ui.invalidate('ui.render')
        }
      })
    void writeRenderLog($).catch(() => undefined)
    void finishHandoff($).catch(() => undefined)
  })
}

// /reload-plugins loads the module again without a session start, so the band's first draw runs afterLoad too.
let loadChecked = false
/** Once per load: "Updated" when this load is the version the card installed, then a look for a newer one. */
async function afterLoad($: EngineInterface) {
  if (loadChecked) return
  loadChecked = true
  // A reload has no session start, so this load reads its own version here too.
  ownVersion = (await installedVersion($)) ?? ownVersion
  startTimers($, 'draw')
  const updatedTo = (await $.store.get('updatedTo').catch(() => null)) as { version: string; note: string; at: number } | null
  // A "Loading it…" left by the copy before this load is over either way.
  await update($, updateCard, c => (c && c.detail === UPDATE_LOADING ? { ...c, detail: 'Installed. Open a new chat to load it.' } : c))
  if (updatedTo) {
    await $.store.set('updatedTo', null)
    // The reload brought back older code (the chat's folder was not refreshed): the old code's timer died with the
    // reload, so the card would say "Loading it…" for good. Say what to do instead.
    const loaded = (await installedVersion($)) === updatedTo.version
    await update($, updateCard, () => ({ stage: 'done', version: updatedTo.version, note: updatedTo.note, at: Date.now(), ...(loaded ? {} : { detail: 'Installed. Open a new chat to load it.' }) }))
  }
  await checkUpdate($)
}
async function checkUpdate($: EngineInterface) {
  const shown = await read($, updateCard)
  if (shown && shown.stage !== 'offer') {
    lastUpdateCheck = `skipped while the ${shown.stage} card shows`
    return
  }
  const { latest, how } = await latestAvailable($)
  const mine = await installedVersion($)
  lastUpdateCheck = `installed ${mine ?? 'unreadable'}; ${how}`
  if (!latest || !mine || !isNewer(latest.version, mine)) {
    if (shown) await update($, updateCard, () => null)
    // A version found earlier is stale once this one is as new (installed some other way): the button looks again.
    await update($, updateCheck, cur => (cur.startsWith('found ') ? 'idle' : cur))
    return
  }
  const now = await $.clock.now()
  const hidden = (await $.store.get('updateHidden').catch(() => null)) as { version: string; at: number } | null
  if (updateSnoozed(hidden, latest.version, now)) return
  if (shown?.version !== latest.version) await update($, updateCard, () => ({ stage: 'offer', version: latest.version, note: latest.note, at: now }))
}
// The Settings header's "Check for updates": idle, checking, up to date, or the version found (then the button installs it).
const updateCheck = atom({ plugin: 'pilot', key: 'updateCheck' } as const, 'idle')
/** Looks now, ignoring a Later pressed earlier (asking is a decision to look), and says what it found in the button. */
async function checkUpdateNow($: EngineInterface) {
  await update($, updateCheck, () => 'checking')
  await $.store.set('updateHidden', null).catch(() => undefined)
  // An Updated or failed card left from earlier made checkUpdate skip the look and the button said Up to date.
  await update($, updateCard, c => (c && (c.stage === 'done' || c.stage === 'failed') ? null : c))
  await checkUpdate($).catch((error: unknown) => { lastUpdateCheck = `check failed: ${String(error).slice(0, 120)}` })
  const card = await read($, updateCard)
  await update($, updateCheck, () => (card && card.stage === 'offer' ? `found ${card.version}` : 'newest'))
  // "Up to date" goes back to the button after a few seconds; a found version stays until it is installed or put away.
  if (!(card && card.stage === 'offer')) $.clock.after(5000, () => void update($, updateCheck, cur => (cur === 'newest' ? 'idle' : cur)))
}
// The repo is public, so HTTPS needs no key (only this repo's address is rewritten). Without it, git reaches GitHub
// over SSH and fails for anyone with no SSH key there ("make sure you have the correct access rights").
const GITHUB_OVER_HTTPS = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'url.https://github.com/P1tak4s/.insteadOf', GIT_CONFIG_VALUE_0: 'git@github.com:P1tak4s/' }
/** The line of a failed `claude plugin` run that says what went wrong: git's own `fatal:`/`error:` line, else the
 * CLI's ✘ line, else the last line. The last line alone was often the tail of a wrapped sentence. */
export function updateFailure(output: string): string {
  const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const line = lines.find(l => /^(fatal|error):/i.test(l)) ?? lines.find(l => l.startsWith('✘')) ?? lines.at(-1) ?? ''
  const why = line.replace(/^(fatal|error):\s*/i, '').replace(/^✘\s*/, '')
  return why.length > 160 ? `${why.slice(0, 159)}…` : why
}
/**
 * Where `claude` may be: on PATH, then where the official installers put it. The desktop app starts with the PATH it
 * had at login, so a CLI installed since is not on it until the next sign-in.
 */
export function claudeCandidates(home: string | undefined): string[] {
  if (!home) return ['claude']
  const win = /^[A-Za-z]:/.test(home)
  const sep = home.includes('\\') ? '\\' : '/'
  return ['claude', [home.replace(/[\\/]+$/, ''), '.local', 'bin', win ? 'claude.exe' : 'claude'].join(sep)]
}
// What the engine says when a command cannot be started at all, as opposed to one that ran and failed.
const NOT_STARTED = /ENOENT|not found or is in an unsafe location|failed to start/i
/** For a `claude` that would not start: what to install, in the person's own shell; undefined for any other error. */
export function noClaudeHint(error: string, home: string | undefined): string | undefined {
  if (!NOT_STARTED.test(error)) return undefined
  const install = home && /^[A-Za-z]:/.test(home) ? 'irm https://claude.ai/install.ps1 | iex' : 'curl -fsSL https://claude.ai/install.sh | bash'
  return `This needs the Claude Code CLI. Install it with ${install}, then reopen the app.`
}
const homeDir = async ($: EngineInterface) => ((await envUserProfile($)) ?? (await envHome($))) || undefined
/** `claude <args>`, from the next place it may be when one will not start. */
async function runClaude($: EngineInterface, args: string[], opts: Parameters<EngineInterface['process']['run']>[1]) {
  let last: unknown
  for (const bin of claudeCandidates(await homeDir($))) {
    try {
      return await $.process.run([bin, ...args], opts)
    } catch (error) {
      last = error
      if (!NOT_STARTED.test(String(error))) throw error
    }
  }
  throw last
}
/** Update pressed: the marketplace and the plugin are updated as `claude plugin` does, then the plugins reloaded so
 * the new version runs in this chat. The new module shows "Updated" (see session.start). */
async function runUpdate($: EngineInterface, card: UpdateCard) {
  await update($, updateCard, () => ({ ...card, stage: 'updating' }))
  const step = async (args: string[]) => {
    const r = await runClaude($, args, { timeoutMs: 180_000, env: GITHUB_OVER_HTTPS })
    if (r.exitCode !== 0) throw new Error(updateFailure(r.stderr || r.stdout) || `claude ${args.join(' ')} failed`)
  }
  try {
    // This install's own marketplace: effortless for users, effortless-dev on the dev channel.
    await step(['plugin', 'marketplace', 'update', pluginId($).split('@')[1]])
    await step(['plugin', 'update', pluginId($)])
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error)
    // No CLI anywhere (a desktop-only install): say what to install, not the engine's ENOENT.
    const home = await homeDir($)
    await update($, updateCard, () => ({ ...card, stage: 'failed', detail: noClaudeHint(message, home) ?? message }))
    return
  }
  // The desktop app keeps this chat on the folder it started with, and a reload reads that folder again: so the new
  // version's files go into it, or the reload would bring back the old code.
  await syncRunningCopy($).catch(() => undefined)
  const now = await $.clock.now()
  await $.store.set('updatedTo', { version: card.version, note: card.note, at: now })
  // Installed, not yet running: only the new code, once loaded, says "Loaded in this chat" (afterLoad).
  await update($, updateCard, () => ({ ...card, stage: 'done', at: now, detail: UPDATE_LOADING }))
  // The reload loads the new version here; where the app takes no command from a plugin, it is typed for Enter.
  const reloaded = await $.command.run({ command: 'reload-plugins', args: RELOAD_ARGS } as never).then(() => true, () => false)
  if (!reloaded && (await typeCommand($, `/reload-plugins ${RELOAD_ARGS}`)))
    await update($, updateCard, c => (c ? { ...c, detail: 'Press Enter to load it' } : c))
  // Still this code's words after a while: the reload did not load the new version, so a new chat has to.
  $.clock.after(UPDATE_LOAD_WAIT_MS, () => void update($, updateCard, c => (c && c.at === now && c.detail === UPDATE_LOADING ? { ...c, detail: 'Installed. Open a new chat to load it.' } : c)))
}
/** The command that puts the installed version's files over the running copy, or nothing when they are the same folder or
 * either is not a plugin cache folder (a working copy is never written over). */
export function syncPlan(running: string, installed: string | undefined): string[] | undefined {
  const norm = (x: string) => x.replace(/[\\/]+$/, '').replaceAll('\\', '/')
  const cached = (x: string) => /\/cache\//.test(norm(x))
  if (!installed || norm(installed) === norm(running) || !cached(installed) || !cached(running)) return undefined
  return /^[A-Za-z]:|\\/.test(running)
    ? ['robocopy', installed, running, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP']
    : ['cp', '-R', `${installed}/.`, running]
}
/** Copies the files of the version just installed into the folder this chat runs from, when the two differ. A failed
 * copy leaves the reload as it was. */
async function syncRunningCopy($: EngineInterface) {
  const home = $.plugin.root.replace(/[\\/]cache[\\/].*$/, '')
  const record = JSON.parse(String(await $.fs.read(`${home}/installed_plugins.json`))) as { plugins?: Record<string, { installPath?: unknown }[]> }
  const installed = record.plugins?.[pluginId($)]?.map(x => x.installPath).filter((x): x is string => typeof x === 'string').at(-1)
  const argv = syncPlan($.plugin.root, installed)
  if (!argv) return
  const r = await $.process.run(argv, { timeoutMs: 120_000 })
  // robocopy answers below 8 when it copied (1 = files copied).
  if (argv[0] === 'robocopy' ? r.exitCode >= 8 : r.exitCode !== 0) throw new Error(`copy failed (${r.exitCode})`)
}
// The reload is queued until Claude is idle: pressed mid-reply, it waits for the reply to finish.
const UPDATE_LOADING = 'Installed. Loads as soon as Claude is idle.'
/** A plain /reload-plugins holds back a change that would make the next message re-read the chat without the cache
 * (new commands do), says "installed but not applied" and keeps the old code running. Update was pressed: apply it. */
export const RELOAD_ARGS = '--force'
const UPDATE_LOAD_WAIT_MS = 15_000
/** The update card above the prompt: the offer, the moving art while it updates, green once done. */
function updateCardTree($: EngineInterface, e: RenderInput<'AbovePrompt'>, card: UpdateCard) {
  const { Box, Text, Svg, Button, Link } = themedEls($.ui.resolve(e))
  const landed = card.stage === 'done'
  const words = {
    offer: [`✦ effortless ${card.version} is out`, card.note || 'A new version is ready.'],
    updating: ['✦ Updating…', `Getting ${card.version}. Takes a few seconds.`],
    done: [`✦ Updated to ${card.version}`, card.detail ?? 'Loaded in this chat.'],
    failed: ['✦ Update failed', card.detail ?? 'Try again, or run claude plugin update effortless@effortless.'],
  }[card.stage]
  const share = async () => {
    const r = await $.ui.copy({ text: SITE_URL, surface: e.surface }).catch(() => ({ isCopied: false as const }))
    $.ui.toast(r.isCopied ? 'Link copied. Send it to a friend.' : 'pilot: could not copy the link')
  }
  const hide = async () => {
    if (card.stage === 'offer') await $.store.set('updateHidden', { version: card.version, at: await $.clock.now() })
    await update($, updateCard, () => null)
  }
  const divider = (key: string) => (
    <Box key={key} flexShrink={0} marginX={1}>
      <Svg source={DIVIDER_SVG} alt="divider" width={1} height={18} />
    </Box>
  )
  // Each control in a box of its own: under one shared box, hovering one lit the other too.
  const own = (key: string, el: unknown) => (
    <Box key={key} position="relative" flexShrink={0}>
      <Box position="absolute" top={0} left={0} />
      {el as never}
    </Box>
  )
  const installLine = card.stage === 'failed' ? card.detail?.match(/(irm \S+ \| iex|curl -fsSL \S+ \| bash)/)?.[1] : undefined
  // The offer is Update or Later (Later puts this version away for a day); "Updated" has the link and a ✕; a failed
  // update has Try again and ✕. Nothing while it runs.
  const controls =
    card.stage === 'offer'
      ? [
          own('update-go-box', <Button key="update-go" variant="primary" label="Update" onPress={() => runUpdate($, card)} />),
          own('update-later-box', <Button key="update-later" variant="secondary" label="Later" onPress={hide} />),
        ]
      : card.stage === 'failed'
        ? [
            // No CLI: the install line can be cut off on a narrow card, so it is a press away whole.
            ...(installLine
              ? [own('update-copy-box', <Button key="update-copy" variant="secondary" label="Copy install command" onPress={async () => {
                  const r = await $.ui.copy({ text: installLine, surface: e.surface }).catch(() => ({ isCopied: false as const }))
                  $.ui.toast(r.isCopied ? 'Install command copied. Paste it in PowerShell or Terminal, then reopen the app.' : `pilot: run ${installLine}`)
                }} />)]
              : []),
            own('update-go-box', <Button key="update-go" variant="primary" label="Try again" onPress={() => runUpdate($, card)} />),
            own('update-close-box', <Button key="update-close" plain label="✕" hover={{ backgroundColor: CARD_CLOSE_HOVER }} onPress={hide} />),
          ]
        : landed
          ? [
              // White and bold: the app's blue link was hard to see on the green and the check.
              own('update-link-box', <Text color="#ffffff" bold><Link href={WHATS_NEW_URL} label="What's new →" /></Text>),
              divider('update-div-1'),
              own('update-share-box', (
                // The icon and the word, with a blank button laid over both: its hover veil covers the icon too.
                <Box key="update-share" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1} flexShrink={0}>
                  <Svg source={SHARE_MARK_SVG} alt="Share" width={14} height={14} />
                  <Text>Share</Text>
                  <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                    <Button key="update-share-go" plain hover={{ backgroundColor: UPDATED_HOVER }} label={' '.repeat(23)} onPress={share} />
                  </Box>
                </Box>
              )),
              divider('update-div-2'),
              own('update-star-box', (
                <Box key="update-star" flexDirection="row" alignItems="center" gap={1}>
                  <Svg source={GITHUB_MARK_SVG} alt="GitHub" width={14} height={14} />
                  <Link href={REPO_URL} label="Star on GitHub" />
                </Box>
              )),
              own('update-close-box', <Button key="update-close" plain label="✕" hover={{ backgroundColor: UPDATED_HOVER }} onPress={hide} />),
            ]
          : []
  return (
    <Box key="update-card" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
      backgroundColor={landed ? UPDATED_BG : BRAND_BG} borderStyle="round" borderColor={landed ? UPDATED_EDGE : BRAND_EDGE}>
      {landed ? (
        <Box key="update-glow" position="absolute" top={-1} left={0} bottom={-1}>
          <Svg source={UPDATED_GLOW_SVG} alt="effortless" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        </Box>
      ) : (
        <Box key="update-art" position="absolute" top={-1} right={0} bottom={-1}>
          <Svg source={card.stage === 'updating' ? HANDOFF_SVG : BRAND_SVG} alt={card.stage === 'updating' ? 'updating' : 'effortless'} width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
        </Box>
      )}
      <Box key="update-words" position="relative" flexDirection="column" flexShrink={1} minWidth={0}>
        {markTitle({ Box, Text, Svg }, 'update-title', landed ? DONE_ACCENT : ACCENT, words[0], landed ? DONE_MARK_SVG : MARK_SVG)}
        <Text wrap="truncate">{words[1]}</Text>
      </Box>
      <Box key="update-controls" position="relative" flexGrow={1} flexDirection="row" justifyContent="flex-end" alignItems="center" gap={1}>
        {/* Positioned by an empty absolute child, so it paints over the art and takes the clicks. */}
        <Box position="absolute" top={0} left={0} />
        {controls}
      </Box>
    </Box>
  )
}

/** How long "Compact complete" stays above the prompt when nothing else clears it. */
const COMPACT_CARD_MS = 20_000
/** A settings part's body on desktop is as tall as the overview's row of cards, so the panel keeps its height going in
 * and out of a part. In lines (a Box height is a number of lines or a percentage) at the app's 19 px line: 56 px makes
 * the band 121.5 px tall in every part, as with the cards, measured on tools/render-band. */
const SETTINGS_BODY_H = 56 / 19
/** The card ✕'s hover: the app's ghost fill is lost on the green and violet cards, so a darker wash of the card itself. */
const CARD_CLOSE_HOVER = '#00000040'
/** A handoff's or compact's card for the band above the prompt: while it runs, and once landed until the next message
 * is sent, the ✕ is pressed or its time has passed (COMPACT_CARD_MS, HANDOFF_CARD_MS). */
async function compactCard($: EngineInterface, working = false) {
  const card = await read($, handoffCard)
  if (!card || cardRunning(card.kind)) return card
  const keep = card.kind === 'compacted' ? COMPACT_CARD_MS : HANDOFF_CARD_MS
  if (working || (card.kind === 'compacted' && card.seen) || (await $.clock.now()) - card.at >= keep) return null
  return card
}

/** The glow behind the white Handoff button. Check a change on tools/render-band before shipping: an earlier glow looked
 * tight in a preview but far bigger and blurrier in the app. */
const HANDOFF_GLOW = true
/** Context share from which the dashboard's Handoff button turns white: below it a handoff saves little. */
const HANDOFF_LOUD_AT = 30
// Handoff is calm until Haiku says a fresh chat would suit now (handoffAdvice); then it is the white box with a glow.
// What the band last read from handoffAdvice, so the drawing helpers need no await.
let adviceNow: string | null = null
const HANDOFF_ADVICE_LEVEL = 50
// "Always" (the Handoff button setting) keeps the slot as Handoff, calm in a grey box, and loud only once advised.
const handoffLevel = () => (adviceNow ? HANDOFF_ADVICE_LEVEL : config.handoffButton === 'always' ? HANDOFF_BOX_AT : 0)
const handoffLoud = () => adviceNow !== null
const handoffSlot = () => handoffLoud() || config.handoffButton === 'always'
/** Handoff's box: it fades in, grey, up to HANDOFF_BOX_AT, then lightens to white by HANDOFF_LOUD_AT, where the glow
 * takes over (it grows to 80%). A glow only ever sits around the white box. */
const HANDOFF_BOX_AT = 15
const HANDOFF_PILL_W = 66
const HANDOFF_PILL_H = 19
/** Handoff's look at `percent` of context, a step each percent: no box at 0, the grey box by HANDOFF_BOX_AT, white by
 * HANDOFF_LOUD_AT. The label goes from dim to white, and dark once the box is light enough to need it. */
export function handoffLook(percent: number, hovered = false): { fill: string; opacity: number; edge: string; label: string } {
  // Hovered, the box is there even on a fresh chat and a few steps lighter.
  const p = Math.max(hovered ? HANDOFF_BOX_AT : 0, Math.min(HANDOFF_LOUD_AT, Math.round(percent) + (hovered ? 5 : 0)))
  const mix = (a: string, b: string, k: number) => {
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
    return `#${[0, 1, 2].map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k).toString(16).padStart(2, '0')).join('')}`
  }
  if (p <= HANDOFF_BOX_AT) {
    const k = p / HANDOFF_BOX_AT
    return { fill: HOVER_BOX, opacity: k, edge: mix(DASH_BG, '#3a3a40', k), label: mix(DASH_DIM, '#ececf0', k) }
  }
  const k = (p - HANDOFF_BOX_AT) / (HANDOFF_LOUD_AT - HANDOFF_BOX_AT)
  return { fill: mix(HOVER_BOX, '#ececf0', k), opacity: 1, edge: mix('#3a3a40', '#ffffff', k), label: k > 0.45 ? '#141416' : '#ececf0' }
}
/** Handoff's box as drawn (see handoffLook). */
export function handoffPillSvg(percent: number, hovered = false): string {
  const l = handoffLook(percent, hovered)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HANDOFF_PILL_W}" height="${HANDOFF_PILL_H}" viewBox="0 0 ${HANDOFF_PILL_W} ${HANDOFF_PILL_H}"><rect x=".5" y=".5" width="${HANDOFF_PILL_W - 1}" height="${HANDOFF_PILL_H - 1}" rx="6" fill="${l.fill}" fill-opacity="${l.opacity.toFixed(3)}" stroke="${l.edge}" stroke-opacity="${l.opacity.toFixed(3)}"/></svg>`
}
/** How hard the glow behind Handoff pulls: 0 below HANDOFF_LOUD_AT, then 1 to 5, one step per 10% of context. */
export function handoffGlowStep(percent: number): number {
  return percent < HANDOFF_LOUD_AT ? 0 : Math.min(5, 1 + Math.floor((percent - HANDOFF_LOUD_AT) / 10))
}
/** The glow behind the Handoff button, one design per step, drawn on a screenshot of the real bar: a tight violet rim
 * just past the button (about 121 by 32 px there), wider, softer and brighter each step, pulsing between a low and a
 * peak. Centred on the button by the layer the dashboard puts it in. */
const GLOW_LEVELS: ReadonlyArray<{ spread: number; blur: number; peak: number; low: number; period: number }> = [
  { spread: 0, blur: 0, peak: 0, low: 0, period: 0 },
  { spread: 1.5, blur: 1.2, peak: 0.55, low: 0.2, period: 3.4 },
  { spread: 2, blur: 1.5, peak: 0.65, low: 0.25, period: 2.8 },
  { spread: 2.5, blur: 1.8, peak: 0.75, low: 0.3, period: 2.3 },
  { spread: 3, blur: 2.1, peak: 0.85, low: 0.35, period: 1.9 },
  { spread: 3.5, blur: 2.4, peak: 0.95, low: 0.4, period: 1.5 },
]
/** The glow's drawing in CSS px, measured on a faithful render of the desktop band (tools/render-band): the primary
 * Handoff button is 77 by 20 with a 6 px radius, and the band leaves 8 px above and below it. The drawing is no wider
 * than the layer it sits in, so the app never scales it (a Svg is at most as wide as its box). */
const GLOW_W = HANDOFF_PILL_W + 16
const GLOW_H = HANDOFF_PILL_H + 16
const GLOW_BUTTON = { w: HANDOFF_PILL_W, h: HANDOFF_PILL_H, r: 6 }
export function handoffGlowSvg(step: number, nowMs = 0): string {
  const { spread: e, blur, peak, low, period } = GLOW_LEVELS[step]
  // The pulse's place from the clock, so a redraw does not restart it from the low point.
  const lock = (svg: string) => inPhase(svg, nowMs % (period * 1000))
  const x = (GLOW_W - GLOW_BUTTON.w) / 2 - e
  const y = (GLOW_H - GLOW_BUTTON.h) / 2 - e
  return lock(`<svg xmlns="http://www.w3.org/2000/svg" width="${GLOW_W}" height="${GLOW_H}" viewBox="0 0 ${GLOW_W} ${GLOW_H}"><style>.g{animation:p ${period}s ease-in-out infinite}@keyframes p{0%,100%{opacity:${low}}50%{opacity:${peak}}}</style><defs><filter id="b" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs><g class="g" filter="url(#b)"><rect x="${x}" y="${y}" width="${GLOW_BUTTON.w + 2 * e}" height="${GLOW_BUTTON.h + 2 * e}" rx="${GLOW_BUTTON.r + e}" fill="${ACCENT}"/></g></svg>`)
}

/** How long the switch's knob takes to slide after a click. */
const AUTO_SLIDE_MS = 260
/** Auto as a switch: a pill with its knob right and violet when on, left and grey when off. `slide` draws the move from
 * the other side, for the redraw right after a click only (every redraw replays an image's animation). */
export function autoSwitchSvg(on: boolean, slideMs: number | null = null): string {
  const slide = slideMs !== null && slideMs < AUTO_SLIDE_MS
  const t = `${AUTO_SLIDE_MS / 1000}s cubic-bezier(.3,.7,.2,1)`
  const css = slide
    ? `<style>.k{animation:k ${t}}.p{animation:p ${t}}@keyframes k{from{transform:translateX(${on ? -11 : 11}px);fill:${on ? '#8b8b93' : '#ffffff'}}}@keyframes p{from{fill:${on ? '#2c2c31' : ACCENT};stroke:${on ? '#4a4a52' : ACCENT}}}</style>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="15" viewBox="0 0 26 15">${css}<rect class="p" x=".5" y=".5" width="25" height="14" rx="7" fill="${on ? ACCENT : '#2c2c31'}" stroke="${on ? ACCENT : '#4a4a52'}"/><circle class="k" data-keep="1" cx="${on ? 18.5 : 7.5}" cy="7.5" r="5" fill="${on ? '#ffffff' : '#8b8b93'}"/></svg>`
  return slide ? inPhase(svg, slideMs) : svg
}
/** The handoff bar's Quick | Full switch: a dark track with both words in it and a light knob under the picked one,
 * as tall as Go (20 px, 5 px radius, measured on tools/render-band) so the row's controls line up,
 * KIND_CELLS wide each half (the words are app Text laid over it; an image would draw them in another font). */
const KIND_CELLS = 9
/** One cell of the desktop band in CSS px (`1ch` of its font, measured on tools/render-band). */
const CELL_PX = 7.9
const KIND_W = Math.round(KIND_CELLS * 2 * CELL_PX)
const KIND_H = 20
/** The track and the knob under `kind`; `slideMs` slides the knob over from the other half, for the redraw right
 * after a click only (every redraw replays an image's animation). */
export function kindSwitchSvg(kind: 'quick' | 'full', slideMs: number | null = null): string {
  const half = KIND_W / 2
  const at = (k: 'quick' | 'full') => (k === 'full' ? half + 0.5 : 2)
  const slide = slideMs !== null && slideMs < KIND_SLIDE_DELAY_MS + KIND_SLIDE_MS
  // It starts a beat after the click: the click redraws the whole bar, its large art included, and a slide in those
  // same frames stuttered. SMIL, not CSS: it moves the knob's own x, held at the old side until it begins.
  const from = at(kind === 'full' ? 'quick' : 'full')
  const begin = slideMs === null ? 0 : KIND_SLIDE_DELAY_MS - slideMs
  const move = slide
    ? `<animate attributeName="x" from="${from}" to="${at(kind)}" begin="${(begin / 1000).toFixed(3)}s" dur="${KIND_SLIDE_MS / 1000}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".3 .7 .2 1"/>`
    : ''
  // The track is the app's Select (white at 5%, a 1 px inset edge of white at 10%, 6 px corners), so the row reads as
  // one set; the knob sits 2 px inside it.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${KIND_W}" height="${KIND_H}" viewBox="0 0 ${KIND_W} ${KIND_H}"><rect x=".5" y=".5" width="${KIND_W - 1}" height="${KIND_H - 1}" rx="5.5" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".1"/><rect x="${slide ? from : at(kind)}" y="2" width="${half - 2.5}" height="${KIND_H - 4}" rx="4" data-keep="1" fill="#ececf0">${move}</rect>${slide ? `<!--${kindFlipAt}-->` : ''}</svg>`
}
const KIND_SLIDE_MS = 300
const KIND_SLIDE_DELAY_MS = 70
// When the handoff bar's Quick | Full last changed, for the knob's slide. Stamped into the slide's image too: going
// back and forth drew the same image twice, and the app reused it without playing the slide again.
let kindFlipAt = 0
/** How long the bar's edges glow after Auto is switched on. */
const AUTO_GLOW_MS = 2600
const AUTO_GLOW_W = 760
const AUTO_GLOW_H = 37
/** The image starts inside the band's side borders but over its top and bottom ones (the layer's top and bottom are the
 * band's outer edge, its sides the inner), so the line is inset 0.75 px at the sides and 1.75 px at top and bottom: 1 px
 * inside the border all round.
 * The glow inside the bar's edges as Auto comes on: a violet light that rises along the rim, holds, and fades once. Drawn
 * for AUTO_GLOW_MS only (every redraw would replay it). Stretched across the band's width (preserveAspectRatio none: the
 * app scales a Svg to its box's width and keeps its height); drawn at about the band's real width so the sides stay
 * as thick as the top and bottom. Clipped to the bar's inside, so the light falls inward. */
/** The cold band's rim: the Auto glow's light in ice, breathing slowly for as long as the band shows, so a cold chat
 * looks alive rather than parked. Placed by the clock (inPhase), so a redraw picks up where the breath was. */
const COLD_GLOW_MS = 4200
/** This install's id: effortless@effortless for users, effortless@effortless-dev on the dev channel. Read off the
 * cache path (…/plugins/cache/<marketplace>/effortless/<version>). */
const pluginId = ($: EngineInterface) => `effortless@${$.plugin.root.match(/cache[\\/]([^\\/]+)[\\/]/)?.[1] ?? 'effortless'}`

/** The rim in the brand's violet while the judge decides: it lights up and stays at full while it thinks, then fades from
 * full once the verdict is in. Two images, each placed by the clock on every draw (inPhase): the app swaps the whole
 * band on every redraw and a new image starts its animation over, so nothing here may depend on an image surviving.
 * The rise ends at full and holds there (forwards); the fade starts at full. The fade waits for the rise to finish, so
 * a quick verdict never fades from half-way. */
export const JUDGE_RISE_MS = 500
export const JUDGE_FADE_MS = 450
const JUDGE_GLOW_MAX = 0.85
/** CSS's ease-in-out, cubic-bezier(.42,0,.58,1): the progress at time t (0 to 1), by bisection on the curve's x. */
export function easeInOut(t: number): number {
  const at = (a: number, b: number, u: number) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u
  let lo = 0, hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (at(0.42, 0.58, mid) < t) lo = mid
    else hi = mid
  }
  return at(0, 1, (lo + hi) / 2)
}
/** The rim's brightness `elapsedMs` into its rise or fade, read off the same curve the browser draws. */
export function judgeBrightnessAt(kind: 'rise' | 'fade', elapsedMs: number): number {
  const p = Math.min(1, Math.max(0, elapsedMs / (kind === 'rise' ? JUDGE_RISE_MS : JUDGE_FADE_MS)))
  return kind === 'rise' ? JUDGE_GLOW_MAX * easeInOut(p) : JUDGE_GLOW_MAX * (1 - easeInOut(p))
}
/** The rim as one short piece: from its brightness now to its brightness JUDGE_STEP_MS later, in a straight line, then held.
 * The app draws old copies of the band again at moments the mod does not see (measured on a screen recording: a copy
 * from 130 ms into a fade came back 570 ms in, and the fade started over from full). A long animation replayed from a
 * stale copy jumps far; a piece this short is wrong for at most one step, and the schedule draws the next one. The rim
 * at full is a still image with no animation, so a replay changes nothing. */
export const JUDGE_STEP_MS = 50
/** How far each piece runs: longer than the gap between the app's redraws (measured 100 to 120 ms, however often the mod
 * asks), so a piece never ends and stands still before the next one is drawn. A piece of 50 ms did, in visible steps. */
export const JUDGE_PIECE_MS = 150
export function judgeGlowSvg(kind: 'rise' | 'fade', elapsedMs = 0): string {
  const W = AUTO_GLOW_W, H = AUTO_GLOW_H
  const dur = kind === 'rise' ? JUDGE_RISE_MS : JUDGE_FADE_MS
  const from = judgeBrightnessAt(kind, elapsedMs)
  // Five points along the true curve, so the piece is where the curve is at every moment and the next one starts on it.
  const span = Math.max(1, Math.min(JUDGE_PIECE_MS, dur - elapsedMs))
  const points = [0, 0.25, 0.5, 0.75, 1].map(k => `${(k * 100).toFixed(0)}%{opacity:${judgeBrightnessAt(kind, elapsedMs + k * span).toFixed(3)}}`).join('')
  const still = kind === 'rise' && elapsedMs >= dur
  const css = still
    ? `.r{opacity:${JUDGE_GLOW_MAX}}`
    : `.r{opacity:${from.toFixed(3)};animation:r ${(span / 1000).toFixed(3)}s linear forwards}@keyframes r{${points}}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><style>${css}</style><defs><filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><g class="r"><rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="none" stroke="${ACCENT}" stroke-width="4" opacity=".16" filter="url(#b)"/><rect x=".75" y="1.75" width="${W - 1.5}" height="${H - 3.5}" rx="8.25" fill="none" stroke="#b9a7ff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg>`
}
/** What the glow is at `now`: nothing, rising or holding, or fading. `endedAt` is null while the judge decides. */
export function judgeGlowAt(startedAt: number, endedAt: number | null, now: number): string | null {
  if (now < startedAt) return null
  const fadeFrom = endedAt === null ? Infinity : Math.max(endedAt, startedAt + JUDGE_RISE_MS)
  if (now < fadeFrom) return judgeGlowSvg('rise', now - startedAt)
  if (now < fadeFrom + JUDGE_FADE_MS) return judgeGlowSvg('fade', now - fadeFrom)
  return null
}
/** Redraws the band every JUDGE_STEP_MS from `from` ms over `span` ms, so each piece of the rise or fade is drawn in turn. */
function drawGlowSteps($: EngineInterface, from: number, span: number) {
  for (let at = Math.max(0, from); at <= from + span + JUDGE_STEP_MS; at += JUDGE_STEP_MS) $.clock.after(at + 5, () => $.ui.invalidate('ui.render'))
}
// The glow's clock is read as late as the draw allows, and set ahead by how long the rest of a draw takes (measured,
// smoothed): a fade placed where it was when the draw began showed up that much behind, a little brighter at every
// redraw, which read as lag and as a second glow.
let glowReadAt: number | null = null
let drawLead = 20
// When the judge started, and when it gave its verdict (null while it decides).
let judgeStartedAt = 0
let judgeEndedAt: number | null = 0
/** The verdict is in: the rim starts fading now, together with the effort word's flash, not after the effort and model
 * are applied (that came a beat later and read as a second glow). Redraws when the fade swaps in and once it is over. */
async function endJudgeGlow($: EngineInterface, why: string) {
  if (judgeEndedAt !== null) return
  judgeEndedAt = await $.clock.now().catch(() => Date.now())
  const fadeAt = Math.max(judgeEndedAt, judgeStartedAt + JUDGE_RISE_MS) - judgeEndedAt
  renderLog.push(`${new Date().toISOString()} ${loadedSession} glow: ${why} ${judgeEndedAt - judgeStartedAt} ms after start, fade in ${fadeAt} ms`)
  drawGlowSteps($, fadeAt, JUDGE_FADE_MS)
  $.ui.invalidate('ui.render')
}

export function coldGlowSvg(): string {
  const W = AUTO_GLOW_W, H = AUTO_GLOW_H
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><style>.r{opacity:.15;animation:r ${COLD_GLOW_MS / 1000}s ease-in-out infinite}@keyframes r{0%,100%{opacity:.15}50%{opacity:.6}}</style><defs><filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><g class="r"><rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="none" stroke="${ICE}" stroke-width="4" opacity=".16" filter="url(#b)"/><rect x=".75" y="1.75" width="${W - 1.5}" height="${H - 3.5}" rx="8.25" fill="none" stroke="#cfeeff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg>`
}
export function autoGlowSvg(on: boolean): string {
  const W = AUTO_GLOW_W, H = AUTO_GLOW_H
  const rim = `x="0" y="0" width="${W}" height="${H}" rx="8"`
  const [wash, line, strength] = on ? [ACCENT, '#b9a7ff', 0.9] : ['#8b8b93', '#c8c8d0', 0.6]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><style>.r{opacity:0;animation:r ${AUTO_GLOW_MS / 1000}s ease-in-out}@keyframes r{0%{opacity:0}15%{opacity:${strength}}45%{opacity:${(strength * 0.85).toFixed(2)}}100%{opacity:0}}</style><defs><filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.5"/></filter><filter id="s" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation=".8"/></filter></defs><g class="r"><rect ${rim} fill="none" stroke="${wash}" stroke-width="4" opacity=".14" filter="url(#b)"/><rect x=".75" y="1.75" width="${W - 1.5}" height="${H - 3.5}" rx="8.25" fill="none" stroke="${line}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg>`
}
// When the bar last saw Auto off or on, when Auto came on (for the edge glow), and when it last changed (for the slide).
let autoSeen: boolean | undefined
let autoOnAt = -Infinity
let autoFlipAt = 0
let helpersSeen: string | undefined
let helpersFlipAt = 0

/** The dashboard: what effortless is doing, and Auto, Handoff and settings. The slot above the prompt at rest. */
async function dashboardBand($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const els = themedEls($.ui.resolve(e))
  const { Box, Text, Button } = els
  const v = await snap($)
  adviceNow = (await read($, handoffAdvice)) ?? null
  await introShows($, 'dash')
  // The first draw since another band stood here.
  const entering = introFresh
  introFresh = false
  const nowMs = await $.clock.now()
  if (autoSeen !== undefined && autoSeen !== v.auto) {
    autoFlipAt = nowMs
    // No redraw to end the slide or the glow: both finish inside their images (the glow fades to nothing), and every
    // redraw rebuilds the buttons under a resting pointer, which flickers their hover.
    autoOnAt = nowMs
  }
  autoSeen = v.auto
  const effortNow = effortOf(v, v.modelNow ?? (await sessionModel($)))
  const by = v.current?.by
  const reason = v.current
    ? `${by === 'manual' || by === 'named' ? 'You' : by === 'jev' ? 'Jev' : 'Haiku'}: ${v.current.why}`
    : v.auto
      ? 'Auto picks the effort at the next prompt'
      : 'You pick the effort'
  // Desktop draws the cache after the context ring, grey, with a hover that explains both; the terminal says it inline.
  const drawn = e.surface !== 'terminal' && 'Svg' in els
  // A cold cache is the cold band's to say; the resting bar shows the countdown only while there is one.
  const cacheShown = config.hide.includes('timer') || (v.cacheNow !== null && v.cacheNow <= 0) ? null : v.cacheNow
  const { head, what, rest, detail } = dashboardLines({
    auto: v.auto,
    paused: Boolean(v.pausedNow),
    judging: Boolean(v.judging),
    effort: effortNow,
    cacheNow: drawn ? null : cacheShown,
    // Desktop draws the context as a ring and a figure (as the swamp band does); the terminal says it in words.
    contextPercent: e.surface === 'terminal' && lastContext && lastContext.window ? lastContext.percent : null,
    // A prompt on a cheaper model names it in the judge's line ("On Sonnet · Haiku: a small fix"), not beside the effort word.
    reason: adviceNow ? `Handoff would suit: ${adviceNow}` : config.hide.includes('reason') ? '' : reason,
    // The last reply's cost is left out of the bar: it was noise there. lastTurn still records it.
    last: null,
  })
  const toggleSettings = async () => {
    if (await read($, settingsOpen)) {
      await update($, settingsDraft, () => ({}))
      await update($, settingsOpen, () => false)
      $.ui.invalidate('ui.render')
    } else await openPluginSettings($)
  }
  const buttons = [
    // Auto sits in the bar on both: in the terminal the effort row under the band drops its own (autoInBar), since
    // there it was cut off at the window's foot. The hotkey only in the terminal; the app draws it faint on grey.
    e.surface === 'terminal' ? (
      <Button key="dash-auto" hotkey="a" variant={v.auto ? 'primary' : undefined} label={v.auto ? 'Auto on' : 'Auto off'} onPress={() => toggleAutoEffort($)} />
    ) : (
      <Button key="dash-auto" variant="secondary" dimColor={!v.auto} label={v.auto ? 'Auto on' : 'Auto off'} onPress={() => toggleAutoEffort($)} />
    ),
    // Once the slot is Handoff (advised, or the setting says always), Compact stays beside it as quiet text, so both are
    // a press away. Desktop only, where there is room for it; the terminal compacts in one press from its own rows.
    ...(e.surface !== 'terminal' && 'Svg' in els && !config.hide.includes('handoff') && handoffSlot() && (typeof e.props.bodyColumns !== 'number' || e.props.bodyColumns >= COMPACT_BUTTON_MIN_COLUMNS)
      ? [<Button key="dash-compact" plain dimColor label="Compact" onPress={() => openCompact($, e)} />]
      : []),
    ...(config.hide.includes('handoff')
      ? []
      : [
          // One button in one place: Compact until Haiku says a fresh chat would suit, then Handoff, loud. Pressing it opens
          // the matching card, which can switch to the other. Desktop draws it: no box on a fresh chat, then a
          // step a percent of context to a white box at HANDOFF_FULL_AT (handoffLook), the label as Text over the box and
          // a blank button over both to take the click. The terminal keeps the plain buttons: grey, white from
          // HANDOFF_LOUD_AT.
          'Svg' in els && e.surface !== 'terminal' ? (
            <Box key="dash-handoff-wrap" flexShrink={0} flexDirection="row">
              {/* No glow while a reply runs: the band redraws then, and each redraw restarted the glow, so it flickered. */}
              {HANDOFF_GLOW && handoffLoud() && !e.props.isWorking ? (
                <Box key="dash-glow" position="absolute" top={0} bottom={0} left={-2} right={-2} alignItems="center" justifyContent="center">
                  <els.Svg source={handoffGlowSvg(handoffGlowStep(handoffLevel()), nowMs)} alt="handoff glow" width={GLOW_W} height={GLOW_H} />
                </Box>
              ) : null}
              {/* The H key, once Handoff is loud: on a button of its own, clipped away, since a blank button with a
                  hotkey draws its letter over the label. */}
              {handoffLoud() ? (
                <Box key="dash-handoff-key" width={0} height={1} overflow="hidden">
                  <Button key="dash-handoff-h" plain hotkey="h" label="Handoff" onPress={() => openHandoffBar($)} />
                </Box>
              ) : null}
              {/* Its width is a spacer in the flow, not the image: the app can lay an image out at no width, and the
                  label (centred over it) then ran into Auto. */}
              <Box key="dash-handoff-box" flexShrink={0} flexDirection="row" alignItems="center">
                <Box width={9} height={1} flexShrink={0} />
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                  <els.Svg source={handoffPillSvg(handoffLevel())} alt="Handoff box" width={HANDOFF_PILL_W} height={HANDOFF_PILL_H} />
                </Box>
                {/* Its hover: a lighter pill shown over the box, not the app's ghost fill, which is sized to the blank
                    label and sat off the drawn box. */}
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center"
                  display="none" hover={{ scope: 'handoff', display: 'flex' }}>
                  <els.Svg source={handoffPillSvg(handoffLevel(), true)} alt="Handoff box" width={HANDOFF_PILL_W} height={HANDOFF_PILL_H} />
                </Box>
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                  <Text color={handoffLook(handoffLevel()).label} hover={{ scope: 'handoff', color: handoffLook(handoffLevel(), true).label }}>{handoffSlot() ? 'Handoff' : 'Compact'}</Text>
                </Box>
                <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                  <Button key="dash-handoff" plain label={' '.repeat(14)} hover={{ scope: 'handoff', backgroundColor: '#00000000' }} onPress={() => (handoffSlot() ? openHandoffBar($) : openCompact($, e))} />
                </Box>
              </Box>
            </Box>
          ) : handoffLoud() ? (
            <Button key="dash-handoff" variant="primary" hotkey="h" label="Handoff" onPress={() => openHandoffBar($)} />
          ) : (
            <Button key="dash-handoff" variant="secondary" label="Handoff" onPress={() => openHandoffBar($)} />
          ),
        ]),
    // The terminal says it in a word; the desktop draws an icon, with this button laid blank over it to take the click.
    // No-break spaces, not braille blanks: some fonts draw U+2800 as a dot.
    <Button key="dash-settings" plain label={'Svg' in els && e.surface !== 'terminal' ? '   ' : 'Settings'} onPress={toggleSettings} />,
  ].filter(Boolean)
  // The terminal flashes the effort word as the desktop does: violet on a change, fading back to white.
  if (e.surface === 'terminal')
    return terminalBand($, e, { key: 'dash', kind: 'calm', color: DASH_TEXT, bg: DASH_BG, edge: DASH_EDGE, title: head.replace(/^✦ /, ''), detail, buttons, autoInBar: true,
      word: { text: what, color: await effortFlash($, what, Boolean(v.judging), entering), rest } })
  const Svg = 'Svg' in els ? els.Svg : undefined
  const wordColor = await effortFlash($, what, Boolean(v.judging), entering)
  glowReadAt = Date.now()
  const glowNow = (await $.clock.now().catch(() => nowMs)) + drawLead
  const glowSource = Svg ? judgeGlowAt(judgeStartedAt, judgeEndedAt, glowNow) : null
  if (glowSource && judgeEndedAt !== null) renderLog.push(`${new Date().toISOString()} ${loadedSession} glow: fade drawn at +${Math.round(glowNow - Math.max(judgeEndedAt, judgeStartedAt + JUDGE_RISE_MS))} ms, lead ${Math.round(drawLead)} ms, ${Math.round(glowNow - drawLead - nowMs)} ms after the draw began`)
  return (
    <Box key="dash" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
      backgroundColor={DASH_BG} borderStyle="round" borderColor={DASH_EDGE}>
      {Svg ? (
        // Auto off: the art goes, so the bar reads as resting, not working.
        v.auto ? (
          <Box key="dash-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={DASH_SVG} alt="effortless" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
          </Box>
        ) : null
      ) : null}
      {Svg && v.auto && nowMs - autoOnAt < AUTO_GLOW_MS && renderLog.push(`glow ${v.auto ? 'on' : 'off'} at ${nowMs - autoOnAt} ms`) ? (
        <Box key="dash-auto-glow" position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={inPhase(autoGlowSvg(v.auto), nowMs - autoOnAt)} alt="auto glow" width={AUTO_GLOW_W} height={AUTO_GLOW_H} />
        </Box>
      ) : null}
      {/* The judge decides: the violet rim lights up, holds, and fades from full once the verdict is in. */}
      {Svg && glowSource ? (
        <Box key="dash-judge-glow" position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={glowSource} alt="deciding glow" width={AUTO_GLOW_W} height={AUTO_GLOW_H} />
        </Box>
      ) : null}
      {/* One row: the effort word, the context ring, the cache, then the reason and the last reply, dim. The word never shrinks;
          when room runs out the reason goes first (it shrinks a hundred times faster), then the cache, and the row clips
          rather than run under the buttons. Siblings, not nested: a shrunk parent let the word spill under the ring. */}
      <Box key="dash-words" position="relative" flexDirection="row" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
        <Box flexShrink={0} flexDirection="row">
          {Svg ? (
            // The mark, as it is, where the ✦ stood; faded while Auto is off.
            <Box key="dash-mark" flexShrink={0} marginRight={1} alignItems="center">
              <Svg source={v.auto ? MARK_SVG : DASH_MARK_OFF} alt="effortless" width={DASH_MARK_SIZE} height={DASH_MARK_SIZE} />
            </Box>
          ) : <Text color={v.auto ? ACCENT : DASH_DIM} bold>✦ </Text>}
          {/* A new effort shows in violet, then white (effortFlash): plain text in the app's font. An animated image of the
              word looked cheap: another font, a late start and a jump back to the text. */}
          <Text key="dash-level" color={wordColor} bold>{v.judging && Svg ? 'Deciding' : what}</Text>
          {/* The model this prompt runs on, dim, after the effort: the judge's routing to a cheaper model shows as it happens. */}
          {!v.judging && v.auto && MODELS.find(m => m.key === (routed ?? v.modelNow)) ? (
            <Text key="dash-model" color={DASH_DIM}>{` · ${MODELS.find(m => m.key === (routed ?? v.modelNow))!.label}`}</Text>
          ) : null}
          {/* While the judge decides: the progress bar's thinking dots, as a plain image (its CSS still runs, and a
              redraw does not restart it the way an interactive frame does). */}
          {v.judging && Svg ? (
            <Box key="dash-thinking" flexShrink={0} marginLeft={1} alignItems="center">
              <Svg source={thinkingSvg('planning')} alt="deciding" width={THINK_W} height={PILL_H} />
            </Box>
          ) : null}
        </Box>
        {rest ? (
          <Box flexShrink={detail ? 0 : 1} minWidth={0}>
            <Text color={DASH_TEXT} bold wrap="truncate">{rest}</Text>
          </Box>
        ) : null}
        {/* What shows when room runs out, most needed first: the effort and the context never shrink; the cache shrinks
            next and goes; the reason (dim, after it) goes first of all. Hovering the ring or the cache swaps the reason
            for what they mean. */}
        {Svg && lastContext && lastContext.window ? (
          <Box key="dash-ring" flexShrink={0} marginLeft={2} flexDirection="row" gap={1} alignItems="center"
            hover={{ scope: 'dash-cache', backgroundColor: HOVER_BOX }}>
            <Svg source={ringSvg(lastContext.percent, DASH_TEXT)} alt={`${Math.round(lastContext.percent)}% of context`} width={16} height={16} />
            <Text color={DASH_TEXT}>{`${Math.round(lastContext.percent)}%`}</Text>
          </Box>
        ) : null}
        {/* The tail: the cache, then the judge's reason, on one wrapping row one line high. The reason has no width of
            its own (it only takes what is left, truncated), so it always fits the first row and goes first; the cache
            keeps its fixed width (the ticking seconds never shift the row) and, once it no longer fits, wraps to the
            hidden second row whole, taking the reason with it. */}
        {Svg && (cacheShown !== null || detail) ? (
          <Box key="dash-tail" flexGrow={1} flexShrink={1} minWidth={0} height={1} overflow="hidden" flexDirection="row" flexWrap="wrap" marginLeft={2}>
            <Box width={0} height={1} />
            {cacheShown !== null ? (
              <Box key="dash-cache-time" width={11} flexShrink={0} hover={{ scope: 'dash-cache', backgroundColor: HOVER_BOX }}>
                <Svg source={cacheClockSvg(cacheExpires - (await $.clock.now()), cacheShown === 0 ? ICE : (cacheColor(cacheShown) ?? DASH_DIM))}
                  alt={`cache ${cacheClock(cacheExpires - (await $.clock.now()))}`} width={84} height={17} />
              </Box>
            ) : null}
            {detail ? (
              // Over the reason, shown only while the ring or cache is hovered, what they mean: a hover can only
              // reveal, so the tip is a layer on the band's colour that covers the reason.
              <Box key="dash-detail" position="relative" width={0} flexGrow={1} flexShrink={1} minWidth={10} marginLeft={cacheShown !== null ? 2 : 0}>
                <Text dimColor wrap="truncate">{detail}</Text>
                <Box key="dash-cache-tip" position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor={DASH_BG}
                  display="none" hover={{ scope: 'dash-cache', display: 'flex' }}>
                  <Text dimColor wrap="truncate">{hoverTips(v).cache.replace(/^Prompt cache/, 'Cache')}</Text>
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : detail ? (
          <Box key="dash-detail" flexShrink={1000} minWidth={0} marginLeft={2}>
            <Text dimColor wrap="truncate">{detail}</Text>
          </Box>
        ) : null}
      </Box>
      {/* The buttons in the flow, their real width and no more, so the words get all the rest. An empty absolute child
          makes the box positioned, which paints it over the art (a plain flow box sits under it and loses clicks). */}
      <Box minWidth={1} />
      <Box key="dash-actions" flexShrink={0} flexDirection="row" gap={1} alignItems="center" marginLeft={1}>
        <Box position="absolute" top={0} left={0} />
        {Svg ? (
          // Auto as a switch, drawn, with a blank button laid over it to take the click (the cog's pattern).
          <Box key="dash-auto-switch" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1}>
            <Svg source={autoSwitchSvg(v.auto, nowMs - autoFlipAt)} alt={v.auto ? 'Auto on' : 'Auto off'} width={26} height={15} />
            <Text color={v.auto ? DASH_TEXT : DASH_DIM}>Auto</Text>
            <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
              <Button key="dash-auto" plain label={' '.repeat(24)} onPress={() => toggleAutoEffort($)} />
            </Box>
          </Box>
        ) : null}
        {Svg ? buttons.slice(1, -1) : buttons}
        {Svg ? (
          // The cog sits in the flow and the button in an absolute layer after it: an absolute layer paints over plain
          // ones, and the desktop ignores position="relative" on a Box without absolute children. A Button is at most as
          // wide as its box, so the box keeps a cell of padding each side of the cog for the hover box.
          <Box key="dash-settings-icon" position="relative" alignItems="center" justifyContent="center" paddingX={1}>
            <Svg source={settingsSvg(DASH_TEXT)} alt="Settings" width={14} height={14} />
            <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
              {buttons[buttons.length - 1]}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

// THESIS:    one quiet line above the prompt that says the effort, and moves only while Claude works.
// AUDIENCE:  VS Code / desktop, narrow composer column (~50 cells), all day.
// WORLD:     the host's own text and controls, no frames, no backgrounds, no pixel art.
// SIGNATURE: a hairline under the line that sweeps while Claude works; slower sweep = higher effort.
// SYSTEM:    host font, one accent (the effort), dim grey for the rest; alerts are one coloured word + one action.
const SWEEP_MS: Record<Effort, number> = { low: 900, medium: 1200, high: 1600, xhigh: 2000, max: 2600 }
/** A 2 px hairline: a faint track and a soft highlight gliding along it, stretched to the line's width. */
function sweepSvg(color: string, ms: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2" viewBox="0 0 1600 2" preserveAspectRatio="none"><style>.s{animation:s ${ms / 1000}s cubic-bezier(.77,0,.175,1) infinite}@keyframes s{from{transform:translateX(-420px)}to{transform:translateX(1600px)}}@media (prefers-reduced-motion:reduce){.s{animation:none;transform:translateX(590px)}}</style><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".5" stop-color="${color}" stop-opacity=".95"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><rect width="1600" height="2" fill="${color}" opacity=".1"/><rect class="s" width="420" height="2" fill="url(#g)"/></svg>`
}
// When the current turn began, so a redraw picks the sweep up where it was (inPhase) instead of restarting it.
let workStartedAt: number | null = null
// The chat's own subagents this load, by model: whether the guide's "Haiku does the legwork" is followed.
const subagentRuns = { haiku: 0, other: 0 }

/** The slim bar (non-terminal, default look): replaces the dashboard and the cold, swamp, hot and judge-down bands. */
async function slimBar($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const els = themedEls($.ui.resolve(e))
  const { Box, Text, Button } = els
  const Svg = 'Svg' in els ? els.Svg : undefined
  const v = await snap($)
  const now = await $.clock.now()
  adviceNow = (await read($, handoffAdvice)) ?? null
  const working = Boolean(e.props.isWorking) || Boolean(v.judging) || v.compacting
  if (working && workStartedAt === null) workStartedAt = now
  if (!working) workStartedAt = null
  const effort = effortOf(v, v.modelNow ?? (await sessionModel($)))
  const word = v.judging ? 'Deciding' : v.pausedNow ? 'Paused' : effort ? EFFORT_LABELS[effort] : 'Auto'
  if (!bandFoldedLoaded) {
    bandFoldedLoaded = true
    if ((await $.store.get('bandFolded').catch(() => null)) === true) await update($, bandFolded, () => true)
  }
  // Folded: only the effort word and the arrow that brings the bar back, at the right edge.
  if (await read($, bandFolded))
    return (
      <Box key="slim-folded" flexDirection="row" justifyContent="flex-end" paddingX={1}>
        <Button key="slim-unfold" plain dimColor onPress={() => setFolded($, false)}>{` ‹  ${word} `}</Button>
      </Box>
    )
  const handing = (await read($, handoffStage)) !== null
  const status = v.compacting ? 'Compacting' : handing ? 'Handing off' : (await read($, updateCard))?.stage === 'updating' ? 'Updating pilot' : null

  // At most one alert, the most pressing first: a colour, a few words, one action.
  let alert: { color: string; text: string; label: string; onPress: () => unknown } | null = null
  const down = await read($, judgeDown)
  const heat = await read($, hot)
  const swampTokens = await read($, swamped)
  const swampHidden = await read($, swampHiddenAt)
  const coldTokens = v.compacting ? null : await coldWorth($)
  const upd = await read($, updateCard)
  if (down && down !== (await read($, judgeDownHidden)))
    alert = { color: RED, text: 'judge down', label: 'Settings', onPress: () => openPluginSettings($) }
  else if (heat && !config.hide.includes('hot') && hotVisible(heat, await hotClosedNow($)))
    alert = (await read($, saveUntil))
      ? { color: EMBER, text: `${Math.round(heat.percent)}% · max Medium`, label: 'Saving', onPress: () => toggleSave($) }
      : { color: EMBER, text: `${Math.round(heat.percent)}%${heat.percent >= GUARD_AT ? ' · max High' : ' limit'}`, label: 'Save', onPress: () => toggleSave($) }
  else if (coldTokens !== null)
    alert = { color: ICE, text: 'cache cold', label: 'Compact', onPress: () => openCompact($, e) }
  else if (swampTokens !== null && !config.hide.includes('swamp') && !v.compacting && (swampHidden === null || swampTokens >= swampHidden + SWAMP_REGROW))
    alert = { color: BOG, text: `${kTokens(swampTokens)} reread`, label: 'Compact', onPress: () => openCompact($, e) }
  else if (upd?.stage === 'offer')
    alert = { color: ACCENT, text: `v${upd.version} out`, label: 'Update', onPress: () => runUpdate($, upd) }
  else if (upd?.stage === 'failed')
    alert = { color: RED, text: 'update failed', label: 'Retry', onPress: () => runUpdate($, upd) }
  else if (upd?.stage === 'done' && now - upd.at < UPDATED_CARD_MS)
    alert = { color: DONE_ACCENT, text: `v${upd.version} installed`, label: 'OK', onPress: () => update($, updateCard, () => null) }
  else if (handoffLoud() && !config.hide.includes('handoff'))
    alert = { color: ACCENT, text: 'fresh chat would pay', label: 'Handoff', onPress: () => openHandoffBar($) }

  const spent = asSpent(await read($, saved))
  const lowPrompts = (spent.byEffort.low?.prompts ?? 0)
  const subs = subagentRuns.haiku + subagentRuns.other
  const light = [
    spent.prompts ? `${lowPrompts}/${spent.prompts} prompts light` : '',
    subs ? `${subagentRuns.haiku}/${subs} agents on Haiku` : '',
  ].filter(Boolean).join(' · ')
  const ctx = lastContext && lastContext.window ? lastContext.percent : null
  const cache = config.hide.includes('timer') || v.cacheNow === null || v.cacheNow <= 0 ? null : cacheLabel(v.cacheNow)
  const model = v.modelNow ? v.modelNow[0].toUpperCase() + v.modelNow.slice(1) : null
  const sweepColor = v.judging ? DASH_DIM : ACCENT
  const toggleSettings = async () => {
    if (await read($, settingsOpen)) {
      await update($, settingsDraft, () => ({}))
      await update($, settingsOpen, () => false)
      $.ui.invalidate('ui.render')
    } else await openPluginSettings($)
  }
  const bar = (
    <Box key="slim" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1}>
      {/* The signature: a hairline that sweeps while Claude works. First child, so it paints under the buttons and never takes their clicks. */}
      {working && Svg ? (
        <Box key="slim-sweep" position="absolute" left={0} right={0} bottom={0}>
          <Svg source={inPhase(sweepSvg(sweepColor, SWEEP_MS[effort ?? 'medium']), now - (workStartedAt ?? now))} alt="working" width={1600} height={2} />
        </Box>
      ) : null}
      {/* The effort is the one accent; pressing it switches Auto. One Button holding the words, padded, so the whole
          area takes the click (an overlay sized by blank labels was a few pixels wide). */}
      <Button key="slim-auto" plain onPress={() => toggleAutoEffort($)}>
        {' '}{v.auto ? <Text dimColor>Auto </Text> : null}<Text bold={v.auto} color={v.auto && !v.judging ? ACCENT : undefined} dimColor={!v.auto}>{word}</Text>{v.auto ? '' : <Text dimColor> (manual)</Text>}{' '}
      </Button>
      {status ? <Text dimColor wrap="truncate">{status}</Text> : model ? <Text dimColor wrap="truncate">{model}</Text> : null}
      {ctx !== null && Svg ? (
        <Box key="slim-ctx" flexShrink={0} flexDirection="row" gap={1} alignItems="center">
          <Svg source={ringSvg(ctx, DASH_DIM)} alt={`${ctx}% of context`} width={12} height={12} />
          <Text dimColor>{`${ctx}% context`}</Text>
        </Box>
      ) : null}
      {/* The cache only once it runs low (yellow, red): a countdown that is fine is noise. */}
      {cache && !alert && cacheColor(v.cacheNow ?? 0) !== undefined ? <Text color={cacheColor(v.cacheNow ?? 0)}>{cache}</Text> : null}
      {/* What Auto did this session: prompts that ran below Medium, and subagents sent to Haiku. Counted, not guessed. */}
      {light ? <Text dimColor wrap="truncate">{light}</Text> : null}
      <Box flexGrow={1} />
      {alert ? <Text color={alert.color} wrap="truncate">{`● ${alert.text}`}</Text> : null}
      {alert ? <Button key="slim-act" variant="secondary" label={` ${alert.label} `} onPress={alert.onPress} /> : null}
      {/* Compact within reach once the chat is sizeable, not only when an alert offers it. */}
      {!alert && !status && ctx !== null && ctx >= 30 ? <Button key="slim-compact" plain dimColor onPress={() => openCompact($, e)}>{' Compact '}</Button> : null}
      <Button key="slim-settings" plain dimColor onPress={toggleSettings}>{'  ⚙  '}</Button>
      <Button key="slim-fold" plain dimColor onPress={() => setFolded($, true)}>{' › '}</Button>
    </Box>
  )
  // Usage under the bar: the 5-hour and weekly windows left and their resets, and the tokens this chat used.
  const usage = config.hide.includes('usage') ? [] : usageParts(await read($, limits), await read($, chatTokens), now)
  if (!usage.length) return bar
  return (
    <Box key="slim-wrap" flexDirection="column">
      {bar}
      <Box key="slim-usage" flexDirection="row" gap={2} paddingX={2} overflow="hidden">
        {usage.map((u, i) => <Text key={`slim-usage-${i}`} color={u.low ? EMBER : undefined} dimColor={!u.low} wrap="truncate">{u.text}</Text>)}
      </Box>
    </Box>
  )
}

/** The slim settings (non-terminal): one row per setting, chips that save on press. At most 9 rows: the app drops a
 * tree taller than maxRows (12 in VS Code) without a word. */
async function slimSettings($: EngineInterface, e: RenderInput<'AbovePrompt'>) {
  const { Box, Text, Button } = themedEls($.ui.resolve(e))
  const guide = ((await $.store.get('guide').catch(() => null)) as string | null) ?? 'on'
  const welcome = (await $.store.get('welcome').catch(() => null)) === true
  // The last row pressed: its options are explained in the footer line, so every row stays one line at 50 cells.
  const focus = ((await $.store.get('settingsFocus').catch(() => null)) as string | null) ?? 'spend'
  type Row = { key: string; label: string; value: string; options: readonly (readonly [string, string])[]; help: string; onSelect: (v: string) => unknown }
  const set = (field: keyof typeof SETTING_FIELDS) => (v: string) => saveSetting($, field, v)
  const rows: Row[] = [
    { key: 'spend', label: 'Spend', value: String(Math.max(-1, Math.min(1, config.bias))), options: [['-1', 'Save'], ['0', 'Balanced'], ['1', 'Smarter']],
      help: 'How Auto leans on close calls. Save keeps usage low, Smarter thinks harder.', onSelect: set('bias') },
    { key: 'top', label: 'Top effort', value: config.ceiling, options: [['medium', 'Medium'], ['high', 'High'], ['xhigh', 'XHigh'], ['max', 'Max']],
      help: 'Auto never goes above this. High is a good cap when usage runs low.', onSelect: set('ceiling') },
    { key: 'judge', label: 'Judge', value: config.judge === 'haiku' ? 'haiku' : 'jev', options: [['jev', 'Jev'], ['haiku', 'Haiku']],
      help: 'Who picks the effort. Jev is faster (TypeSafe key). Haiku needs no key.', onSelect: set('judge') },
    { key: 'helpers', label: 'Subagents', value: config.helpers, options: [['on', 'Own effort'], ['off', 'Same as chat']],
      help: 'Own effort: a quick search runs at Low instead of the chat level.', onSelect: set('helpers') },
    { key: 'compact', label: 'Compact', value: config.compactWith, options: [['haiku', 'Haiku'], ['session', 'Chat model']],
      help: 'Who writes the summary when the chat is compacted. Haiku is far cheaper.', onSelect: set('compactWith') },
    { key: 'guide', label: 'Guide', value: guide, options: [['on', 'On'], ['off', 'Off']],
      help: 'Tells Claude to hand legwork to Haiku and write less code. Next chat.',
      onSelect: async v => { await $.store.set('guide', v); await $.config.set({ key: 'pilot.guide', value: v }).catch(() => undefined) } },
  ]
  const help = rows.find(r => r.key === focus)?.help ?? rows[0].help
  const close = async () => { await $.store.set('welcome', false); await update($, settingsOpen, () => false); $.ui.invalidate('ui.render') }
  return (
    <Box key="pilot-settings" flexDirection="column" paddingX={1}>
      <Box key="ps-head" flexDirection="row" alignItems="center" gap={1}>
        <Text color={ACCENT} bold>pilot</Text>
        <Text dimColor wrap="truncate">{welcome ? 'Ready. Adjust if you like.' : 'Settings'}</Text>
        <Box flexGrow={1} />
        <Button key="ps-done" variant="primary" label="Done" onPress={close} />
      </Box>
      {rows.map(r => (
        <Box key={`ps-${r.key}`} flexDirection="row" columnGap={1} alignItems="center">
          <Box width={11} flexShrink={0}><Text dimColor={r.key !== focus} wrap="truncate">{r.label}</Text></Box>
          {r.options.map(([v, l]) => v === r.value ? (
            <Button key={`ps-${r.key}-${v}`} variant="secondary" label={` ✓ ${l} `}
              onPress={async () => { await $.store.set('settingsFocus', r.key); $.ui.invalidate('ui.render') }} />
          ) : (
            <Button key={`ps-${r.key}-${v}`} plain dimColor label={`  ${l}  `}
              onPress={async () => { await $.store.set('settingsFocus', r.key); await r.onSelect(v); $.ui.invalidate('ui.render') }} />
          ))}
        </Box>
      ))}
      <Text key="ps-help" dimColor wrap="wrap">{help}</Text>
    </Box>
  )
}

/** The terminal's rows above the prompt (Effort steps, Auto, the model row when switched on) and, on any surface, the
 * judge's question when it suggests another model. The rows also sit under an alert band, so effort never goes away. */
async function effortRows($: EngineInterface, e: RenderInput<'AbovePrompt'>, opts: { auto?: boolean } = {}) {
  const { Box, Text, Button } = themedEls($.ui.resolve(e))
  const v = await snap($)
  const { auto, autoModel, current, judging, wanted, shownByApp } = v
  const inUse = v.modelNow ?? (await sessionModel($))
  const effortNow = effortOf(v, inUse)
  // The model row is paused: effort first. EFFORTLESS_MODEL_UI=1 brings it back.
  const showModel = (await envModelUi($)) === '1'

  const setEffort = (level: Effort) => () => pickEffort($, level)
  // Picking a model yourself turns off Auto for model alone; accepting a suggestion leaves it on.
  const setModel = (model: ModelKey) => async () => {
    await update($, isAutoModel, () => false)
    await $.store.set('isAutoModel', false)
    await changeModel(model)
  }
  // The person sends /model, so the app's own control moves too; with a draft in the box the mod runs it.
  const changeModel = async (model: ModelKey) => {
    if (await typeCommand($, `/model ${model}`)) return
    await switchModel($, model)
  }
  const acceptSuggestion = (model: ModelKey) => () => changeModel(model)
  const toggleAutoModel = async () => {
    const turnOn = !(await read($, isAutoModel))
    await update($, isAutoModel, () => turnOn)
    await $.store.set('isAutoModel', turnOn)
    if (!turnOn) await update($, suggestion, () => null)
  }
  const dismiss = async () => {
    declined = wanted
    await update($, suggestion, () => null)
  }

  const question = wanted ? (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text>Switch to {MODELS.find(m => m.key === wanted)?.label}? The context reloads.</Text>
        <Button key="accept" variant="primary" label="Switch" onPress={acceptSuggestion(wanted)} />
        <Button key="decline" label="Keep" onPress={dismiss} />
      </Box>
    </Box>
  ) : null
  if (e.surface !== 'terminal') return { question, rows: null }

  const notAligned = current && inUse !== 'haiku' && shownByApp && shownByApp !== current.effort
  const note = judging
    ? 'Deciding…'
    : notAligned
      ? `/effort shows ${EFFORT_LABELS[shownByApp as Effort] ?? shownByApp}`
      : current
        ? `${current.by === 'manual' ? 'You' : current.by === 'jev' ? 'Jev' : 'Haiku'}: ${current.why}`
        : auto
          ? 'Picks the effort at the next prompt'
          : 'Pick an effort'
  const modelRow = (
    <Box flexDirection="row" alignItems="center" gap={1}>
      {MODELS.map(m =>
        m.key === inUse ? (
          <Button key={`m-${m.key}`} variant="primary" label={m.label} onPress={setModel(m.key)} />
        ) : (
          <Button key={`m-${m.key}`} plain dimColor label={m.label} onPress={setModel(m.key)} />
        ),
      )}
      <Box flexGrow={1} />
      <Button
        key="auto-model"
        hotkey="m"
        variant={autoModel ? 'primary' : undefined}
        label={autoModel ? 'Auto on' : 'Auto off'}
        onPress={toggleAutoModel}
      />
    </Box>
  )
  const rows = (
    <Box flexDirection="column">
      {question}
      {showModel ? modelRow : null}
      <Box flexDirection="row" gap={1} alignItems="center">
        {/* The word never breaks: the note at the end gives way first. */}
        <Box flexShrink={0}>
          <Text dimColor>Effort</Text>
        </Box>
        {EFFORTS.map(level =>
          level === effortNow ? (
            <Button key={`e-${level}`} variant="primary" label={level} onPress={setEffort(level)} />
          ) : (
            <Button key={`e-${level}`} plain dimColor label={level} onPress={setEffort(level)} />
          ),
        )}
        <Box flexGrow={1} />
        {opts.auto === false ? null : (
          <Button
            key="auto"
            hotkey="a"
            variant={auto ? 'primary' : undefined}
            label={auto ? 'Auto on' : 'Auto off'}
            onPress={() => toggleAutoEffort($)}
          />
        )}
        <Box flexShrink={1} minWidth={0}>
          <Text dimColor wrap="truncate-end">
            {note}
          </Text>
        </Box>
      </Box>
    </Box>
  )
  return { question, rows }
}

// --- The agent panel (hooks/agents.tsx): the $ side, kept short ------------------------------------------------------

/** Changes one agent's record, if the panel knows it. */
async function agentSet($: EngineInterface, id: string, fn: (a: AgentRec) => AgentRec) {
  await update($, agentsState, list => (list.some(a => a.id === id) ? list.map(a => (a.id === id ? fn(a) : a)) : list))
}

/** An agent's loop ended: done when it answered, failed otherwise. */
async function agentEnded($: EngineInterface, id: string, reason: string) {
  const now = await $.clock.now()
  await agentSet($, id, a => ({ ...a, state: reason === 'answer' ? 'done' : 'failed', endedAt: now, toolSince: undefined, now: undefined }))
}

/** Adds a request's weighted tokens to its agent. */
async function agentCost($: EngineInterface, id: string, cost: number) {
  await agentSet($, id, a => ({ ...a, cost: (a.cost ?? 0) + cost }))
}

// Effort for helpers: the effort the judge picked for each subagent, by its id. A subagent's first request can come
// before its spawn resolves with the id (seen 2026-10-10), so a pick waits under the spawn's description and type
// until a request from an unknown subagent claims it through $.agent.list().
const helperPicks = new Map<string, Effort>()
let helperWaiting: { description: string; type: string; parentId?: string; effort: Effort }[] = []

/** What the judge reads for a subagent: its task, said to be one, so it judges the subagent's work. */
export function helperQuestion(prompt: string, type: string): string {
  return `${prompt.slice(0, 4000)}

[This is the task Claude gave a ${type} subagent, not a message from the person. Judge the effort that subagent needs to do it well.]`
}

/** The lowest effort a helper gets: medium, or the person's Min when higher, never above their Max. A helper's answer
 * goes back to the chat unchecked, and at low it miscounted where medium did not (bench/results/helpers-2026-10-10.md). */
export function helperFloor(floor: Effort, ceiling: Effort): Effort {
  const i = Math.min(Math.max(EFFORTS.indexOf(floor), EFFORTS.indexOf('medium')), EFFORTS.indexOf(ceiling))
  return EFFORTS[i]
}

/** The judge's effort for a subagent's task, within the person's slider, Min and Max and save mode; null without a verdict. */
async function helperEffort($: EngineInterface, prompt: string, type: string): Promise<Pick | null> {
  const { verdict } = await judge($, helperQuestion(prompt, type), null)
  if (!verdict || verdict.why === UNSURE) return null
  const saving = (await read($, saveUntil)) !== null
  const leaned = tipped(verdict.effort, verdict.sure, config.bias)
  const effort = guarded(capped(bounded(leaned, helperFloor(config.floor, config.ceiling), config.ceiling), saving), (await read($, hot))?.percent ?? null)
  return { ...verdict, effort, why: effort !== leaned && EFFORTS.indexOf(leaned) < EFFORTS.indexOf(effort) ? `${verdict.why} (helpers start at medium)` : verdict.why }
}

/** The effort picked for this subagent, claiming a waiting pick the first time its id is seen. */
async function helperEffortOf($: EngineInterface, id: string): Promise<Effort | undefined> {
  const known = helperPicks.get(id)
  if (known || helperWaiting.length === 0) return known
  const info = (await $.agent.list().catch(() => [])).find(a => a.id === id)
  if (!info) return undefined
  const match = helperWaiting.find(w => w.description === info.description && w.type === info.type && w.parentId === info.parentId)
  if (!match) return undefined
  helperWaiting = helperWaiting.filter(w => w !== match)
  helperPicks.set(id, match.effort)
  return match.effort
}

/** Counts one request of a helper the judge steered, for /effortless stats. */
async function helperTally($: EngineInterface, usage: Parameters<typeof weighted>[0]) {
  await update($, saved, old => {
    const t = asSpent(old)
    return { ...t, helpers: { ...t.helpers, requests: t.helpers.requests + 1, cost: t.helpers.cost + weighted(usage) } }
  })
}

/** A file read or changed by the main chat or an agent: added to the map, its imports read the first time. */
async function fileTouched($: EngineInterface, path: string, edited: boolean, by: string) {
  const rel = relPath(path, await $.session.root())
  if (!rel) return
  const now = await $.clock.now()
  const known = (await read($, agentFiles)).find(f => f.path === rel)
  let imports: string[] | undefined
  if (!known || edited) imports = importsOf(rel, await $.fs.read(path).then(t => t.slice(0, 512_000), () => ''))
  await update($, agentFiles, list => withTouch(list, rel, edited, by, now, imports))
}

/** From the 1 s timer: an agent long in one tool call turns to waiting. Writes only when one changes. */
async function agentWaits($: EngineInterface) {
  const list = await read($, agentsState)
  if (!list.length) return
  const next = withWaits(list, await $.clock.now())
  if (next) await update($, agentsState, () => next)
}

// A compaction written by Haiku 5.5: Anthropic names compaction among the jobs it is built for, at a fraction of the
// chat model's price. Claude Code compacts with the chat's own model and has no setting for another, and the
// summarizer's request does not pass through turn.step, so the mod answers session.compact itself: the transcript as
// text, Haiku's summary back as the conversation. Anything that fails falls through to Claude Code's own compaction.
const COMPACT_MODEL = 'claude-haiku-5-5'
/** The transcript's most text sent to Haiku: about 600k tokens, inside its window with room for the summary. */
const COMPACT_MAX_CHARS = 2_400_000
const COMPACT_SYSTEM = `You compact a conversation between a user and Claude Code, an AI coding agent, so the work can continue
in a fresh context that holds only your summary. Whoever reads it next knows nothing else about the conversation.

Write a detailed summary with these sections:
1. Primary request and intent: everything the user asked for, in detail, including changes of mind.
2. Key technical concepts: technologies, frameworks, constraints and decisions.
3. Files and code: every file read, created or edited, why it matters, and the important snippets or signatures.
4. Errors and fixes: what went wrong, how it was fixed, and any feedback the user gave about it.
5. Problem solving: what was solved and what is still being worked out.
6. All user messages: every message the user wrote that is not a tool result, briefly and in order.
7. Pending tasks: what the user asked for that is not done.
8. Current work: exactly what was being done right before this summary, with file names and code. The last few
messages come nearly uncut: carry the code and errors from them over in full, since the next step builds on them.
9. Next step: the next step, only if it follows directly from the user's latest request, quoting that request.

Be precise: keep names, paths, numbers, commands and error messages exact. Leave out pleasantries.
Reply with the summary only.`

/** The transcript as plain text for the summarizer: each message, its tool calls and their results, the long ones cut. */
// The last messages go to Haiku nearly whole: the work in progress (the code just written, the error just seen) lives
// in their tool calls and results, and a 400-character cut lost it mid-task.
export const COMPACT_TAIL = 6
const COMPACT_TAIL_CHARS = 20_000
export function compactTranscript(messages: readonly { role: string; text: string; toolUses?: readonly { tool: string; input: unknown; text?: string }[]; toolResults?: readonly { text?: string }[] }[], toolChars = 2000, tailChars = COMPACT_TAIL_CHARS): string {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)} …[${s.length - n} more characters]` : s)
  const tailFrom = messages.length - COMPACT_TAIL
  return messages
    .map((m, i) => {
      const inTail = i >= tailFrom
      const inputChars = inTail ? tailChars : 400
      const resultChars = inTail ? tailChars : toolChars
      const lines = [`${m.role === 'user' ? 'USER' : 'CLAUDE'}: ${m.text}`.trimEnd()]
      for (const t of m.toolUses ?? []) {
        lines.push(`  [${t.tool} ${cut(JSON.stringify(t.input ?? {}), inputChars)}]`)
        if (t.text) lines.push(`  → ${cut(t.text, resultChars)}`)
      }
      if (!m.toolUses?.length) for (const r of m.toolResults ?? []) if (r.text) lines.push(`  → ${cut(r.text, resultChars)}`)
      return lines.join('\n')
    })
    .join('\n\n')
}

/** Haiku's summary of the transcript, or why there is none. */
async function haikuCompaction($: EngineInterface, messages: Parameters<typeof compactTranscript>[0], instructions?: string): Promise<{ text: string } | { fail: string }> {
  let transcript = compactTranscript(messages)
  if (transcript.length > COMPACT_MAX_CHARS) transcript = compactTranscript(messages, 300, 4000)
  if (transcript.length > COMPACT_MAX_CHARS) return { fail: 'the chat is too long for Haiku' }
  const r = await $.model.complete({
    model: COMPACT_MODEL,
    system: COMPACT_SYSTEM,
    prompt: `${transcript}\n\n---\nWrite the summary now.${instructions?.trim() ? `\nThe user asked the summary to keep or stress: ${instructions.trim()}` : ''}`,
    maxTokens: 16000,
    effort: 'medium',
    timeoutMs: 240_000,
  })
  if (!r.isAnswered) return { fail: 'reason' in r ? String(r.reason) : 'no answer' }
  return r.text.trim().length > 200 ? { text: r.text.trim() } : { fail: 'the summary came back empty' }
}

/** The quick handoff written by Haiku from the transcript, for a chat whose cache went cold; null when it fails. */
async function haikuHandoff($: EngineInterface, messages: Parameters<typeof compactTranscript>[0]): Promise<string | null> {
  let transcript = compactTranscript(messages)
  if (transcript.length > COMPACT_MAX_CHARS) transcript = compactTranscript(messages, 300, 4000)
  if (transcript.length > COMPACT_MAX_CHARS) return null
  const r = await $.model.complete({
    model: COMPACT_MODEL,
    system: 'You read a conversation between a user and Claude Code, an AI coding agent, and write the handoff the user asks for.',
    prompt: `${transcript}\n\n---\n${HANDOFF_PROMPT}`,
    maxTokens: 4000,
    effort: 'medium',
    timeoutMs: 120_000,
  })
  return r.isAnswered && r.text.trim().length > 100 ? r.text.trim() : null
}

export const register: Register = (on, options) => {
  loadedAt = Date.now()
  firstDrawLogged = false
  drawsTimed = 0
  config = readConfig(options)
  // The working guide (Haiku for the legwork, the shortest code that works) rides in the first message's context.
  const guideOn = (options as Record<string, unknown> | undefined)?.guide !== 'off'
  on('prompt.context', async ($, e, next) => {
    const result = await next(e)
    const saved = (await $.store.get('guide').catch(() => null)) as string | null
    return (saved ?? (guideOn ? 'on' : 'off')) === 'on' ? { ...result, blocks: [...result.blocks, { name: 'effortless-guide', text: GUIDE_PROMPT }] } : result
  })
  applyTheme()
  pluginOptions = options
  on('session.compact', async ($, e, next) => {
    // A subagent's own compaction, the session's model by choice: Claude Code's own.
    if (e.agentId !== undefined || config.compactWith !== 'haiku') return next(e)
    // Ahead-of-time summaries would be written by the chat's model and then not used: none.
    if (e.trigger === 'precompute') return { skip: 'effortless compacts with Haiku when it is time' }
    // The transcript comes with the event; read it if not (a test's engine hands none).
    const messages = Array.isArray(e.messages) && e.messages.length ? e.messages : await $.session.messages().catch(() => [])
    const got = await haikuCompaction($, messages, e.instructions).catch((error: unknown) => ({ fail: String(error).slice(0, 80) }))
    if ('fail' in got) {
      $.ui.toast(`pilot: Haiku could not compact (${got.fail}). The chat's own model does it.`)
      return next(e)
    }
    lastHaikuCompact = Date.now()
    return {
      messages: [
        {
          role: 'user' as const,
          text: `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation, written by Haiku 5.5 for effortless.\n\n${got.text}\n\nContinue the conversation from where it left off without asking the user any further questions.`,
          toolUses: [],
        },
      ],
    }
  })
  on('session.start', async ($, e, next) => {
    sessionStarted = Date.now()
    // Everything the first draw needs, asked for at once: one after the other they held the start (and with it the
    // band) for a second or more. What the draw does not need runs after, unawaited.
    const [sid, kept, kff, storedAuto, storedAutoModel, storedPick, setupDone] = await Promise.all([
      $.session.id().catch(() => '?'),
      $.store.get('savedSettings').catch(() => null),
      $.store.get('keyFromFile').catch(() => null),
      $.store.get('isAuto').catch(() => null),
      $.store.get('isAutoModel').catch(() => null),
      $.store.get('pick').catch(() => null) as Promise<Pick | null>,
      $.store.get('setupDone').catch(() => null),
    ])
    // Which chat this load serves, and when it started: each chat has its own render log.
    loadedSession = String(sid).slice(0, 8)
    // Settings the app had no /config row for (see saveSetting), over the ones it passed in.
    if (kept && typeof kept === 'object' && Object.keys(kept).length) {
      config = readConfig({ ...pluginOptions, ...kept })
      applyTheme()
    }
    keyFromFile = kff === true
    await Promise.all([
      typeof storedAuto === 'boolean' ? update($, isAuto, () => storedAuto) : null,
      typeof storedAutoModel === 'boolean' ? update($, isAutoModel, () => storedAutoModel) : null,
      // Auto off means the effort you chose should still be the one in force.
      storedAuto === false && storedPick && EFFORTS.includes(storedPick.effort) ? update($, pick, () => storedPick).then(() => { pickCarried = true }) : null,
      // The first time the mod runs, the setup guide opens above the prompt.
      // The setup is the slim settings, opened once with a welcome line: the defaults are already good, one look is enough.
      setupDone !== true ? $.store.set('setupDone', true).then(() => $.store.set('welcome', true)).then(() => update($, settingsOpen, () => true)) : null,
    ])
    // The command file lists /effortless before the session starts; registering it here makes plain /effortless the
    // mod's own command afterwards, instead of the file run as a skill.
    void $.command.register({ name: 'pilot', description: 'pilot: settings, debug, handoff, setup, bench, auto, stats.' }).catch(() => undefined)
    void $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`).then(t => { ownVersion = String(JSON.parse(String(t)).version ?? '') }).catch(() => undefined)
    void afterLoad($).catch(() => undefined)
    void drainSetupSave($).catch(() => undefined)
    startTimers($, 'start')
    // Clear the status entry older versions set.
    $.ui.status(undefined)
    void $.session.model().then(m => modelIs($, m)).catch(() => undefined)
    renderLog.push(`${new Date().toISOString()} ${loadedSession} session.start (${e.surface ?? '?'}), ready in ${Date.now() - sessionStarted} ms`)
    void writeRenderLog($).catch(() => undefined)
    return next(e)
  })

  // A chat opened again later (resume, fork): the mod starts afresh and has seen no response, so the countdown would
  // stay blank on a cache long cold. The app says how long ago the last response was, and whether the cache has
  // likely lapsed: the countdown starts from there.
  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    const r = e as { source?: string; seconds_since_last_response?: number; prompt_cache_likely_expired?: boolean }
    classicStart = { at: Date.now(), said: `${r.source ?? '?'}, ${r.seconds_since_last_response ?? '?'}s since reply, expired ${r.prompt_cache_likely_expired ?? '?'}` }
    if ((r.source === 'resume' || r.source === 'fork') && typeof r.seconds_since_last_response === 'number' && cacheExpires === 0) {
      const now = await $.clock.now()
      lastResponseAt = now - r.seconds_since_last_response * 1000
      const left = lastResponseAt + CACHE_TTL[cacheTtl]
      cacheExpires = r.prompt_cache_likely_expired || left <= now ? now - 1 : left
      await rememberCache($)
      await checkSwamp($).catch(() => undefined)
      await showCache($).catch(() => undefined)
      // The app opens the chat and draws its band while this runs; a redraw asked now can land before the band is
      // there, and the next came only with the 15 s cache tick. Ask again over the next seconds.
      $.ui.invalidate('ui.render')
      redrawSoon()
    }
    return result
  })

  // The handoff turn ended: keep its text; the session's timer clears the chat and sends it.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) await agentEnded($, e.agentId, e.reason)
    if (!e.agentId) await setTurnBusy($, false)
    // A lower verdict for a message typed during the turn takes over now, if Auto is still on.
    if (!e.agentId && heldPick) {
      const held = heldPick
      heldPick = null
      if (await read($, isAuto)) await choose($, held)
    }
    // The newest reply's text: its last block carries the warning card (see AssistantMessage).
    if (!e.agentId && e.reason === 'answer') await update($, lastAnswer, () => e.answer.trim())
    if (!e.agentId && turnCost > 0) await update($, lastTurn, () => ({ cost: turnCost, ms: e.durationMs ?? 0 }))
    // A landed handoff card stays under the first reply after it, and goes with the next.
    if (!e.agentId) {
      await update($, handoffCard, card => (!card || cardRunning(card.kind) ? card : card.seen ? null : { ...card, seen: true }))
    }
    if (!e.agentId && (await read($, handoffStage)) === 'writing') {
      if (e.reason === 'answer' && e.answer.trim()) handoffText = e.answer
      else {
        await update($, handoffStage, () => null)
        $.ui.toast('pilot: the handoff was not written, nothing was cleared')
      }
    }
    return result
  })

  // /effortless is a command file in the plugin (commands/pilot.md), so the app lists it before the session has
  // started; this hook answers it, and the file's text never reaches the model. Both spellings the app may use.
  on('command.run', async ($, e, next) => {
    if (e.command !== 'pilot' && e.command !== 'pilot:pilot') return next(e)
    const wanted = await read($, suggestion)
    const arg = e.args.trim().toLowerCase()
    // /effortless card offer|updating|done|failed: draws that update card with made-up text, to look at it before a publish.
    if (arg.startsWith('card')) {
      const stage = arg.slice(4).trim() || 'done'
      const stages = ['offer', 'updating', 'done', 'failed']
      if (stage === 'off') {
        await update($, updateCard, () => null)
        return { text: 'The preview card is gone.' }
      }
      if (!stages.includes(stage)) return { text: 'Use /effortless card offer, updating, done, failed or off.' }
      const version = (await installedVersion($)) ?? '1.0.0'
      await update($, updateCard, () => ({
        stage: stage as UpdateCard['stage'], version, note: 'A short release note, as users see it.', at: Date.now(),
        ...(stage === 'failed' ? { detail: 'A made-up failure, for the look of the card.' } : {}),
      }))
      $.ui.invalidate('ui.render')
      return { text: `The update card shows its "${stage}" look (a preview). /effortless card off clears it.` }
    }
    if (arg === 'update') {
      await checkUpdate($).catch(() => undefined)
      const card = await read($, updateCard)
      if (!card || card.stage === 'done') return { text: `effortless ${(await installedVersion($)) ?? ''} is the newest (${lastUpdateCheck}).` }
      void runUpdate($, card)
      return { text: `Updating to ${card.version}…` }
    }
    if (arg === 'agents' || arg === 'agents demo') {
      if (arg === 'agents demo') {
        const now = await $.clock.now()
        await update($, agentsState, () => demoAgents(now))
        await update($, agentFiles, () => demoFiles(now))
        await update($, agentSteps, () => demoSteps())
      }
      await $.ui.open({ id: 'effortless-agents', title: 'Agents' })
      return { text: arg === 'agents demo' ? 'The agent panel shows sample agents (a preview).' : 'The agent panel is open.' }
    }
    if (arg === 'auto') {
      await toggleAutoEffort($)
      return { text: (await read($, isAuto)) ? 'Auto on: effort is picked for every prompt.' : 'Auto off: the effort is yours.' }
    }
    // A test aid: marks the cache cold now, so the Compact button can be tried without waiting out the hour.
    if (arg === 'hot') {
      // Shows the running-hot band now, to try it: the next check puts back the real figures.
      await update($, hotHidden, () => null)
      await $.store.set('hotClosed', null).catch(() => undefined)
      await update($, hot, () => ({ kind: 'five_hour', percent: 82, resetsAt: new Date(Date.now() + 2 * 3600_000).toISOString() }))
      $.ui.invalidate('ui.render')
      return { text: 'The running-hot band is showing now (a test). It goes away at the next check unless a limit really is close.' }
    }
    if (arg === 'down') {
      await update($, judgeDownHidden, () => null)
      await update($, judgeDown, () => 'Jev is out of credits (402)')
      $.ui.invalidate('ui.render')
      return { text: 'The judge-down band is showing now (a test). It goes away once the judge answers again.' }
    }
    if (arg === 'swamp') {
      // Shows the swamp band now, to try it: the next check puts back the real figure.
      await update($, swampHiddenAt, () => null)
      await update($, swamped, () => SWAMP_TOKENS)
      $.ui.invalidate('ui.render')
      return { text: 'The swamp band is showing now (a test). It goes away at the next check unless the chat really is swamped.' }
    }
    if (arg === 'save') return { text: await toggleSave($) }
    if (arg === 'handoff' || arg === 'handoff full') {
      const full = arg === 'handoff full'
      const { after } = await lastHandoffChoice($)
      await startHandoff($, full, after)
      const what = handoffWhat({ kind: full ? 'full' : 'quick', after }, config.handoffSkill)
      return { text: `Writing the ${full ? 'full' : 'quick'} handoff. ${what.by}. ${what.then}` }
    }
    if (arg.startsWith('probe')) {
      probeLevel = Number(arg.slice(5).trim()) || 0
      await update($, settingsOpen, () => true)
      $.ui.invalidate('ui.render')
      return { text: `Probe ${probeLevel} drawn above the prompt (0 is the real panel). Tell me if you see it.` }
    }
    if (arg === 'debug') {
      const ago = (t: number) => (t ? `${Math.round((Date.now() - t) / 1000)}s ago` : 'never')
      const lastFork = (await $.store.get('lastFork').catch(() => null)) as { at: number; outcome: string } | null
      return {
        text: [
          `session.start ${ago(sessionStarted)}`,
          `app SessionStart: ${classicStart ? `${ago(classicStart.at)} (${classicStart.said})` : 'never'}`,
          `cache: ${cacheExpires === 0 ? 'not started' : `${await cacheMinutes($)} min left`}, shown ${await read($, cacheLeft)}, ttl ${cacheTtl}, last reply ${lastResponseAt ? ago(lastResponseAt) : 'none seen'}, replies seen ${repliesSeen}, forced ${coldForced}`,
          `band asked for ${renderCalls} times, last ${ago(lastRenderAt)}`,
          `band error: ${lastRenderError || 'none'}`,
          `last draw: ${lastRenderBranch || 'none'}`,
          `app sent: ${lastRenderProps || 'nothing'}`,
          `settings open: ${await read($, settingsOpen)}`,
          `setup step: ${await read($, setupStep)}`,
          `handoff: ${await read($, handoffStage)}`,
          `last fork: ${lastFork ? `${lastFork.outcome}, ${ago(lastFork.at)}` : 'none'}`,
          `hidden: ${config.hide.join(',') || 'nothing'}`,
          `model: ${config.modelAuto === 'on' ? `cheaper when it can, now ${routed ?? 'the chat\'s'}` : 'always the chat\'s'}`,
          lastRequest
            ? `last request: app asked ${lastRequest.appModel} at ${lastRequest.appEffort ?? 'none'}, sent ${lastRequest.model} at ${lastRequest.effort ?? 'none'}${lastRequest.model === lastRequest.appModel && lastRequest.effort === lastRequest.appEffort ? ' (unchanged)' : ' (changed by effortless)'}, ${ago(lastRequest.at)}`
            : 'last request: none yet',
          `compact with: ${config.compactWith}${lastHaikuCompact ? `, last by Haiku ${ago(lastHaikuCompact)}` : ''}`,
        ].join(' | ') +
          // On its own line, easy to find: the model and effort the last request actually ran on.
          `
model used: ${lastRequest ? `${lastRequest.model} at ${lastRequest.effort ?? 'none'}` : 'none yet'}`,
      }
    }
    if (arg === 'settings') {
      await openPluginSettings($)
      return { text: 'The effortless settings are open above the prompt.' }
    }
    if (arg === 'setup') {
      await $.store.set('welcome', true)
      await update($, settingsOpen, () => true)
      $.ui.invalidate('ui.render')
      return { text: 'The pilot setup is open above the prompt.' }
    }
    if (arg === 'bench') {
      const cases = (JSON.parse(await $.fs.read(`${$.plugin.root}/bench/judge-cases.json`)) as { cases: BenchCase[] }).cases
      const answers = await runBench($, cases)
      const report = benchReport(cases, answers)
      const stamp = new Date(await $.clock.now()).toISOString().slice(0, 16).replace(/[:T]/g, '-')
      const out = `effortless-bench-${stamp}`
      await $.fs.write(`${out}.json`, JSON.stringify({ cases: cases.length, answers }, null, 2))
      await $.fs.write(`${out}.md`, report)
      return { text: `${report}

Saved to ${out}.md and .json` }
    }
    if (arg === 'cold') {
      coldForced = true
      cacheExpires = await $.clock.now()
      await update($, cacheLeft, () => 0)
      $.ui.invalidate('ui.render')
      return { text: 'The cache shows as cold now (a test). Compact is in the footer. The next response restarts the countdown.' }
    }
    if (arg === 'stats' || arg === 'saved') return { text: `Auto, this session:\n${savedText(await read($, saved))}` }
    if (!wanted) return { text: 'No model suggestion right now.' }
    if (arg === 'switch') {
      $.clock.after(0, () => void switchModel($, wanted))
      return { text: `Switching to ${wanted}. The context reloads.` }
    }
    declined = wanted
    await update($, suggestion, () => null)
    return { text: `Keeping the current model.` }
  })

  on('prompt.submit', async ($, e, next) => {
    await setTurnBusy($, true)
    turnCost = 0
    // A landed handoff's card goes once the next message is sent.
    const card = await read($, handoffCard)
    if (card && (card.kind === 'done' || card.kind === 'copied')) await update($, handoffCard, () => null)
    const byPerson = e.origin.kind === 'composer' || e.origin.kind === 'bridge' || e.origin.kind === 'sdk'
    // The handoff check runs for every message the person types, whatever the effort judge is doing (or whether Auto is on).
    if (byPerson && !e.text.trim().startsWith('/') && !isFollowUp(e.text)) void checkHandoff($, e.text).catch(() => undefined)
    const wantsEffort = await read($, isAuto)
    const wantsModel = await read($, isAutoModel)
    // A typed slash command is judged only when it is a skill or a custom command (what the person added); the app's own
    // (/compact, /clear, /model) and effortless's never are. The judge is told what the command is, since its name alone says little.
    const slash = e.text.trim().startsWith('/')
    const skill = slash && byPerson ? await typedSkill($, e.text) : undefined
    if (!byPerson || (slash && !skill) || (!wantsEffort && !wantsModel)) return next(e)
    // On a model where an effort change rewrites the cache, Auto waits instead of judging.
    const modelId = await $.session.model()
    await modelIs($, modelId)
    if (!cacheSafe(modelId) && keyOf(modelId) !== 'haiku') return next(e)
    // "go", "ok", "yes" between two steps of work keep the effort Auto already chose; no judge is asked.
    const before = await read($, pick)
    // A message with an image is never a bare follow-up: "fix this" plus a screenshot is new work.
    // Typed while a turn ran (e.turnId), it often steers that task: the judge is told, so it can keep the effort.
    const midTurn = e.turnId !== undefined && before !== null
    const said = skill ? `${e.text}

[This is a slash command that runs a skill: ${skill.description || skill.name}. Judge the work the skill will do.]` : e.text
    const shown = midTurn ? withMidTurn(withAttachments(said, e.attachments), before.effort) : withAttachments(said, e.attachments)
    if (wantsEffort && before && before.by !== 'manual' && !e.attachments?.length && !slash && isFollowUp(e.text) && keepsEffort(e.text, await recentContext($).catch(() => ''))) {
      await countPrompt($, before.effort, undefined, 0, 0)
      void proof($, `follow-up "${e.text.trim()}": keeping ${before.effort}`)
      return next(e)
    }
    // "max effort", "effort: low": the person said the level, so it runs, past Min, Max and save mode, and no judge is asked.
    const named = wantsEffort && !slash ? namedEffort(e.text) : undefined
    if (named) {
      const inUse = await sessionModel($)
      const applied: Pick = { model: inUse, effort: named, why: 'you asked for it', by: 'named' }
      const running = await read($, pick)
      if (midTurn && running && EFFORTS.indexOf(named) < EFFORTS.indexOf(running.effort)) heldPick = applied
      else {
        heldPick = null
        await choose($, applied)
      }
      if (!midTurn && routed) routed = null
      await countPrompt($, inUse !== 'haiku' ? named : undefined, 'named', 0, 0)
      void proof($, `named level ${named} in "${e.text.slice(0, 50)}": no judge`)
      $.ui.invalidate('ui.render')
      return next(e)
    }

    judgeStartedAt = await $.clock.now().catch(() => Date.now())
    judgeEndedAt = null
    renderLog.push(`${new Date().toISOString()} ${loadedSession} glow: start`)
    drawGlowSteps($, 0, JUDGE_RISE_MS)
    // The band is drawn again as the judge starts, so the rise is placed by the clock from the first frame.
    $.ui.invalidate('ui.render')
    await update($, isJudging, () => true)
    try {
      const inUse = await sessionModel($)
      const startedAt = Date.now()
      const { verdict, tokens: judgeTokens } = await judge($, shown, {
        model: inUse,
        effort: (await read($, pick))?.effort ?? 'medium',
        why: '',
        by: 'manual',
      })
      await endJudgeGlow($, 'verdict')
      const ms = Date.now() - startedAt
      await countPrompt($, wantsEffort && inUse !== 'haiku' ? verdict?.effort : undefined, verdict?.by, ms, judgeTokens)
      void proof(
        $,
        verdict
          ? `judged by ${verdict.by} in ${ms} ms: ${verdict.model}/${verdict.effort} (${verdict.why}) for "${e.text.slice(0, 50)}"`
          : `no verdict after ${ms} ms for "${e.text.slice(0, 50)}"`,
      )
      $.ui.invalidate('ui.render')
      if (verdict) {
        // Effort follows the verdict at once, when Auto is on for effort. The model stays: switching it
        // reloads the context, so with Auto on for model it is only suggested.
        if (wantsEffort) {
          const saving = (await read($, saveUntil)) !== null
          const leaned = bounded(tipped(verdict.effort, verdict.sure, config.bias), config.floor, config.ceiling)
          const effort = guarded(capped(leaned, saving), (await read($, hot))?.percent ?? null)
          const why = effort !== leaned ? (saving ? 'save mode' : 'limit guard') : leaned !== verdict.effort ? 'your settings' : verdict.why
          const applied: Pick = { ...verdict, model: inUse, effort, why }
          // Mid-turn, a lower verdict would cut the running task's effort for its remaining steps: it waits for the
          // turn to end (the queued message may run as a turn of its own). A higher one helps the task, so it applies.
          const running = await read($, pick)
          if (midTurn && running && EFFORTS.indexOf(effort) < EFFORTS.indexOf(running.effort)) {
            heldPick = applied
            void proof($, `typed mid-turn: ${effort} waits, the running turn keeps ${running.effort}`)
          } else {
            heldPick = null
            await choose($, applied)
          }
        }
        // A prompt the judge calls simple runs on a cheaper model; a message typed mid-turn leaves the running choice.
        if (!midTurn) {
          let to = wantsEffort && config.modelAuto === 'on' ? routeTo(verdict.model, inUse) : null
          // The last prompt ran on a cheaper model and this one says it was wrong: that is a miss. The retry runs on the
          // chat's own model, and so do the next few prompts.
          if (routed && looksLikeRedo(e.text)) {
            stayUp = REDO_STAY_PROMPTS
            await update($, saved, old => ({ ...asSpent(old), redone: asSpent(old).redone + 1 }))
            void proof($, `redo after ${routed}: the next ${REDO_STAY_PROMPTS} prompts stay on ${inUse}`)
          }
          if (stayUp > 0) {
            stayUp--
            if (to) void proof($, `stays on ${inUse}: a cheaper answer was just redone (${stayUp} more)`)
            to = null
          }
          // A switch to a model whose cache is cold writes the whole chat to it: stay when that costs more than it saves.
          const now = await $.clock.now().catch(() => Date.now())
          if (to && !routeWorth(to, inUse, lastContext?.tokens ?? 0, { to: isWarm(to, now), inUse: !(cacheExpires > 0 && now >= cacheExpires) })) {
            void proof($, `stays on ${inUse}: ${to} has a cold cache, switching would cost more`)
            to = null
          }
          if (to) await update($, saved, old => ({ ...asSpent(old), moved: asSpent(old).moved + 1 }))
          if (to !== routed) {
            routed = to
            void proof($, to ? `this prompt runs on ${to} (the chat is on ${inUse})` : `back on ${inUse}`)
            $.ui.invalidate('ui.render')
          }
        }
        if (wantsModel && verdict.model !== inUse && verdict.model !== declined) {
          await update($, suggestion, () => verdict.model)
          $.ui.toast(`Suggestion: switch to ${verdict.model}? /effortless switch or /effortless keep`)
        } else if (verdict.model === inUse) {
          await update($, suggestion, () => null)
        }
      }
    } finally {
      // A judge that failed or threw ends the glow here.
      await endJudgeGlow($, 'end')
      await update($, isJudging, () => false)
    }
    return next(e)
  })

  // A switch from anywhere (the app's picker, /model, a fallback) moves the pick at once.
  on('classic.PostModelSwitch', async ($, e, next) => {
    const result = await next(e)
    await modelIs($, e.to_model)
    return result
  })

  on('turn.step', async function* ($, e, next) {
    // Every main-conversation response, whatever its effort, keeps the cache warm for its lifetime from now.
    const send = async function* (request: typeof e) {
      if (e.agentId === undefined) lastRequest = { index: e.index, appModel: e.model, appEffort: e.effort, model: request.model, effort: request.effort, at: Date.now() }
      const answer = yield* next(request)
      // Inside the hook ($ calls after it returns are refused), and never allowed to break the request.
      if (e.agentId === undefined && answer?.usage) markWarm(request.model, answer.usage, await $.clock.now().catch(() => Date.now()))
      // A prompt run on a cheaper model leaves the chat's own cache as it was: only the chat's model restarts the countdown.
      if (e.agentId === undefined && answer?.usage && request.model === e.model) await cacheTouched($, answer.usage).catch(() => undefined)
      if (e.agentId === undefined && answer?.usage) turnCost += weighted(answer.usage)
      if (answer?.usage) {
        const u = answer.usage
        const n = u.input_tokens + u.output_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
        await update($, chatTokens, t => t + n).catch(() => undefined)
      }
      if (e.agentId !== undefined && answer?.usage) await agentCost($, e.agentId, weighted(answer.usage)).catch(() => undefined)
      return answer
    }
    if (e.agentId === undefined) await setTurnBusy($, true)
    if (e.agentId === undefined) await modelIs($, e.model)
    if (e.agentId === undefined && typeof e.effort === 'string') {
      const seen = e.effort
      const isFirst = engineEffort === undefined
      const isByPerson = !isFirst && seen !== engineEffort
      engineEffort = seen
      // The first effort seen is the app's setting; a change the mod did not make is the person's.
      if (isFirst || isByPerson) await update($, appEffort, () => seen)
      // A new chat with Auto off starts from the pick kept from the last chat; the effort the app is on now is the
      // person's (they may have set it before this first prompt), so it wins. A pick made in this chat stays.
      const takesApp = isFirst && pickCarried && !(await read($, isAuto)) && (await read($, pick))?.effort !== seen
      if (isByPerson || takesApp) {
        await update($, isAuto, () => false)
        await $.store.set('isAuto', false)
        await choose($, { model: await sessionModel($), effort: seen, why: 'your pick in the app', by: 'manual' })
        void proof($, `request ${e.index}: you set effort ${seen} yourself, Auto off`)
        // The app has no event for its effort picker: this is the first request after the pick, so say it plainly.
        $.ui.toast(`pilot: Auto is off. You picked ${EFFORT_LABELS[seen as Effort] ?? seen}; turn Auto on to hand it back.`)
        return yield* send(e)
      }
    }
    // The judge put this prompt on a cheaper model: each of its requests goes there, at the picked effort.
    if (e.agentId === undefined && routed && (await read($, isAuto))) {
      const to = MODELS.find(m => m.key === routed)!.id
      const picked = await read($, pick)
      const effort = picked?.effort ?? e.effort
      void proof($, `request ${e.index}: ${e.model} -> ${to} at ${effort}`)
      const result = yield* send({ ...e, model: to, effort })
      if (picked && picked.by !== 'manual' && result.usage) await tally($, picked.effort, result.usage)
      return result
    }
    // A helper the judge picked an effort for at its spawn runs every request at it. Haiku takes no effort.
    if (e.agentId !== undefined && config.helpers === 'on' && typeof e.effort === 'string' && keyOf(e.model) !== 'haiku') {
      const effort = await helperEffortOf($, e.agentId)
      if (effort) {
        if (e.index === 0) void proof($, `helper ${e.agentId} request 0 (${e.model}): effort ${e.effort} -> ${effort}`)
        const result = yield* send({ ...e, effort })
        if (result.usage) await helperTally($, result.usage).catch(() => undefined)
        return result
      }
    }
    const p = await read($, pick)
    // Haiku takes no effort: decided by the model this request names, never by a stored pick.
    if (!p || keyOf(e.model) === 'haiku' || !cacheSafe(e.model)) return yield* send(e)
    // Auto off: the app's own effort goes out. A pick the judge made while Auto was on is not the person's choice, and
    // with the app already on the effort they want, the mod would never see a change to give way to.
    if (p.by !== 'manual' && !(await read($, isAuto))) return yield* send(e)
    // A subagent of a turn Auto picked for (Helpers off, or no verdict for it) runs at that turn's effort, no extra
    // judge call, but never below medium: a helper's answer goes back unchecked (see helperFloor). A subagent whose
    // definition sets its own effort cannot be told apart from one that inherits it, so it follows the turn too.
    if (e.agentId !== undefined) {
      if (p.by === 'manual') return yield* send(e)
      const floor = helperFloor(config.floor, config.ceiling)
      const effort = EFFORTS.indexOf(p.effort) < EFFORTS.indexOf(floor) ? floor : p.effort
      if (e.index === 0) void proof($, `subagent ${e.agentId} (${e.model}): effort ${e.effort ?? 'none'} -> ${effort}, the turn's`)
      return yield* send({ ...e, effort })
    }
    if (e.agentId === undefined) void proof($, `request ${e.index} (${e.model}): effort ${e.effort ?? 'none'} -> ${p.effort}`)
    const result = yield* send({ ...e, effort: p.effort })
    // Only requests Auto steered count.
    if (e.agentId === undefined && p.by !== 'manual' && result.usage) {
      await tally($, p.effort, result.usage)
      void proof(
        $,
        `response ${e.index} at ${p.effort}: ${result.usage.output_tokens} out, ${result.usage.cache_read_input_tokens ?? 0} cache read, ${result.usage.cache_creation_input_tokens ?? 0} cache write`,
      )
    }
    return result
  })

  // The only desktop UI: the effort in use, as purple text in the prompt footer, under the chat box, and a small
  // button that switches Auto off and on. A Button cannot be coloured and the footer draws no outline or tint, so
  // plain Text is what is purple. While the judge decides it says "Deciding…", for a moment after Auto switches the level it says
  // "Low → High", and while Auto is off it says "Off" in the dim colour. Auto is switched with /effortless auto.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    // The dashboard look keeps all of this in the band above the prompt; the app's own footer shows.
    if (e.surface !== 'desktop' || config.layout === 'default') return next(e)
    const { Box, Text, Button } = themedEls($.ui.resolve(e))
    const v = await snap($)
    const handoffNow = (await read($, handoffStage)) !== null
    const needsSetup = await read($, setupPending)
    const effortNow = effortOf(v, v.modelNow ?? 'sonnet')
    // Save mode paints the level in the running-hot band's ember until the limit resets.
    const saving = (await read($, saveUntil)) !== null
    const label = v.judging
      ? 'Deciding…'
      : v.switchedNow
        ? `${EFFORT_LABELS[v.switchedNow.from]} → ${EFFORT_LABELS[v.switchedNow.to]}`
        : effortNow
          ? EFFORT_LABELS[effortNow]
          : 'Auto'
    return (
      <Box flexDirection="row" gap={1} alignItems="center">
        {e.props.modes.length > 0 ? <Text dimColor>{e.props.modes.join(' & ')}</Text> : null}
        {/* Hovering the level puts a box behind it, like the app's own effort pill. The spaces are its padding:
            Text has no padding of its own. */}
        {v.auto && v.pausedNow ? (
          // Fable and older models: an effort change rewrites the cache there, so Auto waits.
          <Text dimColor hover={{ scope: 'effort', backgroundColor: HOVER_BOX }}>
            {' Paused '}
          </Text>
        ) : v.auto ? (
          <Text color={saving ? EMBER : ACCENT} bold hover={{ scope: 'effort', backgroundColor: HOVER_BOX }}>
            {` ${label} `}
          </Text>
        ) : (
          <Text dimColor hover={{ scope: 'effort', backgroundColor: HOVER_BOX }}>
            {' Off '}
          </Text>
        )}
        {/* The one thing to click: it switches Auto off and on. Text cannot be clicked, so it is a small button. */}
        <Button key="auto" plain dimColor label=" ⏻ " hover={{ scope: 'power', backgroundColor: HOVER_BOX }} onPress={() => toggleAutoEffort($)} />
        {/* Until a judge is picked the footer offers the setup; after that the same place opens the settings panel. */}
        {needsSetup ? (
          <Button
            key="setup"
            plain
            label=" Setup "
            hover={{ scope: 'setup', backgroundColor: HOVER_BOX }}
            onPress={async () => {
              await update($, setupStep, () => 'pick')
              $.ui.invalidate('ui.render')
            }}
          />
        ) : (
          <Button
            key="settings"
            plain
            dimColor
            label=" ⚙︎ "
            hover={{ scope: 'settings', backgroundColor: HOVER_BOX }}
            onPress={async () => {
              if (await read($, settingsOpen)) {
                await update($, settingsDraft, () => ({}))
                await update($, settingsOpen, () => false)
                $.ui.invalidate('ui.render')
              } else await openPluginSettings($)
            }}
          />
        )}
        {/* Hand off: opens the handoff bar above the prompt (quick or full, then what follows). One symbol, so it takes
            little room; pressed again it closes the bar. */}
        {config.hide.includes('handoff') ? null : (
          <Button
            key="handoff"
            plain
            dimColor
            label={handoffNow ? ' … ' : ' ⇥ '}
            hover={{ scope: 'handoff', backgroundColor: HOVER_BOX }}
            onPress={async () => ((await read($, handoffPick)) ? closeHandoffBar($) : openHandoffBar($))}
          />
        )}
        {/* How long the prompt cache stays warm: grey, yellow from 20 minutes, red from 5, then "cold" (the next message
            writes the whole context again). Nothing before the first response. */}
        {/* Cold: the band above the prompt says it and holds Compact; the footer only shows the state, in ice blue. */}
        {/* Hovering it reveals a card above the prompt (the cache scope); see the hover cards in AbovePrompt. */}
        {config.hide.includes('timer') ? null : v.cacheNow === 0 ? (
          <Text color={ICE} hover={{ scope: 'cache', backgroundColor: HOVER_BOX }}>{cacheLabel(0)}</Text>
        ) : v.cacheNow === null ? null : cacheColor(v.cacheNow) ? (
          <Text color={cacheColor(v.cacheNow)} hover={{ scope: 'cache', backgroundColor: HOVER_BOX }}>{cacheLabel(v.cacheNow)}</Text>
        ) : (
          <Text dimColor hover={{ scope: 'cache', backgroundColor: HOVER_BOX }}>{cacheLabel(v.cacheNow)}</Text>
        )}
      </Box>
    )
  })

  // The terminal's line under each reply ("Baked 3s") in the brand's colours, with the effort and the cache. The
  // desktop draws no such line; the bands above the prompt warn there (a card under the reply repeated them, removed).
  // The agent panel. Each subagent the chat sends off gets a record: spawned, what it does now, its own steps, how it
  // ended. Teammates and workflow agents are left out for now.
  on('agent.spawn', async ($, e, next) => {
    // Effort for helpers: the judge reads the subagent's task before it starts (a fork shares the chat's context and
    // keeps its effort). Without a verdict it runs at the chat's effort, as with the setting off.
    const helper = config.helpers === 'on' && !e.fork && !e.isTeammate && !e.workflow
      ? await helperEffort($, e.prompt, e.subagentType).catch(() => null)
      : null
    const waiting = helper ? { description: e.description, type: e.subagentType, parentId: e.parentAgentId, effort: helper.effort } : null
    if (waiting) helperWaiting = [...helperWaiting, waiting].slice(-20)
    const result = await next(e)
    if (waiting) {
      helperWaiting = helperWaiting.filter(w => w !== waiting)
      if ('agentId' in result && result.agentId && !helperPicks.has(result.agentId)) helperPicks.set(result.agentId, waiting.effort)
      if ('agentId' in result && result.agentId) {
        await update($, saved, old => {
          const t = asSpent(old)
          return { ...t, helpers: { ...t.helpers, runs: { ...t.helpers.runs, [waiting.effort]: (t.helpers.runs[waiting.effort] ?? 0) + 1 } } }
        }).catch(() => undefined)
        void proof($, `helper ${e.subagentType} "${e.description}": ${waiting.effort} (${helper?.why})`)
      }
    }
    if (e.isTeammate || e.workflow || !('agentId' in result) || !result.agentId) return result
    const id = result.agentId
    const now = await $.clock.now()
    const rec: AgentRec = { id, type: e.fork ? 'fork' : e.subagentType, task: e.description, state: 'running', startedAt: now, model: result.model }
    if (helper) {
      rec.effort = EFFORT_LABELS[helper.effort]
      rec.why = helper.why
    }
    if (e.parentAgentId) rec.parentId = e.parentAgentId
    await update($, agentsState, list => [...list.filter(a => a.id !== id), rec].slice(-40))
    return result
  })

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const i = e as unknown as { model?: string; subagent_type?: string }
    // A counter must never block a subagent: anything that throws here is swallowed.
    try {
      if (e.agentId === undefined) {
        if (i.model === 'haiku' || /haiku/i.test(i.subagent_type ?? '')) subagentRuns.haiku++
        else subagentRuns.other++
        $.ui.invalidate('ui.render')
      }
    } catch {}
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    const input = e as unknown as Record<string, unknown>
    const touch = touchOf(e.tool, input)
    const isList = e.tool === 'TodoWrite' || e.tool === 'TaskCreate' || e.tool === 'TaskUpdate'
    const known = id !== undefined && (await read($, agentsState)).some(a => a.id === id)
    if (!touch && !known && !(id === undefined && isList)) return next(e)
    if (known && id !== undefined) {
      const now = await $.clock.now()
      const file = touch ? (relPath(touch.path, await $.session.root()) ?? undefined) : undefined
      await agentSet($, id, a => ({ ...a, now: toolLine(e.tool, input), toolSince: now, file }))
    }
    const result = await next(e)
    const ok = !('deny' in result && result.deny) && !result.isError
    if (ok && touch) await fileTouched($, touch.path, touch.edited, id ?? 'main').catch(() => undefined)
    if (ok && id === undefined && isList) {
      if (e.tool === 'TodoWrite') await update($, agentSteps, () => stepsFromTodos(e.todos))
      else if (e.tool === 'TaskCreate') {
        const taskId = (result.result as { task?: { id?: string } } | undefined)?.task?.id
        if (taskId) await update($, agentSteps, steps => withTaskCreated(steps ?? [], taskId, e))
      } else await update($, agentSteps, steps => (steps ? withTaskUpdated(steps, e) : steps))
    }
    if (known && id !== undefined) {
      const steps = ok && e.tool === 'TodoWrite' ? stepsFromTodos(e.todos) : undefined
      await agentSet($, id, a => ({ ...a, toolSince: undefined, file: undefined, state: a.state === 'waiting' ? 'running' : a.state, ...(steps ? { steps } : {}) }))
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: 'effortless-agents' }, async ($, e) => {
    const els = themedEls($.ui.resolve(e))
    const agents = await read($, agentsState)
    const open = await read($, agentsOpen)
    const rows = Math.max(12, e.props.scroll.bodyRows)
    return agentsPane(
      {
        ...els,
        rows,
        nowMs: await $.clock.now(),
        title: 'This chat',
        open,
        ringSvg,
        cardArt: { source: DASH_SVG, width: FROST_WIDTH * 2, height: FROST_HEIGHT * 2 },
        onOpen: (id: string) => update($, agentsOpen, cur => (cur === id ? null : id)),
        files: await read($, agentFiles),
        steps: await read($, agentSteps),
        module: await read($, agentsModule),
        onModule: (key: string) => update($, agentsModule, cur => (cur === key ? null : key)),
      },
      agents,
    )
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (config.hide.includes('line')) return next(e)
    const { Box, Text } = themedEls($.ui.resolve(e))
    const v = await snap($)
    const effortNow = effortOf(v, v.modelNow ?? 'sonnet')
    const took = Math.max(1, Math.round(e.props.durationMs / 1000))
    return (
      <Box key="turn-line" flexDirection="row" gap={1}>
        <Text dimColor>{`${e.props.word} ${took < 60 ? `${took}s` : `${Math.floor(took / 60)}m ${took % 60}s`}`}</Text>
        <Text color={ACCENT}>{`✦ ${effortNow ? EFFORT_LABELS[effortNow] : 'Auto'}`}</Text>
        {v.cacheNow === null ? null : (
          <Text dimColor={cacheColor(v.cacheNow) === undefined} color={cacheColor(v.cacheNow)}>{`· ${v.cacheNow <= 0 ? 'cache cold' : `cache ${cacheLabel(v.cacheNow)}`}`}</Text>
        )}
      </Box>
    )
  })

  // Above the prompt: the terminal's rows (effort steps, Auto, and the model row when it is switched on).
  // On desktop nothing is drawn here, except the question when the judge suggests another model.
  // Draws the bands and the settings panel. Counted and guarded so /effortless debug can say whether the app asks
  // for it at all and whether drawing failed: an error here otherwise only leaves the slot empty.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Setup changes a reload cut off are saved from here: the reloaded plugin draws before anything else runs.
    void drainSetupSave($).catch(() => undefined)
    void afterLoad($).catch(() => undefined)
    await restoreCache($).catch(() => undefined)
    renderCalls++
    lastRenderAt = Date.now()
    void refreshAppearance($).catch(() => undefined)
    lastRenderProps = JSON.stringify(e.props).slice(0, 200)
    renderLog.push(`${new Date(lastRenderAt).toISOString()} ${loadedSession} ${lastRenderProps}`)
    if (!firstDrawLogged) {
      firstDrawLogged = true
      renderLog.push(`${new Date().toISOString()} ${loadedSession} first draw asked ${lastRenderAt - loadedAt} ms after load`)
      void writeRenderLog($).catch(() => undefined)
    }
    try {
    if (e.props.hasSurvey) {
      lastRenderBranch = 'stepped aside: the app has a survey in this spot'
      return next(e)
    }
    const asked = await $.store.get('openSettingsAt')
    const askedHere =
      asked && typeof asked === 'object' && (asked as { session?: string }).session === (await $.session.id().catch(() => ''))
        ? (asked as { at: number }).at
        : null
    if (typeof askedHere === 'number') {
      await $.store.set('openSettingsAt', null)
      if (Date.now() - askedHere < 60_000 && !(await read($, settingsOpen))) await update($, settingsOpen, () => true)
    }
    lastRenderBranch = (await read($, settingsOpen)) ? 'drew the settings panel' : 'drew a band or nothing'
    const { Box, Text, Button, Svg, Link } = themedEls($.ui.resolve(e))
    // The settings panel: a branded header bar, then one compact row per setting, a dim hint at the end of each row.
    if (await read($, settingsOpen)) {
      if (e.surface !== 'terminal') return slimSettings($, e)
      // The app gives this slot maxRows rows and drops a taller tree whole, without a word. With gaps the panel is 12
      // rows (2 border, 2 header, 4 settings, 4 gaps); without, 7.
      const roomy = (typeof e.props.maxRows === 'number' ? e.props.maxRows : 12) >= 12
      const { Input, Select } = themedEls($.ui.resolve(e))
      const opts = (values: readonly string[]) => values.map(value => ({ value, label: value }))
      // The skills and commands installed here, to pick the handoff writer from: no typing, no file paths. A plugin
      // cannot open a file dialog, and a skill is run by its name anyway.
      const skillNames = await read($, installedSkills)
      const hasKey = Boolean(await jevKey($).catch(() => undefined)) || Boolean(await typesafeKeyAnywhere($).catch(() => undefined))
      // A plain button with its own handler: a dismiss-role button may be taken by the app before onPress runs.
      const checking = await read($, updateCheck)
      const close = async () => {
        await update($, settingsDraft, () => ({}))
        await update($, judgeTest, () => null)
        await update($, settingsCard, () => null)
        await update($, settingsOpen, () => false)
        $.ui.invalidate('ui.render')
      }
      // The panel shows the draft over the saved settings; every control writes to the draft only.
      const draft = await read($, settingsDraft)
      const tested = await read($, judgeTest)
      const card = await read($, settingsCard)
      const openCard = (to: SettingsCard | null) => async () => {
        await update($, settingsCard, () => to)
        $.ui.invalidate('ui.render')
      }
      const set = (field: keyof SettingsDraft) => async (value: string) => {
        await update($, settingsDraft, d => ({ ...d, [field]: value }))
        $.ui.invalidate('ui.render')
      }
      const shown = {
        bias: draft.bias !== undefined ? Number(draft.bias) : config.bias,
        floor: (draft.floor ?? config.floor) as Effort,
        ceiling: (draft.ceiling ?? config.ceiling) as Effort,
        judge: (draft.judge ?? config.judge) as JudgeConfig['judge'],
        handoffAfter: draft.handoffAfter ?? config.handoffAfter,
        handoffSkill: draft.handoffSkill ?? config.handoffSkill,
        swampAt: draft.swampAt ?? String(config.swampAt),
        layout: draft.layout ?? config.layout,
        compactWith: draft.compactWith ?? config.compactWith,
        handoffButton: draft.handoffButton ?? config.handoffButton,
        modelAuto: draft.modelAuto ?? config.modelAuto,
        helpers: draft.helpers ?? config.helpers,
        theme: draft.theme ?? config.theme,
        appearance: draft.appearance ?? config.appearance,
      }
      // The Helpers switch slides like Auto's: the time it flipped, seen by the draw after the click.
      const helpersNow = await $.clock.now()
      if (helpersSeen !== undefined && helpersSeen !== shown.helpers) helpersFlipAt = helpersNow
      helpersSeen = shown.helpers
      // Dirty only while the draft differs from what is saved: a control set back to its saved value is no change.
      const sameSet = (a: string, b: string) => a.split(',').filter(Boolean).sort().join() === b.split(',').filter(Boolean).sort().join()
      const dirty = Object.entries(draft).some(([field, value]) =>
        value === undefined ? false
        : field === 'key' ? Boolean(value.trim())
        : field === 'hide' ? !sameSet(value, config.hide.join(','))
        : value !== String(config[field as Exclude<keyof SettingsDraft, 'key' | 'hide'>] ?? ''))
      const hidden = (draft.hide ?? config.hide.join(',')).split(',').filter(Boolean)
      const judgeName = shown.judge === 'haiku' ? 'Haiku' : hasKey || shown.judge === 'jev' ? 'Haiku + Jev' : 'Haiku'
      const summaries: Record<SettingsCard, string> = {
        effort: `${BIAS_WORDS[shown.bias + 2]} · ${shown.floor} to ${shown.ceiling}${shown.helpers === 'on' ? ' · helpers' : ''}`,
        model: shown.modelAuto === 'on' ? 'Cheaper when it can' : "Always the chat's",
        judge: tested && tested.ok !== null ? `${judgeName} · ${tested.ok ? 'working' : 'failing'}` : judgeName,
        handoff: `${shown.handoffSkill ? `/${shown.handoffSkill}` : 'Built in'} · compact alert at ${shown.swampAt}%`,
        show: `${shown.layout === 'minimal' ? 'Minimal' : 'Dashboard'} · ${2 - ['timer', 'reason'].filter(h => hidden.includes(h)).length} of 2 on`,
      }
      // The cache timer, the judge's line (who picked and how sure) and the three alerts can be switched off here (an
      // alert's ✕ only closes it for now); the rest is the mod itself. A ticked box in plain text, dim when off: lighter than a row of white buttons.
      const box = ([part, label]: readonly [Hideable, string]) => {
        const off = hidden.includes(part)
        const after = off ? hidden.filter(h => h !== part) : [...hidden, part]
        return (
          <Button key={`show-box-${part}`} plain dimColor={off} label={`${off ? '☐' : '☑'}︎ ${label}`}
            onPress={() => set('hide')(after.join(','))} />
        )
      }
      const toggles = ([['timer', 'Cache timer'], ['reason', 'Judge line']] as const).map(box)
      // The alerts sit in the Handoff card, next to the share of context the context alert waits for.
      const alertToggles = ([['swamp', 'Context alert'], ['hot', 'Running low alert'], ['cold', 'Cold cache alert']] as const).map(box)
      // The slider: five stops, the marker on the one in force. No animation, a click moves it.
      const track: unknown[] = []
      for (const n of [-2, -1, 0, 1, 2]) {
        if (n > -2) track.push(<Text key={`t${n}`} dimColor>─</Text>)
        track.push(<Button key={`bias${n + 2}`} plain label={n === shown.bias ? '◉' : '○'} onPress={() => set('bias')(String(n))} />)
      }
      // The terminal has no art and few rows: no gaps, one row under the title.
      const term = e.surface === 'terminal'
      const iconKind = { [ICON_EFFORT]: 'effort', [ICON_JUDGE]: 'judge', [ICON_HANDOFF]: 'handoff', [ICON_SHOW]: 'show' } as const
      const row = (key: string, label: string, icon: string, children: unknown[]) => (
        <Box key={key} flexDirection="row" gap={1} alignItems="center">
          <Box width={13} flexShrink={0} flexDirection="row" gap={1} alignItems="center">
            <Box flexShrink={0} width={2} alignItems="center">
              {Svg && !term ? (
                <Svg source={rowIconSvg(iconKind[icon as keyof typeof iconKind], DASH_DIM)} alt={label} width={14} height={14} />
              ) : (
                <Text color={ACCENT}>{icon}</Text>
              )}
            </Box>
            <Text dimColor>{label}</Text>
          </Box>
          <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center" flexShrink={1}>
            {children}
          </Box>
        </Box>
      )
      // The terminal's dropdown opens its list inside the wrapping row, which jumps the layout and is hard to click.
      // There a short list is a row of buttons, the picked one boxed; a long one (the skills) stays a dropdown.
      type Pick = { key: string; label?: string; value: string; options: { value: string; label: string }[]; onSelect: (v: string) => unknown }
      const pick = (p: Pick) => term && p.options.length <= 5 ? (
        <Box key={p.key} width="100%" flexDirection="row" flexWrap="wrap" columnGap={1} alignItems="center">
          {p.label ? <Text key={`${p.key}-label`} dimColor>{p.label}</Text> : null}
          {p.options.map(o => o.value === p.value ? (
            <Button key={`${p.key}-${o.value}`} variant="secondary" label={o.label} onPress={() => p.onSelect(o.value)} />
          ) : (
            <Button key={`${p.key}-${o.value}`} plain dimColor label={o.label} onPress={() => p.onSelect(o.value)} />
          ))}
        </Box>
      ) : (
        <Select key={p.key} label={p.label} value={p.value} options={p.options} onSelect={p.onSelect} />
      )
      const field = (key: string, input: unknown, width: number) => (
        <Box key={key} width={width} flexShrink={1}>
          {input}
        </Box>
      )
      // One column, a row per setting, its hint at the end. The header is three absolute layers, drawn in order (bar and
      // art, then the title, then the buttons): an absolute layer covers whatever is in the flow, so nothing of the
      // header is in the flow but a spacer that keeps its row free.
      if (probeLevel === 1) {
        return (
          <Box key="probe" borderStyle="round" borderColor={BRAND_EDGE} paddingX={1}>
            <Text>effortless probe 1: a bare box</Text>
          </Box>
        )
      }
      // Probe 2 keeps only the frame and header; probe 3 keeps the rows of buttons and text, no pickers or fields.
      const frameOnly = probeLevel === 2
      const bare = probeLevel === 3
      // Desktop keeps title and buttons as absolute layers straight under the panel; the terminal gets a wrapping row.
      const headRow = (kids: unknown[]) => term
        ? <Box key="settings-head" flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap={2}>{kids}</Box>
        : kids
      const bugUrl = ownVersion ? `${REPORT_BUG_URL}?effortless=${encodeURIComponent(ownVersion)}` : REPORT_BUG_URL
      return (
        // The dashboard's look: the neutral band and its quiet edge, purple only on the star, no art behind the rows (it
        // made them busy). The entrance
        // sweep plays once, behind everything, as the panel opens.
        <Box key="settings" position="relative" flexDirection="column" gap={roomy && !term ? 1 : 0} paddingX={term ? 1 : 2} overflow="hidden"
          backgroundColor={DASH_BG} borderStyle="round" borderColor={DASH_EDGE}>
          {term ? null : introLayer({ Box, Svg }, 'settings', await introShows($, 'settings'))}
          {/* The top bar: barely a shade lighter than the band, holding the title, Save and the cross. */}
          {!term ? (
            <Box key="settings-bar" position="absolute" top={-1} left={0} right={0} height={3.5} overflow="hidden" backgroundColor={DASH_HEAD}>
              {/* The mark, big, tilted and cut off by the bar's edges, behind the title and the buttons. */}
              <Box key="settings-bar-mark" position="absolute" top={-2} right={20} marginTop={1}>
                <Svg source={SETTINGS_MARK} alt="effortless mark" width={140} height={140} />
              </Box>
              {/* A hairline along the bar's bottom: a one-pixel image stretched across (a Box cannot draw one pixel). */}
              <Box key="settings-rule" position="absolute" bottom={0} left={0} right={0} height={1} alignItems="flex-end">
                <Svg source={`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1" viewBox="0 0 1600 1" preserveAspectRatio="none"><rect width="1600" height="1" fill="${DASH_EDGE}"/></svg>`} alt="rule" width={1600} height={1} />
              </Box>
            </Box>
          ) : null}
          {/* Title and buttons are centred in the whole bar (it reaches from the border to the line under it), so the
              space above them equals the space below. The terminal has no bar: both sit in the flow on one row that
              wraps, since two absolute layers drew over each other in a narrow window ("SettCheck for updates"). */}
          {headRow([
          <Box key="settings-title" {...(term ? { flexShrink: 0 } : { position: 'absolute', top: 0, left: 2, height: 2.5 })} flexDirection="row" alignItems="center" gap={1}>
            {term ? <Text color={ACCENT} bold>✦</Text> : null}
            {Svg && !term ? <Svg source={SETTINGS_TITLE} alt="pilot" width={92} height={28} /> : <Text color={DASH_TEXT} bold>pilot</Text>}
            {ownVersion ? <Text color="#6b6b73">v{ownVersion}</Text> : null}
            {/* Inside a part: Back to the cards, then the part's name. */}
            {card === null ? (
              <Text dimColor>Settings</Text>
            ) : (
              <Box key="settings-trail" flexDirection="row" alignItems="center" gap={1}>
                {/* A real button: a dim "Settings" in a trail did not read as a way back. */}
                <Button key="settings-back" variant="secondary" label="← Back" onPress={openCard(null)} />
                <Text color={DASH_TEXT} bold>{CARDS.find(c => c.id === card)?.title}</Text>
              </Box>
            )}
            {dirty ? <Text dimColor> · unsaved changes</Text> : null}
          </Box>,
          <Box key="settings-actions" {...(term ? { flexShrink: 1, flexWrap: 'wrap', columnGap: 2 } : { position: 'absolute', top: 0, right: 2, height: 2.5, gap: 2 })} flexDirection="row" alignItems="center">
            {checking === 'checking' ? (
              <Text dimColor>Checking…</Text>
            ) : checking === 'newest' ? (
              <Text dimColor>✓ Up to date</Text>
            ) : checking.startsWith('found ') && (!ownVersion || isNewer(checking.slice(6), ownVersion)) ? (
              <Button key="settings-update" variant="primary" label={`Update to ${checking.slice(6)}`} onPress={async () => {
                const card = await read($, updateCard)
                await update($, updateCheck, () => 'idle')
                if (card) void runUpdate($, card)
                await close()
              }} />
            ) : (
              <Button key="settings-check-update" plain dimColor label="Check for updates" onPress={() => void checkUpdateNow($)} />
            )}
            {/* A terminal without link support prints the whole address after the label, so there it copies instead. */}
            {term ? (
              <Button key="settings-bug" plain dimColor label="Report a bug" onPress={async () => {
                const r = await $.ui.copy({ text: bugUrl, surface: e.surface }).catch(() => ({ isCopied: false as const }))
                $.ui.toast(r.isCopied ? `Bug report link copied: ${bugUrl}` : `pilot: report a bug at ${bugUrl}`)
              }} />
            ) : (
              <Text color="#9a9aa3"><Link href={bugUrl} label="Report a bug" /></Text>
            )}
            {/* Grey and inert until something changed: there is nothing to save. */}
            {dirty ? (
              <Button key="settings-save" variant="primary" hotkey="s" label="Save" onPress={() => saveDraft($)} />
            ) : (
              <Button key="settings-save" variant="secondary" dimColor label="Save" onPress={() => {}} />
            )}
            <Button key="settings-close" plain label="✕" onPress={close} />
          </Box>,
          ])}
          {term ? null : <Box key="settings-spacer" height={roomy ? 2 : 1} />}
          {frameOnly ? null : card === null ? (
            // The overview: a card per part, what it is set to in a few words. A card opens that part alone.
            <Box key="settings-cards" flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={term ? 0 : 1}>
              <Box position="absolute" top={0} left={0} />
              {CARDS.map(c => (
                <Box key={`card-${c.id}`} position="relative" flexDirection="column" flexGrow={1} width={0} minWidth={18}
                  paddingX={1} borderStyle="round" borderColor={DASH_EDGE} hover={{ backgroundColor: CARD_HOVER, borderColor: CARD_HOVER_EDGE }}>
                  <Box flexDirection="row" gap={1} alignItems="center">
                    {Svg && !term ? <Svg source={rowIconSvg(c.id, DASH_TEXT)} alt={c.title} width={14} height={14} /> : null}
                    {/* The terminal draws the blank buttons below as real spaces over the card's text, so there the
                        title itself is the button. (Full-width padded buttons per row looked worse: a big lit block.) */}
                    {term ? (
                      <Button key={`settings-card-${c.id}`} plain label={`${c.title} ›`} onPress={openCard(c.id)} />
                    ) : (
                      <Text color={DASH_TEXT} bold hover={{ color: '#ffffff' }}>{c.title}</Text>
                    )}
                  </Box>
                  <Text dimColor wrap="truncate" hover={{ dimColor: false, color: DASH_TEXT }}>{summaries[c.id]}</Text>
                  {/* The click takes the whole card: a button is one line high and centred in its box, whatever the box,
                      so three blank ones are spread from the top edge to the bottom one and overlap. The card lights as a
                      whole (its own hover); two, spaced around, left its edges and a stripe between the lines dead. */}
                  {term ? null : <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="column" justifyContent="space-between">
                    {/* Each button sits in a clipping box and does not shrink: in a narrow card a shrunk button cut its
                        blank label to "\u2026", three stacked dots on the card. 800 no-break spaces (about 2,000 px: one is ~2.6 px, measured with
                        tools/render-band --hit) cover a card alone on its row edge to edge; the box clips the rest. */}
                    {['', '-2', '-3'].map(n => (
                      <Box key={`settings-card-box-${c.id}${n}`} flexDirection="row" justifyContent="center" overflow="hidden">
                        <Box flexShrink={0}>
                          <Button key={`settings-card-${c.id}${n}`} plain hover={{ backgroundColor: '#00000000' }} label={'\u00a0'.repeat(800)} onPress={openCard(c.id)} />
                        </Box>
                      </Box>
                    ))}
                  </Box>}
                </Box>
              ))}
            </Box>
          ) : (
            // One part: Back, its name and what it does, then its controls.
            <Box key={`settings-${card}`} flexDirection="column" gap={roomy && !term ? 1 : 0} minHeight={term ? undefined : SETTINGS_BODY_H}>
              {/* An empty absolute child makes the box positioned, so its rows paint, and take clicks, over the
                  entrance sweep and the art (absolute layers cover every plain box, and the sweep stays until the next
                  redraw). */}
              <Box position="absolute" top={0} left={0} />
              {/* What the part does; Back and its name are in the top bar's trail. */}
              <Text dimColor wrap="truncate">{CARDS.find(c => c.id === card)?.about}</Text>
              <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="center">
                {card === 'effort' ? [
            <Text key="cheap" dimColor>Cheaper</Text>,
            <Box key="track" flexDirection="row" alignItems="center">
              {track}
            </Box>,
            <Text key="smart" dimColor>Smarter</Text>,
            ...(bare
              ? []
              : [
                  <Box key="gap" width={2} />,
                  pick({ key: "settings-floor", label: "Min", value: shown.floor, options: opts(EFFORTS), onSelect: set('floor') }),
                  pick({ key: "settings-ceiling", label: "Max", value: shown.ceiling, options: opts(EFFORTS), onSelect: set('ceiling') }),
                  // Effort for helpers on a row of its own: the dashboard's Auto switch exactly (switch, word, slide,
                  // one blank button laid over both), then what it does now.
                  <Box key="settings-helpers-row" width="100%" flexDirection="row" alignItems="center" gap={1}>
                    {Svg && !term ? (
                      <Box key="settings-helpers" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1}>
                        <Svg source={autoSwitchSvg(shown.helpers === 'on', helpersNow - helpersFlipAt)} alt={shown.helpers === 'on' ? 'Helpers on' : 'Helpers off'} width={26} height={15} />
                        <Text color={shown.helpers === 'on' ? DASH_TEXT : DASH_DIM}>Helpers</Text>
                        {/* The cards' cover: no-break spaces (plain ones collapse to a dot), wider than the switch and its
                            word, clipped to them, so the click reaches both edges. */}
                        <Box position="absolute" top={0} bottom={0} left={0} right={0} flexDirection="row" alignItems="center" justifyContent="center" overflow="hidden">
                          <Box flexShrink={0}>
                            <Button key="settings-helpers-switch" plain hover={{ backgroundColor: '#00000000' }} label={'\u00a0'.repeat(40)} onPress={() => set('helpers')(shown.helpers === 'on' ? 'off' : 'on')} />
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Button key="settings-helpers-switch" plain label={`${shown.helpers === 'on' ? '◉' : '○'} Helpers`} onPress={() => set('helpers')(shown.helpers === 'on' ? 'off' : 'on')} />
                    )}
                    <Text dimColor wrap="truncate">{shown.helpers === 'on' ? "The judge picks each subagent's effort, medium or more" : "Subagents run at the chat's effort"}</Text>
                  </Box>,
                ]),
] : card === 'judge' ? (bare ? [] : [
            pick({ key: "settings-judge-pick", value: shown.judge, options: [{ value: 'auto', label: hasKey ? 'Haiku + Jev' : 'Haiku (Jev if added)' }, { value: 'haiku', label: 'Haiku only' }], onSelect: v => set('judge')(v === 'haiku' ? 'haiku' : 'auto') }),
            ...(shown.judge !== 'haiku'
              ? [field('key-field', <Input key="settings-key" placeholder={hasKey ? 'Key saved. Paste to replace' : 'Paste TypeSafe key'}
                  value={draft.key ?? ''} submitLabel="ok" onInput={set('key')} onSubmit={set('key')} />, 30)]
              : []),
            <Button key="settings-judge-test" variant="secondary" dimColor={tested?.ok === null} label={tested?.ok === null ? 'Testing…' : 'Test'}
              onPress={async () => {
                if (tested?.ok === null) return
                await update($, judgeTest, () => ({ ok: null, text: '' }))
                $.ui.invalidate('ui.render')
                const result = await testJudge($, shown.judge, draft.key ?? '')
                await update($, judgeTest, () => result)
                $.ui.invalidate('ui.render')
              }} />,
            ...(tested && tested.ok !== null
              ? [<Text key="settings-judge-result" color={tested.ok ? '#7fd49b' : '#ff8a80'}>{`${tested.ok ? '✓' : '✗'} ${tested.text}`}</Text>]
              : []),
]) : card === 'model' ? (bare ? [] : MODEL_CHOICES.map(c => (
            <Box key={`model-${c.value}`} flexDirection="column" flexGrow={1} flexShrink={1} minWidth={26}>
              <Box flexDirection="row" gap={1} alignItems="center">
                <Button key={`settings-model-${c.value}`} plain label={`${shown.modelAuto === c.value ? '◉' : '○'} ${c.label}`} onPress={() => set('modelAuto')(c.value)} />
                {/* A warning in the cache countdown's yellow: this choice rarely pays. */}
                {c.tag ? <Text key={`model-tag-${c.value}`} color={YELLOW} bold>{`⚠ ${c.tag}`}</Text> : null}
              </Box>
              <Text dimColor wrap="wrap">{c.about}</Text>
            </Box>
          )).concat([
            // Which model writes a compaction's summary: a model choice, so it sits with the others.
            pick({ key: "settings-compact-with", label: "Compact with", value: shown.compactWith, options: [{ value: 'haiku', label: 'Haiku 5.5' }, { value: 'session', label: "Chat's model" }], onSelect: set('compactWith') }),
          ])) : card === 'handoff' ? (bare ? [] : [
            pick({ key: "settings-skill", label: "Handoff skill", value: shown.handoffSkill || '-', options: [
                { value: '-', label: 'pilot (built in)' },
                ...[...new Set([...(shown.handoffSkill ? [shown.handoffSkill] : []), ...skillNames])].map(name => ({ value: name, label: `/${name}` })),
              ], onSelect: v => set('handoffSkill')(v === '-' ? '' : v) }),
            pick({ key: "settings-swamp", label: "Compact alert at", value: shown.swampAt, options: SWAMP_STEPS.map(n => ({ value: String(n), label: `${n}%` })), onSelect: set('swampAt') }),
            pick({ key: "settings-handoff-button", label: "Handoff button", value: shown.handoffButton, options: [{ value: 'advised', label: 'When advised' }, { value: 'always', label: 'Always' }], onSelect: set('handoffButton') }),
            ...alertToggles,
]) : [
            ...(bare
              ? []
              : [
                  pick({ key: "settings-layout", label: "Look", value: shown.layout, options: [{ value: 'default', label: 'Dashboard' }, { value: 'minimal', label: 'Minimal' }], onSelect: set('layout') }),
                  pick({ key: "settings-appearance", label: "Appearance", value: shown.appearance, options: [{ value: 'auto', label: 'Match Claude Code' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }], onSelect: set('appearance') }),
                  pick({ key: "settings-theme", label: "Theme", value: shown.theme, options: [{ value: 'violet', label: 'Violet' }, { value: 'orange', label: 'Claude orange' }, { value: 'rose', label: 'Cherry blossom' }], onSelect: set('theme') }),
                ]),
            ...toggles,
            ...(bare ? [] : [uninstallButton($, themedEls($.ui.resolve(e)))]),
]}
              </Box>
            </Box>
          )}
        </Box>
      )
    }
    // The handoff bar: quick or full, then what follows, and a line saying what that does. Opened by ⇥ or the swamp
    // band's Handoff; Go keeps the choice for next time. Enter presses Go once the bar holds the keyboard.
    // The compact bar: an optional note for the summary, then Compact (or Enter).
    if (e.surface !== 'terminal' && (await read($, compactAsk))) {
      const { Input } = themedEls($.ui.resolve(e))
      const go = () => compactCold($, compactNote)
      // Built like the slim bar: one row, real Buttons holding their words. The old drawn pill, blank overlay buttons
      // and absolute art rendered in VS Code as a tall violet block with blank white and blue buttons.
      return (
        <Box key="compact-bar" flexDirection="row" alignItems="center" columnGap={1} paddingX={1}
          backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
          <Text bold color={ACCENT}>✦ Compact</Text>
          <Button key="compact-to-handoff" plain dimColor onPress={async () => { await update($, compactAsk, () => false); await openHandoffBar($) }}>{' Handoff instead '}</Button>
          <Box key="compact-field" flexGrow={1} flexShrink={1} minWidth={6}>
            <Input key="compact-note" placeholder="Summary (optional)"
                onInput={v => { compactNote = v }} onSubmit={v => { compactNote = v; void go() }} />
          </Box>
          <Button key="compact-go" variant="secondary" onPress={go}>{' Compact ↵ '}</Button>
          <Button key="compact-close" plain dimColor onPress={() => update($, compactAsk, () => false)}>{' ✕ '}</Button>
        </Box>
      )
    }
    const choice = await read($, handoffPick)
    if (choice) {
      const setBar = (change: Partial<HandoffChoice>) => async () => {
        if (change.kind && change.kind !== choice.kind) kindFlipAt = await $.clock.now()
        await update($, handoffPick, () => ({ ...choice, ...change }))
        // The write alone redraws the bar; a full invalidate redraws the art too, which flickers.
      }
      const { Select } = themedEls($.ui.resolve(e))
      const what = handoffWhat(choice, config.handoffSkill)
      // Go is the one lit button: the picked kind is a quiet box, the other plain text. The app draws a hotkey's
      // letter faint on a grey button, so only the terminal gets letters there.
      const term = e.surface === 'terminal'
      const controls = [
        (choice.kind === 'quick' ? (
          <Button key="handoff-quick" hotkey={term ? 'q' : undefined} variant="secondary" label="Quick" onPress={setBar({ kind: 'quick' })} />
        ) : (
          <Button key="handoff-quick" hotkey={term ? 'q' : undefined} plain dimColor label="Quick" onPress={setBar({ kind: 'quick' })} />
        )),
        (choice.kind === 'full' ? (
          <Button key="handoff-full" hotkey={term ? 'f' : undefined} variant="secondary" label="Full" onPress={setBar({ kind: 'full' })} />
        ) : (
          <Button key="handoff-full" hotkey={term ? 'f' : undefined} plain dimColor label="Full" onPress={setBar({ kind: 'full' })} />
        )),
        <Select key="handoff-after" value={choice.after}
          options={[
            { value: 'continue', label: 'Clear & carry on' },
            { value: 'confirm', label: 'Clear & wait' },
            { value: 'copy', label: 'Keep chat & copy' },
          ]}
          onSelect={v => setBar({ after: v as HandoffAfter })()} />,
        <Button key="handoff-go" variant="primary" autoFocus label="Go" onPress={() => goHandoff($, choice)} />,
        <Button key="handoff-close" plain role="dismiss" label="✕" onPress={() => closeHandoffBar($)} />,
      ]
      // The terminal says all of it; the desktop bar only what the picked kind does: the dropdown beside it already
      // says what happens after.
      const line = e.surface === 'terminal' ? `${what.by}. ${what.then}` : choice.kind === 'full' ? (config.handoffSkill ? `/${config.handoffSkill}` : 'Saves HANDOFF.md') : 'A few seconds'
      if (e.surface === 'terminal') return terminalPanel($, e, 'handoff-bar', '⇥ Handoff', line, controls)
      // One plain row like the slim bar: the absolute art and action layer drew as a tall block in VS Code.
      return (
        <Box key="handoff-bar" flexDirection="row" alignItems="center" columnGap={1} paddingX={1}
          backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
          <Text color={ACCENT} bold>⇥ Handoff</Text>
          <Text key="handoff-what" dimColor wrap="truncate">{line}</Text>
          <Box flexGrow={1} />
          <Button key="handoff-to-compact" plain dimColor onPress={async () => { await closeHandoffBar($); await openCompact($, e) }}>{' Compact instead '}</Button>
          {controls}
        </Box>
      )
    }
    // The setup guide, one step at a time: the judge (and only what that judge needs), the lean, the handoff, the
    // footer, then a word on what else is there. The choices are saved together at Done or ✕ (see setupDraft).
    const step = await read($, setupStep)
    if (step) {
      const { Input, Select } = themedEls($.ui.resolve(e))
      const draft = await read($, setupDraft)
      const shown = setupShown(draft, config)
      const pick = (field: keyof SettingsDraft, value: string) => update($, setupDraft, d => ({ ...d, [field]: value }))
      const go = (to: SetupStep | null) => () => goSetup($, to)
      const back = setupBack(step)
      const counter = setupCounter(step)
      // The ✕ closes the guide without picking: until a judge is picked the footer keeps offering "Setup".
      const nav = (forward: unknown) => [
        ...(back ? [<Button key="setup-back" plain dimColor label="Back" onPress={go(back)} />] : []),
        forward,
        <Button key="setup-close" plain role="dismiss" label="✕" onPress={() => closeSetup($)} />,
      ]
      const nextButton = <Button key="setup-next" variant="primary" label="Next" onPress={go(setupNext(step))} />
      // The title over one line of words on the left, the controls on the right. The controls are their own absolute
      // layer, drawn last: the app draws anything in the flow under the absolute art, where it takes no clicks
      // (position="relative" does not lift it). The spacer keeps the words clear of them; room is their width in
      // columns. The art is still: every click redraws the band.
      const band = (words: unknown, room: number, controls: unknown[]) => e.surface === 'terminal' ? (
        terminalPanel($, e, 'setup', counter ? `✦ pilot setup  ${counter}` : '✦ pilot setup', words, controls)
      ) : (
        <Box key="setup" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={BRAND_BG} borderStyle="round" borderColor={BRAND_EDGE}>
          <Box key="setup-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={BRAND_SVG} alt="effortless" width={FROST_WIDTH * 2} height={FROST_HEIGHT * 2} />
          </Box>
          <Box key="setup-words" position="relative" flexDirection="column" flexShrink={1} minWidth={0}>
            <Text color={ACCENT} bold wrap="truncate">
              {counter ? `✦ pilot setup  ${counter}` : '✦ pilot setup'}
            </Text>
            {typeof words === 'string' ? <Text key="setup-what" wrap="truncate">{words}</Text> : words}
          </Box>
          <Box flexGrow={1} minWidth={room} />
          <Box key="setup-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            {controls}
          </Box>
        </Box>
      )
      if (step === 'pick')
        return band('Haiku judges. Add Jev too?', 62, [
          // Haiku first and filled: it needs no key. Jev is the optional faster one; with a key, it is tried first and
          // Haiku stands in whenever it does not answer. Each mark sits tight against its own button.
          <Box key="pick-haiku" flexDirection="row" gap={1} alignItems="center">
            <Svg source={CLAUDE_MARK} alt="Claude" width={16} height={16} />
            <Button key="setup-haiku" variant="primary" label="Just Haiku (no key)" onPress={() => pickJudge($, 'haiku')} />
          </Box>,
          <Box key="pick-jev" flexDirection="row" gap={1} alignItems="center">
            <Svg source={TYPESAFE_MARK} alt="TypeSafe" width={12} height={18} />
            <Button key="setup-jev" variant="secondary" label="Add Jev (needs a key)" onPress={() => pickJudge($, 'jev')} />
          </Box>,
          ...nav(
            <Button key="setup-skip" plain dimColor label="Skip" onPress={async () => {
              await markSetupDone($)
              await goSetup($, 'lean')
            }} />,
          ),
        ])
      if (step === 'jev')
        return band('Key from typesafe.ai:', 52, [
          <Box key="key-field" width={30} flexShrink={1}>
            <Input key="setup-key" placeholder="TypeSafe key" value={draft.key ?? ''} submitLabel="Save"
              onInput={(v: string) => pick('key', v)}
              onSubmit={async (v: string) => {
                if (!v.trim()) return
                await update($, setupDraft, d => ({ ...d, key: undefined }))
                await saveJevKey($, v, false)
                await goSetup($, 'lean')
              }} />
          </Box>,
          ...nav(<Button key="setup-skip" plain label="Skip" onPress={go('lean')} />),
        ])
      if (step === 'lean') {
        // Five stops, the marker on the one picked. The track is lit in purple from the middle out to the marker, so it
        // shows which way it leans, and the words name the stop and say what it does.
        const lean = shown.bias
        const track: unknown[] = []
        for (const n of [-2, -1, 0, 1, 2]) {
          if (n > -2) {
            const lit = lean > 0 ? n > 0 && n <= lean : lean < 0 ? n <= 0 && n > lean : false
            track.push(lit ? <Text key={`t${n}`} color={ACCENT}>──</Text> : <Text key={`t${n}`} dimColor>──</Text>)
          }
          track.push(<Button key={`setup-bias${n + 2}`} plain label={n === lean ? '◉' : '○'} onPress={() => pick('bias', String(n))} />)
        }
        const [name, does] = LEAN_STOPS[lean + 2]
        const side = (label: string, lit: boolean) =>
          lit ? <Text key={label} color={ACCENT}>{label}</Text> : <Text key={label} dimColor>{label}</Text>
        return band(
          <Box key="setup-what" flexDirection="row" flexShrink={1} minWidth={0}>
            <Text color={ACCENT} bold wrap="truncate">{`${name}: `}</Text>
            <Text wrap="truncate">{does}</Text>
          </Box>,
          62,
          [
            side('Cheaper', lean < 0),
            <Box key="track" flexDirection="row" alignItems="center">
              {track}
            </Box>,
            side('Smarter', lean > 0),
            ...nav(nextButton),
          ],
        )
      }
      if (step === 'handoff') {
        const skillNames = await read($, installedSkills)
        return band('Who writes a Full ⇥ handoff?', 48, [
          <Select key="setup-skill" value={shown.handoffSkill || '-'}
            options={[
              { value: '-', label: 'pilot (built in)' },
              ...[...new Set([...(shown.handoffSkill ? [shown.handoffSkill] : []), ...skillNames])].map(name => ({ value: name, label: `/${name}` })),
            ]}
            onSelect={(v: string) => pick('handoffSkill', v === '-' ? '' : v)} />,
          ...nav(nextButton),
        ])
      }
      if (step === 'look') {
        // Match Claude Code is the default; the other two fix it. The choice shows at once.
        const mode = shown.appearance
        return band('Dark or light panels?', 56, [
          ...(['auto', 'dark', 'light'] as const).map(value => (
            <Button key={`setup-look-${value}`} plain label={`${mode === value ? '◉' : '○'} ${{ auto: 'Match Claude Code', dark: 'Dark', light: 'Light' }[value]}`} onPress={() => pick('appearance', value)} />
          )),
          ...nav(nextButton),
        ])
      }
      return band('⏻ Auto on or off. ⚙ all settings. Auto pauses on Fable.', 24, [
        ...nav(<Button key="setup-done" variant="primary" autoFocus label="Done" onPress={() => finishSetup($)} />),
      ])
    }
    // ponytail: the slim bar says every alert itself; the update and saved cards are skipped in the fork.
    // In the slim layout a running or just-landed compact/handoff shows its own plain card, nothing else.
    if (e.surface !== 'terminal' && config.layout === 'default') {
      const c = await compactCard($, !!e.props.isWorking)
      if (!c) return slimBar($, e)
      return handoffCardTree($, e, c, undefined,
        !cardRunning(c.kind) ? () => update($, handoffCard, card => (card && !cardRunning(card.kind) ? null : card)) : undefined)
    }
    // The judge the person picked is failing: Haiku stands in until it works again.
    const downReason = await read($, judgeDown)
    if (downReason && !config.hide.includes('down') && downReason !== (await read($, judgeDownHidden))) {
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'down', kind: 'down', color: SLATE, bg: SLATE_BG, edge: SLATE_EDGE, title: 'Judge down',
          detail: `${downReason}. Haiku stands in.`,
          buttons: [
            <Button key="down-settings" variant="primary" hotkey="s" label="Settings" onPress={() => openPluginSettings($)} />,
            <Button key="down-close" plain role="dismiss" label="✕" onPress={() => update($, judgeDownHidden, () => downReason)} />,
          ],
        })
      return (
        <Box key="down" position="relative" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={SLATE_BG} borderStyle="round" borderColor={SLATE_EDGE}>
          <Box key="down-art" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={DOWN_SVG} alt="judge down" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          {introLayer({ Box, Svg }, 'down', await introShows($, 'down'), '#7d8aa8', '#e6ecf8')}
          <Box flexShrink={0}>
            <Text color={SLATE} bold wrap="truncate">
              ✦ Judge down
            </Text>
          </Box>
          <Text wrap="truncate">{`${downReason}. Haiku stands in.`}</Text>
          <Box flexGrow={1} minWidth={30} />
          <Box key="down-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button key="down-settings" variant="primary" label="Open settings" onPress={() => openPluginSettings($)} />
            <Button key="down-close" plain role="dismiss" label="✕" onPress={() => update($, judgeDownHidden, () => downReason)} />
          </Box>
        </Box>
      )
    }
    // A usage limit is close: Save mode keeps Auto at medium or below until it resets.
    const heat = await read($, hot)
    if (heat && !config.hide.includes('hot') && hotVisible(heat, await hotClosedNow($))) {
      const saving = (await read($, saveUntil)) !== null
      const window = heat.kind === 'five_hour' ? '5h' : 'weekly'
      const resets = resetLabel(heat.resetsAt, await $.clock.now())
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'hot', kind: 'hot', color: EMBER, bg: EMBER_BG, edge: EMBER_EDGE, title: 'Running hot',
          detail: `${Math.round(heat.percent)}% of your ${window} limit used${resets ? ` · resets ${resets}` : ''}`,
          buttons: [
            <Button key="hot-save" variant="primary" hotkey="s" label={saving ? 'Save mode on' : 'Save mode'}
              onPress={async () => { $.ui.toast(`pilot: ${await toggleSave($)}`) }} />,
            <Button key="hot-close" plain role="dismiss" label="✕" onPress={() => closeHot($, heat)} />,
          ],
        })
      return (
        <Box key="hot" position="relative" flexDirection="row" gap={1} alignItems="center" paddingX={1} overflow="hidden"
          backgroundColor={EMBER_BG} borderStyle="round" borderColor={EMBER_EDGE}>
          <Box key="ember" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={EMBER_SVG} alt="embers" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          {introLayer({ Box, Svg }, 'hot', await introShows($, 'hot'), EMBER, '#ffd2a8')}
          <Box flexShrink={0}>
            <Text color={EMBER} bold wrap="truncate">
              ✦ Running hot
            </Text>
          </Box>
          <Text wrap="truncate">{`${Math.round(heat.percent)}% of your ${window} limit used${resets ? ` · resets ${resets}` : ''}`}</Text>
          <Box flexGrow={1} minWidth={30} />
          <Box key="hot-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button
              key="hot-save"
              variant="primary"
              label={saving ? 'Save mode on' : 'Save mode'}
              onPress={async () => {
                $.ui.toast(`pilot: ${await toggleSave($)}`)
              }}
            />
            <Button key="hot-close" plain role="dismiss" label="✕" onPress={() => closeHot($, heat)} />
          </Box>
        </Box>
      )
    }
    // A handoff or compact running or just done: said above the prompt, where it is seen at once.
    // A new version: offered, updating, or just updated (gone after UPDATED_CARD_MS or ✕). Desktop only; the terminal
    // has /effortless update.
    const savedAt = (await $.store.get('settingsSavedAt').catch(() => null)) as number | null
    if (typeof savedAt === 'number') {
      const since = (await $.clock.now().catch(() => Date.now())) - savedAt
      if (since >= 0 && since < SAVED_CARD_MS) {
        $.clock.after(SAVED_CARD_MS - since + 50, () => $.ui.invalidate('ui.render'))
        return savedCardTree($, e)
      }
    }
    const upd = e.surface === 'terminal' ? null : await read($, updateCard)
    if (upd && !(upd.stage === 'done' && (await $.clock.now()) - upd.at >= UPDATED_CARD_MS)) return updateCardTree($, e, upd)
    const compactNow = e.surface === 'terminal' ? null : await compactCard($, !!e.props.isWorking)
    if (compactNow)
      return handoffCardTree($, e, compactNow, undefined,
        !cardRunning(compactNow.kind) ? () => update($, handoffCard, card => (card && !cardRunning(card.kind) ? null : card)) : undefined)
    // The cache went cold: the next message rereads the whole chat at full price. Only worth a band on a big chat.
    const compacting = await read($, isCompacting)
    const coldTokens = compacting ? null : await coldWorth($)
    if (coldTokens !== null) {
      const line = `Next message rereads ${kTokens(coldTokens)} tokens at full price.`
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'cold', kind: 'cold', color: ICE, bg: ICE_BG, edge: ICE_EDGE, title: 'Chat went cold',
          detail: `${line} Hand off or compact first.`,
          buttons: [
            <Button key="cold-hide" plain hotkey="n" label="Not now" onPress={() => update($, isColdHidden, () => true)} />,
            <Button key="cold-compact" hotkey="c" label="Compact" onPress={() => openCompact($, e)} />,
            <Button key="cold-handoff" variant="primary" hotkey="h" label="Handoff" onPress={() => openHandoffBar($)} />,
          ],
        })
      // The art is a backdrop: an absolutely placed layer behind the right side, so the words and buttons sit on it.
      return (
        <Box
          key="cold"
          position="relative"
          flexDirection="row"
          gap={1}
          alignItems="center"
          paddingX={1}
          overflow="hidden"
          backgroundColor={ICE_BG}
          borderStyle="round"
          borderColor={ICE_EDGE}
        >
          {/* Taller than the band and clipped by it, so the frost reaches every edge on the right. */}
          <Box key="frost" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={FROST_SVG} alt="frost" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          <Box key="cold-glow" position="absolute" top={0} left={0} right={0} bottom={0}>
            <Svg source={inPhase(coldGlowSvg(), (await $.clock.now()) % COLD_GLOW_MS)} alt="cold glow" width={AUTO_GLOW_W} height={AUTO_GLOW_H} />
          </Box>
          {introLayer({ Box, Svg }, 'cold', await introShows($, 'cold'), ICE, '#cfeeff')}
          <Box flexShrink={0}>
            <Text color={ICE} bold wrap="truncate">
              ✦ Chat went cold
            </Text>
          </Box>
          <Text wrap="truncate">{line}</Text>
          {/* Room for the buttons, which sit in their own layer after the frost so they are drawn on top of it. */}
          <Box flexGrow={1} minWidth={34} />
          <Box key="cold-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button key="cold-hide" plain label="Not now" onPress={() => update($, isColdHidden, () => true)} />
            <Button key="cold-compact" variant="secondary" label="Compact" onPress={() => openCompact($, e)} />
            <Button key="cold-handoff" variant="primary" label="Handoff" onPress={() => openHandoffBar($)} />
          </Box>
        </Box>
      )
    }
    // The context is swamped: every message re-reads all of it. Compact or hand off, right here.
    const swampTokens = await read($, swamped)
    const hiddenAt = await read($, swampHiddenAt)
    if (swampTokens !== null && !config.hide.includes('swamp') && !turnBusy() && !compacting && (hiddenAt === null || swampTokens >= hiddenAt + SWAMP_REGROW)) {
      const handing = (await read($, handoffStage)) !== null
      if (e.surface === 'terminal')
        return terminalBand($, e, {
          key: 'swamp', kind: 'swamp', color: BOG, bg: BOG_BG, edge: BOG_EDGE, title: 'Chat is getting swamped',
          detail: `${Math.round(swampTokens / 1000)}k tokens${lastContext && lastContext.window ? ` (${lastContext.percent}% of context)` : ''} re-read every message.`,
          buttons: [
            <Button key="swamp-compact" variant="primary" label="Compact" onPress={() => openCompact($, e)} />,
            <Button key="swamp-handoff" label={handing ? 'Handing off…' : 'Handoff'} onPress={() => openHandoffBar($)} />,
            <Button key="swamp-close" plain role="dismiss" label="✕" onPress={() => update($, swampHiddenAt, () => swampTokens)} />,
          ],
        })
      return (
        <Box
          key="swamp"
          position="relative"
          flexDirection="row"
          gap={1}
          alignItems="center"
          paddingX={1}
          overflow="hidden"
          backgroundColor={BOG_BG}
          borderStyle="round"
          borderColor={BOG_EDGE}
        >
          <Box key="bog" position="absolute" top={-1} right={0} bottom={-1}>
            <Svg source={SWAMP_SVG} alt="swamp" width={FROST_WIDTH} height={FROST_HEIGHT} />
          </Box>
          {introLayer({ Box, Svg }, 'swamp', await introShows($, 'swamp'), '#6f9a4f', '#d6ecc2')}
          <Box flexShrink={0}>
            <Text color={BOG} bold wrap="truncate">
              ✦ Chat is getting swamped
            </Text>
          </Box>
          {/* How full the context is, as a ring and a figure: the tokens alone do not say how close the limit is. */}
          {lastContext && lastContext.window ? (
            <Box key="swamp-ring" flexShrink={0} flexDirection="row" gap={1} alignItems="center">
              <Svg source={ringSvg(lastContext.percent, BOG)} alt={`${lastContext.percent}% of context`} width={16} height={16} />
              <Text color={BOG}>{`${lastContext.percent}%`}</Text>
            </Box>
          ) : null}
          <Text wrap="truncate">
            {`${Math.round(swampTokens / 1000)}k tokens re-read every message.`}
          </Text>
          <Box flexGrow={1} minWidth={34} />
          <Box key="swamp-actions" position="absolute" top={0} right={1} bottom={0} flexDirection="row" gap={1} alignItems="center">
            <Button key="swamp-compact" variant="primary" label="Compact" onPress={() => openCompact($, e)} />
            <Button key="swamp-handoff" label={handing ? 'Handing off…' : 'Handoff'} onPress={() => openHandoffBar($)} />
            <Button key="swamp-close" plain role="dismiss" label="✕" onPress={() => update($, swampHiddenAt, () => swampTokens)} />
          </Box>
        </Box>
      )
    }
    // At rest: the dashboard, unless the person picked the minimal look (the footer's buttons, no band).
    if (config.layout === 'default') {
      if (e.surface === 'terminal') return dashboardBand($, e)
      const { question } = await effortRows($, e)
      const dash = await dashboardBand($, e)
      return question ? (
        <Box key="dash-col" flexDirection="column">
          {question}
          {dash}
        </Box>
      ) : dash
    }
    // The minimal look draws no dashboard: mark the rest here, so the next band plays its entrance.
    introKind = 'rest'
    const { question, rows } = await effortRows($, e)
    if (e.surface !== 'terminal') return question ?? next(e)
    return rows
    } catch (error) {
      lastRenderError = (error instanceof Error ? error.message : String(error)).slice(0, 300)
      return next(e)
    } finally {
      if (glowReadAt !== null) {
        drawLead = drawLead * 0.7 + Math.min(150, Date.now() - glowReadAt + 16) * 0.3
        glowReadAt = null
      }
      // How long the draws take, for the first few after a load: the render log says where a slow start goes.
      if (drawsTimed < 5) {
        drawsTimed++
        renderLog.push(`${new Date().toISOString()} ${loadedSession} draw took ${Date.now() - lastRenderAt} ms`)
      }
    }
  })
}
