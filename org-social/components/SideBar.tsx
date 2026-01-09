"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer, Burger, ScrollArea, Image } from "@mantine/core";

type MenuItem =
  | { type: "link"; label: string; href: string }
  | { type: "heading"; label: string };

const MENU_ITEMS: MenuItem[] = [
  { type: "heading", label: "My Team" },
  { type: "link", label: "My Team Apps", href: "/dashboard/team-apps" },
  { type: "link", label: "Team Directory", href: "/team-directory" },
  { type: "link", label: "To-do List", href: "/" },

];

const getLinkClasses = (active: boolean) =>
  `block px-4 py-2 rounded text-sm transition ${
    active ? "bg-blue-200 font-semibold text-blue-800" : "text-gray-700 hover:bg-blue-100"
  }`;

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col">
      {/* Logo */}
      <div className="flex-shrink-0 flex items-center mb-6">
        <Link href="/" className="text-xl font-bold text-blue-600 flex items-center">
          <Image src="/logo.webp" alt="Logo" width={200} height={40} />
        </Link>
      </div>

      {/* Menu items */}
      {MENU_ITEMS.map((item, idx) =>
        item.type === "heading" ? (
          <div
            key={idx}
            className="mt-4 mb-2 text-gray-500 uppercase font-semibold text-xs tracking-wider"
          >
            {item.label}
          </div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={getLinkClasses(pathname === item.href)}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);

  return (
    <>
      <aside className="hidden md:flex w-64 h-screen bg-gray-50 border-r border-gray-200 flex-col p-4 overflow-y-auto">
        <SidebarContent pathname={pathname} />
      </aside>

      <div className="md:hidden">
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
            <SidebarContent pathname={pathname} onNavigate={() => setOpened(false)} />
          </ScrollArea>
        </Drawer>
      </div>
    </>
  );
}
