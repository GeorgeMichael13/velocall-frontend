"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://velocall-backend.onrender.com";

type LiveKitContextType = {
  roomName: string | null;
  joinRoom: (room: string) => Promise<void>;
  leaveRoom: () => void;
  leaveCall: () => void;
  isConnected: boolean;
  isJoining: boolean;
  me: string;
  myVideo: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  shareScreen: () => void;
  sendReaction: (emoji: string) => void;
  toggleRaiseHand: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  raisedHand: boolean;
  messages: any[];
  sendMessage: (text: string) => void;
  code: string;
  updateCode: (newCode: string) => void;
};

const LiveKitContext = createContext<LiveKitContextType | null>(null);

export const LiveKitProvider = ({ children }: { children: ReactNode }) => {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState("");

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");

  const myVideo = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMe(`user_${Math.floor(Math.random() * 10000)}`);

    async function getMedia() {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      } catch (err) {
        console.error("Failed to get local stream", err);
      }
    }
    getMedia();
  }, []);

  const joinRoom = async (room: string) => {
    if (isJoining) return;
    setIsJoining(true);

    try {
      console.log(`🔄 Requesting token for room: ${room}, identity: ${me}`);

      const response = await fetch(`${BACKEND_URL}/api/livekit-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, identity: me }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      let actualToken: string | null = null;

      if (typeof data === "string") {
        actualToken = data;
        console.log("✅ Received token as plain string");
      } else if (data && typeof data.token === "string") {
        actualToken = data.token;
        console.log("✅ Received token inside { token: '...' } object");
      } else if (data && typeof data === "object") {
        for (const key in data) {
          if (typeof data[key] === "string" && data[key].startsWith("ey")) {
            actualToken = data[key];
            console.log(`✅ Found JWT string in object key: ${key}`);
            break;
          }
        }
      }

      if (actualToken && actualToken.startsWith("ey")) {
        setToken(actualToken);
        setRoomName(room);
        console.log("🎉 Token successfully validated and set! Length:", actualToken.length);
      } else {
        console.error("❌ Failed to extract valid token. Received data:", data);
        alert("Token generation failed. Please check Render logs and console.");
      }
    } catch (error: any) {
      console.error("❌ Join room error:", error.message);
      alert(`Failed to join room: ${error.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  const leaveRoom = () => {
    setRoomName(null);
    setToken(null);
    setIsScreenSharing(false);
    setRaisedHand(false);
    setMessages([]);
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => (track.enabled = isMuted));
      setIsMuted((prev) => !prev);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => (track.enabled = isCameraOff));
      setIsCameraOff((prev) => !prev);
    }
  };

  const toggleScreenShare = () => setIsScreenSharing((prev) => !prev);
  const sendReaction = (emoji: string) => console.log("Reaction sent:", emoji);
  const toggleRaiseHand = () => setRaisedHand((prev) => !prev);

  const sendMessage = (text: string) => {
    if (!roomName) return;
    const newMsg = {
      text,
      from: "me",
      name: "You",
      time: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const updateCode = (newCode: string) => setCode(newCode);

  return (
    <LiveKitContext.Provider
      value={{
        roomName,
        joinRoom,
        leaveRoom,
        leaveCall: leaveRoom,
        isConnected: !!roomName && !!token,
        isJoining,
        me,
        myVideo,
        stream,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        shareScreen: toggleScreenShare,
        sendReaction,
        toggleRaiseHand,
        isMuted,
        isCameraOff,
        isScreenSharing,
        raisedHand,
        messages,
        sendMessage,
        code,
        updateCode,
      }}
    >
      {roomName && token ? (
        <LiveKitRoom
          token={token}
          serverUrl={
            process.env.NEXT_PUBLIC_LIVEKIT_URL ||
            "wss://velocall-8pvaplej.livekit.cloud"
          }
          connect={true}
          audio={!isMuted}
          video={!isCameraOff}
          onConnected={() => console.log("🚀 LiveKit Room Connected!")}
          onDisconnected={() => console.log("🔌 LiveKit Room Disconnected")}
          onError={(e) => console.error("🔥 LiveKit Connection Error:", e)}
        >
          {children}
        </LiveKitRoom>
      ) : (
        children
      )}
    </LiveKitContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(LiveKitContext);
  if (!context)
    throw new Error("useSocket must be used within LiveKitProvider");
  return context;
};
