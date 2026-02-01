import type { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";

export const config = {
  api: { bodyParser: false },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const anyRes = res as any;

  if (!anyRes.socket?.server) {
    res.status(500).end("No server socket");
    return;
  }

  if (!anyRes.socket.server.io) {
    console.log("⚡️ Creating Socket.IO server...");

    const io = new Server(anyRes.socket.server, {
      path: "/api/socket",
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join", ({ userId }) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
      });
    });

    anyRes.socket.server.io = io;
    (globalThis as any).io = io;
  }

  res.end();
}
