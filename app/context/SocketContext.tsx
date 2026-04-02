"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";

type LiveKitContextType = {
  roomName: string | null;
  joinRoom: (room: string) => Promise<void>;
  leaveRoom: () => void;
  isConnected: boolean;

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

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");

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

  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleCamera = () => setIsCameraOff((prev) => !prev);
  const toggleScreenShare = () => setIsScreenSharing((prev) => !prev);

  const sendReaction = (emoji: string) => {
    console.log("Reaction sent:", emoji);
    // Can be enhanced with LiveKit data channels later
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

  const updateCode = (newCode: string) => {
    setCode(newCode);
  };

  return (
    <LiveKitContext.Provider
      value={{
        roomName,
        joinRoom,
        leaveRoom,
        isConnected: !!roomName && !!token,
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