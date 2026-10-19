import { describe, expect, mock, test } from 'claude-code/testing'
import { describe as say, legalMoves, outcome, parseFen, perft, play, squareOf, START, toFen } from './chess-rules'

// The usual perft counts: any mistake in castling, en passant, promotion or pins changes them.
describe('chess rules', () => {
  test('start position', () => {
    const p = parseFen(START)
    expect(perft(p, 1)).toBe(20)
    expect(perft(p, 2)).toBe(400)
    expect(perft(p, 3)).toBe(8902)
  })
  test('kiwipete: castling, pins, en passant', () => {
    const p = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1')
    expect(perft(p, 1)).toBe(48)
    expect(perft(p, 2)).toBe(2039)
  })
  test('endgame with en passant checks', () => {
    expect(perft(parseFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 3)).toBe(2812)
  })
  test('promotions', () => {
    expect(perft(parseFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1'), 2)).toBe(264)
  })
  test('fen round trip and words', () => {
    const p = parseFen(START)
    expect(toFen(p)).toBe(START)
    const e4 = { from: squareOf('e2'), to: squareOf('e4') }
    expect(say(p, e4)).toBe('pawn e2 to e4')
    expect(toFen(play(p, e4))).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
  })
  test('fool\'s mate is checkmate', () => {
    let p = parseFen(START)
    for (const [a, b] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) p = play(p, { from: squareOf(a), to: squareOf(b) })
    expect(legalMoves(p).length).toBe(0)
    expect(outcome(p)).toBe('checkmate')
  })
})

function fakeHost(on: any, withChess = false) {
  const store = new Map<string, unknown>()
  const sent: { text: string; context: string[] }[] = []
  const toasts: string[] = []
  on('env.get', () => ({ value: '' }))
  // With the Chess set on disk, the way the plugin ships it: hooks/scenes/chess/chess.svg.
  const at = (e: any) => String(e.path).replace(/\\/g, '/')
  on('fs.list', ($: any, e: any) => ({
    value: !withChess ? [] : at(e).endsWith('/hooks/scenes') ? [{ name: 'chess', kind: 'dir' }] : at(e).endsWith('/hooks/scenes/chess') ? [{ name: 'chess.svg', kind: 'file' }] : [],
  }))
  on('fs.read', () => ({ value: withChess ? '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="350"><rect width="560" height="350" fill="#151515"/></svg>' : '' }))
  on('fs.write', () => ({ value: undefined }))
  on('store.get', ($: any, e: any) => ({ value: store.get(e.key) ?? null }))
  on('store.set', ($: any, e: any) => { store.set(e.key, e.value); return { value: undefined } })
  on('ui.invalidate', async ($: any, e: any, next: any) => next(e).catch(() => ({ value: undefined })))
  on('ui.toast', ($: any, e: any) => { toasts.push(String(e.text ?? e.message ?? '')); return { value: undefined } })
  on('prompt.submit', ($: any, e: any) => { sent.push({ text: e.text, context: [...(e.context ?? [])] }); return { text: e.text } })
  on('turn.complete', () => ({ text: '' }))
  on('http.fetch', () => ({ value: { status: 404, ok: false, headers: {}, text: '' } }))
  on('ui.render', (h: any, e: any) => h.ui.resolve(e).Box({ key: 'core' }))
  return { sent, toasts, store }
}

const sq = (name: string) => `chess-${squareOf(name)}`
const answer = (e: any, text: string) => e.turn.complete({ answer: text, reason: 'answer', durationMs: 3000, isAborted: false, turnId: 't' })

const out = (e: any, text: string) => e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'CommandOutput', props: { command: 'chess', args: '', text } })
const step = (e: any, id: string) => e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'ToolUse', props: { tool_use_id: id, tool: 'Bash', input: { description: 'Run the tests' }, isRunning: true } })
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('chess against the computer', () => {
  test('the board is in the /chess row, a click move is answered at once, and nothing is sent to Claude', async ($, on) => {
    const host = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    const r = await e.command.run({ command: 'chess', args: 'white' })
    const text = String(r?.text ?? '')
    expect(text).toContain('against the computer')
    const row: any = await out(e, text)
    expect(await row.find({ key: 'chess' })).toBeDefined()
    // A black piece cannot be picked, and an illegal target does nothing.
    await row.press({ key: sq('e7') })
    await row.press({ key: sq('e2') })
    await row.press({ key: sq('e5') })
    await row.press({ key: sq('e4') })
    expect(await row.find({ text: '♟ Chess · The computer is thinking…' })).toBeDefined()
    // Clicks while it thinks are ignored.
    await row.press({ key: sq('d2') })
    await row.press({ key: sq('d4') })
    await clock.advance(2600)
    expect(await row.find({ text: '♟ Chess · Your move' })).toBeDefined()
    expect(host.sent.length).toBe(0)
    const saved: any = JSON.parse(JSON.stringify(host.store.get('chess')))
    expect(saved.moves.length).toBe(2)
    expect(saved.moves[0]).toBe('e2e4')
  })

  test('after a message the board leaves the /chess row for the card and the newest answer, never the band above the prompt', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    const text = String((await e.command.run({ command: 'chess', args: 'white' }))?.text ?? '')
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    await step(e, 'c1')
    await clock.advance(3500)
    const card: any = await step(e, 'c1')
    expect(await card.find({ key: sq('e2') })).toBeDefined()
    expect(await card.find({ key: 'textless-minimize' })).toBeDefined()
    expect(await (await out(e, text)).find({ key: 'chess' })).toBeUndefined()
    await e.turn.complete({ answer: 'Done.', reason: 'answer', durationMs: 5000, isAborted: false, turnId: 'x' })
    const reply: any = await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AssistantMessage', props: { text: 'Done.' } })
    expect(await reply.find({ key: sq('e2') })).toBeDefined()
    const band: any = await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'AbovePrompt', props: {} })
    expect(await band.find({ key: 'chess' })).toBeUndefined()
  })
})

