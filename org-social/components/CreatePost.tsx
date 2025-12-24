"use client";

import { useRef, useState, useEffect } from "react";
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

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    console.log("isEditorOpen:", isEditorOpen);
  }, [isEditorOpen]);

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = (file: File, type: SelectedFile["type"]) => {
    setFiles((prev) => [...prev, { file, type }]);
  };

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
      });

      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      // const data = await res.json();
      // console.log("POST RESPONSE:", data);

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
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
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
          disabled={(!content.trim() && files.length === 0) || loading}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white
            ${
              loading
                ? "bg-gray-400"
                : content.trim() || files.length
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
          <TipTapEditor
            value={content}
            onChange={setContent}
            placeholder="Write something..."
            className="flex-1 overflow-auto"
            showToolbar
          />

          <div className="flex justify-end mt-4">
            <Button
              onClick={handlePost}
              disabled={!content.trim() && files.length === 0}
              loading={loading}
            >
              Post
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
