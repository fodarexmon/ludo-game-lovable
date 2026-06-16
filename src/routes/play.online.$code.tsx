import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, updateDoc, setDoc, onSnapshot, collection, query, where, increment } from "firebase/firestore";
import { toast } from "sonner";
import { Board } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { PlayerCard } from "@/components/PlayerCard";
import { Avatar } from "@/components/Avatar";
import { COLORS, FINISHED, type Color } from "@/game/constants";
import { applyMove, createGame, recordRoll, rollDice, gameOver, legalMoves, resignPlayer } from "@/game/engine";
import { chooseMove } from "@/game/ai";
import type { GameState, Player } from "@/game/types";
import { playRollSound, playMoveSound, playCaptureSound, playFinishSound, playWinSound } from "@/lib/audio";
import { useGameAnimation } from "@/hooks/useGameAnimation";
import { Podium } from "@/components/Podium";

export const Route = createFileRoute("/play/online/$code")({
  head: () => ({ meta: [{ title: "Online Room — Ludo Star" }] }),
  component: RoomPage,
});

interface ChatMessage { id: string; type: "emoji" | "text"; content: string; senderId: string; receiverId?: string; timestamp: number; }
interface RoomRow { id?: string; code: string; host_id: string; status: string; state: any; players?: PlayerRow[]; matchCount?: number; scores?: Record<string, number>; coinsEarned?: Record<string, number>; reactions?: Record<string, { emoji: string, sender: string, timestamp: number }>; chats?: Record<string, ChatMessage>; pings?: Record<string, number>; lastActive?: Record<string, number>; isQuickMatch?: boolean; playerCount?: number; readyPlayers?: string[]; }
interface PlayerRow { user_id: string; seat: number; color: string; }
interface ProfileRow { id: string; display_name: string; country: string; avatar_id: string; stats?: { gamesPlayed: number, wins: number, totalPoints: number, coins?: number }; isOnline?: boolean; lastActive?: number; friendCode?: string; }