describe('chess with Claude', () => {
  test('a click move goes to Claude with the position, and its MOVE line is played back', async ($, on) => {
    const host = fakeHost(on)
    mock.clock(on)
    const e: any = $
    const text = String((await e.command.run({ command: 'chess', args: 'claude white' }))?.text ?? '')
    expect(text).toContain('against Claude')
    const row: any = await out(e, text)
    await row.press({ key: sq('e7') })
    await row.press({ key: sq('e2') })
    await row.press({ key: sq('e5') })
    expect(host.sent.length).toBe(0)
    await row.press({ key: sq('e4') })
    expect(host.sent.length).toBe(1)
    expect(host.sent[0].text.split('\n')[0]).toBe('♟ I play pawn e2 to e4. Your move.')
    expect(host.sent[0].text).toContain('Your legal moves:')
    expect(host.sent[0].text).toContain('e7e5')
    // The chat shows only the first line; the position under the marker is for Claude.
    const msg: any = await e.ui.mount({ plugin: 'textless', surface: 'desktop', component: 'UserMessage', props: { text: host.sent[0].text } })
    expect(msg).toBeDefined()
    expect(await row.find({ text: '♟ Chess with Claude · Claude is thinking…' })).toBeDefined()
    await row.press({ key: sq('d2') })
    await row.press({ key: sq('d4') })
    expect(host.sent.length).toBe(1)
    await answer(e, 'The classic reply.\nMOVE: e7e5')
    expect(await row.find({ text: '♟ Chess with Claude · Your move' })).toBeDefined()
    await row.press({ key: sq('e4') })
    await row.press({ key: sq('e5') })
    expect(host.sent.length).toBe(1)
  })

  test('an illegal answer is asked again once, then a legal move is played for Claude', async ($, on) => {
    const host = fakeHost(on)
    mock.clock(on)
    const e: any = $
    const text = String((await e.command.run({ command: 'chess', args: 'claude white' }))?.text ?? '')
    const row: any = await out(e, text)
    await row.press({ key: sq('g1') })
    await row.press({ key: sq('f3') })
    expect(host.sent[0].text).toContain('g8f6')
    await answer(e, 'Queen to the moon. MOVE: d8h1')
    expect(host.sent.length).toBe(2)
    expect(host.sent[1].text).toContain('not legal')
    await answer(e, 'No move line at all.')
    expect(host.sent.length).toBe(2)
    expect(await row.find({ text: '♟ Chess with Claude · Your move' })).toBeDefined()
    const r = await e.command.run({ command: 'chess', args: 'end' })
    expect(String(r?.text ?? '')).toContain('closed')
    expect(await row.find({ key: 'chess' })).toBeUndefined()
  })
})

