// app/admin/components/HTMLEditor.tsx
// Simple HTML editor (temporary replacement for Lexical)

"use client";

import { useRef, useEffect } from "react";

interface HTMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
}

export default function HTMLEditor({
  value,
  onChange,
  placeholder,
  label,
  minHeight = "200px",
}: HTMLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Load initial content
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
      )}

      <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden">
        {/* Toolbar */}
        <div className="flex gap-1 p-2 border-b-2 border-slate-200 bg-slate-50 flex-wrap">
          <button
            type="button"
            onClick={() => execCommand("bold")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execCommand("italic")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execCommand("underline")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 underline"
            title="Underline"
          >
            U
          </button>

          <div className="w-px bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h1>")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h2>")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<p>")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
            title="Paragraph"
          >
            P
          </button>

          <div className="w-px bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
            title="Numbered List"
          >
            1. List
          </button>

          <div className="w-px bg-slate-300 mx-1"></div>

          <button
            type="button"
            onClick={() => execCommand("removeFormat")}
            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
            title="Clear Formatting"
          >
            ✕
          </button>
        </div>

        {/* Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="p-4 focus:outline-none prose prose-sm max-w-none"
          style={{ minHeight }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </div>

      <style jsx>{`
        [contentEditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
