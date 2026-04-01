"use client";

import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useContext,
} from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

const SocketContext = createContext<any>(null);

// --- UPDATED FOR DEPLOYMENT ---
const socket = io("https://velocall-backend.onrender.com");

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

export const ContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState("");
  const [call, setCall] = useState<any>({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [view, setView] = useState("room");
  const [roomId, setRoomId] = useState(""); // Track the current Room ID

  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [Peer, setPeer] = useState<any>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);

  // Helper function to handle answering (used for auto-answer)
  const handleIncomingCall = (incomingSignal: any, from: string) => {
    if (!Peer) return;

    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: { iceServers },
    });

    peer.on("signal", (data: any) =>
      socket.emit("answerCall", { signal: data, to: from }),
    );

   peer.on("stream", (remoteStream: MediaStream) => {
  console.log("Remote stream received!");
  if (userVideo.current) {
    userVideo.current.srcObject = remoteStream;
    // Force the video to play
    userVideo.current.play().catch(e => console.error("Error playing video:", e));
  }
});

    peer.signal(incomingSignal);
    connectionRef.current = peer;
  };

  useEffect(() => {
    // @ts-ignore - Suppresses TypeScript error for missing type definitions in production build
    import("simple-peer").then((module) => {
      const PeerConstructor = module.default;
      setPeer(() => PeerConstructor);
      console.log("Peer library loaded successfully");
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    socket.on("me", (id) => {
      setMe(id);

      const urlParams = new URLSearchParams(window.location.search);
      let rId = urlParams.get("id");

      if (!rId) {
        rId = Math.random().toString(36).substring(2, 10);
        const newUrl = `${window.location.pathname}?id=${rId}`;
        window.history.replaceState(null, "", newUrl);
      }

      setRoomId(rId);
      socket.emit("join-room", rId);
    });

    socket.on("user-joined", (newUserSocketId) => {
      console.log("New user detected in room:", newUserSocketId);
      setTimeout(() => {
        callUser(newUserSocketId);
      }, 1000);
    });

    // --- UPDATED FOR AUTO-ANSWER ---
    socket.on("callUser", ({ from, name: callerName, signal }) => {
      console.log("Receiving call from:", from);
      setCall({ isReceivingCall: true, from, name: callerName, signal });
      setOtherUser(from);

      // Auto-answer logic: If we receive a call signal, answer it automatically after 1 second
      setTimeout(() => {
        console.log("Auto-answering call...");
        // We call the logic directly here to ensure the state is fresh
        if (Peer && !callAccepted) {
          setCallAccepted(true);
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream, // Use the stream from state
            config: { iceServers },
          });

          peer.on("signal", (data: any) =>
            socket.emit("answerCall", { signal: data, to: from }),
          );

          peer.on("stream", (remoteStream: MediaStream) => {
            if (userVideo.current) {
              userVideo.current.srcObject = remoteStream;
            }
          });

          peer.signal(signal);
          connectionRef.current = peer;
        }
      }, 1500);
    });

    socket.on("messageReceived", (msg) => {
      const msgWithTime = {
        ...msg,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isLocal: msg.from === me,
      };
      setMessages((prev) => [...prev, msgWithTime]);
    });

    socket.on("codeUpdate", (newCode) => setCode(newCode));

    socket.on("callEnded", () => {
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      setCallEnded(true);
      window.location.reload();
    });

    return () => {
      socket.off("me");
      socket.off("user-joined");
      socket.off("callUser");
      socket.off("messageReceived");
      socket.off("codeUpdate");
    };
  }, [me, Peer, stream]); // Added Peer and stream to dependencies for safety

  const sendMessage = (text: string) => {
    const msgData = {
      text,
      from: me,
      name: name || "Anonymous",
      roomId: roomId,
    };
    socket.emit("sendMessage", msgData);
  };

  const updateCode = (newCode: string) => {
    setCode(newCode);
    socket.emit("codeUpdate", { code: newCode, roomId: roomId });
  };

  const toggleMute = () => {
    if (stream) {
      const newState = !isMuted;
      stream.getAudioTracks()[0].enabled = !newState;
      setIsMuted(newState);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const newState = !isCameraOff;
      stream.getVideoTracks()[0].enabled = !newState;
      setIsCameraOff(newState);
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await (
        navigator.mediaDevices as any
      ).getDisplayMedia({
        cursor: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      if (connectionRef.current) {
        connectionRef.current.replaceTrack(
          stream?.getVideoTracks()[0],
          screenTrack,
          stream,
        );
      }

      screenTrack.onended = () => {
        if (connectionRef.current) {
          connectionRef.current.replaceTrack(
            screenTrack,
            stream?.getVideoTracks()[0],
            stream,
          );
        }
      };
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  const answerCall = () => {
    if (!Peer || !call.signal)
      return console.error("Peer library or signal missing");

    try {
      setCallAccepted(true);
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream,
        config: { iceServers },
      });

      peer.on("signal", (data: any) =>
        socket.emit("answerCall", { signal: data, to: call.from }),
      );

      peer.on("stream", (remoteStream: MediaStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      peer.signal(call.signal);
      connectionRef.current = peer;
    } catch (err) {
      console.error("Error answering call:", err);
    }
  };

  const callUser = (id: string) => {
    if (!Peer) return console.warn("Waiting for Peer library...");

    try {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
        config: { iceServers },
      });
      setOtherUser(id);

      peer.on("signal", (data: any) =>
        socket.emit("callUser", {
          userToCall: id,
          signalData: data,
          from: me,
          name,
        }),
      );

      peer.on("stream", (remoteStream: MediaStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      socket.on("callAccepted", (signal) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } catch (err) {
      console.error("Error calling user:", err);
    }
  };

  const leaveCall = () => {
    socket.emit("leaveCall", { to: otherUser });

    if (connectionRef.current) {
      connectionRef.current.destroy();
    }

    setCallEnded(true);
    window.location.href = "/";
  };

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
        leaveCall,
        answerCall,
        messages,
        sendMessage,
        code,
        updateCode,
        isMuted,
        toggleMute,
        isCameraOff,
        toggleCamera,
        shareScreen,
        view,
        setView,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
