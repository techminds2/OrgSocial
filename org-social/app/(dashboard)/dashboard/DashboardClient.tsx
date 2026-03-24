"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";
import React, { Suspense } from "react";

export default function DashboardClient() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <Suspense fallback={null}>
        <CreatePost />
        <ShowPosts />
      </Suspense>
    </div>
  );
}
