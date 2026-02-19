"use client";

import { useEffect, useState } from "react";

import { getTagColorClasses } from "@/components/tags/tag-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/trpc/react";

interface ContactFormDialogProps {
  orgId: string;
  contact?: {
    id: string;
    name: string;
    phoneE164: string;
    language: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactFormDialog({
  orgId,
  contact,
  open,
  onOpenChange,
}: ContactFormDialogProps) {
  const [name, setName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [language, setLanguage] = useState("EN");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const isEditing = !!contact;

  const utils = api.useUtils();

  const { data: tags } = api.tags.list.useQuery(
    { orgId },
    { enabled: open }
  );

  const createMutation = api.contacts.create.useMutation({
    onSuccess: () => {
      void utils.contacts.list.invalidate();
      onOpenChange(false);
    },
  });

  const updateMutation = api.contacts.update.useMutation({
    onSuccess: () => {
      void utils.contacts.list.invalidate();
      onOpenChange(false);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? "");
      setPhoneE164(contact?.phoneE164 ?? "");
      setLanguage(contact?.language ?? "EN");
      setSelectedTagIds([]);
    }
  }, [open, contact]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEditing) {
      updateMutation.mutate({
        orgId,
        contactId: contact.id,
        name,
        phoneE164,
        language: language as "EN" | "RW" | "LG",
      });
    } else {
      createMutation.mutate({
        orgId,
        name,
        phoneE164,
        language: language as "EN" | "RW" | "LG",
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
    }
  }

  if (!open) return null;

  return (
    <Dialog>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
        <DialogContent className="z-50 w-full max-w-md border-zinc-700 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Contact" : "New Contact"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-zinc-300">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contact name"
                required
                minLength={2}
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneE164" className="text-sm font-medium text-zinc-300">
                Phone (E.164)
              </label>
              <Input
                id="phoneE164"
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                placeholder="+250781234567"
                required
                minLength={7}
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="language" className="text-sm font-medium text-zinc-300">
                Language
              </label>
              <Select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              >
                <option value="EN">EN</option>
                <option value="RW">RW</option>
                <option value="LG">LG</option>
              </Select>
            </div>

            {/* Tag multi-select */}
            {!isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Tags</label>
                {tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="focus:outline-none"
                        >
                          <Badge
                            className={
                              isSelected
                                ? `${getTagColorClasses(tag.color)} ring-2 ring-white/30`
                                : "border-zinc-700 bg-zinc-800/50 text-zinc-500"
                            }
                          >
                            {tag.name}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    No tags available. Create tags in the Tags section first.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                    ? "Save"
                    : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </div>
    </Dialog>
  );
}
