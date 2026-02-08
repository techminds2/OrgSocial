"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Text, TextInput, FileInput, Menu, Group } from "@mantine/core";

type MemberPick = {
  userId: number;
  username: string;
  role: "viewer" | "editor" | "admin";
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

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
  const mounted = useMounted();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // edit state
  const [name, setName] = useState(channelName);
  const [banner, setBanner] = useState<File | null>(null);
  const [members, setMembers] = useState<MemberPick[]>([]);
  const [originalMembers, setOriginalMembers] = useState<MemberPick[]>([]);

  // 📌 PIN STATE (localStorage + server sync)
  const [pinLoading, setPinLoading] = useState(false);
  const [pinnedChannelId, setPinnedChannelId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("pinnedChannelId");
    return saved ? Number(saved) : null;
  });

  const isPinned = useMemo(
    () => pinnedChannelId === channelId,
    [pinnedChannelId, channelId]
  );

  const bannerUrl = bannerKey
    ? bannerKey.startsWith("http")
      ? bannerKey
      : `/api/files/${bannerKey}`
    : null;

  // keep name synced if props change
  useEffect(() => {
    setName(channelName);
  }, [channelName]);

  // 🔁 Sync pin from SERVER on mount (authoritative)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/users/me/pinned-channel", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        const id =
          data?.pinnedChannelId !== null
            ? Number(data.pinnedChannelId)
            : null;

        if (cancelled) return;

        setPinnedChannelId(id);

        if (id) {
          localStorage.setItem("pinnedChannelId", String(id));
        } else {
          localStorage.removeItem("pinnedChannelId");
        }
      } catch {
        // fallback to localStorage
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* 🔹 Load members when opening edit */
  useEffect(() => {
    if (!editOpen) return;

    fetch(`/api/channels/${channelId}/members`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members || []);
        setOriginalMembers(d.members || []);
      })
      .catch(() => {
        setMembers([]);
        setOriginalMembers([]);
      });
  }, [editOpen, channelId]);

  /* 🔹 Save edits */
  const saveEdits = async () => {
    setLoading(true);
    try {
      const formData = new FormData();

      if (name.trim() !== channelName) formData.append("name", name.trim());
      if (banner) formData.append("banner", banner);

      if (JSON.stringify(members) !== JSON.stringify(originalMembers)) {
        formData.append(
          "members",
          JSON.stringify(members.map((m) => ({ userId: m.userId, role: m.role })))
        );
      }

      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        alert("Failed to update channel");
        return;
      }

      setEditOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  /* 🔹 Delete channel */
  const deleteChannel = async () => {
    setLoading(true);
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
        credentials: "include",
      });

      window.dispatchEvent(
        new CustomEvent("channel-deleted", { detail: { id: channelId } })
      );

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  // 📌 Pin
  const pinThisChannel = async () => {
    setPinLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/pin`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        alert("Failed to pin channel");
        return;
      }

      setPinnedChannelId(channelId);
      localStorage.setItem("pinnedChannelId", String(channelId));
    } finally {
      setPinLoading(false);
    }
  };

  // 📌 Unpin
  const unpinChannel = async () => {
    setPinLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/pin`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        alert("Failed to unpin channel");
        return;
      }

      setPinnedChannelId(null);
      localStorage.removeItem("pinnedChannelId");
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div>
      {bannerUrl && (
        <img
          src={bannerUrl}
          className="h-48 w-full object-cover rounded-xl mb-4"
          alt=""
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">#{channelName}</h1>

        <Group gap="xs">
          {mounted && (
            <Button
              size="xs"
              variant={isPinned ? "light" : "outline"}
              loading={pinLoading}
              onClick={isPinned ? unpinChannel : pinThisChannel}
            >
              {isPinned ? "Main Feed ✓" : "Pin as Main Feed"}
            </Button>
          )}

          {mounted && role === "admin" && (
            <Menu shadow="sm" width={120}>
              <Menu.Target>
                <Button variant="subtle" size="xs" px={6} py={2}>
                  ⋮
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item onClick={() => setEditOpen(true)}>Edit</Menu.Item>
                {canDelete && (
                  <Menu.Item color="red" onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </div>

      {mounted && (
        <>
          <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Edit channel" centered>
            <TextInput
              label="Channel name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              mb="sm"
            />

            <FileInput label="Replace banner" accept="image/*" onChange={setBanner} mb="sm" />
          </Modal>

          <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete channel" centered>
            <Text size="sm" c="dimmed">
              This will permanently delete this channel.
            </Text>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="default" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button color="red" loading={loading} onClick={deleteChannel}>
                Delete
              </Button>
            </div>
          </Modal>
        </>
      )}

      {role !== "viewer" && <CreatePost channelId={channelId} />}
      <ShowPosts channelId={channelId} />
    </div>
  );
}
