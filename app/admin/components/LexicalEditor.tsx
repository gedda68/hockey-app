// app/admin/components/LexicalEditor.tsx
// Rich text editor using Lexical

"use client";

import { useEffect, useState } from "react";
import {
  $getRoot,
  $getSelection,
  $createParagraphNode,
  $createTextNode,
  EditorState,
  LexicalEditor as LexicalEditorType,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingTagType,
} from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode as createParagraph,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";

interface LexicalEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
}

// Toolbar Component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!selection) return;

        // Update format state
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
      });
    });
  }, [editor]);

  const formatText = (format: "bold" | "italic" | "underline") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingType: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection !== null) {
        const heading = $createHeadingNode(headingType);
        selection.insertNodes([heading]);
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection !== null) {
        const paragraph = $createParagraphNode();
        selection.insertNodes([paragraph]);
      }
    });
  };

  const insertBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const insertNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  return (
    <div className="flex gap-1 p-2 border-b-2 border-slate-200 bg-slate-50 flex-wrap">
      {/* Text Formatting */}
      <button
        type="button"
        onClick={() => formatText("bold")}
        className={`px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 font-bold ${
          isBold ? "bg-indigo-100 border-indigo-400" : "bg-white"
        }`}
        title="Bold (Ctrl+B)"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => formatText("italic")}
        className={`px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 italic ${
          isItalic ? "bg-indigo-100 border-indigo-400" : "bg-white"
        }`}
        title="Italic (Ctrl+I)"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => formatText("underline")}
        className={`px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 underline ${
          isUnderline ? "bg-indigo-100 border-indigo-400" : "bg-white"
        }`}
        title="Underline (Ctrl+U)"
      >
        U
      </button>

      <div className="w-px bg-slate-300 mx-1"></div>

      {/* Block Formatting */}
      <button
        type="button"
        onClick={() => formatHeading("h1")}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => formatHeading("h2")}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => formatHeading("h3")}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        onClick={formatParagraph}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
        title="Paragraph"
      >
        P
      </button>

      <div className="w-px bg-slate-300 mx-1"></div>

      {/* Lists */}
      <button
        type="button"
        onClick={insertBulletList}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={insertNumberedList}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
        title="Numbered List"
      >
        1. List
      </button>

      <div className="w-px bg-slate-300 mx-1"></div>

      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
    </div>
  );
}

// Plugin to load initial HTML content
function InitialContentPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    console.log("🔄 InitialContentPlugin running");
    console.log("📝 HTML to load:", html);
    console.log("📏 HTML length:", html?.length);

    if (html && html.trim()) {
      editor.update(() => {
        try {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, "text/html");
          const nodes = $generateNodesFromDOM(editor, dom);

          console.log("✅ Parsed nodes count:", nodes.length);
          console.log("📦 Nodes:", nodes);

          const root = $getRoot();
          root.clear();

          if (nodes && nodes.length > 0) {
            root.append(...nodes);
            console.log("✅ Content loaded to editor successfully");
          } else {
            console.warn("⚠️ No nodes generated from HTML, using fallback");
            // Fallback: create text node with stripped HTML
            const paragraph = $createParagraphNode();
            const text = $createTextNode(html.replace(/<[^>]*>/g, ""));
            paragraph.append(text);
            root.append(paragraph);
            console.log("✅ Fallback content loaded");
          }
        } catch (error) {
          console.error("❌ Error loading content:", error);
          // Fallback: plain text
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          const text = $createTextNode(html.replace(/<[^>]*>/g, ""));
          paragraph.append(text);
          root.append(paragraph);
          console.log("✅ Error fallback content loaded");
        }
      });
    } else {
      console.log("⚠️ No HTML to load (empty or undefined)");
      // Clear editor if no HTML
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        console.log("🧹 Editor cleared");
      });
    }
  }, [editor, html]); // Re-run when html changes

  return null;
}

export default function LexicalEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  label,
  minHeight = "200px",
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: "ClubEditor",
    theme: {
      paragraph: "mb-2",
      heading: {
        h1: "text-3xl font-bold mb-3",
        h2: "text-2xl font-bold mb-2",
        h3: "text-xl font-bold mb-2",
      },
      list: {
        ul: "list-disc list-inside mb-2",
        ol: "list-decimal list-inside mb-2",
        listitem: "ml-4",
      },
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
      },
    },
    onError: (error: Error) => {
      console.error("Lexical error:", error);
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
  };

  const handleChange = (
    editorState: EditorState,
    editor: LexicalEditorType
  ) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor);
      onChange(htmlString);
    });
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
      )}

      <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden">
        <LexicalComposer initialConfig={initialConfig}>
          <ToolbarPlugin />
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="p-4 focus:outline-none prose prose-sm max-w-none"
                  style={{ minHeight }}
                />
              }
              placeholder={
                <div
                  className="absolute top-4 left-4 text-slate-400 pointer-events-none"
                  style={{ userSelect: "none" }}
                >
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={handleChange} />
            <HistoryPlugin />
            <InitialContentPlugin html={value} />
          </div>
        </LexicalComposer>
      </div>
    </div>
  );
}
