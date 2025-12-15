"use client"
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
      <h1>Dashboard</h1>
    </div>
  );
};

export default Dashboard;
