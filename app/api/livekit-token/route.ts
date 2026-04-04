import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// These MUST be set in your Render Environment Variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    // Check if variables are missing on the server
    if (!API_KEY || !API_SECRET) {
      console.error("SERVER ERROR: LIVEKIT_API_KEY or SECRET is not defined on Render.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!room || !identity) {
      return NextResponse.json({ error: "Room and identity are required" }, { status: 400 });
    }

    // Create the token
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      ttl: "1h", // Increased to 1 hour to prevent mid-call disconnects
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Convert to JWT string
    const token = await at.toJwt();

    // Return the token as a JSON object
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}