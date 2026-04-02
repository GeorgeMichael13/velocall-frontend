"use client";

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";

// 1. Updated Type Definition to include missing build properties
type LiveKitContextType = {
  roomName: string | null;
  joinRoom: (room: string) => Promise<void>;
  leaveRoom: () => void;
  isConnected: boolean;

  // Media Refs & Streams (Fixed for the 'lobby' build error)
  myVideo: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;

  // Old features preserved
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  sendReaction: (emoji: string) => void;
  toggleRaiseHand: () => void;

  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  raisedHand: boolean;

  // Messages & Code Editor (preserved)
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

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");

  const myVideo = useRef<HTMLVideoElement | null>(null);

  // 2. Initialize local media so 'myVideo' works in the Lobby
  useEffect(() => {
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
    const identity = `user_${Date.now()}`;
    try {
      const response = await fetch("https://velocall-backend.onrender.com/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, identity }),
      });

      const data = await response.json();

      if (data.token) {
        setToken(data.token);
        setRoomName(room);
      } else {
        alert("Failed to join room. Please try again.");
      }
    } catch (error) {
      console.error("Join room error:", error);
      alert("Could not connect to server. Please check your connection.");
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
      stream.getAudioTracks().forEach(track => track.enabled = isMuted);
      setIsMuted((prev) => !prev);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = isCameraOff);
      setIsCameraOff((prev) => !prev);
    }
  };

  const toggleScreenShare = () => setIsScreenSharing((prev) => !prev);

  const sendReaction = (emoji: string) => {
    console.log("Reaction sent:", emoji);
  };

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
        isConnected: !!roomName && !!token,
        myVideo,
        stream,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
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
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
          connect={true}
          audio={true}
          video={true}
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
  if (!context) throw new Error("useSocket must be used within LiveKitProvider");
  return context;
};