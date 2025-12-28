"use client";

import React, { useEffect, useReducer, useRef, useState } from "react";
import type { FC } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";

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

  const [headingOpen, setHeadingOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

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
      TextAlign.configure({
        types: ["heading", "paragraph"],
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

  useEffect(() => {
    const close = () => {
      setHeadingOpen(false);
      setListOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

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
        "h-9 w-9 inline-flex items-center justify-center rounded-lg text-sm",
        "transition select-none",
        "bg-transparent hover:bg-gray-100",
        isActive ? "bg-blue-50 text-blue-700" : "text-gray-700",
      ].join(" ")}
    >
      {icon}
    </button>
  );

  const dropdownButton = (
    label: React.ReactNode,
    title: string,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    isActive?: boolean
  ) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!isOpen);
      }}
      className={[
        "h-9 inline-flex items-center gap-2 rounded-lg px-3 text-sm",
        "transition select-none",
        "bg-transparent hover:bg-gray-100",
        isActive ? "bg-blue-50 text-blue-700" : "text-gray-700",
      ].join(" ")}
    >
      <span className="truncate">{label}</span>
      <span className="text-xs opacity-70">▾</span>
    </button>
  );

  const menuItem = (label: string, onPick: () => void, active?: boolean) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onPick();
      }}
      className={[
        "w-full text-left px-3 py-2 text-sm rounded-md",
        "hover:bg-gray-100 transition",
        active ? "bg-blue-50 text-blue-700" : "text-gray-700",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const currentHeadingLabel = (() => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Paragraph";
  })();

  const headingIsActive =
    editor.isActive("heading", { level: 1 }) ||
    editor.isActive("heading", { level: 2 }) ||
    editor.isActive("heading", { level: 3 });

  const listIsActive = editor.isActive("bulletList") || editor.isActive("orderedList");

  const Icon = {
    Bold: <span className="text-[12px] font-bold">B</span>,
    Italic: <span className="text-[12px] italic">I</span>,
    Underline: <span className="text-[12px] underline">U</span>,
    Strike: <span className="text-[12px] line-through">S</span>,
    Code: <span className="text-[12px]">{`</>`}</span>,
    Link: <span className="text-[12px]">🔗</span>,
    Undo: <span className="text-[12px]">↶</span>,
    Redo: <span className="text-[12px]">↷</span>,
    AlignLeft: <span className="text-[12px]">≡</span>,
    AlignCenter: <span className="text-[12px]">≣</span>,
    AlignRight: <span className="text-[12px]">≡</span>,
    AlignJustify: <span className="text-[12px]">≣</span>,
  };

  return (
    <div className={className}>
      {showToolbar && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {toolbarButton(
            "Bold",
            Icon.Bold,
            () => editor.chain().focus().toggleBold().run(),
            editor.isActive("bold")
          )}
          {toolbarButton(
            "Italic",
            Icon.Italic,
            () => editor.chain().focus().toggleItalic().run(),
            editor.isActive("italic")
          )}
          {toolbarButton(
            "Underline",
            Icon.Underline,
            () => editor.chain().focus().toggleUnderline().run(),
            editor.isActive("underline")
          )}
          {toolbarButton(
            "Strike",
            Icon.Strike,
            () => editor.chain().focus().toggleStrike().run(),
            editor.isActive("strike")
          )}

          {/* Headings dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {dropdownButton(
              currentHeadingLabel,
              "Headings",
              headingOpen,
              (v) => {
                setHeadingOpen(v);
                if (v) setListOpen(false);
              },
              headingIsActive
            )}

            {headingOpen && (
              <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {menuItem("Paragraph", () => {
                  editor.chain().focus().setParagraph().run();
                  setHeadingOpen(false);
                }, !headingIsActive)}
                {menuItem("Heading 1", () => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setHeadingOpen(false);
                }, editor.isActive("heading", { level: 1 }))}
                {menuItem("Heading 2", () => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setHeadingOpen(false);
                }, editor.isActive("heading", { level: 2 }))}
                {menuItem("Heading 3", () => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setHeadingOpen(false);
                }, editor.isActive("heading", { level: 3 }))}
              </div>
            )}
          </div>

          {/* Lists dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {dropdownButton(
              editor.isActive("bulletList")
                ? "Bullet list"
                : editor.isActive("orderedList")
                ? "Ordered list"
                : "Lists",
              "Lists",
              listOpen,
              (v) => {
                setListOpen(v);
                if (v) setHeadingOpen(false);
              },
              listIsActive
            )}

            {listOpen && (
              <div className="absolute z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {menuItem("Bullet list", () => {
                  editor.chain().focus().toggleBulletList().run();
                  setListOpen(false);
                }, editor.isActive("bulletList"))}
                {menuItem("Ordered list", () => {
                  editor.chain().focus().toggleOrderedList().run();
                  setListOpen(false);
                }, editor.isActive("orderedList"))}
              </div>
            )}
          </div>

          {toolbarButton(
            "Code block",
            Icon.Code,
            () => editor.chain().focus().toggleCodeBlock().run(),
            editor.isActive("codeBlock")
          )}

          {toolbarButton(
            "Align left",
            Icon.AlignLeft,
            () => editor.chain().focus().setTextAlign("left").run(),
            editor.isActive({ textAlign: "left" })
          )}
          {toolbarButton(
            "Align center",
            Icon.AlignCenter,
            () => editor.chain().focus().setTextAlign("center").run(),
            editor.isActive({ textAlign: "center" })
          )}
          {toolbarButton(
            "Align right",
            Icon.AlignRight,
            () => editor.chain().focus().setTextAlign("right").run(),
            editor.isActive({ textAlign: "right" })
          )}
          {toolbarButton(
            "Justify",
            Icon.AlignJustify,
            () => editor.chain().focus().setTextAlign("justify").run(),
            editor.isActive({ textAlign: "justify" })
          )}

          {toolbarButton(
            editor.isActive("link") ? "Remove link" : "Add link",
            Icon.Link,
            () => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              const url = prompt("Enter URL");
              if (url)
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run();
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
