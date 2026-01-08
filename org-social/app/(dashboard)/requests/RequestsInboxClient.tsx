"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Loader, Avatar, Badge } from "@mantine/core";

type Notif = {
  id: number; // joinRequest id
  type: "JOIN_REQUEST";
  channelId: number;
  channelName: string;
  userId: number;
  username: string;
  createdAt: string;
  message: string;
  href: string;
};

export default function RequestsInboxClient() {
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notif[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/join-requests", {
        credentials: "include",
        cache: "no-store",
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        setError(`Failed to load (${res.status}). ${text}`);
        setItems([]);
        return;
      }

      const data = JSON.parse(text || "{}");
      setItems((data.notifications || []) as Notif[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const count = items.length;

  const act = async (n: Notif, action: "approve" | "reject") => {
    setActingId(n.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/channels/${n.channelId}/join-request/${n.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ action }),
        }
      );

      const t = await res.text().catch(() => "");
      if (!res.ok) {
        setError(`Action failed (${res.status}). ${t}`);
        return;
      }

      // remove from UI immediately
      setItems((prev) => prev.filter((x) => x.id !== n.id));
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader size="sm" />
        Loading requests...
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Pending requests</div>
        <Badge variant="light">{count}</Badge>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">
          {error}
        </div>
      )}

      {count === 0 ? (
        <div className="mt-4 text-sm text-gray-600">
          No pending requests right now.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((n) => {
            const busy = actingId === n.id;

            return (
              <div
                key={n.id}
                className="border rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar radius="xl">
                      {String(n.username || "?").slice(0, 1).toUpperCase()}
                    </Avatar>

                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {n.username} wants to join{" "}
                        <span className="text-gray-700">
                          #{n.channelName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="light"
                      color="red"
                      loading={busy}
                      onClick={() => act(n, "reject")}
                    >
                      Decline
                    </Button>
                    <Button
                      loading={busy}
                      onClick={() => act(n, "approve")}
                    >
                      Accept
                    </Button>
                  </div>
                </div>

                
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Button variant="default" onClick={load}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
