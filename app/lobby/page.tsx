"use client";

import React, { useState, useEffect } from "react";
import { useSocket } from "@/app/context/SocketContext";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Calendar,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Lobby() {
  const {
    me,
    toggleMute,
    isMuted,
    toggleCamera,
    isCameraOff,
    myVideo,
    stream,
  } = useSocket();

  const [idToCall, setIdToCall] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Auto-attach video stream to the preview
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, myVideo]);

  const copyId = () => {
    if (!me) return;
    navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    if (!me) return;
    // UPDATED: Points to the root URL since your project uses app/page.tsx logic
    const link = `${window.location.origin}/?id=${me}`;
    navigator.clipboard.writeText(link);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* 1. BRANDING */}
      <div className="absolute top-10 flex items-center gap-2 animate-bounce">
        <Zap className="text-yellow-400 w-4 h-4 fill-yellow-400" />
        <h1 className="text-sm font-black tracking-[0.4em] uppercase bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
          Velocall
        </h1>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        {/* Left: Device Preview & "Start" Actions */}
        <div className="space-y-8">
          <div className="relative aspect-video w-full bg-[#0A0A0A] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group">
            <video
              playsInline
              ref={userVideo}
              autoPlay
              style={{ width: "100%", height: "100%" }}
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]">
                <VideoOff className="text-white/10" size={48} />
              </div>
            )}

            {/* Quick Toggle Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg ${isMuted ? "bg-red-500" : "hover:bg-white/10"}`}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-lg ${isCameraOff ? "bg-red-500" : "hover:bg-white/10"}`}
              >
                {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* UPDATED: Path points to /?id= */}
            <Link
              href={me ? `/?id=${me}` : "#"}
              className={cn(
                "flex items-center justify-center gap-3 bg-red-600 py-4 rounded-2xl font-bold transition-all",
                !me && "opacity-50 cursor-not-allowed",
              )}
            >
              <Plus size={20} /> {me ? "New Meeting" : "Connecting..."}
            </Link>
            <button
              onClick={copyInviteLink}
              className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
            >
              {inviteCopied ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <Calendar size={20} />
              )}
              {inviteCopied ? "Link Copied" : "Get Link for Later"}
            </button>
          </div>
        </div>

        {/* Right: Join Logic */}
        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter leading-tight">
              Premium Video Calls. <br />
              <span className="text-red-600">Now Free for Everyone.</span>
            </h1>
            <p className="text-white/40 text-lg">
              Enter a code or link below to join a secure, encrypted channel.
            </p>
          </div>

          <div className="space-y-6">
            {/* Join via ID Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Enter a code or link"
                value={idToCall}
                onChange={(e) => setIdToCall(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-4 text-xl focus:outline-none focus:border-red-600 transition-colors placeholder:text-white/10"
              />
              {/* UPDATED: Path points to /?id= */}
              <Link
                href={`/?id=${idToCall}`}
                className={`absolute right-0 bottom-3 font-bold text-sm uppercase tracking-widest transition-opacity ${idToCall ? "opacity-100" : "opacity-20 pointer-events-none"}`}
              >
                Join
              </Link>
            </div>

            {/* Display Personal ID for Quick Sharing */}
            <div className="pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">
                  Your Meeting ID
                </p>
                <p className="font-mono text-white/60">
                  {me || "Initializing..."}
                </p>
              </div>
              <button
                onClick={copyId}
                className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric Backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 blur-[180px] pointer-events-none" />
    </main>
  );
}
