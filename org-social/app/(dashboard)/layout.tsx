import Navbar from "@/components/NavBar";
import PostForm from "@/components/CreatePost";
import Sidebar from "@/components/SideBar";
import ChannelsPanel from "@/components/ChannelPanel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 z-50">
        <Navbar />
      </div>

      <div className="pt-14 flex">
        <aside className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 z-40">
          <Sidebar />
        </aside>

        <main className="ml-64 mr-64 w-full min-h-[calc(100vh-3.5rem)] overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>

        <aside className="fixed right-0 top-14 h-[calc(100vh-3.5rem)] w-64 z-40">
          <ChannelsPanel />
        </aside>
      </div>
    </>
  );
}
