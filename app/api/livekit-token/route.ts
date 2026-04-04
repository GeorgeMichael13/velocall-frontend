import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    if (!API_KEY || !API_SECRET) {
      return NextResponse.json({ error: "Keys missing" }, { status: 500 });
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
    });

    // 1. Generate the JWT
    const tokenPromise = at.toJwt();
    const resolvedToken = await tokenPromise;

    // 2. THE CRITICAL FIX: Explicitly cast to string. 
    // If resolvedToken is an object, this extracts the nested string.
    const tokenString = typeof resolvedToken === "string" 
      ? resolvedToken 
      : (resolvedToken as any).token || String(resolvedToken);

    // 3. Debugging: This will show up in your Render Dashboard logs
    console.log(`Generated Token Length: ${tokenString.length}`);
    console.log(`Token starts with: ${tokenString.substring(0, 10)}...`);

    if (!tokenString || tokenString.length < 10) {
       throw new Error("Generated token is too short or invalid.");
    }

    return NextResponse.json({ token: tokenString });
  } catch (error: any) {
    console.error("Token Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}