import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "الأصدقاء — Ludo Star" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCode, setAddCode] = useState("");
  const [addMsg, setAddMsg] = useState<{ text: string, type: "err" | "success" } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(user.uid);
      
      const profileRef = doc(db, "profiles", user.uid);
      getDoc(profileRef).then(snap => {
        if (snap.exists()) setMyProfile({ id: snap.id, ...snap.data() });
      });

      const friendsRef = collection(db, `profiles/${user.uid}/friends`);
      const knownFriendIds: string[] = [];
      const unsub = onSnapshot(friendsRef, async (snap) => {
        const friendIds = snap.docs.map(d => d.id);
        if (friendIds.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }
        
        // Only fetch profiles for friends we haven't loaded yet
        const newIds = friendIds.filter(id => !knownFriendIds.includes(id));
        if (newIds.length > 0) {
          knownFriendIds.push(...newIds);
          const chunks = [];
          for (let i = 0; i < friendIds.length; i += 10) {
            chunks.push(friendIds.slice(i, i + 10));
          }
          let fetched: any[] = [];
          for (const chunk of chunks) {
            const q = query(collection(db, "profiles"), where("id", "in", chunk));
            const pSnap = await getDocs(q);
            pSnap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
          }
          setFriends(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const merged = [...prev, ...fetched.filter(f => !existingIds.has(f.id))];
            // Remove friends who are no longer in the list
            return merged.filter(f => friendIds.includes(f.id));
          });
        } else {
          // No new friends — just remove any who were deleted
          setFriends(prev => prev.filter(f => friendIds.includes(f.id)));
        }
        setLoading(false);
      });
      
      return () => unsub();
    });
  }, []);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !myProfile) return;
    const code = addCode.trim().toUpperCase();
    if (code.length !== 6) {
      setAddMsg({ text: "كود الصداقة يجب أن يكون 6 أحرف/أرقام.", type: "err" });
      return;
    }
    if (code === myProfile.friendCode) {
      setAddMsg({ text: "لا يمكنك إضافة نفسك!", type: "err" });
      return;
    }

    setAdding(true);
    setAddMsg(null);
    try {
      const q = query(collection(db, "profiles"), where("friendCode", "==", code));
      const snap = await getDocs(q);
      if (snap.empty) {
        setAddMsg({ text: "لم يتم العثور على لاعب بهذا الكود.", type: "err" });
        setAdding(false);
        return;
      }

      const targetDoc = snap.docs[0];
      const targetId = targetDoc.id;
      const targetData = targetDoc.data();

      // Check if already friends
      if (friends.some(f => f.id === targetId)) {
        setAddMsg({ text: "هذا اللاعب موجود بالفعل في قائمة أصدقائك.", type: "err" });
        setAdding(false);
        return;
      }

      // Add to my friends
      await setDoc(doc(db, `profiles/${userId}/friends`, targetId), {
        id: targetId,
        addedAt: Date.now()
      });
      
      // Add me to their friends (mutual)
      await setDoc(doc(db, `profiles/${targetId}/friends`, userId), {
        id: userId,
        addedAt: Date.now()
      });

      setAddMsg({ text: `تم إضافة ${targetData.display_name} إلى أصدقائك بنجاح!`, type: "success" });
      setAddCode("");
    } catch (err: any) {
      console.error(err);
      setAddMsg({ text: "حدث خطأ أثناء إضافة الصديق.", type: "err" });
    } finally {
      setAdding(false);
    }
  };

  const genCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  };

  const inviteFriend = async (friendId: string, friendName: string) => {
    if (!userId || !myProfile) return;
    try {
      const newRoomCode = genCode();
      const roomRef = doc(db, "rooms", newRoomCode);
      
      await setDoc(roomRef, {
        code: newRoomCode,
        host_id: userId,
        status: "lobby",
        state: {},
        players: [{ user_id: userId, seat: 0, color: "red" }],
        matchCount: 1,
        scores: {}
      });
      
      // Send invite
      await setDoc(doc(db, `profiles/${friendId}/invites`, newRoomCode), {
        id: newRoomCode,
        roomCode: newRoomCode,
        fromId: userId,
        fromName: myProfile.display_name || "Player",
        timestamp: Date.now()
      });

      nav({ to: "/play/online/$code", params: { code: newRoomCode } });
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال الدعوة.");
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-3xl w-full z-10">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="btn-ghost bg-background/50 backdrop-blur-md">← رجوع للرئيسية</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            👥 الأصدقاء
          </h1>
          <div className="w-[100px]"></div>
        </div>

        {!userId ? (
          <div className="panel bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl p-12 text-center text-muted-foreground">
            يجب عليك تسجيل الدخول لرؤية قائمة الأصدقاء.
          </div>
        ) : (
          <div className="space-y-6">
            {/* My Code & Add Friend */}
            <div className="panel bg-card/60 backdrop-blur-xl border border-white/10 shadow-xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex-1 text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">كود الصداقة الخاص بك</p>
                <div className="text-3xl font-mono font-bold text-primary tracking-widest bg-black/40 px-4 py-2 rounded-lg inline-block border border-white/5 shadow-inner">
                  {myProfile?.friendCode || "------"}
                </div>
              </div>
              <div className="w-full md:w-px h-px md:h-16 bg-white/10" />
              <form onSubmit={handleAddFriend} className="flex-1 w-full flex flex-col gap-2">
                <p className="text-sm text-muted-foreground mb-1 text-center md:text-right">إضافة صديق جديد</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="مثال: ABC123"
                    value={addCode}
                    onChange={e => setAddCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-center font-mono tracking-widest text-lg focus:border-primary outline-none transition-colors"
                  />
                  <button disabled={adding || !addCode} className="btn-game px-6 whitespace-nowrap !py-2 !text-base">
                    إضافة
                  </button>
                </div>
                {addMsg && (
                  <p className={`text-sm text-center md:text-right font-medium ${addMsg.type === "err" ? "text-destructive" : "text-green-400"}`}>
                    {addMsg.text}
                  </p>
                )}
              </form>
            </div>

            {/* Friends List */}
            <div className="panel bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl p-0 overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5 font-bold text-lg">
                قائمة الأصدقاء ({friends.length})
              </div>
              
              {loading ? (
                <div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل الأصدقاء...</div>
              ) : friends.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">لا يوجد لديك أصدقاء حالياً. قم بمشاركة كودك معهم!</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {friends.map((friend) => {
                    // Consider online if lastActive is within 2 minutes
                    const isOnline = friend.isOnline && friend.lastActive && (Date.now() - friend.lastActive < 120000);
                    
                    return (
                      <div key={friend.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                        <div className="relative">
                          <Avatar id={friend.avatar_id || 'a1'} size={50} />
                          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1a1b2e] ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg">{friend.display_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {isOnline ? (
                              <span className="text-green-400 font-medium">متصل الآن</span>
                            ) : (
                              <span>غير متصل</span>
                            )}
                            {friend.country && <span className="opacity-50">({friend.country})</span>}
                          </div>
                        </div>
                        <div>
                          {isOnline ? (
                            <button 
                              onClick={() => inviteFriend(friend.id, friend.display_name)}
                              className="btn-game !bg-gradient-to-b !from-sky-400 !to-blue-600 shadow-[0_0_15px_rgba(14,165,233,0.4)] px-4 py-2 text-sm whitespace-nowrap"
                            >
                              دعوة للعب 🎮
                            </button>
                          ) : (
                            <button disabled className="btn-ghost px-4 py-2 text-sm opacity-50 cursor-not-allowed whitespace-nowrap">
                              دعوة للعب 🎮
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
