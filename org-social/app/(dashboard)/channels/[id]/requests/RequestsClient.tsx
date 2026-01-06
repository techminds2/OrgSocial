"use client";

import { useEffect, useState } from "react";
import { Button, Loader } from "@mantine/core";
import Link from "next/link";

type Req = {
  id: number;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email?: string | null;
    profileImage?: string | null;
  };
};

export default function RequestsClient({
  channelId,
  channelName,
}: {
  channelId: number;
  channelName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Req[]>([]);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/join-request`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setRequests([]);
        setError(`Failed (${res.status}): ${t.slice(0, 200)}`);
        return;
      }

      const data = await res.json();
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (e: any) {
      setRequests([]);
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  async function act(requestId: number, action: "approve" | "reject") {
    if (actingId) return;
    setActingId(requestId);
    setError(null);

    try {
      const res = await fetch(
        `/api/channels/${channelId}/join-request/${requestId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setError(`Action failed (${res.status}): ${t.slice(0, 200)}`);
        return;
      }

      // refresh to stay consistent
      await load();
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Join Requests</h1>
          <p className="text-sm text-gray-600">#{channelName}</p>
        </div>
        <Link href={`/channels/${channelId}`}>
          <Button variant="light">Back to channel</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader size="sm" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border rounded-xl p-4 text-sm text-gray-600">
          No pending requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white border rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={r.user.profileImage || "/temp.png"}
                  className="w-10 h-10 rounded-full border object-cover"
                  onError={(e) => (e.currentTarget.src = "/temp.png")}
                  alt={r.user.username}
                />
                <div>
                  <div className="font-medium">{r.user.username}</div>
                  <div className="text-xs text-gray-500">
                    {(r.user.email || "").trim()}
                    {(r.user.email ? " · " : "") +
                      new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  loading={actingId === r.id}
                  onClick={() => act(r.id, "approve")}
                >
                  Approve
                </Button>
                <Button
                  loading={actingId === r.id}
                  color="red"
                  variant="light"
                  onClick={() => act(r.id, "reject")}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
