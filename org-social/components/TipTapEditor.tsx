"use client";

import React, { useEffect, useReducer, useRef } from "react";
import type { FC } from "react";
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

const TipTapEditor: FC<Props> = ({
  value,
  onChange,
  placeholder = "",
  className = "",
  showToolbar = true,
}) => {
  const lastEmittedHtmlRef = useRef<string>("");
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

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
        class: [
          "ProseMirror w-full min-h-[140px] p-3 focus:outline-none",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-2",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_blockquote]:my-2",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
          "[&_a]:text-blue-600 [&_a]:underline",
          "post-content",
        ].join(" "),
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const rerender = () => forceUpdate();
    editor.on("transaction", rerender);
    editor.on("selectionUpdate", rerender);

    return () => {
      editor.off("transaction", rerender);
      editor.off("selectionUpdate", rerender);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const incoming = value || "";
    const lastFromEditor = lastEmittedHtmlRef.current;

    if (incoming === lastFromEditor) return;

    if (incoming === "") {
      editor.commands.clearContent(true);
      return;
    }

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
      onMouseDown={(e) => {
        e.preventDefault();
        command();
      }}
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
    Bold: <span className="text-[12px] font-bold">B</span>,
    Italic: <span className="text-[12px] italic">I</span>,
    Underline: <span className="text-[12px] underline">U</span>,
    Strike: <span className="text-[12px] line-through">S</span>,
    H1: <span className="text-[11px] font-semibold">H1</span>,
    H2: <span className="text-[11px] font-semibold">H2</span>,
    H3: <span className="text-[11px] font-semibold">H3</span>,
    Bullet: <span className="text-[12px]">•</span>,
    Ordered: <span className="text-[12px]">1.</span>,
    Quote: <span className="text-[12px]">❝</span>,
    Code: <span className="text-[12px]">{`</>`}</span>,
    Link: <span className="text-[12px]">🔗</span>,
    Undo: <span className="text-[12px]">↶</span>,
    Redo: <span className="text-[12px]">↷</span>,
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
};

export default TipTapEditor;
