"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = 
  | { type: "link"; label: string; href: string }
  | { type: "heading"; label: string };

const menuItems: MenuItem[] = [
  // { type: "link", label: "Home Feed", href: "/dashboard" },

  // { type: "heading", label: "Tickets" },
  // { type: "link", label: "All Tickets", href: "/dashboard/tickets/all" },
  // { type: "link", label: "My Tickets", href: "/dashboard/tickets/mine" },

  // { type: "heading", label: "My Apps" },

  // { type: "link", label: "Profile", href: "/dashboard/profile" },
  // { type: "link", label: "My Request", href: "/dashboard/my-request" },
  // { type: "link", label: "Leave Balances", href: "/dashboard/leave-balances" },

  { type: "heading", label: "My Team" },
  { type: "link", label: "My Team Apps", href: "/dashboard/team-apps" },
  { type: "link", label: "Team Directory", href: "/dashboard/team-directory" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-gray-100 border-r border-gray-200 flex flex-col p-4 overflow-y-auto">
      <nav className="flex flex-col ">
        {menuItems.map((item, idx) => {
          if (item.type === "heading") {
            return (
              <div key={idx} className="mt-2 mb-1 text-gray-500 uppercase font-semibold text-sm">
                {item.label}
              </div>
            );
          } else {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded hover:bg-blue-100 transition text-sm
                  ${pathname === item.href ? "bg-blue-200 font-semibold" : "text-gray-700"}`}
              >
                {item.label}
              </Link>
            );
          }
        })}
      </nav>
    </aside>
  );
}
