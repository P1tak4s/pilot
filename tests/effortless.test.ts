import { describe, expect, mock, test as baseTest } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { guarded, GUARD_AT, helperFloor, namedEffort, hotVisible, looksLikeRedo, REDO_STAY_PROMPTS, routeWorth, syncPlan, tipped, bounded, handoffEvidence, parseHandoffAnswer, withJevKey, parseVerdict, capped, resetLabel, usageParts, HANDOFF_PROMPT, handoffMessage, withAttachments, endsOnQuestion, keepsEffort, benchGrade, benchReport, judgeFailure, contextFrom, readConfig, asSpent, cacheColor, cacheLabel, cacheClock, cacheSafe, cacheTtlOf, mostlyCached, isFollowUp, parseJevAnswer, parseJevKey, savedText, forkOutcome, setupNext, setupBack, setupCounter, dashboardLines, flashColor, handoffGlowStep, weighted, handoffLook, isNewer, latestRelease, updateSnoozed, updateFailure, claudeCandidates, noClaudeHint, compactTranscript, judgeGlowSvg, judgeGlowAt, judgeBrightnessAt, JUDGE_RISE_MS, JUDGE_FADE_MS, JUDGE_STEP_MS, JUDGE_PIECE_MS } from '../hooks/register'
import { ART_COLUMNS, artFrame, artPixel, MOVING } from '../hooks/art'
import { isLight, lightHex, lightProps, setLight, setTheme, themedEls, themedSvg, tint, tintHex } from '../hooks/theme'
import { importsOf, moduleLinks, moduleOf, relPath, withTouch } from '../hooks/agents'
import { afterPrompt, currentStep, phaseAtTurnEnd, progressShare, progressShows, progressTitle, soundArgv, stepNumber, stepsFromTodos, withTaskCreated, withTaskUpdated } from '../hooks/progress'


// Most tests below were written for the footer's buttons: they run in the minimal look unless they name another.
// The dashboard's own tests pass { layout: 'default' }.
type Opts = Parameters<typeof baseTest>[1]
const minimal = (o?: Record<string, unknown>) => ({ ...(o ?? {}), options: { layout: 'minimal', ...((o?.options as object) ?? {}) } })
const test = ((name: string, a: unknown, b?: unknown) =>
  b === undefined
    ? baseTest(name, minimal() as Opts, a as never)
    : baseTest(name, minimal(a as Record<string, unknown>) as Opts, b as never)) as typeof baseTest

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

/** A TypeSafe System One reply: Jev's choice for effort and model, sure as given. */
const jevReply = (effort: string, sure = 0.9, model = 'opus') =>
  JSON.stringify({
    answers: { effort: { choice: effort, confidence: sure }, model: { choice: model, confidence: 0.8 } },
    usage: { input_tokens: 480, output_tokens: 54 },
  })

/** Haiku as the judge answers this reply, and counts how often it was asked. */
function judgeSays(on: On, text: string) {
  const asked: string[] = []
  on('model.complete', (_$, e) => {
    asked.push(e.prompt)
    return { value: { isAnswered: true as const, text, usage: USAGE } }
  })
  return asked
}

/** What sits beneath the plugins in a session: the prompt goes through, the status line takes text. */
function engine(on: On, env: Record<string, string> = {}, sessionModel = 'claude-opus-5-5', said: { role: string; text: string }[] = []) {
  mock.store(on)
  mock.env(on, { EFFORTLESS_MODEL_UI: '1', ...env })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.status', () => ({ value: undefined }))
  on('session.messages', () => ({ value: said }) as never)
  on('session.model', () => ({ value: sessionModel }))
  on('command.list', () => ({ value: [{ name: 'model' }, { name: 'effort' }, { name: 'session-handoff', source: 'user' }] as never }))
}

/** Records the slash commands the mod runs, as the person's own /model and /effort. */
function recordCommands(on: On) {
  const ran: string[] = []
  on('command.run', (_$, e) => {
    ran.push(`/${e.command} ${e.args}`)
    return { text: 'ok' }
  })
  return ran
}

/** Records the model and effort each main-conversation request was sent with. */
function recordSteps(on: On) {
  const sent: { model: string; effort: unknown }[] = []
  on('turn.step', async function* (_$, e) {
    sent.push({ model: e.model, effort: e.effort })
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return sent
}

/** One main-loop request, the engine sending `effort` as its own setting (high unless /effort set another). */
async function step($: Engine, effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max' = 'high') {
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort, messageCount: 1 })
  for await (const _ of stream) {
    // drain
  }
}

/** The desktop footer: one Auto button, and the effort in use beside it. */
const FOOTER = { plugin: 'pilot', surface: 'desktop', component: 'SessionMode', props: { modes: [] } } as never

/** The band above the prompt on desktop: it draws nothing (only the terminal has rows there). */
const DESK_BAND = { plugin: 'pilot', surface: 'desktop', ...BAND } as never

/** What a mounted tree draws, as text: its elements, props and strings. */
/** Nothing shows above the prompt on desktop: only the hidden hover cards, revealed by hovering the footer. */
async function noBand($: Engine, at: never) {
  const ui = await $.ui.mount(at)
  const text = await drawn(ui)
  expect(text).toContain('hover-cards')
  expect(text).not.toMatch(/"key":"(settings|setup|down|hot|cold|swamp)"/)
  await ui.unmount()
}

async function drawn(ui: { drawn: () => Promise<unknown> }): Promise<string> {
  return JSON.stringify(await ui.drawn())
}

/**
 * The band's buttons take clicks: the app draws anything in the flow under an absolutely placed art layer, so the
 * layer holding them must itself be absolute and come after the art.
 */
async function clickable(ui: { drawn: () => Promise<unknown> }, layer: string) {
  const find = (node: unknown): Record<string, unknown> | undefined => {
    if (!node || typeof node !== 'object') return undefined
    const n = node as Record<string, unknown>
    const props = (n.props ?? {}) as Record<string, unknown>
    if (n.key === layer || props.key === layer) return n
    for (const value of Object.values(n)) {
      const hit = Array.isArray(value) ? value.map(find).find(Boolean) : find(value)
      if (hit) return hit
    }
    return undefined
  }
  const node = find(await ui.drawn())
  expect(node).toBeDefined()
  const props = ((node as Record<string, unknown>).props ?? node) as Record<string, unknown>
  expect(props.position).toBe('absolute')
}

describe('auto', () => {
  test('with the cheaper model off, effort follows the judge and the model stays the one in use', { options: { modelAuto: 'off' } } as never, async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple question"}')
    const sent = recordSteps(on)

    await $.prompt.submit({ text: 'vad heter mappen?', wait: false, origin: { kind: 'composer' } })
    await step($)

    expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'low' })
  })

  test('Auto switched off: the app effort goes out, not the pick the judge made while Auto was on', async ($, on) => {
    engine(on)
    on('model.complete', () => ({ value: { isAnswered: true as const, text: '{"model":"opus","effort":"low","why":"tiny"}', usage: USAGE } }))
    const sent = recordSteps(on)
    await $.prompt.submit({ text: 'rename this one variable for me', wait: false, origin: { kind: 'composer' } })
    await step($, 'xhigh')
    expect(sent[0].effort).toBe('low')
    // Auto off, the app still on Extra (no change the mod could see): Extra goes out, not the judge's old low.
    await $.command.run({ command: 'pilot', args: 'auto' })
    await step($, 'xhigh')
    expect(sent[1].effort).toBe('xhigh')
    await $.prompt.submit({ text: 'now plan the whole architecture', wait: false, origin: { kind: 'composer' } })
    await step($, 'xhigh')
    expect(sent[2].effort).toBe('xhigh')
  })

  test('routeWorth: a switch to a cold model pays only when it still comes out cheaper', () => {
    const big = 100_000
    // Opus chat, cache warm: a cold Sonnet writes the whole chat and costs more; a warm Sonnet is far cheaper.
    expect(routeWorth('sonnet', 'opus', big, { to: false, inUse: true })).toBe(false)
    expect(routeWorth('sonnet', 'opus', big, { to: true, inUse: true })).toBe(true)
    // A cold Haiku writes the whole chat (a third of the price, 1.25 times) against a warm Opus read (twice the price, a tenth): still more.
    expect(routeWorth('haiku', 'opus', big, { to: false, inUse: true })).toBe(false)
    expect(routeWorth('haiku', 'opus', big, { to: true, inUse: true })).toBe(true)
    // The chat's own cache gone cold: staying would write it all again on Opus, so Sonnet wins even cold.
    expect(routeWorth('sonnet', 'opus', big, { to: false, inUse: false })).toBe(true)
    // No context size known: route as before.
    expect(routeWorth('sonnet', 'opus', 0, { to: false, inUse: true })).toBe(true)
  })

  test('a prompt the judge calls simple runs on Haiku 5.5; the next hard one is back on the chat model', { options: { modelAuto: 'on' } } as never, async ($, on) => {
    engine(on)
    let verdict = '{"model":"haiku","effort":"low","why":"simple question"}'
    on('model.complete', () => ({ value: { isAnswered: true as const, text: verdict, usage: USAGE } }))
    const sent = recordSteps(on)
    await $.prompt.submit({ text: 'vad heter mappen?', wait: false, origin: { kind: 'composer' } })
    await step($)
    expect(sent[0]).toEqual({ model: 'claude-haiku-5-5', effort: 'low' })
    verdict = '{"model":"opus","effort":"high","why":"big refactor"}'
    await $.prompt.submit({ text: 'refactor the whole auth layer', wait: false, origin: { kind: 'composer' } })
    await step($)
    expect(sent[1]).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  })

  test('a typed skill is judged like a prompt (told what it is); the app\'s own commands are not', { options: { modelAuto: 'on' } } as never, async ($, on) => {
    engine(on)
    const asked: string[] = []
    on('model.complete', (_$, e) => {
      asked.push(String((e as { prompt?: string }).prompt ?? ''))
      return { value: { isAnswered: true as const, text: '{"model":"haiku","effort":"low","why":"small job"}', usage: USAGE } }
    })
    const sent = recordSteps(on)
    // /session-handoff is a user skill (see engine's command list): judged, even though it is short enough to look like a follow-up.
    await $.prompt.submit({ text: '/session-handoff', wait: false, origin: { kind: 'composer' } })
    await step($)
    expect(asked.length).toBe(1)
    expect(asked[0]).toContain('slash command that runs a skill')
    expect(sent[0].model).toBe('claude-haiku-5-5')
    // /model is the app's own: never judged.
    await $.prompt.submit({ text: '/model', wait: false, origin: { kind: 'composer' } })
    expect(asked.length).toBe(1)
  })

  test('the judge never moves a prompt to a dearer model than the chat model, nor to Fable', async ($, on) => {
    engine(on, {}, 'claude-sonnet-5-5')
    judgeSays(on, '{"model":"opus","effort":"high","why":"hard"}')
    const sent = recordSteps(on)
    await $.prompt.submit({ text: 'debug this race condition', wait: false, origin: { kind: 'composer' } })
    for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-sonnet-5-5', effort: 'high', messageCount: 1 })) {
      // drain
    }
    expect(sent[0].model).toBe('claude-sonnet-5-5')
  })

  test('a reply that is not a verdict leaves the session as it is', async ($, on) => {
    engine(on)
    judgeSays(on, 'I think sonnet')
    const sent = recordSteps(on)

    await $.prompt.submit({ text: 'fixa buggen', wait: false, origin: { kind: 'composer' } })
    await step($)

    expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'high' })
  })

  test('Jev on TypeSafe decides when TYPESAFE_API_KEY is set, with typed questions, and Haiku is not asked', async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' })
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"haiku","effort":"low","why":"x"}')
    const calls: { url: string; auth?: string; body: Record<string, any> }[] = []
    on('http.fetch', (_$, e) => {
      calls.push({
        url: e.url,
        auth: (e.init?.headers as Record<string, string> | undefined)?.authorization,
        body: JSON.parse(String(e.init?.body)),
      })
      return { value: { status: 200, ok: true, headers: {}, text: jevReply('max') } }
    })
    const sent = recordSteps(on)

    await $.prompt.submit({ text: 'designa om hela relayn', wait: false, origin: { kind: 'composer' } })
    await step($)

    expect(calls.length).toBe(1)
    expect(calls[0].url).toBe('https://api.typesafe.ai/v1/systemone')
    expect(calls[0].auth).toBe('Bearer k')
    expect(calls[0].body.model).toBe('jev-latest')
    expect(calls[0].body.state.next_message).toBe('designa om hela relayn')
    expect(calls[0].body.questions.effort.type).toBe('choice')
    expect(Object.keys(calls[0].body.questions.effort.criteria)).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(asked.length).toBe(0)
    expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'max' })
  })

  test('slash commands are not judged', async ($, on) => {
    engine(on)
    const asked = judgeSays(on, '{"model":"opus","effort":"max","why":"x"}')

    await $.prompt.submit({ text: '/clear', wait: false, origin: { kind: 'composer' } })

    expect(asked.length).toBe(0)
  })
})

describe('manual effort', () => {
  test("the app's own Effort control wins over Auto and turns it off", async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"opus","effort":"high","why":"hard"}')
    const sent = recordSteps(on)
    const drain = async (index: number, effort: 'low' | 'medium' | 'high') => {
      for await (const _ of $.turn.step({ turnId: 't1', index, model: 'claude-opus-5-5', effort, messageCount: 1 })) {
        // drain
      }
    }

    await $.prompt.submit({ text: 'hard task', wait: false, origin: { kind: 'composer' } })
    await drain(0, 'medium')
    expect(sent[0].effort).toBe('high')

    // The person picks Low in the app between two requests.
    await drain(1, 'low')
    expect(sent[1].effort).toBe('low')
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    expect((await ui.find({ key: 'auto' }))?.text).toContain('Auto off')
    await ui.unmount()

    await drain(2, 'low')
    expect(sent[2].effort).toBe('low')
  })
})

describe('model in use', () => {
  test('a switch in the app moves the band, and effort applies to the new model at once', { options: { modelAuto: 'off' } } as never, async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"kort"}')
    const sent = recordSteps(on)
    mock.clock(on)
    on('classic.PostModelSwitch', () => ({}) as never)
    const switchTo = (from: string, to: string) =>
      $.classic.PostModelSwitch({ from_model: from, to_model: to, requested_model: null, source: 'picker', context_tokens: 0 } as never)

    await switchTo('claude-opus-5-5', 'claude-haiku-5-5')
    await $.prompt.submit({ text: 'ok', wait: false, origin: { kind: 'composer' } })
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await ui.redraw()
    expect((await ui.find({ key: 'm-haiku' }))?.text).toContain('Haiku')

    // The person picks Opus in the app.
    await switchTo('claude-haiku-5-5', 'claude-opus-5-5')
    await ui.redraw()
    expect((await ui.find({ key: 'm-opus' }))?.text).toContain('Opus')

    await step($, 'medium')
    expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'low' })
    await ui.unmount()
  })
})

