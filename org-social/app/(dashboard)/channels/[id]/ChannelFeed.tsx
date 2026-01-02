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
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-4">
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

        <div className="mb-4">
          <h1 className="text-xl font-semibold">#{channelName}</h1>
          <p className="text-sm text-gray-500">
            Only members can view and post in this channel.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Your role: <span className="font-medium">{role}</span>
          </p>
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