import { bestMove } from './chess-engine'

describe('the built-in opponent', () => {
  test('mates in one, takes a free queen, and answers the start position quickly', () => {
    // White to move, Qh5 mates in one against the fool's-mate-like setup.
    const mate = parseFen('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1')
    const m = bestMove(mate, 3)!
    expect(`${squareOf('h5')}-${squareOf('f7')}`).toBe(`${m.from}-${m.to}`)
    // Black to move can take the undefended white queen on d4 with the knight.
    const free = parseFen('rnbqkb1r/pppppppp/8/8/3Q4/5n2/PPPPPPPP/RNB1KBNR b KQkq - 0 1')
    const t = bestMove(free, 3)!
    expect(squareOf('d4')).toBe(t.to)
    const began = Date.now()
    expect(bestMove(parseFen(START), 3)).not.toBeNull()
    expect(Date.now() - began).toBeLessThan(3000)
  })
  test('has no move when the game is over', () => {
    let p = parseFen(START)
    for (const [a, b] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) p = play(p, { from: squareOf(a), to: squareOf(b) })
    expect(bestMove(p, 3)).toBeNull()
  })
})

describe('the built-in opponent, speed', () => {
  test('a crowded middle game is answered within two seconds', () => {
    const kiwipete = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1')
    const began = Date.now()
    expect(bestMove(kiwipete, 3)).not.toBeNull()
    expect(Date.now() - began).toBeLessThan(2000)
  })
  test('does not leave a queen to be taken for a pawn', () => {
    // Black to move can take the white queen on e4 with the pawn on d5 ... but must not, since the queen guards nothing: the point
    // here is the other way round: white's queen on d1 may take the pawn on d5, which is guarded by the queen on d8.
    const p = parseFen('3qk3/8/8/3p4/8/8/8/3QK3 w - - 0 1')
    const m = bestMove(p, 3)!
    expect(`${m.from}-${m.to}`).not.toBe(`${squareOf('d1')}-${squareOf('d5')}`)
  })
})

describe('playing black', () => {
  test('the opponent opens, the board turns round, and the person moves the black pieces', async ($, on) => {
    const host = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    const r = await e.command.run({ command: 'chess', args: 'black' })
    const text = String(r?.text ?? '')
    expect(text).toContain('black')
    const row: any = await out(e, text)
    await clock.advance(2600)
    const saved: any = JSON.parse(JSON.stringify(host.store.get('chess')))
    expect(saved.moves.length).toBe(1)
    expect(saved.side).toBe('b')
    // The white pieces are the opponent's: clicking them does nothing for the person.
    await row.press({ key: sq('e2') })
    await row.press({ key: sq('e4') })
    expect((JSON.parse(JSON.stringify(host.store.get('chess'))) as any).moves.length).toBe(1)
    // The black pieces are the person's.
    await row.press({ key: sq('e7') })
    await row.press({ key: sq('e5') })
    await clock.advance(2600)
    const after: any = JSON.parse(JSON.stringify(host.store.get('chess')))
    expect(after.moves.length).toBe(3)
    expect(after.moves[1]).toBe('e7e5')
    // Black at the bottom: the files run h to a under the board.
    expect(await row.find({ key: 'chess-file-h' })).toBeDefined()
  })

  test('against Claude, Claude is asked to open when the person plays black', async ($, on) => {
    const host = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.command.run({ command: 'chess', args: 'claude black' })
    await clock.advance(400)
    expect(host.sent.length).toBe(1)
    expect(host.sent[0].text).toContain('You play white and open')
    expect(host.sent[0].text).toContain('playing white')
    expect(host.sent[0].text).toContain('e2e4')
    await answer(e, 'I open with the king pawn.\nMOVE: e2e4')
    const saved: any = JSON.parse(JSON.stringify(host.store.get('chess')))
    expect(saved.moves).toEqual(['e2e4'])
  })
})

