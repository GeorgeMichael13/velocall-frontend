import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// These are pulled from your Render Environment Variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    // 1. DIAGNOSTIC KEY GUARD
    // This tells us exactly what Render "sees" in the logs
    console.log("--- RENDER ENVIRONMENT DIAGNOSTIC ---");
    console.log("Room requested:", room);
    console.log("Identity requested:", identity);
    console.log("LIVEKIT_API_KEY Found:", !!API_KEY);
    if (API_KEY) {
        console.log("API_KEY Prefix:", API_KEY.substring(0, 4) + "...");
    }
    console.log("-------------------------------------");

    // 2. CRITICAL CONFIG CHECK
    if (!API_KEY || !API_SECRET) {
      console.error("SERVER ERROR: LIVEKIT_API_KEY or SECRET is missing in Render settings.");
      return NextResponse.json(
        { error: "Server keys not configured. Check Render Environment tab." }, 
        { status: 500 }
      );
    }

    if (!room || !identity) {
      return NextResponse.json({ error: "Room and identity are required" }, { status: 400 });
    }

    // 3. INITIALIZE TOKEN
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      ttl: "1h", 
    });

    // 4. GRANT PERMISSIONS
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // 5. GENERATE AND SANITIZE
    // We await the JWT and then force it to a string type
    const resolvedToken = await at.toJwt();
    
    const tokenString = typeof resolvedToken === "string" 
      ? resolvedToken 
      : (resolvedToken as any).token || String(resolvedToken);

    // Final sanity check before sending
    if (!tokenString || tokenString.length < 20) {
       throw new Error("SDK generated an invalid or empty token string.");
    }

    console.log(`✅ Token successfully generated (Length: ${tokenString.length})`);

    return NextResponse.json({ token: tokenString });

  } catch (error: any) {
    console.error("❌ TOKEN GENERATION ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}