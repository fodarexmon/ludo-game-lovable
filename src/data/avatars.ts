// 12 emoji-based avatars (cheap, universal, no external assets needed).
export interface AvatarDef { id: string; emoji: string; bg: string; }
export const AVATARS: AvatarDef[] = [
  { id: "a1",  emoji: "🦊", bg: "#fb923c" },
  { id: "a2",  emoji: "🐼", bg: "#1f2937" },
  { id: "a3",  emoji: "🦁", bg: "#f59e0b" },
  { id: "a4",  emoji: "🐯", bg: "#ea580c" },
  { id: "a5",  emoji: "🐸", bg: "#22c55e" },
  { id: "a6",  emoji: "🐵", bg: "#a16207" },
  { id: "a7",  emoji: "🦄", bg: "#a855f7" },
  { id: "a8",  emoji: "🐧", bg: "#0ea5e9" },
  { id: "a9",  emoji: "🐶", bg: "#92400e" },
  { id: "a10", emoji: "🐱", bg: "#6b7280" },
  { id: "a11", emoji: "🐨", bg: "#475569" },
  { id: "a12", emoji: "🐮", bg: "#ec4899" },
];
export function getAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
