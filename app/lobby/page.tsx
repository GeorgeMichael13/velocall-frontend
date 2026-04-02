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
  Zap,
  Calendar,
  Plus,
  ArrowRight,
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
    createNewRoom,
  } = useSocket();

  const [idToCall, setIdToCall] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Attach stream to local video (with natural mirror)
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
      // Force play in case it was paused
      myVideo.current.play().catch(() => {});
    }
  }, [stream]);

  const copyId = () => {
    if (!me) return;
    navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyInviteLink = () => {
    if (!me) return;
    const link = `${window.location.origin}/?id=${me}`;
    navigator.clipboard.writeText(link);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 1800);
  };

  const handleCreateMeeting = async () => {
    setIsLoading(true);
    createNewRoom();
    // Small delay for better UX feedback
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,rgba(185,28,28,0.08)_0%,transparent_50%)]" />

      <div className="absolute top-10 flex items-center gap-2 animate-bounce z-20">
        <Zap className="text-yellow-400 w-5 h-5 fill-yellow-400" />
        <h1 className="text-lg font-black tracking-[0.5em] uppercase bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
          VELOCALL
        </h1>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 mt-12">
        {/* === LEFT: VIDEO PREVIEW === */}
        <div className="space-y-8">
          <div className="relative aspect-video w-full bg-[#0A0A0A] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
            <video
              ref={myVideo}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: "scaleX(-1)",        // ← NATURAL SELFIE MIRROR
                WebkitTransform: "scaleX(-1)",
              }}
            />

            {/* Camera Off Overlay */}
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/90">
                <div className="text-center">
                  <VideoOff className="mx-auto text-white/20 mb-3" size={64} />
                  <p className="text-white/40 text-sm">Camera is off</p>
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 bg-black/70 backdrop-blur-2xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <button
                onClick={toggleMute}
                className={cn(
                  "p-3.5 rounded-xl transition-all",
                  isMuted 
                    ? "bg-red-500/90 text-white hover:bg-red-600" 
                    : "bg-white/10 hover:bg-white/20 text-white"
                )}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button
                onClick={toggleCamera}
                className={cn(
                  "p-3.5 rounded-xl transition-all",
                  isCameraOff 
                    ? "bg-red-500/90 text-white hover:bg-red-600" 
                    : "bg-white/10 hover:bg-white/20 text-white"
                )}
              >
                {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            </div>

            {/* "LIVE" Indicator */}
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium tracking-widest uppercase">LIVE PREVIEW</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleCreateMeeting}
              disabled={!me || isLoading}
              className={cn(
                "flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.985]",
                (!me || isLoading) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>Connecting...</>
              ) : (
                <>
                  <Plus size={24} /> New Instant Meeting
                </>
              )}
            </button>

            <button
              onClick={copyInviteLink}
              disabled={!me}
              className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-semibold transition-all text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {inviteCopied ? (
                <>
                  <Check size={22} className="text-green-500" /> Link Copied
                </>
              ) : (
                <>
                  <Calendar size={22} /> Get Link for Later
                </>
              )}
            </button>
          </div>
        </div>

        {/* === RIGHT: JOIN & INFO === */}
        <div className="space-y-10">
          <div>
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-4">
              Video calls,<br />
              <span className="text-red-600">instantly.</span>
            </h1>
            <p className="text-white/50 text-xl max-w-md">
              Fast, secure, and beautiful video meetings. No sign-up required.
            </p>
          </div>

          {/* Join Section */}
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Paste meeting code or link"
                value={idToCall}
                onChange={(e) => setIdToCall(e.target.value.trim())}
                className="w-full bg-[#111] border border-white/10 focus:border-red-600 rounded-2xl px-6 py-5 text-lg placeholder:text-white/30 focus:outline-none transition-all"
              />
              <Link
                href={idToCall ? `/?id=${idToCall}` : "#"}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-red-600 hover:bg-red-700 px-8 py-3 rounded-xl font-semibold transition-all",
                  !idToCall && "opacity-40 pointer-events-none"
                )}
              >
                Join <ArrowRight size={20} />
              </Link>
            </div>

            {/* Your Meeting ID */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.1em] text-white/40 font-medium">
                  YOUR MEETING ID
                </p>
                <button
                  onClick={copyId}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
              <p className="font-mono text-2xl tracking-widest text-white/80 break-all">
                {me || "••••••••"}
              </p>
            </div>
          </div>

          <p className="text-white/30 text-sm text-center lg:text-left">
            Powered by WebRTC • End-to-end encrypted
          </p>
        </div>
      </div>
    </main>
  );
}