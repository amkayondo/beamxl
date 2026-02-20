"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/trpc/react";

const TAG_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

type TagColor = (typeof TAG_COLORS)[number];

const colorClasses: Record<TagColor, string> = {
  slate: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  red: "bg-red-500/20 text-red-300 border-red-500/40",
  orange: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  green: "bg-green-500/20 text-green-300 border-green-500/40",
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  purple: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  pink: "bg-pink-500/20 text-pink-300 border-pink-500/40",
};

export function getTagColorClasses(color: string): string {
  return colorClasses[color as TagColor] ?? colorClasses.slate;
}

interface TagManagerProps {
  orgId: string;
}

export function TagManager({ orgId }: TagManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("slate");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<TagColor>("slate");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: tags, isLoading } = api.tags.list.useQuery({ orgId });

  const createMutation = api.tags.create.useMutation({
    onSuccess: () => {
      void utils.tags.list.invalidate();
      setNewName("");
      setNewColor("slate");
    },
  });

  const updateMutation = api.tags.update.useMutation({
    onSuccess: () => {
      void utils.tags.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = api.tags.delete.useMutation({
    onSuccess: () => {
      void utils.tags.list.invalidate();
      setDeletingId(null);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ orgId, name: newName.trim(), color: newColor });
  }

  function startEditing(tag: { id: string; name: string; color: string }) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color as TagColor);
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({
      orgId,
      tagId: editingId,
      name: editName.trim(),
      color: editColor,
    });
  }

  function handleDelete(tagId: string) {
    deleteMutation.mutate({ orgId, tagId });
  }

  return (
    <div className="space-y-4">
      {/* Inline create form */}
      <form onSubmit={handleCreate} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="tag-name" className="text-sm font-medium text-zinc-300">
            Tag name
          </label>
          <Input
            id="tag-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. VIP"
            required
            minLength={1}
            className="border-zinc-800 bg-zinc-900 text-zinc-100"
          />
        </div>
        <div className="w-32 space-y-1">
          <label htmlFor="tag-color" className="text-sm font-medium text-zinc-300">
            Color
          </label>
          <Select
            id="tag-color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value as TagColor)}
            className="border-zinc-800 bg-zinc-900 text-zinc-100"
          >
            {TAG_COLORS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
          {createMutation.isPending ? "Adding..." : "Add"}
        </Button>
      </form>

      {/* Tags list */}
      {isLoading ? (
        <p className="py-6 text-center text-sm text-zinc-400">Loading tags...</p>
      ) : !tags?.length ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-8 text-center">
          <p className="text-sm text-zinc-300">No tags yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Create a tag above to start organizing your contacts.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              {editingId === tag.id ? (
                <form onSubmit={handleUpdate} className="flex flex-1 items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 w-40 border-zinc-700 bg-zinc-900 text-zinc-100"
                    required
                    minLength={1}
                    autoFocus
                  />
                  <Select
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value as TagColor)}
                    className="h-8 w-28 border-zinc-700 bg-zinc-900 text-zinc-100"
                  >
                    {TAG_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <Badge className={getTagColorClasses(tag.color)}>{tag.name}</Badge>
                  <div className="flex gap-1">
                    {deletingId === tag.id ? (
                      <>
                        <span className="mr-2 self-center text-xs text-zinc-400">
                          Delete this tag?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(tag.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "Deleting..." : "Confirm"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(tag)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(tag.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
