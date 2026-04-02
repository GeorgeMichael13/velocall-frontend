"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  LiveKitRoom, 
  useLocalParticipant, 
  useParticipants, 
  useTrack, 
  useTracks 
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

type LiveKitContextType = {
  roomName: string | null;
  joinRoom: (room: string) => Promise<void>;
  leaveRoom: () => void;
  isConnected: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  sendReaction: (emoji: string) => void;
  toggleRaiseHand: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  raisedHand: boolean;
  participants: any[];
  localParticipant: any;
};

const LiveKitContext = createContext<LiveKitContextType | null>(null);

export const LiveKitProvider = ({ children }: { children: ReactNode }) => {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl] = useState("wss://velocall-8pvaplej.livekit.cloud"); // ← CHANGE THIS

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);

  // Join Room
  const joinRoom = async (room: string) => {
    const identity = `user_${Date.now()}`;

    // TODO: Call your backend to generate token
    const response = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, identity }),
    });

    const data = await response.json();
    setToken(data.token);
    setRoomName(room);
  };

  const leaveRoom = () => {
    setRoomName(null);
    setToken(null);
    setIsScreenSharing(false);
    setRaisedHand(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleCamera = () => setIsCameraOff(!isCameraOff);
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing);

  const sendReaction = (emoji: string) => {
    console.log("Reaction:", emoji);
    // You can implement real reaction broadcasting later using LiveKit's data channel
  };

  const toggleRaiseHand = () => setRaisedHand(!raisedHand);

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
        participants: [], // Will be filled by LiveKit hooks
        localParticipant: null,
      }}
    >
      {roomName && token ? (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={true}
          style={{ height: "100vh" }}
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
  if (!context) throw new Error("useSocket must be used inside LiveKitProvider");
  return context;
};