describe('the Chess set', () => {
  test('is not a set of the card: chess starts only with /chess, and the card never draws the board by itself', async ($, on) => {
    const host = fakeHost(on, true)
    const clock = mock.clock(on)
    const e: any = $
    const r = await e.command.run({ command: 'textless', args: 'set chess' })
    expect(String(r?.text ?? '')).not.toContain('Chess')
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    await step(e, 'k1')
    await clock.advance(3500)
    const card: any = await step(e, 'k1')
    expect(await card.find({ key: `chess-${squareOf('e2')}` })).toBeUndefined()
    expect(host.store.get('chess')).toBeUndefined()
  })
})

describe('a lost opponent timer', () => {
  test('a click wakes an opponent that was never told to move, so a game cannot sit stuck', async ($, on) => {
    const host = fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    // The game as a reload leaves it: the opponent's turn, with no timer running.
    host.store.set('chess', { fen: START, moves: ['e2e4'], waiting: 'claude', tries: 0, vs: 'engine', side: 'w' })
    const r = await e.command.run({ command: 'chess', args: '' })
    const row: any = await out(e, String(r?.text ?? ''))
    await row.press({ key: sq('d2') })
    await clock.advance(5000)
    const saved: any = JSON.parse(JSON.stringify(host.store.get('chess')))
    expect(saved.waiting).toBe('you')
    expect(saved.moves.length).toBeGreaterThan(1)
  })
})

describe('the terminal board', () => {
  test('draws the pieces as letters on coloured squares, since a plain terminal cannot draw pictures', async ($, on) => {
    fakeHost(on)
    mock.clock(on)
    const e: any = $
    const r = await e.command.run({ command: 'chess', args: 'white' })
    const row: any = await e.ui.mount({ plugin: 'textless', surface: 'terminal', component: 'CommandOutput', props: { command: 'chess', args: 'white', text: String(r?.text ?? '') } })
    expect(await row.find({ text: '♟' })).toBeDefined()
    expect(await row.find({ key: `chess-${squareOf('e2')}` })).toBeDefined()
    // Picking a piece and moving it works from the terminal's buttons, the piece's own square included.
    await row.press({ key: sq('e2') })
    await row.press({ key: sq('e4') })
    expect(await row.find({ text: '♟ Chess · The computer is thinking…' })).toBeDefined()
  })
})

describe('the terminal card', () => {
  test('paints the scene as coloured cells, or a quote as its words, where an SVG cannot be drawn', async ($, on) => {
    fakeHost(on)
    const clock = mock.clock(on)
    const e: any = $
    await e.prompt.submit({ text: 'go' })
    await wait(1600)
    const term = (id: string) => e.ui.mount({ plugin: 'textless', surface: 'terminal', component: 'ToolUse', props: { tool_use_id: id, tool: 'Bash', input: { description: 'Run the tests' }, isRunning: true } })
    await term('t1')
    await clock.advance(3500)
    const card: any = await term('t1')
    const art = await card.find({ key: 'textless-art' })
    const quote = await card.find({ key: 'textless-quote' })
    expect(art !== undefined || quote !== undefined).toBe(true)
  })
})
