"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";

export default function ChannelFeed({
  channelId,
  channelName,
  role,
}: {
  channelId: number;
  channelName: string;
  role: "viewer" | "editor" | "admin";
}) {
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
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
