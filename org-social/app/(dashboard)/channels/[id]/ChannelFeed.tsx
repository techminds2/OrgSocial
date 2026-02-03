"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Text, TextInput, FileInput, Menu } from "@mantine/core";

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

  const [name, setName] = useState(channelName);
  const [banner, setBanner] = useState<File | null>(null);
  const [members, setMembers] = useState<MemberPick[]>([]);
  const [originalMembers, setOriginalMembers] = useState<MemberPick[]>([]);

  const bannerUrl = bannerKey
    ? bannerKey.startsWith("http")
      ? bannerKey
      : `/api/files/${bannerKey}`
    : null;

  useEffect(() => {
    setName(channelName);
  }, [channelName]);

  useEffect(() => {
    if (!editOpen) return;

    fetch(`/api/channels/${channelId}/members`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members || []);
        setOriginalMembers(d.members || []);
      });
  }, [editOpen, channelId]);

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

        {/* ✅ Fix hydration mismatch: only render Mantine Menu after mount */}
        {mounted && role === "admin" && (
          <Menu shadow="sm" width={120}>
            <Menu.Target>
              <Button
                variant="subtle"
                size="xs"
                px={6}
                py={2}
                styles={(theme) => ({
                  root: {
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: theme.colors.gray[1],
                    },
                  },
                })}
              >
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
      </div>

      {/* ✅ Also mount-gate Modals (portals/ids) to avoid similar SSR mismatches */}
      {mounted && (
        <>
          <Modal
            opened={editOpen}
            onClose={() => setEditOpen(false)}
            title="Edit channel"
            centered
          >
            <TextInput
              label="Channel name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              mb="sm"
            />

            <FileInput
              label="Replace banner"
              accept="image/*"
              onChange={setBanner}
              mb="sm"
            />

            <Text fw={600} size="sm" mb={6}>
              Members
            </Text>

            {members.map((m) => (
              <div key={m.userId} className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">{m.username}</div>

                <div className="flex gap-2">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((x) =>
                          x.userId === m.userId
                            ? { ...x, role: e.target.value as MemberPick["role"] }
                            : x
                        )
                      )
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                    <option value="admin">admin</option>
                  </select>

                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() =>
                      setMembers((prev) => prev.filter((x) => x.userId !== m.userId))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="default" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button loading={loading} onClick={saveEdits}>
                Save
              </Button>
            </div>
          </Modal>

          <Modal
            opened={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title="Delete channel"
            centered
          >
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
