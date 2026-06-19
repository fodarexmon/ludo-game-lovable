// Local-only player profile (used in offline mode and as defaults for online).
export interface LocalProfile {
  displayName: string;
  country: string;
  avatarId: string;
  voiceChatDisabled?: boolean;
}
const KEY = "ludo:profile";
const DEFAULT: LocalProfile = { displayName: "Player", country: "US", avatarId: "a1", voiceChatDisabled: false };

export function loadProfile(): LocalProfile {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}
export function saveProfile(p: LocalProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}
