import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { ACHIEVEMENTS, type Achievement } from "@/data/achievements";

export function useAchievements(userId: string | null, profile: any) {
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!userId || !profile || !profile.stats) return;

    const checkAchievements = async () => {
      const unlockedIds = profile.achievements || [];
      
      const newlyUnlocked: Achievement[] = [];

      for (const ach of ACHIEVEMENTS) {
        if (!unlockedIds.includes(ach.id) && ach.condition(profile.stats, profile)) {
          newlyUnlocked.push(ach);
        }
      }

      if (newlyUnlocked.length > 0) {
        const ids = newlyUnlocked.map(a => a.id);
        const profileRef = doc(db, "profiles", userId);
        
        try {
          await updateDoc(profileRef, {
            achievements: arrayUnion(...ids)
          });
          
          // Show popup for the first one (we could queue them, but showing one is fine for now)
          setNewAchievement(newlyUnlocked[0]);
          
          // Clear popup after 4 seconds
          setTimeout(() => {
            setNewAchievement(null);
          }, 4000);
        } catch (e) {
          console.error("Failed to unlock achievements", e);
        }
      }
    };

    checkAchievements();
  }, [userId, profile?.stats]);

  return { newAchievement, clearAchievement: () => setNewAchievement(null) };
}
