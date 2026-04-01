"use client";

import React, { useState } from "react";
import {
  LayoutGrid,
  Video,
  MessageSquare,
  Settings,
  Power,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/app/context/SocketContext";

const menuItems = [
  { id: "dashboard", icon: LayoutGrid, label: "Dashboard" },
  { id: "room", icon: Video, label: "Active Room" },
  { id: "chat", icon: MessageSquare, label: "Messages" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { me, leaveCall } = useSocket();
  const [active, setActive] = useState("room");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!me) return;
    navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-20 h-screen bg-[#0A0A0A] border-r border-white/5 flex flex-col items-center py-8 z-50">
      {/* 1. App Logo / Status Indicator */}
      <div className="mb-12 relative">
        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        {me && (
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0A]"
            title="Connected"
          />
        )}
      </div>

      {/* 2. Primary Navigation */}
      <nav className="flex-1 flex flex-col gap-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="group relative flex items-center justify-center p-3"
          >
            {active === item.id && (
              <div className="absolute left-0 w-1 h-6 bg-red-600 rounded-r-full" />
            )}
            <item.icon
              className={cn(
                "w-6 h-6 transition-colors",
                active === item.id
                  ? "text-white"
                  : "text-white/30 group-hover:text-white/70",
              )}
            />

            {/* Tooltip */}
            <div className="absolute left-16 px-2 py-1 rounded bg-white text-black text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap uppercase tracking-wider">
              {item.label}
            </div>
          </button>
        ))}
      </nav>

      {/* 3. Bottom Actions: ID Copy & Logout */}
      <div className="mt-auto flex flex-col items-center gap-6">
        {/* Connection ID Button */}
        <button
          onClick={handleCopy}
          className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
          title="Copy Your ID"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <Copy className="w-5 h-5" />
          )}
        </button>

        {/* Real Terminate Action */}
        <button
          onClick={leaveCall}
          className="p-3 rounded-xl bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all"
          title="Exit Session"
        >
          <Power className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
