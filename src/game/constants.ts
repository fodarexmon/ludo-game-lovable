// Ludo board geometry & constants. 15x15 grid.
export type Color = "red" | "green" | "yellow" | "blue";
export const COLORS: Color[] = ["red", "green", "yellow", "blue"];

// CSS variable name for each color
export const COLOR_VAR: Record<Color, string> = {
  red: "var(--ludo-red)",
  green: "var(--ludo-green)",
  yellow: "var(--ludo-yellow)",
  blue: "var(--ludo-blue)",
};

// 52 main-track squares as [col, row] on a 15x15 grid.
// Index 0 is red's start square. Going clockwise.
export const TRACK: Array<[number, number]> = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7],
  [0, 6],
];

// Each color's start index on TRACK (where they enter from base).
export const START_INDEX: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Home-column squares (5 each), in order from track-entry to center.
export const HOME_COLUMN: Record<Color, Array<[number, number]>> = {
  red:    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

// Base areas (6x6 corners) — token rest positions inside the base (2x2).
export const BASE_AREA: Record<Color, { cx: number; cy: number; spots: Array<[number, number]> }> = {
  red:    { cx: 3.0, cy: 3.0, spots: [[2.0, 2.0], [4.0, 2.0], [2.0, 4.0], [4.0, 4.0]] },
  green:  { cx: 12.0, cy: 3.0, spots: [[11.0, 2.0], [13.0, 2.0], [11.0, 4.0], [13.0, 4.0]] },
  yellow: { cx: 12.0, cy: 12.0, spots: [[11.0, 11.0], [13.0, 11.0], [11.0, 13.0], [13.0, 13.0]] },
  blue:   { cx: 3.0, cy: 12.0, spots: [[2.0, 11.0], [4.0, 11.0], [2.0, 13.0], [4.0, 13.0]] },
};

// Safe squares (track indexes): each color's start + 8 squares past it (stars).
export const SAFE_SQUARES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

// distance encoding for a token's progress:
//   0      = in base
//   1..51  = on track at absolute index (START_INDEX[color] + d - 1) % 52
//   52..56 = home column squares 0..4
//   57     = finished (in center triangle)
export const FINISHED = 57;
export const HOME_ENTER = 52;
