import { describe, expect, mock, test } from 'claude-code/testing'
import { planningStep } from './register'

// Planning turns (a spec or plan written, plan mode left) are read, not waited out: textless steps aside for them.
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
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const row = (e: any, component: string, props: Record<string, unknown>) => e.ui.mount({ plugin: 'textless', surface: 'desktop', component, props })
const shown = async (ui: any) => (await ui.find({ key: 'core' })) !== undefined

describe('planning turns', () => {
  test('what counts as planning', () => {
    expect(planningStep('Write', { file_path: 'docs/specs/login.md' })).toBe(true)
    expect(planningStep('Edit', { file_path: 'C:\\repo\\PLAN.MD' })).toBe(true)
    expect(planningStep('ExitPlanMode', {})).toBe(true)
    expect(planningStep('Edit', { file_path: 'src/login.ts' })).toBe(false)
    expect(planningStep('Bash', { command: 'cat notes.md' })).toBe(false)
  })

  test('a spec written mid-turn: the turn shows as it is, with the label, and nothing folds after', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'write a spec for the login page' })
    await wait(1600)
    await row(e, 'ToolUse', { tool_use_id: 'r1', tool: 'Read', input: { file_path: 'src/login.ts' }, isRunning: true })
    await clock.advance(3500)
    // The card is up and the in-between text hides, as usual.
    expect(await shown(await row(e, 'AssistantMessage', { text: 'Here is the plan so far.' }))).toBe(false)
    const write = await row(e, 'ToolUse', { tool_use_id: 'w1', tool: 'Write', input: { file_path: 'docs/login-spec.md' }, isRunning: true })
    expect(await write.find({ key: 'textless-planning' })).toBeDefined()
    expect(await shown(await row(e, 'AssistantMessage', { text: 'Here is the plan so far.' }))).toBe(true)
    await row(e, 'AssistantMessage', { text: 'Is this spec okay?' })
    await e.turn.complete({ answer: 'Is this spec okay?', reason: 'answer', durationMs: 30000, isAborted: false, turnId: 'p' })
    expect(await shown(await row(e, 'AssistantMessage', { text: 'Here is the plan so far.' }))).toBe(true)
    expect(await shown(await row(e, 'ToolUse', { tool_use_id: 'r1', tool: 'Read', input: {}, isRunning: false }))).toBe(true)
  })

  test('a code edit is no planning: the turn folds as usual', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'fix the login bug' })
    await wait(1600)
    await row(e, 'ToolUse', { tool_use_id: 'c1', tool: 'Edit', input: { file_path: 'src/login.ts' }, isRunning: true })
    await clock.advance(3500)
    const edit = await row(e, 'ToolUse', { tool_use_id: 'c2', tool: 'Edit', input: { file_path: 'src/auth.ts' }, isRunning: true })
    expect(await edit.find({ key: 'textless-planning' })).toBeUndefined()
    expect(await shown(await row(e, 'AssistantMessage', { text: 'Fixing it now.' }))).toBe(false)
  })
})
