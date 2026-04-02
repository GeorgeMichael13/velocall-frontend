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

  // ==================== NEW: SCREEN SHARING STATES ====================
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);
  const currentPeerRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null); // NEW

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
  }, [me]);

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

  // ====================== CALL USER ======================
  const callUser = useCallback((id: string) => {
    if (!stream || !Peer) return;

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

    // NEW: Clean up screen sharing on leave
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    setCallAccepted(false);
    setCallEnded(true);
    setCall({});
    setOtherUser("");
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

  // ====================== NEW: TOGGLE SCREEN SHARE ======================
  const toggleScreenShare = useCallback(async () => {
    if (!connectionRef.current || !stream) {
      console.warn("No active peer connection or stream");
      return;
    }

    try {
      if (!isScreenSharing) {
        // Start Screen Sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });

        screenStreamRef.current = displayStream;

        // Replace video track in the peer connection
        const videoSender = connectionRef.current._pc
          .getSenders()
          .find((sender: any) => sender.track?.kind === "video");

        if (videoSender) {
          const screenTrack = displayStream.getVideoTracks()[0];
          await videoSender.replaceTrack(screenTrack);

          // Disable camera track while sharing screen
          stream.getVideoTracks().forEach((track) => (track.enabled = false));
        }

        setIsScreenSharing(true);

        // Auto stop when user clicks "Stop sharing" in browser UI
        displayStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } else {
        // Stop Screen Sharing
        stopScreenShare();
      }
    } catch (err: any) {
      console.error("Screen share error:", err);
      if (err.name === "NotAllowedError") {
        alert("Screen sharing was cancelled or permission denied.");
      } else {
        alert("Failed to share screen. Please try again.");
      }
    }
  }, [isScreenSharing, stream]);

  // Helper function to stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Re-enable camera
    if (stream) {
      stream.getVideoTracks().forEach((track) => (track.enabled = true));
    }

    // Replace track back to camera
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

        // ==================== NEW VALUES ====================
        isScreenSharing,
        toggleScreenShare,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);