"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Code2,
  MessageSquare,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/app/context/SocketContext";

export default function RightPanel() {
  const { messages, sendMessage, code, updateCode, me } = useSocket();
  const [activeTab, setActiveTab] = useState<"chat" | "code">("chat");
  const [chatInput, setChatInput] = useState(""); // Dedicated Chat Input
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, activeTab]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-96 h-screen border-l border-white/5 bg-[#080808] flex flex-col hidden xl:flex shadow-[-30px_0_60px_rgba(0,0,0,0.5)]">
      {/* 1. HEADER / TAB SWITCHER */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex bg-[#111] p-1 rounded-xl border border-white/5 w-full">
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-[10px] font-black uppercase tracking-[0.2em]",
              activeTab === "chat"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                : "text-white/20 hover:text-white/40",
            )}
          >
            <MessageSquare size={12} /> Chat
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-[10px] font-black uppercase tracking-[0.2em]",
              activeTab === "code"
                ? "bg-white text-black"
                : "text-white/20 hover:text-white/40",
            )}
          >
            <Code2 size={12} /> Editor
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC CONTENT AREA */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        {activeTab === "chat" ? (
          <div className="p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full mt-20 opacity-20">
                <Zap size={40} className="mb-4 text-red-500" />
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase">
                  No Logs Found
                </p>
              </div>
            ) : (
              messages.map((msg: any, index: number) => (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500",
                    msg.isLocal ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-[13px] leading-relaxed max-w-[85%] shadow-sm transition-all",
                      msg.isLocal
                        ? "bg-red-600/10 border border-red-600/20 text-white rounded-tr-none"
                        : "bg-[#111] border border-white/5 text-white/80 rounded-tl-none",
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-white/10 font-black uppercase tracking-widest px-1">
                    {msg.time} • {msg.isLocal ? "Self" : "Peer"}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* REAL-TIME COLLABORATIVE EDITOR */
          <div className="h-full flex flex-col p-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-white/40 font-black tracking-widest uppercase">
                  Live Workspace
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="p-2 bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                {copied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            <div className="flex-1 bg-[#0D0D0D] rounded-3xl p-6 border border-white/5 font-mono text-[12px] leading-[1.8] text-red-400/80 shadow-inner group">
              <textarea
                value={code}
                onChange={(e) => updateCode(e.target.value)}
                className="w-full h-full bg-transparent outline-none resize-none custom-scrollbar placeholder:text-white/5"
                placeholder="// Start technical assessment..."
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. PREMIUM CHAT INPUT */}
      {activeTab === "chat" && (
        <div className="p-6 bg-[#080808] border-t border-white/5">
          <div className="relative group flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Type message..."
              className="flex-1 bg-[#111] border border-white/5 rounded-2xl py-4 px-6 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-red-600/30 transition-all focus:bg-[#151515]"
            />
            <button
              onClick={handleSendChat}
              className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:scale-105 active:scale-95 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
