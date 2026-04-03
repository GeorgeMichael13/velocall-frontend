"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  MoreVertical,
  Link2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/app/context/SocketContext";

export default function Controls() {
  const {
    isMuted,
    toggleMute,
    isCameraOff,
    toggleCamera,
    leaveCall,
    shareScreen,
    me,
  } = useSocket();

  const [copied, setCopied] = useState(false);

  const copyInviteLink = async () => {
    if (!me) {
      console.error("User identity not ready");
      return;
    }

    try {
      const inviteUrl = `${window.location.origin}/?id=${me}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#111]/80 backdrop-blur-2xl px-6 py-3 rounded-[2.5rem] flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10">
        {/* Invite Button */}
        <button
          onClick={copyInviteLink}
          disabled={!me}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-300 border border-white/5",
            !me && "opacity-50 cursor-not-allowed",
            copied
              ? "bg-green-500/20 text-green-500"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
          )}
          title={me ? "Copy Meeting Link" : "Initializing..."}
        >
          {copied ? <Check size={18} /> : <Link2 size={18} />}
          <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">
            {copied ? "Copied" : "Invite"}
          </span>
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        {/* Mic Toggle */}
        <button
          onClick={toggleMute}
          className={cn(
            "p-4 rounded-full transition-all duration-300",
            isMuted
              ? "bg-red-500/20 text-red-500"
              : "bg-white/5 text-white hover:bg-white/10",
          )}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          className={cn(
            "p-4 rounded-full transition-all duration-300",
            isCameraOff
              ? "bg-red-500/20 text-red-500"
              : "bg-white/5 text-white hover:bg-white/10",
          )}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Screen Share */}
        <button
          onClick={shareScreen}
          className="p-4 rounded-full bg-white/5 text-blue-400 hover:bg-blue-400/10 transition-all"
        >
          <ScreenShare size={20} />
        </button>

        {/* End Call */}
        <button
          onClick={() => {
            leaveCall();
            window.location.href = "/";
          }}
          className="mx-2 p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all transform hover:scale-110 active:scale-95"
        >
          <PhoneOff size={24} fill="currentColor" />
        </button>

        {/* More Options */}
        <button className="p-4 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
}
