import { BASE_AREA, COLORS, HOME_COLUMN, SAFE_SQUARES, START_INDEX, TRACK, type Color } from "@/game/constants";
import { cellFor, legalMoves } from "@/game/engine";
import type { GameState } from "@/game/types";

const SIZE = 600; // svg viewbox is 15x15, scaled here
const CELL = SIZE / 15;
const COLOR_HEX: Record<Color, string> = {
  red: "#ef4444", green: "#22c55e", yellow: "#eab308", blue: "#3b82f6",
};
const COLOR_LIGHT: Record<Color, string> = {
  red: "#fecaca", green: "#bbf7d0", yellow: "#fef08a", blue: "#bfdbfe",
};

function rect(col: number, row: number, fill: string, stroke = "#1f2937", sw = 1, key?: string) {
  return <rect key={key} x={col * CELL} y={row * CELL} width={CELL} height={CELL} fill={fill} stroke={stroke} strokeWidth={sw} />;
}

export function Board({ state, onTokenClick }: { state: GameState; onTokenClick?: (seat: number, tokenIdx: number) => void }) {
  // figure legal moves for current player to highlight
  const legal = state.dice && state.awaitingMove ? legalMoves(state, state.dice) : [];
  const isCurrent = (seat: number) => seat === state.turn;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto select-none" style={{ maxWidth: "100%" }}>
      {/* background */}
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="var(--board-bg)" rx={16} />

      {/* 4 colored bases (6x6 corners) */}
      {([
        ["red", 0, 0],
        ["green", 9, 0],
        ["yellow", 9, 9],
        ["blue", 0, 9],
      ] as const).map(([c, x, y]) => {
        const player = state.players.find(p => p.color === c);
        // y === 0 is top row (Red, Green), y === 9 is bottom row (Blue, Yellow)
        const textY = y === 0 ? (y + 0.7) * CELL : (y + 5.7) * CELL;
        return (
          <g key={c}>
            <rect x={x * CELL} y={y * CELL} width={6 * CELL} height={6 * CELL} fill={COLOR_HEX[c]} />
            <rect x={(x + 1) * CELL} y={(y + 1) * CELL} width={4 * CELL} height={4 * CELL} fill="#fff" />
            <rect x={(x + 1.4) * CELL} y={(y + 1.4) * CELL} width={3.2 * CELL} height={3.2 * CELL} fill={COLOR_LIGHT[c]} rx={6} />
            {player && (
              <text 
                x={(x + 3) * CELL} 
                y={textY} 
                textAnchor="middle" 
                fill="#fff" 
                fontSize={CELL * 0.8} 
                fontWeight="900" 
                stroke="#000" 
                strokeWidth="2" 
                paintOrder="stroke"
                className="drop-shadow-sm"
              >
                {player.name}
              </text>
            )}
          </g>
        );
      })}

      {/* 52 track squares — draw white grid in arms */}
      {Array.from({ length: 15 }).flatMap((_, row) =>
        Array.from({ length: 15 }).map((__, col) => {
          // arms are within rows/cols 6-8
          if ((row >= 6 && row <= 8) || (col >= 6 && col <= 8)) {
            // skip center 3x3
            if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return null;
            return rect(col, row, "#fff", "#1f2937", 1, `c-${col}-${row}`);
          }
          return null;
        })
      )}

      {/* color the home columns */}
      {COLORS.map((c) =>
        HOME_COLUMN[c].map(([col, row], i) =>
          <rect key={`h-${c}-${i}`} x={col * CELL} y={row * CELL} width={CELL} height={CELL} fill={COLOR_HEX[c]} stroke="#1f2937" strokeWidth={1} />
        )
      )}

      {/* color the start squares */}
      {COLORS.map((c) => {
        const [col, row] = TRACK[START_INDEX[c]];
        return <rect key={`s-${c}`} x={col * CELL} y={row * CELL} width={CELL} height={CELL} fill={COLOR_LIGHT[c]} stroke="#1f2937" strokeWidth={1} />;
      })}

      {/* arrow paths into home column (color the path squares in the arm leading to color base) */}
      {/* (Visually, color the entry square + arrow.) */}

      {/* safe stars */}
      {Array.from(SAFE_SQUARES).map((idx) => {
        const [col, row] = TRACK[idx];
        return (
          <text key={`star-${idx}`} x={col * CELL + CELL / 2} y={row * CELL + CELL * 0.7} textAnchor="middle"
            fontSize={CELL * 0.7} fill="#1f2937">★</text>
        );
      })}

      {/* center triangles (4 colors meeting) */}
      <g>
        <polygon points={`${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`} fill={COLOR_HEX.green} />
        <polygon points={`${9*CELL},${6*CELL} ${9*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`} fill={COLOR_HEX.yellow} />
        <polygon points={`${9*CELL},${9*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`} fill={COLOR_HEX.blue} />
        <polygon points={`${6*CELL},${9*CELL} ${6*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`} fill={COLOR_HEX.red} />
      </g>

      {/* Tokens */}
      {state.players.map((p, seat) =>
        state.tokens[seat].map((d, ti) => {
          // location
          let cx: number, cy: number;
          let stackIndex = 0;
          let stackCount = 1;

          if (d === 0) {
            const [sx, sy] = BASE_AREA[p.color].spots[ti];
            cx = sx * CELL; cy = sy * CELL;
          } else if (d === 57) {
            // pile in center triangle of own color
            const FINISHED_CENTER: Record<string, [number, number]> = {
              red: [6.8, 7.5],
              green: [7.5, 6.8],
              yellow: [8.2, 7.5],
              blue: [7.5, 8.2],
            };
            const [fcx, fcy] = FINISHED_CENTER[p.color];
            
            // 4 spots tightly packed inside the triangle
            const angle = (ti / 4) * Math.PI * 2 + (Math.PI / 4); // offset angle slightly for better packing
            const radius = 0.22;
            cx = (fcx + Math.cos(angle) * radius) * CELL;
            cy = (fcy + Math.sin(angle) * radius) * CELL;
          } else {
            const [col, row] = cellFor(p.color, d)!;
            cx = (col + 0.5) * CELL; cy = (row + 0.5) * CELL;

            // Calculate stack index for tokens on the same square
            stackCount = 0;
            state.players.forEach((otherP, otherSeat) => {
              state.tokens[otherSeat].forEach((otherD, otherTi) => {
                if (otherD > 0 && otherD < 57) {
                  const [otherCol, otherRow] = cellFor(otherP.color, otherD)!;
                  if (otherCol === col && otherRow === row) {
                    if (otherSeat < seat || (otherSeat === seat && otherTi < ti)) {
                      stackIndex++;
                    }
                    stackCount++;
                  }
                }
              });
            });

            if (stackCount > 1) {
              const offset = (stackIndex - (stackCount - 1) / 2) * (CELL * 0.2);
              cx += offset;
              cy += offset;
            }
          }
          // tokens in same cell -> stack slightly
          const interactive = isCurrent(seat) && legal.includes(ti);
          return (
            <g key={`t-${seat}-${ti}`}
               onClick={interactive && onTokenClick ? () => onTokenClick(seat, ti) : undefined}
               style={{ cursor: interactive ? "pointer" : "default", transition: "transform 0.3s ease" }}
               transform={`translate(${cx}, ${cy})`}>
              {interactive && (
                <circle cx={0} cy={0} r={CELL * 0.55} fill="none" stroke="#fde68a" strokeWidth={3}>
                  <animate attributeName="r" values={`${CELL * 0.45};${CELL * 0.6};${CELL * 0.45}`} dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={0} cy={3} r={CELL * 0.35} fill="#000" opacity={0.25} />
              <circle cx={0} cy={0} r={CELL * 0.36} fill={COLOR_HEX[p.color]} stroke="#fff" strokeWidth={3} />
              <circle cx={-CELL * 0.1} cy={-CELL * 0.12} r={CELL * 0.1} fill="#fff" opacity={0.7} />
            </g>
          );
        })
      )}
    </svg>
  );
}
