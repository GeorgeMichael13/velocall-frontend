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
  const { callEnded } = useSocket(); // Pull callEnded to handle exit logic
  const searchParams = useSearchParams();
  const [isInMeeting, setIsInMeeting] = useState(false);

  useEffect(() => {
    const meetingId = searchParams.get("id");

    // LOGIC: If there is an ID AND the call hasn't just ended, show the Meeting.
    // If the call HAS ended, we ignore the ID so the user can see the Lobby again.
    if (meetingId && !callEnded) {
      setIsInMeeting(true);
    } else {
      // No ID in URL or User just clicked "Leave"? Back to the Lobby.
      setIsInMeeting(false);

      // OPTIONAL: This cleans the URL in the browser bar when you leave
      if (
        typeof window !== "undefined" &&
        window.location.search &&
        callEnded
      ) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [searchParams, callEnded]);

  // 1. LOBBY VIEW: Show this if no meeting ID is present or call was ended
  if (!isInMeeting) {
    return <Lobby />;
  }

  // 2. MEETING VIEW: Show the full stage (Edge-to-edge UI)
  return (
    <main className="flex h-screen w-full overflow-hidden bg-velo-dark text-white select-none">
      {/* 1. Navigation Rail (Fixed left) */}
      <Sidebar />

      {/* 2. Main Stage (Center) */}
      <section className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle radial gradient for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* 3. The Functional Video Grid (Handles local/remote video logic) */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
          <VideoGrid />
        </div>

        {/* 4. The Functional Control Bar (Mute, Camera, Leave) */}
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
    <Suspense fallback={<div className="bg-[#050505] h-screen w-full" />}>
      <HomeContent />
    </Suspense>
  );
}
