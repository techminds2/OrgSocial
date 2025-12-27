"use client";

import { useEffect, useState, FormEvent } from "react";
import { ActionIcon, Text, TextInput, Button, Modal } from "@mantine/core";
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
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/posts", { credentials: "include" });
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
  };

  const saveEdit = async () => {
    if (!editingPost) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error("Failed to update post");
      const data = await res.json();

      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...data.post } : p))
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

      // ✅ show exact error from server
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
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p className="text-center">Loading posts...</p>;
  if (!posts.length) return <p className="text-center">No posts yet.</p>;

  return (
    <>
      <div className="flex flex-col gap-4">
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
                  </p>
                </div>
              </div>

              {post.isMine && (
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => openEdit(post)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    loading={deletingId === post.id}
                    onClick={() => deletePost(post.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Post content */}
            <div
              className="post-content mb-3"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

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

            {/* Likes */}
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
            </div>

            {/* Comments */}
            <div className="mt-2">
              <p className="font-semibold mb-1">Comments:</p>
              <div className="flex flex-col gap-2 mb-2">
                {post.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <img
                      src={c.author.profileImage || "/temp.png"}
                      alt={c.author.username}
                      className="w-6 h-6 rounded-full object-cover border"
                      onError={(e) => (e.currentTarget.src = "/temp.png")}
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {c.author.username}
                      </p>
                      <p className="text-sm">{c.content}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add comment input */}
              <form
                onSubmit={(e) => submitComment(post.id, e)}
                className="flex gap-2"
              >
                <TextInput
                  placeholder="Add a comment..."
                  value={commentInputs[post.id] || ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [post.id]: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
                <Button type="submit" loading={commentingId === post.id}>
                  Post
                </Button>
              </form>
            </div>
          </div>
        ))}
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
    </>
  );
}
