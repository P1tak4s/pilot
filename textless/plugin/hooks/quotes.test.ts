import { describe, expect, mock, test } from 'claude-code/testing'
import { onceMs, quoteCard, quoteLayout, stillCard } from './quill'
import { QUOTES } from './quotes-list'

// The quotes set is drawn from a list when shown. Every quote must fit the card, keep a stable id, stay under the
// size a scene may have, and, once written, be shown finished instead of written again.
describe('quotes set', () => {
  test('two hundred quotes, each with its own id', () => {
    expect(QUOTES.length).toBe(200)
    const ids = QUOTES.map(([id]) => id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)).toBe(true)
  })

  test('every quote fits four lines at a readable size, with no lonely last word', () => {
    for (const [id, text] of QUOTES) {
      const { size, lines } = quoteLayout(text)
      const widest = Math.max(...lines.map(([, w]) => w))
      if (lines.length > 4 || size < 24) throw new Error(`${id} does not fit: ${lines.length} lines at ${size}`)
      if (lines.length > 1 && lines[lines.length - 1][1] < 0.3 * widest) throw new Error(`${id} leaves a lonely word`)
      expect(lines.map(([l]) => l).join(' ')).toBe(text.split(/\s+/).join(' '))
    }
  })

  test('every card is a whole SVG under the scene size cap and says how long it writes', () => {
    for (const [id, text, author] of QUOTES) {
      const svg = quoteCard(text, author)
      if (!svg.startsWith('<svg') || !svg.endsWith('</svg>') || svg.length > 131072) throw new Error(`${id} card is not right`)
      const ms = onceMs(svg)
      if (ms === null || ms < 2000 || ms > 12000) throw new Error(`${id} writes for ${ms} ms`)
    }
  })

  test('the still card keeps every letter and the author, and no animation', () => {
    const [, text, author] = QUOTES[0]
    const still = stillCard(quoteCard(text, author))
    const written = quoteLayout(text).lines.map(([l]) => l).join('')
    expect(/<animate|<set/.test(still)).toBe(false)
    expect(still).toContain(author)
    const letters = [...still.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(m => m[1]).join('')
    expect(letters).toBe(written)
    // the finished look: letters inked, nothing hidden
    expect(/fill-opacity="0"|opacity="0"/.test(still)).toBe(false)
  })
})

function fakeHost(on: any) {
  const store = new Map<string, unknown>()
  on('env.get', () => ({ value: '' }))
  on('fs.read', () => ({ value: '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
  return store
}

describe('quotes on the card', () => {
  test('the set is listed, and a quote is written once, then shown finished', async ($, on) => {
    fakeHost(on)
    // the shipped scene folders are read from disk; this host has none, so only the drawn quotes set is there
    on('fs.list', () => ({ value: [] }))
    const clock = mock.clock(on)
    const e: any = $
    const r = await e.command.run({ command: 'textless', args: 'set quotes' })
    expect(String(r?.text ?? '')).not.toContain('Sets:')
    // keep one quote on the card every turn, so the second turn shows the same one
    await e.command.run({ command: 'textless', args: 'next' })
    const turn = async (n: number) => {
      await e.prompt.submit({ text: `turn ${n}` })
      await new Promise(res => setTimeout(res, 1600))
      const row: any = await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: `q${n}`, tool: 'Bash', input: {}, isRunning: true } })
      await clock.advance(3500)
      const node: any = (await row.findAll({ type: 'Svg' })).find((n: any) => (n?.props?.alt ?? n?.alt) === 'Claude working')
      const svg = String(node?.props?.source ?? node?.source ?? '')
      await e.turn.complete({ answer: 'done', reason: 'answer', durationMs: 9000, isAborted: false, turnId: `t${n}` })
      return svg
    }
    const writing = await turn(1)
    expect(writing).toContain('data-once=')
    expect(writing).toContain('<animate')
    await clock.advance(20000)
    const again = await turn(2)
    expect(again).toContain('data-once=')
    expect(again).not.toContain('<animate')
  })
})
