"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Text } from "@mantine/core";

export default function ChannelFeed({
  channelId,
  channelName,
  role,
  bannerKey,
  canDelete,
}: {
  channelId: number;
  channelName: string;
  role: "viewer" | "editor" | "admin";
  bannerKey?: string | null;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const bannerUrl = bannerKey
    ? bannerKey.startsWith("http://") || bannerKey.startsWith("https://")
      ? bannerKey
      : `/api/files/${bannerKey.replace(/^\/+/, "")}`
    : null;

  const deleteChannel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("DELETE CHANNEL FAILED:", res.status, t);
        return;
      }

      setOpened(false);

      // 🔥 instantly notify panel (even if it's already mounted)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("channel-deleted", { detail: { id: channelId } })
        );
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="">
      {bannerUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gray-200 mb-4">
          <img
            src={bannerUrl}
            alt={`${channelName} banner`}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">#{channelName}</h1>

          {canDelete && (
            <>
              <Button
                color="red"
                variant="light"
                onClick={() => setOpened(true)}
              >
                Delete
              </Button>

              <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title="Delete channel"
                centered
              >
                <Text size="sm" c="dimmed">
                  This will permanently delete this channel and all its posts.
                  This action cannot be undone.
                </Text>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="default" onClick={() => setOpened(false)}>
                    Cancel
                  </Button>
                  <Button color="red" loading={loading} onClick={deleteChannel}>
                    Delete
                  </Button>
                </div>
              </Modal>
            </>
          )}
        </div>

        {role !== "viewer" && (
          <>
            <CreatePost channelId={channelId} />
            <div className="h-4" />
          </>
        )}

        <ShowPosts channelId={channelId} />
      </div>
    </div>
  );
}
