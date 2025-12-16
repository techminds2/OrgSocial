"use client";

import { useRef, useState } from "react";

export default function CreatePost() {
  const [content, setContent] = useState("");

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-2xl shadow p-4 w-full max-w-2xl">
      {/* Top */}
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-300" />

        <textarea
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="mt-4 w-full resize-none rounded-xl border border-gray-300
                   p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}

      {/* Hidden file inputs */}
      <input ref={photoRef} type="file" accept="image/*" hidden />
      <input ref={videoRef} type="file" accept="video/*" hidden />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx" hidden />

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-600">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="flex items-center gap-1 hover:text-blue-600"
          >
            📷 Photo
          </button>

          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            className="flex items-center gap-1 hover:text-blue-600"
          >
            🎥 Video
          </button>

          <button
            type="button"
            onClick={() => docRef.current?.click()}
            className="flex items-center gap-1 hover:text-blue-600"
          >
            📄 Document
          </button>
        </div>

        <button
          disabled={!content.trim()}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white
            ${
              content.trim()
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
        >
          Post
        </button>
      </div>
    </div>
  );
}
