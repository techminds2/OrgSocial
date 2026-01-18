import Navbar from "@/components/NavBar";
import Sidebar from "@/components/SideBar";
import ChannelsPanel from "@/components/ChannelPanel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-gray-50 border-r border-gray-200 z-40">
        <Sidebar />
      </aside>

      {/* Navbar */}
      <Navbar />

      {/* Channels Panel */}
      <aside className="fixed top-14 right-0 w-64 h-[calc(100vh-3.5rem)] bg-gray-50 border-l border-gray-200 z-20">
        <ChannelsPanel />
      </aside>

      {/* Main content */}
      <main
        className="
          ml-64
          mr-64
          pt-14
          h-[calc(100vh-3.5rem)]
          overflow-y-auto
          bg-gray-50
        "
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