describe('two autos', () => {
  test('Auto for model starts off: effort follows the judge and no model is suggested', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"sonnet","effort":"low","why":"simple"}')
    const ran = recordCommands(on)
    const sent = recordSteps(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    expect((await ui.find({ key: 'auto' }))?.text).toContain('Auto on')
    expect((await ui.find({ key: 'auto-model' }))?.text).toContain('Auto off')

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await ui.redraw()
    expect(await ui.find({ key: 'accept' })).toBeUndefined()

    await step($, 'medium')
    expect(sent[0].effort).toBe('low')
    expect(ran).toEqual([])
    await ui.unmount()
  })

  test('Auto for effort off: the judge may still suggest a model, effort is left alone', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple"}')
    const ran = recordCommands(on)
    const mocked = mock.clock(on)
    on('turn.complete', () => ({ text: '' }))
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await ui.press({ key: 'auto' })
    await ui.press({ key: 'auto-model' })

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await ui.redraw()
    expect(await ui.find({ key: 'accept' })).toBeDefined()

    await $.turn.complete({ turnId: 't1', answer: '', durationMs: 1, isAborted: false, reason: 'completed' } as never)
    await mocked.advance(10)
    expect(ran).toEqual([])
    await ui.unmount()
  })
})

describe('typed commands', () => {
  const box = (on: On, draft: string) => {
    const filled: string[] = []
    on('prompt.read', () => ({ value: { text: draft, cursor: draft.length } }) as never)
    on('prompt.fill', (_$, e) => {
      filled.push(e.text)
      return { isFilled: true } as never
    })
    return filled
  }

  test('a model click types /model into an empty box for you to send', async ($, on) => {
    engine(on)
    const filled = box(on, '')
    const ran = recordCommands(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })

    await ui.press({ key: 'm-haiku' })

    expect(filled).toEqual(['/model haiku'])
    expect(ran).toEqual([])
    await ui.unmount()
  })

  test('with a draft in the box nothing is overwritten and the mod runs the model switch itself', async ($, on) => {
    engine(on)
    const filled = box(on, 'ett halvskrivet meddelande')
    const ran = recordCommands(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })

    await ui.press({ key: 'm-haiku' })

    expect(filled).toEqual([])
    expect(ran).toEqual(['/model haiku'])
    await ui.unmount()
  })

  test('an effort click sets the effort at once and also types /effort for the app', async ($, on) => {
    engine(on)
    const filled = box(on, '')
    const sent = recordSteps(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })

    await ui.press({ key: 'e-high' })
    await step($, 'medium')

    expect(filled).toEqual(['/effort high'])
    expect(sent[0].effort).toBe('high')
    await ui.unmount()
  })
})

describe('footer text', () => {
  const PURPLE = '#a79cf7'
  const auto = async ($: Engine) => String((await $.command.run({ command: 'pilot', args: 'auto' })).text)
  const saving = (on: On, outputTokens: number) =>
    on('turn.step', async function* (_$, e) {
      return {
        turnId: e.turnId,
        index: e.index,
        answer: '',
        toolUses: [],
        stopReason: 'end_turn',
        usage: { ...USAGE, output_tokens: outputTokens, model: 'claude-opus-5-5' },
      } as never
    })
  const asked = async ($: Engine) => String((await $.command.run({ command: 'pilot', args: 'stats' })).text)

  test('the footer is purple text and one small button; no box, nothing lit', async ($, on) => {
    engine(on)
    const footer = await $.ui.mount(FOOTER)
    const text = await drawn(footer)
    expect(text).toContain(`"color":"${PURPLE}"`)
    expect(text).toContain('"children":[" Auto "]')
    // The only button is the small switch for Auto: no label other than the power glyph, not the lit look.
    // The Auto switch, the setup (or settings gear) and the handoff symbol.
    expect(text.match(/"type":"Button"/g)?.length).toBe(3)
    expect(text).toContain('"label":" ⏻ "')
    // No frame of its own (it drew wide and cut off): plain, with the same grey box as the level on hover.
    expect(text).toContain('"plain":true')
    expect(text).toContain('"hover":{"scope":"power","backgroundColor":"#2b2b2f"}')
    expect(text).not.toContain('"variant":"primary"')
    expect(text).not.toContain('borderStyle')
    // Hovering the level puts a grey box behind it.
    expect(text).toContain('"hover":{"scope":"effort","backgroundColor":"#2b2b2f"}')
    // No background at rest: the only ones are in the hover styles and the hidden hover cards (display none).
    expect(text.replaceAll('"backgroundColor":"#2b2b2f"}', '').replaceAll('"backgroundColor":"#221c3a"', '')).not.toContain('backgroundColor')
    await footer.unmount()
  })

  test('with Auto on it is the effort in use, in purple', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"sonnet","effort":"high","why":"hard"}')
    const footer = await $.ui.mount(FOOTER)
    await $.prompt.submit({ text: 'hard task', wait: false, origin: { kind: 'composer' } })
    const text = await drawn(footer)
    expect(text).toContain('"children":[" High "]')
    expect(text).toContain(`"color":"${PURPLE}"`)
    await footer.unmount()
  })

  test('the small button switches Auto off ("Off", dim, not purple) and on again', async ($, on) => {
    engine(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"high","why":"hard"}')
    const footer = await $.ui.mount(FOOTER)
    await $.prompt.submit({ text: 'hard task', wait: false, origin: { kind: 'composer' } })
    expect(await drawn(footer)).toContain('"children":[" High "]')

    await footer.press({ key: 'auto' })
    const off = await drawn(footer)
    expect(off).toContain('"children":[" Off "]')
    expect(off).not.toContain(`"color":"${PURPLE}"`)
    await $.prompt.submit({ text: 'en till', wait: false, origin: { kind: 'composer' } })
    expect(asked.length).toBe(1)

    await footer.press({ key: 'auto' })
    expect(await drawn(footer)).toContain(`"color":"${PURPLE}"`)

    // The command does the same.
    expect(await auto($)).toContain('Auto off')
    expect(await drawn(footer)).toContain('"children":[" Off "]')
    await footer.unmount()
  })

  test("the app's own Effort control turns Auto off and the footer says Off", async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"sonnet","effort":"high","why":"hard"}')
    recordSteps(on)
    const footer = await $.ui.mount(FOOTER)
    await $.prompt.submit({ text: 'hard task', wait: false, origin: { kind: 'composer' } })
    await step($, 'medium')
    expect(await drawn(footer)).toContain(`"color":"${PURPLE}"`)

    // The person picks another effort in the app between two requests.
    await step($, 'low')
    expect(await drawn(footer)).toContain('"children":[" Off "]')
    await footer.unmount()
  })

  test('on Haiku there is no effort to name', async ($, on) => {
    engine(on, {}, 'claude-haiku-5-5')
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple"}')
    mock.clock(on)
    on('classic.PostModelSwitch', () => ({}) as never)
    const footer = await $.ui.mount(FOOTER)
    await $.classic.PostModelSwitch({
      from_model: 'claude-opus-5-5',
      to_model: 'claude-haiku-5-5',
      requested_model: 'haiku',
      source: 'picker',
      context_tokens: 0,
    } as never)
    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    expect(await drawn(footer)).not.toContain('Low')
    await footer.unmount()
  })

  test('the judge is told that scope counts: a short message can be a big job', async ($, on) => {
    engine(on)
    let system = ''
    on('model.complete', (_$, e) => {
      system = String(e.system)
      return { value: { isAnswered: true as const, text: '{"model":"opus","effort":"high","why":"stor uppgift"}', usage: USAGE } } as never
    })
    await $.prompt.submit({ text: 'go through my whole google drive and clean it up', wait: false, origin: { kind: 'composer' } })
    expect(system).toContain('SCOPE')
    expect(system).toContain('whole drive')
    expect(system).toContain('never low')
  })

  test('a thinking state while the judge decides', async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    // The judge takes half a second to answer.
    on('model.complete', async () => {
      await mocked.sleep(500)
      return { value: { isAnswered: true as const, text: '{"model":"sonnet","effort":"high","why":"x"}', usage: USAGE } } as never
    })
    const footer = await $.ui.mount(FOOTER)
    expect(await drawn(footer)).not.toContain('Deciding')

    const submitted = $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await mocked.advance(100)
    expect(await drawn(footer)).toContain('"children":[" Deciding… "]')

    await mocked.advance(600)
    await submitted
    expect(await drawn(footer)).not.toContain('Deciding')
    expect(await drawn(footer)).toContain('"children":[" High "]')
    await footer.unmount()
  })

  test('a switch is shown as Low → High for a moment, then only the level', async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    let verdict = '{"model":"sonnet","effort":"low","why":"simple"}'
    on('model.complete', () => ({ value: { isAnswered: true as const, text: verdict, usage: USAGE } }) as never)
    const footer = await $.ui.mount(FOOTER)

    // The first verdict has nothing to switch from.
    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    expect(await drawn(footer)).not.toContain('→')

    verdict = '{"model":"sonnet","effort":"high","why":"hard"}'
    await $.prompt.submit({ text: 'hard task across several files', wait: false, origin: { kind: 'composer' } })
    expect(await drawn(footer)).toContain('"children":[" Low → High "]')

    await mocked.advance(2600)
    const settled = await drawn(footer)
    expect(settled).not.toContain('→')
    expect(settled).toContain('"children":[" High "]')
    await footer.unmount()
  })

  test('/pilot stats reports the measured cost of every token kind, per effort, and the judge', async ($, on) => {
    engine(on)
    mock.clock(on)
    judgeSays(on, '{"model":"sonnet","effort":"low","why":"simple"}')
    on('turn.step', async function* (_$, e) {
      return {
        turnId: e.turnId,
        index: e.index,
        answer: '',
        toolUses: [],
        stopReason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 600, cache_read_input_tokens: 10000, cache_creation_input_tokens: 800, model: 'claude-opus-5-5' },
      } as never
    })
    expect(await asked($)).toContain('nothing measured yet')

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await step($, 'high')

    // 100 in + 800 written x1.25 + 10000 read x0.1 + 600 out x5 = 100 + 1000 + 1000 + 3000 = 5100.
    const text = await asked($)
    expect(text).toContain('1 prompts, 1 requests, cost about 5.1k')
    expect(text).toContain('cache reads 20 %, cache writes 20 %, output 59 %')
    expect(text).toContain('Low 1, average 5.1k')
    expect(text).toContain('Judge: Jev 0, Haiku 1')
    expect(text).not.toContain('saved about')
  })

  test('requests you steered yourself are not counted', async ($, on) => {
    engine(on)
    saving(on, 600)
    const rows = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await rows.press({ key: 'e-low' })
    await step($, 'high')
    expect(await asked($)).toContain('nothing measured yet')
    await rows.unmount()
  })

  test('nothing is drawn above the prompt on desktop', async ($, on) => {
    engine(on)
    await expect($.ui.mount(DESK_BAND)).rejects.toThrow()
  })

  test('a model suggestion still asks above the prompt on desktop', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple"}')
    mock.clock(on)
    const rows = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await rows.press({ key: 'auto-model' })

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    const ask = await $.ui.mount(DESK_BAND)
    expect(await ask.find({ key: 'accept' })).toBeDefined()
    await ask.unmount()
    await rows.unmount()
  })

  test('the model row is paused: effort only, unless EFFORTLESS_MODEL_UI=1', async ($, on) => {
    engine(on, { EFFORTLESS_MODEL_UI: '0' })
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    expect(await ui.find({ key: 'e-high' })).toBeDefined()
    expect(await ui.find({ key: 'm-opus' })).toBeUndefined()
    expect(await ui.find({ key: 'auto-model' })).toBeUndefined()
    await ui.unmount()
  })
})

describe('helpers', () => {
  test('cacheSafe: effort may change on Opus 5.5 and Sonnet 5.5 only', () => {
    expect(cacheSafe('claude-opus-5-5')).toBe(true)
    expect(cacheSafe('claude-sonnet-5-5[1m]')).toBe(true)
    expect(cacheSafe('claude-fable-5-1')).toBe(false)
    expect(cacheSafe('claude-opus-4-8')).toBe(false)
    expect(cacheSafe('claude-opus-5')).toBe(false)
  })

  test('parseJevKey reads the key line, quoted or not, and nothing else', () => {
    expect(parseJevKey('TYPESAFE_API_KEY=abc')).toBe('abc')
    expect(parseJevKey('X=1\n  TYPESAFE_API_KEY = "q w" \n')).toBe('q w')
    expect(parseJevKey('TYPESAFE_API_KEY=')).toBeUndefined()
    expect(parseJevKey('OTHER=1')).toBeUndefined()
  })

  test('parseJevAnswer: a sure answer wins, an unsure one keeps the current effort, junk is nothing', () => {
    const current = { model: 'opus' as const, effort: 'high' as const, why: '', by: 'manual' as const }
    expect(parseJevAnswer(jevReply('low', 0.9), current)?.effort).toBe('low')
    expect(parseJevAnswer(jevReply('low', 0.4), current)?.effort).toBe('high')
    expect(parseJevAnswer(jevReply('low', 0.4), null)?.effort).toBe('low')
    expect(parseJevAnswer(jevReply('turbo'), current)).toBeUndefined()
    expect(parseJevAnswer('nope', current)).toBeUndefined()
  })
})

describe('follow-ups', () => {
  test('isFollowUp: short go-aheads yes, real requests no', () => {
    for (const t of ['go', 'ok', ' yes ', 'ok go', 'continue']) expect(isFollowUp(t)).toBe(true)
    for (const t of ['', 'rename x to count in utils', 'go through my whole drive']) expect(isFollowUp(t)).toBe(false)
  })

  test('"go" after a judged prompt keeps its effort and asks no judge', async ($, on) => {
    engine(on)
    const asked = judgeSays(on, '{"model":"opus","effort":"high","why":"hard"}')
    const sent = recordSteps(on)
    await $.prompt.submit({ text: 'granska hela relayn', wait: false, origin: { kind: 'composer' } })
    await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
    await step($, 'medium')
    expect(asked.length).toBe(1)
    expect(sent[0].effort).toBe('high')
  })
})

describe('named level', () => {
  test('namedEffort: a level said with the word effort, or xhigh, counts; other senses and negations do not', () => {
    expect(namedEffort('do this with max effort please')).toBe('max')
    expect(namedEffort('Effort: high, then refactor the relay')).toBe('high')
    expect(namedEffort('run it at effort low')).toBe('low')
    expect(namedEffort('use extra high effort for this one')).toBe('xhigh')
    expect(namedEffort('xhigh, review the whole repo')).toBe('xhigh')
    expect(namedEffort('maximum effort on this bug')).toBe('max')
    expect(namedEffort('make a medium sized image')).toBeUndefined()
    expect(namedEffort('this needs a lot of effort, the bug is high up in the stack')).toBeUndefined()
    expect(namedEffort("don't use max effort for this")).toBeUndefined()
    expect(namedEffort('no need for high effort here')).toBeUndefined()
    expect(namedEffort('a high effort job: migrate everything')).toBe('high')
  })

  test('a prompt that names a level runs at it without asking the judge, past Max', { options: { effortCeiling: 'high' } } as never, async ($, on) => {
    engine(on)
    const asked = judgeSays(on, '{"model":"opus","effort":"low","why":"small"}')
    const sent = recordSteps(on)
    await $.prompt.submit({ text: 'max effort: find why the relay drops messages', wait: false, origin: { kind: 'composer' } })
    await step($, 'medium')
    expect(asked.length).toBe(0)
    expect(sent[0].effort).toBe('max')
    // The next prompt without a level goes back to the judge, within Max.
    await $.prompt.submit({ text: 'now rename the helper in utils', wait: false, origin: { kind: 'composer' } })
    await step($, 'medium')
    expect(asked.length).toBe(1)
    expect(sent[1].effort).toBe('low')
  })
})

