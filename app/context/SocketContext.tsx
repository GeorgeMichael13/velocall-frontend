"use client";

import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext<any>(null);

const socket: Socket = io("https://velocall-backend.onrender.com");

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export const ContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState("");
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Screen Sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Reactions
  const [raisedHand, setRaisedHand] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // ====================== GET USER MEDIA ======================
  useEffect(() => {
    let isMounted = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        if (!isMounted) return;
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
          myVideo.current.play().catch(console.warn);
        }
      })
      .catch((err) => console.error("Failed to get media stream:", err));

    return () => { isMounted = false; };
  }, []);

  // ====================== SOCKET SETUP ======================
  useEffect(() => {
    socket.on("me", (id: string) => {
      setMe(id);
      const urlParams = new URLSearchParams(window.location.search);
      const rId = urlParams.get("id");
      if (rId) {
        setRoomId(rId);
        socket.emit("join-room", rId);
      }
    });

    socket.on("user-joined", (newUserSocketId: string) => {
      // CRITICAL: Re-added timeout. Without this, the handshake fails 90% of the time on mobile/slow networks.
      setTimeout(() => {
        callUser(newUserSocketId);
      }, 1000);
    });

    socket.on("callUser", ({ from, signal }: any) => {
      answerCall(signal, from);
    });

    socket.on("callAccepted", (signal: any) => {
      setCallAccepted(true);
      if (connectionRef.current) {
        connectionRef.current.signal(signal);
      }
    });

    socket.on("messageReceived", (msg: any) => {
      setMessages((prev) => [
        ...prev,
        { ...msg, time: new Date().toLocaleTimeString(), isLocal: msg.from === me },
      ]);
    });

    socket.on("codeUpdate", (newCode: string) => setCode(newCode));

    socket.on("reaction", (data: any) => {
      window.dispatchEvent(new CustomEvent("receiveReaction", { detail: data }));
    });

    socket.on("callEnded", () => leaveCall());

    return () => {
      socket.off("me");
      socket.off("user-joined");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("messageReceived");
      socket.off("codeUpdate");
      socket.off("reaction");
      socket.off("callEnded");
    };
  }, [me, stream]); // Added stream as dependency

  // ====================== CALL USER ======================
  const callUser = useCallback((id: string) => {
    if (!stream) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: { iceServers },
    });

    setOtherUser(id);

    peer.on("signal", (data: any) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name,
      });
    });

    peer.on("stream", (remoteStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.on("error", (err: any) => console.error("Peer error:", err));

    connectionRef.current = peer;
  }, [stream, me, name]);

  // ====================== ANSWER CALL ======================
  const answerCall = useCallback((signal: any, from: string) => {
    if (!stream) return;

    setCallAccepted(true);
    setOtherUser(from);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: { iceServers },
    });

    peer.on("signal", (data: any) => {
      socket.emit("answerCall", { signal: data, to: from });
    });

    peer.on("stream", (remoteStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.on("error", (err: any) => console.error("Peer error:", err));

    peer.signal(signal);
    connectionRef.current = peer;
  }, [stream]);

  // ====================== LEAVE CALL ======================
  const leaveCall = useCallback(() => {
    socket.emit("leaveCall", { to: otherUser });

    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((track) => track.stop());

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setRaisedHand(false);
    setCallAccepted(false);
    setCallEnded(true);
    setOtherUser("");
    window.location.reload(); // Hard reset to ensure media is released
  }, [stream, otherUser]);

  // ====================== TOGGLE MUTE / CAMERA ======================
  const toggleMute = useCallback(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const newMuted = !isMuted;
      audioTrack.enabled = !newMuted;
      setIsMuted(newMuted);
    }
  }, [stream, isMuted]);

  const toggleCamera = useCallback(() => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !isCameraOff;
      videoTrack.enabled = !newState;
      setIsCameraOff(newState);
    }
  }, [stream, isCameraOff]);

  // ====================== SCREEN SHARING ======================
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (stream) {
      stream.getVideoTracks().forEach((track) => (track.enabled = true));
    }

    if (connectionRef.current && stream) {
      const videoSender = connectionRef.current._pc
        .getSenders()
        .find((sender: any) => sender.track?.kind === "video");

      if (videoSender) {
        const cameraTrack = stream.getVideoTracks()[0];
        if (cameraTrack) videoSender.replaceTrack(cameraTrack);
      }
    }
    setIsScreenSharing(false);
  }, [stream]);

  const toggleScreenShare = useCallback(async () => {
    if (!connectionRef.current || !stream) {
      alert("Wait for the connection to establish before sharing.");
      return;
    }

    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: false,
        });

        screenStreamRef.current = displayStream;

        const videoSender = connectionRef.current._pc
          .getSenders()
          .find((sender: any) => sender.track?.kind === "video");

        if (videoSender) {
          const screenTrack = displayStream.getVideoTracks()[0];
          await videoSender.replaceTrack(screenTrack);
          stream.getVideoTracks().forEach((track) => (track.enabled = false));
        }

        setIsScreenSharing(true);
        displayStream.getVideoTracks()[0].onended = () => stopScreenShare();
      } else {
        stopScreenShare();
      }
    } catch (err: any) {
      console.error("Screen share error:", err);
    }
  }, [isScreenSharing, stream, stopScreenShare]);

  // ====================== REACTIONS ======================
  const sendReaction = useCallback((emoji: string) => {
    if (!roomId) return;
    socket.emit("reaction", { type: "emoji", emoji, from: me, roomId });
  }, [roomId, me]);

  const toggleRaiseHand = useCallback(() => {
    const newState = !raisedHand;
    setRaisedHand(newState);
    if (!roomId) return;
    socket.emit("reaction", { type: "raisehand", emoji: "✋", from: me, roomId });
  }, [raisedHand, roomId, me]);

  return (
    <SocketContext.Provider
      value={{
        myVideo,
        userVideo,
        callAccepted,
        callEnded,
        me,
        name,
        setName,
        stream,
        callUser,
        answerCall,
        leaveCall,
        createNewRoom: () => {
          const rId = Math.random().toString(36).substring(2, 10);
          setRoomId(rId);
          socket.emit("join-room", rId);
          window.history.replaceState({}, "", `?id=${rId}`);
        },
        messages,
        sendMessage: (text: string) => {
          socket.emit("sendMessage", { text, from: me, name: name || "Anonymous", roomId });
        },
        code,
        updateCode: (newCode: string) => {
          setCode(newCode);
          socket.emit("codeUpdate", { code: newCode, roomId });
        },
        isMuted,
        toggleMute,
        isCameraOff,
        toggleCamera,
        isScreenSharing,
        toggleScreenShare,
        raisedHand,
        toggleRaiseHand,
        sendReaction,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);