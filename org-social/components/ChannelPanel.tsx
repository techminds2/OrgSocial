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
import { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";

type Channel = {
  id: number;
  name: string;
  createdAt: string;
  bannerKey?: string | null;
  memberCount?: number;
  visibility?: "public" | "private";
};

type PublicChannel = {
  id: number;
  name: string;
  createdAt: string;
  visibility: "public";
  memberCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
  pendingRequestId: number | null;
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

// helper to get cropped image as File
async function getCroppedImg(imageSrc: string, crop: any) {
  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });

  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject("Canvas is empty");
      resolve(new File([blob], "banner.png", { type: "image/png" }));
    }, "image/png");
  });
}

export default function ChannelsPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [publicChannels, setPublicChannels] = useState<PublicChannel[]>([]);

  const [newChannel, setNewChannel] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const [banner, setBanner] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // member picker state
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserPick[]>([]);
  const [pickedMembers, setPickedMembers] = useState<MemberPick[]>([]);

  // cropper state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

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

  async function loadPublicChannels() {
    try {
      const res = await fetch("/api/channels/public", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setPublicChannels(data.channels || []);
    } catch (e) {
      console.error("Load public channels failed:", e);
    }
  }

  useEffect(() => {
    loadChannels();
    loadPublicChannels();
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
      formData.append("visibility", visibility); // ✅ NEW
      if (banner) formData.append("banner", banner);

      formData.append(
        "members",
        JSON.stringify(
          pickedMembers.map((m) => ({ userId: m.userId, role: m.role }))
        )
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
        visibility: data.channel.visibility,
      };

      setChannels((prev) => [...prev, created]);
      setNewChannel("");
      setBanner(null);
      setVisibility("private");

      setUserQuery("");
      setUserResults([]);
      setPickedMembers([]);

      setModalOpen(false);

      // refresh public list (in case channel is public)
      loadPublicChannels();
    } catch (e) {
      console.error("Create channel error:", e);
    } finally {
      setLoading(false);
    }
  };

  // handle file input
  const onBannerChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropSave = useCallback(async () => {
    if (!cropImage || !croppedAreaPixels) return;
    const croppedFile = await getCroppedImg(cropImage, croppedAreaPixels);
    setBanner(croppedFile);
    setCropModalOpen(false);
  }, [cropImage, croppedAreaPixels]);

  async function requestJoin(channelId: number) {
    try {
      const res = await fetch(`/api/channels/${channelId}/join-request`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("REQUEST JOIN FAILED:", res.status, t);
        return;
      }
      await loadPublicChannels();
    } catch (e) {
      console.error("Request join error:", e);
    }
  }

  async function cancelJoinRequest(channelId: number) {
    try {
      const res = await fetch(`/api/channels/${channelId}/join-request`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return;
      await loadPublicChannels();
    } catch (e) {
      console.error("Cancel join request error:", e);
    }
  }

  return (
    <div className="w-64 bg-gray-50 p-3 flex flex-col h-screen">
      <div className="flex justify-between items-center mb-3">
        <Text fw={600}>Channels</Text>
        <Button
          size="xs"
          variant="filled"
          onClick={() => setModalOpen(true)}
          style={{
            backgroundColor: "var(--color-primary)",
            color: "white",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-primary)")
          }
        >
          + Add
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {channels.map((ch) => (
            <Link key={ch.id} href={`/channels/${ch.id}`}>
              <div className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer flex justify-between items-center">
                <span>
                  # {ch.name}
                  {ch.visibility === "public" && (
                    <span className="ml-2 text-[10px] px-1 py-[1px] rounded bg-green-100 text-green-700">
                      public
                    </span>
                  )}
                </span>
                {typeof ch.memberCount === "number" && (
                  <span className="text-xs text-gray-500">{ch.memberCount}</span>
                )}
              </div>
            </Link>
          ))}

          {/* ✅ Public channels browse */}
          <div className="mt-4 pt-3 border-t">
            <Text size="sm" fw={600} className="mb-2">
              Public channels
            </Text>

            {publicChannels.length === 0 ? (
              <div className="text-xs text-gray-500">No public channels</div>
            ) : (
              publicChannels.map((c) => (
                <div
                  key={c.id}
                  className="px-2 py-2 rounded hover:bg-gray-100 flex justify-between items-center"
                >
                  <div className="text-sm">
                    <div className="font-medium"># {c.name}</div>
                    <div className="text-xs text-gray-500">{c.memberCount} members</div>
                  </div>

                  {c.isMember ? (
                    <Link href={`/channels/${c.id}`}>
                      <Button size="xs" variant="light">Open</Button>
                    </Link>
                  ) : c.hasPendingRequest ? (
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() => cancelJoinRequest(c.id)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => requestJoin(c.id)}
                    >
                      Request
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
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

        {/* ✅ NEW: visibility selector */}
        <div className="mb-3">
          <label className="text-sm font-medium block mb-1">Visibility</label>
          <select
            className="border rounded px-2 py-2 w-full text-sm"
            value={visibility}
            onChange={(e) => setVisibility(e.currentTarget.value as any)}
          >
            <option value="private">Private </option>
            <option value="public">Public </option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {visibility === "public"
              ? "Public: anyone can request, admin must approve."
              : "Private: only admin can add members directly."}
          </div>
        </div>

        <FileInput
          label="Banner photo (optional)"
          placeholder="Pick banner image"
          value={banner}
          onChange={onBannerChange}
          accept="image/*"
          mb="sm"
        />

        <TextInput
          label="Add members"
          placeholder="Search username/email..."
          value={userQuery}
          onChange={(e) => setUserQuery(e.currentTarget.value)}
          mb="xs"
        />

        <div
          className="border rounded p-2 mb-3"
          style={{ maxHeight: 140, overflow: "auto" }}
        >
          {userResults.length === 0 ? (
            <div className="text-sm text-gray-500">No results</div>
          ) : (
            userResults.map((u) => {
              const already = pickedMembers.some((m) => m.userId === u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="text-sm">
                    <div className="font-medium">{u.username}</div>
                    {u.email && (
                      <div className="text-xs text-gray-500">{u.email}</div>
                    )}
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
              <div
                key={m.userId}
                className="flex items-center justify-between border rounded p-2"
              >
                <div className="text-sm font-medium">{m.username}</div>

                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={m.role}
                    onChange={(e) => {
                      const role = e.currentTarget.value as MemberPick["role"];
                      setPickedMembers((prev) =>
                        prev.map((x) =>
                          x.userId === m.userId ? { ...x, role } : x
                        )
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
                    onClick={() =>
                      setPickedMembers((prev) =>
                        prev.filter((x) => x.userId !== m.userId)
                      )
                    }
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
          style={{
            backgroundColor: "var(--color-primary)",
            color: "white",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-primary)")
          }
        >
          Create
        </Button>

        <Text size="xs" c="dimmed" mt="xs">
          Note: You (creator) will automatically be added as <b>admin</b>.
        </Text>
      </Modal>

      {/* Crop modal */}
      <Modal
        opened={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        title="Crop Banner"
        size="lg"
        centered
      >
        {cropImage && (
          <div className="relative w-full h-96 bg-gray-200">
            <Cropper
              image={cropImage}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCropModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCropSave}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
