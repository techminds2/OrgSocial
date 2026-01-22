"use client";
import CreatePost from "@/components/CreatePost";
// import LogoutButton from "@/components/LogoutButton";
import ShowPosts from "@/components/ShowPost";
import { useRouter } from "next/navigation";
import React, { Suspense } from "react";

const Dashboard = () => {
  const router = useRouter();
  const handlelogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="">
      <Suspense fallback={null}>
        <CreatePost></CreatePost>
        <ShowPosts></ShowPosts>
      </Suspense>
    </div>
  );
};

export default Dashboard;