describe('state from an older version', () => {
  test('the pre-0.2.0 tally { requests, actual, baseline } reads as an empty tally, never throws', () => {
    const old = { requests: 3, actual: 900, baseline: 1500 } as never
    expect(asSpent(old).judge).toEqual({ jev: 0, haiku: 0, ms: 0, tokens: 0 })
    expect(asSpent(old).byEffort).toEqual({})
    expect(() => savedText(old)).not.toThrow()
    expect(asSpent(undefined).prompts).toBe(0)
  })
})

describe('cache countdown', () => {
  const answer = (on: On, cacheCreation?: Record<string, number>) =>
    on('turn.step', async function* (_$, e) {
      return {
        turnId: e.turnId,
        index: e.index,
        answer: '',
        toolUses: [],
        stopReason: 'end_turn',
        usage: { ...USAGE, ...(cacheCreation ? { cache_creation: cacheCreation } : {}) },
      } as never
    })
  // The countdown's timer starts with the session, as in the app.
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }
  const shows = (text: string) => `"children":["${text}"]`

  test('cacheTtlOf and cacheLabel', () => {
    expect(cacheTtlOf({ cache_creation: { ephemeral_1h_input_tokens: 900, ephemeral_5m_input_tokens: 0 } })).toBe('1h')
    expect(cacheTtlOf({ cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 10 } })).toBe('5m')
    expect(cacheTtlOf({ input_tokens: 1 })).toBeUndefined()
    expect(cacheLabel(60)).toBe('59m')
    expect(cacheClock(3_521_000)).toBe('58:41')
    expect(cacheClock(59_400)).toBe('1:00')
    expect(cacheClock(5_000)).toBe('0:05')
    expect(cacheClock(0)).toBe('❄ Cold')
    expect(cacheLabel(1)).toBe('<1m')
    expect(cacheLabel(0)).toBe('❄ Cold')
    expect(cacheColor(60)).toBeUndefined()
    expect(cacheColor(22)).toBeUndefined()
    expect(cacheColor(21)).toBe('#e0a33a')
    expect(cacheColor(7)).toBe('#e0a33a')
    expect(cacheColor(6)).toBe('#e5534b')
    expect(cacheColor(1)).toBe('#e5534b')
    expect(cacheColor(0)).toBe('#7cc4ff')
    expect(mostlyCached({ input_tokens: 90000, cache_read_input_tokens: 10 })).toBe(false)
  })

  test('nothing before the first response; then it counts down with no further response, turns amber, goes cold', async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    answer(on, { ephemeral_1h_input_tokens: 500, ephemeral_5m_input_tokens: 0 })
    await start($, on)
    const footer = await $.ui.mount(FOOTER)
    expect(await drawn(footer)).not.toContain('Cold')

    await step($)
    expect(await drawn(footer)).toContain(shows('59m'))

    // No request in between: the session's own timer moves it.
    await mocked.advance(30 * 60_000)
    expect(await drawn(footer)).toContain(shows('29m'))

    expect(await drawn(footer)).not.toContain('"color":"#e')
    await mocked.advance(10 * 60_000)
    expect(await drawn(footer)).toContain(shows('19m'))
    expect(await drawn(footer)).toContain('"color":"#e0a33a"')
    await mocked.advance(16 * 60_000)
    const late = await drawn(footer)
    expect(late).toContain(shows('3m'))
    expect(late).toContain('"color":"#e5534b"')

    await mocked.advance(5 * 60_000)
    expect(await drawn(footer)).toContain(shows('❄ Cold'))

    await step($)
    expect(await drawn(footer)).toContain(shows('59m'))
    await footer.unmount()
  })

  test('a response that does not say its lifetime is counted as 1 hour', async ($, on) => {
    engine(on)
    mock.clock(on)
    answer(on)
    await start($, on)
    const footer = await $.ui.mount(FOOTER)
    await step($)
    expect(await drawn(footer)).toContain(shows('59m'))
    await footer.unmount()
  })

  test('a response that says 5 minutes counts down 5 minutes', async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    answer(on, { ephemeral_5m_input_tokens: 500 })
    await start($, on)
    const footer = await $.ui.mount(FOOTER)
    await step($)
    expect(await drawn(footer)).toContain(shows('4m'))
    await mocked.advance(6 * 60_000)
    expect(await drawn(footer)).toContain(shows('❄ Cold'))
    await footer.unmount()
  })

  /** The band above the prompt, with the first-run setup guide closed so the cold band can show. */
  const coldBand = async ($: Engine) => {
    const band = await $.ui.mount(DESK_BAND)
    if (await band.find({ key: 'setup-haiku' })) {
      await band.press({ key: 'setup-haiku' })
      await band.press({ key: 'setup-close' })
    }
    return band
  }

})

describe('cache guard', () => {
  test('on Fable Auto neither judges nor changes the effort, and the footer says Paused', async ($, on) => {
    engine(on, {}, 'claude-fable-5-1')
    const asked = judgeSays(on, '{"model":"opus","effort":"low","why":"x"}')
    const sent: unknown[] = []
    on('turn.step', async function* (_$, e) {
      sent.push(e.effort)
      return { turnId: e.turnId, index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
    })
    const footer = await $.ui.mount(FOOTER)
    await $.prompt.submit({ text: 'hard task', wait: false, origin: { kind: 'composer' } })
    const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-fable-5-1', effort: 'xhigh', messageCount: 1 })
    for await (const _ of stream) {
      // drain
    }
    expect(asked.length).toBe(0)
    expect(sent).toEqual(['xhigh'])
    expect(await drawn(footer)).toContain('"children":[" Paused "]')
    await footer.unmount()
  })

  test('a pick made on Opus 5.5 is not applied to a Fable request', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"opus","effort":"low","why":"x"}')
    const sent: unknown[] = []
    on('turn.step', async function* (_$, e) {
      sent.push(e.effort)
      return { turnId: e.turnId, index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
    })
    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    for (const model of ['claude-opus-5-5', 'claude-fable-5-1']) {
      const stream = $.turn.step({ turnId: 't1', index: 0, model, effort: 'xhigh', messageCount: 1 })
      for await (const _ of stream) {
        // drain
      }
    }
    expect(sent).toEqual(['low', 'xhigh'])
  })
})

describe('footer', () => {
  test('auto sets the effort of the request, never runs /effort or /model', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"sonnet","effort":"low","why":"simple"}')
    const ran = recordCommands(on)
    const sent = recordSteps(on)

    await $.prompt.submit({ text: 'rename the function', wait: false, origin: { kind: 'composer' } })
    await step($, 'medium')

    expect(sent[0].effort).toBe('low')
    expect(ran).toEqual([])
  })

  test('a different model is only suggested, and /effortless switch switches it', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple"}')
    const ran = recordCommands(on)
    const mocked = mock.clock(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await ui.press({ key: 'auto-model' })

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await mocked.advance(10)
    expect(ran.some(c => c.startsWith('/model'))).toBe(false)
    await ui.redraw()
    expect(await ui.find({ key: 'accept' })).toBeDefined()

    await ui.press({ key: 'accept' })
    expect(ran).toContain('/model haiku')
    await ui.unmount()
  })

  test('Keep turns the suggestion down and it does not come back', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple"}')
    recordCommands(on)
    const mocked = mock.clock(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await ui.press({ key: 'auto-model' })

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await mocked.advance(10)
    await ui.redraw()
    await ui.press({ key: 'decline' })
    await $.prompt.submit({ text: 'hej igen', wait: false, origin: { kind: 'composer' } })
    await mocked.advance(10)
    await ui.redraw()

    expect(await ui.find({ key: 'accept' })).toBeUndefined()
    await ui.unmount()
  })
})

describe('band', () => {
  for (const surface of ['terminal'] as const) {
    test(`clicking an effort turns auto off and is what the turn runs with (${surface})`, async ($, on) => {
      engine(on)
      const asked = judgeSays(on, '{"model":"haiku","effort":"low","why":"x"}')
      const sent = recordSteps(on)
      const ran = recordCommands(on)

      const ui = await $.ui.mount({ plugin: 'pilot', surface, ...BAND })
      expect((await ui.find({ key: 'auto' }))?.text).toContain('Auto on')

      await ui.press({ key: 'e-xhigh' })
      expect((await ui.find({ key: 'auto' }))?.text).toContain('Auto off')
      expect(ran).toEqual([])

      await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
      await step($, 'xhigh')

      expect(asked.length).toBe(0)
      expect(sent[0]).toEqual({ model: 'claude-opus-5-5', effort: 'xhigh' })

      await ui.press({ key: 'auto' })
      expect((await ui.find({ key: 'auto' }))?.text).toContain('Auto on')
      await ui.unmount()
    })
  }
})

describe('review fixes', () => {
  test('a Jev endpoint that never answers holds the prompt only for the timeout, then Haiku judges', async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' })
    const mocked = mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    on('http.fetch', () => new Promise(() => undefined) as never)
    const sent = recordSteps(on)

    const submitted = $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await mocked.advance(3500)
    await submitted
    await step($, 'high')

    expect(asked.length).toBe(1)
    expect(sent[0].effort).toBe('low')
  })

  test('Jev answering with an error status falls through to Haiku', async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' })
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    on('http.fetch', () => ({ value: { status: 500, ok: false, headers: {}, text: 'boom' } }))

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    expect(asked.length).toBe(1)
  })

  test('a model switch that changes the engine effort is not read as you choosing, Auto stays on', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"sonnet","effort":"low","why":"simple"}')
    mock.clock(on)
    on('classic.PostModelSwitch', () => ({}) as never)
    const sent = recordSteps(on)

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    await step($, 'xhigh')
    expect(sent[0].effort).toBe('low')

    // The person picks another model; the engine's own effort for it is different.
    await $.classic.PostModelSwitch({
      from_model: 'claude-opus-5-5',
      to_model: 'claude-sonnet-5-5',
      requested_model: 'sonnet',
      source: 'picker',
      context_tokens: 0,
    } as never)
    await step($, 'medium')

    // Auto still decides: the request keeps the judged effort instead of the engine's 'medium'.
    expect(sent[1].effort).toBe('low')
  })

  test('/pilot switch switches to the suggested model and /effortless keep turns it down', async ($, on) => {
    engine(on)
    judgeSays(on, '{"model":"haiku","effort":"low","why":"simple"}')
    const ran = recordCommands(on)
    const mocked = mock.clock(on)
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND })
    await ui.press({ key: 'auto-model' })

    await $.prompt.submit({ text: 'hej', wait: false, origin: { kind: 'composer' } })
    const result = await $.command.run({ command: 'pilot', args: 'switch' })
    await mocked.advance(10)
    expect(String(result.text)).toContain('haiku')
    expect(ran).toContain('/model haiku')

    await $.prompt.submit({ text: 'a new question about something else', wait: false, origin: { kind: 'composer' } })
    const kept = await $.command.run({ command: 'pilot', args: 'keep' })
    expect(String(kept.text)).toContain('Keeping')
    await ui.unmount()
  })
})

describe('judge choice (plugin settings)', () => {
  const chat = (content: string) =>
    JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 300, completion_tokens: 20 } })

  test('readConfig: an unknown or empty judge is auto, values are trimmed', () => {
    expect(readConfig(undefined).judge).toBe('auto')
    expect(readConfig({ judge: 'gpt' }).judge).toBe('auto')
    // The Custom judge is gone: a saved 'custom' reads as auto.
    expect(readConfig({ judge: 'custom' }).judge).toBe('auto')
    expect(readConfig({ judge: ' jev ' }).judge).toBe('jev')
    expect(readConfig({})).toEqual({
      judge: 'auto',
      typesafeKey: '',
      handoffSkill: '',
      handoffAfter: 'continue',
      bias: 0,
      floor: 'low',
      ceiling: 'max',
      hide: ['reason'],
      swampAt: 70,
      layout: 'default',
      compactWith: 'haiku',
      handoffButton: 'advised',
      modelAuto: 'off',
      helpers: 'off',
      theme: 'violet',
      appearance: 'auto',
    })
    expect(readConfig({ swampAt: '20' })).toMatchObject({ swampAt: 20 })
    expect(readConfig({ swampAt: '33' }).swampAt).toBe(70)
    expect(readConfig({ handoffSkill: '/session-handoff', handoffAfter: 'confirm' })).toMatchObject({
      handoffSkill: 'session-handoff',
      handoffAfter: 'confirm',
    })
  })

  test('haiku: a TypeSafe key in the environment is not used', { options: { judge: 'haiku' } } as never, async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' })
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    let fetched = 0
    on('http.fetch', () => {
      fetched++
      return { value: { status: 500, ok: false, headers: {}, text: '' } }
    })
    await $.prompt.submit({ text: 'hello there', wait: false, origin: { kind: 'composer' } })
    expect(fetched).toBe(0)
    expect(asked.length).toBe(1)
  })

  test('jev: the key from the settings is used before the environment', { options: { judge: 'jev', typesafeKey: 'from-settings' } } as never, async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'from-env' })
    mock.clock(on)
    const auth: (string | undefined)[] = []
    on('http.fetch', (_$, e) => {
      auth.push((e.init?.headers as Record<string, string> | undefined)?.authorization)
      return { value: { status: 200, ok: true, headers: {}, text: jevReply('high') } }
    })
    await $.prompt.submit({ text: 'hard task here', wait: false, origin: { kind: 'composer' } })
    expect(auth).toEqual(['Bearer from-settings'])
  })
})

describe('context for the judge', () => {
  test("the assistant's last reply goes along, long and from its end, where its question sits", () => {
    const question = 'Which section should I build: A (simple), B (a complicated multi-step layout) or C?'
    const reply = 'x'.repeat(5000) + ' ' + question
    const text = contextFrom([
      { role: 'user', text: 'make me a new section' },
      { role: 'assistant', text: reply },
    ])
    expect(text).toContain(question)
    expect(text).toContain('user: make me a new section')
    expect(text.length).toBeLessThan(2500)
    expect(contextFrom([])).toBe('')
  })

  test("Haiku is handed the assistant's question and told how to judge an answer to it", async ($, on) => {
    mock.store(on)
    mock.env(on, {})
    mock.clock(on)
    on('prompt.submit', (_$, e) => ({ text: e.text }))
    on('ui.status', () => ({ value: undefined }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.messages', () => ({
      value: [
        { role: 'user', text: 'make me a new section' },
        { role: 'assistant', text: 'Which one: A (simple) or B (a complicated multi-step layout)?' },
      ],
    }) as never)
    const seen: { system?: string; prompt: string }[] = []
    on('model.complete', (_$, e) => {
      seen.push({ system: e.system, prompt: e.prompt })
      return { value: { isAnswered: true as const, text: '{"model":"opus","effort":"high","why":"B is big"}', usage: USAGE } }
    })
    await $.prompt.submit({ text: 'B', wait: false, origin: { kind: 'composer' } })
    expect(seen[0].prompt).toContain('B (a complicated multi-step layout)')
    expect(seen[0].system).toContain('judge only the work that answer starts')
    expect(seen[0].system).toContain('should I archive this?')
  })
})

