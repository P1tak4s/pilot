import { describe, expect, mock, test } from 'claude-code/testing'

// A scene from the marketplace names who drew it under the card; a shipped scene does not.
const API = 'https://textless-market.isac-ehrstedt.workers.dev'
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 128 80"><rect width="128" height="80" fill="#d97757"/></svg>'

function fakeHost(on: any) {
  const files = new Map<string, string>()
  const norm = (p: unknown) => String(p).split(String.fromCharCode(92)).join('/')
  const store = new Map<string, unknown>()
  on('env.get', ($: any, e: any) => ({ value: e.name === 'HOME' ? '/home/t' : '' }))
  on('fs.list', ($: any, e: any) => ({ value: [...files.keys()].filter(p => p.startsWith(norm(e.path) + '/') && !p.slice(norm(e.path).length + 1).includes('/')).map(p => ({ name: p.slice(norm(e.path).length + 1), kind: 'file', mtimeMs: 1 })) }))
  on('fs.read', ($: any, e: any) => ({ value: files.get(norm(e.path)) ?? '' }))
  on('fs.write', ($: any, e: any) => { files.set(norm(e.path), e.text); return { value: undefined } })
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  on('http.fetch', ($: any, e: any) => {
    const body: Record<string, string> = {
      [`${API}/scenes`]: JSON.stringify({ scenes: [{ id: 'rain-1', name: 'Rain cloud', author: 'maja', width: 560, height: 350, created: 1, file: `${API}/f/rain-1.svg` }] }),
      [`${API}/f/rain-1.svg`]: SVG,
    }
    const text = body[e.url]
    return { value: text === undefined ? { status: 404, ok: false, headers: {}, text: '' } : { status: 200, ok: true, headers: {}, text } }
  })
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('the card names a marketplace scene\'s maker', () => {
  test('a downloaded scene shows its name and maker under the card', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.command.run({ command: 'textless', args: 'get rain-1', origin: { kind: 'human' } })
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    const row: any = await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: 'c1', tool: 'Bash', input: {}, isRunning: true } })
    await clock.advance(3500)
    const texts = (await row.findAll({ type: 'Text' })).map((t: any) => t.text)
    expect(texts).toContain('Rain cloud · by maja')
  })

  test('a shipped scene has no credit line', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    const row: any = await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: 'c2', tool: 'Bash', input: {}, isRunning: true } })
    await clock.advance(3500)
    expect(await row.find({ text: 'Claude is working' })).toBeDefined()
    expect(await row.find({ key: 'textless-credit' })).toBeUndefined()
  })
})
