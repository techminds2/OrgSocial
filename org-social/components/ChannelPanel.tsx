"use client";

import {
  ScrollArea,
  Button,
  Text,
  Modal,
  TextInput,
  FileInput,
} from "@mantine/core";
import Link from "next/link";
import { useEffect, useState } from "react";

type Channel = {
  id: number;
  name: string;
  createdAt: string;
  bannerKey?: string | null;
  memberCount?: number;
};

export default function ChannelsPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [banner, setBanner] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch channels from API
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

  // Create new channel
  const addChannel = async () => {
    const trimmed = newChannel.trim();
    if (!trimmed) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", trimmed);
      if (banner) formData.append("banner", banner);

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
      setModalOpen(false);
    } catch (e) {
      console.error("Create channel error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-50 p-3 border-l flex flex-col h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <Text fw={600}>Channels</Text>
        <Button
          size="xs"
          onClick={() => setModalOpen(true)}
          variant="filled"
          style={{
            backgroundColor: "#4F46E5",
            color: "#fff",
          }}
        >
          + Add
        </Button>
      </div>

      {/* Channels List */}
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

      {/* Modal for creating a channel */}
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

        <Button
          fullWidth
          onClick={addChannel}
          loading={loading}
          style={{
            backgroundColor: "#4F46E5",
            color: "#fff",
          }}
        >
          Create
        </Button>
      </Modal>
    </div>
  );
}
