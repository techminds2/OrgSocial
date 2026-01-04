"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Avatar, Indicator, ScrollArea, Text } from "@mantine/core";
import { BellIcon } from "@heroicons/react/24/outline";

interface NavBarProps {
  role?: "admin" | "staff" | "user";
  profileImage?: string | null;
}

type Notification = {
  id: number;
  message: string;
};

export default function NavBar({ profileImage }: NavBarProps) {
  const router = useRouter();

  // 🔔 mock notifications (replace with API data later)
  const notifications: Notification[] = Array.from({ length: 25 }).map(
    (_, i) => ({
      id: i + 1,
      message: `Notification message ${i + 1}`,
    })
  );

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
              {visibleNotifications.length === 0 ? (
                <Text size="sm" c="dimmed" px="sm" py="xs">
                  No notifications
                </Text>
              ) : (
                visibleNotifications.map((n) => (
                  <Menu.Item key={n.id}>
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
            <div className="cursor-pointer">
              <Avatar src={profileImage || "/temp.png"} radius="xl" size={40} />
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
