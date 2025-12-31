"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import TipTapEditor from "./TipTapEditor";

type SelectedFile = {
  file: File;
  type: "image" | "video" | "document";
};

const stripHtml = (html: string) =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isEmptyTipTap = (html: string) => {
  const v = (html || "").trim();
  if (!v) return true;

  if (v === "<p></p>" || v === "<p><br></p>") return true;

  const text = stripHtml(v);
  const hasMedia =
    /<(img|video|iframe|audio)\b/i.test(v) || /<a\b[^>]*href=/i.test(v);

  return text.length === 0 && !hasMedia;
};

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const isBlank = isEmptyTipTap(content);
  const canPost = !isBlank || files.length > 0;

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditorOpen) return;

    const t = setTimeout(() => {
      const root = editorHostRef.current;
      if (!root) return;

      const el =
        (root.querySelector(".ProseMirror") as HTMLElement | null) ||
        (root.querySelector('[contenteditable="true"]') as HTMLElement | null);

      el?.focus();
    }, 50);

    return () => clearTimeout(t);
  }, [isEditorOpen]);

  const handleSelectFile = (file: File, type: SelectedFile["type"]) => {
    setFiles((prev) => [...prev, { file, type }]);
  };

  const previews = useMemo(() => {
    const list = files.map((f) => ({
      ...f,
      previewUrl:
        f.type === "document" ? "" : URL.createObjectURL(f.file),
      name: f.file.name,
    }));
    return list;
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [files]);

  const handlePost = async () => {
    setLoading(true);

    const formData = new FormData();
    formData.append("content", content);

    files.forEach((f) => {
      formData.append("files", f.file);
      formData.append("types", f.type);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("UPLOAD FAILED:", res.status, t);
        return;
      }

      const data = await res.json();
      console.log("POST RESPONSE:", data);

      window.dispatchEvent(
        new CustomEvent("post-created", { detail: data.post })
      );

      setContent("");
      setFiles([]);
      setIsEditorOpen(false);
    } catch (err) {
      console.error("Post failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 w-full max-w-2xl relative">
      <div className="flex gap-4">
        <img
          src="/temp.png"
          alt="User"
          className="w-12 h-12 rounded-full object-cover border"
        />

        <div
          onClick={() => setIsEditorOpen(true)}
          className="flex-1 border rounded-xl p-2 cursor-text text-gray-400"
        >
          {!isBlank ? (
            <div
              className="post-content text-gray-900"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            "Write something..."
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {f.type}
            </div>
          ))}
        </div>
      )}

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) =>
          e.target.files && handleSelectFile(e.target.files[0], "image")
        }
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) =>
          e.target.files && handleSelectFile(e.target.files[0], "video")
        }
      />
      <input
        ref={docRef}
        type="file"
        accept=".pdf,.doc,.docx"
        hidden
        onChange={(e) =>
          e.target.files && handleSelectFile(e.target.files[0], "document")
        }
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-600">
          <button type="button" onClick={() => photoRef.current?.click()}>
            📷 Photo
          </button>
          <button type="button" onClick={() => videoRef.current?.click()}>
            🎥 Video
          </button>
          <button type="button" onClick={() => docRef.current?.click()}>
            📄 Document
          </button>
        </div>

        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost || loading}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white
            ${
              loading
                ? "bg-gray-400"
                : canPost
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <Modal
        opened={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="Add Post"
        size="xl"
        centered
        withinPortal
        zIndex={10000}
        overlayProps={{
          color:
            colorScheme === "dark"
              ? theme.colors.dark[9]
              : theme.colors.gray[2],
          opacity: 0.75,
          blur: 3,
        }}
      >
        <div className="flex flex-col h-[65vh]">
          {/* editor */}
          <div ref={editorHostRef} className="flex-1 overflow-auto">
            <TipTapEditor
              value={content}
              onChange={setContent}
              className="h-full"
              showToolbar
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 border rounded-xl p-3 bg-gray-50">
              <div className="text-sm font-semibold mb-2">Attachments</div>

              <div className="flex gap-3 flex-wrap">
                {previews.map((p, i) => {
                  if (p.type === "image") {
                    return (
                      <div key={i} className="w-28">
                        <img
                          src={p.previewUrl}
                          className="w-28 h-28 rounded-lg object-cover border"
                          alt={p.name}
                        />
                        <div className="text-[11px] text-gray-600 mt-1 truncate">
                          {p.name}
                        </div>
                      </div>
                    );
                  }

                  if (p.type === "video") {
                    return (
                      <div key={i} className="w-40">
                        <video
                          controls
                          className="w-40 h-28 rounded-lg border object-cover"
                        >
                          <source src={p.previewUrl} />
                        </video>
                        <div className="text-[11px] text-gray-600 mt-1 truncate">
                          {p.name}
                        </div>
                      </div>
                    );
                  }

                  // document
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white"
                    >
                      <span className="text-lg">📄</span>
                      <div className="text-sm">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">Document</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={handlePost} disabled={!canPost} loading={loading}>
              Post
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
