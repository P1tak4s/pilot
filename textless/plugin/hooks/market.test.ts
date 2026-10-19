import { describe, expect, test } from 'claude-code/testing'

// /textless get against a fake market: the engine's file system, store and network answered here.
const API = 'https://textless-market.isac-ehrstedt.workers.dev'
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350" viewBox="0 0 128 80"><rect width="128" height="80" fill="#d97757"/></svg>'
const EVIL = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350"><script>alert(1)</script></svg>'
// A 64x40 PNG.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAAeklEQVR4nOXXQQkDQQAEwU4TI/nFw8XD2jlbJyI6YuVE7EJotv4DA/Oax/tzUiZxEidxEidxEidxEidxz5nwdfyWlBjf174LSJzESZzESZzESZzESZzESZzESZzESZzESZzs/InHxJddReIkTuIkTuIkTuIkzn8XmHUDl0gFZeahpekAAAAASUVORK5CYII='
const listing = [
  { id: 'rain-1', name: 'Rain cloud', author: 'Isac', width: 560, height: 350, created: 1, file: `${API}/f/rain-1.svg` },
  { id: 'tile-1', name: 'Tile', author: 'Ann', width: 64, height: 40, created: 1, stars: 3, file: `${API}/f/tile-1.png` },
  { id: 'evil-1', name: 'Evil', author: 'Eve', width: 560, height: 350, created: 1, file: `${API}/f/evil-1.svg` },
]

function fakeHost(on: any, opts: { down?: boolean } = {}) {
  const files = new Map<string, string>()
  const store = new Map<string, unknown>()
  const fetched: string[] = []
  on('env.get', ($: any, e: any) => ({ value: e.name === 'HOME' ? '/home/t' : '' }))
  on('fs.list', ($: any, e: any) => ({ value: [...files.keys()].filter(p => p.startsWith(e.path) && /^[\\/][^\\/]+$/.test(p.slice(e.path.length))).map(p => ({ name: p.slice(e.path.length + 1), kind: 'file', mtimeMs: 1 })) }))
  on('fs.read', ($: any, e: any) => ({ value: files.get(e.path) ?? '' }))
  on('fs.write', ($: any, e: any) => { files.set(e.path, e.text); return { value: undefined } })
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('clock.every', () => ({ value: undefined }))
  // Redraws go on to the kit, which redraws a mounted pane; with nothing mounted there is nothing to redraw.
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('http.fetch', ($: any, e: any) => {
    fetched.push(e.url)
    if (opts.down) return { value: { status: 502, ok: false, headers: {}, text: '' } }
    const body: Record<string, string> = {
      [`${API}/scenes`]: JSON.stringify({ scenes: listing }),
      [`${API}/f/rain-1.svg`]: SVG,
      [`${API}/f/evil-1.svg`]: EVIL,
      [`${API}/f/tile-1.png?as=base64`]: PNG,
    }
    const text = body[e.url]
    return { value: text === undefined ? { status: 404, ok: false, headers: {}, text: '' } : { status: 200, ok: true, headers: {}, text } }
  })
  // The engine hands paths over in the host's own form, so a saved scene is found by its folder and name.
  const saved = (name: string) => [...files.entries()].find(([p]) => /[\\/]\.claude[\\/]textless[\\/]scenes[\\/]/.test(p) && p.endsWith(name))?.[1]
  return { files, store, fetched, saved }
}

const get = ($: any, id: string) => $.command.run({ command: 'textless', args: `get ${id}`, origin: { kind: 'human' } })

describe('/textless get', () => {
  test('saves an SVG scene by id and makes it the scene every chat shows', async ($, on) => {
    const host = fakeHost(on)
    const out = await get($, 'rain-1')
    expect(out.text).toBe('Rain cloud by Isac is on. It plays the next time Claude works.')
    expect(host.saved('rain-1.svg')).toBe(SVG)
    expect(host.store.get('set')).toBe('yours')
    expect(host.store.get('pick')).toBe(0)
  })

  test('wraps a picture, fetched as base64, in an SVG at its own size', async ($, on) => {
    const host = fakeHost(on)
    const out = await get($, 'tile-1')
    expect(out.text).toContain('Tile by Ann is on')
    const saved = host.saved('tile-1.svg') ?? ''
    expect(saved).toContain('data:image/png;base64,')
    expect(saved).toContain('width="64" height="40"')
  })

  test('refuses a file that fails the market rules and saves nothing', async ($, on) => {
    const host = fakeHost(on)
    const out = await get($, 'evil-1')
    expect(out.text).toContain('Evil was not added')
    expect(out.text).toContain('<script> is not allowed')
    expect(host.files.size).toBe(0)
  })

  test('says so when the id is not in the market', async ($, on) => {
    fakeHost(on)
    expect((await get($, 'gone-1')).text).toContain('not found or was taken down')
  })

  test('never takes a path from the id', async ($, on) => {
    const host = fakeHost(on)
    expect((await get($, '../../x')).text).toContain('is not a scene id')
    expect(host.fetched.length).toBe(0)
  })

  test('says the market cannot be reached when it is down', async ($, on) => {
    fakeHost(on, { down: true })
    expect((await get($, 'rain-1')).text).toContain('could not be reached')
  })
})

describe('Community tab', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`lists the market and Use puts a scene on (${surface})`, async ($, on) => {
      const host = fakeHost(on)
      const pane: any = await ($ as any).ui.mount({ plugin: 'textless', surface, component: 'Pane', requestId: 'textless-settings', props: { title: 'textless', isFocused: true } })
      await pane.press({ key: 'tab-community' })
      expect(await pane.find({ text: 'Rain cloud' })).toBeTruthy()
      expect(await pane.find({ text: 'by Isac' })).toBeTruthy()
      expect(await pane.find({ text: '★ 3' })).toBeTruthy()
      await pane.press({ key: 'm-rain-1-use' })
      expect(host.saved('rain-1.svg')).toBe(SVG)
      expect(await pane.find({ text: 'In use' })).toBeTruthy()
      // The refused scene still lists, but has no preview and saves nothing when used.
      await pane.press({ key: 'm-evil-1-use' })
      expect(host.saved('evil-1.svg')).toBe(undefined)
    })
  }

  test('says the market cannot be reached and keeps the settings working', async ($, on) => {
    fakeHost(on, { down: true })
    const pane: any = await ($ as any).ui.mount({ plugin: 'textless', surface: 'desktop', component: 'Pane', requestId: 'textless-settings', props: { title: 'textless', isFocused: true } })
    await pane.press({ key: 'tab-community' })
    expect(await pane.find({ text: /could not be reached/ })).toBeTruthy()
    await pane.press({ key: 'tab-settings' })
    expect(await pane.find({ text: 'Hide the text while Claude works' })).toBeTruthy()
  })
})
