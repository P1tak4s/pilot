// A small chess engine for the opponent in the chat: it needs no model and no network, answers in a fraction of a
// second and plays sensibly rather than well. Negamax with alpha-beta, material and a small pull towards the centre,
// captures tried first. Equal moves are told apart by chance, so no two games open the same way.
import { inCheck, legalMoves, play, type Move, type Position } from './chess-rules'

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }
const MATE = 30000

// How far a square is from the middle of the board, 0 in the centre to 3 at the corner: pieces like the middle.
const centre = (sq: number) => {
  const f = sq & 7
  const r = sq >> 3
  return Math.min(f, 7 - f) + Math.min(r, 7 - r)
}

// The position as the side to move sees it: positive is good for them.
function evaluate(p: Position): number {
  let score = 0
  for (let sq = 0; sq < 64; sq++) {
    const piece = p.board[sq]
    if (!piece) continue
    const kind = piece.toLowerCase()
    let v = VALUE[kind]
    if (kind === 'n' || kind === 'b') {
      v += centre(sq) * 8
      // A minor piece still on its first rank has not been brought out: castling and attacks come after.
      if ((piece === piece.toUpperCase() ? sq >> 3 === 0 : sq >> 3 === 7)) v -= 14
    } else if (kind === 'p') {
      const advanced = piece === 'P' ? sq >> 3 : 7 - (sq >> 3)
      v += advanced * 6 + centre(sq) * 3
    } else if (kind === 'q') v += centre(sq) * 2
    else if (kind === 'k') {
      // A king tucked in a corner of its own first rank is safe in the opening and middle game.
      const home = piece === 'K' ? sq >> 3 === 0 : sq >> 3 === 7
      const file = sq & 7
      if (home && (file <= 2 || file >= 6)) v += 25
    }
    score += piece === piece.toUpperCase() ? v : -v
  }
  return p.turn === 'w' ? score : -score
}

// Captures first, the bigger prize for the smaller piece best, then promotions: the cut-offs come sooner that way.
function ordered(p: Position, moves: Move[]): Move[] {
  const key = (m: Move) => {
    const victim = p.board[m.to]
    const mover = p.board[m.from]
    return (victim ? 10 * VALUE[victim.toLowerCase()] - VALUE[mover.toLowerCase()] : 0) + (m.promo ? 800 : 0)
  }
  return [...moves].sort((a, b) => key(b) - key(a))
}

// At the end of the search only captures are played out, so a piece is never counted as won when the next move takes it
// back: that horizon mistake is where a shallow search looks foolish.
function quiet(p: Position, alpha: number, beta: number, ply: number): number {
  const stand = evaluate(p)
  if (stand >= beta) return stand
  if (stand > alpha) alpha = stand
  if (ply > 8) return stand
  const moves = legalMoves(p)
  if (moves.length === 0) return inCheck(p) ? -MATE + ply : 0
  for (const m of ordered(p, moves.filter(x => p.board[x.to] || x.promo))) {
    const score = -quiet(play(p, m), -beta, -alpha, ply + 1)
    if (score >= beta) return score
    if (score > alpha) alpha = score
  }
  return alpha
}

let deadline = Infinity
let expired = false

function search(p: Position, depth: number, alpha: number, beta: number, ply: number): number {
  if (Date.now() > deadline) {
    expired = true
    return 0
  }
  const moves = legalMoves(p)
  if (moves.length === 0) return inCheck(p) ? -MATE + ply : 0
  if (depth === 0) return quiet(p, alpha, beta, ply)
  let best = -Infinity
  for (const m of ordered(p, moves)) {
    const score = -search(play(p, m), depth - 1, -beta, -alpha, ply + 1)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
    if (expired) break
  }
  return best
}

export type ChessLevel = 'easy' | 'normal' | 'hard' | 'master'
export const CHESS_LEVELS: ChessLevel[] = ['easy', 'normal', 'hard', 'master']
// How deep each level looks, how long it may think, and how often it plays a random legal move instead.
const LEVELS: Record<ChessLevel, { depth: number; ms: number; slip: number }> = {
  easy: { depth: 1, ms: 400, slip: 0.35 },
  normal: { depth: 2, ms: 800, slip: 0 },
  hard: { depth: 3, ms: 1500, slip: 0 },
  master: { depth: 6, ms: 3000, slip: 0 },
}

/** The engine's move for the side to move at a level, or null when there is none. Deepens one move at a time and keeps
 * the last depth that finished in time, so a crowded position cannot hold the chat up. */
function* steps(p: Position, level: ChessLevel | number, random: () => number): Generator<void, Move | null> {
  const all = legalMoves(p)
  if (all.length === 0) return null
  const cfg = typeof level === 'number' ? { depth: level, ms: 60_000, slip: 0 } : LEVELS[level]
  if (cfg.slip > 0 && random() < cfg.slip) return all[Math.floor(random() * all.length)]
  deadline = Date.now() + cfg.ms
  expired = false
  const moves = ordered(p, all)
  let picks: Move[] = [moves[0]]
  for (let depth = 1; depth <= cfg.depth; depth++) {
    let best = -Infinity
    let found: Move[] = []
    for (const m of moves) {
      // A window just under the best so far keeps ties in play while still cutting everything clearly worse.
      const score = -search(play(p, m), depth - 1, -MATE * 2, -(best - 1), 1)
      if (expired) break
      if (score > best) {
        best = score
        found = [m]
      } else if (score === best) found.push(m)
      yield
    }
    if (expired) break
    picks = found
    if (best > MATE - 100) break
  }
  return picks[Math.floor(picks.length * random())]
}

export function bestMove(p: Position, level: ChessLevel | number = 'hard', random: () => number = Math.random): Move | null {
  const run = steps(p, level, random)
  for (;;) {
    const r = run.next()
    if (r.done) return r.value
  }
}

/** The same move, found in slices: after each root move that took long, `pause` runs, so the rest of the app is not held
 * for the whole think (the plugin runs on one thread, and a long think left buttons dead). */
export async function bestMoveAsync(p: Position, level: ChessLevel | number, pause: () => Promise<void>, random: () => number = Math.random): Promise<Move | null> {
  const run = steps(p, level, random)
  let last = Date.now()
  for (;;) {
    const r = run.next()
    if (r.done) return r.value
    if (Date.now() - last > 25) {
      await pause()
      last = Date.now()
    }
  }
}
