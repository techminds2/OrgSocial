"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import {
  ActionIcon,
  Text,
  TextInput,
  Button,
  Modal,
  ScrollArea,
  Menu,
  Loader,
} from "@mantine/core";
import TipTapEditor from "./TipTapEditor";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { DocumentTextIcon, PlayIcon } from "@heroicons/react/24/outline";
import { useSeenTracker } from "@/lib/useSeenTracker";

type ShowPostsProps = {
  channelId?: number;
  posts?: Post[];
  showChannel?: boolean;
};

type FileType = {
  url: string;
  type: "image" | "video" | "document";
};

type Comment = {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
    profileImage?: string | null;
  };
};

type Post = {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;

  channel?: {
    id: number;
    name: string;
  } | null;

  files: FileType[];
  likedByMe: boolean;
  likeCount: number;
  saved?: boolean;
  savedAt?: string;
  isMine: boolean;

  author: {
    id: number;
    username: string;
    profileImage?: string | null;
  };

  comments: Comment[];
};

function getFileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop() || "Document");
  } catch {
    return url.split("/").pop() || "Document";
  }
}

function getMediaGridClass(fileCount: number) {
  if (fileCount === 1) return "grid grid-cols-1 gap-3 mb-3";
  if (fileCount === 2) return "grid grid-cols-2 gap-3 mb-3";
  return "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3";
}

