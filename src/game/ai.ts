import { FINISHED, HOME_ENTER, SAFE_SQUARES, START_INDEX } from "./constants";
import { legalMoves, trackIndexFor } from "./engine";
import type { GameState } from "./types";

// Pick best token to move. Priorities: capture > finish > leave base > advance furthest.
export function chooseMove(state: GameState, dice: number): number {
  const moves = legalMoves(state, dice);
  if (moves.length === 0) return -1;
  const seat = state.turn;
  const me = state.players[seat];
  const tokens = state.tokens[seat];

  let bestMoves: number[] = [];
  let bestScore = -Infinity;

  for (const t of moves) {
    const d = tokens[t];
    const to = d === 0 ? 1 : d + dice;
    let score = 0;
    // capture?
    const absTo = trackIndexFor(me.color, to);
    if (absTo !== null && !SAFE_SQUARES.has(absTo)) {
      for (let other = 0; other < state.players.length; other++) {
        if (other === seat) continue;
        const oc = state.players[other].color;
        for (let ot = 0; ot < 4; ot++) {
          const od = state.tokens[other][ot];
          if (trackIndexFor(oc, od) === absTo) score += 1000;
        }
      }
    }
    // finish
    if (to === FINISHED) score += 500;
    // leave base
    if (d === 0) score += 300;
    // reach home column
    if (to >= HOME_ENTER) score += 100;
    // land on safe
    if (absTo !== null && SAFE_SQUARES.has(absTo)) score += 30;
    // advance
    score += to;
    // avoid being captured (penalty if landing on track and another opp could reach)
    if (absTo !== null && !SAFE_SQUARES.has(absTo)) {
      for (let other = 0; other < state.players.length; other++) {
        if (other === seat) continue;
        const oc = state.players[other].color;
        for (let ot = 0; ot < 4; ot++) {
          const od = state.tokens[other][ot];
          if (od === 0 || od >= HOME_ENTER) continue;
          const oAbs = trackIndexFor(oc, od)!;
          // distance forward to absTo
          const diff = (absTo - oAbs + 52) % 52;
          if (diff >= 1 && diff <= 6) score -= 80;
        }
      }
    }
    if (score > bestScore) { 
      bestScore = score; 
      bestMoves = [t]; 
    } else if (score === bestScore) {
      bestMoves.push(t);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
