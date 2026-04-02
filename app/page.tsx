"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSocket } from "@/app/context/SocketContext";

import Lobby from "./lobby/page";
import VideoGrid from "../components/VideoGrid";   // Make sure path is correct
import Sidebar from "../components/Sidebar";
import RightPanel from "../components/RightPanel";

function HomeContent() {
  const { roomName, isConnected, leaveRoom } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isInMeeting, setIsInMeeting] = useState(false);

  useEffect(() => {
    const meetingId = searchParams.get("id");

    if (meetingId && isConnected) {
      setIsInMeeting(true);
    } else {
      setIsInMeeting(false);
    }
  }, [searchParams, isConnected]);

  // If not in a meeting → show Lobby
  if (!isInMeeting || !roomName) {
    return <Lobby />;
  }

  // Meeting View
  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#050505] text-white select-none">
      <Sidebar />

      <section className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
          <VideoGrid key="active-call-grid" />
        </div>

        {/* Bottom Controls can be moved inside VideoGrid if you prefer */}
      </section>

      <RightPanel />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="bg-[#050505] h-screen w-full flex items-center justify-center text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}