export default function ShowPosts({
  channelId,
  posts: propPosts,
  showChannel = false,
}: ShowPostsProps) {
  const isControlled = Array.isArray(propPosts);
  const [posts, setPosts] = useState<Post[]>(propPosts ?? []);

  const [loading, setLoading] = useState(true);

  const [likingId, setLikingId] = useState<number | null>(null);
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {},
  );

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [editKeepFiles, setEditKeepFiles] = useState<FileType[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [commentsPost, setCommentsPost] = useState<Post | null>(null);

  const LIMIT = 10;
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { observeEl } = useSeenTracker(channelId ?? 0);

  useEffect(() => {
    if (isControlled) {
      setPosts(propPosts ?? []);
      setLoading(false);
      setHasMore(false);
      setNextCursor(null);
      return;
    }

    const initialLoad = async () => {
      setLoading(true);
      setHasMore(true);
      setNextCursor(null);
      await fetchPosts({ cursor: null, append: false });
      setLoading(false);
    };

    initialLoad();

    const onPostCreated = () => initialLoad();
    window.addEventListener("post-created", onPostCreated);

    return () => window.removeEventListener("post-created", onPostCreated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, channelId, propPosts]);

  const fetchPosts = async (opts?: {
    cursor?: number | null;
    append?: boolean;
  }) => {
    const cursor = opts?.cursor ?? null;
    const append = !!opts?.append;

    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(LIMIT));
      if (cursor) qs.set("cursor", String(cursor));

      const url = channelId
        ? `/api/channels/${channelId}/posts?${qs.toString()}`
        : `/api/posts?${qs.toString()}`;

      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(`FETCH POSTS FAILED (${res.status}) ${url} :: ${txt}`);
        throw new Error("Failed to fetch posts");
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
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;

    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loading || loadingMore) return;
        if (!hasMore || !nextCursor) return;

        setLoadingMore(true);
        await fetchPosts({ cursor: nextCursor, append: true });
        setLoadingMore(false);
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, loadingMore, hasMore, nextCursor]);

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
                likeCount: liked ? p.likeCount + 1 : p.likeCount - 1,
              }
            : p,
        ),
      );

      setCommentsPost((cur) =>
        cur && cur.id === postId
          ? {
              ...cur,
              likedByMe: liked,
              likeCount: liked ? cur.likeCount + 1 : cur.likeCount - 1,
            }
          : cur,
      );
    } finally {
      setLikingId(null);
    }
  };

  const submitComment = async (postId: number, e: FormEvent) => {
    e.preventDefault();
    if (commentingId === postId) return;

    const content = commentInputs[postId]?.trim();
    if (!content) return;

    setCommentingId(postId);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const { comment } = await res.json();

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
        ),
      );

      setCommentsPost((cur) =>
        cur && cur.id === postId
          ? { ...cur, comments: [...cur.comments, comment] }
          : cur,
      );

      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error(err);
    } finally {
      setCommentingId(null);
    }
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content || "");
    setEditKeepFiles(post.files || []);
    setEditNewFiles([]);
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    setSavingEdit(true);

    try {
      const fd = new FormData();
      fd.append("content", editContent);

      const keepKeys = (editKeepFiles || []).map((f) =>
        f.url.startsWith("/api/files/")
          ? f.url.replace("/api/files/", "")
          : f.url,
      );
      fd.append("keepKeys", JSON.stringify(keepKeys));

      for (const file of editNewFiles) fd.append("files", file);

      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PATCH",
        credentials: "include",
        body: fd,
      });

      if (!res.ok) throw new Error("Failed to update post");
      const data = await res.json();

      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...data.post } : p)),
      );
      setCommentsPost((cur) =>
        cur && cur.id === editingPost.id ? { ...cur, ...data.post } : cur,
      );
      setEditingPost(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePost = async (postId: number) => {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    if (deletingId === postId) return;
    setDeletingId(postId);

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`DELETE FAILED (${res.status}) :: ${text}`);
        throw new Error(`Failed to delete post (HTTP ${res.status})`);
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setCommentsPost((cur) => (cur?.id === postId ? null : cur));
      setEditingPost((cur) => (cur?.id === postId ? null : cur));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const openComments = (post: Post) => setCommentsPost(post);

  const media = useMemo(() => {
    if (!commentsPost) return null;
    const img = commentsPost.files?.find((f) => f.type === "image") || null;
    const vid = commentsPost.files?.find((f) => f.type === "video") || null;
    return { img, vid };
  }, [commentsPost]);

  if (loading) return <p className="text-center">Loading posts...</p>;
  if (!posts.length) return <p className="text-center">No posts yet.</p>;

  return (
    <>
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-5">
        {posts.map((post) => {
          const fileCount = post.files.length;

          return (
            <div
              key={post.id}
              data-postid={post.id}
              ref={observeEl}
              className="bg-white shadow-sm border border-gray-100 rounded-2xl px-5 py-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={post.author.profileImage || "/temp.jpg"}
                    alt={post.author.username}
                    className="w-10 h-10 rounded-full object-cover border flex-shrink-0"
                    onError={(e) => (e.currentTarget.src = "/temp.jpg")}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {post.author.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {showChannel && (
                        <>
                          {post.channel
                            ? `Posted in ${post.channel.name}`
                            : "Posted on dashboard"}
                          {" · "}
                        </>
                      )}

                      {post.savedAt
                        ? new Date(post.savedAt).toLocaleString()
                        : new Date(post.createdAt).toLocaleString()}

                      {post.isEdited && (
                        <span className="ml-2 text-gray-400">(edited)</span>
                      )}
                    </p>
                  </div>
                </div>

                {post.isMine && (
                  <Menu position="bottom-end" withArrow withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        radius="xl"
                        aria-label="Post actions"
                        loading={deletingId === post.id}
                      >
                        ⋯
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item onClick={() => openEdit(post)}>Edit</Menu.Item>
                      <Menu.Item color="red" onClick={() => deletePost(post.id)}>
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </div>

              <div
                className="post-content mb-4"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {post.files.length > 0 && (
                <div className={getMediaGridClass(fileCount)}>
                  {post.files.map((f, i) => {
                    if (f.type === "image") {
                      return (
                        <div
                          key={i}
                          className="relative group cursor-pointer"
                          onClick={() => openComments(post)}
                        >
                          <img
                            src={f.url}
                            className={`w-full rounded-xl transition group-hover:opacity-95 ${
                              fileCount === 1
                                ? "h-[380px] object-cover"
                                : "h-56 object-cover"
                            }`}
                            alt=""
                          />
                          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition" />
                        </div>
                      );
                    }

                    if (f.type === "video") {
                      return (
                        <div
                          key={i}
                          className="relative group cursor-pointer overflow-hidden rounded-xl bg-black"
                          onClick={() => openComments(post)}
                        >
                          <video
                            controls
                            className={`w-full rounded-xl ${
                              fileCount === 1
                                ? "h-[380px] object-cover"
                                : "h-56 object-cover"
                            }`}
                          >
                            <source src={f.url} />
                          </video>

                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/45 text-white rounded-full px-3 py-2 text-xs flex items-center gap-1">
                              <PlayIcon className="w-4 h-4" />
                              Play
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition min-h-[88px]"
                      >
                        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                          <DocumentTextIcon className="w-6 h-6" />
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {getFileName(f.url)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Open document preview
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mt-1 pt-1">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <ActionIcon
                      variant="subtle"
                      color={post.likedByMe ? "red" : "gray"}
                      loading={likingId === post.id}
                      onClick={() => toggleLike(post.id)}
                      radius="xl"
                      size="lg"
                      className="transition hover:bg-gray-100"
                    >
                      {post.likedByMe ? (
                        <HeartSolid className="w-6 h-6 text-red-500" />
                      ) : (
                        <HeartOutline className="w-6 h-6 text-gray-400" />
                      )}
                    </ActionIcon>

                    <Text size="sm" c="dimmed">
                      {post.likeCount}
                    </Text>
                  </div>

                  <button
                    onClick={() => openComments(post)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition"
                    type="button"
                  >
                    <ChatBubbleLeftIcon className="w-6 h-6" />
                    <span className="text-sm">{post.comments.length}</span>
                  </button>
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/posts/${post.id}/save`, {
                          method: "POST",
                          credentials: "include",
                        });
                        if (!res.ok) return;

                        const { saved } = await res.json();
                        setPosts((prev) =>
                          prev.map((p) =>
                            p.id === post.id ? { ...p, saved } : p,
                          ),
                        );
                        setCommentsPost((cur) =>
                          cur && cur.id === post.id
                            ? { ...cur, saved }
                            : cur,
                        );
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={`flex items-center transition ${
                      post.saved
                        ? "text-yellow-500"
                        : "text-gray-400 hover:text-yellow-500"
                    }`}
                  >
                    {post.saved ? (
                      <StarSolid className="w-6 h-6" />
                    ) : (
                      <StarOutline className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={loadMoreRef} />

        {loadingMore && (
          <div className="flex justify-center mt-2">
            <Loader size="sm" variant="dots" />
          </div>
        )}
      </div>

      <Modal
        opened={!!editingPost}
        onClose={() => setEditingPost(null)}
        title="Edit Post"
        size="xl"
        centered
        withinPortal
        zIndex={10000}
      >
        <div className="flex flex-col h-[65vh]">
          <TipTapEditor
            value={editContent}
            onChange={setEditContent}
            className="flex-1 overflow-auto"
            showToolbar
          />

          <div className="mt-3">
            <p className="text-sm font-semibold mb-2">Attachments</p>

            <div className="flex flex-wrap gap-2">
              {editKeepFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="border rounded p-2 text-xs flex items-center gap-2"
                >
                  <span className="truncate max-w-[180px]">
                    {f.url.split("/").pop()}
                  </span>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() =>
                      setEditKeepFiles((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setEditNewFiles((prev) => [...prev, ...files]);
                }}
              />
              {editNewFiles.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  New: {editNewFiles.map((f) => f.name).join(", ")}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <Button variant="default" onClick={() => setEditingPost(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={savingEdit}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        opened={!!commentsPost}
        onClose={() => setCommentsPost(null)}
        title={commentsPost ? `Comments · Post ${commentsPost.id}` : "Comments"}
        size="xl"
        centered
        withinPortal
        zIndex={11000}
      >
        {commentsPost && (
          <div className="flex gap-4 h-[70vh]">
            <div className="w-1/2 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
              {media?.img ? (
                <img
                  src={media.img.url}
                  className="w-full h-full object-contain"
                  alt=""
                />
              ) : media?.vid ? (
                <video controls className="w-full h-full">
                  <source src={media.vid.url} />
                </video>
              ) : (
                <div className="text-sm text-gray-500 p-6 text-center">
                  No media attached
                </div>
              )}
            </div>

            <div className="w-1/2 flex flex-col pl-3">
              <ScrollArea className="flex-1" offsetScrollbars>
                <div className="flex flex-col gap-3 pr-2 pb-4">
                  {commentsPost.comments.length === 0 ? (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  ) : (
                    commentsPost.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <img
                          src={c.author.profileImage || "/temp.jpg"}
                          alt={c.author.username}
                          className="w-7 h-7 rounded-full object-cover border"
                          onError={(e) => (e.currentTarget.src = "/temp.jpg")}
                        />
                        <div className="bg-gray-50 rounded-lg px-3 py-2 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {c.author.username}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(c.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <form
                onSubmit={(e) => submitComment(commentsPost.id, e)}
                className="pt-3 mt-2 flex gap-2 bg-white sticky bottom-0"
              >
                <TextInput
                  placeholder="Write a comment..."
                  value={commentInputs[commentsPost.id] || ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [commentsPost.id]: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
                <Button
                  type="submit"
                  loading={commentingId === commentsPost.id}
                  styles={{
                    root: {
                      backgroundColor: "var(--color-secondary)",
                      color: "white",
                      transition: "all 0.2s ease",
                      "&:hover": { backgroundColor: "var(--color-primary)" },
                      "&:disabled": {
                        backgroundColor: "rgba(90, 140, 189, 0.5)",
                        color: "white",
                      },
                    },
                  }}
                >
                  Post
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}