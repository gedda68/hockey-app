// sections/NotesHistorySection.tsx
// Admin, behavioral, achievement, coaching, and medical notes
// SIMPLIFIED - Works with PlayerForm save mechanism

"use client";

import { useState } from "react";
import { BaseSectionProps } from "../types/player.types";
import {
  FileText,
  AlertCircle,
  Award,
  Clipboard,
  Heart,
  Plus,
  Trash2,
  Calendar,
  User,
  Edit,
  Save,
  X,
} from "lucide-react";

interface Note {
  id: string;
  type: "admin" | "behavioral" | "achievement" | "coaching" | "medical";
  date: string;
  author: string;
  content: string;
  private: boolean;
}

export default function NotesHistorySection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const notes = formData.notes || [];
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const addNote = (type: Note["type"]) => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      date: new Date().toISOString(), // ✅ Full datetime with timezone
      author: "Admin", // This would come from current user in real implementation
      content: "",
      private: type === "admin" || type === "medical" || type === "behavioral",
    };
    onChange("notes", [...notes, newNote]);
    setEditingNote(newNote.id); // Auto-edit new note
  };

  const removeNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      onChange(
        "notes",
        notes.filter((n: Note) => n.id !== id),
      );
    }
  };

  const updateNote = (id: string, field: keyof Note, value: any) => {
    onChange(
      "notes",
      notes.map((n: Note) => (n.id === id ? { ...n, [field]: value } : n)),
    );
  };

  const noteTypes = [
    {
      type: "admin" as const,
      icon: FileText,
      label: "Admin Notes",
      description: "Internal administrative notes",
      color: "blue",
      private: true,
    },
    {
      type: "behavioral" as const,
      icon: AlertCircle,
      label: "Behavioral Notes",
      description: "Behavior tracking and incidents",
      color: "red",
      private: true,
    },
    {
      type: "achievement" as const,
      icon: Award,
      label: "Achievements",
      description: "Awards and milestones",
      color: "yellow",
      private: false,
    },
    {
      type: "coaching" as const,
      icon: Clipboard,
      label: "Coaching Notes",
      description: "Development and training notes",
      color: "green",
      private: false,
    },
    {
      type: "medical" as const,
      icon: Heart,
      label: "Medical Notes",
      description: "Injury and health tracking",
      color: "red",
      private: true,
    },
  ];

  const getNoteTypeInfo = (type: Note["type"]) => {
    return noteTypes.find((t) => t.type === type) || noteTypes[0];
  };

  // ✅ Format datetime for display (with time)
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      // Output: "26 Feb 2026, 10:30 AM"
    } catch {
      return "Invalid date";
    }
  };

  // ✅ Convert ISO datetime to datetime-local input format
  const toDateTimeLocal = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      // Format: YYYY-MM-DDTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // ✅ Convert datetime-local input to ISO string
  const fromDateTimeLocal = (dateTimeLocal: string) => {
    if (!dateTimeLocal) return "";
    try {
      // datetime-local gives us local time, convert to ISO
      const date = new Date(dateTimeLocal);
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Note Buttons */}
      <div>
        <h3 className="text-xs font-black uppercase text-slate-400 mb-3">
          Add New Note
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {noteTypes.map((noteType) => {
            const Icon = noteType.icon;
            return (
              <button
                key={noteType.type}
                type="button"
                onClick={() => addNote(noteType.type)}
                className={`p-3 rounded-xl border-2 border-${noteType.color}-200 bg-${noteType.color}-50 hover:bg-${noteType.color}-100 transition-colors text-left group`}
              >
                <Icon className={`text-${noteType.color}-600 mb-2`} size={20} />
                <p className="text-xs font-black text-slate-900">
                  {noteType.label}
                </p>
                <p className="text-xs text-slate-500 mt-1 hidden md:block">
                  {noteType.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 font-bold">No notes yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Click one of the buttons above to add your first note
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400">
            All Notes ({notes.length})
          </h3>

          {notes
            .sort(
              (a: Note, b: Note) =>
                new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .map((note: Note) => {
              const noteTypeInfo = getNoteTypeInfo(note.type);
              const Icon = noteTypeInfo.icon;
              const isEditing = editingNote === note.id;
              const isExpanded = expandedNote === note.id;

              return (
                <div
                  key={note.id}
                  className={`p-4 rounded-xl border-2 bg-white ${
                    isEditing
                      ? "border-blue-300 shadow-lg"
                      : `border-${noteTypeInfo.color}-200 hover:border-${noteTypeInfo.color}-300`
                  } transition-all`}
                >
                  {/* Note Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg bg-${noteTypeInfo.color}-100 flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon
                          className={`text-${noteTypeInfo.color}-600`}
                          size={20}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black bg-${noteTypeInfo.color}-100 text-${noteTypeInfo.color}-700`}
                          >
                            {noteTypeInfo.label}
                          </span>
                          {note.private && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700">
                              🔒 Private
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDateTime(note.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {note.author}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => setEditingNote(note.id)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit note"
                        >
                          <Edit size={16} className="text-blue-600" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNote(note.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Note Content */}
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2">
                          Note Type
                        </label>
                        <select
                          value={note.type}
                          onChange={(e) =>
                            updateNote(note.id, "type", e.target.value)
                          }
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none"
                        >
                          {noteTypes.map((t) => (
                            <option key={t.type} value={t.type}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2">
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={toDateTimeLocal(note.date)}
                          onChange={(e) =>
                            updateNote(
                              note.id,
                              "date",
                              fromDateTimeLocal(e.target.value),
                            )
                          }
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Stored as: {note.date}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-2">
                          Content
                        </label>
                        <textarea
                          value={note.content}
                          onChange={(e) =>
                            updateNote(note.id, "content", e.target.value)
                          }
                          rows={4}
                          placeholder="Enter note content..."
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold focus:border-blue-400 outline-none resize-y"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`private-${note.id}`}
                          checked={note.private}
                          onChange={(e) =>
                            updateNote(note.id, "private", e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                        <label
                          htmlFor={`private-${note.id}`}
                          className="text-sm font-bold text-slate-700"
                        >
                          🔒 Private (only visible to administrators)
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingNote(null)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2"
                        >
                          <Save size={16} />
                          Done Editing
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNote(null);
                            if (!note.content) {
                              removeNote(note.id);
                            }
                          }}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 flex items-center gap-2"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {note.content ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">
                          No content yet - click edit to add content
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-900 font-bold mb-2">
          💡 <strong>Note Types:</strong>
        </p>
        <ul className="text-xs text-blue-700 space-y-1 ml-4">
          <li>
            <strong>Admin:</strong> Internal club management notes
          </li>
          <li>
            <strong>Behavioral:</strong> Track incidents and disciplinary
            matters
          </li>
          <li>
            <strong>Achievement:</strong> Record awards, milestones, and
            accomplishments
          </li>
          <li>
            <strong>Coaching:</strong> Development areas and training progress
          </li>
          <li>
            <strong>Medical:</strong> Injury tracking and recovery notes
          </li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          🔒 <strong>Private notes</strong> are only visible to administrators
        </p>
      </div>
    </div>
  );
}
