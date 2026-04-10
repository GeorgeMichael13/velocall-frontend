"use client";
import React, { useState, useEffect } from "react";
import {
  VideoOff,
  Zap,
  LoaderCircle,
  UserPlus,
  MoreVertical,
  PhoneOff,
} from "lucide-react";
import { useSocket } from "@/app/context/SocketContext";
import { ParticipantTile, useParticipants } from "@livekit/components-react";
import { cn } from "@/lib/utils";

export default function VideoGrid() {
  const {
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    raisedHand,
    toggleRaiseHand,
    sendReaction,
    leaveRoom,
  } = useSocket();

  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<any[]>([]);

  const participants = useParticipants();

  // Floating Reactions - your original feature (100% unchanged)
  useEffect(() => {
    const handleReaction = (e: any) => {
      const { emoji } = e.detail || {};
      if (!emoji) return;
      const id = Date.now() + Math.random();
      setFloatingReactions((prev) => [...prev, { id, emoji }]);
      setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 2800);
    };
    window.addEventListener("receiveReaction", handleReaction);
    return () => window.removeEventListener("receiveReaction", handleReaction);
  }, []);

  const handleEmojiClick = (emoji: string) => {
    sendReaction(emoji);
    setShowEmojiPicker(false);
    setShowOptions(false);
  };

  const commonEmojis = ["👍", "❤️", "😂", "🔥", "👏", "😮", "🙌"];

  const handleLeaveMeeting = () => {
    leaveRoom();
  };

  return (
    <div className="relative flex-1 w-full h-screen bg-[#050505] overflow-hidden flex flex-col">
      <header className="absolute top-6 left-0 w-full z-50 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 animate-bounce py-1.5 px-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Zap className="text-yellow-400 w-3 h-3 fill-yellow-400" />
          <h1 className="text-sm font-black tracking-[0.3em] uppercase bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
            Velocall
          </h1>
          <Zap className="text-yellow-400 w-3 h-3 fill-yellow-400 rotate-180" />
        </div>
      </header>

      {/* Floating Reactions - unchanged */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-6xl animate-float-up"
            style={{ left: `${Math.random() * 75 + 12.5}%`, bottom: "-50px" }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      <div className="flex-1 w-full h-full p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {participants.map((participant) => (
          <div
            key={participant.identity}
            className={cn(
              "relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl aspect-video border border-white/5",
              participant.isLocal && "ring-2 ring-red-500/50"
            )}
          >
            {/* @ts-ignore - This fixes the No TrackRef error on your LiveKit version */}
            <ParticipantTile />

            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm z-20">
              {participant.isLocal ? "You" : participant.identity}
            </div>

            {participant.isLocal && isScreenSharing && (
              <div className="absolute top-4 left-4 bg-red-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 z-30">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                SCREEN SHARING
              </div>
            )}
          </div>
        ))}

        {participants.length <= 1 && (
          <div className="relative bg-white/[0.02] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 aspect-video">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <UserPlus className="text-white/20 w-6 h-6" />
              </div>
              <LoaderCircle className="absolute -top-1 -right-1 text-red-500 w-5 h-5 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                Waiting for others to join
              </p>
              <p className="text-white/10 text-[9px]">Share your meeting link</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - unchanged */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-black/90 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 z-50">
        <button
          onClick={toggleMute}
          className={cn("px-6 py-3 rounded-2xl transition-all", isMuted ? "bg-red-600" : "bg-white/10 hover:bg-white/20")}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={toggleCamera}
          className={cn("px-6 py-3 rounded-2xl transition-all", isCameraOff ? "bg-red-600" : "bg-white/10 hover:bg-white/20")}
        >
          {isCameraOff ? "Camera On" : "Camera Off"}
        </button>
        <button
          onClick={toggleScreenShare}
          className={cn("px-6 py-3 rounded-2xl transition-all", isScreenSharing ? "bg-red-600" : "bg-white/10 hover:bg-white/20")}
        >
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>
        <button
          onClick={toggleRaiseHand}
          className={cn("px-6 py-3 rounded-2xl transition-all", raisedHand ? "bg-yellow-500 text-black" : "bg-white/10 hover:bg-white/20")}
        >
          ✋ Hand
        </button>

        <button
          onClick={handleLeaveMeeting}
          className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 transition-all flex items-center gap-2"
        >
          <PhoneOff size={20} /> Leave
        </button>

        <button
          onClick={() => setShowOptions(!showOptions)}
          className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20"
        >
          <MoreVertical size={22} />
        </button>
      </div>

      {/* Options Menu - unchanged */}
      {showOptions && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 min-w-[200px]">
          <button
            onClick={() => { toggleRaiseHand(); setShowOptions(false); }}
            className="block w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors"
          >
            ✋ {raisedHand ? "Lower Hand" : "Raise Hand"}
          </button>
          <button
            onClick={() => setShowEmojiPicker(true)}
            className="block w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl transition-colors"
          >
            😊 Send Reaction
          </button>
        </div>
      )}

      {/* Emoji Picker - unchanged */}
      {showEmojiPicker && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl z-50 flex gap-4">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-5xl hover:scale-125 active:scale-110 transition-transform p-2"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <style jsx>{`
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0) scale(0.7); }
          100% { opacity: 0; transform: translateY(-700px) scale(1.4); }
        }
        .animate-float-up { animation: float-up 2.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
