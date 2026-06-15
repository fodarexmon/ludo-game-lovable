import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, updateDoc, setDoc, onSnapshot, collection, query, where, increment } from "firebase/firestore";
import { Board } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { PlayerCard } from "@/components/PlayerCard";
import { Avatar } from "@/components/Avatar";
import { COLORS, FINISHED, type Color } from "@/game/constants";
import { applyMove, createGame, recordRoll, rollDice, gameOver } from "@/game/engine";
import { chooseMove } from "@/game/ai";
import type { GameState, Player } from "@/game/types";
import { playRollSound, playMoveSound, playCaptureSound, playFinishSound, playWinSound } from "@/lib/audio";
import { useGameAnimation } from "@/hooks/useGameAnimation";

export const Route = createFileRoute("/play/online/$code")({
  head: () => ({ meta: [{ title: "Online Room — Ludo Star" }] }),
  component: RoomPage,
});

interface RoomRow { id?: string; code: string; host_id: string; status: string; state: any; players?: PlayerRow[]; matchCount?: number; scores?: Record<string, number>; reactions?: Record<string, { emoji: string, sender: string, timestamp: number }>; }
interface PlayerRow { user_id: string; seat: number; color: string; }
interface ProfileRow { id: string; display_name: string; country: string; avatar_id: string; stats?: { gamesPlayed: number, wins: number, totalPoints: number }; }

