"use client";

import { useEffect, useState } from "react";
import { Loader, Text } from "@mantine/core";
import ShowPosts from "@/components/ShowPost";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/save-posts", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch saved posts");
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  if (loading) return <Loader />;
  if (!posts.length) return <Text className="text-center">No posts yet.</Text>

  return <ShowPosts channelId={undefined} posts={posts} />;
}
