"use client";

import { ScrollArea, Button, Text, Modal, TextInput, FileInput } from "@mantine/core";
import Link from "next/link";
import { useEffect, useState } from "react";

type Channel = {
  id: number;
  name: string;
  createdAt: string;
  bannerKey?: string | null;
  memberCount?: number;
};

type UserPick = {
  id: number;
  username: string;
  email?: string | null;
};

type MemberPick = {
  userId: number;
  username: string;
  role: "viewer" | "editor" | "admin";
};

export default function ChannelsPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [banner, setBanner] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // member picker state
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserPick[]>([]);
  const [pickedMembers, setPickedMembers] = useState<MemberPick[]>([]);

  async function loadChannels() {
    try {
      const res = await fetch("/api/channels", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch channels");
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (e) {
      console.error("Load channels failed:", e);
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function searchUsers(q: string) {
    const qq = q.trim();
    if (!qq) {
      setUserResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(qq)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setUserResults(data.users || []);
    } catch (e) {
      console.error("User search failed:", e);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userQuery), 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  const addChannel = async () => {
    const trimmed = newChannel.trim();
    if (!trimmed) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", trimmed);
      if (banner) formData.append("banner", banner);

      // ✅ send members with role (creator becomes admin in API automatically)
      formData.append(
        "members",
        JSON.stringify(pickedMembers.map((m) => ({ userId: m.userId, role: m.role })))
      );

      const res = await fetch("/api/channels", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("CREATE CHANNEL FAILED:", res.status, t);
        return;
      }

      const data = await res.json();
      const created: Channel = {
        id: data.channel.id,
        name: data.channel.name,
        createdAt: data.channel.createdAt,
        bannerKey: data.channel.bannerKey,
        memberCount: data.channel.members?.length,
      };

      setChannels((prev) => [...prev, created]);
      setNewChannel("");
      setBanner(null);

      // reset picker
      setUserQuery("");
      setUserResults([]);
      setPickedMembers([]);

      setModalOpen(false);
    } catch (e) {
      console.error("Create channel error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-50 p-3 border-l flex flex-col h-screen">
      <div className="flex justify-between items-center mb-3">
        <Text fw={600}>Channels</Text>
        <Button
          size="xs"
          onClick={() => setModalOpen(true)}
          variant="filled"
          style={{ backgroundColor: "#4F46E5", color: "#fff" }}
        >
          + Add
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {channels.map((ch) => (
            <Link key={ch.id} href={`/channels/${ch.id}`}>
              <div className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer flex justify-between items-center">
                <span># {ch.name}</span>
                {typeof ch.memberCount === "number" && (
                  <span className="text-xs text-gray-500">{ch.memberCount}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </ScrollArea>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Channel"
        size="sm"
        centered
      >
        <TextInput
          placeholder="Channel name"
          value={newChannel}
          onChange={(e) => setNewChannel(e.currentTarget.value)}
          mb="sm"
        />

        <FileInput
          label="Banner photo (optional)"
          placeholder="Pick banner image"
          value={banner}
          onChange={setBanner}
          accept="image/*"
          mb="sm"
        />

        {/* ✅ Member picker */}
        <TextInput
          label="Add members"
          placeholder="Search username/email..."
          value={userQuery}
          onChange={(e) => setUserQuery(e.currentTarget.value)}
          mb="xs"
        />

        <div className="border rounded p-2 mb-3" style={{ maxHeight: 140, overflow: "auto" }}>
          {userResults.length === 0 ? (
            <div className="text-sm text-gray-500">No results</div>
          ) : (
            userResults.map((u) => {
              const already = pickedMembers.some((m) => m.userId === u.id);
              return (
                <div key={u.id} className="flex items-center justify-between py-1">
                  <div className="text-sm">
                    <div className="font-medium">{u.username}</div>
                    {u.email && <div className="text-xs text-gray-500">{u.email}</div>}
                  </div>

                  <Button
                    size="xs"
                    variant="light"
                    disabled={already}
                    onClick={() =>
                      setPickedMembers((prev) => [
                        ...prev,
                        { userId: u.id, username: u.username, role: "viewer" },
                      ])
                    }
                  >
                    Add
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <Text fw={600} size="sm" mb={6}>
          Selected members
        </Text>

        <div className="flex flex-col gap-2 mb-4">
          {pickedMembers.length === 0 ? (
            <div className="text-sm text-gray-500">No members selected</div>
          ) : (
            pickedMembers.map((m) => (
              <div key={m.userId} className="flex items-center justify-between border rounded p-2">
                <div className="text-sm font-medium">{m.username}</div>

                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={m.role}
                    onChange={(e) => {
                      const role = e.currentTarget.value as MemberPick["role"];
                      setPickedMembers((prev) =>
                        prev.map((x) => (x.userId === m.userId ? { ...x, role } : x))
                      );
                    }}
                  >
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                    <option value="admin">admin</option>
                  </select>

                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() => setPickedMembers((prev) => prev.filter((x) => x.userId !== m.userId))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          fullWidth
          onClick={addChannel}
          loading={loading}
          style={{ backgroundColor: "#4F46E5", color: "#fff" }}
        >
          Create
        </Button>

        <Text size="xs" c="dimmed" mt="xs">
          Note: You (creator) will automatically be added as <b>admin</b>.
        </Text>
      </Modal>
    </div>
  );
}
