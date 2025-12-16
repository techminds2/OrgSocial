"use client";
import CreatePost from "@/components/CreatePost";
import LogoutButton from "@/components/LogoutButton";
import { useRouter } from "next/navigation";
import React from "react";

const Dashboard = () => {
  const router = useRouter();
  const handlelogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div>
      {/* <h1>Dashboard</h1> */}
      <CreatePost></CreatePost>
    </div>
  );
};

export default Dashboard;
