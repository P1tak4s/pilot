import { describe, expect, mock, test } from 'claude-code/testing'
import { ANSWERS } from './register'

// The settings page on the website: the ⚙ opens it with this computer's key, and what it saves reaches every chat.
const API = 'https://textless-market.isac-ehrstedt.workers.dev'
const KEY = '0123456789abcdef0123456789abcdef'

function fakeHost(on: any, saved: () => unknown) {
  const store = new Map<string, unknown>()
  const ran: string[][] = []
  const fetched: string[] = []
  on('env.get', ($: any, e: any) => ({ value: e.name === 'USERPROFILE' ? 'C:\Users\t' : '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  // The app's own strip, under the plugin's additions.
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({}))
  on('process.run', ($: any, e: any) => { ran.push(e.argv); return { value: { code: 1, stdout: '', stderr: '' } } })
  on('http.fetch', ($: any, e: any) => {
    fetched.push(e.url)
    const body = e.url === `${API}/settings/${KEY}` ? saved() : undefined
    return { value: body === undefined ? { status: 404, ok: false, headers: {}, text: '' } : { status: 200, ok: true, headers: {}, text: JSON.stringify(body) } }
  })
  return { store, ran, fetched }
}

// textless's buttons sit under the newest answer: finish a turn, then draw that answer.
async function buttonsRow($: any, on: any) {
  on('turn.complete', () => ({ text: '' }))
  await $.turn.complete({ answer: 'Done.', reason: 'answer', durationMs: 1, isAborted: false, turnId: 't' })
  return $.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: 'Done.' } })
}

describe('settings on the website', () => {
  test('the gear opens the settings page with a new key for this computer, kept for next time', async ($, on) => {
    const host = fakeHost(on, () => undefined)
    mock.clock(on)
    const strip: any = await buttonsRow($, on)
    await strip.press({ key: 'textless-settings' })
    const url = host.ran[0]?.[2] ?? ''
    expect(host.ran[0]?.slice(0, 2)).toEqual(['rundll32', 'url.dll,FileProtocolHandler'])
    expect(url).toMatch(new RegExp(`^https://textless-preview\\.isac-ehrstedt\\.workers\\.dev/settings/#k=[0-9a-f]{32}&set=clawd&scene=&summary=${ANSWERS ? 1 : 0}&cover=0$`))
    expect(host.store.get('syncKey')).toBe(url.match(/k=([0-9a-f]{32})/)?.[1])
  })

  test('a save on the page becomes the set and scene every chat shows, and is taken once', async ($, on) => {
    let saved: any = { ok: true, set: 'clawd', scene: 'nap', updated: 100 }
    const host = fakeHost(on, () => saved)
    const clock = mock.clock(on)
    host.store.set('syncKey', KEY)
    await buttonsRow($, on)
    await clock.advance(2000)
    expect(host.store.get('set')).toBe('clawd')
    expect(host.store.get('remoteUpdated')).toBe(100)
    // Picked in the app afterwards: the old save on the page does not undo it.
    host.store.set('set', 'abstract')
    await clock.advance(61_000)
    expect(host.store.get('set')).toBe('abstract')
    // A newer save does, within a minute.
    saved = { ok: true, set: 'clawd', scene: null, updated: 200 }
    await clock.advance(61_000)
    expect(host.store.get('set')).toBe('clawd')
    expect(host.store.get('pick')).toBe(null)
    expect(host.store.get('remoteUpdated')).toBe(200)
  })

  test('a set made on the page becomes a set every chat can play', async ($, on) => {
    const mix = { id: 'mix-calm1', name: 'Calm', scenes: ['clawd/scene 2', 'clawd/gone'] }
    const host = fakeHost(on, () => ({ ok: true, set: 'mix-calm1', scene: null, mixes: [mix], updated: 100 }))
    const clock = mock.clock(on)
    host.store.set('syncKey', KEY)
    await buttonsRow($, on)
    await clock.advance(2000)
    expect(host.store.get('set')).toBe('mix-calm1')
    expect(host.store.get('mixes')).toEqual([mix])
    // Listed by its own name; it holds the one scene this computer has.
    const sets = await ($ as any).command.run({ command: 'textless', args: 'set' })
    expect(sets.text).toContain('Calm')
    expect((await ($ as any).command.run({ command: 'textless', args: 'set calm' })).text).toBe('textless set: Calm.')
  })

  test('nothing is fetched before the page was ever opened', async ($, on) => {
    const { fetched } = fakeHost(on, () => undefined)
    const clock = mock.clock(on)
    await buttonsRow($, on)
    await clock.advance(130_000)
    expect(fetched.filter(u => u.includes('/settings/')).length).toBe(0)
  })
})
