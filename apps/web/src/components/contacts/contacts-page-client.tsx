"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

import { ContactFormDialog } from "./contact-form-dialog";

interface EditingContact {
  id: string;
  name: string;
  phoneE164: string;
  language: string;
}

export function ContactsPageClient({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EditingContact | null>(null);
  const [filterTagId, setFilterTagId] = useState<string>("");

  const { data: tags } = api.tags.list.useQuery({ orgId });

  const { data, isLoading } = api.contacts.list.useQuery({
    orgId,
    page: 1,
    pageSize: 50,
    tagIds: filterTagId ? [filterTagId] : undefined,
  });

  const contacts = data?.items ?? [];

  function handleNewContact() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function handleEditContact(contact: EditingContact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Payer directory with status and language preferences.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/contacts/import`}>
            <Button type="button" variant="outline">
              Import CSV
            </Button>
          </Link>
          <Button type="button" onClick={handleNewContact}>
            New Contact
          </Button>
        </div>
      </div>

      {/* Tag filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="tag-filter" className="text-sm font-medium text-zinc-300">
          Filter by tag:
        </label>
        <Select
          id="tag-filter"
          value={filterTagId}
          onChange={(e) => setFilterTagId(e.target.value)}
          className="w-48 border-zinc-800 bg-zinc-900 text-zinc-100"
        >
          <option value="">All contacts</option>
          {tags?.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>
        {filterTagId && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setFilterTagId("")}
          >
            Clear filter
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-zinc-400">Loading contacts...</p>
          ) : contacts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>{contact.name}</TableCell>
                    <TableCell>{contact.phoneE164}</TableCell>
                    <TableCell>{contact.language}</TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-500">&mdash;</span>
                    </TableCell>
                    <TableCell>
                      <Badge>{contact.optedOutAt ? "UNRESPONSIVE" : "GOOD"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleEditContact({
                              id: contact.id,
                              name: contact.name,
                              phoneE164: contact.phoneE164,
                              language: contact.language,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Link
                          className="inline-flex h-8 items-center px-3 text-sm text-primary"
                          href={`/${orgSlug}/contacts/${contact.id}`}
                        >
                          Open
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-10 text-center">
              <p className="text-sm text-zinc-300">No contacts yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Create a new contact to start building your payer directory.
              </p>
              <Button type="button" className="mt-4" onClick={handleNewContact}>
                New Contact
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ContactFormDialog
        orgId={orgId}
        contact={editingContact}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
