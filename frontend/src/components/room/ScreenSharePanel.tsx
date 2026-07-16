import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { Button } from "../ui";

interface ScreenSharePanelProps {
  roomId: string;
  socket: Socket | null;
  userId?: string;
  sharerId?: string | null;
  sharerName?: string;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function ScreenSharePanel({
  roomId,
  socket,
  userId,
  sharerId,
  sharerName,
}: ScreenSharePanelProps) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
  }, []);

  const stopSharing = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    for (const [id] of peersRef.current) cleanupPeer(id);
    setSharing(false);
    if (videoRef.current) videoRef.current.srcObject = null;
    socket?.emit("screen-share-stop", { roomId });
  }, [socket, roomId, cleanupPeer]);

  const startSharing = async (displaySurface?: "monitor" | "browser") => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: displaySurface || undefined,
        } as MediaTrackConstraints,
        audio: false,
      });
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }
      setSharing(true);
      socket?.emit("screen-share-start", { roomId });

      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopSharing());
    } catch (err) {
      setError("Screen share cancelled or blocked");
      console.warn(err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onOffer = async (data: {
      fromUserId: string;
      targetUserId: string;
      sdp: RTCSessionDescriptionInit;
      kind?: string;
    }) => {
      if (data.kind !== "screen" || data.targetUserId !== userIdRef.current) return;

      let pc = peersRef.current.get(data.fromUserId);
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current.set(data.fromUserId, pc);
        pc.ontrack = (e) => {
          const stream = e.streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            void remoteVideoRef.current.play();
          }
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc-ice", {
              roomId,
              targetUserId: data.fromUserId,
              candidate: e.candidate.toJSON(),
            });
          }
        };
      }
      await pc.setRemoteDescription(data.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", {
        roomId,
        targetUserId: data.fromUserId,
        sdp: pc.localDescription,
      });
    };

    const onAnswer = async (data: {
      fromUserId: string;
      targetUserId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (data.targetUserId !== userIdRef.current) return;
      const pc = peersRef.current.get(data.fromUserId);
      if (pc && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(data.sdp);
      }
    };

    const onIce = async (data: {
      fromUserId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (data.targetUserId !== userIdRef.current) return;
      const pc = peersRef.current.get(data.fromUserId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          /* ignore */
        }
      }
    };

    const onShareStart = async (data: { userId: string }) => {
      if (data.userId === userIdRef.current || !sharing) return;
      // Viewer receives — sharer will send offers when they detect viewers
    };

    const onShareStop = (data: { userId: string }) => {
      cleanupPeer(data.userId);
      if (remoteVideoRef.current && sharerId === data.userId) {
        remoteVideoRef.current.srcObject = null;
      }
    };

    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);
    socket.on("screen-share-start", onShareStart);
    socket.on("screen-share-stop", onShareStop);

    return () => {
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
      socket.off("screen-share-start", onShareStart);
      socket.off("screen-share-stop", onShareStop);
    };
  }, [socket, roomId, sharing, cleanupPeer, sharerId]);

  // When sharing, broadcast screen to room via mesh offers
  useEffect(() => {
    if (!sharing || !socket || !localStreamRef.current) return;

    const broadcast = async (targetUserId: string) => {
      if (targetUserId === userIdRef.current) return;
      let pc = peersRef.current.get(targetUserId);
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current.set(targetUserId, pc);
        for (const track of localStreamRef.current!.getTracks()) {
          pc.addTrack(track, localStreamRef.current!);
        }
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc-ice", {
              roomId,
              targetUserId,
              candidate: e.candidate.toJSON(),
            });
          }
        };
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", {
        roomId,
        targetUserId,
        sdp: pc.localDescription,
        kind: "screen",
      });
    };

    const onReady = (data: { userId: string }) => broadcast(data.userId);
    const onJoined = (data: { user?: { id: string } }) => {
      if (data.user?.id) broadcast(data.user.id);
    };

    socket.on("voice-ready", onReady);
    socket.on("participant-joined", onJoined);
    socket.on("user-joined", onJoined);

    return () => {
      socket.off("voice-ready", onReady);
      socket.off("participant-joined", onJoined);
      socket.off("user-joined", onJoined);
    };
  }, [sharing, socket, roomId]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      for (const [, pc] of peersRef.current) pc.close();
    };
  }, []);

  const isRemote = sharerId && sharerId !== userId;

  return (
    <div className="border-b border-border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Screen Share
      </h3>
      {error && <p className="mb-2 text-xs text-error">{error}</p>}
      {isRemote && (
        <div className="mb-2">
          <p className="mb-1 text-xs text-warning">
            {sharerName || "Someone"} is sharing
          </p>
          <video
            ref={remoteVideoRef}
            className="max-h-32 w-full rounded border border-border bg-black"
            autoPlay
            playsInline
            muted
          />
        </div>
      )}
      {sharing && (
        <video
          ref={videoRef}
          className="mb-2 max-h-24 w-full rounded border border-border bg-black"
          autoPlay
          playsInline
          muted
        />
      )}
      <div className="flex flex-wrap gap-2">
        {!sharing ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => startSharing("monitor")}>
              Share Screen
            </Button>
            <Button size="sm" variant="secondary" onClick={() => startSharing("browser")}>
              Share Tab
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="text-error" onClick={stopSharing}>
            Stop Sharing
          </Button>
        )}
      </div>
    </div>
  );
}