function RoomPage() {
  const { code } = Route.useParams();
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [myFriends, setMyFriends] = useState<Set<string>>(new Set());
  const [rolling, setRolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const writeLock = useRef(false);

  useEffect(() => {
    let unsubFriends: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { nav({ to: "/auth" }); return; }
      setUserId(user.uid);
      
      unsubFriends = onSnapshot(collection(db, `profiles/${user.uid}/friends`), snap => {
        setMyFriends(new Set(snap.docs.map(d => d.id)));
      });
    });
    return () => {
      unsubscribe();
      if (unsubFriends) unsubFriends();
    };
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

  useEffect(() => {
    // Auto-start quick match if all players are ready
    if (room?.status === "quick_match_lobby") {
      const readyCount = room.readyPlayers?.length || 0;
      if (readyCount === players.length && players.length >= 2) {
        startGame();
      }
    }
  }, [room?.status, room?.readyPlayers?.length, players.length]);

  const game: GameState | null = room?.status === "playing" || room?.status === "finished" ? room.state as GameState : null;
  const mySeat = players.find((p) => p.user_id === userId)?.seat ?? -1;
  const isHost = room?.host_id === userId;

  async function startGame() {
    if (!room || (!isHost && !room.isQuickMatch) || players.length < 2) return;
    const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
    const gamePlayers: Player[] = sortedPlayers.map((p) => ({
      seat: p.seat,
      color: COLORS[p.seat],
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
    const updates: any = { players: newPlayers };
    if (room.isQuickMatch) {
      updates.playerCount = newPlayers.length;
      if (room.readyPlayers?.includes(userId)) {
        updates.readyPlayers = room.readyPlayers.filter(id => id !== userId);
      }
    }
    await updateDoc(doc(db, "rooms", code), updates);
    nav({ to: "/play/online" });
  }

  async function toggleReady() {
    if (!room || !userId) return;
    const currentReady = room.readyPlayers || [];
    const newReady = currentReady.includes(userId) 
      ? currentReady.filter(id => id !== userId) 
      : [...currentReady, userId];
    await updateDoc(doc(db, "rooms", code), { readyPlayers: newReady });
  }

  async function onResign() {
    if (!room || !userId || !game || mySeat < 0 || gameOver(game)) return;
    const pdRef = doc(db, "profiles", userId);
    const pDoc = await getDoc(pdRef);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let newBan = { until: Date.now() + 15 * 60 * 1000, count: 1, lastBanDay: today };
    if (pDoc.exists()) {
      const oldBans = pDoc.data().bans;
      if (oldBans && oldBans.lastBanDay === today) {
        const newCount = oldBans.count + 1;
        if (newCount >= 3) {
          const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
          newBan = { until: eod, count: newCount, lastBanDay: today };
        } else {
          newBan.count = newCount;
        }
      }
    }
    await updateDoc(pdRef, { bans: newBan });
    await updateDoc(doc(db, "rooms", code), {
      [`reactions.${mySeat}`]: { emoji: "🏳️", sender: mySeat, timestamp: Date.now() }
    });
    const next = resignPlayer(game, mySeat);
    await handleStateChange(next);
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
      next.players.forEach((p, i) => { if (!board.includes(i) && !p.hasResigned) board.push(i); });
      const reversedResigned = [...(next.resigned || [])].reverse();
      reversedResigned.forEach((i) => { if (!board.includes(i)) board.push(i); });
      
      const newScores = { ...(room?.scores || {}) };
      const newCoinsEarned: Record<string, number> = {};
      const numPlayers = next.players.length;
      
      const getPoints = (num: number, rank: number) => {
        if (num === 2) return rank === 0 ? 2 : 0;
        if (num === 3) return rank === 0 ? 3 : (rank === 1 ? 1 : 0);
        if (num === 4) return rank === 0 ? 5 : (rank === 1 ? 3 : (rank === 2 ? 1 : 0));
        return 0;
      };

      const getCoins = (num: number, rank: number) => {
        if (num === 2) return rank === 0 ? 100 : (rank === 1 ? 20 : 0);
        if (num === 3) return rank === 0 ? 100 : (rank === 1 ? 50 : (rank === 2 ? 20 : 0));
        if (num === 4) return rank === 0 ? 100 : (rank === 1 ? 50 : (rank === 2 ? 30 : (rank === 3 ? 10 : 0)));
        return 0;
      };

      for (const [index, seat] of board.entries()) {
        const p = next.players[seat];
        if (p && p.userId) {
          const points = getPoints(numPlayers, index);
          newScores[p.userId] = (newScores[p.userId] || 0) + points;
          
          const earnedCoins = getCoins(numPlayers, index);
          newCoinsEarned[p.userId] = earnedCoins;

          // Update user's total coins in their profile
          try {
            await updateDoc(doc(db, "profiles", p.userId), {
              "stats.coins": increment(earnedCoins)
            });
          } catch (e) {
            console.error("Failed to update coins for", p.userId, e);
          }
        }
      }
      updates = { scores: newScores, coinsEarned: newCoinsEarned };
    }
    await pushState(next, status, updates);
  }

  async function doRoll() {
    if (!game || mySeat !== game.turn || rolling) return;
    setRolling(true);
    playRollSound();

    setTimeout(async () => {
      const d = rollDice();
      setRolling(false);
      const next = recordRoll(game, d);
      
      if (next.dice === null) {
        const intermediate = { ...game, dice: d, awaitingMove: false, sixCount: next.sixCount };
        await handleStateChange(intermediate);
        setTimeout(async () => {
          await handleStateChange(next);
        }, 1200);
      } else {
        const moves = legalMoves(next, d);
        let autoMoveIdx = -1;
        if (moves.length === 1) {
          autoMoveIdx = moves[0];
        } else if (moves.length > 1) {
          const positions = moves.map(t => next.tokens[next.turn][t]);
          if (positions.every(p => p === positions[0])) autoMoveIdx = moves[0];
        }

        if (autoMoveIdx >= 0) {
          const intermediate = { ...next, awaitingMove: false };
          await handleStateChange(intermediate);
          setTimeout(async () => {
            const finalState = applyMove(next, autoMoveIdx);
            await handleStateChange(finalState);
          }, 600);
        } else {
          await handleStateChange(next);
        }
      }
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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (error) {
        console.error("Copy failed", error);
      } finally {
        textArea.remove();
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (err) return <div className="min-h-screen p-6 text-center"><p className="mt-10 text-destructive">{err}</p><Link to="/play/online" className="btn-ghost mt-4 inline-flex">Back</Link></div>;
  if (!room) return <div className="min-h-screen p-6 text-center text-muted-foreground">Loading room…</div>;

  if (room.status === "lobby" || room.status === "quick_match_lobby") {
    return (
      <div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="mx-auto max-w-2xl w-full z-10">
          <button onClick={leave} className="btn-ghost mb-6 bg-background/50 backdrop-blur-md">← Leave Room</button>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
              {room.isQuickMatch ? "اللعب السريع ⚡" : "Room Lobby"}
            </h1>
            <p className="text-muted-foreground">
              {room.isQuickMatch ? "بانتظار لاعبين آخرين..." : "Share this code with your friends to let them join!"}
            </p>
          </div>

          {!room.isQuickMatch && (
            <div className="panel mb-8 text-center bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="text-sm uppercase tracking-widest text-primary mb-2 font-semibold">Your Room Code</div>
              <div className="my-4 text-6xl font-mono tracking-widest text-white drop-shadow-lg font-black">{code}</div>
              <button onClick={copyCode} className="btn-ghost !rounded-full px-6 transition-all hover:scale-105 hover:bg-white/10">
                {copied ? "✓ Copied to clipboard!" : "📋 Copy Code"}
              </button>
            </div>
          )}

          {!room.isQuickMatch && isHost && myFriends.size > 0 && (
            <div className="panel space-y-3 bg-card/40 backdrop-blur-md border border-white/5 mb-8">
              <h3 className="font-semibold text-lg flex items-center justify-between">
                <span>دعوة أصدقاء</span>
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from(myFriends).map(fid => {
                  const prof = profiles[fid];
                  if (!prof) return null;
                  // Online if lastActive < 2 min ago
                  const isOnline = prof.isOnline && prof.lastActive && (Date.now() - prof.lastActive < 120000);
                  if (!isOnline) return null;
                  return (
                    <button 
                      key={fid}
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, `profiles/${fid}/invites`, code), {
                            id: code,
                            roomCode: code,
                            fromId: userId,
                            fromName: profiles[userId || '']?.display_name || "Player",
                            timestamp: Date.now()
                          });
                          toast.success(`تم إرسال الدعوة إلى ${prof.display_name}`);
                        } catch(e) {
                          toast.error("حدث خطأ أثناء الإرسال");
                        }
                      }}
                      className="flex-shrink-0 flex items-center gap-2 bg-black/40 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors"
                    >
                      <Avatar id={prof.avatar_id} size={24} />
                      <span className="text-sm font-medium whitespace-nowrap">{prof.display_name}</span>
                      <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">دعوة</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  const isReady = room.readyPlayers?.includes(p.user_id);
                  return (
                    <div key={seat} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3 shadow-inner animate-in slide-in-from-right-4">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shadow-lg border-2 border-black/50" style={{ backgroundColor: colorHex }}>
                        <Avatar id={prof.avatar_id} size={36} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg leading-tight">{prof.display_name}</div>
                        {!room.isQuickMatch && p.user_id === room.host_id && <span className="text-[10px] uppercase tracking-wider text-primary font-bold">👑 Host</span>}
                        {room.isQuickMatch && (
                          <span className={`text-xs font-bold ${isReady ? 'text-green-400' : 'text-yellow-500'}`}>
                            {isReady ? "✅ جاهز" : "⏳ غير جاهز"}
                          </span>
                        )}
                      </div>
                      {!room.isQuickMatch && (
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                      )}
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
            {room.isQuickMatch ? (
              <button 
                onClick={toggleReady} 
                className={`w-full text-xl py-4 shadow-xl transition-all font-bold rounded-xl border ${
                  room.readyPlayers?.includes(userId || '') 
                    ? 'bg-destructive/80 hover:bg-destructive border-destructive text-white shadow-destructive/20' 
                    : 'btn-game shadow-green-500/20 hover:shadow-green-500/40'
                }`}
              >
                {room.readyPlayers?.includes(userId || '') ? "إلغاء الجاهزية ❌" : "جاهز للعب ✅"}
              </button>
            ) : isHost ? (
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

  return <OnlineMatch game={game} room={room} mySeat={mySeat} profiles={profiles} userId={userId} doRoll={doRoll} doMove={doMove} rolling={rolling} leave={leave} onResign={onResign} isHost={isHost} nextMatch={nextMatch} code={code} myFriends={myFriends} />;
}

function ChatAnimator({ chats, players, profiles }: { chats: Record<string, ChatMessage> | undefined, players: any[], profiles: any }) {
  const [activeChats, setActiveChats] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!chats) return;
    const now = Date.now();
    const recent = Object.values(chats).filter(c => now - c.timestamp < 5000);
    setActiveChats(recent);
    
    const timeout = setTimeout(() => {
      setActiveChats(prev => prev.filter(c => Date.now() - c.timestamp < 5000));
    }, 5000);
    return () => clearTimeout(timeout);
  }, [chats]);

  return (
    <>
      {activeChats.map(chat => (
        <AnimatedMessage key={chat.id} chat={chat} players={players} />
      ))}
    </>
  );
}

function AnimatedMessage({ chat, players }: { chat: ChatMessage, players: any[] }) {
  const [pos, setPos] = useState<{ x: number, y: number, scale: number, opacity: number } | null>(null);
  const [stage, setStage] = useState<"start" | "moving" | "done">("start");

  useEffect(() => {
    const senderColor = players.find(p => p.user_id === chat.senderId)?.color;
    const receiverColor = chat.receiverId ? players.find(p => p.user_id === chat.receiverId)?.color : undefined;
    
    const senderEl = document.getElementById(senderColor ? `base-${senderColor}` : "board-center");
    const receiverEl = receiverColor ? document.getElementById(`base-${receiverColor}`) : document.getElementById("board-center");

    if (!senderEl || !receiverEl) return;

    const getCenter = (el: HTMLElement | SVGElement) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const startPos = getCenter(senderEl);
    const endPos = getCenter(receiverEl);

    // Initial state
    setPos({ x: startPos.x, y: startPos.y, scale: 0.5, opacity: 0 });

    // Animate to start (pop up)
    const t1 = setTimeout(() => {
      setPos({ x: startPos.x, y: startPos.y, scale: 1.5, opacity: 1 });
      setStage("moving");
    }, 50);

    // Move to end
    const t2 = setTimeout(() => {
      setPos({ x: endPos.x, y: endPos.y, scale: 1.2, opacity: 1 });
    }, 800);

    // Fade out
    const t3 = setTimeout(() => {
      setPos(prev => prev ? { ...prev, opacity: 0, scale: 0.8 } : null);
      setStage("done");
    }, 3000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [chat, players]);

  if (!pos || stage === "done") return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0, top: 0,
        transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale}) translate(-50%, -50%)`,
        opacity: pos.opacity,
        transition: stage === 'start' ? 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      className="drop-shadow-2xl"
    >
      {chat.type === "emoji" ? (
        <span className="text-6xl">{chat.content}</span>
      ) : (
        <div className="bg-white text-black px-4 py-2 rounded-2xl rounded-tl-none font-bold text-xl border-4 border-primary shadow-xl whitespace-nowrap">
          {chat.content}
        </div>
      )}
    </div>
  );
}

function ChatMenu({ room, userId, players, profiles, code }: { room: RoomRow, userId: string, players: any[], profiles: any, code: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"phrases" | "emojis">("phrases");
  const [selectedContent, setSelectedContent] = useState<{ type: "text"|"emoji", content: string } | null>(null);

  const PHRASES = [
    "أسرع من فضلك! ⏱️", "لعبة جيدة! 🤝", "يا إلهي! 😱", "حظاً موفقاً! 🍀", "واو! 🤯", "هل تمزح معي؟! 😠",
    "خصم ضعيف", "لعبة سيئة", "أنا ملك اللعبة", "أنا الأقوى", "سأسحقكم", "هذا دوري", "سأنسحب"
  ];
  const EMOJIS = ["😂", "😡", "😭", "🥳", "🤔", "😎", "💔", "🔥", "🧿", "♥", "🔨", "🔪", "☕", "🌶"];

  const opponents = players.filter(p => p.user_id !== userId);

  async function sendChat(receiverId?: string) {
    if (!selectedContent || !userId) return;

    const myProfile = profiles[userId];
    const myCoins = myProfile?.stats?.coins || 0;
    if (myCoins < 50) {
      toast.error("ليس لديك عدد كافٍ من الكوينز (تحتاج 50 🪙)");
      return;
    }

    const chatId = Math.random().toString(36).substring(7);
    const chat: ChatMessage = {
      id: chatId,
      type: selectedContent.type,
      content: selectedContent.content,
      senderId: userId,
      receiverId,
      timestamp: Date.now()
    };
    
    const { doc, updateDoc, increment } = await import("firebase/firestore");
    
    // Deduct coins
    try {
      await updateDoc(doc(db, "profiles", userId), {
        "stats.coins": increment(-50)
      });
    } catch (e) {
      console.error("Failed to deduct coins", e);
      toast.error("حدث خطأ أثناء إرسال الرسالة");
      return;
    }

    // Send chat
    await updateDoc(doc(db, "rooms", code), {
      [`chats.${userId}`]: chat
    });
    
    setIsOpen(false);
    setSelectedContent(null);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] flex items-center justify-center text-3xl hover:scale-110 transition-transform z-40"
      >
        💬
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-card/90 border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">الدردشة السريعة</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">✕</button>
            </div>

            {!selectedContent ? (
              <>
                <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-xl">
                  <button className={`flex-1 py-2 rounded-lg font-bold ${tab === 'phrases' ? 'bg-primary text-white' : 'text-muted-foreground'}`} onClick={() => setTab("phrases")}>جمل جاهزة</button>
                  <button className={`flex-1 py-2 rounded-lg font-bold ${tab === 'emojis' ? 'bg-primary text-white' : 'text-muted-foreground'}`} onClick={() => setTab("emojis")}>ملصقات</button>
                </div>

                {tab === "phrases" ? (
                  <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                    {PHRASES.map(p => (
                      <button key={p} onClick={() => setSelectedContent({ type: "text", content: p })} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-right font-medium transition-colors">
                        {p}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => setSelectedContent({ type: "emoji", content: e })} className="text-4xl p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-transform hover:scale-110">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4">
                <button onClick={() => setSelectedContent(null)} className="text-sm text-primary mb-4 flex items-center gap-1">← العودة</button>
                <div className="text-center mb-6">
                  <p className="text-muted-foreground mb-2">إرسال إلى:</p>
                  <div className="text-3xl font-bold bg-black/40 py-4 rounded-xl border border-white/5">
                    {selectedContent.content}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <button onClick={() => sendChat()} className="p-4 bg-gradient-to-r from-primary to-accent rounded-xl font-bold text-lg hover:brightness-110 transition-all text-white shadow-lg">
                    الجميع 🌐
                  </button>
                  {opponents.map(p => (
                    <button key={p.user_id} onClick={() => sendChat(p.user_id)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-medium flex items-center justify-between">
                      <span style={{ color: p.color }}>{profiles[p.user_id]?.display_name || "Player"}</span>
                      <span>رسالة خاصة 🎯</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function OnlineMatch({ game, room, mySeat, profiles, userId, doRoll, doMove, rolling, leave, onResign, isHost, nextMatch, code, myFriends }: any) {
  const { animatedGame, isAnimating, killVfx } = useGameAnimation(game);
  
  const displayGame = animatedGame || game;
  const currentPlayer = game.players[game.turn];
  const isGameOver = gameOver(game);
  const finishedCount = (seat: number) => game.tokens[seat].filter((d: number) => d === FINISHED).length;
  const myTurn = mySeat === game.turn;
  const canRoll = myTurn && !game.dice && !game.awaitingMove && !isAnimating && !isGameOver && !rolling;
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  useEffect(() => {
    if (!room || !userId || isGameOver) return;
    const measurePing = async () => {
      let currentPing = 50;
      if ('connection' in navigator && (navigator as any).connection?.rtt) {
        currentPing = (navigator as any).connection.rtt;
      } else {
        const start = Date.now();
        try {
          await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
          currentPing = Date.now() - start;
        } catch {
          currentPing = 500;
        }
      }
      await updateDoc(doc(db, "rooms", code), {
        [`pings.${userId}`]: currentPing,
        [`lastActive.${userId}`]: Date.now()
      });
    };
    
    measurePing();
    const interval = setInterval(measurePing, 10000);
    return () => clearInterval(interval);
  }, [userId, code, isGameOver]);

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
    game.players.forEach((p: any, i: number) => { if (!board.includes(i) && !p.hasResigned) board.push(i); });
    const reversedResigned = [...(game.resigned || [])].reverse();
    reversedResigned.forEach((i) => { if (!board.includes(i)) board.push(i); });
    return board;
  }, [game.winners, game.players, game.resigned]);

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
      game.players.forEach((p: any, i: number) => { if (!board.includes(i) && !p.hasResigned) board.push(i); });
      const reversedResigned = [...(game.resigned || [])].reverse();
      reversedResigned.forEach((i) => { if (!board.includes(i)) board.push(i); });
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
    <div className={`min-h-screen p-3 md:p-6 relative overflow-hidden ${killVfx?.active ? 'animate-shake' : ''}`}>
      <ChatAnimator chats={room.chats} players={room.players || []} profiles={profiles} />
      <ChatMenu room={room} userId={userId} players={room.players || []} profiles={profiles} code={code} />
      {isGameOver && <Podium game={game} onHome={leave} room={room} />}
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={leave} className="btn-ghost">← Leave</button>
          <span className="text-sm text-muted-foreground font-medium">Match {room.matchCount || 1} of 5 &nbsp;·&nbsp; Room <span className="font-mono">{code}</span></span>
          <Link to="/" className="btn-ghost">Home</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="panel">
            <Board state={displayGame} onTokenClick={myTurn && !isAnimating ? doMove : undefined} killVfx={killVfx} />
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
                if (p.hasResigned) return null;
                const prof = profiles?.[p.userId];
                const ping = room.pings?.[p.userId];
                const lastActive = room.lastActive?.[p.userId];
                const isStale = lastActive ? (Date.now() - lastActive > 25000) : false;
                return (
                <div key={i} className="relative">
                  <div onClick={() => { if (p.userId !== userId) setReactionTarget(i); }} className={p.userId !== userId ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}>
                    <PlayerCard player={p} active={i === displayGame.turn && !isGameOver} finishedCount={finishedCount(i)} ping={ping} isStale={isStale} />
                  </div>
                  {p.userId === userId && !isHost && !isGameOver && (
                    <button 
                      onClick={() => setShowResignConfirm(true)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-destructive/10 text-destructive text-xs font-bold rounded hover:bg-destructive/20 border border-destructive/30"
                      title="انسحاب"
                    >
                      🏳️ انسحاب
                    </button>
                  )}
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
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          +{matchPts} pts (Total: {totalPts})
                          {room.coinsEarned?.[p.userId] ? (
                            <span className="ml-1 text-yellow-400 font-bold flex items-center gap-1">
                              • +{room.coinsEarned[p.userId]} <img src="/coin.png" alt="coins" className="w-3 h-3 inline" />
                            </span>
                          ) : null}
                        </div>
                      </div>
                      
                      {userId !== p.userId && !myFriends.has(p.userId || '') && (
                        <button 
                          onClick={async () => {
                            if (!userId || !p.userId) return;
                            try {
                              await setDoc(doc(db, `profiles/${userId}/friends`, p.userId), { id: p.userId, addedAt: Date.now() });
                              await setDoc(doc(db, `profiles/${p.userId}/friends`, userId), { id: userId, addedAt: Date.now() });
                              toast.success(`تمت إضافة ${p.name} إلى أصدقائك!`);
                            } catch(e) {
                              toast.error("حدث خطأ أثناء إضافة الصديق.");
                            }
                          }}
                          className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold transition-colors whitespace-nowrap mr-2"
                        >
                          ➕ إضافة صديق
                        </button>
                      )}

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

        {showResignConfirm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 animate-in fade-in backdrop-blur-sm">
            <div className="panel max-w-sm w-full text-center shadow-2xl border border-destructive/50 bg-black/95">
              <div className="mb-4 text-5xl">⚠️</div>
              <h2 className="text-xl font-bold mb-2">هل أنت متأكد من الانسحاب؟</h2>
              <p className="mb-6 text-sm text-destructive font-bold bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                ملاحظة: سيتم حظرك من اللعب أونلاين لمدة 15 دقيقة كعقوبة.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowResignConfirm(false)} className="btn-ghost flex-1 py-3 text-sm">إلغاء</button>
                <button onClick={() => {
                  setShowResignConfirm(false);
                  onResign();
                }} className="btn-game bg-destructive/80 hover:bg-destructive flex-1 py-3 text-sm">نعم، انسحب</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
