"use client";

import CreatePost from "@/components/CreatePost";
import ShowPosts from "@/components/ShowPost";

export default function ChannelFeed({
  channelId,
  channelName,
}: {
  channelId: number;
  channelName: string;
}) {
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">#{channelName}</h1>
          <p className="text-sm text-gray-500">
            Only members can view and post in this channel.
          </p>
        </div>

        <CreatePost channelId={channelId} />
        <div className="h-4" />
        <ShowPosts channelId={channelId} />
      </div>
    </div>
  );
}
