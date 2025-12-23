"use client";

import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { useState } from "react";

type LikeButtonProps = {
  postId: number;
  likedByMe: boolean;
  likeCount: number;
  onChange: (liked: boolean) => void;
};

export function LikeButton({
  postId,
  likedByMe,
  likeCount,
  onChange,
}: LikeButtonProps) {
  const [loading, setLoading] = useState(false);

  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        credentials: "include", // 🔐 send cookie
      });

      if (!res.ok) return;

      const data = await res.json();
      onChange(data.liked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip label={likedByMe ? "Unlike" : "Like"}>
      <ActionIcon
        onClick={toggleLike}
        loading={loading}
        variant={likedByMe ? "filled" : "subtle"}
        color="blue"
        radius="xl"
        size="lg"
      >
        👍
        <Text size="xs" ml={6}>
          {likeCount}
        </Text>
      </ActionIcon>
    </Tooltip>
  );
}
