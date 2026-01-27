"use client";

import { useState } from "react";
import { Textarea, Button, Avatar, Text } from "@mantine/core";

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

export default function CommentSection({
  postId,
  initialComments,
}: {
  postId: number;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) return;

      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Avatar
            src={c.author.profileImage || "/temp.jpg"}
            radius="xl"
            size="sm"
          />
          <div>
            <Text size="sm" fw={500}>
              {c.author.username}
            </Text>
            <Text size="sm">{c.content}</Text>
          </div>
        </div>
      ))}

      <Textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.currentTarget.value)}
        autosize
        minRows={2}
      />

      <Button size="xs" loading={loading} onClick={submit}>
        Comment
      </Button>
    </div>
  );
}
