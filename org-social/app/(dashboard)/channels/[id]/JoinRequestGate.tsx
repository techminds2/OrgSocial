"use client";

import { useEffect, useState } from "react";
import { Button } from "@mantine/core";

export default function JoinRequestGate({
  channelId,
  channelName,
  bannerKey,
}: {
  channelId: number;
  channelName: string;
  bannerKey?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"none" | "pending" | "sent">("none");

  const bannerUrl = bannerKey
    ? bannerKey.startsWith("http://") || bannerKey.startsWith("https://")
      ? bannerKey
      : `/api/files/${bannerKey.replace(/^\/+/, "")}`
    : null;

  async function checkPending() {
    try {
      const res = await fetch(`/api/channels/${channelId}/join-request/status`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.pending ? "pending" : "none");
    } catch {}
  }

  useEffect(() => {
    checkPending();
  }, [channelId]);

  const requestJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/join-request`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setStatus("sent");
        await checkPending();
      }
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/join-request`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setStatus("none");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {bannerUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gray-200 mb-4 max-w-5xl mx-auto">
          <img
            src={bannerUrl}
            alt={`${channelName} banner`}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="max-w-xl bg-white border rounded-xl p-5 mx-auto">
        <h2 className="text-lg font-semibold">#{channelName}</h2>
        <p className="text-sm text-gray-600 mt-1">
          This is a public channel. You need admin approval to join.
        </p>

        <div className="mt-4 flex gap-2">
          {status === "pending" ? (
            <Button color="red" variant="light" loading={loading} onClick={cancel}>
              Cancel request
            </Button>
          ) : (
            <Button loading={loading} onClick={requestJoin}>
              Request to join
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
