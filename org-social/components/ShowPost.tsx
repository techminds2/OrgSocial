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
import {
  DocumentTextIcon,
  PlayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
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

const LIMIT = 10;
const FALLBACK_AVATAR = "/temp.jpg";

function getFileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop() || "Document");
  } catch {
    return url.split("/").pop() || "Document";
  }
}

function getDisplayFiles(files: FileType[]) {
  return files.filter((f) => f.type === "image" || f.type === "video");
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function MediaCarousel({
  files,
  initialIndex = 0,
  heightClass = "h-[320px]",
  roundedClass = "rounded-2xl",
  imageFit = "object-cover",
  videoFit = "object-cover",
  onMediaClick,
}: {
  files: FileType[];
  initialIndex?: number;
  heightClass?: string;
  roundedClass?: string;
  imageFit?: "object-cover" | "object-contain";
  videoFit?: "object-cover" | "object-contain";
  onMediaClick?: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  if (!files.length) return null;

  const active = files[activeIndex];
  const hasMultiple = files.length > 1;

  const prev = () =>
    setActiveIndex((i) => (i === 0 ? files.length - 1 : i - 1));

  const next = () =>
    setActiveIndex((i) => (i === files.length - 1 ? 0 : i + 1));

  return (
    <div
      className={`relative w-full overflow-hidden bg-black ${roundedClass} ${heightClass} flex items-center justify-center`}
    >
      {active.type === "image" ? (
        <button
          type="button"
          className="w-full h-full"
          onClick={() => onMediaClick?.(activeIndex)}
        >
          <img
            src={active.url}
            alt=""
            className={`w-full h-full ${imageFit} cursor-pointer`}
          />
        </button>
      ) : (
        <button
          type="button"
          className="relative w-full h-full"
          onClick={() => onMediaClick?.(activeIndex)}
        >
          <video
            muted
            playsInline
            className={`w-full h-full ${videoFit} cursor-pointer`}
          >
            <source src={active.url} />
          </video>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 text-white rounded-full px-4 py-2 text-sm flex items-center gap-2">
              <PlayIcon className="w-4 h-4" />
              Open video
            </div>
          </div>
        </button>
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/55 hover:bg-black/70 text-white rounded-full p-2"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/55 hover:bg-black/70 text-white rounded-full p-2"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {activeIndex + 1} / {files.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function ShowPosts({
  channelId,
  posts: propPosts,
  showChannel = false,
}: ShowPostsProps) {
  const isControlled = Array.isArray(propPosts);
  const [posts, setPosts] = useState<Post[]>(propPosts ?? []);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [likingId, setLikingId] = useState<number | null>(null);
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {},
  );

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editKeepFiles, setEditKeepFiles] = useState<FileType[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [commentsPost, setCommentsPost] = useState<Post | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { observeEl } = useSeenTracker(channelId ?? 0);

  const fetchPosts = async (opts?: {
    cursor?: number | null;
    append?: boolean;
  }) => {
    const cursor = opts?.cursor ?? null;
    const append = !!opts?.append;

    if (!append) setLoading(true);

    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(LIMIT));
      if (cursor) qs.set("cursor", String(cursor));

      const url = channelId
        ? `/api/channels/${channelId}/posts?${qs.toString()}`
        : `/api/posts?${qs.toString()}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");

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
    } finally {
      if (!append) setLoading(false);
    }
  };

  useEffect(() => {
    if (isControlled) {
      setPosts(propPosts ?? []);
      setLoading(false);
      setHasMore(false);
      setNextCursor(null);
      return;
    }

    fetchPosts();

    const handler = () => fetchPosts();
    window.addEventListener("post-created", handler);
    return () => window.removeEventListener("post-created", handler);
  }, [channelId, isControlled, propPosts]);

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

  const toggleSave = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;

      const { saved } = await res.json();

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, saved } : p)),
      );

      setCommentsPost((cur) =>
        cur && cur.id === postId ? { ...cur, saved } : cur,
      );
    } catch (err) {
      console.error(err);
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
      const keepKeys = (editKeepFiles || []).map((f) =>
        f.url.startsWith("/api/files/")
          ? f.url.replace("/api/files/", "")
          : f.url,
      );

      const fd = new FormData();
      fd.append("content", editContent);
      fd.append("keepKeys", JSON.stringify(keepKeys));
      editNewFiles.forEach((file) => fd.append("files", file));

      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PATCH",
        credentials: "include",
        body: fd,
      });

      if (!res.ok) throw new Error("Failed to update post");

      const { post } = await res.json();

      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      setCommentsPost((cur) => (cur && cur.id === post.id ? post : cur));
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

  const openComments = (post: Post, mediaIndex = 0) => {
    setCommentsPost(post);
    setActiveMediaIndex(mediaIndex);
  };

  const mediaFiles = useMemo(
    () => (commentsPost ? getDisplayFiles(commentsPost.files || []) : []),
    [commentsPost],
  );

  const hasMedia = mediaFiles.length > 0;

  if (loading) return <p className="text-center">Loading posts...</p>;
  if (!posts.length) return <p className="text-center">No posts yet.</p>;

  return (
    <>
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 pb-2">
        {posts.map((post) => {
          const mediaOnlyFiles = getDisplayFiles(post.files);
          const documents = post.files.filter((f) => f.type === "document");

          return (
            <div
              key={post.id}
              data-postid={post.id}
              ref={observeEl}
              className="bg-white shadow-sm border border-gray-100 rounded-2xl px-4 py-3"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={post.author.profileImage || FALLBACK_AVATAR}
                    alt={post.author.username}
                    className="w-10 h-10 rounded-full object-cover border flex-shrink-0"
                    onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
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
                      {formatDate(post.savedAt || post.createdAt)}
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
                      <Menu.Item
                        color="red"
                        onClick={() => deletePost(post.id)}
                      >
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

              {mediaOnlyFiles.length > 0 && (
                <div className="mb-3">
                  <MediaCarousel
                    files={mediaOnlyFiles}
                    heightClass="h-[320px]"
                    roundedClass="rounded-2xl"
                    imageFit="object-cover"
                    videoFit="object-cover"
                    onMediaClick={(index) => openComments(post, index)}
                  />
                </div>
              )}

              {documents.length > 0 && (
                <div className="grid gap-3 mb-3">
                  {documents.map((f, i) => (
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
                  ))}
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
                    type="button"
                    onClick={() => openComments(post)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition"
                  >
                    <ChatBubbleLeftIcon className="w-6 h-6" />
                    <span className="text-sm">{post.comments.length}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSave(post.id)}
                  className={`flex items-center ${
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
          );
        })}

        <div ref={loadMoreRef} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-2">
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
                    {getFileName(f.url)}
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
        size={hasMedia ? "92vw" : "lg"}
        centered
        withinPortal
        zIndex={11000}
        padding="md"
        withCloseButton
        styles={{
          header: { padding: 0, minHeight: 0 },
          body: { paddingTop: 0 },
        }}
      >
        {commentsPost && (
          <div
            className={`flex gap-4 overflow-hidden ${
              hasMedia
                ? "flex-col lg:flex-row h-[70vh] max-h-[70vh]"
                : "flex-col h-[75vh] max-h-[75vh]"
            }`}
          >
            {hasMedia && (
              <div className="lg:basis-[62%] min-w-0 flex flex-col">
                <MediaCarousel
                  files={mediaFiles}
                  initialIndex={activeMediaIndex}
                  heightClass="h-[60vh]"
                  roundedClass="rounded-2xl"
                  imageFit="object-contain"
                  videoFit="object-contain"
                />

                <div className="flex items-center gap-1.5 px-2 py-2">
                  <ActionIcon
                    variant="subtle"
                    color={commentsPost.likedByMe ? "red" : "gray"}
                    loading={likingId === commentsPost.id}
                    onClick={() => toggleLike(commentsPost.id)}
                    radius="xl"
                    size="lg"
                  >
                    {commentsPost.likedByMe ? (
                      <HeartSolid className="w-6 h-6 text-red-500" />
                    ) : (
                      <HeartOutline className="w-6 h-6 text-gray-400" />
                    )}
                  </ActionIcon>
                  <Text size="sm" c="dimmed">
                    {commentsPost.likeCount}
                  </Text>
                </div>
              </div>
            )}

            <div
              className={`min-w-0 flex flex-col h-full rounded-2xl border border-gray-200 bg-white overflow-hidden ${
                hasMedia ? "lg:basis-[38%]" : "w-full"
              }`}
            >
              <div className="px-4 py-3  bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={commentsPost.author.profileImage || FALLBACK_AVATAR}
                    alt={commentsPost.author.username}
                    className="w-10 h-10 rounded-full object-cover border"
                    onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {commentsPost.author.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(commentsPost.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1" offsetScrollbars>
                <div className="p-5 flex flex-col gap-4">
                  {commentsPost.content && (
                    <div
                      className="post-content border-b border-gray-100 pb-4 mb-1"
                      dangerouslySetInnerHTML={{ __html: commentsPost.content }}
                    />
                  )}
                  {commentsPost.comments.length === 0 ? (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  ) : (
                    commentsPost.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <img
                          src={c.author.profileImage || FALLBACK_AVATAR}
                          alt={c.author.username}
                          className="w-8 h-8 rounded-full object-cover border flex-shrink-0"
                          onError={(e) =>
                            (e.currentTarget.src = FALLBACK_AVATAR)
                          }
                        />
                        <div className="bg-gray-50 rounded-xl px-3 py-2 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {c.author.username}
                            </p>
                            <p className="text-xs text-gray-400 whitespace-nowrap">
                              {formatDate(c.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm mt-1 break-words">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <form
                onSubmit={(e) => submitComment(commentsPost.id, e)}
                className="mt-auto  bg-white p-3 flex gap-2"
              >
                <TextInput
                  placeholder="Write a comment."
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
