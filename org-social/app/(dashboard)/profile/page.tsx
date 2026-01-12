"use client";

import { useEffect, useState } from "react";
import { Loader, Avatar, Paper, Divider, Container, Text } from "@mantine/core";

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
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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
        if (mounted) setLoading(false);
      }
    }

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchMyPosts() {
      try {
        const res = await fetch("/api/users/me/posts", {
          credentials: "include",
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t);
        }

        const data = await res.json();
        if (mounted) setPosts(data.posts);
      } catch (err) {
        console.error("FETCH POSTS FAILED:", err);
      } finally {
        if (mounted) setLoadingPosts(false);
      }
    }

    fetchMyPosts();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
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

  return (
    <Container size="sm" className="py-10">
      <Paper shadow="md" className="p-6 rounded-md">
        {/* User Info */}
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
          {/* <Text className="text-sm text-gray-500">Role: {user.role || "N/A"}</Text> */}
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

        <Divider className="my-4" />

        {/* <Text className="text-sm text-gray-500">User ID: {user.id}</Text> */}
      </Paper>
      <Divider className="my-4" />

      <Text className="font-semibold mb-2">My Posts</Text>

      {loadingPosts ? (
        <Loader size="sm" />
      ) : posts.length === 0 ? (
        <Text size="sm" color="dimmed">
          You haven’t posted anything yet.
        </Text>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Paper key={post.id} className="p-3">
              <Text>{post.content}</Text>

              <Text size="xs" color="dimmed">
                {post.channel
                  ? `Posted in ${post.channel.name}`
                  : "Posted on dashboard"}{" "}
                · {new Date(post.createdAt).toLocaleString()}
              </Text>
            </Paper>
          ))}
        </div>
      )}
    </Container>
  );
}
