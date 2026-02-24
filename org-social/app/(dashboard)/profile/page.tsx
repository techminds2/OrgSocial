"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import DailyReportComposer from "@/components/DailyReportComposer";
import DailyReportViewer from "@/components/DailyReportViewer";

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
  const LIMIT = 10;

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "myPosts" | "savedPosts" | "myChannels"
  >("myPosts");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // user
  // user
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Not authenticated");

        const raw = await res.json();

        const normalized: User = {
          ...raw,
          id: Number(raw?.id ?? raw?.user_id ?? raw?.user?.id),
          role: raw?.role ?? raw?.user?.role ?? null,
          username: raw?.username ?? raw?.user?.username ?? null,
          email: raw?.email ?? raw?.user?.email ?? null,
          profile_photo:
            raw?.profileImage ??
            raw?.profile_photo ??
            raw?.user?.profileImage ??
            raw?.user?.profile_photo ??
            null,
        };

        if (!Number.isFinite(normalized.id)) {
          throw new Error("Invalid user id from /api/auth/me");
        }

        if (mounted) setUser(normalized);
      } catch (err) {
        console.error(err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // fetch page
  const fetchPostsPage = async (opts?: {
    cursor?: number | null;
    append?: boolean;
  }) => {
    const cursor = opts?.cursor ?? null;
    const append = !!opts?.append;

    const endpoint =
      activeTab === "myPosts" ? "/api/users/me/posts" : "/api/save-posts";

    const qs = new URLSearchParams();
    qs.set("limit", String(LIMIT));
    if (cursor) qs.set("cursor", String(cursor));

    const url = `${endpoint}?${qs.toString()}`;

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }

    const data = await res.json();

    const newPosts: Post[] = data.posts || [];
    const newCursor: number | null = data.nextCursor ?? null;

    setPosts((prev) => {
      if (!append) return newPosts;
      const existing = new Set(prev.map((p) => p.id));
      return [...prev, ...newPosts.filter((p) => !existing.has(p.id))];
    });

    setNextCursor(newCursor);
    setHasMore(!!newCursor && newPosts.length > 0);
  };

  // first page on tab
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (activeTab === "myChannels") return;

      setLoadingPosts(true);
      setLoadingMore(false);
      setPosts([]);
      setNextCursor(null);
      setHasMore(true);

      try {
        await fetchPostsPage({ cursor: null, append: false });
      } catch (err) {
        console.error(err);
        if (mounted) {
          setPosts([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (mounted) setLoadingPosts(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ✅ infinite scroll (window)
  useEffect(() => {
    if (activeTab === "myChannels") return;

    const el = loadMoreRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loadingPosts || loadingMore) return;
        if (!hasMore || !nextCursor) return;

        // fire-and-forget pattern (avoid async function inside observer)
        setLoadingMore(true);
        fetchPostsPage({ cursor: nextCursor, append: true })
          .catch(console.error)
          .finally(() => setLoadingMore(false));
      },
      { root: null, rootMargin: "600px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loadingPosts, loadingMore, hasMore, nextCursor]);

  // hooks above returns
  const userId = user?.id ?? 0;
  const username = user?.username ?? "Unknown";
  const profilePhoto = user?.profile_photo ?? null;

  const mappedPosts = useMemo(
    () =>
      posts.map((p: any) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        files: (p.files ?? []).map((f: any) => ({
          url: f.url ?? "/temp.jpg",
          type: f.type || "document",
        })),
        likedByMe: p.likedByMe ?? false,
        likeCount: p.likeCount ?? 0,
        saved: p.saved ?? activeTab === "savedPosts",
        savedAt: p.savedAt,
        isMine: p.isMine ?? p.author?.id === userId,
        author: {
          id: p.author?.id ?? userId,
          username: p.author?.username ?? username,
          profileImage: p.author?.profileImage ?? profilePhoto,
        },
        comments: p.comments ?? [],
        channel: p.channel ?? null,
      })),
    [posts, activeTab, userId, username, profilePhoto],
  );

  if (loadingUser)
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" />
      </div>
    );

  if (!user)
    return (
      <div className="flex justify-center py-20">
        <Text c="red">You are not logged in.</Text>
      </div>
    );

  function normalizeMediaUrl(u?: string | null) {
    if (!u) return "/temp.jpg";
    const s = String(u).trim();
    if (!s) return "/temp.jpg";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `/api/files/${s.replace(/^\/+/, "")}`;
  }

  return (
    <Container size="sm" className="py-10">
      <Paper shadow="md" className="p-6 rounded-md">
        <div className="flex flex-col items-center gap-2">
          <Avatar
            size={100}
            radius="xl"
            src={normalizeMediaUrl(user.profile_photo)}
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
      <DailyReportComposer userId={user.id} viewerId={user.id} />
      <DailyReportViewer
        userId={user.id}
        viewerId={user.id}
        viewerRole={user.role}
      />
      <Divider className="mb-4" />

      <Group justify="left" mb="md">
        <Button variant="subtle" onClick={() => setActiveTab("myPosts")}>
          My Posts
        </Button>
        <Button variant="subtle" onClick={() => setActiveTab("savedPosts")}>
          Saved Posts
        </Button>
        <Button variant="subtle" onClick={() => setActiveTab("myChannels")}>
          My Channels
        </Button>
      </Group>

      {activeTab === "myChannels" && <MyChannels />}

      {activeTab !== "myChannels" &&
        (loadingPosts ? (
          <Loader size="sm" />
        ) : mappedPosts.length === 0 ? (
          <Text className="text-center text-gray-500">
            {activeTab === "myPosts" ? "No posts yet." : "No saved posts yet."}
          </Text>
        ) : (
          <>
            <ShowPosts posts={mappedPosts} showChannel />

            {/* ✅ IMPORTANT: sentinel must have height */}
            <div ref={loadMoreRef} style={{ height: 24 }} />

            {loadingMore && (
              <div className="flex justify-center mt-2">
                <Loader size="sm" variant="dots" />
              </div>
            )}

            {/* ✅ fallback button so you can test without scroll */}
            {hasMore && nextCursor && !loadingMore && (
              <div className="flex justify-center mt-3">
                <Button
                  variant="light"
                  onClick={() => {
                    setLoadingMore(true);
                    fetchPostsPage({ cursor: nextCursor, append: true })
                      .catch(console.error)
                      .finally(() => setLoadingMore(false));
                  }}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        ))}
    </Container>
  );
}
