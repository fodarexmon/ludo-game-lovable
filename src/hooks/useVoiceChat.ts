import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/integrations/firebase/client";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

const STUN_SERVERS = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

export function useVoiceChat(roomId: string, userId: string, peerIds: string[], enabled: boolean = true) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [speakingPlayers, setSpeakingPlayers] = useState<Record<string, boolean>>({});
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We keep track of peer connections
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  // Request Microphone access once
  useEffect(() => {
    if (!enabled) return;

    let stream: MediaStream;
    const initMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
      } catch (err: any) {
        console.error("Microphone access denied:", err);
        setError("لم نتمكن من الوصول للمايكروفون. يرجى إعطاء الصلاحية.");
      }
    };
    initMic();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enabled]);

  // Handle peers
  useEffect(() => {
    if (!enabled || !localStream || !roomId || !userId) return;

    const activePeers = new Set(peerIds);

    // Close connections for players who left
    Object.keys(peerConnections.current).forEach((pId) => {
      if (!activePeers.has(pId)) {
        peerConnections.current[pId].close();
        delete peerConnections.current[pId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[pId];
          return next;
        });
      }
    });

    // Create connections for new players
    const unsubs: (() => void)[] = [];

    peerIds.forEach((peerId) => {
      if (peerId === userId) return;
      if (peerConnections.current[peerId]) return; // Already connected

      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnections.current[peerId] = pc;

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Listen for remote tracks
      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [peerId]: event.streams[0],
        }));
      };

      const isCaller = userId < peerId;
      const callerId = isCaller ? userId : peerId;
      const calleeId = isCaller ? peerId : userId;
      const signalDoc = doc(db, "rooms", roomId, "webrtc", `${callerId}_${calleeId}`);

      // Collect ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateStr = JSON.stringify(event.candidate.toJSON());
          const field = isCaller ? "callerCandidates" : "calleeCandidates";
          updateDoc(signalDoc, {
            [field]: arrayUnion(candidateStr),
          }).catch(() => {
            // Document might not exist yet, we will create it if we are the caller
            if (isCaller) {
              setDoc(signalDoc, { [field]: [candidateStr] }, { merge: true });
            }
          });
        }
      };

      // Signaling logic
      const setupSignaling = async () => {
        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalDoc, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });
        }

        const unsub = onSnapshot(signalDoc, async (snapshot) => {
          const data = snapshot.data();
          if (!data) return;

          // Answerer processes the offer
          if (!isCaller && data.offer && pc.signalingState === "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(signalDoc, { answer: { type: answer.type, sdp: answer.sdp } });
          }

          // Caller processes the answer
          if (isCaller && data.answer && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }

          // Process ICE Candidates
          const remoteCandidatesField = isCaller ? "calleeCandidates" : "callerCandidates";
          if (data[remoteCandidatesField]) {
            const candidates = data[remoteCandidatesField] as string[];
            candidates.forEach(async (candStr) => {
              try {
                const candObj = JSON.parse(candStr);
                await pc.addIceCandidate(new RTCIceCandidate(candObj));
              } catch (e) {
                // Ignore already added candidate errors
              }
            });
          }
        });

        unsubs.push(unsub);
      };

      setupSignaling();
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [roomId, userId, peerIds, localStream, enabled]);

  // Audio analysis for speaking indicator
  useEffect(() => {
    if (!enabled) {
      setSpeakingPlayers({});
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analysers: Record<string, AnalyserNode> = {};
    const dataArrays: Record<string, Uint8Array> = {};
    let animationFrameId: number;

    const setupAnalyser = (id: string, stream: MediaStream) => {
      if (!stream || stream.getAudioTracks().length === 0) return;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analysers[id] = analyser;
      dataArrays[id] = new Uint8Array(analyser.frequencyBinCount);
    };

    if (localStream && !isMicMuted) {
      setupAnalyser(userId, localStream);
    }
    
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      setupAnalyser(id, stream);
    });

    const checkSpeaking = () => {
      const newSpeaking: Record<string, boolean> = {};
      let changed = false;

      Object.keys(analysers).forEach((id) => {
        const analyser = analysers[id];
        const dataArray = dataArrays[id];
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // Threshold for speaking (adjust between 10-30 based on noise)
        const isSpeakingNow = average > 15;
        
        // Only update state if it changed to avoid excessive re-renders
        // Use a functional approach or check against current state. 
        // We'll gather all and then set state.
        newSpeaking[id] = isSpeakingNow;
      });

      setSpeakingPlayers((prev) => {
        let isDifferent = false;
        // Check if new has different values than prev
        for (const id in newSpeaking) {
          if (prev[id] !== newSpeaking[id]) isDifferent = true;
        }
        for (const id in prev) {
          if (prev[id] !== newSpeaking[id]) isDifferent = true;
        }
        return isDifferent ? newSpeaking : prev;
      });

      animationFrameId = requestAnimationFrame(checkSpeaking);
    };

    checkSpeaking();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    };
  }, [localStream, remoteStreams, userId, enabled, isMicMuted]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  return { localStream, remoteStreams, speakingPlayers, isMicMuted, toggleMic, error };
}
