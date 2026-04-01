"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import VideoGrid from "../components/VideoGrid";
import Controls from "../components/Controls";
import RightPanel from "../components/RightPanel";
import Lobby from "./lobby/page";
import { useSocket } from "@/app/context/SocketContext";

function HomeContent() {
  const { callEnded } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter(); // Added for stable navigation
  const [isInMeeting, setIsInMeeting] = useState(false);

  useEffect(() => {
    const meetingId = searchParams.get("id");

    // NEW LOGIC: Using a stable check to prevent the render loop
    // This ensures we only toggle state when a concrete change happens
    if (meetingId && !callEnded) {
      if (!isInMeeting) setIsInMeeting(true);
    } else {
      if (isInMeeting) setIsInMeeting(false);

      // Clean URL via Next.js router if call ended to prevent manual history glitches
      if (callEnded && meetingId) {
        router.replace("/", { scroll: false });
      }
    }
  }, [searchParams, callEnded, isInMeeting, router]);

  // 1. LOBBY VIEW
  if (!isInMeeting) {
    return <Lobby />;
  }

  // 2. MEETING VIEW
  return (
    <main className="flex h-screen w-full overflow-hidden bg-velo-dark text-white select-none">
      <Sidebar />

      <section className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
          {/* Keyed to prevent flickering - helps React track the video state better */}
          <VideoGrid key="active-call-grid" />
        </div>

        <div className="absolute bottom-8 left-0 w-full flex justify-center z-50">
          <Controls />
        </div>
      </section>

      <RightPanel />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="bg-[#050505] h-screen w-full" />}>
      <HomeContent />
    </Suspense>
  );
}
