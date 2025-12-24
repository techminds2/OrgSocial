"use client";

import React, { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
};

export default function TipTapEditor({
  value,
  onChange,
  placeholder = "Write something...",
  className = "",
  showToolbar = true,
}: Props) {
  const lastEmittedHtmlRef = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "is-empty before:content-[attr(data-placeholder)] before:float-left before:text-gray-400 before:pointer-events-none",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "ProseMirror w-full min-h-[80px] p-3 focus:outline-none",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  });

  // ✅ Only sync prop->editor when value changes externally
  useEffect(() => {
    if (!editor) return;

    const incoming = value || "";
    const lastFromEditor = lastEmittedHtmlRef.current;

    // If parent is just reflecting what editor emitted, do nothing
    if (incoming === lastFromEditor) return;

    // If parent cleared it, clear editor
    if (incoming === "") {
      editor.commands.clearContent(true);
      return;
    }

    // Otherwise parent truly changed the content (e.g., load saved post)
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const toolbarButton = (
    title: string,
    icon: React.ReactNode,
    command: () => void,
    isActive?: boolean
  ) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={command}
      className={[
        "h-9 w-9 inline-flex items-center justify-center rounded-lg border text-sm",
        "transition select-none",
        isActive
          ? "bg-blue-50 border-blue-200 text-blue-700"
          : "bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      {icon}
    </button>
  );

  const Icon = {
    Bold: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 5h7a4 4 0 0 1 0 8H7z" />
        <path d="M7 13h8a4 4 0 0 1 0 8H7z" />
      </svg>
    ),
    Italic: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 4h-9" />
        <path d="M14 20H5" />
        <path d="M15 4 9 20" />
      </svg>
    ),
    Underline: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4v6a6 6 0 0 0 12 0V4" />
        <path d="M4 20h16" />
      </svg>
    ),
    Strike: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 4H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H8" />
        <path d="M4 12h16" />
      </svg>
    ),
    H1: <span className="text-[11px] font-semibold">H1</span>,
    H2: <span className="text-[11px] font-semibold">H2</span>,
    H3: <span className="text-[11px] font-semibold">H3</span>,
    Bullet: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3.5 6h.01" />
        <path d="M3.5 12h.01" />
        <path d="M3.5 18h.01" />
      </svg>
    ),
    Ordered: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 6h11" />
        <path d="M10 12h11" />
        <path d="M10 18h11" />
        <path d="M4 6h1v4" />
        <path d="M4 12h2" />
        <path d="M4 12a1 1 0 0 1 2 0c0 1-2 1-2 2v1h2" />
      </svg>
    ),
    Quote: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17h4l-1 3H6l1-3Zm10 0h4l-1 3h-4l1-3Z" />
        <path d="M8 17a6 6 0 0 1 6-6V7a10 10 0 0 0-10 10h4Z" />
        <path d="M18 17a6 6 0 0 1 6-6V7a10 10 0 0 0-10 10h4Z" />
      </svg>
    ),
    Code: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
      </svg>
    ),
    Link: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
        <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
      </svg>
    ),
    Undo: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 14 4 9l5-5" />
        <path d="M20 20a8 8 0 0 0-8-8H4" />
      </svg>
    ),
    Redo: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m15 4 5 5-5 5" />
        <path d="M4 20a8 8 0 0 1 8-8h8" />
      </svg>
    ),
  };

  return (
    <div className={className}>
      {showToolbar && (
        <div className="mb-2 flex flex-wrap gap-2">
          {toolbarButton("Bold", Icon.Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
          {toolbarButton("Italic", Icon.Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
          {toolbarButton("Underline", Icon.Underline, () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
          {toolbarButton("Strike", Icon.Strike, () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}

          {toolbarButton("Heading 1", Icon.H1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}
          {toolbarButton("Heading 2", Icon.H2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
          {toolbarButton("Heading 3", Icon.H3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}

          {toolbarButton("Bullet list", Icon.Bullet, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
          {toolbarButton("Ordered list", Icon.Ordered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
          {toolbarButton("Quote", Icon.Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
          {toolbarButton("Code block", Icon.Code, () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock"))}

          {toolbarButton(
            editor.isActive("link") ? "Remove link" : "Add link",
            Icon.Link,
            () => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              const url = prompt("Enter URL");
              if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            },
            editor.isActive("link")
          )}

          {toolbarButton("Undo", Icon.Undo, () => editor.chain().focus().undo().run())}
          {toolbarButton("Redo", Icon.Redo, () => editor.chain().focus().redo().run())}
        </div>
      )}

      <div
        onClick={() => editor.chain().focus().run()}
        className="rounded-xl border bg-white ring-1 ring-transparent hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
