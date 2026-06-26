import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

  // Stabilize peerIds so the effect only re-runs when the actual list of peers changes
  const peerIdsKey = useMemo(() => [...peerIds].sort().join(','), [peerIds]);
  const stablePeerIds = useMemo(() => peerIds, [peerIdsKey]);

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

  // Handle peers — uses stablePeerIds so connections aren't torn down on every room update
  useEffect(() => {
    if (!enabled || !localStream || !roomId || !userId) return;

    const activePeers = new Set(stablePeerIds);

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

    stablePeerIds.forEach((peerId) => {
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
        let lastProcessedOfferSDP = "";

        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalDoc, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });
        }

        const unsub = onSnapshot(signalDoc, async (snapshot) => {
          const data = snapshot.data();
          if (!data) return;

          // Answerer processes the offer
          if (!isCaller && data.offer && pc.signalingState === "stable" && lastProcessedOfferSDP !== data.offer.sdp) {
            lastProcessedOfferSDP = data.offer.sdp;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, peerIdsKey, localStream, enabled]);

  // Audio analysis for speaking indicator
  useEffect(() => {
    if (!enabled) {
      setSpeakingPlayers({});
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const resumeAudio = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);

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
    
    // Remote streams are NOT passed to AudioContext to prevent Chrome from muting them.
    // Instead, we use getSynchronizationSources() on the peer connections.

    const checkSpeaking = () => {
      const newSpeaking: Record<string, boolean> = {};

      // 1. Check local stream via AudioContext
      if (analysers[userId] && dataArrays[userId]) {
        const analyser = analysers[userId];
        const dataArray = dataArrays[userId];
        analyser.getByteFrequencyData(dataArray as any);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        newSpeaking[userId] = average > 15;
      }

      // 2. Check remote streams via WebRTC getSynchronizationSources
      Object.entries(peerConnections.current).forEach(([pid, pc]) => {
        let isSpeakingNow = false;
        const receivers = pc.getReceivers();
        receivers.forEach(receiver => {
          if (receiver.track.kind === "audio" && receiver.getSynchronizationSources) {
            const sources = receiver.getSynchronizationSources();
            sources.forEach(source => {
              if (source.audioLevel !== undefined && source.audioLevel > 0.05) {
                isSpeakingNow = true;
              }
            });
          }
        });
        newSpeaking[pid] = isSpeakingNow;
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
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
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
