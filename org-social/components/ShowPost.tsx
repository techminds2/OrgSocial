// ShowPosts.tsx
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
  files: FileType[];
  likedByMe: boolean;
  likeCount: number;
  isMine: boolean;
  author: {
    id: number;
    username: string;
    profileImage?: string | null;
  };
  comments: Comment[];
};

export default function ShowPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [likingId, setLikingId] = useState<number | null>(null);
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
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

      const res = await fetch(`/api/posts?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");

      const data = await res.json();

      const newPosts: Post[] = data.posts || [];
      const newCursor: number | null = data.nextCursor ?? null;

      setPosts((prev) => {
        if (!append) return newPosts;

        // prevent duplicates if cursor overlaps
        const existing = new Set(prev.map((p) => p.id));
        const merged = [
          ...prev,
          ...newPosts.filter((p) => !existing.has(p.id)),
        ];
        return merged;
      });

      setNextCursor(newCursor);
      setHasMore(!!newCursor && newPosts.length > 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setHasMore(true);
      setNextCursor(null);
      await fetchPosts({ cursor: null, append: false });
      setLoading(false);
    };

    // initial load
    initialLoad();

    const onPostCreated = () => {
      initialLoad();
    };

    window.addEventListener("post-created", onPostCreated);

    return () => {
      window.removeEventListener("post-created", onPostCreated);
    };
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const el = loadMoreRef.current;

    const obs = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        if (loading || loadingMore) return;
        if (!hasMore || !nextCursor) return;

        setLoadingMore(true);
        await fetchPosts({ cursor: nextCursor, append: true });
        setLoadingMore(false);
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    obs.observe(el);

    return () => {
      obs.disconnect();
    };
  }, [loading, loadingMore, hasMore, nextCursor]);

  /* ---------------- LIKE ---------------- */
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
            : p
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  /* ---------------- ADD COMMENT ---------------- */
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
          p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
        )
      );

      // keep modal post in sync too
      setCommentsPost((cur) =>
        cur && cur.id === postId
          ? { ...cur, comments: [...cur.comments, comment] }
          : cur
      );

      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error(err);
    } finally {
      setCommentingId(null);
    }
  };

  /* ---------------- EDIT/DELETE ---------------- */
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

      // keepKeys must be raw keys stored in DB, not "/api/files/..."
      const keepKeys = (editKeepFiles || []).map((f) =>
        f.url.startsWith("/api/files/")
          ? f.url.replace("/api/files/", "")
          : f.url
      );

      fd.append("keepKeys", JSON.stringify(keepKeys));

      for (const file of editNewFiles) {
        fd.append("files", file);
      }

      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PATCH",
        credentials: "include",
        body: fd,
      });

      if (!res.ok) throw new Error("Failed to update post");
      const data = await res.json();

      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...data.post } : p))
      );

      // keep modal in sync if open
      setCommentsPost((cur) =>
        cur && cur.id === editingPost.id ? { ...cur, ...data.post } : cur
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
        console.error("DELETE FAILED:", {
          status: res.status,
          statusText: res.statusText,
          body: text,
        });
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

  /* ---------------- COMMENTS MODAL helpers ---------------- */
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
      <div className="w-full max-w-2xl ml-0 mr-auto flex flex-col gap-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white shadow rounded-xl p-4">
            {/* Author info + actions */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <img
                  src={post.author.profileImage || "/temp.png"}
                  alt={post.author.username}
                  className="w-10 h-10 rounded-full object-cover border"
                  onError={(e) => (e.currentTarget.src = "/temp.png")}
                />
                <div>
                  <p className="font-semibold">{post.author.username}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleString()}
                    {post.isEdited ? (
                      <span className="ml-2 text-gray-400">(edited)</span>
                    ) : null}
                  </p>
                </div>
              </div>

              {/* ✅ "..." menu for Edit/Delete */}
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

            {/* Post content */}
            <div
              className="post-content mb-3"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Files preview (keep same behavior) */}
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

            {/* Likes + Comments button */}
            <div className="flex items-center gap-3 mb-2">
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

              <Button
                size="xs"
                variant="subtle"
                onClick={() => openComments(post)}
              >
                💬 Comments ({post.comments.length})
              </Button>
            </div>
          </div>
        ))}

        <div ref={loadMoreRef} />

        {loadingMore && (
          <div className="flex justify-center mt-2">
            <Loader size="sm" variant="dots" />
          </div>
        )}
      </div>

      {/* Edit Modal */}
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

          {/* attachment editor (unchanged) */}
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
                        prev.filter((_, i) => i !== idx)
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

      {/* Comments Modal (unchanged) */}
      <Modal
        opened={!!commentsPost}
        onClose={() => setCommentsPost(null)}
        title={
          commentsPost ? `Comments · Post #${commentsPost.id}` : "Comments"
        }
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

            <div className="w-1/2 flex flex-col border-l pl-3">
              <ScrollArea className="flex-1" offsetScrollbars>
                <div className="flex flex-col gap-3 pr-2 pb-4">
                  {commentsPost.comments.length === 0 ? (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  ) : (
                    commentsPost.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <img
                          src={c.author.profileImage || "/temp.png"}
                          alt={c.author.username}
                          className="w-7 h-7 rounded-full object-cover border"
                          onError={(e) => (e.currentTarget.src = "/temp.png")}
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
                className="pt-3 mt-2 border-t flex gap-2 bg-white sticky bottom-0"
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