describe('model-aware effort', () => {
  test('the judge is told which model runs and that effort is relative to it', async ($, on) => {
    engine(on, {}, 'claude-sonnet-5-5')
    mock.clock(on)
    const seen: { system?: string; prompt: string }[] = []
    on('model.complete', (_$, e) => {
      seen.push({ system: e.system, prompt: e.prompt })
      return { value: { isAnswered: true as const, text: '{"model":"sonnet","effort":"high","why":"x"}', usage: USAGE } }
    })
    await $.prompt.submit({ text: 'refactor the parser', wait: false, origin: { kind: 'composer' } })
    expect(seen[0].prompt).toContain('Current: sonnet')
    expect(seen[0].system).toContain('Opus at medium does about what Sonnet does at high')
  })

  test('Jev gets the model in use and the same rule', async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' }, 'claude-opus-5-5')
    mock.clock(on)
    const bodies: Record<string, any>[] = []
    on('http.fetch', (_$, e) => {
      bodies.push(JSON.parse(String(e.init?.body)))
      return { value: { status: 200, ok: true, headers: {}, text: jevReply('medium') } }
    })
    await $.prompt.submit({ text: 'refactor the parser', wait: false, origin: { kind: 'composer' } })
    expect(bodies[0].state.current_model).toBe('opus')
    expect(bodies[0].state.task).toContain('Opus at medium does about what')
  })
})

describe('keys', () => {
  test('auto never opens ~/.config/jev/.env: it judges with Haiku', { options: { judge: 'auto' } } as never, async ($, on) => {
    engine(on, { USERPROFILE: 'C:/Users/x' })
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    const read: string[] = []
    on('fs.read', (_$, e) => {
      read.push(e.path)
      return { value: 'TYPESAFE_API_KEY=secret' } as never
    })
    await $.prompt.submit({ text: 'hello there', wait: false, origin: { kind: 'composer' } })
    expect(read.filter(path => path.includes('.env'))).toEqual([])
    expect(asked.length).toBe(1)
  })
})

describe('setup guide', () => {
  const DESK = { plugin: 'pilot', surface: 'desktop', ...BAND } as never
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }
  const settings = (on: On) => {
    const set: { key: string; value: unknown }[] = []
    on('config.set', (_$, e) => {
      set.push({ key: e.key, value: e.value })
      return { value: e.value } as never
    })
    return set
  }
  const toasts = (on: On) => {
    const said: string[] = []
    on('ui.toast', (_$, e) => {
      said.push(String((e as { text?: string }).text ?? e))
      return { value: undefined } as never
    })
    return said
  }

  test('the steps run judge, lean, handoff, done; Back goes one step back', () => {
    expect(setupNext('pick')).toBe('lean')
    expect(setupNext('jev')).toBe('lean')
    expect(setupNext('lean')).toBe('handoff')
    expect(setupNext('handoff')).toBe('look')
    expect(setupNext('look')).toBe('done')
    expect(setupNext('done')).toBeNull()
    expect(setupBack('pick')).toBeNull()
    expect(setupBack('jev')).toBe('pick')
    expect(setupBack('lean')).toBe('pick')
    expect(setupBack('look')).toBe('handoff')
    expect(setupBack('done')).toBe('look')
    expect(setupCounter('jev')).toBe('1/4')
    expect(setupCounter('handoff')).toBe('3/4')
    expect(setupCounter('look')).toBe('4/4')
    expect(setupCounter('done')).toBe('')
  })

})

describe('judge failures are said', () => {
  test('judgeFailure names the cause', () => {
    expect(judgeFailure('Jev', 402)).toContain('out of credits')
    expect(judgeFailure('Jev', 429)).toContain('rate limited')
    expect(judgeFailure('Jev', 401)).toContain('rejected the key')
    expect(judgeFailure('Jev', 'timeout')).toContain('did not answer')
  })

  test('Jev out of credits: the person is told once, and Haiku judges', async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' })
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    on('http.fetch', () => ({ value: { status: 402, ok: false, headers: {}, text: 'payment required' } }))
    const said: string[] = []
    on('ui.toast', (_$, e) => {
      said.push(String((e as { text?: string }).text ?? e))
      return { value: undefined } as never
    })
    await $.prompt.submit({ text: 'first question here', wait: false, origin: { kind: 'composer' } })
    await $.prompt.submit({ text: 'second question here', wait: false, origin: { kind: 'composer' } })
    expect(asked.length).toBe(2)
    expect(said.filter(t => t.includes('out of credits')).length).toBe(1)
    expect(said[0]).toContain('Haiku judges for now')
  })
})

describe('judge benchmark', () => {
  const c = (id: string, ok: ('low' | 'medium' | 'high')[], message = 'do a thing please') =>
    ({ id, kind: 'k', current: { model: 'sonnet', effort: 'medium' }, message, ok }) as never

  test('grades an answer as right, too low, too high or missing', () => {
    expect(benchGrade(c('a', ['medium', 'high']), 'high')).toBe('hit')
    expect(benchGrade(c('a', ['medium', 'high']), 'low')).toBe('under')
    expect(benchGrade(c('a', ['low']), 'xhigh')).toBe('over')
    expect(benchGrade(c('a', ['low']), undefined)).toBe('none')
  })

  test('the report counts per judge and lists the misses', () => {
    const cases = [c('a', ['low']), c('b', ['high'])]
    const report = benchReport(cases, [
      { id: 'a', judge: 'haiku', effort: 'low', ms: 300, tokens: 10 },
      { id: 'b', judge: 'haiku', effort: 'medium', ms: 500, tokens: 10 },
    ])
    expect(report).toContain('| haiku | 50% | 1 | 0 | 0 | 500 |')
    expect(report).toContain('haiku b: said medium, wanted high')
  })

  test('/pilot bench runs every case through Haiku, keeps follow-ups, and writes the report', async ($, on) => {
    engine(on)
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    const cases = { cases: [c('a', ['low'], 'rename foo to bar in utils.ts'), c('f', ['medium'], 'go')] }
    on('fs.read', (_$, e) => ({ value: String(e.path).endsWith('judge-cases.json') ? JSON.stringify(cases) : '' }) as never)
    const written: Record<string, string> = {}
    on('fs.write', (_$, e) => {
      written[String(e.path)] = String(e.text)
      return { value: undefined } as never
    })
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
    const res = await $.command.run({ command: 'pilot', args: 'bench' })
    expect(asked.length).toBe(1)
    expect(res.text).toContain('| haiku | 100% |')
    expect(res.text).toContain('| always medium |')
    expect(Object.keys(written).some(p => p.endsWith('.md'))).toBe(true)
  })
})

describe('short answers to a question', () => {
  test('a short reply after a question goes to the judge; between two steps it keeps the effort', () => {
    const asked = 'user: tidy up\nassistant: Done. Should I archive it?'
    const told = 'user: add export\nassistant: Added the button. Next I wire it up.'
    expect(endsOnQuestion(asked)).toBe(true)
    expect(endsOnQuestion(told)).toBe(false)
    expect(endsOnQuestion('')).toBe(false)
    expect(keepsEffort('yes', asked)).toBe(false)
    expect(keepsEffort('go', told)).toBe(true)
    expect(keepsEffort('build the whole thing', told)).toBe(false)
  })

  test('"yes" to "should I archive it?" is judged, not kept', async ($, on) => {
    const said: { role: string; text: string }[] = []
    engine(on, {}, 'claude-sonnet-5-5', said)
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"high","why":"x"}')
    await $.prompt.submit({ text: 'refactor the sync engine end to end', wait: false, origin: { kind: 'composer' } })
    said.push({ role: 'assistant', text: 'Done. Should I archive the old branch?' })
    await $.prompt.submit({ text: 'yes', wait: false, origin: { kind: 'composer' } })
    expect(asked.length).toBe(2)
  })

  test('Jev unsure: Haiku makes the call', async ($, on) => {
    engine(on, { TYPESAFE_API_KEY: 'k' }, 'claude-sonnet-5-5')
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"low","why":"x"}')
    on('http.fetch', () => ({ value: { status: 200, ok: true, headers: {}, text: jevReply('high', 0.3, 'sonnet') } }))
    await $.prompt.submit({ text: 'show me the last five commits please', wait: false, origin: { kind: 'composer' } })
    expect(asked.length).toBe(1)
  })
})

describe('images', () => {
  test('the judge is told what the message carries', () => {
    expect(withAttachments('fix this', [{ type: 'image' }, { type: 'image' }])).toContain('[The message comes with 2 images to look at.]')
    expect(withAttachments('fix this')).toBe('fix this')
  })

  test('"fix this" with a screenshot is judged, not kept as a follow-up', async ($, on) => {
    engine(on, {}, 'claude-sonnet-5-5')
    mock.clock(on)
    const asked = judgeSays(on, '{"model":"sonnet","effort":"medium","why":"x"}')
    await $.prompt.submit({ text: 'refactor the sync engine end to end', wait: false, origin: { kind: 'composer' } })
    await $.prompt.submit({ text: 'fix this', wait: false, origin: { kind: 'composer' }, attachments: [{ type: 'image', mediaType: 'image/png' }] } as never)
    expect(asked.length).toBe(2)
    expect(asked[1]).toContain('1 image')
  })
})

describe('compaction by Haiku', () => {
  const SUMMARY = '1. Primary request: rename userId across the app. ' + 'Details. '.repeat(40)
  const said = [
    { role: 'user', text: 'rename this variable to userId', toolUses: [] },
    { role: 'assistant', text: 'Renamed in 4 files.', toolUses: [{ tool_use_id: 't1', tool: 'Edit', input: { file_path: 'a.ts' }, text: 'x'.repeat(5000) }] },
  ]
  /** Claude Code's own compaction beneath the mod, and whether it ran. */
  const core = (on: On) => {
    const ran = { core: 0 }
    on('session.compact', (_$, e) => {
      ran.core++
      return { messages: [{ role: 'user', text: 'core summary', toolUses: [] }] } as never
    })
    return ran
  }

  test('the last messages reach Haiku nearly whole: the code just written is not cut to 400 characters', () => {
    const code = 'x'.repeat(5000)
    const old = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `turn ${i}`, toolUses: [{ tool: 'Edit', input: { new_string: code }, text: code }] }))
    const text = compactTranscript(old as never)
    // The first message is cut, the last one is whole.
    expect(text.split('turn 0')[1].split('turn 1')[0]).toContain('more characters')
    expect(text.split('turn 9')[1]).not.toContain('more characters')
  })

  test('the transcript names each tool call and cuts long results', () => {
    // Two messages are all tail; with the tail held to the same 2000 the cut shows.
    const text = compactTranscript(said as never, 2000, 2000)
    expect(text).toContain('USER: rename this variable to userId')
    expect(text).toContain('[Edit {"file_path":"a.ts"}]')
    expect(text).toContain('[3000 more characters]')
  })

  test('Haiku 5.5 writes the summary, with the note typed after /compact; Claude Code does not compact', async ($, on) => {
    engine(on, {}, 'claude-opus-5-5', said as never)
    const ran = core(on)
    const asked: { model: string; prompt: string }[] = []
    on('model.complete', (_$, e) => {
      asked.push({ model: e.model, prompt: e.prompt })
      return { value: { isAnswered: true as const, text: SUMMARY, usage: USAGE } }
    })
    const out = (await $.session.compact({ instructions: 'keep the API decisions' })) as { messages?: { text: string }[] }
    expect(ran.core).toBe(0)
    expect(asked[0].model).toBe('claude-haiku-5-5')
    expect(asked[0].prompt).toContain('keep the API decisions')
    expect(out.messages?.[0].text).toContain('rename userId across the app')
  })

  test('when Haiku fails, Claude Code compacts as usual and a toast says why', async ($, on) => {
    engine(on)
    const ran = core(on)
    const toasts: string[] = []
    on('ui.toast', (_$, e) => {
      toasts.push(String((e as { text?: string }).text ?? JSON.stringify(e)))
      return { value: undefined } as never
    })
    on('model.complete', () => ({ value: { isAnswered: false as const, reason: 'api-error', status: 500 } }) as never)
    await $.session.compact({})
    expect(ran.core).toBe(1)
    expect(toasts.join(' ')).toContain('Haiku could not compact')
  })

  test("set to the chat's model, Claude Code compacts and Haiku is never asked", { options: { compactWith: 'session' } } as never, async ($, on) => {
    engine(on)
    const ran = core(on)
    let asked = 0
    on('model.complete', () => {
      asked++
      return { value: { isAnswered: true as const, text: SUMMARY, usage: USAGE } }
    })
    await $.session.compact({})
    expect(ran.core).toBe(1)
    expect(asked).toBe(0)
  })
})

