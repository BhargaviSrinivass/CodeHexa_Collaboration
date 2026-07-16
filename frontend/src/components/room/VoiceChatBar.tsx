import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { Button } from "../ui";

interface VoiceChatBarProps {
  roomId: string;
  socket: Socket | null;
  userId?: string;
  autoJoin?: boolean;
  onLeave: () => void;
  onOpenSettings: () => void;
  isLocked?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

type PeerState = {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
};

/**
 * Mesh WebRTC voice with:
 * - Perfect negotiation (glare-safe)
 * - ICE buffering
 * - Autoplay unlock via Speakers button
 * - No teardown on temporary "disconnected"
 */
export function VoiceChatBar({
  roomId,
  socket,
  userId,
  autoJoin,
  onLeave,
  onOpenSettings,
  isLocked,
  onSpeakingChange,
}: VoiceChatBarProps) {
  const [micOn, setMicOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "idle">("idle");
  const [needsSoundUnlock, setNeedsSoundUnlock] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animRef = useRef<number>(0);
  const micOnRef = useRef(false);
  const mutedRef = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  micOnRef.current = micOn;
  mutedRef.current = muted;

  const updatePeerCount = () => setConnectedPeers(peersRef.current.size);

  const cleanupPeer = useCallback((peerId: string) => {
    const state = peersRef.current.get(peerId);
    if (state) {
      try {
        state.pc.close();
      } catch {
        /* ignore */
      }
      peersRef.current.delete(peerId);
      updatePeerCount();
    }
    document.getElementById(`voice-audio-${peerId}`)?.remove();
  }, []);

  const playRemoteAudio = async (audio: HTMLAudioElement) => {
    audio.muted = mutedRef.current;
    try {
      await audio.play();
      setNeedsSoundUnlock(false);
      return true;
    } catch {
      setNeedsSoundUnlock(true);
      setStatus("Click 🔊 Speakers On to hear others (browser blocked autoplay)");
      return false;
    }
  };

  const ensureAudioEl = (peerId: string, stream: MediaStream) => {
    let audio = document.getElementById(`voice-audio-${peerId}`) as HTMLAudioElement | null;
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `voice-audio-${peerId}`;
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      // Must NOT use display:none — some browsers won't play audio in hidden trees
      audio.style.cssText =
        "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;bottom:0;";
      (audioContainerRef.current || document.body).appendChild(audio);
    }
    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }
    void playRemoteAudio(audio);
  };

