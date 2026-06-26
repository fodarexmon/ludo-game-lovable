import type { Color } from "./constants";

export type PlayerKind = "human" | "ai" | "remote";

export interface Player {
  seat: number;          // 0..3
  color: Color;
  name: string;
  avatarId: string;
  country?: string;
  kind: PlayerKind;
  userId?: string | null; // for online
  hasResigned?: boolean;
}

export interface GameState {
  players: Player[];          // 2..4 in seat order
  // tokens[seat] = [d0, d1, d2, d3] each 0..57 per encoding in constants.ts
  tokens: Record<number, number[]>;
  turn: number;               // current seat index (into players)
  dice: number | null;        // current roll, null = needs to roll
  lastDiceRolled?: number;    // last rolled value, kept for UI display to other players
  sixCount: number;           // consecutive sixes by current player
  awaitingMove: boolean;      // dice rolled, waiting for token move
  winners: number[];          // seat indexes that finished normally, in finish order
  resigned: number[];         // seat indexes that resigned
  lastMove?: { seat: number; token: number; from: number; to: number; capture?: { seat: number; token: number }[]; timestamp?: number } | null;
  turnStartTime: number;      // timestamp when the current turn or action phase started
  stats?: { kills: Record<number, number>; deaths: Record<number, number> };
}
