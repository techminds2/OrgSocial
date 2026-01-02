"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, Avatar } from "@mantine/core";

interface NavBarProps {
  role?: "admin" | "staff" | "user";
  profileImage?: string | null; // pass user photo url here
}

export default function NavBar({ profileImage }: NavBarProps) {
  const router = useRouter();

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
      <div className="  py-1 lg:px-8 flex justify-end items-center ">
        <Menu shadow="md" width={180} position="bottom-end" withArrow>
          <Menu.Target>
            {/* not a button (avoid nested button issues) */}
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
