import { describe, expect, mock, test } from 'claude-code/testing'
import { ANSWERS } from './register'

// Cover mode: once Claude is done, the whole chat hides behind one big card saying whose move it is.
const ASKED = 'Which colour should the button have?'
const ASKED_ANSWER = 'Which colour should the button have?\n\nI recommend orange, to match the rest of the page.'
const DONE = 'All done. The tests pass.'

function fakeHost(on: any) {
  const store = new Map<string, unknown>()
  const scrolled: unknown[] = []
  on('ui.scroll', ($: any, e: any) => { scrolled.push(e.to); return { value: {} } })
  on('env.get', () => ({ value: '' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text }))
  on('classic.UserPromptSubmit', () => ({}))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
  return { store, scrolled }
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const row = (e: any, component: string, props: Record<string, unknown>) => e.ui.mount({ plugin: 'textless', surface: 'desktop', component, props })
const shown = async (ui: any) => (await ui.find({ key: 'core' })) !== undefined

// A turn long enough for the work card: a step, then three seconds.
let stepN = 0
async function turn(e: any, clock: any, answer: string) {
  await e.prompt.submit({ text: 'please do it' })
  await wait(1600)
  await row(e, 'ToolUse', { tool_use_id: `t${++stepN}`, tool: 'Bash', input: { command: 'ls' }, isRunning: true })
  await clock.advance(3500)
  await row(e, 'AssistantMessage', { text: 'Looking at it.' })
  await row(e, 'AssistantMessage', { text: answer })
  await e.turn.complete({ answer, reason: 'answer', durationMs: 4000, isAborted: false, turnId: 'c' })
}

describe('cover mode', () => {
  test('is off unless turned on: a finished chat shows as usual', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await turn(e, clock, DONE)
    expect(await shown(await row(e, 'AssistantMessage', { text: DONE }))).toBe(true)
    expect(await (await row(e, 'AssistantMessage', { text: DONE })).find({ key: 'textless-cover' })).toBeUndefined()
  })

  test('on, the chat hides behind one big card; Show the chat brings it back and textless stays on', async ($, on) => {
    if (!ANSWERS) return // parked: see backup/answer-cards
    const host = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    expect((await e.command.run({ command: 'textless', args: 'cover on' })).text).toContain('covers a finished chat')
    expect(host.store.get('cover')).toBe(true)
    // The app hands the chat's title along with the message; the card shows it on top.
    await e.classic.UserPromptSubmit({ prompt: 'please do it', session_title: 'Fix the login page' })
    await turn(e, clock, ASKED_ANSWER)
    const last = await row(e, 'AssistantMessage', { text: ASKED_ANSWER })
    // Claude's recommendation shows under its question.
    expect(await last.find({ text: 'Recommended:' })).toBeDefined()
    expect(await last.find({ text: 'I recommend orange, to match the rest of the page.' })).toBeDefined()
    expect(await last.find({ key: 'textless-cover' })).toBeDefined()
    expect(await last.find({ text: 'Show the chat' })).toBeDefined()
    expect(await last.find({ text: 'Fix the login page' })).toBeDefined()
    // One line saying what it is about: here the question Claude asked.
    expect(await last.find({ text: ASKED })).toBeDefined()
    expect(await shown(await row(e, 'AssistantMessage', { text: 'Looking at it.' }))).toBe(false)
    expect(await shown(await row(e, 'UserMessage', { text: 'please do it' }))).toBe(false)
    expect(await shown(await row(e, 'ToolUse', { tool_use_id: 'x1', tool: 'Bash', input: {}, isRunning: false }))).toBe(false)
    await last.press({ key: 'textless-cover-show' })
    // Shown: the answer again, with the card staying under it, now offering to hide the chat.
    const open = await row(e, 'AssistantMessage', { text: ASKED_ANSWER })
    expect(await shown(open)).toBe(true)
    expect(await open.find({ key: 'textless-cover' })).toBeDefined()
    expect(JSON.stringify(await open.drawn())).toContain('Hide the chat')
    // The question shows once, on the card: the done row does not list it again.
    expect(JSON.stringify(await open.drawn())).not.toMatch(/done-\d+-asks/)
    expect(await open.find({ key: 'textless-cover-asks' })).toBeDefined()
    expect(await shown(await row(e, 'AssistantMessage', { text: ASKED_ANSWER }))).toBe(true)
    expect(await shown(await row(e, 'UserMessage', { text: 'please do it' }))).toBe(true)
    // textless stayed on: once the next message is sent, the old chat hides again while Claude works.
    await e.prompt.submit({ text: 'next one' })
    await wait(1600)
    await row(e, 'ToolUse', { tool_use_id: 'n1', tool: 'Bash', input: {}, isRunning: true })
    await clock.advance(3500)
    expect(await shown(await row(e, 'AssistantMessage', { text: ASKED_ANSWER }))).toBe(false)
    await row(e, 'AssistantMessage', { text: DONE })
    await e.turn.complete({ answer: DONE, reason: 'answer', durationMs: 4000, isAborted: false, turnId: 'n' })
    const next = await row(e, 'AssistantMessage', { text: DONE })
    expect(await next.find({ key: 'textless-cover' })).toBeDefined()
    // No question: no list, only the word.
    expect(await next.find({ key: 'textless-cover-asks' })).toBeUndefined()
  })
})

describe('cover mode and quick turns', () => {
  test('a quick answer with no work card leaves the chat as it is', async ($, on) => {
    fakeHost(on)
    mock.clock(on)
    const e: any = $
    await e.command.run({ command: 'textless', args: 'cover on' })
    await e.prompt.submit({ text: 'what is 2+2?' })
    await wait(1600)
    await row(e, 'AssistantMessage', { text: '4' })
    await e.turn.complete({ answer: '4', reason: 'answer', durationMs: 1200, isAborted: false, turnId: 'q' })
    const answer = await row(e, 'AssistantMessage', { text: '4' })
    expect(await shown(answer)).toBe(true)
    expect(await answer.find({ key: 'textless-cover' })).toBeUndefined()
    expect(await shown(await row(e, 'UserMessage', { text: 'what is 2+2?' }))).toBe(true)
  })
})

describe('under answers off', () => {
  test('the done line goes too: only show steps stays', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.command.run({ command: 'textless', args: 'summary off' })
    await e.prompt.submit({ text: 'please do it' })
    await wait(1600)
    await row(e, 'ToolUse', { tool_use_id: 's1', tool: 'Bash', input: { command: 'ls' }, isRunning: true })
    await clock.advance(3500)
    await row(e, 'AssistantMessage', { text: DONE })
    await e.turn.complete({ answer: DONE, reason: 'answer', durationMs: 60000, isAborted: false, turnId: 'd' })
    const answer = await row(e, 'AssistantMessage', { text: DONE })
    const drawn = JSON.stringify(await answer.drawn())
    expect(drawn).toContain('"label":"show steps"')
    expect(drawn).not.toContain(' · ')
  })
})
