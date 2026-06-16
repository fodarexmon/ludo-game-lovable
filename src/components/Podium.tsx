import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { GameState } from "@/game/types";
import { Avatar } from "@/components/Avatar";
import { COLOR_VAR } from "@/game/constants";
import { Button } from "@/components/ui/button";

export function Podium({ game, onHome, room }: { game: GameState; onHome: () => void; room?: any }) {
  const numPlayers = game.players.length;
  
  // Calculate final ranks
  const board = [...game.winners];
  game.players.forEach((p, i) => { if (!board.includes(i) && !p.hasResigned) board.push(i); });
  game.players.forEach((p, i) => { if (!board.includes(i)) board.push(i); });

  const getPoints = (num: number, rank: number) => {
    if (num === 2) return rank === 0 ? 2 : 0;
    if (num === 3) return rank === 0 ? 3 : (rank === 1 ? 1 : 0);
    if (num === 4) return rank === 0 ? 5 : (rank === 1 ? 3 : (rank === 2 ? 1 : 0));
    return 0;
  };

  useEffect(() => {
    // Fire confetti from both sides
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#ef4444", "#22c55e", "#eab308", "#3b82f6"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#ef4444", "#22c55e", "#eab308", "#3b82f6"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const first = board[0];
  const second = numPlayers > 1 ? board[1] : undefined;
  const third = numPlayers > 2 ? board[2] : undefined;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-700">
      <h2 className="text-4xl md:text-5xl font-black text-white mb-12 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-10 duration-700 delay-150">
        GAME OVER
      </h2>

      <div className="flex items-end gap-2 md:gap-6 h-64 mt-8">
        {/* Second Place */}
        {second !== undefined && (
          <div className="flex flex-col items-center animate-in slide-in-from-bottom-24 duration-700 delay-500">
            <div className="flex flex-col items-center mb-4">
              <Avatar id={game.players[second].avatarId} size={64} ring={COLOR_VAR[game.players[second].color]} />
              <div className="text-white font-bold mt-2 truncate w-24 text-center">{game.players[second].name}</div>
              <div className="text-gray-300 text-sm">
                +{getPoints(numPlayers, 1)} pts 
                {room?.coinsEarned && game.players[second].userId && room.coinsEarned[game.players[second].userId] > 0 && (
                  <span className="ml-1 text-yellow-400 font-bold flex items-center justify-center gap-1">
                    +{room.coinsEarned[game.players[second].userId]} <img src="/coin.png" alt="coins" className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
            <div className="w-24 md:w-32 h-32 bg-slate-300 rounded-t-xl flex items-center justify-center border-t-4 border-slate-400 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              <span className="text-6xl font-black text-slate-500 drop-shadow-md relative z-10">2</span>
            </div>
          </div>
        )}

        {/* First Place */}
        <div className="flex flex-col items-center animate-in zoom-in-50 duration-700 delay-300 z-10">
          <div className="flex flex-col items-center mb-4">
            <div className="relative">
              <div className="absolute -top-6 -left-2 -right-2 text-center text-4xl animate-bounce">👑</div>
              <Avatar id={game.players[first].avatarId} size={80} ring={COLOR_VAR[game.players[first].color]} />
            </div>
            <div className="text-yellow-400 font-black mt-2 text-lg truncate w-28 text-center">{game.players[first].name}</div>
            <div className="text-yellow-200 text-sm font-bold flex flex-col items-center">
              +{getPoints(numPlayers, 0)} pts
              {room?.coinsEarned && game.players[first].userId && room.coinsEarned[game.players[first].userId] > 0 && (
                <span className="text-yellow-400 font-black flex items-center gap-1 mt-0.5">
                  +{room.coinsEarned[game.players[first].userId]} <img src="/coin.png" alt="coins" className="w-5 h-5 drop-shadow-md" />
                </span>
              )}
            </div>
          </div>
          <div className="w-28 md:w-36 h-48 bg-yellow-400 rounded-t-xl flex items-center justify-center border-t-4 border-yellow-200 shadow-[0_0_40px_rgba(250,204,21,0.4)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
            <span className="text-7xl font-black text-yellow-600 drop-shadow-md relative z-10">1</span>
          </div>
        </div>

        {/* Third Place */}
        {third !== undefined && (
          <div className="flex flex-col items-center animate-in slide-in-from-bottom-24 duration-700 delay-700">
            <div className="flex flex-col items-center mb-4">
              <Avatar id={game.players[third].avatarId} size={64} ring={COLOR_VAR[game.players[third].color]} />
              <div className="text-white font-bold mt-2 truncate w-24 text-center">{game.players[third].name}</div>
              <div className="text-orange-300 text-sm">
                +{getPoints(numPlayers, 2)} pts
                {room?.coinsEarned && game.players[third].userId && room.coinsEarned[game.players[third].userId] > 0 && (
                  <span className="ml-1 text-yellow-400 font-bold flex items-center justify-center gap-1">
                    +{room.coinsEarned[game.players[third].userId]} <img src="/coin.png" alt="coins" className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
            <div className="w-24 md:w-32 h-24 bg-orange-700 rounded-t-xl flex items-center justify-center border-t-4 border-orange-500 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
              <span className="text-6xl font-black text-orange-900 drop-shadow-md relative z-10">3</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-16 animate-in fade-in duration-700 delay-1000">
        <Button onClick={onHome} size="lg" className="px-12 py-6 text-xl rounded-full bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105">
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
}