describe('deciding glow', () => {
  const op = (svg: string | null) => Number(/\.r\{opacity:([\d.]+)/.exec(svg ?? '')?.[1] ?? NaN)
  test('rises, holds at full while deciding as a still image, then fades from full in short pieces', () => {
    const at = (end: number | null, now: number) => judgeGlowAt(1000, end, now)
    expect(at(null, 999)).toBeNull()
    expect(op(at(null, 1000))).toBe(0)
    expect(op(at(null, 1000 + JUDGE_RISE_MS / 2))).toBeGreaterThan(0.3)
    // Held: no animation at all, so an old copy drawn again cannot restart anything.
    for (const now of [1000 + JUDGE_RISE_MS, 1900, 9000]) {
      expect(at(null, now)).not.toContain('animation')
      expect(op(at(null, now))).toBe(0.85)
    }
    // A verdict after the rise: the fade starts at once, from full, in pieces of JUDGE_STEP_MS.
    expect(op(at(3000, 3000))).toBe(0.85)
    expect(at(3000, 3000)).toContain('animation:r ' + (JUDGE_PIECE_MS / 1000).toFixed(3) + 's linear forwards')
    expect(at(3000, 3000 + JUDGE_FADE_MS)).toBeNull()
    // A verdict inside the rise: the rise finishes first, so the fade never starts from half-way.
    expect(op(at(1100, 1300))).toBeLessThan(0.85)
    expect(op(at(1100, 1000 + JUDGE_RISE_MS))).toBe(0.85)
    expect(at(1100, 1000 + JUDGE_RISE_MS + JUDGE_FADE_MS)).toBeNull()
  })
  test('each piece runs along the true curve for longer than the app takes to redraw, so the fade never stands still or goes up', () => {
    const pts = (svg: string) => [...svg.matchAll(/(\d+)%\{opacity:([\d.]+)\}/g)].map(m => Number(m[2]))
    for (let t = 0; t < JUDGE_FADE_MS; t += 37) {
      const p = pts(judgeGlowSvg('fade', t))
      expect(p.length).toBe(5)
      // Starts on the curve, only goes down, and ends where the curve is at the end of the piece.
      expect(Math.abs(p[0] - judgeBrightnessAt('fade', t))).toBeLessThan(0.001)
      for (let k = 1; k < 5; k++) expect(p[k]).toBeLessThanOrEqual(p[k - 1])
      expect(Math.abs(p[4] - judgeBrightnessAt('fade', Math.min(JUDGE_FADE_MS, t + JUDGE_PIECE_MS)))).toBeLessThan(0.001)
    }
    expect(JUDGE_PIECE_MS).toBeGreaterThan(120)
    expect(pts(judgeGlowSvg('fade', JUDGE_FADE_MS - 10))[4]).toBe(0)
    expect(Math.abs(judgeBrightnessAt('fade', JUDGE_FADE_MS / 2) - 0.425)).toBeLessThan(0.001)
  })
})

describe('cold band', () => {
})

describe('handoff', () => {
  test('the first message carries the handoff and what to do next', () => {
    expect(handoffMessage(' the plan ', 'continue')).toBe(
      'Handoff from the previous chat:\n\nthe plan\n\nContinue with the next step. If it is marked "needs user", say what you need and wait.',
    )
    expect(handoffMessage('x', 'confirm')).toContain('then wait for me')
    // Full: the skill saved the handoff; its last words may only say so. The new chat reads what it saved first.
    const full = handoffMessage("I've saved the handoff.", 'continue', 'session-handoff')
    expect(full).toContain('it ran /session-handoff')
    expect(full).toContain('First read the handoff /session-handoff saved')
    expect(full).toContain('HANDOFF.md')
    expect(full).toContain('Continue with the next step')
  })

  test('the prompt asks for checked work, marked user steps and git as of last check', () => {
    expect(HANDOFF_PROMPT).toContain('needs user')
    expect(HANDOFF_PROMPT).toContain('as of last check')
    expect(HANDOFF_PROMPT).toContain('Never present something planned, skipped or untested as done')
    expect(HANDOFF_PROMPT).toContain('Do not use tools')
  })

  /** Presses ⇥ in the footer, makes the choices in the handoff bar, and presses Go. */
  async function handOff($: Engine, footer: { press: (at: { key: string }) => Promise<unknown> }, keys: string[] = [], after?: string) {
    await footer.press({ key: 'handoff' })
    const bar = await $.ui.mount(DESK_BAND)
    for (const key of keys) await bar.press({ key })
    if (after) await bar.select({ key: 'handoff-after', value: after })
    await bar.press({ key: 'handoff-go' })
    await bar.unmount()
  }

  function handoffEngine(on: On, said: { role: string; text: string }[] = []) {
    mock.store(on)
    mock.env(on, { EFFORTLESS_MODEL_UI: '1' })
    on('ui.status', () => ({ value: undefined }))
    on('session.messages', () => ({ value: said }) as never)
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('command.list', () => ({ value: [{ name: 'model' }, { name: 'effort' }] as never }))
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    const forked: string[] = []
    on('model.fork', (_$, e) => {
      forked.push(e.prompt)
      return { value: { isAnswered: true, text: 'Goal: quick.', usage: USAGE } } as never
    })
    const ran: string[] = []
    on('command.run', (_$, e) => {
      ran.push(e.command)
      return { text: 'ok' }
    })
    const submitted: string[] = []
    on('prompt.submit', (_$, e) => {
      submitted.push(e.text)
      return { text: e.text }
    })
    on('turn.complete', (_$, e) => ({ text: e.answer }))
    return { forked, ran, submitted }
  }

  test('hotVisible: closed, the band stays away for its window and comes back once at 95%', () => {
    const heat = { kind: 'five_hour', percent: 82, resetsAt: '2026-10-10T20:00:00Z' }
    expect(hotVisible(heat, null)).toBe(true)
    const closed = { window: 'five_hour ' + Math.round(new Date(heat.resetsAt).getTime() / 900_000), percent: 82 }
    expect(hotVisible({ ...heat, percent: 91 }, closed)).toBe(false)
    expect(hotVisible({ ...heat, percent: 96 }, closed)).toBe(true)
    expect(hotVisible({ ...heat, percent: 96 }, { ...closed, percent: 96 })).toBe(false)
    expect(hotVisible({ ...heat, resetsAt: '2026-10-11T01:00:00Z' }, closed)).toBe(true)
  })

  test('the fork outcome names the reason, or what an answer cost', () => {
    expect(forkOutcome({ isAnswered: false, reason: 'nothing-to-fork' }, 0)).toBe('nothing-to-fork (0.0s)')
    expect(forkOutcome({ isAnswered: false, reason: 'aborted', usage: USAGE }, 2500)).toBe('aborted (2.5s)')
    expect(forkOutcome({ isAnswered: false, reason: 'api-error', status: null, error: 'unknown', usage: USAGE }, 0)).toBe('api-error no response unknown (0.0s)')
    expect(forkOutcome(new Error('refused from a timer'), 100)).toBe('threw: refused from a timer (0.1s)')
    const usage = { input_tokens: 10, output_tokens: 700, cache_read_input_tokens: 90, cache_creation_input_tokens: 0 }
    expect(forkOutcome({ isAnswered: true, text: 'Goal', usage }, 4000)).toBe('answered, 700 out, 90% cached (4.0s)')
    expect(forkOutcome({ isAnswered: true, text: '  ', usage }, 0)).toBe('answered with blank text (0.0s)')
  })
})

describe('swamp band and setup entry', () => {
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }

  test('/pilot save switches save mode on and off', async ($, on) => {
    engine(on)
    mock.clock(on)
    await start($, on)
    expect(String((await $.command.run({ command: 'pilot', args: 'save' })).text)).toContain('save mode on')
    expect(String((await $.command.run({ command: 'pilot', args: 'save' })).text)).toContain('save mode off')
  })

  test('save mode paints the footer level ember; off again, it is purple', async ($, on) => {
    engine(on)
    mock.clock(on)
    await start($, on)
    await $.command.run({ command: 'pilot', args: 'save' })
    const footer = await $.ui.mount(FOOTER)
    expect(await drawn(footer)).toContain('"color":"#f08a3c"')
    await $.command.run({ command: 'pilot', args: 'save' })
    await footer.unmount()
    const again = await $.ui.mount(FOOTER)
    const text = await drawn(again)
    expect(text).not.toContain('"color":"#f08a3c"')
    expect(text).toContain('"color":"#a79cf7"')
    await again.unmount()
  })

})

describe('running hot and judge down', () => {
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }

  test('save mode caps at medium, and reset times read short', () => {
    expect(capped('xhigh', true)).toBe('medium')
    expect(capped('low', true)).toBe('low')
    expect(capped('xhigh', false)).toBe('xhigh')
    const now = new Date('2026-10-06T10:00:00').getTime()
    expect(resetLabel('2026-10-06T14:20:00', now)).toBe('14:20')
    expect(resetLabel(null, now)).toBe('')
  })

  test('usage row: share left per window, its reset, then the chat\'s tokens', () => {
    const now = new Date('2026-10-06T10:00:00').getTime()
    const parts = usageParts([
      { kind: 'seven_day', percent: 85, resetsAt: '2026-10-09T09:00:00' },
      { kind: 'five_hour', percent: 42.4, resetsAt: '2026-10-06T14:30:00' },
    ], 2_100_000, now)
    expect(parts.map(p => p.text)).toEqual(['5h 58% left · 14:30', 'Week 15% left · Fri 09:00', '2.1M tokens'])
    expect(parts.map(p => p.low)).toEqual([false, true, false])
    expect(usageParts([], 0, now)).toEqual([])
  })

})

describe('settings panel', () => {
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }

  test('the slider tips only close calls; floor and ceiling clamp; the key line is set in place', () => {
    expect(tipped('medium', 0.6, 1)).toBe('high')
    expect(tipped('medium', 0.9, 1)).toBe('medium')
    expect(tipped('medium', 0.8, 1)).toBe('medium')
    expect(tipped('medium', 0.8, 2)).toBe('high')
    expect(tipped('medium', 0.6, -1)).toBe('low')
    expect(tipped('low', 0.3, -2)).toBe('low')
    expect(tipped('medium', undefined, 2)).toBe('medium')
    expect(bounded('low', 'medium', 'max')).toBe('medium')
    expect(bounded('max', 'low', 'high')).toBe('high')
    expect(withJevKey('A=1\nTYPESAFE_API_KEY=old\n', 'new')).toBe('A=1\nTYPESAFE_API_KEY=new\n')
    expect(withJevKey('A=1', 'new')).toBe('A=1\nTYPESAFE_API_KEY=new\n')
    expect(parseVerdict('{"model":"opus","effort":"high","sure":0.7,"why":"x"}')?.sure).toBe(0.7)
  })

})

describe('switching parts off', () => {
  test('readConfig keeps only parts that can be switched off; the judge-down alert is not among them', () => {
    expect(readConfig({ hide: 'swamp, handoff,bogus,down,progress' }).hide).toEqual(['swamp', 'handoff', 'progress'])
  })

})

describe('the command file', () => {
})


// The progress bar is switched off for now (hooks/progress.tsx stays for later): its rules only.
describe('progress bar rules', () => {
  const todos = (statuses: ('pending' | 'in_progress' | 'completed')[]) =>
    statuses.map((status, i) => ({ content: `Step ${i + 1}`, activeForm: `Doing step ${i + 1}`, status }))
  test('the steps: share, number and the one named', () => {
    const steps = stepsFromTodos(todos(['completed', 'in_progress', 'pending', 'pending']))
    expect(progressShare(steps)).toBe(1.5 / 4)
    expect(stepNumber(steps)).toBe(2)
    expect(currentStep(steps)?.doing).toBe('Doing step 2')
    expect(stepNumber(stepsFromTodos(todos(['completed', 'completed', 'completed'])))).toBe(3)
    expect(progressShare([])).toBe(0)
  })

  test('tasks are added, updated and deleted by id', () => {
    let steps = withTaskCreated([], '1', { subject: 'Read', activeForm: 'Reading' })
    steps = withTaskCreated(steps, '2', { subject: 'Write' })
    steps = withTaskUpdated(steps, { taskId: '1', status: 'in_progress' })
    expect(steps.map(s => [s.id, s.status, s.doing])).toEqual([['1', 'in_progress', 'Reading'], ['2', 'pending', 'Write']])
    expect(withTaskUpdated(steps, { taskId: '2', status: 'deleted' }).map(s => s.id)).toEqual(['1'])
  })

  test('a turn ends done, asking or paused; too short a list ends the bar', () => {
    const q = endsOnQuestion
    const p = (s: ('pending' | 'in_progress' | 'completed')[]) => ({ phase: 'working' as const, steps: stepsFromTodos(todos(s)) })
    expect(phaseAtTurnEnd(p(['completed', 'completed', 'completed']), { reason: 'answer', answer: 'All done.' }, q)).toBe('done')
    expect(phaseAtTurnEnd(p(['completed', 'pending', 'pending']), { reason: 'answer', answer: 'Should I go on?' }, q)).toBe('asking')
    expect(phaseAtTurnEnd(p(['completed', 'pending', 'pending']), { reason: 'aborted', answer: '' }, q)).toBe('paused')
    expect(phaseAtTurnEnd(p(['completed', 'pending']), { reason: 'answer', answer: '' }, q)).toBeNull()
  })

  test('a prompt carries an asking or paused task on and ends a finished one; slash commands change nothing', () => {
    const steps = stepsFromTodos(todos(['completed', 'pending', 'pending']))
    const said = { text: 'yes', origin: { kind: 'composer' } }
    expect(afterPrompt({ phase: 'asking', steps }, said)?.phase).toBe('working')
    expect(afterPrompt({ phase: 'paused', steps }, said)?.phase).toBe('working')
    expect(afterPrompt({ phase: 'done', steps }, said)).toBeNull()
    expect(afterPrompt({ phase: 'done', steps }, { text: '/pilot debug', origin: { kind: 'composer' } })?.phase).toBe('done')
  })

  test('where it shows, what it says, and when the judge calls a turn big', () => {
    const steps = stepsFromTodos(todos(['completed', 'in_progress', 'pending']))
    expect(progressShows({ phase: 'working', steps }, null, 'active')).toBe(true)
    expect(progressShows({ phase: 'working', steps }, null, 'resting')).toBe(false)
    expect(progressShows({ phase: 'done', steps }, null, 'active')).toBe(true)
    expect(progressShows({ phase: 'paused', steps }, null, 'resting')).toBe(true)
    expect(progressShows({ phase: 'working', steps }, 'Step 1\nStep 2\nStep 3', 'active')).toBe(false)
    expect(progressShows({ phase: 'working', steps: steps.slice(0, 2) }, null, 'active')).toBe(false)
    expect(progressTitle({ phase: 'asking', steps })).toBe('Waiting for your answer · step 2 of 3')
    expect(progressTitle({ phase: 'done', steps })).toBe('Done · all 3 steps')
  })

  test('Windows plays the chime with PowerShell; elsewhere the app plays it', () => {
    const argv = soundArgv('C:\\Users\\x\\plugins\\effortless', 'sounds/done.wav')
    expect(argv?.[0]).toBe('powershell.exe')
    expect(argv?.join(' ')).toContain("SoundPlayer 'C:\\Users\\x\\plugins\\effortless\\sounds\\done.wav'")
    expect(soundArgv('/Users/x/.claude/plugins/effortless', 'sounds/done.wav')).toBeNull()
  })

})

describe('terminal art', () => {
  test('a frame is 16 by 2 cells of ▀, faded in from the left', () => {
    // 32 cells of three 4-byte words: 384 bytes, 512 base64 characters.
    expect(artFrame('swamp', 0)).toHaveLength(512)
    for (const kind of ['cold', 'swamp', 'hot', 'down', 'brand', 'calm', 'compacting', 'done'] as const) {
      expect(artPixel(kind, 3, 0, 1)).toBe(artPixel(kind, 9, 0, 1))
    }
  })

  test('moving kinds change over time; still ones do not', () => {
    const frames = (kind: Parameters<typeof artFrame>[0]) => new Set(Array.from({ length: 30 }, (_, t) => artFrame(kind, t))).size
    for (const kind of MOVING) expect(frames(kind)).toBeGreaterThan(1)
    expect(frames('brand')).toBe(1)
    expect(frames('calm')).toBe(1)
    expect(frames('done')).toBe(1)
  })
})

describe('terminal bands', () => {
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true } as never)
  }
  const at = (columns: number) =>
    ({ plugin: 'pilot', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: columns, maxRows: 14 } }) as never

  for (const kind of ['swamp', 'cold', 'hot', 'down'] as const) {
    test(`${kind}: art on the right when wide, none at 80 columns; the effort row stays under it`, async ($, on) => {
      engine(on)
      mock.clock(on)
      await start($, on)
      const guide = await $.ui.mount(at(120))
      await guide.press({ key: 'settings-close' })
      await guide.unmount()
      await $.command.run({ command: 'pilot', args: kind } as never)
      const wide = await $.ui.mount(at(120))
      const text = await drawn(wide)
      expect(text).toContain('"type":"Raster"')
      expect(text).toContain('"children":["Effort"]')
      await wide.unmount()
      const narrow = await $.ui.mount(at(80))
      const small = await drawn(narrow)
      expect(small).not.toContain('"type":"Raster"')
      expect(small).toContain('"children":["Effort"]')
      await narrow.unmount()
    })
  }

})

