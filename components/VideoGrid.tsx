"use client";

import React from "react";
import { VideoOff, Zap, LoaderCircle, UserPlus } from "lucide-react";
import { useSocket } from "@/app/context/SocketContext";
import { cn } from "@/lib/utils";

export default function VideoGrid() {
  const { myVideo, userVideo, callAccepted, callEnded, isCameraOff } =
    useSocket();

  return (
    <div className="relative flex-1 w-full h-screen bg-[#050505] overflow-hidden flex flex-col">
      {/* 1. THE ONLY TOP ELEMENT: ANIMATED VELOCALL PILL */}
      <header className="absolute top-6 left-0 w-full z-50 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 animate-bounce py-1.5 px-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Zap className="text-yellow-400 w-3 h-3 fill-yellow-400" />
          <h1 className="text-sm font-black tracking-[0.3em] uppercase bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">
            Velocall
          </h1>
          <Zap className="text-yellow-400 w-3 h-3 fill-yellow-400 rotate-180" />
        </div>
      </header>

      {/* 2. THE VIDEO GRID */}
      <div className="flex-1 w-full h-full p-4 flex flex-col md:flex-row gap-4 items-center justify-center">
        {/* LOCAL FEED */}
        <div
          className={cn(
            "relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 w-full aspect-video border border-white/5",
            callAccepted && !callEnded ? "flex-1 md:max-w-[50%]" : "max-w-5xl",
          )}
        >
          <video
            ref={myVideo}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              "scale-x-[-1]",
              isCameraOff ? "scale-110 opacity-0" : "scale-100 opacity-100",
            )}
          />

          {/* Privacy Overlay */}
          {isCameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D]">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <VideoOff className="text-white/20 w-6 h-6" />
              </div>
            </div>
          )}

          {/* User Name Badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">
              You
            </span>
          </div>
        </div>

        {/* REMOTE FEED OR WAITING STATE */}
        {callAccepted && !callEnded ? (
          <div className="relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl flex-1 md:max-w-[50%] aspect-video border border-white/5 animate-in fade-in zoom-in-95 duration-700">
            <video
              ref={userVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
              <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">
                Remote Peer
              </span>
            </div>
          </div>
        ) : (
          /* NEW FEATURE: WAITING ROOM UI (Only shows when hosting/waiting) */
          <div
            className={cn(
              "relative bg-white/[0.02] border border-dashed border-white/10 rounded-3xl flex-1 md:max-w-[50%] aspect-video flex flex-col items-center justify-center gap-4 transition-all duration-1000",
              // If we aren't in a call yet, we hide this to keep the "Lobby-style" look from your CSS
              "opacity-100 visible",
            )}
          >
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
              <p className="text-white/10 text-[9px]">
                Share your meeting link to start the conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. SUBTLE AMBIENT GRADIENT */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}
