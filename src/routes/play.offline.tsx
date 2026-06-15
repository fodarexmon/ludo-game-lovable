import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { PlayerCard } from "@/components/PlayerCard";
import { Avatar } from "@/components/Avatar";
import { COLORS, FINISHED, type Color } from "@/game/constants";
import { applyMove, createGame, recordRoll, rollDice, gameOver } from "@/game/engine";
import { chooseMove } from "@/game/ai";
import type { GameState, Player, PlayerKind } from "@/game/types";
import { loadProfile } from "@/lib/profile";
import { AVATARS } from "@/data/avatars";
import { playRollSound } from "@/lib/audio";
import { useGameAnimation } from "@/hooks/useGameAnimation";

export const Route = createFileRoute("/play/offline")({
  head: () => ({
    meta: [
      { title: "Offline Ludo — Play Local & vs Computer" },
      { name: "description", content: "Set up a 2–4 player Ludo match on this device, with humans or computer opponents." },
    ],
  }),
  component: OfflinePage,
});

interface Seat { kind: PlayerKind | "off"; name: string; avatarId: string; }

function OfflinePage() {
  const profile = useMemo(() => loadProfile(), []);
  const [seats, setSeats] = useState<Seat[]>([
    { kind: "human", name: profile.displayName, avatarId: profile.avatarId },
    { kind: "ai", name: "Bot Red", avatarId: "a3" },
    { kind: "ai", name: "Bot Yellow", avatarId: "a5" },
    { kind: "off", name: "Bot Blue", avatarId: "a8" },
  ]);
  const [game, setGame] = useState<GameState | null>(null);

  function start() {
    const players: Player[] = seats
      .map((s, i) => s.kind !== "off" ? { seat: i, color: COLORS[i], name: s.name || `Player ${i + 1}`, avatarId: s.avatarId, kind: s.kind as PlayerKind, country: i === 0 ? profile.country : undefined } : null)
      .filter(Boolean) as Player[];
    if (players.length < 2) return;
    // renumber seats consecutively
    const renum = players.map((p, i) => ({ ...p, seat: i, color: COLORS[i] }));
    setGame(createGame(renum));
  }

  if (!game) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-xl">
          <Link to="/" className="btn-ghost mb-4 inline-flex">← Back</Link>
          <h1 className="mb-4 text-3xl font-bold">Offline match</h1>
          <p className="mb-6 text-muted-foreground">Pick 2 to 4 players. Set each as Human (pass-and-play) or Computer.</p>
          <div className="space-y-3">
            {seats.map((s, i) => (
              <div key={i} className="panel flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg" style={{ background: ["#ef4444","#22c55e","#eab308","#3b82f6"][i] }} />
                <select value={s.kind} onChange={(e) => setSeats((p) => p.map((x, j) => j === i ? { ...x, kind: e.target.value as Seat["kind"] } : x))}
                  className="rounded-lg border border-border bg-secondary px-3 py-2">
                  <option value="off">— Empty</option>
                  <option value="human">Human</option>
                  <option value="ai">Computer</option>
                </select>
                {s.kind !== "off" && <>
                  <input
                    value={s.name}
                    onChange={(e) => setSeats((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2"
                  />
                  <select value={s.avatarId} onChange={(e) => setSeats((p) => p.map((x, j) => j === i ? { ...x, avatarId: e.target.value } : x))}
                    className="rounded-lg border border-border bg-secondary px-2 py-2">
                    {AVATARS.map((a) => <option key={a.id} value={a.id}>{a.emoji}</option>)}
                  </select>
                </>}
              </div>
            ))}
          </div>
          <button className="btn-game mt-6 w-full text-lg" onClick={start}>Start game</button>
        </div>
      </div>
    );
  }

  return <Match game={game} setGame={setGame} onExit={() => setGame(null)} />;
}

function Match({ game, setGame, onExit }: { game: GameState; setGame: (g: GameState) => void; onExit: () => void }) {
  const [rolling, setRolling] = useState(false);
  const { animatedGame, isAnimating } = useGameAnimation(game);
  
  // Always use the logical game state for rules, but visually render animatedGame
  const displayGame = animatedGame || game;
  const currentPlayer = game.players[game.turn];
  const isGameOver = gameOver(game);
  const canRoll = !game.dice && !game.awaitingMove && !isGameOver && !isAnimating && !rolling;
  const finishedCount = (seat: number) => game.tokens[seat].filter((d) => d === FINISHED).length;
  const aiTimer = useRef<number | null>(null);

  function doRoll() {
    if (!canRoll || rolling) return;
    setRolling(true);
    playRollSound();
    setTimeout(() => {
      const d = rollDice();
      setRolling(false);
      const nextState = recordRoll(game, d);
      
      if (nextState.dice === null) {
        setGame({ ...game, dice: d, awaitingMove: false, sixCount: nextState.sixCount });
        setTimeout(() => setGame(nextState), 1200);
      } else {
        setGame(nextState);
      }
    }, 600);
  }
  function doTokenMove(_seat: number, tokenIdx: number) {
    if (isAnimating) return; // Prevent clicking during animation
    setGame(applyMove(game, tokenIdx));
  }

  // AI controller
  useEffect(() => {
    if (aiTimer.current) { clearTimeout(aiTimer.current); aiTimer.current = null; }
    if (isGameOver) return;
    if (currentPlayer.kind !== "ai") return;
    if (isAnimating) return; // Wait for animation to finish before AI acts

    if (!game.dice && !game.awaitingMove) {
      // Wait a bit before starting to roll
      aiTimer.current = window.setTimeout(() => {
        setRolling(true);
        playRollSound();
        
        // The rolling animation duration
        aiTimer.current = window.setTimeout(() => {
          const d = rollDice();
          setRolling(false);
          const nextState = recordRoll(game, d);
          
          if (nextState.dice === null) {
            setGame({ ...game, dice: d, awaitingMove: false, sixCount: nextState.sixCount });
            aiTimer.current = window.setTimeout(() => setGame(nextState), 1200);
          } else {
            setGame(nextState);
          }
        }, 600);
      }, 600);
    } else if (game.awaitingMove && game.dice) {
      // Wait before moving token
      aiTimer.current = window.setTimeout(() => {
        const t = chooseMove(game, game.dice!);
        if (t >= 0) setGame(applyMove(game, t));
      }, 1500); // Slower token choose
    }
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [game, currentPlayer, setGame, isAnimating, isGameOver]);

  const leaderboard = useMemo(() => {
    if (!isGameOver) return [];
    const board = [...game.winners];
    game.players.forEach((p, i) => {
      if (!board.includes(i)) board.push(i);
    });
    return board;
  }, [game, isGameOver]);

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={onExit} className="btn-ghost">← Leave</button>
          <Link to="/" className="btn-ghost">Home</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="panel">
            <Board state={displayGame} onTokenClick={currentPlayer.kind === "human" && !isAnimating ? doTokenMove : undefined} />
          </div>
          <div className="space-y-3">
            <div className="panel">
              <div className="mb-3 text-sm text-muted-foreground">Current turn</div>
              <div className="flex items-center gap-3">
                <Avatar id={currentPlayer.avatarId} size={56} ring={`var(--ludo-${currentPlayer.color})`} />
                <div className="flex-1">
                  <div className="font-bold">{currentPlayer.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{currentPlayer.color}{game.sixCount ? ` · ${"6".repeat(game.sixCount)}` : ""}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Dice value={displayGame.dice} rolling={rolling} size={72} />
                <button onClick={doRoll} disabled={!canRoll || currentPlayer.kind === "ai"} className="btn-game">
                  {rolling ? "..." : game.awaitingMove ? "Choose token" : "Roll dice"}
                </button>
              </div>
              {game.awaitingMove && currentPlayer.kind === "human" && !isAnimating && (
                <p className="mt-3 text-xs text-muted-foreground">Tap a glowing token to move.</p>
              )}
            </div>
            <div className="space-y-2">
              {displayGame.players.map((p, i) => (
                <PlayerCard key={i} player={p} active={i === displayGame.turn && !isGameOver} finishedCount={finishedCount(i)} />
              ))}
            </div>
          </div>
        </div>
        {isGameOver && !isAnimating && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 animate-in fade-in zoom-in backdrop-blur-sm">
            <div className="panel max-w-md w-full text-center shadow-2xl border border-white/10">
              <div className="mb-4 text-6xl drop-shadow-lg">🏆</div>
              <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Match Over!</h2>
              <p className="mb-6 text-muted-foreground">Final Standings</p>
              
              <div className="space-y-3 mb-8">
                {leaderboard.map((seat, index) => {
                  const p = game.players[seat];
                  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600", "text-muted-foreground"];
                  const medals = ["🥇", "🥈", "🥉", ""];
                  return (
                    <div key={seat} className={`flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20 ${index === 0 ? "bg-primary/10 border-primary/30" : ""}`}>
                      <div className={`text-2xl font-black w-8 ${rankColors[index]}`}>{medals[index] || `#${index + 1}`}</div>
                      <Avatar id={p.avatarId} size={40} />
                      <div className="flex-1 text-left font-bold text-lg">{p.name}</div>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `var(--ludo-${p.color})` }} />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={onExit} className="btn-ghost flex-1 py-4">New setup</button>
                <Link to="/" className="btn-game flex-1 py-4">Home</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
