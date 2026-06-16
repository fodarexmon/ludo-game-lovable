import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ludo Star — Classic Ludo, Online & Offline" },
      { name: "description", content: "Play classic Ludo against friends on the same device, vs. computer, or online with friends in private rooms." },
      { property: "og:title", content: "Ludo Star — Classic Ludo, Online & Offline" },
      { property: "og:description", content: "Classic Ludo with offline pass-and-play, AI opponents, and online private rooms." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "profiles", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setCoins(snap.data()?.stats?.coins || 0);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      {/* Coin Display at Top Right */}
      {coins !== null && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg animate-in fade-in zoom-in slide-in-from-top-4">
          <span className="font-black text-xl text-yellow-400 drop-shadow-md">{coins}</span>
          <img src="/coin.png" alt="Coins" className="w-8 h-8 drop-shadow-lg" />
        </div>
      )}

      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 grid h-24 w-24 grid-cols-2 grid-rows-2 gap-1 rounded-2xl p-2 shadow-2xl" style={{ background: "var(--board-bg)" }}>
            <div className="rounded-md" style={{ background: "var(--ludo-red)" }} />
            <div className="rounded-md" style={{ background: "var(--ludo-green)" }} />
            <div className="rounded-md" style={{ background: "var(--ludo-blue)" }} />
            <div className="rounded-md" style={{ background: "var(--ludo-yellow)" }} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Ludo Star</h1>
          <p className="mt-2 text-muted-foreground">The classic board game — your way.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link to="/play/offline" className="btn-game text-lg">🎲 Play Offline</Link>
          <Link to="/play/online" className="btn-game text-lg">🌐 Play Online</Link>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Link to="/friends" className="btn-ghost !py-4 text-sm whitespace-nowrap !bg-gradient-to-r !from-sky-500/20 !to-blue-600/20 !border-sky-500/50 hover:!from-sky-500/40 hover:!to-blue-600/40">👥 الأصدقاء</Link>
            <Link to="/leaderboard" className="btn-ghost !py-4 text-sm whitespace-nowrap">🏆 لوحة الشرف</Link>
            <Link to="/settings" className="btn-ghost !py-4 text-sm whitespace-nowrap col-span-2">⚙️ Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
