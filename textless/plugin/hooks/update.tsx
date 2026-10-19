// The update card above the prompt, as effortless has it: a new public version is offered, one press updates it (the
// marketplace, the plugin, then a reload of the plugins), and "Updated" shows with What's new, Share and the repo.
// Where textless learns of a new version: the newest entry of plugin/public.json, written only by scripts/publish.sh.
import { logoSvg } from './logo'

// textless lives in the effortless repo (folder textless/), installed as textless@effortless.
export const REPO_URL = 'https://github.com/HeyCubit/effortless'
export const SITE_URL = 'https://heycubit.github.io/effortless/textless/'
export const WHATS_NEW_URL = 'https://heycubit.github.io/effortless/textless/whats-new/'
// The API, not raw.githubusercontent.com: the raw file sits behind a cache that lagged releases behind.
export const RELEASES_URL = 'https://api.github.com/repos/HeyCubit/effortless/contents/textless/plugin/public.json?ref=main'
export const RELEASES_PATH = 'textless/plugin/public.json'
// How often a chat looks for a new version, how long Later keeps one away, and how long "Updated" stays.
export const UPDATE_CHECK_MS = 6 * 3600_000
const UPDATE_SNOOZE_MS = 24 * 3600_000
export const UPDATED_CARD_MS = 30_000
export const UPDATE_LOAD_WAIT_MS = 15_000
// The reload is queued until Claude is idle: pressed mid-reply, it waits for the reply to finish.
export const UPDATE_LOADING = 'Installed. Loads as soon as Claude is idle.'
export const NEW_CHAT = 'Installed. Open a new chat to load it.'
// A plain /reload-plugins holds back changes it thinks need a new chat and keeps the old code running.
export const RELOAD_ARGS = '--force'
// The repo is public, so HTTPS needs no key. Without it, git reaches GitHub over SSH and fails for anyone with no SSH
// key there.
export const GITHUB_OVER_HTTPS = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'url.https://github.com/HeyCubit/.insteadOf', GIT_CONFIG_VALUE_0: 'git@github.com:HeyCubit/' }

export type UpdateCard = { stage: 'offer' | 'updating' | 'done' | 'failed'; version: string; note: string; at: number; detail?: string }
export type Release = { version: string; note: string }

/** Whether version `a` is newer than `b`, both `major.minor.patch`. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}
/** The newest release in public.json's text (newest first), or nothing when it does not parse. */
export function latestRelease(text: string): Release | undefined {
  try {
    const list = JSON.parse(text) as { version?: unknown; note?: unknown }[]
    const top = Array.isArray(list) ? list[0] : undefined
    if (!top || typeof top.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(top.version)) return undefined
    return { version: top.version, note: typeof top.note === 'string' ? top.note : '' }
  } catch {
    return undefined
  }
}
/** Whether Later still keeps `version` away at `now`. */
export function updateSnoozed(hidden: { version: string; at: number } | null, version: string, now: number): boolean {
  return !!hidden && hidden.version === version && now - hidden.at < UPDATE_SNOOZE_MS
}
/** The line of a failed `claude plugin` run that says what went wrong. */
export function updateFailure(output: string): string {
  const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const line = lines.find(l => /^(fatal|error):/i.test(l)) ?? lines.find(l => l.startsWith('✘')) ?? lines.at(-1) ?? ''
  const why = line.replace(/^(fatal|error):\s*/i, '').replace(/^✘\s*/, '')
  return why.length > 160 ? `${why.slice(0, 159)}…` : why
}