describe('dashboard', () => {
  const DASH = { options: { layout: 'default' } } as never
  const start = async ($: Engine, on: On, surface: 'desktop' | 'terminal' = 'desktop') => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    await $.session.start({ cwd: '.', surface, isInteractive: true } as never)
  }
  const closeSetup = async ($: Engine, band: unknown) => {
    const guide = await $.ui.mount(band as never)
    // pilot opens its own setup (the slim settings) on desktop; the terminal keeps the old guide.
    await guide.press({ key: (band as { surface?: string }).surface === 'terminal' ? 'settings-close' : 'ps-done' })
    await guide.unmount()
  }

  test('cache-aware routing, live through the hooks: a cold Sonnet is skipped on a big warm Opus chat, Haiku moves, a cold chat moves, and a routed reply leaves the countdown alone', { options: { modelAuto: 'on' } } as never, async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    on('session.usage', () => ({ value: { context: { tokens: 100_000, window: 1_000_000, percent: 10 } } }) as never)
    let verdict = '{"model":"opus","effort":"high","why":"big refactor"}'
    on('model.complete', () => ({ value: { isAnswered: true as const, text: verdict, usage: USAGE } }))
    const sent: string[] = []
    const used = { input_tokens: 5, output_tokens: 40, cache_read_input_tokens: 90_000, cache_creation_input_tokens: 10_000, cache_creation: { ephemeral_1h_input_tokens: 10_000 } }
    on('turn.step', async function* (_$, e) {
      sent.push(e.model)
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: used } as never
    })
    await start($, on)
    await closeSetup($, DESK_BAND)
    await mocked.advance(16_000)
    const ask = async (v: string, text: string) => {
      verdict = v
      await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
      await step($)
    }
    const cacheLine = async () => String((await $.command.run({ command: 'pilot', args: 'debug' })).text).split(' | ').find(l => l.startsWith('cache:')) ?? ''
    // A hard prompt on the chat's own model warms the Opus cache.
    await ask('{"model":"opus","effort":"high","why":"big refactor"}', 'refactor the whole auth layer')
    expect(sent.at(-1)).toBe('claude-opus-5-5')
    // Sonnet has never answered: its cache is cold, and writing 100k tokens there costs more than reading them on Opus.
    await ask('{"model":"sonnet","effort":"low","why":"small fix"}', 'rename this variable to userId')
    expect(sent.at(-1)).toBe('claude-opus-5-5')
    // A cold Haiku loses to a warm Opus read as well, whatever the size of the chat.
    await mocked.advance(30 * 60_000)
    await ask('{"model":"haiku","effort":"low","why":"lookup"}', 'what is the folder called')
    expect(sent.at(-1)).toBe('claude-opus-5-5')
    // An hour and more on, the Opus cache is cold too: staying would write it all again, so Sonnet is worth it now.
    await mocked.advance(61 * 60_000)
    await ask('{"model":"sonnet","effort":"low","why":"small fix"}', 'add a log line here')
    expect(sent.at(-1)).toBe('claude-sonnet-5-5')
    // Opus warm again, Sonnet warm from the last reply: the switch reads a warm cache and goes ahead.
    await ask('{"model":"opus","effort":"high","why":"hard"}', 'debug the race in the queue')
    expect(sent.at(-1)).toBe('claude-opus-5-5')
    await ask('{"model":"sonnet","effort":"low","why":"small fix"}', 'fix the typo in the log line')
    expect(sent.at(-1)).toBe('claude-sonnet-5-5')
    // Twenty minutes on, a routed reply from the warm Sonnet must not restart the chat's countdown: Opus is still 40 min out.
    await mocked.advance(20 * 60_000)
    await ask('{"model":"sonnet","effort":"low","why":"small fix"}', 'fix another typo in the log line')
    expect(sent.at(-1)).toBe('claude-sonnet-5-5')
    expect(await cacheLine()).toContain('40 min left')
  })

  test('looksLikeRedo: a correction after a cheaper answer, not a thank-you or a new task', () => {
    for (const yes of ["no, that's wrong", 'Nope. still fails on line 3', 'wrong, it is the other file', "that doesn't work", 'still broken', 'try again please', 'funkar inte', 'fel, det ska vara src', 'inte rätt', "it still doesn't compile"])
      expect(looksLikeRedo(yes)).toBe(true)
    for (const no of ['no problem, thanks', 'nothing else to fix', 'now add a test for it', 'looks right, ship it', 'what does this function do', 'normal', 'felsök det här', 'ok'])
      expect(looksLikeRedo(no)).toBe(false)
  })

  test('a redone cheaper answer: the retry and the next prompts stay on the chat model, and stats count it', { options: { modelAuto: 'on' } } as never, async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    on('session.usage', () => ({ value: { context: { tokens: 100_000, window: 1_000_000, percent: 10 } } }) as never)
    let verdict = '{"model":"opus","effort":"high","why":"big refactor"}'
    on('model.complete', () => ({ value: { isAnswered: true as const, text: verdict, usage: USAGE } }))
    const sent: string[] = []
    const used = { input_tokens: 5, output_tokens: 40, cache_read_input_tokens: 90_000, cache_creation_input_tokens: 10_000, cache_creation: { ephemeral_1h_input_tokens: 10_000 } }
    on('turn.step', async function* (_$, e) {
      sent.push(e.model)
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: used } as never
    })
    await start($, on)
    await closeSetup($, DESK_BAND)
    await mocked.advance(16_000)
    const HAIKU = '{"model":"haiku","effort":"low","why":"lookup"}'
    const ask = async (v: string, text: string) => {
      verdict = v
      await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
      await step($)
    }
    await ask('{"model":"opus","effort":"high","why":"big refactor"}', 'refactor the whole auth layer')
    // Once the Opus cache has gone cold, a Haiku move is cheaper than writing it all again.
    await mocked.advance(61 * 60_000)
    await ask(HAIKU, 'what is the folder called')
    expect(sent.at(-1)).toBe('claude-haiku-5-5')
    // The person says it was wrong: the retry runs on Opus, and so do the next ones, though the judge still says Haiku.
    await ask(HAIKU, "no that's wrong, it is the src folder")
    expect(sent.at(-1)).toBe('claude-opus-5-5')
    for (let i = 1; i < REDO_STAY_PROMPTS; i++) {
      await ask(HAIKU, `which file holds the config number ${i}`)
      expect(sent.at(-1)).toBe('claude-opus-5-5')
    }
    await ask(HAIKU, 'what is the folder for the tests')
    expect(sent.at(-1)).toBe('claude-haiku-5-5')
    const stats = String((await $.command.run({ command: 'pilot', args: 'stats' })).text)
    expect(stats).toContain('Cheaper model: 2 prompts moved down, 1 redone (50 %)')
  })

  test('light appearance: surfaces come out pale, text reads on them, alpha and hue are kept', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1, 7), 16)
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
      return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
    }
    const contrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
    // Edges stay a visible step darker than the panels they frame.
    for (const edge of ['#2a2a2f', '#4a3f80']) expect(lum(lightHex(edge, 'surface'))).toBeGreaterThan(0.45)
    for (const dark of ['#141416', '#15121f', '#0e1820', '#111710', '#1a110c', '#0f1c15']) {
      const pale = lightHex(dark, 'surface')
      expect(lum(pale)).toBeGreaterThan(0.6)
    }
    const surfaces = ['#141416', '#15121f', '#0e1820', '#111710', '#1a110c', '#0f1c15', '#12141b'].map(h => lightHex(h, 'surface'))
    for (const text of ['#d4d4d8', '#8b8b93', '#a79cf7', '#7c6cf0', '#7cc4ff', '#a7c98f', '#f08a3c', '#7fe0a4', '#ffffff', '#6b6b73', '#e0a33a', '#e5534b'])
      for (const bg of surfaces) expect(contrast(lightHex(text, 'text'), bg)).toBeGreaterThanOrEqual(4.5)
    // Main text stays darker than dim text, and a colour stays its hue.
    expect(lum(lightHex('#d4d4d8', 'text'))).toBeLessThan(lum(lightHex('#8b8b93', 'text')))
    expect(lightHex('#7fe0a4', 'text')).toMatch(/^#[0-9a-f]{2}[0-9a-f]{2}[0-9a-f]{2}$/)
    const green = parseInt(lightHex('#7fe0a4', 'text').slice(3, 5), 16)
    const red = parseInt(lightHex('#7fe0a4', 'text').slice(1, 3), 16)
    expect(green).toBeGreaterThan(red)
    expect(lightHex('#14141680', 'surface').endsWith('80')).toBe(true)
  })

  test('light appearance: Box, Text and Button props are turned, hover too; dark leaves the apps own parts alone', () => {
    const Box = (p: Record<string, unknown>) => p
    const Text = (p: Record<string, unknown>) => p
    const Button = (p: Record<string, unknown>) => p
    const els = { Box, Text, Button, Svg: (p: Record<string, unknown>) => p }
    expect(themedEls(els).Box).toBe(Box)
    try {
      setLight(true)
      const lit = themedEls(els) as typeof els
      expect(lit.Box).not.toBe(Box)
      const box = lit.Box({ backgroundColor: '#141416', borderColor: '#2a2a2f', hover: { backgroundColor: '#1c1c20' }, flexDirection: 'row' })
      expect(box.backgroundColor).toBe(lightHex('#141416', 'surface'))
      expect(box.borderColor).toBe(lightHex('#2a2a2f', 'surface'))
      expect((box.hover as { backgroundColor: string }).backgroundColor).toBe(lightHex('#1c1c20', 'surface'))
      expect(box.flexDirection).toBe('row')
      expect(lit.Text({ color: '#d4d4d8', bold: true }).color).toBe(lightHex('#d4d4d8', 'text'))
      expect(lit.Text({ color: 'red' }).color).toBe('red')
      expect(lit.Button({ hover: { backgroundColor: '#00000000' } }).hover).toEqual({ backgroundColor: lightHex('#00000000', 'surface') })
      expect(lightProps({ color: '#fff' }).color).toBe('#fff')
    } finally {
      setLight(false)
    }
    expect(isLight()).toBe(false)
  })

  test('light appearance: drawn art turns pale, with the sparkles still petals in rose', () => {
    const art = '<svg><style>.sp{fill:#fff}</style><rect fill="#15121f" width="9" height="9"/><rect fill="#7c6cf0" width="9" height="9"/><path class="sp" style="transform-origin:168px 8px;animation-duration:4.2s;animation-delay:0.3s" d="M168 6.4 L168.34 7.66 Z"/></svg>'
    try {
      setLight(true)
      const violet = tint(art)
      expect(violet).not.toContain('#15121f')
      expect(violet).toContain(lightHex('#15121f'))
      expect(violet).toContain('class="sp"')
      setTheme('rose')
      const rose = tint(art)
      expect(rose).toContain('class="pt"')
      expect(rose).not.toContain('#ffb3cf')
    } finally {
      setTheme('violet')
      setLight(false)
    }
  })

  test('a new chat: Low picked by hand in another chat does not beat the effort the app is on when the first prompt goes', async ($, on) => {
    engine(on)
    mock.clock(on)
    on('prompt.read', () => ({ value: { text: '', cursor: 0 } }) as never)
    on('prompt.fill', () => ({ isFilled: true }) as never)
    const sent = recordSteps(on)
    await start($, on)
    await closeSetup($, DESK_BAND)
    // The other chat: Low picked by hand in effortless, so Auto went off and the pick is kept for the next chat.
    const rows = await $.ui.mount({ plugin: 'pilot', surface: 'terminal', ...BAND } as never)
    await rows.press({ key: 'e-low' })
    await rows.unmount()
    // A new chat starts from that; the person sets the app to Extra before the first prompt goes.
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
    await $.prompt.submit({ text: 'plan the architecture of the trainer', wait: false, origin: { kind: 'composer' } })
    await step($, 'xhigh')
    expect(sent.at(-1)!.effort).toBe('xhigh')
  })

  test('picking an effort in the app turns Auto off and says so', async ($, on) => {
    engine(on)
    const said: string[] = []
    on('ui.toast', (_$, e) => {
      said.push(String((e as { text?: string }).text ?? e))
      return { value: undefined } as never
    })
    const sent = recordSteps(on)
    await step($, 'high')
    await step($, 'low')
    expect(sent.at(-1)!.effort).toBe('low')
    expect(said.join(' ')).toContain('Auto is off. You picked Low')
    expect(String((await $.command.run({ command: 'pilot', args: 'auto' })).text)).toContain('Auto on')
  })

  test('/pilot debug says what the app asked for and what was sent', async ($, on) => {
    engine(on)
    const sent = recordSteps(on)
    const debug = async () => String((await $.command.run({ command: 'pilot', args: 'debug' })).text)
    expect(await debug()).toContain('last request: none yet')
    await $.command.run({ command: 'pilot', args: 'auto' })
    await step($, 'xhigh')
    expect(sent.at(-1)!.effort).toBe('xhigh')
    expect(await debug()).toContain('last request: app asked claude-opus-5-5 at xhigh, sent claude-opus-5-5 at xhigh (unchanged)')
    // The model that ran is also on a line of its own.
    expect((await debug()).split(String.fromCharCode(10)).at(-1)).toBe('model used: claude-opus-5-5 at xhigh')
  })

  test('a thank-you after a cheaper answer is not a redo', { options: { modelAuto: 'on' } } as never, async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    on('session.usage', () => ({ value: { context: { tokens: 100_000, window: 1_000_000, percent: 10 } } }) as never)
    let verdict = '{"model":"opus","effort":"high","why":"big refactor"}'
    on('model.complete', () => ({ value: { isAnswered: true as const, text: verdict, usage: USAGE } }))
    const sent: string[] = []
    const used = { input_tokens: 5, output_tokens: 40, cache_read_input_tokens: 90_000, cache_creation_input_tokens: 10_000, cache_creation: { ephemeral_1h_input_tokens: 10_000 } }
    on('turn.step', async function* (_$, e) {
      sent.push(e.model)
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: used } as never
    })
    await start($, on)
    await closeSetup($, DESK_BAND)
    await mocked.advance(16_000)
    const HAIKU = '{"model":"haiku","effort":"low","why":"lookup"}'
    const ask = async (v: string, text: string) => {
      verdict = v
      await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
      await step($)
    }
    await ask('{"model":"opus","effort":"high","why":"big refactor"}', 'refactor the whole auth layer')
    await mocked.advance(61 * 60_000)
    await ask(HAIKU, 'what is the folder called')
    await ask(HAIKU, 'no problem, now what is the tests folder called')
    expect(sent.at(-1)).toBe('claude-haiku-5-5')
    expect(String((await $.command.run({ command: 'pilot', args: 'stats' })).text)).toContain('0 redone')
  })

  test('the bench report says whether low confidence predicts a miss, and which models the judges picked', () => {
    const cases = [
      { id: 'a', kind: 'k', current: { model: 'sonnet', effort: 'medium', why: '', by: 'manual' }, message: 'x', ok: ['low'] },
      { id: 'b', kind: 'k', current: { model: 'sonnet', effort: 'medium', why: '', by: 'manual' }, message: 'y', ok: ['high'] },
      { id: 'c', kind: 'k', current: { model: 'sonnet', effort: 'medium', why: '', by: 'manual' }, message: 'z', ok: ['medium'] },
    ] as never
    const report = benchReport(cases, [
      { id: 'a', judge: 'haiku', effort: 'low', sure: 0.95, model: 'haiku', ms: 1, tokens: 1 },
      { id: 'b', judge: 'haiku', effort: 'low', sure: 0.5, model: 'sonnet', ms: 1, tokens: 1 },
      { id: 'c', judge: 'haiku', effort: 'medium', sure: 0.9, model: 'sonnet', ms: 1, tokens: 1 },
    ] as never)
    expect(report).toContain('| haiku (3 with a score) | 93% | 50% | 1 of 1 | 1 of 1 | 1 | 1 |')
    expect(report).toContain('| haiku | 1 | 2 | 0 | 0 |')
  })

  test("its lines: the effort, cache and context; the judge's reason and the last reply", () => {
    const base = { auto: true, paused: false, judging: false, effort: 'medium' as const, cacheNow: 42, contextPercent: 18, reason: 'Jev: a small fix', last: null }
    expect(dashboardLines(base).head).toBe(`✦ Medium · cache ${cacheLabel(42)} · 18% context`)
    expect(dashboardLines(base).detail).toBe('Jev: a small fix')
    expect(dashboardLines({ ...base, last: { cost: 42_000, ms: 38_200 } }).detail).toBe('Jev: a small fix · last reply ≈42.0k tokens · 38s')
    expect(dashboardLines({ ...base, auto: false }).head).toBe(`✦ Off · cache ${cacheLabel(42)} · 18% context`)
    expect(dashboardLines({ ...base, cacheNow: null, contextPercent: null }).head).toBe('✦ Medium')
    expect(weighted({ input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 1000, cache_creation_input_tokens: 4 })).toBe(10 + 10 + 100 + 5)
  })

  test('the effort word and the figures after it are drawn apart, so the figures can be cut and the word stays whole', () => {
    const base = { auto: true, paused: false, judging: false, effort: 'low' as const, cacheNow: 42, contextPercent: null, reason: '', last: null }
    expect(dashboardLines(base).what).toBe('Low')
    expect(dashboardLines(base).rest).toBe(` · cache ${cacheLabel(42)}`)
    expect(dashboardLines({ ...base, cacheNow: null }).rest).toBe('')
  })

  test('a new effort glows violet, then turns the band white in one redraw', () => {
    expect(flashColor(0)).toBe('#9b7bff')
    expect(flashColor(999)).toBe('#9b7bff')
    expect(new Set([1000, 1160, 1320, 1480, 1640].map(flashColor)).size).toBe(5)
    expect(flashColor(1400)).not.toBe('#9b7bff')
    expect(flashColor(1400)).not.toBe('#d4d4d8')
    expect(flashColor(null)).toBe('#d4d4d8')
    expect(flashColor(1800)).toBe('#d4d4d8')
  })

  test('limit guard: past GUARD_AT percent Auto stays at High or below; under it nothing changes', () => {
    expect(guarded('max', GUARD_AT)).toBe('high')
    expect(guarded('xhigh', 99)).toBe('high')
    expect(guarded('medium', 99)).toBe('medium')
    expect(guarded('max', GUARD_AT - 1)).toBe('max')
    expect(guarded('max', null)).toBe('max')
  })

  test('desktop: one slim line at rest; a hairline sweeps only while Claude works', DASH, async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    on('session.usage', () => ({ value: { context: { tokens: 180_000, window: 1_000_000, percent: 18 } } }) as never)
    await start($, on)
    await closeSetup($, DESK_BAND)
    await mocked.advance(16_000)
    const band = await $.ui.mount(DESK_BAND)
    expect(await band.find({ key: 'slim' })).toBeDefined()
    expect(await band.find({ key: 'dash' })).toBeUndefined()
    expect(await drawn(band)).toContain('"children":["18%"]')
    expect(await band.find({ key: 'slim-sweep' })).toBeUndefined()
    await band.press({ key: 'slim-auto' })
    expect(await drawn(band)).toContain('· manual')
    await band.unmount()
    const busy = await $.ui.mount({ plugin: 'pilot', surface: 'desktop', ...BAND, props: { ...BAND.props, isWorking: true } } as never)
    expect(await busy.find({ key: 'slim-sweep' })).toBeDefined()
    await busy.unmount()
  })

  test('desktop: the arrow folds the slim bar to its edge, and the arrow there brings it back', DASH, async ($, on) => {
    engine(on)
    const mocked = mock.clock(on)
    on('session.usage', () => ({ value: { context: { tokens: 180_000, window: 1_000_000, percent: 18 }, rateLimits: [{ kind: 'five_hour', percentUsed: 40 }] } }) as never)
    await start($, on)
    await closeSetup($, DESK_BAND)
    await mocked.advance(16_000)
    const band = await $.ui.mount(DESK_BAND)
    expect(await band.find({ key: 'slim-usage' })).toBeDefined()
    await band.press({ key: 'slim-fold' })
    expect(await band.find({ key: 'slim' })).toBeUndefined()
    expect(await band.find({ key: 'slim-usage' })).toBeUndefined()
    await band.press({ key: 'slim-unfold' })
    expect(await band.find({ key: 'slim' })).toBeDefined()
    await band.unmount()
  })

  test('readConfig keeps handoffButton to advised or always', () => {
    expect(readConfig({}).handoffButton).toBe('advised')
    expect(readConfig({ handoffButton: 'always' }).handoffButton).toBe('always')
    expect(readConfig({ handoffButton: 'sometimes' }).handoffButton).toBe('advised')
  })

  test('the handoff check reads the purpose, the trail, the last reply, the fill and the cache; an unclear answer is no', () => {
    const messages = [
      { role: 'user', text: 'build the settings page' },
      { role: 'assistant', text: 'done, anything else?' },
      { role: 'user', text: 'also fix the footer' },
      { role: 'assistant', text: 'footer fixed' },
    ]
    const text = handoffEvidence(messages, 'plan a trip to Lisbon', 42, true)
    expect(text).toContain('build the settings page')
    expect(text).toContain('footer fixed')
    expect(text).toContain('plan a trip to Lisbon')
    expect(text).toContain('42%')
    expect(text).toContain('cache is cold')
    expect(parseHandoffAnswer('{"handoff":"Task done"}')).toBe('Task done')
    expect(parseHandoffAnswer('{"handoff":null}')).toBeNull()
    expect(parseHandoffAnswer('{"handoff":"  "}')).toBeNull()
    expect(parseHandoffAnswer('maybe')).toBeNull()
  })

  test('parseVerdict keeps only a real handoff reason', () => {
    const base = '"model":"opus","effort":"high","why":"x"'
    expect(parseVerdict(`{${base},"handoff":"Task done"}`)?.handoff).toBe('Task done')
    expect(parseVerdict(`{${base},"handoff":"   "}`)?.handoff).toBeUndefined()
    expect(parseVerdict(`{${base},"handoff":false}`)?.handoff).toBeUndefined()
    expect(parseVerdict(`{${base}}`)?.handoff).toBeUndefined()
  })

  test('the Handoff glow steps up every 10% from 30%', () => {
    expect([0, 29, 30, 39, 40, 55, 69, 70, 95].map(handoffGlowStep)).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 5])
  })

  test("the minimal look draws no band and keeps the footer's buttons", { options: { layout: 'minimal' } } as never, async ($, on) => {
    engine(on)
    mock.clock(on)
    await start($, on)
    await closeSetup($, DESK_BAND)
    await expect($.ui.mount(DESK_BAND)).rejects.toThrow()
    const footer = await $.ui.mount(FOOTER)
    expect(await footer.find({ key: 'auto' })).toBeDefined()
    await footer.unmount()
  })
})

