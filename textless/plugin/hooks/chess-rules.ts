// The rules of chess, small and on their own: a position, its legal moves, playing one, and how a game ends.
// Squares are 0..63, a1 = 0, h1 = 7, a8 = 56. White pieces are capitals (PNBRQK), black ones lower case, '' is empty.

export type Side = 'w' | 'b'
export type Position = { board: string[]; turn: Side; castle: string; ep: number; half: number; full: number }
export type Move = { from: number; to: number; promo?: string }

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]]

const fileOf = (sq: number) => sq & 7
const rankOf = (sq: number) => sq >> 3
const at = (f: number, r: number) => (f < 0 || f > 7 || r < 0 || r > 7 ? -1 : r * 8 + f)
const sideOf = (p: string): Side | '' => (p === '' ? '' : p === p.toUpperCase() ? 'w' : 'b')

export const squareName = (sq: number) => 'abcdefgh'[fileOf(sq)] + String(rankOf(sq) + 1)
export const squareOf = (name: string) => at('abcdefgh'.indexOf(name[0]), Number(name[1]) - 1)
export const uci = (m: Move) => squareName(m.from) + squareName(m.to) + (m.promo ?? '')

export function parseFen(fen: string): Position {
  const [rows, turn, castle, ep, half, full] = fen.trim().split(/\s+/)
  const board: string[] = new Array(64).fill('')
  rows.split('/').forEach((row, i) => {
    let f = 0
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch)
      else board[(7 - i) * 8 + f++] = ch
    }
  })
  return { board, turn: turn === 'b' ? 'b' : 'w', castle: castle === '-' ? '' : castle, ep: ep && ep !== '-' ? squareOf(ep) : -1, half: Number(half ?? 0), full: Number(full ?? 1) }
}

export function toFen(p: Position): string {
  const rows: string[] = []
  for (let r = 7; r >= 0; r--) {
    let row = ''
    let gap = 0
    for (let f = 0; f < 8; f++) {
      const piece = p.board[r * 8 + f]
      if (!piece) gap++
      else {
        row += (gap ? String(gap) : '') + piece
        gap = 0
      }
    }
    rows.push(row + (gap ? String(gap) : ''))
  }
  return `${rows.join('/')} ${p.turn} ${p.castle || '-'} ${p.ep >= 0 ? squareName(p.ep) : '-'} ${p.half} ${p.full}`
}

// Whether `by` attacks `sq`: looked at from the square outwards, as each kind of piece would reach it.
export function attacked(p: Position, sq: number, by: Side): boolean {
  const f = fileOf(sq)
  const r = rankOf(sq)
  const own = (piece: string) => (by === 'w' ? piece.toUpperCase() : piece.toLowerCase())
  const pr = by === 'w' ? r - 1 : r + 1
  for (const df of [-1, 1]) if (p.board[at(f + df, pr)] === own('p')) return true
  for (const [df, dr] of KNIGHT) if (p.board[at(f + df, r + dr)] === own('n')) return true
  for (const [df, dr] of KING) if (p.board[at(f + df, r + dr)] === own('k')) return true
  const slide = (dirs: number[][], kinds: string[]) => {
    for (const [df, dr] of dirs) {
      for (let k = 1; ; k++) {
        const s = at(f + df * k, r + dr * k)
        if (s < 0) break
        const piece = p.board[s]
        if (piece) {
          if (kinds.some(x => piece === own(x))) return true
          break
        }
      }
    }
    return false
  }
  return slide(ROOK, ['r', 'q']) || slide(BISHOP, ['b', 'q'])
}

export const kingOf = (p: Position, side: Side) => p.board.indexOf(side === 'w' ? 'K' : 'k')
export const inCheck = (p: Position, side: Side = p.turn) => attacked(p, kingOf(p, side), side === 'w' ? 'b' : 'w')

