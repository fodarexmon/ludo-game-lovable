import { useEffect, useRef } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

// Generates a 6-character friend code
function generateFriendCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function GlobalPresence() {
  const nav = useNavigate();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubInvites: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        userIdRef.current = user.uid;
        const profileRef = doc(db, "profiles", user.uid);
        
        // Fetch profile to check if friendCode exists
        let currentFriendCode = "";
        try {
          const snap = await getDoc(profileRef);
          if (snap.exists() && snap.data().friendCode) {
            currentFriendCode = snap.data().friendCode;
          } else {
            currentFriendCode = generateFriendCode();
          }
        } catch (e) {
          console.error("Error fetching profile", e);
        }

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
        const intervalId = setInterval(updatePresence, 30000);

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

  return null;
}
