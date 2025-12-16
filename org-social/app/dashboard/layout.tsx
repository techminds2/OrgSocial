import Navbar from "@/components/NavBar";
import PostForm from "@/components/CreatePost";
import Sidebar from "@/components/SideBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />

      <div className="flex min-h-screen ">
        <Sidebar />
        {/* <PostForm /> */}
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </>
  );
}
