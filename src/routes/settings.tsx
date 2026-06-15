import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadProfile, saveProfile } from "@/lib/profile";
import { AvatarPicker } from "@/components/Avatar";
import { COUNTRIES } from "@/data/countries";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Ludo Star" },
      { name: "description", content: "Set your display name, country, and avatar." },
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
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return () => unsub();
  }, []);

  async function save() {
    const profile = { displayName: name.trim() || "Player", country, avatarId };
    saveProfile(profile);
    if (userId) {
      await setDoc(doc(db, "profiles", userId), {
        id: userId, display_name: profile.displayName, country: profile.country, avatar_id: profile.avatarId,
      }, { merge: true });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
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

        // Crop to square before resizing for perfect avatars
        const size = Math.min(width, height);
        const offsetX = (width - size) / 2;
        const offsetY = (height - size) / 2;

        canvas.width = MAX_WIDTH;
        canvas.height = MAX_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, MAX_WIDTH, MAX_HEIGHT);
          const dataUrl = canvas.toDataURL("image/webp", 0.6); // heavily compressed
          setAvatarId(dataUrl);
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="btn-ghost mb-4 inline-flex">← Back</Link>
        <h1 className="mb-6 text-3xl font-bold">Settings</h1>
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
          <button onClick={save} className="btn-game w-full">{saved ? "✓ Saved" : "Save"}</button>
          {userId && <p className="text-xs text-muted-foreground">Signed in — changes also sync to your online profile.</p>}
        </div>
      </div>
    </div>
  );
}
