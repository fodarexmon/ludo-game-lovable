import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { loadProfile } from "@/lib/profile";

export const Route = createFileRoute("/play/online")({
  head: () => ({ meta: [{ title: "Online Ludo — Create or Join a Room" }] }),
  component: OnlineLobby,
});

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function OnlineLobby() {
  const nav = useNavigate();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setNewRoomCode(genCode());
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { nav({ to: "/auth" }); return; }
      setUser({ id: currentUser.uid, name: currentUser.displayName ?? "Player" });
    });
    return () => unsubscribe();
  }, [nav]);

  async function ensureProfile(uid: string) {
    const p = loadProfile();
    const profileRef = doc(db, "profiles", uid);
    await setDoc(profileRef, { 
      id: uid, 
      display_name: p.displayName, 
      country: p.country, 
      avatar_id: p.avatarId 
    }, { merge: true });
  }

  async function createRoom() {
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      await ensureProfile(user.id);
      const roomRef = doc(db, "rooms", newRoomCode);
      
      await setDoc(roomRef, {
        code: newRoomCode,
        host_id: user.id,
        status: "lobby",
        state: {},
        players: [{ user_id: user.id, seat: 0, color: "red" }],
        matchCount: 1,
        scores: {}
      });
      
      nav({ to: "/play/online/$code", params: { code: newRoomCode } });
    } catch (e: any) {
      setErr(e?.message ?? "Could not create room. Ensure Firestore rules allow it.");
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (!user) return;
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 6) { setErr("Enter a 6-character code"); return; }
    setBusy(true); setErr(null);
    try {
      await ensureProfile(user.id);
      const roomRef = doc(db, "rooms", c);
      const roomDoc = await getDoc(roomRef);
      
      if (!roomDoc.exists()) throw new Error("Room not found");
      const room = roomDoc.data();
      if (room.status !== "lobby") throw new Error("Game already started");
      
      const existing = room.players || [];
      if (existing.some((r: any) => r.user_id === user.id)) {
        nav({ to: "/play/online/$code", params: { code: c } }); return;
      }
      if (existing.length >= 4) throw new Error("Room is full");
      
      const taken = new Set(existing.map((r: any) => r.seat));
      let seat = 0;
      while (taken.has(seat)) seat++;
      const colors = ["red", "green", "yellow", "blue"];
      
      await updateDoc(roomRef, {
        players: arrayUnion({ user_id: user.id, seat, color: colors[seat] })
      });
      
      nav({ to: "/play/online/$code", params: { code: c } });
    } catch (e: any) {
      setErr(e?.message ?? "Could not join room. Ensure Firestore rules allow it.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
      {/* Decorative Background Blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-4xl w-full z-10">
        <Link to="/" className="btn-ghost mb-8 inline-flex bg-background/50 backdrop-blur-md">← Back to Home</Link>
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Play Online</h1>
          <p className="text-lg text-muted-foreground">Create a room to play with friends or join an existing one.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <div className="panel flex flex-col justify-between bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-primary/20">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl">🏠</div>
                <h2 className="text-2xl font-bold">Create Room</h2>
              </div>
              <p className="mb-6 text-muted-foreground">Start a new game and invite your friends using a unique 6-character code.</p>
              
              <div className="mb-6 p-4 rounded-xl bg-black/40 border border-white/5 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your Room Code</div>
                <div className="text-4xl font-mono tracking-widest text-primary font-bold drop-shadow-md">{newRoomCode || "..."}</div>
              </div>
            </div>
            
            <button onClick={createRoom} disabled={busy || !newRoomCode} className="btn-game w-full text-lg shadow-lg shadow-primary/30">
              Create Room & Invite
            </button>
          </div>

          {/* Join Room Card */}
          <div className="panel flex flex-col justify-between bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-accent/20">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl">🤝</div>
                <h2 className="text-2xl font-bold">Join Room</h2>
              </div>
              <p className="mb-6 text-muted-foreground">Got a code from a friend? Enter it below to join their game.</p>
              
              <div className="mb-6 relative">
                <input
                  value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="ABC123"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-5 text-center text-3xl font-mono tracking-widest text-white placeholder:text-white/20 focus:border-accent focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                />
              </div>
            </div>

            <button onClick={joinRoom} disabled={busy || joinCode.length !== 6} className="btn-game w-full text-lg shadow-lg shadow-accent/30 !bg-gradient-to-b !from-accent !to-blue-700 !text-white">
              Join Game
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-8 p-4 rounded-xl bg-destructive/20 border border-destructive/50 text-destructive text-center animate-in fade-in zoom-in font-medium">
            ⚠️ {err}
          </div>
        )}
      </div>
    </div>
  );
}
