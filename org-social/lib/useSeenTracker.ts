"use client";

import { useEffect, useMemo, useRef } from "react";

export function useSeenTracker(channelId: number) {
  const queueRef = useRef<number[]>([]);
  const timerRef = useRef<any>(null);

  const flush = async () => {
    const ids = Array.from(new Set(queueRef.current));
    queueRef.current = [];
    if (ids.length === 0) return;

    try {
      await fetch("/api/posts/seen", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, postIds: ids }),
      });

      window.dispatchEvent(
        new CustomEvent("posts-seen", { detail: { channelId, postIds: ids } }),
      );
    } catch {}
  };

  const enqueue = (postId: number) => {
    queueRef.current.push(postId);
    if (timerRef.current) return;
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      await flush();
    }, 700);
  };

  const observer = useMemo(() => {
    if (typeof window === "undefined") return null;

    return new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const pid = Number(el.dataset.postid);
          if (Number.isFinite(pid)) enqueue(pid);
          (observer as any)?.unobserve(el);
        }
      },
      { threshold: 0.6 },
    );
  }, [channelId]);

  useEffect(() => {
    return () => {
      observer?.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [observer]);

  const observeEl = (el: HTMLElement | null) => {
    if (!el || !observer) return;
    observer.observe(el);
  };

  return { observeEl };
}
