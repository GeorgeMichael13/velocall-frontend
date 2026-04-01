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
    // @ts-ignore
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
      console.log("New user detected:", newUserSocketId);
      setTimeout(() => {
        callUser(newUserSocketId);
      }, 1000);
    });

    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
      setOtherUser(from);

      // AUTO-ANSWER LOGIC with Force-Play
      setTimeout(() => {
        if (Peer && !callAccepted && stream) {
          console.log("Auto-answering incoming stream...");
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
            console.log("Remote stream received in auto-answer");
            if (userVideo.current) {
              userVideo.current.srcObject = remoteStream;
              userVideo.current
                .play()
                .catch((e) => console.error("Playback error:", e));
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
      if (connectionRef.current) connectionRef.current.destroy();
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
  }, [me, Peer, stream]);

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

  const shareScreen = async () => {
    try {
      const screenStream = await (
        navigator.mediaDevices as any
      ).getDisplayMedia({ cursor: true });
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
      console.error("Screen share error:", error);
    }
  };

  const answerCall = () => {
    if (!Peer || !call.signal) return;
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
        userVideo.current.play().catch((e) => console.error(e));
      }
    });
    peer.signal(call.signal);
    connectionRef.current = peer;
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

  const leaveCall = () => {
    socket.emit("leaveCall", { to: otherUser });
    if (connectionRef.current) connectionRef.current.destroy();
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
