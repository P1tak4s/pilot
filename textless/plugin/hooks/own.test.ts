import { describe, expect, mock, test } from 'claude-code/testing'

// The gear with scenes of the person's own: the plugin writes a copy of the settings page on this computer with those
// scenes in it and opens that, so the pictures never leave the computer.
const PAGE = 'https://textless-preview.isac-ehrstedt.workers.dev/settings/'
const SITE_HTML = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>\nvar API = "x";\n</script></body></html>'
const RAIN = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350"><rect width="560" height="350" fill="#334"/></svg>'

function fakeHost(on: any, opts: { offline?: boolean } = {}) {
  const store = new Map<string, unknown>()
  const written = new Map<string, string>()
  const ran: string[][] = []
  on('env.get', ($: any, e: any) => ({ value: e.name === 'HOME' ? '/home/t' : '' }))
  on('fs.list', ($: any, e: any) => ({ value: String(e.path).split('\\').join('/').endsWith('/.claude/textless/scenes') ? [{ name: 'rain-cloud.svg', kind: 'file', mtimeMs: 1 }] : [] }))
  on('fs.read', ($: any, e: any) => ({ value: String(e.path).endsWith('rain-cloud.svg') ? RAIN : '' }))
  on('fs.write', ($: any, e: any) => { written.set(String(e.path), String(e.text)); return { value: undefined } })
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({}))
  on('process.run', ($: any, e: any) => { ran.push(e.argv); return { value: { code: 0, stdout: '', stderr: '' } } })
  on('http.fetch', ($: any, e: any) => ({ value: !opts.offline && e.url === PAGE ? { status: 200, ok: true, headers: {}, text: SITE_HTML } : { status: 404, ok: false, headers: {}, text: '' } }))
  return { store, written, ran }
}

// textless's buttons sit under the newest answer: finish a turn, then draw that answer.
async function buttonsRow($: any, on: any) {
  on('turn.complete', () => ({ text: '' }))
  await $.turn.complete({ answer: 'Done.', reason: 'answer', durationMs: 1, isAborted: false, turnId: 't' })
  return $.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: 'Done.' } })
}

describe('own scenes on the settings page', () => {
  test('the gear writes a local copy of the page with the own scenes in it and opens that file', async ($, on) => {
    const host = fakeHost(on)
    mock.clock(on)
    const strip: any = await buttonsRow($, on)
    await strip.press({ key: 'textless-settings' })
    const file = [...host.written.keys()].find(p => p.endsWith('settings.html')) ?? ''
    expect(file.split('\\').join('/').endsWith('/.claude/textless/settings.html')).toBe(true)
    const html = host.written.get(file) ?? ''
    expect(html).toContain(`<base href="${PAGE}">`)
    expect(html).toContain('window.TEXTLESS_OWN=')
    expect(html).toContain('"name":"rain-cloud"')
    expect(html).toContain('window.TEXTLESS_HASH="k=')
    expect(html.indexOf('TEXTLESS_OWN')).toBeLessThan(html.indexOf('var API'))
    // The browser gets the file the plugin wrote (the engine shows paths in the host's own form, so compare the ends).
    expect(String(host.ran[0]?.at(-1)).split('\\').join('/').endsWith('/.claude/textless/settings.html')).toBe(true)
  })

  test('offline, the gear opens the site itself', async ($, on) => {
    const host = fakeHost(on, { offline: true })
    mock.clock(on)
    const strip: any = await buttonsRow($, on)
    await strip.press({ key: 'textless-settings' })
    expect([...host.written.keys()].some(p => p.endsWith('settings.html'))).toBe(false)
    expect(host.ran[0]?.at(-1)).toMatch(/^https:\/\/textless-preview\.isac-ehrstedt\.workers\.dev\/settings\/#k=/)
  })
})