function pseudo(p: Position): Move[] {
  const out: Move[] = []
  const me = p.turn
  const foe: Side = me === 'w' ? 'b' : 'w'
  for (let sq = 0; sq < 64; sq++) {
    const piece = p.board[sq]
    if (sideOf(piece) !== me) continue
    const f = fileOf(sq)
    const r = rankOf(sq)
    const kind = piece.toLowerCase()
    const add = (to: number) => out.push({ from: sq, to })
    if (kind === 'p') {
      const dir = me === 'w' ? 1 : -1
      const last = me === 'w' ? 7 : 0
      const push = (to: number) => (rankOf(to) === last ? ['q', 'r', 'b', 'n'].forEach(promo => out.push({ from: sq, to, promo })) : add(to))
      const one = at(f, r + dir)
      if (one >= 0 && !p.board[one]) {
        push(one)
        const two = at(f, r + 2 * dir)
        if (r === (me === 'w' ? 1 : 6) && !p.board[two]) add(two)
      }
      for (const df of [-1, 1]) {
        const to = at(f + df, r + dir)
        if (to < 0) continue
        if (sideOf(p.board[to]) === foe) push(to)
        else if (to === p.ep) add(to)
      }
    } else if (kind === 'n' || kind === 'k') {
      for (const [df, dr] of kind === 'n' ? KNIGHT : KING) {
        const to = at(f + df, r + dr)
        if (to >= 0 && sideOf(p.board[to]) !== me) add(to)
      }
      if (kind === 'k') {
        const home = me === 'w' ? 4 : 60
        const rights = me === 'w' ? p.castle.replace(/[a-z]/g, '') : p.castle.replace(/[A-Z]/g, '').toUpperCase()
        if (sq === home && !inCheck(p, me)) {
          if (rights.includes('K') && !p.board[home + 1] && !p.board[home + 2] && !attacked(p, home + 1, foe)) add(home + 2)
          if (rights.includes('Q') && !p.board[home - 1] && !p.board[home - 2] && !p.board[home - 3] && !attacked(p, home - 1, foe)) add(home - 2)
        }
      }
    } else {
      const dirs = kind === 'r' ? ROOK : kind === 'b' ? BISHOP : [...ROOK, ...BISHOP]
      for (const [df, dr] of dirs) {
        for (let k = 1; ; k++) {
          const to = at(f + df * k, r + dr * k)
          if (to < 0) break
          const s = sideOf(p.board[to])
          if (s === me) break
          add(to)
          if (s === foe) break
        }
      }
    }
  }
  return out
}

export function play(p: Position, m: Move): Position {
  const board = [...p.board]
  const piece = board[m.from]
  const kind = piece.toLowerCase()
  const captured = board[m.to]
  board[m.to] = m.promo ? (p.turn === 'w' ? m.promo.toUpperCase() : m.promo.toLowerCase()) : piece
  board[m.from] = ''
  if (kind === 'p' && m.to === p.ep) board[m.to + (p.turn === 'w' ? -8 : 8)] = ''
  if (kind === 'k' && Math.abs(m.to - m.from) === 2) {
    const kingside = m.to > m.from
    const rookFrom = kingside ? m.from + 3 : m.from - 4
    board[kingside ? m.from + 1 : m.from - 1] = board[rookFrom]
    board[rookFrom] = ''
  }
  let castle = p.castle
  const drop = (sq: number) => {
    if (sq === 4) castle = castle.replace(/[KQ]/g, '')
    if (sq === 60) castle = castle.replace(/[kq]/g, '')
    if (sq === 0) castle = castle.replace('Q', '')
    if (sq === 7) castle = castle.replace('K', '')
    if (sq === 56) castle = castle.replace('q', '')
    if (sq === 63) castle = castle.replace('k', '')
  }
  drop(m.from)
  drop(m.to)
  const ep = kind === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1
  return {
    board,
    turn: p.turn === 'w' ? 'b' : 'w',
    castle,
    ep,
    half: kind === 'p' || captured ? 0 : p.half + 1,
    full: p.full + (p.turn === 'b' ? 1 : 0),
  }
}

export function legalMoves(p: Position): Move[] {
  return pseudo(p).filter(m => !inCheck(play(p, m), p.turn))
}

// Counts the move tree to `depth`: the standard check that move generation is right.
export function perft(p: Position, depth: number): number {
  if (depth === 0) return 1
  let n = 0
  for (const m of legalMoves(p)) n += perft(play(p, m), depth - 1)
  return n
}

export type Outcome = 'checkmate' | 'stalemate' | 'fifty' | 'material' | null

export function outcome(p: Position): Outcome {
  if (legalMoves(p).length === 0) return inCheck(p) ? 'checkmate' : 'stalemate'
  if (p.half >= 100) return 'fifty'
  const left = p.board.filter(x => x && x.toLowerCase() !== 'k')
  if (left.length === 0 || (left.length === 1 && /[nbNB]/.test(left[0]))) return 'material'
  return null
}

const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

// A move in words for the chat: "knight g1 to f3", "pawn e4 takes d5", "castles kingside".
export function describe(p: Position, m: Move): string {
  const piece = p.board[m.from].toLowerCase()
  if (piece === 'k' && Math.abs(m.to - m.from) === 2) return m.to > m.from ? 'castles kingside' : 'castles queenside'
  const takes = p.board[m.to] || (piece === 'p' && m.to === p.ep)
  const promo = m.promo ? `, becomes a ${NAMES[m.promo]}` : ''
  return `${NAMES[piece]} ${squareName(m.from)} ${takes ? 'takes' : 'to'} ${squareName(m.to)}${promo}`
}

// The board as text, white at the bottom, for the model to read.
export function picture(p: Position): string {
  const lines: string[] = []
  for (let r = 7; r >= 0; r--) lines.push(`${r + 1} ${p.board.slice(r * 8, r * 8 + 8).map(x => x || '.').join(' ')}`)
  lines.push('  a b c d e f g h')
  return lines.join('\n')
}
