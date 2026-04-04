import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// These MUST be set in your Render Environment Variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    // 1. Critical Config Check
    if (!API_KEY || !API_SECRET) {
      console.error("SERVER ERROR: LIVEKIT_API_KEY or SECRET is not defined.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!room || !identity) {
      return NextResponse.json({ error: "Room and identity are required" }, { status: 400 });
    }

    // 2. Initialize AccessToken
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      ttl: "1h", 
    });

    // 3. Set Permissions
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // 4. Generate and Sanitize Token
    const rawToken = await at.toJwt();
    
    /**
     * PERMANENT FIX: 
     * Some SDK versions return an object { token: "..." } instead of a string.
     * This logic extracts the string so the frontend always gets a flat value.
     */
    const finalToken = typeof rawToken === 'string' ? rawToken : (rawToken as any).token;

    console.log(`✅ Token generated for ${identity} in room ${room}`);

    // 5. Return clean JSON
    return NextResponse.json({ token: finalToken });

  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}