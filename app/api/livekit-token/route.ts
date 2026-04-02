// app/api/livekit-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const { room, identity } = await request.json();

    if (!room || !identity) {
      return NextResponse.json({ error: "Room and identity are required" }, { status: 400 });
    }

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      ttl: "10m", // 10 minutes
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}