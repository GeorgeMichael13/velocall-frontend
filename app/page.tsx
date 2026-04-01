"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import VideoGrid from "../components/VideoGrid";
import Controls from "../components/Controls";
import RightPanel from "../components/RightPanel";
import Lobby from "./lobby/page";
import { useSocket } from "@/app/context/SocketContext";

// We wrap the content to handle the useSearchParams() hook safely in Next.js
function HomeContent() {
  const { callAccepted, callEnded, callUser, me } = useSocket();
  const searchParams = useSearchParams();
  const [isInMeeting, setIsInMeeting] = useState(false);

  useEffect(() => {
    const meetingId = searchParams.get("id");

    // If there's an ID in the URL and it's not OUR own ID, try to call it
    if (meetingId && meetingId !== me) {
      setIsInMeeting(true);
      if (!callAccepted && !callEnded) {
        callUser(meetingId);
      }
    } else if (meetingId === me) {
      // If the ID is ours, we are just "hosting" the room
      setIsInMeeting(true);
    } else {
      setIsInMeeting(false);
    }
  }, [searchParams, callAccepted, callEnded, callUser, me]);

  // 1. LOBBY VIEW: Show this if no meeting ID is present and no call is active
  if (!isInMeeting && !callAccepted) {
    return <Lobby />;
  }

  // 2. MEETING VIEW: Show the full stage
  return (
    <main className="flex h-screen w-full overflow-hidden bg-velo-dark text-white select-none">
      {/* 1. Navigation Rail */}
      <Sidebar />

      {/* 2. Main Stage */}
      <section className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle radial gradient for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* 3. The Functional Video Grid */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
          <VideoGrid />
        </div>

        {/* 4. The Functional Control Bar (Pill) */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center z-50">
          <Controls />
        </div>
      </section>

      {/* 5. Right Engagement Panel (Chat/Participants) */}
      <RightPanel />
    </main>
  );
}

// Final Export wrapped in Suspense (Required for useSearchParams in Next.js)
export default function Home() {
  return (
    <Suspense fallback={<div className="bg-black h-screen w-full" />}>
      <HomeContent />
    </Suspense>
  );
}