describe('a chat opened again', () => {
  const start = async ($: Engine, on: On) => {
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    on('classic.SessionStart', () => ({}) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }
  const closeSetup = async ($: Engine) => {
    const guide = await $.ui.mount(DESK_BAND)
    await guide.press({ key: 'setup-close' })
    await guide.unmount()
  }

})

describe('handoff look', () => {
  test('no box at 0%, the grey box at 15%, white at 30% where the glow starts, a step each percent', () => {
    expect(handoffLook(0).opacity).toBe(0)
    expect(handoffLook(15)).toMatchObject({ opacity: 1, fill: '#2b2b2f' })
    expect(handoffLook(30)).toMatchObject({ fill: '#ececf0', label: '#141416' })
    expect(handoffLook(80)).toEqual(handoffLook(30))
    expect(new Set(Array.from({ length: 31 }, (_, p) => JSON.stringify(handoffLook(p)))).size).toBe(31)
  })
})

describe('a message typed while a turn runs', () => {
  /** The judge answers with whatever `says.effort` holds at the time. */
  function judgeSaysNow(on: On, says: { effort: string }) {
    const asked: string[] = []
    on('model.complete', (_$, e) => {
      asked.push(e.prompt)
      return { value: { isAnswered: true as const, text: `{"model":"opus","effort":"${says.effort}","why":"x"}`, usage: USAGE } }
    })
    return asked
  }
  /** One request of turn `turnId` at request `index`. */
  async function stepOf($: Engine, turnId: string, index: number) {
    for await (const _ of $.turn.step({ turnId, index, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 })) {
      // drain
    }
  }

  test('a lower verdict never lowers the running turn; it takes the next one', async ($, on) => {
    engine(on)
    const says = { effort: 'high' }
    const asked = judgeSaysNow(on, says)
    const sent = recordSteps(on)
    mock.clock(on)
    on('turn.complete', () => ({ text: '' }) as never)

    await $.prompt.submit({ text: 'refactor the whole auth module across the app', wait: false, origin: { kind: 'composer' } })
    await stepOf($, 't1', 0)
    says.effort = 'low'
    await $.prompt.submit({ text: 'also rename the helper you made', wait: false, turnId: 't1', origin: { kind: 'composer' } } as never)
    await stepOf($, 't1', 1)
    await $.turn.complete({ turnId: 't1', answer: '', durationMs: 1, isAborted: false, reason: 'completed' } as never)
    await stepOf($, 't2', 0)

    expect(asked.length).toBe(2)
    // The judge is told the message came in while the task ran.
    expect(asked[1]).toContain('still working')
    expect(sent.map(s => s.effort)).toEqual(['high', 'high', 'low'])
  })

  test('a higher verdict raises the running turn at once', async ($, on) => {
    engine(on)
    const says = { effort: 'low' }
    judgeSaysNow(on, says)
    const sent = recordSteps(on)

    await $.prompt.submit({ text: 'fix the typo in the readme', wait: false, origin: { kind: 'composer' } })
    await stepOf($, 't1', 0)
    says.effort = 'high'
    await $.prompt.submit({ text: 'actually go through every doc and fix them all', wait: false, turnId: 't1', origin: { kind: 'composer' } } as never)
    await stepOf($, 't1', 1)

    expect(sent.map(s => s.effort)).toEqual(['low', 'high'])
  })

  test('Auto switched off or on mid-turn leaves the running turn at its effort', async ($, on) => {
    engine(on)
    const says = { effort: 'high' }
    judgeSaysNow(on, says)
    const sent = recordSteps(on)
    const auto = () => $.command.run({ command: 'pilot', args: 'auto' })

    await $.prompt.submit({ text: 'refactor the whole auth module across the app', wait: false, origin: { kind: 'composer' } })
    await stepOf($, 't1', 0)
    expect(String((await auto()).text)).toContain('Auto off')
    await stepOf($, 't1', 1)
    expect(String((await auto()).text)).toContain('Auto on')
    await stepOf($, 't1', 2)

    expect(sent.map(s => s.effort)).toEqual(['high', 'high', 'high'])
  })
})

describe('updates', () => {
  const DESK = { options: { layout: 'default' } } as never
  /** A session with `installed` on disk and `latest` on main; records what the mod runs. */
  function world(on: On, v: { installed: string; latest: string; fails?: string; git?: string; installPath?: string; noCli?: (bin: string) => boolean; env?: Record<string, string> }) {
    engine(on, v.env)
    const clock = mock.clock(on)
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('fs.read', (_$, e) => {
      if (String(e.path).replaceAll('\\', '/').endsWith('.claude-plugin/plugin.json')) return { value: JSON.stringify({ version: v.installed }) } as never
      if (v.installPath && String(e.path).replaceAll('\\', '/').endsWith('installed_plugins.json')) return { value: JSON.stringify({ plugins: { 'effortless@effortless': [{ installPath: v.installPath }] } }) } as never
      if (String(e.path).replaceAll('\\', '/').endsWith('marketplaces/effortless/public.json')) return { value: JSON.stringify([{ version: v.latest, note: 'Quick and Full as one switch.' }]) } as never
      return { value: '' } as never
    })
    on('http.fetch', (_$, e) => {
      if (String(e.url).includes('public.json'))
        return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify([{ version: v.latest, date: '2026-10-07', note: 'Quick and Full as one switch.' }]) } } as never
      return { value: { status: 404, ok: false, headers: {}, text: '' } } as never
    })
    const ran: string[] = []
    const envs: (Record<string, string> | undefined)[] = []
    on('process.run', (_$, e) => {
      // No claude where the app looks: the engine refuses to start it, as it does for a desktop-only user.
      if (v.noCli?.(e.argv[0])) return { deny: `$.process.run(${e.argv[0]}) failed to start: ENOENT: Command '${e.argv[0]}' not found or is in an unsafe location (current directory)` } as never
      ran.push(e.argv.join(' '))
      envs.push(e.init?.env)
      // git show answers with public.json as it is on stable, when the test gives one.
      const stdout = e.argv[0] === 'git' && e.argv.includes('show') ? (v.git ?? '') : ''
      return { value: v.fails ? { exitCode: 1, stdout: '', stderr: v.fails } : { exitCode: 0, stdout, stderr: '' } } as never
    })
    const commands: string[] = []
    const commandArgs: string[] = []
    on('command.run', (_$, e) => {
      commands.push(`/${e.command}`)
      if (e.args) commandArgs.push(`/${e.command} ${e.args}`)
      return { text: 'ok' }
    })
    const copied: string[] = []
    on('ui.copy', (_$, e) => {
      copied.push((e as { text: string }).text)
      return { value: { isCopied: true as const } } as never
    })
    return { clock, ran, envs, commands, commandArgs, copied }
  }
  const settle = () => new Promise(resolve => setTimeout(resolve, 30))
  /** Through the setup guide a first session opens, which takes the band before any card. */
  async function pastSetup(ui: { find: (q: { key: string }) => Promise<unknown>; press: (q: { key: string }) => Promise<unknown> }) {
    for (let i = 0; i < 6 && (await ui.find({ key: 'setup-close' })); i++)
      await ui.press({ key: (await ui.find({ key: 'setup-haiku' })) ? 'setup-haiku' : 'setup-close' })
  }
  const start = ($: Engine) => $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)

  test('versions compare by number and releases.json gives its newest entry', () => {
    expect(isNewer('1.35.80', '1.35.79')).toBe(true)
    expect(isNewer('1.36.0', '1.35.99')).toBe(true)
    expect(isNewer('1.35.9', '1.35.10')).toBe(false)
    expect(isNewer('1.35.79', '1.35.79')).toBe(false)
    expect(latestRelease('[{"version":"1.2.3","note":"x"},{"version":"1.2.2"}]')).toEqual({ version: '1.2.3', note: 'x' })
    expect(latestRelease('not json')).toBeUndefined()
    expect(latestRelease('[{"version":"latest"}]')).toBeUndefined()
  })

  test('nothing is offered when the installed version is the newest', DESK, async ($, on) => {
    world(on, { installed: '1.0.1', latest: '1.0.1' })
    await start($)
    await settle()
    const ui = await $.ui.mount({ plugin: 'pilot', surface: 'desktop', ...BAND })
    await pastSetup(ui)
    expect(await drawn(ui)).not.toContain('update-card')
    await ui.unmount()
  })

  test('syncPlan copies the installed version over the running cache folder, and nowhere else', () => {
    const oldDir = 'C:\\Users\\x\\.claude\\plugins\\cache\\effortless-dev\\effortless\\1.57.0'
    const newDir = 'C:\\Users\\x\\.claude\\plugins\\cache\\effortless-dev\\effortless\\1.59.0'
    expect(syncPlan(oldDir, newDir)?.slice(0, 3)).toEqual(['robocopy', newDir, oldDir])
    expect(syncPlan('/h/.claude/plugins/cache/m/effortless/1.0.0', '/h/.claude/plugins/cache/m/effortless/1.0.1')).toEqual(['cp', '-R', '/h/.claude/plugins/cache/m/effortless/1.0.1/.', '/h/.claude/plugins/cache/m/effortless/1.0.0'])
    // The same folder, nothing installed, or a working copy outside the cache: nothing is written.
    expect(syncPlan(newDir, newDir)).toBeUndefined()
    expect(syncPlan(oldDir, undefined)).toBeUndefined()
    expect(syncPlan('C:\\Users\\x\\Documents\\effortless', newDir)).toBeUndefined()
  })

  test('a failed clone names git\'s own reason, not the tail of a wrapped sentence', () => {
    const ssh = [
      '✘ Failed to install plugin "effortless@effortless": Failed to clone repository: Cloning into \'C:\\x\\temp_github_1\'...',
      'git@github.com: Permission denied (publickey).',
      'fatal: Could not read from remote repository.',
      '',
      'Please make sure you have the correct access rights',
      'and the repository exists.',
    ].join('\r\n')
    expect(updateFailure(ssh)).toBe('Could not read from remote repository.')
    expect(updateFailure('✘ Plugin "effortless" not found in marketplace\n')).toBe('Plugin "effortless" not found in marketplace')
    expect(updateFailure('network down')).toBe('network down')
    expect(updateFailure('x'.repeat(300))).toHaveLength(160)
    expect(updateFailure('')).toBe('')
  })

  test('claude is looked for on PATH, then where the Windows and Mac installers put it', () => {
    expect(claudeCandidates('C:/Users/friend')).toEqual(['claude', 'C:/Users/friend/.local/bin/claude.exe'])
    expect(claudeCandidates('/Users/friend')).toEqual(['claude', '/Users/friend/.local/bin/claude'])
    expect(claudeCandidates(undefined)).toEqual(['claude'])
    expect(noClaudeHint("$.process.run(claude) failed to start: ENOENT: Command 'claude' not found or is in an unsafe location (current directory)", 'C:/Users/friend')).toContain('install.ps1')
    expect(noClaudeHint('spawn claude ENOENT', '/Users/friend')).toContain('install.sh')
    expect(noClaudeHint('network down', '/Users/friend')).toBeUndefined()
  })

})

