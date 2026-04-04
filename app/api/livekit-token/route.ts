import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// These are pulled from your Render Environment Variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    console.log("--- LIVEKIT TOKEN REQUEST ---");
    console.log("Room:", room);
    console.log("Identity:", identity);
    console.log("LIVEKIT_API_KEY present:", !!API_KEY);
    console.log("LIVEKIT_API_SECRET present:", !!API_SECRET);
    console.log("-------------------------------------");

    if (!API_KEY || !API_SECRET) {
      console.error("SERVER ERROR: LIVEKIT_API_KEY or LIVEKIT_API_SECRET is missing in Render Environment Variables.");
      return NextResponse.json(
        { error: "Server keys not configured. Check Render Environment Variables." },
        { status: 500 }
      );
    }

    if (!room || !identity) {
      return NextResponse.json(
        { error: "Room and identity are required" },
        { status: 400 }
      );
    }

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      name: identity,        // Optional: shows a friendly name in LiveKit
      ttl: "1h",
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();   // This returns a clean string (JWT)

    console.log(`✅ Token generated successfully for ${identity} in room ${room}`);
    console.log(`✅ Token length: ${token.length}`);

    // Return plain string — this is the most reliable for @livekit/components-react
    return NextResponse.json(token);

  } catch (error: any) {
    console.error("❌ TOKEN GENERATION ERROR:", error.message);
    console.error(error.stack); // Helpful for debugging on Render

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}