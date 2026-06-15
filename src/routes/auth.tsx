import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth } from "@/integrations/firebase/client";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";

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
      if (user) nav({ to: "/play/online" });
    });
    return () => unsubscribe();
  }, [nav]);

  async function signInGoogle() {
    setErr(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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