describe('agent panel', () => {
  const PANE = {
    plugin: 'pilot',
    surface: 'desktop',
    component: 'Pane',
    requestId: 'effortless-agents',
    props: { title: 'Agents', isFocused: false, bodyColumns: 46, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  } as never
  const start = async ($: Engine, on: On) => {
    engine(on)
    mock.clock(on)
    on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
    on('command.register', () => ({ value: undefined }) as never)
    on('classic.SessionStart', () => ({}) as never)
    on('ui.open', () => ({ value: { isPlaced: true } }) as never)
    await $.session.start({ cwd: '.', surface: 'desktop', isInteractive: true } as never)
  }

  test('the demo shows a card per agent still going and folds the finished ones into one', async ($, on) => {
    await start($, on)
    const reply = await $.command.run({ command: 'pilot', args: 'agents demo' })
    expect(String(reply.text)).toContain('agent panel')
    const pane = await $.ui.mount(PANE)
    const text = await drawn(pane)
    // A tree for tools/render-band (--tree), when asked for.
    if (text && (globalThis as { AGENT_TREE?: boolean }).AGENT_TREE) console.log(`AGENT_TREE ${text}`)
    for (const id of ['demo-1', 'demo-2', 'demo-3']) expect(await pane.find({ key: `agent-${id}` })).toBeDefined()
    expect(await pane.find({ key: 'agent-demo-4' })).toBeUndefined()
    expect(text).toContain('✓ 2 done')
    expect(text).toContain('1 waiting')
    expect(text).toContain('waiting on Bash npm test')
    // Pressing a card opens it: the pick and why show.
    await pane.press({ key: 'agent-demo-2-press' })
    expect(await drawn(pane)).toContain('a review before merge')
    await pane.unmount()
  })

  test('a spawned agent runs, waits on a long tool, and is done when its loop answers', async ($, on) => {
    on('agent.spawn', () => ({ agentId: 'a1', model: 'claude-haiku-5-5' }) as never)
    on('tool.call', () => ({ result: 'ok', isError: false }) as never)
    on('turn.complete', () => ({ text: '' }))
    await start($, on)
    await $.agent.spawn({ prompt: 'look around', description: 'find the hooks', subagentType: 'Explore' } as never)
    await $.command.run({ command: 'pilot', args: 'agents' })
    const pane = await $.ui.mount(PANE)
    expect(await drawn(pane)).toContain('1 working')
    expect(await drawn(pane)).toContain('find the hooks')
    await $.tool.call({ tool: 'Grep', pattern: 'agentId', agentId: 'a1' } as never)
    expect(await drawn(pane)).toContain('Grep agentId')
    await $.turn.complete({ turnId: 'x', agentId: 'a1', answer: 'found', durationMs: 1, isAborted: false, reason: 'answer' } as never)
    const text = await drawn(pane)
    expect(text).toContain('All done')
    expect(text).toContain('✓ 1 done')
    await pane.unmount()
  })

  test('with Helpers on, the judge picks a subagent\'s effort at its spawn and every request of it runs at that', { options: { helpers: 'on' } } as never, async ($, on) => {
    const asked = judgeSays(on, '{"model":"opus","effort":"low","why":"quick search"}')
    on('agent.spawn', () => ({ agentId: 'h1', model: 'claude-opus-5-5' }) as never)
    on('turn.complete', () => ({ text: '' }))
    const sent = recordSteps(on)
    await start($, on)
    await $.agent.spawn({ prompt: 'list the files under hooks', description: 'find files', subagentType: 'Explore' } as never)
    expect(asked.some(p => p.includes('Explore subagent'))).toBe(true)
    for (const index of [0, 1]) {
      for await (const _ of $.turn.step({ turnId: 't1', index, model: 'claude-opus-5-5', effort: 'high', messageCount: 1, agentId: 'h1' } as never)) {
        // drain
      }
    }
    // Helpers start at medium: a low verdict comes up to it.
    expect(sent.map(s => s.effort)).toEqual(['medium', 'medium'])
    await $.command.run({ command: 'pilot', args: 'agents' })
    const pane = await $.ui.mount(PANE)
    await pane.press({ key: 'agent-h1-press' }).catch(() => undefined)
    expect(await drawn(pane)).toContain('Medium')
    expect(await drawn(pane)).toContain('helpers start at medium')
    await pane.unmount()
  })

  test('a subagent\'s first request before its spawn resolves still gets the picked effort', { options: { helpers: 'on' } } as never, async ($, on) => {
    judgeSays(on, '{"model":"opus","effort":"low","why":"quick search"}')
    const sent = recordSteps(on)
    on('agent.list', () => ({ value: [{ id: 'h2', description: 'find files', type: 'Explore', status: 'running' }] }) as never)
    // The engine's own spawn: the subagent's first request goes out before the spawn answers with its id.
    let early: Promise<void> | null = null
    on('agent.spawn', async () => {
      early = (async () => {
        for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1, agentId: 'h2' } as never)) {
          // drain
        }
      })()
      await early
      return { agentId: 'h2', model: 'claude-opus-5-5' } as never
    })
    await start($, on)
    await $.agent.spawn({ prompt: 'list the files under hooks', description: 'find files', subagentType: 'Explore' } as never)
    expect(sent.map(s => s.effort)).toEqual(['medium'])
  })

  test("helperFloor: medium, the person's Min when higher, never above their Max", () => {
    expect(helperFloor('low', 'max')).toBe('medium')
    expect(helperFloor('high', 'max')).toBe('high')
    expect(helperFloor('low', 'low')).toBe('low')
  })

  test('with Helpers off, a subagent runs at the chat\'s effort and the judge is not asked', { options: { helpers: 'off' } } as never, async ($, on) => {
    const asked = judgeSays(on, '{"model":"opus","effort":"low","why":"quick search"}')
    on('agent.spawn', () => ({ agentId: 'h3', model: 'claude-opus-5-5' }) as never)
    const sent = recordSteps(on)
    await start($, on)
    await $.agent.spawn({ prompt: 'list the files', description: 'find files', subagentType: 'Explore' } as never)
    for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1, agentId: 'h3' } as never)) {
      // drain
    }
    expect(asked.some(p => p.includes('subagent'))).toBe(false)
    expect(sent.map(s => s.effort)).toEqual(['high'])
  })

  test('with Helpers off, a subagent of a judged turn runs at the turn\'s effort, never below medium', { options: { helpers: 'off' } } as never, async ($, on) => {
    engine(on)
    let verdict = '{"model":"opus","effort":"xhigh","why":"hard"}'
    const asked: string[] = []
    on('model.complete', (_$, e) => {
      asked.push(e.prompt)
      return { value: { isAnswered: true as const, text: verdict, usage: USAGE } }
    })
    on('agent.spawn', () => ({ agentId: 'h4', model: 'claude-opus-5-5' }) as never)
    const sent = recordSteps(on)
    const sub = async () => {
      for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'medium', messageCount: 1, agentId: 'h4' } as never)) {
        // drain
      }
    }
    await $.prompt.submit({ text: 'find why the relay drops messages', wait: false, origin: { kind: 'composer' } })
    await $.agent.spawn({ prompt: 'read relay/worker.js', description: 'read relay', subagentType: 'Explore' } as never)
    await sub()
    verdict = '{"model":"opus","effort":"low","why":"small"}'
    await $.prompt.submit({ text: 'list the files in hooks', wait: false, origin: { kind: 'composer' } })
    await sub()
    // No judge call for the subagent itself; it follows the turn, raised to medium at least.
    expect(asked.some(p => p.includes('subagent'))).toBe(false)
    expect(sent.map(s => s.effort)).toEqual(['xhigh', 'medium'])
  })

  test('the demo map shows the parts touched; a part opens to its files', async ($, on) => {
    await start($, on)
    await $.command.run({ command: 'pilot', args: 'agents demo' })
    const pane = await $.ui.mount(PANE)
    const text = await drawn(pane)
    expect(text).toContain('Map')
    expect(text).toContain('5 parts touched')
    expect(text).toContain('map of 5 parts of the code')
    // The main chat's own list is the total progress: 2 of 5 steps.
    expect(text).toContain('2 of 5 steps')
    expect(text).not.toContain('register.tsx')
    await pane.press({ key: 'mod-hooks-press' })
    const open = await drawn(pane)
    expect(open).toContain('register.tsx')
    expect(open).toContain('agents.tsx')
    await pane.unmount()
  })

  test("a file the main chat reads lands on the map under its folder", async ($, on) => {
    on('tool.call', () => ({ result: 'ok', isError: false }) as never)
    on('fs.read', () => ({ value: "import { a } from '../types'" }) as never)
    on('session.root', () => ({ value: '/proj' }) as never)
    await start($, on)
    await $.tool.call({ tool: 'Read', file_path: '/proj/hooks/x.ts' } as never)
    await $.command.run({ command: 'pilot', args: 'agents' })
    const pane = await $.ui.mount(PANE)
    const text = await drawn(pane)
    expect(text).toContain('1 part touched')
    expect(text).toContain('hooks')
    await pane.unmount()
  })

  test('imports, folders and links between parts', () => {
    expect(relPath('C:\\proj\\hooks\\a.ts', 'C:/proj')).toBe('hooks/a.ts')
    expect(relPath('/elsewhere/a.ts', '/proj')).toBeNull()
    expect(importsOf('hooks/a.tsx', "import x from './b'\nimport type { T } from '../types'")).toEqual(['hooks/b', 'types'])
    expect(importsOf('pkg/mod.py', 'from .util import x\nimport os')).toEqual(['pkg/util', 'os'])
    expect(moduleOf('docs/agent-panel/mockups/x.mjs')).toBe('docs/agent-panel')
    expect(moduleOf('README.md')).toBe('project')
    let files = withTouch([], 'hooks/a.ts', false, 'main', 1, ['types'])
    files = withTouch(files, 'types/index.d.ts', true, 'a1', 2, [])
    expect(moduleLinks(files)).toEqual(['hooks>types'])
    expect(files.find(f => f.path === 'types/index.d.ts')?.by).toEqual(['a1'])
  })
})

describe('theme', () => {
  test('readConfig reads orange and falls back to violet', () => {
    expect(readConfig({ theme: 'orange' }).theme).toBe('orange')
    expect(readConfig({ theme: ' orange ' }).theme).toBe('orange')
    expect(readConfig({ theme: 'pink' }).theme).toBe('violet')
    expect(readConfig({}).theme).toBe('violet')
  })

  test('orange turns the violets and leaves greys, greens, blues and yellows alone', () => {
    try {
      setTheme('orange')
      const hue = (hex: string) => {
        const n = parseInt(hex.slice(1), 16)
        const [r, g, b] = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
        const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
        return (h * 60 + 360) % 360
      }
      for (const violet of ['#a79cf7', '#b9a7ff', '#7c6cf0', '#4a3f80', '#15121f', '#9b7bff', '#e4dfff'])
        expect(Math.abs(hue(tintHex(violet)) - 15) < 4).toBe(true)
      for (const same of ['#ffffff', '#000000', '#141416', '#d4d4d8', '#8b8b93', '#2c2c31', '#7fe0a4', '#e0a33a', '#7cc4ff', '#e5534b', '#5d6a86'])
        expect(tintHex(same)).toBe(same)
      expect(tint('<stop stop-color="#a79cf7"/><path fill="#ffffff"/>')).toBe(`<stop stop-color="${tintHex('#a79cf7')}"/><path fill="#ffffff"/>`)
    } finally {
      setTheme('violet')
    }
  })

  test('rose turns the violets pink, leaves the signal colours alone, and draws the sparkles as falling petals', () => {
    expect(readConfig({ theme: 'rose' }).theme).toBe('rose')
    try {
      setTheme('rose')
      const hue = (hex: string) => {
        const n = parseInt(hex.slice(1), 16)
        const [r, g, b] = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
        const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
        const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
        return (h * 60 + 360) % 360
      }
      for (const violet of ['#a79cf7', '#b9a7ff', '#7c6cf0', '#4a3f80', '#9b7bff'])
        expect(Math.abs(hue(tintHex(violet)) - 340) < 4).toBe(true)
      for (const same of ['#ffffff', '#141416', '#7fe0a4', '#e0a33a', '#7cc4ff', '#e5534b'])
        expect(tintHex(same)).toBe(same)
      const art = '<svg><style>.sp{fill:#fff}</style><rect fill="#7c6cf0" width="9" height="9"/><path class="sp" style="transform-origin:168px 8px;animation-duration:4.2s;animation-delay:0.3s" d="M168 6.4 L168.34 7.66 Z"/></svg>'
      const petals = tint(art)
      expect(petals).toContain('class="pt"')
      expect(petals).toContain('<g transform="translate(168 0)">')
      expect(petals).toContain('@keyframes fall')
      expect(petals).not.toContain('class="sp"')
      // Art with no violet in it (the green Done card) keeps its sparkles.
      const green = '<svg><style>.sp{fill:#fff}</style><rect fill="#2fae62" width="9" height="9"/><path class="sp" style="transform-origin:168px 8px;animation-duration:4.2s;animation-delay:0.3s" d="M168 6.4 L168.34 7.66 Z"/></svg>'
      expect(tint(green)).toContain('class="sp"')
      expect(tint(green)).not.toContain('class="pt"')
      // Orange keeps the sparkles.
      setTheme('orange')
      expect(tint(art)).toContain('class="sp"')
    } finally {
      setTheme('violet')
    }
  })

  test('violet changes nothing and the Svg is left as it is', () => {
    setTheme('violet')
    const Svg = (p: Record<string, unknown>) => p
    expect(tint('#a79cf7')).toBe('#a79cf7')
    expect(themedSvg(Svg)).toBe(Svg)
    try {
      setTheme('orange')
      const wrapped = themedSvg(Svg) as typeof Svg
      expect(wrapped({ source: '<g fill="#a79cf7"/>' }).source).toBe(`<g fill="${tintHex('#a79cf7')}"/>`)
      expect(wrapped({ source: 42 }).source).toBe(42)
    } finally {
      setTheme('violet')
    }
  })
})
