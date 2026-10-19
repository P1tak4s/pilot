import { describe, expect, mock, test } from 'claude-code/testing'

// A Stop hook that blocks sends Claude back to work inside the same turn. The answer it gave before was still an
// answer the person has to read, so it must not fold away with the text said along the way.
const FIRST = 'Yes, that works. To make it live: 1. You merge the pull request. 2. I deploy the relay.'
const BETWEEN = 'Checking the relay log now.'
const LAST = 'Test 11 is still queued and goes out at 02:01.'

function fakeHost(on: any) {
  const store = new Map<string, unknown>()
  on('env.get', () => ({ value: '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  // Core's own drawing carries a key, so a test can tell a row drawn as usual from one textless hid.
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
  // The person's Stop hook: it sends Claude back to work once.
  let blocks = 1
  on('classic.Stop', () => (blocks-- > 0 ? { block: 'Report the blockers first.' } : {}))
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const text = ($: any, t: string) => $.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: t } })
const shown = async (ui: any) => (await ui.find({ key: 'core' })) !== undefined

describe('an answer a Stop hook sent back', () => {
  test('stays shown during and after the turn, while text said along the way folds', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'can you lift the limit for me?' })
    // Rows drawn in the first moments of a turn count as already in the chat; the turn's own come after.
    await wait(1600)
    await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: 't1', tool: 'Bash', input: {}, isRunning: true } })
    await clock.advance(3500)
    expect(await shown(await text(e, FIRST))).toBe(false)
    await e.classic.Stop({ stop_hook_active: false, last_assistant_message: FIRST })
    expect(await shown(await text(e, FIRST))).toBe(true)
    expect(await shown(await text(e, BETWEEN))).toBe(false)
    await text(e, LAST)
    await e.turn.complete({ answer: LAST, reason: 'answer', durationMs: 5000, isAborted: false, turnId: 'x' })
    expect(await shown(await text(e, FIRST))).toBe(true)
    expect(await shown(await text(e, BETWEEN))).toBe(false)
  })

  test('off shows a finished turn whole again', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: 't2', tool: 'Bash', input: {}, isRunning: true } })
    await clock.advance(3500)
    await text(e, BETWEEN)
    await text(e, LAST)
    await e.turn.complete({ answer: LAST, reason: 'answer', durationMs: 5000, isAborted: false, turnId: 'y' })
    expect(await shown(await text(e, BETWEEN))).toBe(false)
    // The switch sits on the row under the newest answer.
    const answer: any = await text(e, LAST)
    await answer.press({ key: 'textless-switch' })
    expect(await shown(await text(e, BETWEEN))).toBe(true)
  })
})
