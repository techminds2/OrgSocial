"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Avatar,
  Indicator,
  ScrollArea,
  Text,
  Loader,
} from "@mantine/core";
import { BellIcon } from "@heroicons/react/24/outline";

interface NavBarProps {
  profileImage?: string | null;
}

type Notification = {
  id: number;
  message: string;
  createdAt: string | Date;
  channelId?: number;
  href: string;
  type?: "post" | "join-request";
};

export default function NavBar({ profileImage }: NavBarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [username, setUsername] = useState<string>("");

  // Fetch notifications including join-requests
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

        if (mounted) {
          setNotifications(
            Array.isArray(data.notifications) ? data.notifications : []
          );
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

  // Fetch logged-in user info (kept unchanged)
  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Not authenticated");

        const data = await res.json();
        if (mounted && data.username) setUsername(data.username);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    }

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

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
    <nav className="bg-white shadow-md fixed top-0 left-64 right-0 z-30 h-14">
      <div className="py-1 lg:px-8 flex justify-end items-center gap-4">
        {/* Notifications Menu */}
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
                visibleNotifications.map((n) =>
                  n.type === "post" ? (
                    <Menu.Item
                      key={n.id}
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
                    <Menu.Item key={n.id} component={Link} href={n.href}>
                      {n.message}
                    </Menu.Item>
                  )
                )
              )}
            </ScrollArea.Autosize>
            <Menu.Divider />
            <Menu.Item component={Link} href="/notifications">
              View all notifications
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        {/* Profile Menu */}
        <Menu shadow="md" width={180} position="bottom-end" withArrow>
          <Menu.Target>
            <div className="flex items-center cursor-pointer gap-2">
              <Avatar src={profileImage || "/temp.png"} radius="xl" size={40} />
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
