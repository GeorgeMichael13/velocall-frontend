"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { VideoOff, Zap, LoaderCircle, UserPlus, MoreVertical, Hand } from "lucide-react";
import { useSocket } from "@/app/context/SocketContext";
import { cn } from "@/lib/utils";

export default function VideoGrid() {
  const { 
    myVideo, 
    userVideo, 
    callAccepted, 
    callEnded, 
    isCameraOff, 
    stream,
    isScreenSharing,
    toggleScreenShare,
    raisedHand,
    toggleRaiseHand,
    sendReaction 
  } = useSocket();

  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<any[]>([]);

  // Refs to prevent spamming .play()
  const localPlayAttempted = useRef(false);
  const remotePlayAttempted = useRef(false);

  const safePlay = useCallback((videoEl: HTMLVideoElement | null, isRemote = false) => {
    if (!videoEl) return;

    const attemptedRef = isRemote ? remotePlayAttempted : localPlayAttempted;

    // Only attempt play if not already attempted or if video is paused
    if (attemptedRef.current && !videoEl.paused) return;

    videoEl.play().catch((err: any) => {
      // Only log real errors, ignore AbortError which is common during stream changes
      if (err.name !== "AbortError" && err.name !== "NotAllowedError") {
        console.warn(`${isRemote ? "Remote" : "Local"} play error:`, err.name);
      }
    });

    attemptedRef.current = true;
  }, []);

  // Local Video
  useEffect(() => {
    const video = myVideo.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      localPlayAttempted.current = false;   // Reset when stream changes
    }

    safePlay(video, false);
  }, [stream, safePlay]);

  // Remote Video
  useEffect(() => {
    const video = userVideo.current;
    if (!video) return;

    // Reset play flag when call becomes active
    if (callAccepted) {
      remotePlayAttempted.current = false;
    }

    safePlay(video, true);
  }, [callAccepted, safePlay]);

  // Camera Toggle
  useEffect(() => {
    const video = myVideo.current;
    if (!video) return;

    if (isCameraOff) {
      video.pause();
      localPlayAttempted.current = false;
    } else {
      safePlay(video, false);
    }
  }, [isCameraOff, safePlay]);

  // Floating Reactions
  useEffect(() => {
    const handleReaction = (e: any) => {
      const { emoji } = e.detail || {};
      if (!emoji) return;

      const id = Date.now() + Math.random();
      setFloatingReactions(prev => [...prev, { id, emoji }]);

      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2800);
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

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-6xl animate-float-up"
            style={{
              left: `${Math.random() * 75 + 12.5}%`,
              bottom: "-50px",
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      <div className="flex-1 w-full h-full p-4 flex flex-col md:flex-row gap-4 items-center justify-center">
        {/* LOCAL FEED */}
        <div className={cn(
          "relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 w-full aspect-video border border-white/5",
          callAccepted && !callEnded ? "flex-1 md:max-w-[50%]" : "max-w-5xl"
        )}>
          <video
            ref={myVideo}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isCameraOff ? "opacity-0" : "opacity-100"
            )}
            style={{ transform: "scaleX(-1)", WebkitTransform: "scaleX(-1)" }}
          />

          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]">
              <VideoOff className="text-white/20" size={48} />
            </div>
          )}

          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">You</span>
          </div>

          {isScreenSharing && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 z-10">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              SCREEN SHARING
            </div>
          )}

          {/* Share Screen Button */}
          {callAccepted && !callEnded && (
            <button
              onClick={toggleScreenShare}
              className={cn(
                "absolute bottom-4 right-24 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all",
                isScreenSharing ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-white/20"
              )}
            >
              {isScreenSharing ? "Stop Sharing" : "Share Screen"}
            </button>
          )}

          {/* Options Button */}
          {callAccepted && !callEnded && (
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="absolute top-4 right-4 p-3 bg-black/70 hover:bg-black/90 rounded-2xl transition-all z-20"
            >
              <MoreVertical size={20} />
            </button>
          )}

          {/* Options Menu */}
          {showOptions && callAccepted && !callEnded && (
            <div className="absolute top-16 right-4 bg-[#111] border border-white/10 rounded-2xl p-2 w-56 shadow-2xl z-50">
              <button
                onClick={() => { toggleRaiseHand(); setShowOptions(false); }}
                className={cn("w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl", raisedHand && "text-yellow-400")}
              >
                <Hand size={20} /> {raisedHand ? "Lower Hand" : "Raise Hand"}
              </button>
              <button
                onClick={() => setShowEmojiPicker(true)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl"
              >
                😊 React
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute top-16 right-4 bg-[#111] border border-white/10 rounded-2xl p-4 flex gap-4 z-50">
              {commonEmojis.map(emoji => (
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
        </div>

        {/* REMOTE FEED */}
        {callAccepted && !callEnded ? (
          <div className="relative bg-[#111] rounded-3xl overflow-hidden shadow-2xl flex-1 md:max-w-[50%] aspect-video border border-white/5">
            <video
              ref={userVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
              <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">Remote Peer</span>
            </div>
          </div>
        ) : (
          <div className="relative bg-white/[0.02] border border-dashed border-white/10 rounded-3xl flex-1 md:max-w-[50%] aspect-video flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <UserPlus className="text-white/20 w-6 h-6" />
              </div>
              <LoaderCircle className="absolute -top-1 -right-1 text-red-500 w-5 h-5 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Waiting for others to join</p>
              <p className="text-white/10 text-[9px]">Share your meeting link</p>
            </div>
          </div>
        )}
      </div>

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