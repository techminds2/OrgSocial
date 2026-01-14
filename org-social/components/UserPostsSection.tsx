"use client";

import { useEffect, useState } from "react";
import { Loader, Text, Button, Group } from "@mantine/core";
import ShowPosts from "@/components/ShowPost";

type Post = any; // Replace with your Post type if you have one

interface UserPostsSectionProps {
  userId: number; // the profile user's ID
}

export default function UserPostsSection({ userId }: UserPostsSectionProps) {
  const [activeTab, setActiveTab] = useState<"myPosts" | "savedPosts">(
    "myPosts"
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async (type: "myPosts" | "savedPosts") => {
    setLoading(true);
    try {
      const endpoint = type === "myPosts" ? `/api/posts/me` : `/api/save-posts`;
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(activeTab);
  }, [activeTab]);

  return (
    <div>
      <Group justify="center" mb="md">
        <Button
          variant={activeTab === "myPosts" ? "filled" : "outline"}
          onClick={() => setActiveTab("myPosts")}
        >
          My Posts
        </Button>
        <Button
          variant={activeTab === "savedPosts" ? "filled" : "outline"}
          onClick={() => setActiveTab("savedPosts")}
        >
          Saved Posts
        </Button>
      </Group>

      {loading ? (
        <Loader />
      ) : posts.length === 0 ? (
        <Text className="text-center">No posts yet.</Text>
      ) : (
        <ShowPosts posts={posts} />
      )}
    </div>
  );
}
