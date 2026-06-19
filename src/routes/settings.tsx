import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadProfile, saveProfile } from "@/lib/profile";
import { AvatarPicker } from "@/components/Avatar";
import { COUNTRIES } from "@/data/countries";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Profile — Ludo Star" },
      { name: "description", content: "Manage your profile, stats, and settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadProfile(), []);
  const [name, setName] = useState(initial.displayName);
  const [country, setCountry] = useState(initial.country);
  const [avatarId, setAvatarId] = useState(initial.avatarId);
  const [voiceChatDisabled, setVoiceChatDisabled] = useState(initial.voiceChatDisabled || false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ gamesPlayed: number, wins: number, totalPoints: number } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUserId(user?.uid ?? null);
      if (user?.uid) {
        const profSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profSnap.exists()) {
          const data = profSnap.data();
          setName(data.display_name || user.displayName || "Player");
          setCountry(data.country || "US");
          setAvatarId(data.avatar_id || user.photoURL || "a1");
          setVoiceChatDisabled(data.voice_chat_disabled || false);
          setStats(data.stats || { gamesPlayed: 0, wins: 0, totalPoints: 0 });
          
          saveProfile({
            displayName: data.display_name || user.displayName || "Player",
            country: data.country || "US",
            avatarId: data.avatar_id || user.photoURL || "a1",
            voiceChatDisabled: data.voice_chat_disabled || false,
          });
        } else {
          // Fallback if profile doesn't exist in DB yet (e.g. legacy auth)
          setName(user.displayName || "Player");
          setAvatarId(user.photoURL || "a1");
          setStats({ gamesPlayed: 0, wins: 0, totalPoints: 0 });
        }
      }
    });
    return () => unsub();
  }, []);

  async function save() {
    const profile = { displayName: name.trim() || "Player", country, avatarId, voiceChatDisabled };
    saveProfile(profile);
    if (userId) {
      await setDoc(doc(db, "profiles", userId), {
        id: userId, display_name: profile.displayName, country: profile.country, avatar_id: profile.avatarId, voice_chat_disabled: profile.voiceChatDisabled,
      }, { merge: true });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  async function handleSignOut() {
    await signOut(auth);
    setStats(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        const size = Math.min(width, height);
        const offsetX = (width - size) / 2;
        const offsetY = (height - size) / 2;

        canvas.width = MAX_WIDTH;
        canvas.height = MAX_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, MAX_WIDTH, MAX_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.6);
          setAvatarId(dataUrl);
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="btn-ghost mb-4 inline-flex">← Back</Link>
        <h1 className="mb-6 text-3xl font-bold">Settings & Profile</h1>
        
        {userId && stats && (
          <div className="panel mb-6 flex gap-4 text-center">
            <div className="flex-1 bg-secondary rounded-lg p-3">
              <div className="text-2xl font-black text-primary">{stats.gamesPlayed}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Games</div>
            </div>
            <div className="flex-1 bg-secondary rounded-lg p-3">
              <div className="text-2xl font-black text-ludo-green">{stats.wins}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Wins</div>
            </div>
            <div className="flex-1 bg-secondary rounded-lg p-3">
              <div className="text-2xl font-black text-ludo-yellow">{stats.totalPoints}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Points</div>
            </div>
          </div>
        )}

        <div className="panel space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center justify-between bg-secondary/50 p-4 rounded-xl border border-border">
            <div>
              <div className="font-medium">إلغاء الدردشة الصوتية بالكامل</div>
              <div className="text-xs text-muted-foreground mt-1">يمنع المايكروفون تماماً في كل المباريات حفاظاً على الخصوصية. لن يتمكن أحد من سماعك ولن تستطيع فتح المايك داخل اللعبة.</div>
            </div>
            <button 
              onClick={() => setVoiceChatDisabled(!voiceChatDisabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceChatDisabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceChatDisabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium">Avatar</label>
              <label className="cursor-pointer text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors">
                Upload Custom Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            
            {avatarId && avatarId.startsWith("data:image/") && (
              <div className="mb-4 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-top-2">
                <div className="relative group cursor-pointer" onClick={() => setAvatarId("a1")}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                    <img src={avatarId} alt="Custom Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Remove</span>
                  </div>
                </div>
              </div>
            )}
            
            <AvatarPicker value={avatarId} onChange={setAvatarId} />
          </div>
          <button onClick={save} className="btn-game w-full">{saved ? "✓ Saved" : "Save Changes"}</button>
          
          {userId ? (
            <div className="pt-4 mt-2 border-t border-border flex flex-col gap-3">
              <p className="text-xs text-muted-foreground text-center">Signed in to Google. Your profile and stats are synced online.</p>
              <button onClick={handleSignOut} className="btn-ghost w-full !text-destructive border border-destructive/20 hover:bg-destructive/10">Sign Out</button>
            </div>
          ) : (
            <div className="pt-4 mt-2 border-t border-border flex flex-col gap-3">
              <p className="text-xs text-muted-foreground text-center">Not signed in. Sign in to play online and sync your stats.</p>
              <Link to="/auth" className="btn-ghost w-full">Sign In with Google</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
