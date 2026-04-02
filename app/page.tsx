"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSocket } from "@/app/context/SocketContext";

import Lobby from "./lobby/page";
import VideoGrid from "../components/VideoGrid";

function HomeContent() {
  const { roomName, isConnected } = useSocket();
  const searchParams = useSearchParams();

  const [isInMeeting, setIsInMeeting] = useState(false);

  useEffect(() => {
    const meetingId = searchParams.get("id");

    if (meetingId && isConnected && roomName) {
      setIsInMeeting(true);
    } else {
      setIsInMeeting(false);
    }
  }, [searchParams, isConnected, roomName]);

  // Show Lobby if not in meeting
  if (!isInMeeting || !roomName) {
    return <Lobby />;
  }

  // Meeting View
  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#050505] text-white select-none">
      {/* You can keep Sidebar and RightPanel if you want */}
      <section className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
          <VideoGrid key="active-call-grid" />
        </div>
      </section>
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