  const unlockAllRemoteAudio = async () => {
    // Resume AudioContext if suspended
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume().catch(() => {});
    }
    const nodes = audioContainerRef.current?.querySelectorAll("audio") || [];
    let any = false;
    for (const node of Array.from(nodes)) {
      const ok = await playRemoteAudio(node as HTMLAudioElement);
      if (ok) any = true;
    }
    // Also try any voice audio attached to body
    document.querySelectorAll('audio[id^="voice-audio-"]').forEach((el) => {
      void playRemoteAudio(el as HTMLAudioElement);
    });
    if (any || nodes.length === 0) {
      setNeedsSoundUnlock(false);
      setMuted(false);
      setStatus(connectedPeers > 0 ? "Speakers on — listening" : "Speakers on");
    }
  };

  const flushIce = async (peerId: string) => {
    const state = peersRef.current.get(peerId);
    if (!state || !state.pc.remoteDescription) return;
    const pending = [...state.pendingIce];
    state.pendingIce = [];
    for (const c of pending) {
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore */
      }
    }
  };

  const getOrCreatePeer = useCallback(
    (peerId: string): PeerState | null => {
      if (!socket || peerId === userIdRef.current) return null;
      let state = peersRef.current.get(peerId);
      if (state) return state;

      const polite = (userIdRef.current || "") > peerId;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      state = { pc, pendingIce: [], polite, makingOffer: false, ignoreOffer: false };
      peersRef.current.set(peerId, state);
      updatePeerCount();

      // Ensure we can receive audio even before remote adds a track
      if (pc.getTransceivers().every((t) => t.receiver.track?.kind !== "audio")) {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } catch {
          /* older browsers */
        }
      }

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
          if (sender) {
            void sender.replaceTrack(track);
          } else {
            pc.addTrack(track, localStreamRef.current);
          }
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc-ice", {
            roomId,
            targetUserId: peerId,
            candidate: e.candidate.toJSON(),
            kind: "voice",
          });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0] || new MediaStream([e.track]);
        e.track.onunmute = () => ensureAudioEl(peerId, stream);
        ensureAudioEl(peerId, stream);
        setStatus(`Receiving audio · ${peersRef.current.size} peer(s)`);
        setConnectionState("connected");
      };

      pc.onnegotiationneeded = async () => {
        const s = peersRef.current.get(peerId);
        if (!s || !micOnRef.current) return;
        try {
          s.makingOffer = true;
          await pc.setLocalDescription(await pc.createOffer());
          socket.emit("webrtc-offer", {
            roomId,
            targetUserId: peerId,
            sdp: pc.localDescription,
            kind: "voice",
          });
        } catch (err) {
          console.warn("negotiationneeded failed", err);
        } finally {
          s.makingOffer = false;
        }
      };

      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        if (cs === "connected") {
          setStatus(`Voice connected · ${peersRef.current.size} peer(s)`);
          setConnectionState("connected");
        } else if (cs === "connecting") {
          setConnectionState("connecting");
        } else if (cs === "failed") {
          // Try ICE restart instead of tearing down immediately
          pc.restartIce();
          setStatus("Voice reconnecting…");
          setConnectionState("connecting");
          setTimeout(() => {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
              cleanupPeer(peerId);
              // Re-initiate if still in voice
              if (micOnRef.current && localStreamRef.current) {
                void connectToPeerRef.current?.(peerId);
              }
            }
          }, 2500);
        } else if (cs === "closed") {
          cleanupPeer(peerId);
        }
        // Do NOT cleanup on "disconnected" — it is often temporary
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionState("connected");
        }
      };

      return state;
    },
    [socket, roomId, cleanupPeer]
  );

  const connectToPeerRef = useRef<((peerId: string) => Promise<void>) | null>(null);

  const connectToPeer = useCallback(
    async (peerId: string) => {
      const state = getOrCreatePeer(peerId);
      if (!state || !socket || !localStreamRef.current) return;
      // Only impolite peer (or first joiner path) should force-offer; polite waits for remote
      // But joiner must initiate — always try; perfect negotiation handles glare
      try {
        state.makingOffer = true;
        await state.pc.setLocalDescription(await state.pc.createOffer());
        socket.emit("webrtc-offer", {
          roomId,
          targetUserId: peerId,
          sdp: state.pc.localDescription,
          kind: "voice",
        });
      } catch (err) {
        console.warn("connectToPeer failed", err);
      } finally {
        state.makingOffer = false;
      }
    },
    [getOrCreatePeer, socket, roomId]
  );
  connectToPeerRef.current = connectToPeer;

  useEffect(() => {
    if (!socket) return;

    const isVoice = (kind?: string) => !kind || kind === "voice";

    const onOffer = async (data: {
      fromUserId: string;
      targetUserId: string;
      sdp: RTCSessionDescriptionInit;
      kind?: string;
    }) => {
      if (!isVoice(data.kind)) return;
      if (data.targetUserId !== userIdRef.current) return;
      if (!micOnRef.current) return;

      const state = getOrCreatePeer(data.fromUserId);
      if (!state) return;
      const pc = state.pc;

      const offerCollision = state.makingOffer || pc.signalingState !== "stable";
      state.ignoreOffer = !state.polite && offerCollision;
      if (state.ignoreOffer) return;

      try {
        await pc.setRemoteDescription(data.sdp);
        await flushIce(data.fromUserId);

        if (localStreamRef.current) {
          for (const track of localStreamRef.current.getTracks()) {
            const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
            if (sender && !sender.track) {
              await sender.replaceTrack(track);
            } else if (!sender) {
              pc.addTrack(track, localStreamRef.current);
            }
          }
        }

        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit("webrtc-answer", {
          roomId,
          targetUserId: data.fromUserId,
          sdp: pc.localDescription,
          kind: "voice",
        });
      } catch (err) {
        console.warn("onOffer failed", err);
      }
    };

    const onAnswer = async (data: {
      fromUserId: string;
      targetUserId: string;
      sdp: RTCSessionDescriptionInit;
      kind?: string;
    }) => {
      if (!isVoice(data.kind)) return;
      if (data.targetUserId !== userIdRef.current) return;
      const state = peersRef.current.get(data.fromUserId);
      if (!state) return;
      try {
        if (state.pc.signalingState === "have-local-offer") {
          await state.pc.setRemoteDescription(data.sdp);
          await flushIce(data.fromUserId);
        }
      } catch (err) {
        console.warn("onAnswer failed", err);
      }
    };

    const onIce = async (data: {
      fromUserId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
      kind?: string;
    }) => {
      if (!isVoice(data.kind)) return;
      if (data.targetUserId !== userIdRef.current) return;
      const state = peersRef.current.get(data.fromUserId);
      if (!state) return;
      if (!state.pc.remoteDescription) {
        state.pendingIce.push(data.candidate);
        return;
      }
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        /* ignore */
      }
    };

    const onPeers = async (data: { peers: string[] }) => {
      for (const peerId of data.peers || []) {
        await connectToPeer(peerId);
      }
      if ((data.peers || []).length === 0) {
        setStatus("Mic on — waiting for others to join voice");
      } else {
        setStatus(`Connecting to ${data.peers.length} peer(s)…`);
      }
    };

    const onReady = async (data: { userId: string }) => {
      if (!micOnRef.current || data.userId === userIdRef.current) return;
      if (!peersRef.current.has(data.userId)) {
        await connectToPeer(data.userId);
      }
    };

    const onVoiceLeft = (data: { userId: string }) => cleanupPeer(data.userId);
    const onUserLeft = (data: { userId: string }) => cleanupPeer(data.userId);

    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);
    socket.on("voice-peers", onPeers);
    socket.on("voice-ready", onReady);
    socket.on("voice-left", onVoiceLeft);
    socket.on("participant-left", onUserLeft);
    socket.on("user-left", onUserLeft);

    return () => {
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
      socket.off("voice-peers", onPeers);
      socket.off("voice-ready", onReady);
      socket.off("voice-left", onVoiceLeft);
      socket.off("participant-left", onUserLeft);
      socket.off("user-left", onUserLeft);
    };
  }, [socket, roomId, getOrCreatePeer, connectToPeer, cleanupPeer]);

  useEffect(() => {
    document.querySelectorAll('audio[id^="voice-audio-"]').forEach((a) => {
      (a as HTMLAudioElement).muted = muted;
    });
  }, [muted]);

  const startMic = async () => {
    setError("");
    setStatus("Requesting microphone…");
    setConnectionState("connecting");
    try {
      if (!window.isSecureContext && location.hostname !== "localhost") {
        setError("Voice needs HTTPS or localhost");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      setMicOn(true);
      micOnRef.current = true;
      onSpeakingChange?.(true);

      // Unlock speakers as part of the same user gesture
      setMuted(false);
      await unlockAllRemoteAudio();

      try {
        const ctx = new AudioContext();
        await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((s, v) => s + v, 0) / data.length;
          setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          const speaking = avg > 18;
          socket?.emit("voice-state", { roomId, speaking, micOn: true });
          animRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        socket?.emit("voice-state", { roomId, speaking: true, micOn: true });
      }

      socket?.emit("voice-join", { roomId });
      setStatus("Mic on — connecting…");
    } catch (err) {
      console.error(err);
      setError("Microphone blocked — allow mic for this site in browser settings");
      setMicOn(false);
      micOnRef.current = false;
      setStatus("");
      setConnectionState("idle");
    }
  };

  useEffect(() => {
    if (autoJoin && socket && !micOnRef.current) {
      startMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, socket, roomId]);

  const stopMic = () => {
    cancelAnimationFrame(animRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setVolumeLevel(0);
    setConnectionState("idle");
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    for (const [id] of peersRef.current) cleanupPeer(id);
    setMicOn(false);
    micOnRef.current = false;
    onSpeakingChange?.(false);
    socket?.emit("voice-state", { roomId, speaking: false, micOn: false });
    socket?.emit("voice-leave", { roomId });
    setStatus("");
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      for (const [, s] of peersRef.current) s.pc.close();
      peersRef.current.clear();
      document.querySelectorAll('audio[id^="voice-audio-"]').forEach((a) => a.remove());
      if (socket && micOnRef.current) {
        socket.emit("voice-leave", { roomId });
        socket.emit("voice-state", { roomId, speaking: false, micOn: false });
      }
    };
  }, [socket, roomId]);

  const onSpeakersClick = async () => {
    if (muted) {
      // Turning speakers ON — unlock autoplay
      setMuted(false);
      await unlockAllRemoteAudio();
    } else {
      setMuted(true);
      setStatus("Speakers muted");
    }
  };

  return (
    <div className="flex flex-col border-t border-border bg-bg-secondary">
      {error && (
        <div className="bg-error/10 px-4 py-1 text-center text-xs text-error">{error}</div>
      )}
      {!error && (status || needsSoundUnlock) && (
        <div
          className={`px-4 py-1 text-center text-xs ${
            needsSoundUnlock ? "bg-warning/15 text-warning" : "bg-bg-tertiary/50 text-text-secondary"
          }`}
        >
          {needsSoundUnlock
            ? "Click 🔊 Speakers On to hear the other person (browser blocked autoplay)"
            : status}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-3">
        <Button
          size="sm"
          variant={muted || needsSoundUnlock ? "primary" : "secondary"}
          onClick={onSpeakersClick}
          title="Enable / mute remote audio"
        >
          {muted ? "🔇 Speakers Off" : "🔊 Speakers On"}
        </Button>
        <Button
          size="sm"
          variant={micOn ? "primary" : "secondary"}
          onClick={() => (micOn ? stopMic() : startMic())}
          title="Toggle microphone"
        >
          {micOn ? "🎤 Mic On" : "🎤 Mic Off"}
        </Button>
        {micOn && (
          <>
            <span className="text-xs text-success">
              {connectedPeers > 0
                ? `Linked to ${connectedPeers} peer${connectedPeers === 1 ? "" : "s"}`
                : "Waiting for peers…"}
            </span>
            <div className="flex items-center gap-1" title="Mic volume">
              <span className="text-[10px] text-text-secondary">Vol</span>
              <div className="h-2 w-16 overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
            </div>
            <span
              className={`text-[10px] ${
                connectionState === "connected"
                  ? "text-success"
                  : connectionState === "connecting"
                    ? "text-warning"
                    : "text-text-secondary"
              }`}
            >
              {connectionState === "connected"
                ? "● Connected"
                : connectionState === "connecting"
                  ? "◌ Connecting"
                  : "○ Idle"}
            </span>
          </>
        )}
        <Button size="sm" variant="secondary" onClick={onOpenSettings}>
          ⚙️ Settings {isLocked ? "🔒" : ""}
        </Button>
        <Button size="sm" variant="ghost" onClick={onLeave} className="text-error hover:text-error">
          Leave Room
        </Button>
      </div>
      {/* Visually hidden but NOT display:none — required for remote audio playback */}
      <div
        ref={audioContainerRef}
        className="pointer-events-none fixed bottom-0 left-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden
      />
    </div>
  );
}
