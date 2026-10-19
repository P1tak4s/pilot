import { describe, expect, mock, test } from 'claude-code/testing'
import { isNewer, latestRelease, pluginDirIn, syncPlan } from './update'

// The update card above the prompt: a newer version in the marketplace's public.json is offered, Update runs
// `claude plugin`, and the Updated card links to What's new, Share and the repo.
const MARKET = '{"name":"effortless","plugins":[{"name":"effortless","source":"./"},{"name":"textless","source":"./textless/plugin"}]}'
const PUBLIC = '[{"version":"9.1.0","note":"Questions show as a numbered list."},{"version":"0.9.0","note":"old"}]'

function fakeHost(on: any, opts: { failUpdate?: boolean } = {}) {
  const store = new Map<string, unknown>()
  const ran: string[][] = []
  const copied: string[] = []
  on('env.get', ($: any, e: any) => ({ value: e.name === 'TEXTLESS_OFFER_ANYWHERE' ? '1' : '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.write', () => ({ value: undefined }))
  on('fs.read', ($: any, e: any) => {
    const p = String(e.path).split('\\').join('/')
    if (p.endsWith('/.claude-plugin/marketplace.json')) return { value: MARKET }
    if (p.endsWith('/textless/plugin/public.json')) return { value: PUBLIC }
    if (p.endsWith('/.claude-plugin/plugin.json')) return { value: '{"name":"textless","version":"0.9.72"}' }
    return { value: '' }
  })
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.copy', ($: any, e: any) => { copied.push(String(e.text)); return { value: { isCopied: true } } })
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('process.run', ($: any, e: any) => {
    ran.push(e.argv)
    // No git repo to fetch from here: the marketplace's copy is the source.
    if (e.argv[0] === 'git') return { value: { exitCode: 1, stdout: '', stderr: 'fatal: offline' } }
    const failing = opts.failUpdate && e.argv.includes('update') && !e.argv.includes('marketplace')
    return { value: { exitCode: failing ? 1 : 0, stdout: '', stderr: failing ? 'error: could not reach github.com' : '' } }
  })
  on('command.run', () => ({ value: {} }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
  return { store, ran, copied }
}

// The card sits under the newest answer: finish a turn, then draw that answer.
async function answerRow(e: any, on: any, surface: 'desktop' | 'terminal' = 'desktop') {
  await e.turn.complete({ answer: 'Done.', reason: 'answer', durationMs: 1, isAborted: false, turnId: 't' })
  return e.ui.mount({ plugin: 'textless', surface, component: 'AssistantMessage', props: { text: 'Done.' } })
}

describe('update card', () => {
  test('versions compare and public.json reads newest first', () => {
    expect(isNewer('0.10.0', '0.9.72')).toBe(true)
    expect(isNewer('0.9.72', '0.9.72')).toBe(false)
    expect(latestRelease(PUBLIC)?.version).toBe('9.1.0')
    expect(latestRelease('nope')).toBeUndefined()
    expect(pluginDirIn(MARKET)).toBe('textless/plugin')
    expect(pluginDirIn('{"plugins":[{"name":"textless","source":"./plugin"}]}')).toBe('plugin')
    expect(syncPlan('C:/x/cache/a/textless/1', 'C:/x/cache/a/textless/1')).toBeUndefined()
  })

  test('a newer version is offered, Update runs claude plugin, and Updated links and shares', async ($, on) => {
    const host = fakeHost(on)
    on('turn.complete', () => ({ text: '' }))
    mock.clock(on)
    const e: any = $
    const band: any = await answerRow(e, on)
    await e.command.run({ command: 'textless', args: 'update' })
    expect((await band.find({ text: 'textless 9.1.0 is out' }))).toBeDefined()
    await band.press({ key: 'tl-update-go' })
    const claude = host.ran.filter(a => a.includes('plugin')).map(a => a.slice(1).join(' '))
    expect(claude).toContain('plugin marketplace update effortless')
    expect(claude).toContain('plugin update textless@effortless')
    expect(await band.find({ text: 'Updated to 9.1.0' })).toBeDefined()
    expect(await band.find({ text: "What's new →" })).toBeDefined()
    await band.press({ key: 'tl-update-share-go' })
    expect(host.copied).toContain('https://heycubit.github.io/effortless/textless/')
  })

  test('Later puts the version away, and a failed update says why', async ($, on) => {
    const host = fakeHost(on, { failUpdate: true })
    on('turn.complete', () => ({ text: '' }))
    mock.clock(on)
    const e: any = $
    const band: any = await answerRow(e, on)
    await e.command.run({ command: 'textless', args: 'update' })
    await band.press({ key: 'tl-update-go' })
    expect(await band.find({ text: 'Update failed' })).toBeDefined()
    expect(await band.find({ text: 'could not reach github.com' })).toBeDefined()
    await band.press({ key: 'tl-update-close' })
    expect(await band.find({ text: 'Update failed' })).toBeUndefined()
    await e.command.run({ command: 'textless', args: 'update' })
    await band.press({ key: 'tl-update-later' })
    expect(host.store.get('updateHidden')).toMatchObject({ version: '9.1.0' })
    expect(await band.find({ text: 'textless 9.1.0 is out' })).toBeUndefined()
  })

  test('every look of the card draws on desktop, and the terminal gets none', async ($, on) => {
    fakeHost(on)
    on('turn.complete', () => ({ text: '' }))
    mock.clock(on)
    const e: any = $
    for (const stage of ['offer', 'updating', 'done', 'failed']) {
      await e.command.run({ command: 'textless', args: `card ${stage}` })
      const band: any = await answerRow(e, on)
      expect(await band.find({ key: 'tl-update-card' })).toBeDefined()
    }
    const term: any = await answerRow(e, on, 'terminal')
    expect(await term.find({ key: 'tl-update-card' })).toBeUndefined()
  })
})
