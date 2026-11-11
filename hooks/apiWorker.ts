// The API worker: coding jobs run as a headless agent on the person's own API key (Anthropic, OpenAI or any
// Anthropic-compatible endpoint), so API credits pay for the heavy work instead of the subscription's limits.
// The chat calls it as a tool; the worker is `claude -p` (or `codex exec` for OpenAI) in the chat's folder.
import type { EngineInterface } from 'claude-code'

export type ApiProvider = 'off' | 'anthropic' | 'openai' | 'other'
export type ApiConfig = { provider: ApiProvider; key: string; baseUrl: string; model: string }

export function readApiConfig(options: unknown): ApiConfig {
  const o = (options ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const provider = (['anthropic', 'openai', 'other'] as const).find(p => p === str(o.apiProvider)) ?? 'off'
  return { provider, key: str(o.apiKey), baseUrl: str(o.apiBaseUrl), model: str(o.apiModel) }
}

/** Why the worker cannot run with these settings, or null when it can. */
export function apiProblem(c: ApiConfig): string | null {
  if (c.provider === 'off') return 'off'
  if (!c.key) return 'no API key set'
  if (c.provider === 'other' && !/^https:\/\//.test(c.baseUrl)) return 'other needs an https base URL'
  return null
}

// The worker's own rules, on top of the task the chat wrote.
const WORKER_RULES = `You are a coding worker started by pilot on the user's API key. Do the task fully, then stop.
- Load the skills the task names with the Skill tool before you start, and follow them.
- NEVER: git commit, push, reset, rebase, checkout of other branches; deploys; database writes; paid media generation;
  deleting files the task does not name. The chat that sent you reviews and commits.
- Run the check the task names (tests, tsc, build) before you finish.
- End with at most 15 lines: STATUS (done | partly | stopped), FILES changed, CHECK result, NOTES.`

// Commands the worker is refused by name. Not the boundary (a name list is easy to step around: `bash -c`, a full
// path, `node -e`); the sandbox below is. These only stop the obvious attempt early, with a clear refusal.
const DENIED = ['git push', 'git commit', 'git reset', 'git rebase', 'gh', 'vercel', 'ssh', 'scp', 'rsync', 'curl', 'wget',
  'env', 'printenv', 'npm publish', 'supabase'].map(c => `Bash(${c}:*)`)
// Where the keys live: the worker's tools never read them, whatever the task says.
const SECRET_DIRS = ['~/.config/pilot', '~/.ssh', '~/.aws', '~/.config/gh', '~/.netrc']
// Files in the folder that something outside the sandbox runs later: the chat's own settings and hooks, MCP servers,
// git hooks and config, editor tasks. The worker writing one would run code unsandboxed in the chat, so it may not.
// Whole folders (all of .git: the worker never commits), so a rename inside them is refused too.
const RUN_LATER = ['.claude', '.mcp.json', '.git', '.vscode', '.husky', '.envrc']
// What runJob compares before and after a job: each path itself (a rename or a swap shows), then every entry under
// it, whatever its kind: a file by its mode and hash, a symlink by its target and the hash of what it points at, a
// folder by inode and mode (not size or time, which the app's own .claude/.cc-writes changes on every run). Names are
// NUL-separated, so a newline in one cannot split it. For codex, whose sandbox lets it write the folder's dot-files,
// this comparison is the guard. Bash, not sh: read -d '' is bash's.
const SNAPSHOT = `entry() { ls -ldi "$1" | awk '{print $1, $2, $NF}'; }; ` +
  `for p in ${RUN_LATER.join(' ')}; do if [ -e "$p" ] || [ -L "$p" ]; then entry "$p"; else echo "absent $p"; fi; done; ` +
  `find ${RUN_LATER.filter(p => p !== '.git').join(' ')} .git/hooks .git/config .git/info -print0 2>/dev/null | LC_ALL=C sort -z | ` +
  `while IFS= read -r -d '' f; do if [ "$f" = .claude/.cc-writes ]; then continue; fi; printf '%q ' "$f"; ` +
  `if [ -L "$f" ]; then printf 'L %q ' "$(readlink "$f")"; if [ -f "$f" ]; then shasum < "$f"; else echo; fi; ` +
  `elif [ -d "$f" ]; then entry "$f"; elif [ -f "$f" ]; then printf '%s ' "$(entry "$f")"; shasum < "$f"; else entry "$f"; fi; done`

/** The worker's own settings: every Bash command (and its children) runs in Claude Code's OS sandbox, writes only in
 *  the folder, no network, never unsandboxed, and refuses to run at all where the sandbox is missing. Exported for
 *  the tests. */
export const snapshotScript = () => SNAPSHOT

export function workerSettings(): Record<string, unknown> {
  return {
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      failIfUnavailable: true,
      network: { allowedDomains: [] },
      filesystem: { denyRead: SECRET_DIRS, denyWrite: RUN_LATER.map(p => `./${p}`) },
    },
    permissions: {
      deny: [
        ...SECRET_DIRS.flatMap(d => [`Read(${d}/**)`, `Read(${d})`]),
        ...RUN_LATER.flatMap(p => [`Edit(./${p})`, `Edit(./${p}/**)`, `Write(./${p})`, `Write(./${p}/**)`]),
      ],
    },
  }
}

/** The command line and environment for one job. Exported for the tests. */
export function workerCommand(c: ApiConfig, task: string, claudeBin: string): { argv: string[]; env: Record<string, string> } {
  const prompt = `${WORKER_RULES}\n\n# Task\n${task}`
  // Marks the child so its own pilot does not offer the worker again (no worker inside a worker).
  const mark = { PILOT_API_WORKER: '1' }
  if (c.provider === 'openai') {
    const model = c.model || 'gpt-6-luna'
    // --full-auto is codex's sandbox: writes only inside the folder, network off for its commands.
    return {
      argv: ['codex', 'exec', '--full-auto', '--skip-git-repo-check', '-m', model, prompt],
      env: { ...mark, OPENAI_API_KEY: c.key, CODEX_API_KEY: c.key },
    }
  }
  // The worker must run tests and builds, so Bash is allowed, but only inside the sandbox (workerSettings): no
  // network, writes only in this folder. acceptEdits takes edits inside the folder only; anything else would need a
  // prompt, and headless there is none, so it is refused. The person approved the job itself (apiWorkerCall).
  const argv = [claudeBin, '-p', prompt, '--permission-mode', 'acceptEdits', '--settings', JSON.stringify(workerSettings()),
    '--allowedTools', 'Read,Edit,Write,Glob,Grep,Skill,Bash,Agent', '--disallowedTools', DENIED.join(','), '--output-format', 'text']
  if (c.model) argv.push('--model', c.model)
  // A bad key fails in seconds instead of retrying for minutes while the chat waits.
  const env: Record<string, string> = { ...mark, CLAUDE_CODE_MAX_RETRIES: '2', CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: '1' }
  // Another endpoint: its documented recipe (bearer token, no Anthropic key); the login is never sent there.
  if (c.provider === 'other') return { argv, env: { ...env, ANTHROPIC_BASE_URL: c.baseUrl, ANTHROPIC_AUTH_TOKEN: c.key, ANTHROPIC_API_KEY: '' } }
  // Anthropic: without --bare the person's claude.ai login wins over ANTHROPIC_API_KEY and the job eats the
  // subscription (tried 2026-10-25: a fake key still answered). --bare reads the key alone; --add-dir . keeps the
  // folder's CLAUDE.md, which --bare stops finding by itself.
  argv.splice(1, 0, '--bare')
  argv.push('--add-dir', '.')
  return { argv, env: { ...env, ANTHROPIC_API_KEY: c.key } }
}

/** The extra guide block the chat reads while the worker is on. */
export function apiGuide(c: ApiConfig): string {
  const who = c.provider === 'openai' ? `OpenAI (${c.model || 'gpt-6-luna'}, via codex)` : c.provider === 'other' ? `${c.baseUrl}${c.model ? ` (${c.model})` : ''}` : `the Anthropic API${c.model ? ` (${c.model})` : ''}`
  return `# API worker (pilot)
The user has API credits on ${who} and wants them used for coding, so their subscription limits last.
Send every substantial coding job to the tool mcp__pilot__api_worker: writing or changing code across files, features,
refactors, redesigns, test writing, fixing failing tests or builds, QA passes. It runs a headless agent in this folder on
the user's key and returns its report. Give it one self-contained brief: goal, files, constraints, the check to run, and
which skills to load first (e.g. ui-ux, lt-rasyba, security-audit). Independent jobs can run as parallel calls.
Keep for yourself: planning, decisions, small edits of a few lines, money/tax, security review, migrations, deploys and
commits. After each job check its work yourself (git diff plus the check) before telling the user it is done.`
}

let api: ApiConfig = { provider: 'off', key: '', baseUrl: '', model: '' }
let toolName: string | null = null

/** Settings from ~/.config/pilot/api.env, for hosts with no /plugin configure (the VS Code extension): KEY=value
 *  lines PILOT_API_PROVIDER, PILOT_API_KEY, PILOT_API_BASE_URL, PILOT_API_MODEL. The plugin settings win where set. */
export function withApiFile(c: ApiConfig, text: string): ApiConfig {
  const get = (k: string) => text.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*?)\\s*$`, 'm'))?.[1].replace(/^['"]|['"]$/g, '') ?? ''
  const file = readApiConfig({ apiProvider: get('PILOT_API_PROVIDER'), apiKey: get('PILOT_API_KEY'), apiBaseUrl: get('PILOT_API_BASE_URL'), apiModel: get('PILOT_API_MODEL') })
  return c.provider !== 'off' && c.key ? c : { ...file, ...(c.provider !== 'off' ? { provider: c.provider } : {}), ...(c.key ? { key: c.key } : {}) }
}

/** At session start, before the worker is offered: lays ~/.config/pilot/api.env under the plugin settings. */
export async function loadApiFile($: EngineInterface) {
  const home = await $.env.get('HOME')
  if (!home) return
  const text = await $.fs.read(`${home}/.config/pilot/api.env`).catch(() => null)
  if (typeof text === 'string') api = withApiFile(api, text)
}

/** The guide block for the chat, or null while the worker is not offered. */
export const apiGuideBlock = () => (toolName ? { name: 'pilot-api-worker', text: apiGuide(api) } : null)

export function configureApiWorker(options: unknown) {
  api = readApiConfig(options)
  toolName = null
}

/** At session start: offers the tool when a key is set, never inside a worker's own session. */
export async function startApiWorker($: EngineInterface) {
  if (apiProblem(api) || (await $.env.get('PILOT_API_WORKER'))) return
  const r = await $.tool.register({
    name: 'api_worker',
    isDeferred: false,
    description: 'Runs a coding job as a headless agent in this folder on the user\'s own API key (not the subscription). ' +
      'Use for substantial code work. Input: a self-contained brief. Returns the worker\'s report.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'The full brief: goal, files, constraints, check to run, skills to load first.' },
      },
      required: ['task'],
    },
  }).catch(() => null)
  toolName = r?.tool ?? null
}

const MAX_ASKED_TASK = 3000

/** The chat's permission mode, as its last prompt was sent (plan, default, acceptEdits, bypassPermissions, ...). */
let chatMode = 'default'
export function noteChatMode(mode: unknown) {
  if (typeof mode === 'string' && mode) chatMode = mode
}

/** Whether a job may run: never from a subagent, never in plan mode, and the app's own permission decision for the
 *  tool otherwise (a rule or bypass mode allows; dontAsk refuses; default asks). Answering the tool from a hook skips
 *  the app's own dialog, so the ask is put here. Exported for the tests. */
export async function approveJob($: EngineInterface, e: { agentId?: string }, task: string): Promise<string | null> {
  if (e.agentId !== undefined) return 'only the main chat can start the API worker, not a subagent'
  if (chatMode === 'plan') return 'plan mode: the API worker runs no jobs until the plan is accepted'
  const verdict = await $.tool.check({ tool: toolName ?? '', input: { task } }).catch(() => ({ decision: 'ask' as const, reason: undefined }))
  if (verdict.decision === 'deny') return `refused by your permission settings${verdict.reason ? `: ${verdict.reason}` : ''}`
  if (verdict.decision === 'allow') return null
  // The person approves exactly what the worker gets: the whole brief is shown, so one too long to show is refused.
  if (task.length > MAX_ASKED_TASK) return `the brief is ${task.length} characters; keep it under ${MAX_ASKED_TASK} so it can be shown whole for approval`
  const run = 'Run it'
  const answer = await $.ui.ask(`Run this job on your API key (${api.provider}, paid per use)? It edits files in this folder, sandboxed, no network.\n\n${task}`,
    { options: [run, 'Don\'t run'], header: 'API worker' }).catch(() => '')
  return answer === run ? null : 'the user did not approve this API worker job'
}

/** A call of the worker tool answered, or null for any other tool. */
export async function apiWorkerCall($: EngineInterface, e: { tool: string; agentId?: string }): Promise<{ result: string } | { deny: string } | null> {
  if (!toolName || e.tool !== toolName) return null
  const input = e as unknown as { task?: unknown }
  const task = typeof input.task === 'string' ? input.task.trim() : ''
  if (!task) return { deny: 'api_worker needs a task' }
  const refused = await approveJob($, e, task)
  if (refused) return { deny: refused }
  // Always the chat's own folder: the model picks no other place for the worker to write.
  return { result: await runJob($, task) }
}

/** The protected paths as they are now, or null when they cannot be read (then the job does not run). */
async function snapshot($: EngineInterface): Promise<string | null> {
  const r = await $.process.run(['bash', '-c', SNAPSHOT]).catch(() => null)
  return r && r.exitCode === 0 ? r.stdout : null
}

async function runJob($: EngineInterface, task: string): Promise<string> {
  // Not trusting the deny lists alone: what runs outside the sandbox is compared before and after.
  const before = await snapshot($)
  if (before === null) return 'API worker did not run: could not snapshot .claude, .git and the other config paths first'
  const bin = (await $.env.get('CLAUDE_CODE_EXECPATH')) || 'claude'
  const { argv, env } = workerCommand(api, task, bin)
  $.ui.status(`pilot: API worker running (${api.provider})`)
  let out = ''
  let err = ''
  try {
    const child = $.process.spawn({ argv, env })
    for await (const piece of child) {
      if (piece.stream === 'stderr') err += piece.text
      else out += piece.text
    }
  } catch (x) {
    return `API worker could not start: ${x instanceof Error ? x.message : String(x)}`
  } finally {
    $.ui.status(undefined)
  }
  // The key never goes back into the chat, even if the child printed it.
  const clean = (s: string) => (api.key ? s.split(api.key).join('***') : s).trim()
  const report = clean(out).slice(-12_000) || `API worker ended with no output.${err ? `\n${clean(err).slice(-2_000)}` : ''}`
  if ((await snapshot($)) !== before) {
    $.ui.toast('pilot: the API worker changed .claude, .git or another config path. Check git status before going on.')
    return `WARNING: the worker changed files that run outside its sandbox (.claude, .mcp.json, .git, .vscode, .husky or .envrc). ` +
      `Do not run anything, commit or reload: show the user \`git status\` and the change, and let them decide.\n\n${report}`
  }
  return report
}

