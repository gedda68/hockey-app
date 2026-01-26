"use client";

import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  label,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
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
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-slate-100 rounded-t-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded font-bold text-sm border border-slate-200"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded italic text-sm border border-slate-200"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded underline text-sm border border-slate-200"
          title="Underline"
        >
          U
        </button>

        <div className="w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => execCommand("formatBlock", "<h2>")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded font-bold text-sm border border-slate-200"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "<h3>")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded font-bold text-sm border border-slate-200"
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "<p>")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded text-sm border border-slate-200"
          title="Paragraph"
        >
          P
        </button>

        <div className="w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded text-sm border border-slate-200"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded text-sm border border-slate-200"
          title="Numbered List"
        >
          1. List
        </button>

        <div className="w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className="px-3 py-1 bg-white hover:bg-slate-50 rounded text-sm border border-slate-200"
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>

      {/* Editor Area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[200px] p-4 bg-slate-50 border border-slate-200 rounded-b-2xl focus:ring-2 ring-yellow-400 outline-none"
          style={{ whiteSpace: "pre-wrap" }}
          suppressContentEditableWarning
        />
        {!value && (
          <div className="absolute top-4 left-4 text-slate-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
