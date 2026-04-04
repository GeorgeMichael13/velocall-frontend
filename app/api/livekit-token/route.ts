import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// These are pulled from your Render Environment Variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    console.log("--- RENDER ENVIRONMENT DIAGNOSTIC ---");
    console.log("Room:", room, "Identity:", identity);
    console.log("LIVEKIT_API_KEY present:", !!API_KEY);
    console.log("-------------------------------------");

    if (!API_KEY || !API_SECRET) {
      console.error("SERVER ERROR: LIVEKIT_API_KEY or LIVEKIT_API_SECRET missing in Render env vars.");
      return NextResponse.json(
        { error: "Server keys not configured. Check Render Environment Variables." },
        { status: 500 }
      );
    }

    if (!room || !identity) {
      return NextResponse.json({ error: "Room and identity are required" }, { status: 400 });
    }

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      ttl: "1h",
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();   // This is always a string in v2.x

    console.log(`✅ Token generated successfully (length: ${token.length})`);

    // Return plain string — simplest and most reliable
    return NextResponse.json(token);

  } catch (error: any) {
    console.error("❌ TOKEN GENERATION ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}