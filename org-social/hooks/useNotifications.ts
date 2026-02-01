import { useEffect } from "react";
import { io } from "socket.io-client";

export default function useNotifications(
  userId: number | null,
  setNotifications: any,
) {
  useEffect(() => {
    if (!userId || !Number.isFinite(userId)) return;

    let socket: any;

    (async () => {
      await fetch("/api/socket");
      socket = io("/", { path: "/api/socket" });

      socket.emit("join", { userId });

      socket.on("notification", (n: any) => {
        setNotifications((prev: any[]) => [n, ...prev]);
      });
    })();

    return () => socket?.disconnect?.();
  }, [userId, setNotifications]);
}
