"use client";

import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useContext,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext<any>(null);

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
  const [roomId, setRoomId] = useState("");

  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [Peer, setPeer] = useState<any>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);

  useEffect(() => {
    // 1. Load Peer Library
    import("simple-peer").then((module) => {
      setPeer(() => module.default);
    });

    // 2. Get User Media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    // 3. Socket Listeners
    socket.on("me", (id) => {
      setMe(id);

      // LOGIC: Only join a room if an ID already exists (e.g. from an invite link)
      const urlParams = new URLSearchParams(window.location.search);
      const rId = urlParams.get("id");
      if (rId) {
        setRoomId(rId);
        socket.emit("join-room", rId);
      }
    });

    socket.on("user-joined", (newUserSocketId) => {
      setTimeout(() => {
        callUser(newUserSocketId);
      }, 1000);
    });

    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
      setOtherUser(from);

      setTimeout(() => {
        if (Peer && stream && !connectionRef.current) {
          setCallAccepted(true);
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
            config: { iceServers },
          });

          peer.on("signal", (data: any) =>
            socket.emit("answerCall", { signal: data, to: from }),
          );

          peer.on("stream", (remoteStream: MediaStream) => {
            if (userVideo.current) {
              userVideo.current.srcObject = remoteStream;
              userVideo.current.play().catch((e) => console.error(e));
            }
          });

          peer.signal(signal);
          connectionRef.current = peer;
        }
      }, 1500);
    });

    socket.on("messageReceived", (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          time: new Date().toLocaleTimeString(),
          isLocal: msg.from === me,
        },
      ]);
    });

    socket.on("codeUpdate", (newCode) => setCode(newCode));

    socket.on("callEnded", () => {
      leaveCall();
    });

    return () => {
      socket.off("me");
      socket.off("user-joined");
      socket.off("callUser");
      socket.off("messageReceived");
      socket.off("codeUpdate");
      socket.off("callEnded");
    };
  }, [Peer, stream]);

  // NEW: Manual Room Creation
  const createNewRoom = () => {
    const rId = Math.random().toString(36).substring(2, 10);
    setRoomId(rId);
    socket.emit("join-room", rId);
    // Explicitly navigate to the meeting URL
    window.location.search = `?id=${rId}`;
  };

  const leaveCall = () => {
    socket.emit("leaveCall", { to: otherUser });

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    setCallAccepted(false);
    setCallEnded(true);

    // Hard redirect to clear all state and URL params
    window.location.assign(window.location.origin);
  };

  const sendMessage = (text: string) => {
    socket.emit("sendMessage", {
      text,
      from: me,
      name: name || "Anonymous",
      roomId,
    });
  };

  const updateCode = (newCode: string) => {
    setCode(newCode);
    socket.emit("codeUpdate", { code: newCode, roomId });
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

  const callUser = (id: string) => {
    if (!Peer || !stream) return;
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
        userVideo.current.play().catch((e) => console.error(e));
      }
    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
    connectionRef.current = peer;
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
        createNewRoom, // This is essential for the Lobby
        messages,
        sendMessage,
        code,
        updateCode,
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
