"use client";

import { useState } from "react";
import { Plus, Pin, Trash2, Edit2, X, Check } from "lucide-react";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  type ProjectNoteFromAPI,
} from "@/lib/hooks/use-projects";

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const { data: notes = [], isLoading } = useNotes(projectId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();

  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      await createNote.mutateAsync({
        projectId,
        content: newNoteContent,
      });
      setNewNoteContent("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote.mutateAsync({ projectId, noteId });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleTogglePin = (note: ProjectNoteFromAPI) => {
    togglePin.mutate({ projectId, note });
  };

  // Sort: pinned notes first
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Notes</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Add note
          </button>
        )}
      </div>

      {/* Add note form */}
      {isAdding && (
        <div className="rounded-lg border bg-card p-3">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Write a note..."
            className="w-full resize-none bg-transparent text-sm outline-none"
            rows={3}
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewNoteContent("");
              }}
              className="rounded px-3 py-1 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim() || createNote.isPending}
              className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="space-y-3">
        {sortedNotes.length === 0 && !isAdding ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No notes yet. Add one to keep track of important information.
          </p>
        ) : (
          sortedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              projectId={projectId}
              onTogglePin={() => handleTogglePin(note)}
              onDelete={() => handleDelete(note.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NoteCardProps {
  note: ProjectNoteFromAPI;
  projectId: string;
  onTogglePin: () => void;
  onDelete: () => void;
}

function NoteCard({ note, projectId, onTogglePin, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const updateNote = useUpdateNote();

  const handleSave = async () => {
    if (!editContent.trim()) return;

    try {
      await updateNote.mutateAsync({
        projectId,
        noteId: note.id,
        content: editContent,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  return (
    <div
      className={`group rounded-lg border p-3 ${
        note.is_pinned ? "border-primary/50 bg-primary/5" : "bg-card"
      }`}
    >
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full resize-none bg-transparent text-sm outline-none"
            rows={3}
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="rounded p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={!editContent.trim() || updateNote.isPending}
              className="rounded p-1 text-green-600 hover:bg-muted disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={onTogglePin}
                className={`rounded p-1 hover:bg-muted ${
                  note.is_pinned ? "text-primary" : "text-muted-foreground"
                }`}
                title={note.is_pinned ? "Unpin" : "Pin"}
              >
                <Pin className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1 hover:bg-muted"
              >
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={onDelete} className="rounded p-1 hover:bg-muted">
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(note.created_at).toLocaleDateString()}{" "}
            {new Date(note.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      )}
    </div>
  );
}
