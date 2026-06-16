import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { ACHIEVEMENTS } from "@/data/achievements";

export const Route = createFileRoute("/achievements")({
  component: AchievementsPage,
});

function AchievementsPage() {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "profiles", user.uid));
        if (snap.exists()) {
          setUnlockedIds(snap.data()?.achievements || []);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden" dir="rtl">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-4xl relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="btn-ghost !p-3 transform rotate-180">
            <span className="text-xl">←</span>
          </Link>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
            الإنجازات 🏆
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = unlockedIds.includes(ach.id);
            return (
              <div 
                key={ach.id} 
                className={`p-6 rounded-2xl flex items-center gap-6 border transition-all ${
                  isUnlocked 
                    ? "bg-gradient-to-br from-white/10 to-white/5 border-yellow-500/50 shadow-[0_0_30px_rgba(251,191,36,0.15)]" 
                    : "bg-black/40 border-white/5 opacity-60 grayscale"
                }`}
              >
                <div className={`text-6xl ${isUnlocked ? "drop-shadow-lg" : ""}`}>
                  {ach.icon}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${isUnlocked ? "text-yellow-400" : "text-white/70"}`}>
                    {ach.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ach.description}
                  </p>
                  {!isUnlocked && (
                    <div className="mt-3 text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                      <span>🔒 مقفل</span>
                    </div>
                  )}
                  {isUnlocked && (
                    <div className="mt-3 text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                      <span>✓ تم الإنجاز</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
