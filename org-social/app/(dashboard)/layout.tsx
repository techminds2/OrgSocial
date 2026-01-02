import Navbar from "@/components/NavBar";
import Sidebar from "@/components/SideBar";
import ChannelsPanel from "@/components/ChannelPanel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex">
      {/* Sidebar (full height) */}
      <aside className="w-64 h-full bg-gray-50 border-r border-gray-200 fixed top-0 left-0 z-40">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col ml-64">
          <Navbar />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto px-30 bg-gray-50">
            {children}
          </main>

          <aside className=" bg-gray-50 border-l border-gray-200 ">
            <ChannelsPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