// The fallback: when the subscription's usage limits run out, the chat itself goes on on the Anthropic key. Claude
// Code's apiKeyHelper wins over the claude.ai login, and a change to the folder's .claude/settings.local.json is
// picked up by a running chat at its next message (both tried 2026-10-25). The key sits in a file only the person can
// read; the helper prints it. A settings.read hook was tried first: the engine did not take its answer.
// ponytail: switched by hand, per folder (band button or /pilot api); an automatic switch back when the limit resets
// needs the reset time tracked across chats, worth it only if a forgotten switch turns out to cost money.
const KEY_FILE = '.config/pilot/api-key'
const HELPER = `cat "$HOME/${KEY_FILE}"`
const LOCAL = '.claude/settings.local.json'
let fallbackOn = false

/** The fallback needs an Anthropic key: only Claude can run the chat itself. */
export const canFallback = () => api.provider === 'anthropic' && Boolean(api.key)
export const isFallbackOn = () => fallbackOn

/** The folder's local settings, or null when the file is there but not plain JSON (then it is left alone). */
async function readLocal($: EngineInterface): Promise<Record<string, unknown> | null> {
  if (!(await $.fs.exists(LOCAL).catch(() => false))) return {}
  try {
    const v = JSON.parse(await $.fs.read(LOCAL))
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch { return null }
}

/** At session start: whether this folder's chat is on the key already. */
export async function readFallback($: EngineInterface) {
  fallbackOn = (await readLocal($))?.apiKeyHelper === HELPER
}

/** The local settings with the helper set or taken out. Exported for the tests. */
export function withHelper(local: Record<string, unknown>, on: boolean): Record<string, unknown> {
  const { apiKeyHelper, ...rest } = local
  // Someone else's helper is never replaced or removed.
  if (apiKeyHelper !== undefined && apiKeyHelper !== HELPER) return local
  return on ? { ...rest, apiKeyHelper: HELPER } : rest
}

/** Switches this folder's chat between the subscription and the API key; the next message goes the new way. */
export async function setFallback($: EngineInterface, on: boolean): Promise<string> {
  if (on && !canFallback()) return 'set API worker to anthropic and paste an Anthropic key first (/plugin configure pilot@pilot)'
  const local = await readLocal($)
  if (!local) return `${LOCAL} is not plain JSON, left it alone`
  if (local.apiKeyHelper !== undefined && local.apiKeyHelper !== HELPER) return `${LOCAL} already has its own apiKeyHelper, left it alone`
  if (on) {
    const r = await $.process.run(['sh', '-c', `umask 077 && mkdir -p "$HOME/.config/pilot" && cat > "$HOME/${KEY_FILE}"`], { stdin: api.key }).catch(() => null)
    if (!r || r.exitCode !== 0) return 'could not write the key file'
  }
  await $.fs.write(LOCAL, `${JSON.stringify(withHelper(local, on), null, 2)}\n`)
  fallbackOn = on
  return on ? 'this folder\'s chat now runs on your API key (paid per use) from the next message. /pilot api off once the limit resets.'
    : 'back on your subscription from the next message.'
}
