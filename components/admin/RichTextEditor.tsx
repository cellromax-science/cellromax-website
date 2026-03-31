"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Toolbar Button
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "p-1.5 rounded text-xs font-medium transition-colors duration-100",
        active
          ? "bg-primary/10 text-primary"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toolbar Divider
// ---------------------------------------------------------------------------

function Divider() {
  return <span className="w-px h-5 bg-gray-200 mx-0.5" />;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("링크 URL을 입력하세요:", prev);
    if (url === null) return; // 취소
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50/50">
      {/* ---- 텍스트 스타일 ---- */}
      <select
        value={
          editor.isActive("heading", { level: 2 })
            ? "h2"
            : editor.isActive("heading", { level: 3 })
              ? "h3"
              : editor.isActive("heading", { level: 4 })
                ? "h4"
                : "p"
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === "p") {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(val.replace("h", "")) as 2 | 3 | 4;
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
        className="px-2 py-1 text-xs border border-gray-200 rounded bg-white text-gray-700 cursor-pointer"
        title="텍스트 스타일"
      >
        <option value="p">본문</option>
        <option value="h2">제목 (대)</option>
        <option value="h3">제목 (중)</option>
        <option value="h4">제목 (소)</option>
      </select>

      <Divider />

      {/* ---- 서식 ---- */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="굵게 (Ctrl+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="기울임 (Ctrl+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="밑줄 (Ctrl+U)"
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="취소선"
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <Divider />

      {/* ---- 색상 ---- */}
      <label title="글자 색상" className="relative cursor-pointer">
        <span className="p-1.5 rounded text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 inline-flex items-center gap-0.5">
          A
          <span
            className="block w-3 h-1 rounded-sm"
            style={{
              backgroundColor:
                editor.getAttributes("textStyle").color ?? "#000000",
            }}
          />
        </span>
        <input
          type="color"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          value={editor.getAttributes("textStyle").color ?? "#000000"}
          onChange={(e) =>
            editor.chain().focus().setColor(e.target.value).run()
          }
        />
      </label>

      <label title="형광펜" className="relative cursor-pointer">
        <span className="p-1.5 rounded text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 inline-flex items-center gap-0.5">
          <span className="bg-yellow-200 px-0.5 rounded-sm">H</span>
        </span>
        <input
          type="color"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          defaultValue="#fef08a"
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .toggleHighlight({ color: e.target.value })
              .run()
          }
        />
      </label>

      <Divider />

      {/* ---- 정렬 ---- */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="왼쪽 정렬"
      >
        ≡
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="가운데 정렬"
      >
        ≡
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="오른쪽 정렬"
      >
        ≡
      </ToolbarButton>

      <Divider />

      {/* ---- 리스트 ---- */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="글머리 기호"
      >
        •≡
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="번호 목록"
      >
        1.
      </ToolbarButton>

      <Divider />

      {/* ---- 링크 / 구분선 ---- */}
      <ToolbarButton
        onClick={setLink}
        active={editor.isActive("link")}
        title="링크 삽입"
      >
        🔗
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        ―
      </ToolbarButton>

      <Divider />

      {/* ---- 블록 인용 ---- */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="인용구"
      >
        &ldquo;&rdquo;
      </ToolbarButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RichTextEditor
// ---------------------------------------------------------------------------

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-4 py-3 min-h-[200px] focus:outline-none text-gray-900",
        style: "color: #111827;",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // 빈 에디터인 경우 빈 문자열로
      onChange(html === "<p></p>" ? "" : html);
    },
    immediatelyRender: false,
  });

  // 외부에서 value가 변경되면 에디터 내용 동기화
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value && value !== undefined) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="space-y-1.5">
        {label && (
          <span className="block text-sm font-medium text-gray-700">
            {label}
          </span>
        )}
        <div className="h-[260px] border border-gray-200 rounded-lg bg-gray-50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
        <Toolbar editor={editor} />
        <EditorContent
          editor={editor}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
