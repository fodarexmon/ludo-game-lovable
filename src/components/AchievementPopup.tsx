import { useEffect } from "react";
import type { Achievement } from "@/data/achievements";

export function AchievementPopup({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  useEffect(() => {
    // Play a generic victory sound, or you could create playAchievementSound() in audio.ts
    const audio = new Audio("/sounds/finish.mp3");
    audio.play().catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
      {/* Background dark overlay to make it pop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-500" />
      
      {/* The actual popup container */}
      <div 
        className="relative flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl p-8 shadow-[0_0_80px_rgba(251,191,36,0.6)] animate-in zoom-in-50 slide-in-from-bottom-10 duration-700 pointer-events-auto cursor-pointer"
        onClick={onClose}
      >
        <div className="absolute -top-16 text-8xl drop-shadow-2xl animate-bounce">
          {achievement.icon}
        </div>
        
        <h2 className="text-white text-xl font-bold tracking-widest uppercase mt-4 opacity-80">
          تم تحقيق إنجاز جديد!
        </h2>
        
        <h1 className="text-white text-5xl font-black text-center mt-2 drop-shadow-md">
          {achievement.title}
        </h1>
        
        <p className="text-amber-100 text-lg text-center mt-4 max-w-sm">
          {achievement.description}
        </p>

        {/* Shine effect overlay */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 animate-[shimmer_2s_infinite]" />
      </div>
    </div>
  );
}
