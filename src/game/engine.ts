import { FINISHED, HOME_COLUMN, HOME_ENTER, SAFE_SQUARES, START_INDEX, TRACK, type Color } from "./constants";
import type { GameState, Player } from "./types";

export function createGame(players: Player[]): GameState {
  const tokens: Record<number, number[]> = {};
  players.forEach((_, i) => tokens[i] = [0, 0, 0, 0]);
  return {
    players,
    tokens,
    turn: 0,
    dice: null,
    sixCount: 0,
    awaitingMove: false,
    winners: [],
    lastMove: null,
    turnStartTime: Date.now(),
  };
}

export function rollDice(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** Absolute board square (track index 0..51) for a token at distance d, or null if not on track. */
export function trackIndexFor(color: Color, d: number): number | null {
  if (d < 1 || d > 51) return null;
  return (START_INDEX[color] + d - 1) % 52;
}

/** Pixel cell [col,row] for a token. */
export function cellFor(color: Color, d: number): [number, number] | null {
  if (d === 0 || d === FINISHED) return null;
  if (d >= HOME_ENTER) {
    const i = d - HOME_ENTER; // 0..4
    return HOME_COLUMN[color][i];
  }
  const idx = trackIndexFor(color, d)!;
  return TRACK[idx];
}

/** Get legal token indexes the current player can move with the rolled dice. */
export function legalMoves(state: GameState, dice: number): number[] {
  const player = state.players[state.turn];
  const myTokens = state.tokens[state.turn];
  const out: number[] = [];
  for (let t = 0; t < 4; t++) {
    const d = myTokens[t];
    if (d === FINISHED) continue;
    if (d === 0) {
      if (dice === 6) out.push(t);
      continue;
    }
    if (d + dice <= FINISHED) out.push(t);
  }
  return out;
}

/** Apply a move. Returns new state (mutated copy). */
export function applyMove(state: GameState, tokenIdx: number): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const seat = s.turn;
  const player = s.players[seat];
  const dice = s.dice ?? 0;
  const d = s.tokens[seat][tokenIdx];
  let to = d;
  if (d === 0 && dice === 6) to = 1;
  else to = d + dice;
  const from = d;
  s.tokens[seat][tokenIdx] = to;

  // capture?
  const captures: { seat: number; token: number }[] = [];
  const absIdx = trackIndexFor(player.color, to);
  if (absIdx !== null && !SAFE_SQUARES.has(absIdx)) {
    for (let other = 0; other < s.players.length; other++) {
      if (other === seat) continue;
      const oc = s.players[other].color;
      for (let ot = 0; ot < 4; ot++) {
        const od = s.tokens[other][ot];
        const oAbs = trackIndexFor(oc, od);
        if (oAbs === absIdx) {
          s.tokens[other][ot] = 0;
          captures.push({ seat: other, token: ot });
        }
      }
    }
  }

  s.lastMove = { seat, token: tokenIdx, from, to, capture: captures.length ? captures : undefined };

  // check finish
  if (s.tokens[seat].every((x) => x === FINISHED)) {
    if (!s.winners.includes(seat)) s.winners.push(seat);
  }

  // turn logic
  const extraTurn = dice === 6 || captures.length > 0 || to === FINISHED;
  s.dice = null;
  s.awaitingMove = false;
  if (extraTurn && !s.players.every((_, i) => s.tokens[i].every((x) => x === FINISHED))) {
    if (dice === 6) {
      // keep turn; sixCount already incremented on roll
    } else {
      s.sixCount = 0;
    }
  } else {
    s.sixCount = 0;
    s.turn = nextActiveSeat(s, seat);
  }
  s.turnStartTime = Date.now();
  return s;
}

export function recordRoll(state: GameState, dice: number): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.dice = dice;
  if (dice === 6) {
    s.sixCount += 1;
    if (s.sixCount === 3) {
      // forfeit turn
      s.sixCount = 0;
      s.dice = null;
      s.awaitingMove = false;
      s.turn = nextActiveSeat(s, s.turn);
      s.turnStartTime = Date.now();
      return s;
    }
  }
  const moves = legalMoves(s, dice);
  if (moves.length === 0) {
    // no legal moves; pass unless rolled 6 (gives another turn)
    s.dice = null;
    s.awaitingMove = false;
    if (dice !== 6) {
      s.sixCount = 0;
      s.turn = nextActiveSeat(s, s.turn);
    }
  } else {
    s.awaitingMove = true;
  }
  s.turnStartTime = Date.now();
  return s;
}

export function nextActiveSeat(s: GameState, from: number): number {
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (from + i) % n;
    if (!s.tokens[seat].every((x) => x === FINISHED)) return seat;
  }
  return from;
}

export function gameOver(s: GameState): boolean {
  const active = s.players.filter((_, i) => !s.tokens[i].every((x) => x === FINISHED));
  return active.length <= 1;
}
