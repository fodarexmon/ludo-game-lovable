export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: any, profile: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    title: "بداية المشوار",
    description: "الفوز بأول مباراة أونلاين.",
    icon: "🌟",
    condition: (stats) => (stats?.wins || 0) >= 1,
  },
  {
    id: "pro",
    title: "المحترف",
    description: "الفوز بـ 10 مباريات أونلاين.",
    icon: "🎖️",
    condition: (stats) => (stats?.wins || 0) >= 10,
  },
  {
    id: "ludo_king",
    title: "ملك اللودو",
    description: "الفوز بـ 50 مباراة أونلاين.",
    icon: "👑",
    condition: (stats) => (stats?.wins || 0) >= 50,
  },
  {
    id: "wealthy",
    title: "جامع الثروة",
    description: "جمع 1000 نقطة (Points).",
    icon: "💰",
    condition: (stats) => (stats?.totalPoints || 0) >= 1000,
  },
  {
    id: "fierce",
    title: "الشرس",
    description: "أكل قطع الخصم 20 مرة.",
    icon: "⚔️",
    condition: (stats) => (stats?.piecesEaten || 0) >= 20,
  },
  {
    id: "pro_killer",
    title: "القاتل المحترف",
    description: "أكل قطع الخصم 100 مرة.",
    icon: "🥷",
    condition: (stats) => (stats?.piecesEaten || 0) >= 100,
  },
  {
    id: "crowned_king",
    title: "الملك المتوج",
    description: "الفوز بالمركز الأول دون أن تُؤكل أي من قطعك.",
    icon: "🛡️",
    condition: (stats) => (stats?.flawlessWins || 0) >= 1,
  },
  {
    id: "outstanding",
    title: "المتميز",
    description: "الفوز بالمركز الأول 3 مرات على التوالي.",
    icon: "🔥",
    condition: (stats) => (stats?.maxWinStreak || 0) >= 3,
  },
  {
    id: "giant",
    title: "العملاق",
    description: "الفوز بالمركز الأول 5 مرات على التوالي.",
    icon: "👹",
    condition: (stats) => (stats?.maxWinStreak || 0) >= 5,
  },
  {
    id: "filthy_rich",
    title: "فاحش الثراء",
    description: "الوصول إلى 2500 كوينز.",
    icon: "💎",
    condition: (stats) => (stats?.coins || 0) >= 2500,
  },
  {
    id: "the_player",
    title: "اللعيب",
    description: "لعب 100 مباراة أونلاين.",
    icon: "🎲",
    condition: (stats) => (stats?.gamesPlayed || 0) >= 100,
  },
];
