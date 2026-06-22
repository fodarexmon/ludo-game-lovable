import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAchievements } from "@/hooks/useAchievements";
import { AchievementPopup } from "@/components/AchievementPopup";

// Generates a 6-character friend code
function generateFriendCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function GlobalPresence() {
  const nav = useNavigate();
  const userIdRef = useRef<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const { newAchievement, clearAchievement } = useAchievements(userIdRef.current, profileData);

  useEffect(() => {
    let unsubInvites: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        userIdRef.current = user.uid;
        const profileRef = doc(db, "profiles", user.uid);
        
        let currentFriendCode = "";
        const unsubProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfileData(data);
            if (data.friendCode) {
              currentFriendCode = data.friendCode;
            } else if (!currentFriendCode) {
              currentFriendCode = generateFriendCode();
              setDoc(profileRef, { friendCode: currentFriendCode }, { merge: true });
            }
          }
        });

        // Update presence and friendCode
        const updatePresence = async () => {
          try {
            await setDoc(profileRef, {
              isOnline: true,
              lastActive: Date.now(),
              ...(currentFriendCode ? { friendCode: currentFriendCode } : {})
            }, { merge: true });
          } catch (e) {
            console.error("Failed to update presence", e);
          }
        };

        updatePresence();
        const intervalId = setInterval(updatePresence, 300000); // every 5 minutes

        // Listen for incoming invites
        const invitesRef = collection(db, `profiles/${user.uid}/invites`);
        unsubInvites = onSnapshot(invitesRef, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const invite = change.doc.data();
              // Show toast
              toast(`🎮 دعوة للعب من ${invite.fromName}!`, {
                description: "يريد أن يلعب معك لودو الآن.",
                duration: 10000,
                action: {
                  label: "قبول",
                  onClick: async () => {
                    // Navigate to the room
                    await deleteDoc(change.doc.ref);
                    nav({ to: "/play/online/$code", params: { code: invite.roomCode } });
                  }
                },
                cancel: {
                  label: "رفض",
                  onClick: async () => {
                    await deleteDoc(change.doc.ref);
                  }
                }
              });
            }
          });
        });

        // Cleanup function for interval
        return () => {
          clearInterval(intervalId);
          if (unsubInvites) unsubInvites();
          if (unsubProfile) unsubProfile();
        };
      } else {
        if (userIdRef.current) {
          const profileRef = doc(db, "profiles", userIdRef.current);
          setDoc(profileRef, { isOnline: false, lastActive: Date.now() }, { merge: true }).catch(console.error);
        }
        userIdRef.current = null;
        if (unsubInvites) unsubInvites();
      }
    });

    const handleBeforeUnload = () => {
      if (userIdRef.current) {
        const profileRef = doc(db, "profiles", userIdRef.current);
        setDoc(profileRef, { isOnline: false, lastActive: Date.now() }, { merge: true }).catch(console.error);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribeAuth();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [nav]);

  return (
    <>
      {newAchievement && <AchievementPopup achievement={newAchievement} onClose={clearAchievement} />}
    </>
  );
}
