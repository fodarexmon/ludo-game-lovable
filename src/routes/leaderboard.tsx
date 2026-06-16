import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs, getDoc, doc, where, getCountFromServer } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "لوحة الشرف — Ludo Star" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [findingRank, setFindingRank] = useState(false);
  const [highlightUserId, setHighlightUserId] = useState<string | null>(null);
  const [myRankMsg, setMyRankMsg] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
  }, []);

  const findMyRank = async () => {
    if (!userId) {
      setMyRankMsg("يجب عليك تسجيل الدخول أولاً");
      return;
    }
    setFindingRank(true);
    setMyRankMsg(null);
    
    const index = leaders.findIndex(l => l.id === userId);
    if (index !== -1) {
      setHighlightUserId(userId);
      const el = document.getElementById(`rank-${userId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFindingRank(false);
      return;
    }

    try {
      const myDoc = await getDoc(doc(db, "profiles", userId));
      if (!myDoc.exists()) {
        setMyRankMsg("لم تلعب أي مباراة بعد!");
        setFindingRank(false);
        return;
      }
      const myPoints = myDoc.data().stats?.totalPoints || 0;
      const q = query(collection(db, "profiles"), where("stats.totalPoints", ">", myPoints));
      const snapshot = await getCountFromServer(q);
      const higherCount = snapshot.data().count;
      const rank = higherCount + 1;
      
      const myData = { id: myDoc.id, ...myDoc.data(), exactRank: rank };
      setLeaders(prev => [...prev, myData]);
      
      setTimeout(() => {
        setHighlightUserId(userId);
        const el = document.getElementById(`rank-${userId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
    } catch (e) {
      console.error(e);
      setMyRankMsg("حدث خطأ أثناء جلب الترتيب");
    } finally {
      setFindingRank(false);
    }
  };

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
            🌍 لوحة الشرف
          </h1>
          <div className="flex flex-col items-end gap-2 w-[150px]">
            <button 
              onClick={findMyRank} 
              disabled={findingRank || !userId} 
              className="btn-game bg-sky-500 hover:bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] whitespace-nowrap px-4 py-2 text-sm disabled:opacity-50"
            >
              {findingRank ? "جاري البحث..." : "ترتيبي 🎯"}
            </button>
            {myRankMsg && <div className="text-[10px] text-destructive font-bold text-right absolute top-full mt-1">{myRankMsg}</div>}
          </div>
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
                  <div id={`rank-${p.id}`} key={p.id} className={`flex items-center gap-4 p-4 transition-colors ${i === 0 ? "bg-primary/10" : "hover:bg-white/5"} ${highlightUserId === p.id ? "bg-sky-500/20 border border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.3)]" : ""}`}>
                    <div className={`text-2xl md:text-3xl font-black w-12 text-center ${rankColors[i] || rankColors[3]}`}>
                      {p.exactRank ? `#${p.exactRank}` : (medals[i] || `#${i + 1}`)}
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
