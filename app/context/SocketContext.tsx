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
    const identity = me || `user_${Date.now()}`;
    console.log(`DEBUG: Attempting to join room: ${room} as ${identity}`);

    try {
      // Added Cache-Buster v=${Date.now()} to prevent stale responses
      const response = await fetch(
        `${BACKEND_URL}/api/livekit-token?v=${Date.now()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, identity }),
        },
      );

      const data = await response.json();
      console.log("DEBUG: Raw response from backend:", data);

      // STRICTURE CHECK: Prevents [object Object] by verifying type
      if (data && typeof data.token === "string") {
        console.log(
          "DEBUG: Token successfully received and verified as string.",
        );
        setToken(data.token);
        setRoomName(room);
      } else {
        console.error(
          "DEBUG ERROR: Backend returned something other than a string token:",
          data,
        );
        alert(`Token Error: Received ${typeof data.token}. Check console.`);
      }
    } catch (error) {
      console.error("DEBUG ERROR: Fetch failed entirely:", error);
      alert("Could not connect to the backend server. Check your BACKEND_URL.");
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
      {/* CRITICAL DEBUG: If token is "[object Object]", the wss:// connection will fail.
          The check above in joinRoom is designed to stop that before it happens.
      */}
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
