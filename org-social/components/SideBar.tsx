"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer, Burger, ScrollArea } from "@mantine/core";

type MenuItem =
  | { type: "link"; label: string; href: string }
  | { type: "heading"; label: string };

const menuItems: MenuItem[] = [
  { type: "heading", label: "My Team" },
  { type: "link", label: "My Team Apps", href: "/dashboard/team-apps" },
  { type: "link", label: "Team Directory", href: "/dashboard/team-directory" },
];

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col">
      {menuItems.map((item, idx) => {
        if (item.type === "heading") {
          return (
            <div
              key={idx}
              className="mt-2 mb-1 text-gray-500 uppercase font-semibold text-sm"
            >
              {item.label}
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`px-4 py-2 rounded hover:bg-blue-100 transition text-sm
              ${pathname === item.href ? "bg-blue-200 font-semibold" : "text-gray-700"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);

  return (
    <>
      {/* ✅ Desktop sidebar (unchanged) */}
      <aside className="hidden md:flex w-64 h-screen bg-gray-100 border-r border-gray-200 flex-col p-4 overflow-y-auto">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ✅ Mobile hamburger + drawer */}
      <div className="md:hidden">
        {/* Burger button (you can place this where you want, e.g. top-left) */}
        <div className="p-2">
          <Burger opened={opened} onClick={() => setOpened((o) => !o)} />
        </div>

        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          title="Menu"
          padding="md"
          size="xs"
        >
          <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setOpened(false)}
            />
          </ScrollArea>
        </Drawer>
      </div>
    </>
  );
}
