"use client";

import Navbar from "@/components/NavBar";
import Sidebar from "@/components/SideBar";
import ChannelsPanel from "@/components/ChannelPanel";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <aside className="fixed top-0 left-0 w-64 h-screen bg-gray-50 border-r border-gray-200 z-40">
        <Sidebar />
      </aside>

      <Navbar />

      <aside className="fixed top-14 right-0 w-64 h-[calc(100vh-3.5rem)] bg-gray-50 border-l border-gray-200 z-20">
        <Suspense fallback={null}>
          <ChannelsPanel />
        </Suspense>
      </aside>

      <div className="grid grid-cols-[16rem_1fr_16rem] pt-14 h-screen">
        <section className="col-start-2 h-[calc(100vh-3.5rem)] overflow-y-auto bg-gray-50">
          <main className="min-h-full bg-gray-50 flex justify-center">
            <div className="w-full max-w-[720px] px-4 pt-4 pb-2">
              {children}
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
