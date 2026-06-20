import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { loadProfile, saveProfile } from "@/lib/profile";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Ludo Star" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !loading) nav({ to: "/play/online" });
    });
    return () => unsubscribe();
  }, [nav, loading]);

  async function signInGoogle() {
    setErr(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      
      const profRef = doc(db, "profiles", user.uid);
      const profSnap = await getDoc(profRef);
      
      let profileData;
      if (!profSnap.exists()) {
        const local = loadProfile();
        profileData = {
          id: user.uid,
          display_name: local.displayName !== "Player" ? local.displayName : (user.displayName || "Player"),
          country: local.country || "US",
          avatar_id: local.avatarId !== "a1" ? local.avatarId : (user.photoURL || "a1"),
          stats: { gamesPlayed: 0, wins: 0, totalPoints: 0 }
        };
        await setDoc(profRef, profileData);
      } else {
        profileData = profSnap.data();
      }
      
      // Sync to local storage
      saveProfile({
        displayName: profileData.display_name,
        country: profileData.country,
        avatarId: profileData.avatar_id,
        voiceChatDisabled: profileData.voice_chat_disabled || false
      });

      nav({ to: "/play/online" });
    } catch (error: any) {
      setErr(error?.message ?? "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="panel w-full max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 grid-cols-2 grid-rows-2 gap-1 rounded-xl p-1.5" style={{ background: "var(--board-bg)" }}>
          <div className="rounded" style={{ background: "var(--ludo-red)" }} />
          <div className="rounded" style={{ background: "var(--ludo-green)" }} />
          <div className="rounded" style={{ background: "var(--ludo-blue)" }} />
          <div className="rounded" style={{ background: "var(--ludo-yellow)" }} />
        </div>
        <h1 className="text-2xl font-bold">Sign in to play online</h1>
        <p className="mt-2 text-sm text-muted-foreground">Online rooms require a Google account so we can show your friends who's playing.</p>
        <button onClick={signInGoogle} disabled={loading} className="btn-game mt-6 w-full">
          {loading ? "..." : "Continue with Google"}
        </button>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <button onClick={() => nav({ to: "/" })} className="btn-ghost mt-3 w-full">Cancel</button>
      </div>
    </div>
  );
}
