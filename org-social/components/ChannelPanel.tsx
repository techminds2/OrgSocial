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

  async function loadChannels() {
    try {
      const res = await fetch("/api/channels", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (e) {
      console.error("Load channels failed:", e);
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  const addChannel = async () => {
    const trimmed = newChannel.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", trimmed);
      if (banner) formData.append("banner", banner);

      // Optional: add members (example)
      // formData.append("memberIds", JSON.stringify([2, 3, 4]));

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
      <div className="flex justify-between items-center mb-3">
        <Text fw={600}>Channels</Text>

        <Button
          size="xs"
          onClick={() => setModalOpen(true)}
          variant="filled"
          vars={() => ({
            root: {
              "--button-bg": "var(--color-secondary)",
              "--button-hover": "var(--color-primary)",
              "--button-color": "#fff",
            },
          })}
        >
          + Add
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <Link href={`/channels/${ch.id}`}>
                  <div className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer">
                    # {ch.name}
                  </div>
                </Link>
                {typeof ch.memberCount === "number" ? (
                  <div className="text-xs text-gray-500">{ch.memberCount}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Channel"
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
          vars={() => ({
            root: {
              "--button-bg": "var(--color-secondary)",
              "--button-hover": "var(--color-primary)",
              "--button-color": "#fff",
            },
          })}
        >
          Create
        </Button>
      </Modal>
    </div>
  );
}
