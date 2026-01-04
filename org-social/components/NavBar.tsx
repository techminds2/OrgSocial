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
  role?: "admin" | "staff" | "user";
  profileImage?: string | null;
}

type Notification = {
  id: number;
  message: string;
  createdAt: string | Date;
  channelId: number;
  href: string;
};

export default function NavBar({ profileImage }: NavBarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>(""); // <-- store username

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

        const text = await res.text();

        if (!res.ok) {
          console.error(
            "Notifications API failed:",
            res.status,
            res.statusText,
            text
          );
          return;
        }

        const data = text ? JSON.parse(text) : { notifications: [] };
        if (mounted) {
          setNotifications(
            Array.isArray(data.notifications) ? data.notifications : []
          );

          // If API returns user info, extract username for profile display
          if (data.user && data.user.username) {
            setUsername(data.user.username);
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchNotifications();
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
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      router.push("/");
      router.refresh?.();
    }
  };

  return (
    <nav className="bg-white shadow-md">
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
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader size="sm" />
                </div>
              ) : visibleNotifications.length === 0 ? (
                <Text size="sm" c="dimmed" px="sm" py="xs">
                  No notifications
                </Text>
              ) : (
                visibleNotifications.map((n) => (
                  <Menu.Item key={n.id} component={Link} href={n.href}>
                    {n.message}
                  </Menu.Item>
                ))
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
              <span className="font-medium text-gray-700">{username}</span>
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
