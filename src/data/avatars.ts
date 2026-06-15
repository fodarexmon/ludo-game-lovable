// 12 emoji-based avatars (cheap, universal, no external assets needed).
export interface AvatarDef { id: string; emoji: string; bg: string; }
export const AVATARS: AvatarDef[] = [
  // 6 الأولاد
  { id: "a1",  emoji: "👨🏼‍⚕️", bg: "#fb923c" }, // طبيب
  { id: "a2",  emoji: "👨🏾‍🚒", bg: "#1f2937" }, // إطفائي
  { id: "a3",  emoji: "👨🏻‍🌾", bg: "#f59e0b" }, // مزارع
  { id: "a4",  emoji: "👨🏿‍✈️", bg: "#ea580c" }, // طيار
  { id: "a5",  emoji: "👨🏽‍🍳", bg: "#22c55e" }, // طباخ
  { id: "a6",  emoji: "👦🏻", bg: "#a16207" }, // ولد عادي

  // 6 البنات
  { id: "a7",  emoji: "👩🏽‍⚕️", bg: "#a855f7" }, // ممرضة/طبيبة
  { id: "a8",  emoji: "👱🏼‍♀️", bg: "#0ea5e9" }, // شقراء
  { id: "a9",  emoji: "👩🏾‍🏫", bg: "#92400e" }, // معلمة
  { id: "a10", emoji: "👩🏿‍🎓", bg: "#6b7280" }, // خريجة / طالبة
  { id: "a11", emoji: "👩🏻‍🎨", bg: "#475569" }, // رسامة
  { id: "a12", emoji: "👧🏽", bg: "#ec4899" }, // فتاة سمراء
];
export function getAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
