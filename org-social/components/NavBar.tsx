"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Menu, Avatar, Indicator, ScrollArea, Text, Loader } from "@mantine/core";
import { BellIcon } from "@heroicons/react/24/outline";
import useNotifications from "@/hooks/useNotifications";

interface NavBarProps {
  profileImage?: string | null;
}

type Notification = {
  id: number;
  message: string;
  createdAt: string | Date;
  channelId?: number;
  href: string;
  type?: "post" | "join-request" | "comment" | "JOIN_REQUEST";
  channelName?: string;
  username?: string;
};

function normalizeMediaUrl(u?: string | null) {
  if (!u) return "/temp.jpg";
  const s = String(u).trim();
  if (!s) return "/temp.jpg";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `/api/files/${s.replace(/^\/+/, "")}`;
}

function normalizeType(n: any): Notification["type"] {
  if (n?.type === "comment") return "post";
  if (n?.type === "JOIN_REQUEST") return "join-request";
  return n?.type;
}

function notifKey(n: Notification) {
  const t = normalizeType(n) || "unknown";
  const cid = n.channelId ? `:${n.channelId}` : "";
  return `${t}:${n.id}${cid}`;
}

function mergeDedupe(prev: Notification[], incoming: Notification[]) {
  const map = new Map<string, Notification>();
  [...incoming, ...prev].forEach((raw) => {
    const n: Notification = { ...raw, type: normalizeType(raw) };
    map.set(notifKey(n), n);
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function NavBar({ profileImage }: NavBarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const [username, setUsername] = useState<string>("");
  const [meProfileImage, setMeProfileImage] = useState<string | null>(null);
  const [meId, setMeId] = useState<number | null>(null);

  useNotifications(meId, (updater: any) => {
    const incoming = typeof updater === "function" ? updater([]) : [updater];
    setNotifications((prev) => mergeDedupe(prev, incoming as any));
  });

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications/join-requests", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const data = await res.json();
        const incoming = Array.isArray(data.notifications) ? data.notifications : [];

        if (mounted) {
          setNotifications((prev) => mergeDedupe(prev, incoming as any));
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        if (mounted) setLoadingNotifications(false);
      }
    }

    fetchNotifications();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Not authenticated");

        const data = await res.json();
        if (!mounted) return;

        if (data.username) setUsername(data.username);
        setMeProfileImage(data.profileImage ?? null);

        const uid = Number(data.id ?? data.userId ?? data.user_id ?? NaN);
        setMeId(Number.isFinite(uid) ? uid : null);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    }

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  const avatarSrc = useMemo(() => {
    const fromProps = normalizeMediaUrl(profileImage);
    const fromMe = normalizeMediaUrl(meProfileImage);
    return meProfileImage ? fromMe : fromProps;
  }, [profileImage, meProfileImage]);

  const visibleNotifications = notifications.slice(0, 10);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      router.push("/");
      router.refresh?.();
    }
  };

  return (
    <nav className="bg-white shadow-sm fixed top-0 left-64 right-0 z-30 h-14">
      <div className="py-1 lg:px-8 flex justify-end items-center gap-4">
        <Menu shadow="md" width={320} position="bottom-end" withArrow>
          <Menu.Target>
            <div className="cursor-pointer">
              <Indicator
                color="red"
                size={8}
                offset={4}
                disabled={notifications.length === 0}
              >
                <BellIcon className="h-6 w-6 text-gray-700" />
              </Indicator>
            </div>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Notifications</Menu.Label>
            <ScrollArea.Autosize mah={300}>
              {loadingNotifications ? (
                <div className="flex justify-center py-4">
                  <Loader size="sm" />
                </div>
              ) : visibleNotifications.length === 0 ? (
                <Text size="sm" c="dimmed" px="sm" py="xs">
                  No notifications
                </Text>
              ) : (
                visibleNotifications.map((raw) => {
                  const n: Notification = { ...raw, type: normalizeType(raw) };
                  const key = notifKey(n);

                  return n.type === "post" ? (
                    <Menu.Item
                      key={key}
                      onClick={() => {
                        const match = n.href?.match(/\/posts\/(\d+)/);
                        if (!match) return;

                        const postId = Number(match[1]);
                        window.dispatchEvent(
                          new CustomEvent("open-post-modal", {
                            detail: { postId },
                          })
                        );
                      }}
                    >
                      {n.message}
                    </Menu.Item>
                  ) : (
                    <Menu.Item key={key} component={Link} href={n.href}>
                      {n.message}
                    </Menu.Item>
                  );
                })
              )}
            </ScrollArea.Autosize>
            <Menu.Divider />
            <Menu.Item component={Link} href="/notifications">
              View all notifications
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Menu shadow="md" width={180} position="bottom-end" withArrow>
          <Menu.Target>
            <div className="flex items-center cursor-pointer gap-2">
              <Avatar
                src={avatarSrc}
                radius="xl"
                size={40}
                onError={() => setMeProfileImage(null)}
              />
              <span className="font-medium text-gray-700">
                {username || "User"}
              </span>
            </div>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item component={Link} href="/profile">
              Profile
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </nav>
  );
}
