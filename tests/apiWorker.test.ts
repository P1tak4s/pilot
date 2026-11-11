import { expect, test } from 'claude-code/testing'
import { apiProblem, approveJob, snapshotScript, canFallback, configureApiWorker, noteChatMode, readApiConfig, withApiFile, withHelper, workerCommand, workerSettings } from '../hooks/apiWorker'

test('the API worker is off until a provider and a key are set', () => {
  expect(apiProblem(readApiConfig({}))).toBe('off')
  expect(apiProblem(readApiConfig({ apiProvider: 'anthropic' }))).toBe('no API key set')
  expect(apiProblem(readApiConfig({ apiProvider: 'other', apiKey: 'k' }))).toBe('other needs an https base URL')
  expect(apiProblem(readApiConfig({ apiProvider: 'anthropic', apiKey: ' k ' }))).toBe(null)
})

test('anthropic runs claude --bare -p, so the key and not the login pays', () => {
  const { argv, env } = workerCommand(readApiConfig({ apiProvider: 'anthropic', apiKey: 'sk-ant' }), 'do it', '/bin/claude')
  expect(argv.slice(0, 3)).toEqual(['/bin/claude', '--bare', '-p'])
  expect(argv).not.toContain('--model')
  expect(env).toEqual({ PILOT_API_WORKER: '1', CLAUDE_CODE_MAX_RETRIES: '2', CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: '1', ANTHROPIC_API_KEY: 'sk-ant' })
  expect(argv[argv.indexOf('--disallowedTools') + 1]).toContain('Bash(git push:*)')
})

test('other points claude at the endpoint with the key as a bearer token', () => {
  const c = readApiConfig({ apiProvider: 'other', apiKey: 'or', apiBaseUrl: 'https://openrouter.ai/api', apiModel: 'x/y' })
  const { argv, env } = workerCommand(c, 'do it', 'claude')
  expect(argv.slice(-2)).toEqual(['--model', 'x/y'])
  expect(argv).not.toContain('--bare')
  expect(env.ANTHROPIC_BASE_URL).toBe('https://openrouter.ai/api')
  expect(env.ANTHROPIC_AUTH_TOKEN).toBe('or')
  expect(env.ANTHROPIC_API_KEY).toBe('')
})

test('openai runs codex exec on gpt-6-luna unless a model is set', () => {
  const { argv, env } = workerCommand(readApiConfig({ apiProvider: 'openai', apiKey: 'sk' }), 'do it', 'claude')
  expect(argv.slice(0, 2)).toEqual(['codex', 'exec'])
  expect(argv[argv.indexOf('-m') + 1]).toBe('gpt-6-luna')
  expect(env.OPENAI_API_KEY).toBe('sk')
})

test('the key helper goes into the local settings and out again, never over someone else\'s', () => {
  const on = withHelper({ permissions: { allow: ['Bash'] } }, true)
  expect(on).toEqual({ permissions: { allow: ['Bash'] }, apiKeyHelper: 'cat "$HOME/.config/pilot/api-key"' })
  expect(withHelper(on, false)).toEqual({ permissions: { allow: ['Bash'] } })
  expect(withHelper({ apiKeyHelper: 'op read x' }, true)).toEqual({ apiKeyHelper: 'op read x' })
  configureApiWorker({ apiProvider: 'openai', apiKey: 'sk' })
  expect(canFallback()).toBe(false)
  configureApiWorker({ apiProvider: 'anthropic', apiKey: 'sk-ant' })
  expect(canFallback()).toBe(true)
})

test('the api.env file fills in what the plugin settings leave empty', () => {
  const file = 'PILOT_API_PROVIDER=anthropic\nPILOT_API_KEY="sk-ant-file"\n'
  expect(withApiFile(readApiConfig({}), file)).toEqual({ provider: 'anthropic', key: 'sk-ant-file', baseUrl: '', model: '' })
  const set = readApiConfig({ apiProvider: 'openai', apiKey: 'sk-set' })
  expect(withApiFile(set, file)).toEqual(set)
})

test('claude runs every Bash command in the sandbox: no network, never unsandboxed, key folders unreadable', () => {
  const { argv } = workerCommand(readApiConfig({ apiProvider: 'anthropic', apiKey: 'sk-ant' }), 'do it', 'claude')
  const settings = JSON.parse(argv[argv.indexOf('--settings') + 1])
  expect(settings).toEqual(workerSettings())
  expect(settings.sandbox).toMatchObject({ enabled: true, allowUnsandboxedCommands: false, failIfUnavailable: true, network: { allowedDomains: [] } })
  expect(settings.sandbox.filesystem.denyRead).toContain('~/.config/pilot')
  expect(settings.permissions.deny).toContain('Read(~/.config/pilot/**)')
  // Files that run outside the sandbox later (the chat's hooks, git hooks) are not the worker's to write.
  expect(settings.sandbox.filesystem.denyWrite).toEqual(expect.arrayContaining(['./.claude', './.git', './.mcp.json']))
  expect(settings.permissions.deny).toEqual(expect.arrayContaining(['Write(./.claude/**)', 'Edit(./.git/**)']))
})

// A stand-in for the engine: the app's permission verdict and the person's answer to the ask.
const engine = (decision: 'allow' | 'ask' | 'deny', answer: string | Error, asked: string[] = []) => ({
  tool: { check: async () => ({ decision, reason: decision === 'deny' ? 'dontAsk mode' : undefined }) },
  ui: { ask: async (q: string) => { asked.push(q); if (answer instanceof Error) throw answer; return answer } },
}) as never

test('a job runs only when the person allows it, never from a subagent or in plan mode', async () => {
  configureApiWorker({ apiProvider: 'anthropic', apiKey: 'sk-ant' })
  const asked: string[] = []
  expect(await approveJob(engine('ask', 'Run it', asked), {}, 'fix the tests')).toBeNull()
  expect(asked[0]).toContain('fix the tests')
  // Shown whole or not run: a brief too long for the dialog is refused, never cut.
  const long = 'x'.repeat(3001)
  expect(await approveJob(engine('ask', 'Run it'), {}, long)).toContain('3001 characters')
  expect(await approveJob(engine('allow', ''), {}, long)).toBeNull()
  expect(await approveJob(engine('ask', "Don't run"), {}, 'x')).toContain('did not approve')
  // Dismissed, or a -p run with nobody to ask: refused.
  expect(await approveJob(engine('ask', new Error('dismissed')), {}, 'x')).toContain('did not approve')
  expect(await approveJob(engine('deny', 'Run it'), {}, 'x')).toContain('dontAsk mode')
  const none: string[] = []
  expect(await approveJob(engine('allow', '', none), {}, 'x')).toBeNull()
  expect(none).toEqual([])
  expect(await approveJob(engine('allow', 'Run it'), { agentId: 'a1' }, 'x')).toContain('subagent')
  noteChatMode('plan')
  expect(await approveJob(engine('allow', 'Run it'), {}, 'x')).toContain('plan mode')
  noteChatMode('default')
})

test('the before-and-after snapshot covers every kind of entry, and ignores only the app\'s own .claude/.cc-writes', () => {
  const s = snapshotScript()
  for (const p of ['.claude', '.mcp.json', '.git', '.vscode', '.husky', '.envrc', '.git/hooks', '.git/config']) expect(s).toContain(p)
  expect(s).toContain('readlink')
  expect(s).toContain('shasum')
  expect(s).toContain('.claude/.cc-writes ]; then continue')
  expect(s).toContain('-print0')
})