/** Where `claude` may be: on PATH, then where the official installers put it. */
export function claudeCandidates(home: string | undefined): string[] {
  if (!home) return ['claude']
  const win = /^[A-Za-z]:/.test(home)
  const sep = home.includes('\\') ? '\\' : '/'
  return ['claude', [home.replace(/[\\/]+$/, ''), '.local', 'bin', win ? 'claude.exe' : 'claude'].join(sep)]
}
const NOT_STARTED = /ENOENT|not found or is in an unsafe location|failed to start/i
/** For a `claude` that would not start: what to install, in the person's own shell. */
export function noClaudeHint(error: string, home: string | undefined): string | undefined {
  if (!NOT_STARTED.test(error)) return undefined
  const install = home && /^[A-Za-z]:/.test(home) ? 'irm https://claude.ai/install.ps1 | iex' : 'curl -fsSL https://claude.ai/install.sh | bash'
  return `This needs the Claude Code CLI. Install it with ${install}, then reopen the app.`
}
/** The folder of this plugin inside its marketplace's copy: the marketplace's own list says where textless sits. */
export function pluginDirIn(marketplaceJson: string): string | undefined {
  try {
    const m = JSON.parse(marketplaceJson) as { plugins?: { name?: string; source?: unknown }[] }
    const entry = m.plugins?.find(p => p.name === 'textless')
    const src = entry?.source
    const path = typeof src === 'string' ? src : src && typeof src === 'object' ? (src as { path?: unknown }).path : undefined
    return typeof path === 'string' ? path.replace(/^\.\//, '').replace(/[\\/]+$/, '') : undefined
  } catch {
    return undefined
  }
}
/** The command that puts the installed version's files over the running copy, or nothing when they are one folder. */
export function syncPlan(running: string, installed: string | undefined): string[] | undefined {
  const norm = (x: string) => x.replace(/[\\/]+$/, '').replaceAll('\\', '/')
  const cached = (x: string) => /\/cache\//.test(norm(x))
  if (!installed || norm(installed) === norm(running) || !cached(installed) || !cached(running)) return undefined
  return /^[A-Za-z]:|\\/.test(running)
    ? ['robocopy', installed, running, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP']
    : ['cp', '-R', `${installed}/.`, running]
}
// The card's look. textless's orange on the site's warm near black; green once updated, as effortless does.
const ORANGE = '#d97757'
const BRAND_BG = '#1a1614'
const BRAND_EDGE = '#6b3d2c'
const DONE_ACCENT = '#7fe0a4'
const UPDATED_BG = '#08090a'
const UPDATED_EDGE = '#1f4a33'
const UPDATED_HOVER = '#ffffff1f'
const CLOSE_HOVER = '#00000040'
const ART_W = 440
const ART_H = 64
const TITLE_MARK = 16

// A small fixed random, so the dither is the same on every draw (a changing source makes the app flicker).
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
// Pixels in the brand colour, thicker to the right, on a 360x30 field like effortless's bands.
function dither(color: string, seed: number) {
  const r = rand(seed)
  const px: string[] = []
  for (let x = 150; x < 360; x += 2)
    for (let y = 0; y < 30; y += 2) {
      const t = (x - 150) / 210
      if (r() < t * t * 0.55) px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" fill-opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`)
    }
  return px.join('')
}
// Clawd, the textless mascot: body, eyes, arms, and legs in two steps so he can walk.
const CLAWD_BODY = ['..########..', '..#e####e#..', '############', '############', '..########..']
const LEGS_A = ['..#.#..#.#..', '..#.#..#.#..']
const LEGS_B = ['...#.#..#.#.', '..#.#..#.#..']
function rows(lines: string[], x0: number, y0: number, color: string, eye = '#1a1614') {
  return lines.flatMap((line, y) => [...line].map((c, x) => (c === '#' ? `<rect x="${x0 + x}" y="${y0 + y}" width="1" height="1" fill="${color}"/>` : c === 'e' ? `<rect x="${x0 + x}" y="${y0 + y}" width="1" height="1" fill="${eye}"/>` : ''))).join('')
}
const SPARKS = [[214, 6], [252, 21], [281, 9], [306, 24], [236, 15], [270, 3]]
function sparkles(color: string) {
  return SPARKS.map(([x, y], i) => `<g class="tw" style="animation-delay:${(i * 0.37).toFixed(2)}s"><rect x="${x}" y="${y - 1}" width="1" height="3" fill="${color}"/><rect x="${x - 1}" y="${y}" width="3" height="1" fill="${color}"/></g>`).join('')
}
function art(o: { color: string; light: string; walking: boolean; mirrored?: boolean; clawd?: boolean; seed: number }) {
  const style = '<style>svg{background:transparent;display:block}.tw{animation:tw 2.6s steps(1) infinite;opacity:0}@keyframes tw{0%,55%{opacity:0}60%,85%{opacity:1}}'
    + '.la{animation:la .36s steps(1) infinite}.lb{animation:lb .36s steps(1) infinite}@keyframes la{0%{opacity:1}50%{opacity:0}}@keyframes lb{0%{opacity:0}50%{opacity:1}}'
    + '.bob{animation:bob .36s steps(1) infinite}@keyframes bob{50%{transform:translateY(-1px)}}'
    + '.dust{animation:dust .9s linear infinite}@keyframes dust{from{transform:translateX(0)}to{transform:translateX(-60px)}}</style>'
  const fade = `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${o.color}" stop-opacity="0"/><stop offset="1" stop-color="${o.color}" stop-opacity=".22"/></linearGradient></defs><rect width="360" height="30" fill="url(#g)"/>`
  const clawdX = 334, clawdY = 11
  const legs = o.walking
    ? `<g class="la">${rows(LEGS_A, clawdX, clawdY + 5, o.color)}</g><g class="lb">${rows(LEGS_B, clawdX, clawdY + 5, o.color)}</g>`
    : rows(LEGS_A, clawdX, clawdY + 5, o.color)
  // While it updates Clawd runs on the spot and pixels stream past behind him.
  const dust = o.walking ? `<g class="dust">${[0, 60, 120, 180].map(dx => [[300, 20], [312, 13], [289, 25], [318, 23], [296, 8]].map(([x, y]) => `<rect x="${x - dx}" y="${y}" width="2" height="1" fill="${o.light}" fill-opacity=".7"/>`).join('')).join('')}</g>` : ''
  const clawd = o.clawd === false ? '' : `<g class="${o.walking ? 'bob' : ''}">${rows(CLAWD_BODY, clawdX, clawdY, o.color)}${legs}</g>`
  const body = `${fade}${dither(o.color, o.seed)}${sparkles(o.light)}${dust}${clawd}`
  const inner = o.mirrored ? `<g transform="translate(360 0) scale(-1 1)">${body}</g>` : body
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}" viewBox="0 0 360 30" preserveAspectRatio="${o.mirrored ? 'xMinYMid' : 'xMaxYMid'} slice" shape-rendering="crispEdges">${style}${inner}</svg>`
}
const OFFER_ART = art({ color: ORANGE, light: '#ffc9b0', walking: false, seed: 7 })
const UPDATING_ART = art({ color: ORANGE, light: '#ffc9b0', walking: true, seed: 7 })
// Updated: the art in green behind the title on the left, with no Clawd: the links sit on the right.
const DONE_ART = art({ color: '#3fae6e', light: '#a8ecc2', walking: false, mirrored: true, clawd: false, seed: 7 })
const MARK = logoSvg(ORANGE)
const DONE_MARK = logoSvg(DONE_ACCENT)
const SHARE_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16"><path fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8 10V1.8M4.8 4.8L8 1.6l3.2 3.2M2.5 8.5v4.8c0 .4.3.7.7.7h9.6c.4 0 .7-.3.7-.7V8.5"/></svg>`
const DIVIDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="18" viewBox="0 0 1 18"><rect width="1" height="18" fill="#ffffff" fill-opacity=".16"/></svg>`
const GITHUB_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#ffffff" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`

/** The update card: the offer, Clawd running while it updates, green once done. */
export type CardActions = { update: () => void; hide: () => void; share: () => void; copy: (text: string) => void; id: string }
export function updateCardTree(els: Record<string, any>, c: UpdateCard, act: CardActions) {
  const { Box, Text, Svg, Button, Link } = els
  const landed = c.stage === 'done'
  const words = {
    offer: [`textless ${c.version} is out`, c.note || 'A new version is ready.'],
    updating: ['Updating…', `Getting ${c.version}. Takes a few seconds.`],
    done: [`Updated to ${c.version}`, c.detail ?? 'Loaded in this chat.'],
    failed: ['Update failed', c.detail ?? `Try again, or run claude plugin update ${act.id}.`],
  }[c.stage]
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
  const installLine = c.stage === 'failed' ? c.detail?.match(/(irm \S+ \| iex|curl -fsSL \S+ \| bash)/)?.[1] : undefined
  const controls =
    c.stage === 'offer'
      ? [
          own('tl-update-go-box', <Button key="tl-update-go" variant="primary" label="Update" onPress={act.update} />),
          own('tl-update-later-box', <Button key="tl-update-later" variant="secondary" label="Later" onPress={act.hide} />),
        ]
      : c.stage === 'failed'
        ? [
            ...(installLine
              ? [own('tl-update-copy-box', <Button key="tl-update-copy" variant="secondary" label="Copy install command" onPress={() => act.copy(installLine)} />)]
              : []),
            own('tl-update-go-box', <Button key="tl-update-go" variant="primary" label="Try again" onPress={act.update} />),
            own('tl-update-close-box', <Button key="tl-update-close" plain label="✕" hover={{ backgroundColor: CLOSE_HOVER }} onPress={act.hide} />),
          ]
        : landed
          ? [
              own('tl-update-link-box', <Text color="#ffffff" bold><Link href={WHATS_NEW_URL} label="What's new →" /></Text>),
              divider('tl-update-div-1'),
              own('tl-update-share-box', (
                // The icon and the word, with a blank button laid over both: its hover veil covers the icon too.
                <Box key="tl-update-share" position="relative" flexDirection="row" alignItems="center" gap={1} paddingX={1} flexShrink={0}>
                  <Svg source={SHARE_MARK_SVG} alt="Share" width={14} height={14} />
                  <Text>Share</Text>
                  <Box position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                    <Button key="tl-update-share-go" plain hover={{ backgroundColor: UPDATED_HOVER }} label={' '.repeat(23)} onPress={act.share} />
                  </Box>
                </Box>
              )),
              divider('tl-update-div-2'),
              own('tl-update-star-box', (
                <Box key="tl-update-star" flexDirection="row" alignItems="center" gap={1}>
                  <Svg source={GITHUB_MARK_SVG} alt="GitHub" width={14} height={14} />
                  <Link href={REPO_URL} label="Star on GitHub" />
                </Box>
              )),
              own('tl-update-close-box', <Button key="tl-update-close" plain label="✕" hover={{ backgroundColor: UPDATED_HOVER }} onPress={act.hide} />),
            ]
          : []
  return (
    <Box key="tl-update-card" position="relative" flexDirection="row" alignItems="center" paddingX={1} overflow="hidden"
      backgroundColor={landed ? UPDATED_BG : BRAND_BG} borderStyle="round" borderColor={landed ? UPDATED_EDGE : BRAND_EDGE}>
      <Box key="tl-update-art" position="absolute" top={-1} {...(landed ? { left: 0 } : { right: 0 })} bottom={-1}>
        <Svg source={landed ? DONE_ART : c.stage === 'updating' ? UPDATING_ART : OFFER_ART} alt={c.stage === 'updating' ? 'updating' : 'textless'} width={ART_W * 2} height={ART_H * 2} />
      </Box>
      <Box key="tl-update-words" position="relative" flexDirection="column" flexShrink={1} minWidth={0}>
        <Box key="tl-update-title" flexDirection="row" alignItems="center" flexShrink={1} minWidth={0}>
          <Box flexShrink={0} marginRight={1} alignItems="center">
            <Svg source={landed ? DONE_MARK : MARK} alt="textless" width={TITLE_MARK} height={TITLE_MARK} />
          </Box>
          <Text color={landed ? DONE_ACCENT : ORANGE} bold wrap="truncate">{words[0]}</Text>
        </Box>
        <Text wrap="truncate">{words[1]}</Text>
      </Box>
      <Box key="tl-update-controls" position="relative" flexGrow={1} flexDirection="row" justifyContent="flex-end" alignItems="center" gap={1}>
        {/* Positioned by an empty absolute child, so it paints over the art and takes the clicks. */}
        <Box position="absolute" top={0} left={0} />
        {controls}
      </Box>
    </Box>
  )
}
