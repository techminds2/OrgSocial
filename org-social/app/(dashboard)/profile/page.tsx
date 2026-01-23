"use client";

import { useEffect, useState } from "react";
import {
  Loader,
  Avatar,
  Paper,
  Divider,
  Container,
  Text,
  Button,
  Group,
} from "@mantine/core";
import ShowPosts from "@/components/ShowPost";
import MyChannels from "@/components/MyChannels";

type User = {
  id: number;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
  role: string | null;
  organization_unit?: number | null;
  department?: number | null;
  job_title?: string | null;
  profile_photo?: string | null;
  staff_since?: string | null;
  supervisors?: any[];
};

type Post = {
  id: number;
  content: string;
  createdAt: string;
  channel?: { id: number; name: string } | null;
  files?: { url: string | null; type: string }[];
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "myPosts" | "savedPosts" | "myChannels"
  >("myPosts");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Fetch user info
  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Not authenticated");
        const data: User = await res.json();
        if (mounted) setUser(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }
    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch posts based on active tab
  useEffect(() => {
    let mounted = true;
    async function fetchPosts() {
      setLoadingPosts(true);
      try {
        const endpoint =
          activeTab === "myPosts" ? "/api/users/me/posts" : "/api/save-posts";
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        const data = await res.json();
        if (mounted) setPosts(data.posts || []);
      } catch (err) {
        console.error(err);
        if (mounted) setPosts([]);
      } finally {
        if (mounted) setLoadingPosts(false);
      }
    }
    fetchPosts();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  if (loadingUser)
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" />
      </div>
    );

  if (!user)
    return (
      <div className="flex justify-center py-20">
        <Text color="red">You are not logged in.</Text>
      </div>
    );

  // Map posts exactly like your original code
  const mappedPosts = posts.map((p: any) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,

    files: (p.files ?? []).map((f: any) => ({
      url: f.url ?? "/temp.png",
      type: f.type || "document",
    })),

    likedByMe: p.likedByMe ?? false,
    likeCount: p.likeCount ?? 0,
    saved: p.saved ?? activeTab === "savedPosts",
    savedAt: p.savedAt,

    isMine: p.isMine ?? p.author?.id === user.id,

    author: {
      id: p.author?.id ?? user.id,
      username: p.author?.username ?? user.username ?? "Unknown",
      profileImage: p.author?.profileImage ?? user.profile_photo,
    },

    comments: p.comments ?? [],
    channel: p.channel ?? null,
  }));

  return (
    <Container size="sm" className="py-10">
      <Paper shadow="md" className="p-6 rounded-md">
        <div className="flex flex-col items-center gap-2">
          <Avatar
            size={100}
            radius="xl"
            src={user.profile_photo || "/temp.png"}
          />
          <Text className="text-lg font-semibold">
            {user.first_name} {user.last_name} ({user.username})
          </Text>
          <Text className="text-sm text-gray-500">{user.email}</Text>
          {user.job_title && (
            <Text className="text-sm text-gray-500">
              Job Title: {user.job_title}
            </Text>
          )}
          {user.department && (
            <Text className="text-sm text-gray-500">
              Department ID: {user.department}
            </Text>
          )}
          {user.organization_unit && (
            <Text className="text-sm text-gray-500">
              Organization Unit ID: {user.organization_unit}
            </Text>
          )}
          {user.staff_since && (
            <Text className="text-sm text-gray-500">
              Staff Since: {user.staff_since}
            </Text>
          )}
        </div>
      </Paper>

      <Divider className="mb-4" />

      {/* Tabs for My Posts / Saved Posts */}
      <Group justify="left" mb="md">
        <Button
          variant="subtle"
          onClick={() => setActiveTab("myPosts")}
          styles={(theme) => ({
            root: {
              background: "transparent",
              color: theme.colors.dark[9],
              border: "none",
              padding: "6px 12px",
              borderBottom:
                activeTab === "myPosts"
                  ? `2px solid ${theme.colors.blue[6]}`
                  : "none",
              borderRadius: 0,
              cursor: "pointer",
              transition: "border-bottom 0.2s",
              "&:hover": {
                background: "transparent",
              },
            },
          })}
        >
          My Posts
        </Button>
        <Button
          variant="subtle"
          onClick={() => setActiveTab("savedPosts")}
          styles={(theme) => ({
            root: {
              background: "transparent",
              color: theme.colors.dark[9],
              border: "none",
              padding: "6px 12px",
              borderBottom:
                activeTab === "savedPosts"
                  ? `2px solid ${theme.colors.blue[6]}`
                  : "none",
              borderRadius: 0,
              cursor: "pointer",
              transition: "border-bottom 0.2s",
              "&:hover": {
                background: "transparent",
              },
            },
          })}
        >
          Saved Posts
        </Button>
        <Button
          variant="subtle"
          onClick={() => setActiveTab("myChannels")}
          styles={(theme) => ({
            root: {
              background: "transparent",
              color: theme.colors.dark[9],
              border: "none",
              padding: "6px 12px",
              borderBottom:
                activeTab === "myChannels"
                  ? `2px solid ${theme.colors.blue[6]}`
                  : "none",
              borderRadius: 0,
              cursor: "pointer",
              transition: "border-bottom 0.2s",
              "&:hover": { background: "transparent" },
            },
          })}
        >
          My Channels
        </Button>{" "}
      </Group>

      {activeTab === "myPosts" &&
        (loadingPosts ? (
          <Loader size="sm" />
        ) : mappedPosts.length === 0 ? (
          <Text className="text-center text-gray-500">No posts yet.</Text>
        ) : (
          <ShowPosts posts={mappedPosts} showChannel />
        ))}

      {activeTab === "savedPosts" &&
        (loadingPosts ? (
          <Loader size="sm" />
        ) : mappedPosts.length === 0 ? (
          <Text className="text-center text-gray-500">No saved posts yet.</Text>
        ) : (
          <ShowPosts posts={mappedPosts} showChannel />
        ))}

      {activeTab === "myChannels" && <MyChannels />}
    </Container>
  );
}
