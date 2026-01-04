"use client";

import { useEffect, useState } from "react";
import { Button, Loader } from "@mantine/core";
import Link from "next/link";

type Req = {
  id: number;
  createdAt: string;
  user: { id: number; username: string; email?: string | null; profileImage?: string | null };
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

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/join-requests`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [channelId]);

  async function act(requestId: number, action: "approve" | "reject") {
    if (actingId) return;
    setActingId(requestId);
    try {
      const res = await fetch(
        `/api/channels/${channelId}/join-requests/${requestId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
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
            <div key={r.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={r.user.profileImage || "/temp.png"}
                  className="w-10 h-10 rounded-full border object-cover"
                  onError={(e) => (e.currentTarget.src = "/temp.png")}
                />
                <div>
                  <div className="font-medium">{r.user.username}</div>
                  <div className="text-xs text-gray-500">
                    {r.user.email || ""} · {new Date(r.createdAt).toLocaleString()}
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
