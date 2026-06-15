import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Global Leaderboard — Ludo Star" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const q = query(collection(db, "profiles"), orderBy("stats.totalPoints", "desc"), limit(50));
        const snap = await getDocs(q);
        const results: any[] = [];
        snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
        setLeaders(results);
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, []);

  return (
    <div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-3xl w-full z-10">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="btn-ghost bg-background/50 backdrop-blur-md">← Back Home</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            🌍 Global Leaderboard
          </h1>
          <div className="w-[100px]"></div>
        </div>

        <div className="panel bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Loading top players...</div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No players have completed a match yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaders.map((p, i) => {
                const rankColors = ["text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]", "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]", "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]", "text-muted-foreground"];
                const medals = ["🥇", "🥈", "🥉", ""];
                return (
                  <div key={p.id} className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${i === 0 ? "bg-primary/10" : ""}`}>
                    <div className={`text-2xl md:text-3xl font-black w-12 text-center ${rankColors[i] || rankColors[3]}`}>
                      {medals[i] || `#${i + 1}`}
                    </div>
                    <Avatar id={p.avatar_id || 'a1'} size={56} />
                    <div className="flex-1">
                      <div className="font-bold text-lg md:text-xl flex items-center gap-2">
                        {p.display_name}
                        {p.country && <span className="text-sm opacity-60">({p.country})</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="text-accent font-semibold">{p.stats?.wins || 0}</span> Wins
                        <span className="mx-2 opacity-50">|</span>
                        {p.stats?.gamesPlayed ? Math.round(((p.stats?.wins || 0) / p.stats.gamesPlayed) * 100) : 0}% Win Rate
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl md:text-3xl font-black text-primary drop-shadow-md">
                        {p.stats?.totalPoints || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