function RoomPage() {
  const { code } = Route.useParams();
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [rolling, setRolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const writeLock = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { nav({ to: "/auth" }); return; }
      setUserId(user.uid);
    });
    return () => unsubscribe();
  }, [nav]);

  useEffect(() => {
    if (!userId) return;
    
    const roomRef = doc(db, "rooms", code);
    const unsub = onSnapshot(roomRef, async (docSnap) => {
      if (!docSnap.exists()) {
        setErr("Room not found");
        return;
      }
      const r = docSnap.data() as RoomRow;
      setRoom(r);
      
      const pl = r.players || [];
      setPlayers(pl);
      
      const ids = pl.map((p) => p.user_id);
      if (ids.length) {
        const q = query(collection(db, "profiles"), where("id", "in", ids));
        const profSnap = await getDocs(q);
        const m: Record<string, ProfileRow> = {};
        profSnap.forEach((d) => {
          m[d.id] = d.data() as ProfileRow;
        });
        setProfiles(m);
      }
    });

    return () => unsub();
  }, [userId, code]);

  const game: GameState | null = room?.status === "playing" || room?.status === "finished" ? room.state as GameState : null;
  const mySeat = players.find((p) => p.user_id === userId)?.seat ?? -1;
  const isHost = room?.host_id === userId;

  async function startGame() {
    if (!room || !isHost || players.length < 2) return;
    const gamePlayers: Player[] = players.map((p, i) => ({
      seat: i,
      color: COLORS[i],
      name: profiles[p.user_id]?.display_name ?? "Player",
      avatarId: profiles[p.user_id]?.avatar_id ?? "a1",
      country: profiles[p.user_id]?.country,
      kind: "remote",
      userId: p.user_id,
    }));
    const init = createGame(gamePlayers);
    await updateDoc(doc(db, "rooms", code), { status: "playing", state: init as any, matchCount: 1, scores: {} });
  }

  async function nextMatch() {
    if (!room || !isHost || !game) return;
    const init = createGame(game.players);
    await updateDoc(doc(db, "rooms", code), { 
      status: "playing", 
      state: init as any,
      matchCount: (room.matchCount || 1) + 1
    });
  }

  async function leave() {
    if (!room || !userId) return;
    const newPlayers = players.filter(p => p.user_id !== userId);
    await updateDoc(doc(db, "rooms", code), { players: newPlayers });
    nav({ to: "/play/online" });
  }

  async function pushState(newState: GameState, status?: string, additionalRoomUpdates?: any) {
    if (!room || writeLock.current) return;
    writeLock.current = true;
    try {
      const upd: any = { state: newState as any, ...additionalRoomUpdates };
      if (status) upd.status = status;
      await updateDoc(doc(db, "rooms", code), upd);
      setRoom((r) => r ? { ...r, ...upd, state: newState, status: status ?? r.status } : r);
    } finally {
      writeLock.current = false;
    }
  }

  async function handleStateChange(next: GameState) {
    const isGameOver = gameOver(next);
    let status = undefined;
    let updates: any = undefined;
    
    if (isGameOver) {
      status = "finished";
      const board = [...next.winners];
      next.players.forEach((p, i) => { if (!board.includes(i)) board.push(i); });
      
      const newScores = { ...(room?.scores || {}) };
      const numPlayers = next.players.length;
      board.forEach((seat, index) => {
        const p = next.players[seat];
        if (p && p.userId) {
          const points = Math.max(0, numPlayers - index);
          newScores[p.userId] = (newScores[p.userId] || 0) + points;
        }
      });
      updates = { scores: newScores };
    }
    await pushState(next, status, updates);
  }

  async function doRoll() {
    if (!game || mySeat !== game.turn || rolling) return;
    setRolling(true);
    playRollSound();
    setTimeout(async () => {
      const d = rollDice();
      const next = recordRoll(game, d);
      setRolling(false);
      await handleStateChange(next);
    }, 600);
  }
  async function doMove(_seat: number, tokenIdx: number) {
    if (!game || mySeat !== game.turn) return;
    const next = applyMove(game, tokenIdx);
    await handleStateChange(next);
  }

  // Auto-play timer (Host only)
  useEffect(() => {
    if (!room || !isHost || room.status !== "playing" || !game) return;
    const isGameOver = gameOver(game);
    if (isGameOver) return;

    const checkTimer = async () => {
      if (writeLock.current) return;
      const elapsed = Date.now() - game.turnStartTime;
      if (elapsed >= 60000) {
        if (!game.dice && !game.awaitingMove) {
          const d = rollDice();
          await handleStateChange(recordRoll(game, d));
        } else if (game.awaitingMove && game.dice) {
          const t = chooseMove(game, game.dice!);
          if (t >= 0) {
            await handleStateChange(applyMove(game, t));
          } else {
            const fallback = applyMove(game, 0);
            await handleStateChange(fallback).catch(() => {});
          }
        }
      }
    };
    
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [game, room, isHost]);

  function copyCode() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (err) return <div className="min-h-screen p-6 text-center"><p className="mt-10 text-destructive">{err}</p><Link to="/play/online" className="btn-ghost mt-4 inline-flex">Back</Link></div>;
  if (!room) return <div className="min-h-screen p-6 text-center text-muted-foreground">Loading room…</div>;

  if (room.status === "lobby") {
    return (
      <div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="mx-auto max-w-2xl w-full z-10">
          <button onClick={leave} className="btn-ghost mb-6 bg-background/50 backdrop-blur-md">← Leave Room</button>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Room Lobby</h1>
            <p className="text-muted-foreground">Share this code with your friends to let them join!</p>
          </div>
          <div className="panel mb-8 text-center bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="text-sm uppercase tracking-widest text-primary mb-2 font-semibold">Your Room Code</div>
            <div className="my-4 text-6xl font-mono tracking-widest text-white drop-shadow-lg font-black">{code}</div>
            <button onClick={copyCode} className="btn-ghost !rounded-full px-6 transition-all hover:scale-105 hover:bg-white/10">
              {copied ? "✓ Copied to clipboard!" : "📋 Copy Code"}
            </button>
          </div>
          <div className="panel space-y-3 bg-card/40 backdrop-blur-md border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Players</h3>
              <span className="text-sm px-3 py-1 bg-black/40 rounded-full font-mono text-primary border border-primary/20">{players.length} / 4</span>
            </div>
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((seat) => {
                const p = players.find((x) => x.seat === seat);
                const prof = p ? profiles[p.user_id] : undefined;
                const colorHex = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"][seat];
                if (p && prof) {
                  return (
                    <div key={seat} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3 shadow-inner animate-in slide-in-from-right-4">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shadow-lg border-2 border-black/50" style={{ backgroundColor: colorHex }}>
                        <Avatar id={prof.avatar_id} size={36} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg leading-tight">{prof.display_name}</div>
                        {p.user_id === room.host_id && <span className="text-[10px] uppercase tracking-wider text-primary font-bold">👑 Host</span>}
                      </div>
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                    </div>
                  );
                } else {
                  return (
                    <div key={seat} className="flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/5 p-3 opacity-50">
                      <div className="h-10 w-10 rounded-full bg-black/20 border-2 border-dashed border-white/20" />
                      <span className="flex-1 text-muted-foreground font-medium">Waiting for player...</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          <div className="mt-8">
            {isHost ? (
              <button onClick={startGame} disabled={players.length < 2} className="btn-game w-full text-xl py-4 shadow-xl shadow-primary/20 transition-all hover:shadow-primary/40 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10">{players.length < 2 ? "Waiting for at least 1 more player..." : `Start Game (${players.length} Players)`}</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-white/10 bg-black/40 text-center animate-pulse">
                <p className="text-muted-foreground font-medium">Waiting for the host to start the game...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!game) return <div className="p-6 text-center text-muted-foreground">Loading game…</div>;

  return <OnlineMatch game={game} room={room} mySeat={mySeat} profiles={profiles} userId={userId} doRoll={doRoll} doMove={doMove} rolling={rolling} leave={leave} nextMatch={nextMatch} code={code} />;
}

function ReactionRenderer({ reaction }: { reaction?: { emoji: string, sender: string, timestamp: number } }) {
  const [visible, setVisible] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState("");

  useEffect(() => {
    if (reaction && Date.now() - reaction.timestamp < 4000) {
      setCurrentEmoji(reaction.emoji);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [reaction]);

  if (!visible) return null;
  return (
    <div className="absolute -top-4 -right-4 z-50 text-5xl pointer-events-none drop-shadow-xl" style={{ animation: 'float-up-fade 3s ease-out forwards' }}>
      {currentEmoji}
    </div>
  );
}

function OnlineMatch({ game, room, mySeat, profiles, userId, doRoll, doMove, rolling, leave, nextMatch, code }: any) {
  const { animatedGame, isAnimating } = useGameAnimation(game);
  
  const displayGame = animatedGame || game;
  const currentPlayer = game.players[game.turn];
  const isGameOver = gameOver(game);
  const finishedCount = (seat: number) => game.tokens[seat].filter((d: number) => d === FINISHED).length;
  const myTurn = mySeat === game.turn;
  const canRoll = myTurn && !game.dice && !game.awaitingMove && !isAnimating && !isGameOver && !rolling;

  const prevDice = useRef<number | null>(null);
  useEffect(() => {
    if (game.dice !== null && prevDice.current === null && !myTurn) { playRollSound(); }
    prevDice.current = game.dice;
  }, [game.dice, myTurn]);

  const [timeLeft, setTimeLeft] = useState(60);
  useEffect(() => {
    if (isGameOver) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - game.turnStartTime) / 1000);
      setTimeLeft(Math.max(0, 60 - elapsed));
    }, 500);
    return () => clearInterval(interval);
  }, [game.turnStartTime, isGameOver]);

  const originalMatchRanks = useMemo(() => {
    const board = [...game.winners];
    game.players.forEach((p: any, i: number) => { if (!board.includes(i)) board.push(i); });
    return board;
  }, [game.winners, game.players]);

  const leaderboard = useMemo(() => {
    if (!isGameOver) return [];
    if ((room.matchCount || 1) >= 5) {
      return [...originalMatchRanks].sort((a, b) => {
        const pA = game.players[a].userId!;
        const pB = game.players[b].userId!;
        return (room.scores?.[pB] || 0) - (room.scores?.[pA] || 0);
      });
    }
    return originalMatchRanks;
  }, [isGameOver, room.matchCount, room.scores, originalMatchRanks, game.players]);

  const [statsUpdated, setStatsUpdated] = useState(false);
  useEffect(() => {
    if (room?.status !== "finished" || !game || !userId) {
      setStatsUpdated(false);
      return;
    }
    const matchId = `${code}_${room?.matchCount || 1}`;
    if (statsUpdated || localStorage.getItem(`stats_${matchId}`)) return;

    const updateMyStats = async () => {
      setStatsUpdated(true);
      localStorage.setItem(`stats_${matchId}`, "1");
      
      const myPlayer = game.players.find((p: any) => p.userId === userId);
      if (!myPlayer) return;
      
      const board = [...game.winners];
      game.players.forEach((p: any, i: number) => { if (!board.includes(i)) board.push(i); });
      const myRank = board.indexOf(myPlayer.seat);
      const points = Math.max(0, game.players.length - myRank);
      const isWin = myRank === 0;

      const profileRef = doc(db, "profiles", userId);
      try {
        await updateDoc(profileRef, {
          "stats.gamesPlayed": increment(1),
          "stats.totalPoints": increment(points),
          "stats.wins": increment(isWin ? 1 : 0)
        });
      } catch {
        await setDoc(profileRef, {
          stats: { gamesPlayed: 1, totalPoints: points, wins: isWin ? 1 : 0 }
        }, { merge: true });
      }
    };
    updateMyStats();
  }, [room?.status, game, userId, statsUpdated, code, room?.matchCount]);

  const [reactionTarget, setReactionTarget] = useState<number | null>(null);

  async function sendReaction(targetSeat: number, emoji: string) {
    if (mySeat < 0) return;
    setReactionTarget(null);
    await updateDoc(doc(db, "rooms", code), {
      [`reactions.${targetSeat}`]: { emoji, sender: mySeat, timestamp: Date.now() }
    });
  }

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={leave} className="btn-ghost">← Leave</button>
          <span className="text-sm text-muted-foreground font-medium">Match {room.matchCount || 1} of 5 &nbsp;·&nbsp; Room <span className="font-mono">{code}</span></span>
          <Link to="/" className="btn-ghost">Home</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="panel">
            <Board state={displayGame} onTokenClick={myTurn && !isAnimating ? doMove : undefined} />
          </div>
          <div className="space-y-3">
            <div className="panel">
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{myTurn ? "Your turn" : `${currentPlayer.name}'s turn`}</span>
                {!isGameOver && (
                  <span className={`font-bold transition-colors ${timeLeft <= 10 ? 'text-destructive animate-pulse' : ''}`}>
                    {timeLeft <= 10 ? '⏰' : '⏱'} {timeLeft}s
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Avatar id={currentPlayer.avatarId} size={56} ring={`var(--ludo-${currentPlayer.color})`} />
                <div className="flex-1">
                  <div className="font-bold">{currentPlayer.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{currentPlayer.color}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Dice value={displayGame.dice} rolling={rolling} size={72} />
                <button onClick={doRoll} disabled={!canRoll} className="btn-game">
                  {rolling ? "..." : myTurn ? (game.awaitingMove ? "Choose token" : "Roll dice") : "Waiting…"}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {displayGame.players.map((p: any, i: number) => {
                const prof = profiles?.[p.userId];
                return (
                <div key={i} className="relative">
                  <div onClick={() => { if (p.userId !== userId) setReactionTarget(i); }} className={p.userId !== userId ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}>
                    <PlayerCard player={p} active={i === displayGame.turn && !isGameOver} finishedCount={finishedCount(i)} />
                  </div>
                  {reactionTarget === i && (
                    <div className="absolute top-full right-0 z-50 mt-2 w-64 p-4 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                        <Avatar id={p.avatarId} size={48} />
                        <div>
                          <div className="font-bold">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{prof?.country || 'Unknown'}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-xl font-bold text-primary">{prof?.stats?.totalPoints || 0}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-xl font-bold text-accent">{prof?.stats?.wins || 0}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Wins</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 col-span-2">
                          <div className="text-sm font-bold text-white">{prof?.stats?.gamesPlayed ? Math.round((prof.stats.wins / prof.stats.gamesPlayed) * 100) : 0}%</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate ({prof?.stats?.gamesPlayed || 0} matches)</div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider text-center">Send Reaction</div>
                      <div className="flex justify-center gap-2">
                        {["😂", "😡", "😢", "👋", "GG!"].map(emoji => (
                          <button key={emoji} onClick={() => sendReaction(i, emoji)} className="text-xl hover:scale-125 transition-transform bg-white/5 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setReactionTarget(null); }} className="absolute top-2 right-2 text-muted-foreground hover:text-white w-6 h-6 flex items-center justify-center rounded-full bg-white/10">✕</button>
                    </div>
                  )}
                  <ReactionRenderer reaction={room.reactions?.[i]} />
                </div>
              )})}
            </div>
          </div>
        </div>
        {isGameOver && !isAnimating && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 animate-in fade-in zoom-in backdrop-blur-sm">
            <div className="panel max-w-md w-full text-center shadow-2xl border border-white/10">
              <div className="mb-4 text-6xl drop-shadow-lg">🏆</div>
              <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {(room.matchCount || 1) >= 5 ? "Series Champion!" : `Match ${(room.matchCount || 1)} Finished!`}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {(room.matchCount || 1) >= 5 ? "Final Series Standings" : "Match Standings"}
              </p>
              <div className="space-y-3 mb-8">
                {leaderboard.map((seat: number, index: number) => {
                  const p = game.players[seat];
                  const matchRank = originalMatchRanks.indexOf(seat);
                  const matchPts = Math.max(0, game.players.length - matchRank);
                  const totalPts = room.scores?.[p.userId] || 0;
                  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600", "text-muted-foreground"];
                  const medals = ["🥇", "🥈", "🥉", ""];
                  return (
                    <div key={seat} className={`flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20 ${index === 0 ? "bg-primary/10 border-primary/30" : ""}`}>
                      <div className={`text-2xl font-black w-8 ${rankColors[index]}`}>{medals[index] || `#${index + 1}`}</div>
                      <Avatar id={p.avatarId} size={40} />
                      <div className="flex-1 text-left">
                        <div className="font-bold text-lg leading-tight">{p.name}</div>
                        <div className="text-xs text-muted-foreground">+{matchPts} pts (Total: {totalPts})</div>
                      </div>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `var(--ludo-${p.color})` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                {room.host_id === auth.currentUser?.uid && (room.matchCount || 1) < 5 ? (
                  <button onClick={nextMatch} className="btn-game flex-1 py-4">Start Next Match</button>
                ) : null}
                <button onClick={leave} className="btn-ghost flex-1 py-4">Leave Room</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
