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
import Peer from "simple-peer"; // Import directly (better than dynamic import in most cases)

const SocketContext = createContext<any>(null);

const socket: Socket = io("https://velocall-backend.onrender.com");

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

export const ContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState("");
  const [call, setCall] = useState<any>({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);
  const currentPeerRef = useRef<any>(null); // Better tracking

  // ====================== GET USER MEDIA (run once) ======================
  useEffect(() => {
    let isMounted = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        if (!isMounted) {
          currentStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(currentStream);

        // Attach to local video (mirror handled in VideoGrid component)
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
          myVideo.current.play().catch(console.warn);
        }
      })
      .catch((err) => {
        console.error("Failed to get media stream:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []); // ← Empty dependency: run only once

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
      // Small delay to ensure stream is ready
      setTimeout(() => callUser(newUserSocketId), 800);
    });

    socket.on("callUser", ({ from, name: callerName, signal }: any) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
      setOtherUser(from);
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

    socket.on("callEnded", () => leaveCall());

    return () => {
      socket.off("me");
      socket.off("user-joined");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("messageReceived");
      socket.off("codeUpdate");
      socket.off("callEnded");
    };
  }, [me]); // me is safe here

  // ====================== ANSWER INCOMING CALL ======================
  const answerCall = useCallback(() => {
    if (!stream || !call.from) return;

    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: { iceServers },
    });

    peer.on("signal", (data: any) => {
      socket.emit("answerCall", { signal: data, to: call.from });
    });

    peer.on("stream", (remoteStream: MediaStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
        userVideo.current.play().catch(console.warn);
      }
    });

    peer.on("error", (err: any) => console.error("Peer error:", err));

    peer.signal(call.signal);
    connectionRef.current = peer;
    currentPeerRef.current = peer;
  }, [stream, call]);

  // Call this from your UI when user accepts the call
  // Example: <button onClick={answerCall}>Accept Call</button>

  // ====================== CALL USER ======================
  const callUser = useCallback((id: string) => {
    if (!stream || !Peer) return; // Peer is now imported directly

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
        userVideo.current.play().catch(console.warn);
      }
    });

    peer.on("error", (err: any) => console.error("Peer error:", err));

    connectionRef.current = peer;
    currentPeerRef.current = peer;
  }, [stream, me, name]);

  // ====================== LEAVE CALL ======================
  const leaveCall = useCallback(() => {
    socket.emit("leaveCall", { to: otherUser });

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if (currentPeerRef.current) {
      currentPeerRef.current.destroy();
      currentPeerRef.current = null;
    }

    setCallAccepted(false);
    setCallEnded(true);
    setCall({});
    setOtherUser("");

    // Optional: reload to clean everything
    // window.location.assign(window.location.origin);
  }, [stream, otherUser]);

  // ====================== TOGGLE MUTE / CAMERA (Improved) ======================
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

  // Note: For real camera switching (front ↔ back), you need to stop old tracks,
  // get a new stream with facingMode, then replaceTrack on the peer.
  // That's more advanced — let me know if you need it.

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        callUser,
        answerCall,        // ← Added: important!
        leaveCall,
        createNewRoom: () => {
          const rId = Math.random().toString(36).substring(2, 10);
          setRoomId(rId);
          socket.emit("join-room", rId);
          window.history.replaceState({}, "", `?id=${rId}`);
        },
        messages,
        sendMessage: (text: string) => {
          socket.emit("sendMessage", {
            text,
            from: me,
            name: name || "Anonymous",
            roomId,
          });
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
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);