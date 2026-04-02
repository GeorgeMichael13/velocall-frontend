"use client";

import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { io, Socket } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext<any>(null);

const socket: Socket = io("https://velocall-backend.onrender.com");

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const ContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState("");
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [code, setCode] = useState("// Real-time collaborative editor...");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // ====================== GET USER MEDIA ======================
  useEffect(() => {
    let isMounted = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        if (!isMounted) return;
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      })
      .catch((err) => console.error("Media error:", err));

    return () => { isMounted = false; };
  }, []);

  // ====================== SOCKET SETUP ======================
  useEffect(() => {
    socket.on("me", (id: string) => {
      setMe(id);
      const rId = new URLSearchParams(window.location.search).get("id");
      if (rId) {
        setRoomId(rId);
        socket.emit("join-room", rId);
      }
    });

    socket.on("user-joined", (newUserSocketId: string) => {
      setTimeout(() => callUser(newUserSocketId), 1200);
    });

    socket.on("callUser", ({ from, signal }: any) => {
      answerCall(signal, from);
    });

    socket.on("callAccepted", (signal: any) => {
      setCallAccepted(true);
      if (connectionRef.current) connectionRef.current.signal(signal);
    });

    socket.on("reaction", (data: any) => {
      window.dispatchEvent(new CustomEvent("receiveReaction", { detail: data }));
    });

    socket.on("callEnded", () => leaveCall());

    return () => {
      socket.off("me");
      socket.off("user-joined");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("reaction");
      socket.off("callEnded");
    };
  }, [me]);

  // ====================== CALL USER ======================
  const callUser = useCallback((id: string) => {
    if (!stream) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: { iceServers },
    });

    setOtherUser(id);

    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: me, name });
    });

    peer.on("stream", (remoteStream) => {
      if (userVideo.current) userVideo.current.srcObject = remoteStream;
    });

    peer.on("error", (err) => console.error("Peer error:", err));

    connectionRef.current = peer;
  }, [stream, me, name]);

  // ====================== ANSWER CALL ======================
  const answerCall = useCallback((signal: any, from: string) => {
    if (!stream) return;

    setCallAccepted(true);
    setOtherUser(from);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: { iceServers },
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: from });
    });

    peer.on("stream", (remoteStream) => {
      if (userVideo.current) userVideo.current.srcObject = remoteStream;
    });

    peer.signal(signal);
    connectionRef.current = peer;
  }, [stream]);

  // ====================== LEAVE CALL ======================
  const leaveCall = useCallback(() => {
    socket.emit("leaveCall", { to: otherUser });

    if (stream) stream.getTracks().forEach(t => t.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());

    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    setIsScreenSharing(false);
    setRaisedHand(false);
    setCallAccepted(false);
    setCallEnded(true);
    setOtherUser("");
  }, [stream, otherUser]);

  // ====================== CONTROLS ======================
  const toggleMute = useCallback(() => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      const newState = !isMuted;
      track.enabled = !newState;
      setIsMuted(newState);
    }
  }, [stream, isMuted]);

  const toggleCamera = useCallback(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      const newState = !isCameraOff;
      track.enabled = !newState;
      setIsCameraOff(newState);
    }
  }, [stream, isCameraOff]);

  // ====================== SCREEN SHARING (Fixed for Netlify) ======================
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (stream) stream.getVideoTracks().forEach(t => t.enabled = true);

    if (connectionRef.current && stream) {
      const sender = connectionRef.current._pc.getSenders().find((s: any) => s.track?.kind === "video");
      if (sender) {
        const cameraTrack = stream.getVideoTracks()[0];
        if (cameraTrack) sender.replaceTrack(cameraTrack);
      }
    }
    setIsScreenSharing(false);
  }, [stream]);

  const toggleScreenShare = useCallback(async () => {
    if (!connectionRef.current) {
      alert("Please wait for the other person to join before sharing screen.");
      return;
    }

    try {
      if (isScreenSharing) {
        stopScreenShare();
      } else {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,   // Fixed TypeScript error
          audio: false,
        });

        screenStreamRef.current = displayStream;

        const sender = connectionRef.current._pc.getSenders().find((s: any) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(displayStream.getVideoTracks()[0]);
          stream?.getVideoTracks().forEach(t => t.enabled = false);
        }

        setIsScreenSharing(true);

        displayStream.getVideoTracks()[0].onended = stopScreenShare;
      }
    } catch (err: any) {
      console.error("Screen share error:", err);
      if (err.name !== "NotAllowedError") {
        alert("Failed to share screen");
      }
    }
  }, [isScreenSharing, stream, stopScreenShare]);

  // ====================== REACTIONS ======================
  const sendReaction = useCallback((emoji: string) => {
    if (!roomId) return;
    socket.emit("reaction", { type: "emoji", emoji, from: me, roomId });
  }, [roomId, me]);

  const toggleRaiseHand = useCallback(() => {
    const newState = !raisedHand;
    setRaisedHand(newState);
    if (roomId) {
      socket.emit("reaction", { type: "raisehand", emoji: "✋", from: me, roomId });
    }
  }, [raisedHand, roomId, me]);

  return (
    <SocketContext.Provider
      value={{
        myVideo,
        userVideo,
        callAccepted,
        callEnded,
        me,
        name,
        setName,
        stream,
        callUser,
        answerCall,
        leaveCall,
        createNewRoom: () => {
          const rId = Math.random().toString(36).substring(2, 10);
          setRoomId(rId);
          socket.emit("join-room", rId);
          window.history.replaceState({}, "", `?id=${rId}`);
        },
        messages,
        sendMessage: (text: string) => socket.emit("sendMessage", { text, from: me, name: name || "Anonymous", roomId }),
        code,
        updateCode: (newCode: string) => {
          setCode(newCode);
          socket.emit("codeUpdate", { code: newCode, roomId });
        },
        isMuted,
        toggleMute,
        isCameraOff,
        toggleCamera,
        isScreenSharing,
        toggleScreenShare,
        raisedHand,
        toggleRaiseHand,
        sendReaction,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);