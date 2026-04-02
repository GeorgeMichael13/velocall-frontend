const express = require("express");
const http = require("http");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
const server = http.createServer(app);

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("VeloCall LiveKit Server is running.");
});

app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy.");
});

// ====================== LIVEKIT TOKEN GENERATOR ======================
app.post("/api/livekit-token", (req, res) => {
  const { room, identity } = req.body;

  if (!room || !identity) {
    return res.status(400).json({ error: "room and identity are required" });
  }

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: identity,
        ttl: "60m", // 60 minutes
      }
    );

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();

    console.log(`Token generated for room: ${room}, identity: ${identity}`);
    res.json({ token });
  } catch (error) {
    console.error("Token generation failed:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 VeloCall LiveKit Server LIVE on Port: ${PORT}`);
});