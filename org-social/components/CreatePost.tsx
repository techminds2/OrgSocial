"use client";

import { useRef, useState } from "react";

type UploadedFile = {
  url: string;
  type: "image" | "video" | "document";
};

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  // upload helper
  const uploadFile = async (file: File, type: UploadedFile["type"]) => {
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log(data.url);


    setFiles((prev) => [...prev, { url: data.url, type }]);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 w-full max-w-2xl">
      {/* Top */}
      <div className="flex gap-4">
        {/* User avatar (replace later with real image) */}
        <img
          src="/default-avatar.png"
          alt="User"
          className="w-12 h-12 rounded-full object-cover border"
        />

        <textarea
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-300
                   p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Preview uploaded files */}
      {files.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {files.map((file, i) => (
            <div
              key={i}
              className="text-xs bg-gray-100 px-2 py-1 rounded"
            >
              {file.type}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) =>
          e.target.files &&
          uploadFile(e.target.files[0], "image")
        }
      />

      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) =>
          e.target.files &&
          uploadFile(e.target.files[0], "video")
        }
      />

      <input
        ref={docRef}
        type="file"
        accept=".pdf,.doc,.docx"
        hidden
        onChange={(e) =>
          e.target.files &&
          uploadFile(e.target.files[0], "document")
        }
      />

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-600">
          <button onClick={() => photoRef.current?.click()}>
            📷 Photo
          </button>
          <button onClick={() => videoRef.current?.click()}>
            🎥 Video
          </button>
          <button onClick={() => docRef.current?.click()}>
            📄 Document
          </button>
        </div>

        <button
          disabled={!content.trim() && files.length === 0 || loading}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white
            ${
              loading
                ? "bg-gray-400"
                : content.trim() || files.length
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          {loading ? "Uploading..." : "Post"}
        </button>
      </div>
    </div>
  );
}
