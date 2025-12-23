"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Text } from "@mantine/core";

type FileType = {
  url: string;
  type: "image" | "video" | "document";
};

type Post = {
  id: number;
  content: string;
  createdAt: string;
  files: FileType[];
  likedByMe: boolean;
  likeCount: number;
  author: {
    id: number;
    username: string;
    profileImage?: string | null;
  };
};

export default function ShowPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/posts", {
          credentials: "include", 
        });
        if (!res.ok) throw new Error("Failed to fetch posts");

        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const toggleLike = async (postId: number) => {
    if (likingId === postId) return;
    setLikingId(postId);

    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        credentials: "include", 
      });

      if (!res.ok) return;

      const { liked } = await res.json();

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: liked,
                likeCount: liked
                  ? p.likeCount + 1
                  : p.likeCount - 1,
              }
            : p
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  if (loading) return <p className="text-center">Loading posts...</p>;
  if (!posts.length) return <p className="text-center">No posts yet.</p>;

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white shadow rounded-xl p-4">
          {/* Author info */}
          <div className="flex items-center gap-3 mb-2">
            <img
              src={post.author.profileImage || "/temp.png"}
              alt={post.author.username}
              className="w-10 h-10 rounded-full object-cover border"
              onError={(e) => {
                e.currentTarget.src = "/temp.png";
              }}
            />
            <div>
              <p className="font-semibold">{post.author.username}</p>
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Post content */}
          <p className="mb-3">{post.content}</p>

          {/* Files */}
          {post.files.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {post.files.map((f, i) => {
                if (f.type === "image")
                  return (
                    <img
                      key={i}
                      src={f.url}
                      className="w-32 h-32 object-cover rounded"
                    />
                  );
                if (f.type === "video")
                  return (
                    <video key={i} controls className="w-48 h-32 rounded">
                      <source src={f.url} />
                    </video>
                  );
                return (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    className="px-2 py-1 bg-gray-100 rounded text-xs"
                  >
                    {f.url.split("/").pop()}
                  </a>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <ActionIcon
              variant={post.likedByMe ? "filled" : "subtle"}
              color="blue"
              loading={likingId === post.id}
              onClick={() => toggleLike(post.id)}
              radius="xl"
            >
              👍
            </ActionIcon>
            <Text size="sm">{post.likeCount}</Text>
          </div>
        </div>
      ))}
    </div>
  );
}
