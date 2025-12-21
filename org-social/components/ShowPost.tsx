"use client";

import { useEffect, useState } from "react";

type FileType = {
  url: string;
  type: "image" | "video" | "document";
};

type Post = {
  id: number;
  content: string;
  createdAt: string;
  files: FileType[];
  author: {
    id: number;
    username: string;
    profileImage?: string | null;
  };
};

export default function ShowPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/posts"); // Your API route to get posts
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

  if (loading) return <p className="text-center">Loading posts...</p>;

  if (!posts.length) return <p className="text-center">No posts yet.</p>;

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white shadow rounded-xl p-4">
          {/* Author info */}
          <div className="flex items-center gap-3 mb-2">
            <img
              src={post.author.profileImage || "/logo.webp"}
              alt={post.author.username}
              className="w-10 h-10 rounded-full object-cover border"
            />
            <div>
              <p className="font-semibold">{post.author.username}</p>
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Post content */}
          <p className="mb-2">{post.content}</p>

          {/* Files */}
          {post.files.length > 0 && (
            <div className="flex gap-2 flex-wrap">
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
        </div>
      ))}
    </div>
  );
}
