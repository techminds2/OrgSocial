"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";

export default function ChannelFeed({
  channelId,
  channelName,
  role,
  bannerKey,
}: {
  channelId: number;
  channelName: string;
  role: "viewer" | "editor" | "admin";
  bannerKey?: string | null;
}) {
  const bannerUrl = bannerKey
    ? bannerKey.startsWith("http://") || bannerKey.startsWith("https://")
      ? bannerKey
      : `/api/files/${bannerKey.replace(/^\/+/, "")}`
    : null;

  return (
    <div className="">
      {/* Banner */}
      {bannerUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gray-200 mb-4">
          <img
            src={bannerUrl}
            alt={`${channelName} banner`}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="max-w-5xl mx-auto space-y-0">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">#{channelName}</h1>
        </div>

        {role !== "viewer" && (
          <>
            <CreatePost channelId={channelId} />
            <div className="h-4" />
          </>
        )}

        <ShowPosts channelId={channelId} />
      </div>
    </div>
  );
}
