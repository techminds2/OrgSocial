"use client";

import { useRef, useState } from "react";

type SelectedFile = {
  file: File;
  type: "image" | "video" | "document";
};

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);

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

      // reset UI
      setContent("");
      setFiles([]);
    } catch (err) {
      console.error("Post failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 w-full max-w-2xl">
      {/* Top */}
      <div className="flex gap-4">
        <img
          src="/temp.png"
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

      {/* Preview selected files */}
      {files.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {f.type}
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectFile(f, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectFile(f, "video");
          e.target.value = "";
        }}
      />
      <input
        ref={docRef}
        type="file"
        accept=".pdf,.doc,.docx"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectFile(f, "document");
          e.target.value = "";
        }}
      />

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-600">
          <button onClick={() => photoRef.current?.click()}>📷 Photo</button>
          <button onClick={() => videoRef.current?.click()}>🎥 Video</button>
          <button onClick={() => docRef.current?.click()}>📄 Document</button>
        </div>

        <button
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
    </div>
  );
}
