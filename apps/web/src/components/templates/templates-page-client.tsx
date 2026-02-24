"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

const TEMPLATE_VARS = ["{{name}}", "{{amount}}", "{{dueDate}}", "{{payLink}}", "{{period}}"];

const SAMPLE_DATA: Record<string, string> = {
  "{{name}}": "John Doe",
  "{{amount}}": "$150.00",
  "{{dueDate}}": "2026-03-01",
  "{{payLink}}": "https://pay.example.com/abc123",
  "{{period}}": "Feb 1 - Feb 28",
};

function renderPreview(body: string) {
  return Object.entries(SAMPLE_DATA).reduce((acc, [k, v]) => acc.replaceAll(k, v), body);
}

type TemplateChannel = "EMAIL" | "SMS" | "WHATSAPP" | "VOICE";

type TemplateFormData = {
  key: string;
  language: "EN" | "RW" | "LG";
  channel: TemplateChannel;
  body: string;
};

export function TemplatesPageClient({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormData>({
    key: "",
    language: "EN",
    channel: "EMAIL",
    body: "",
  });

  const utils = api.useUtils();

  const { data, isLoading } = api.templates.list.useQuery({ orgId });

  const createMutation = api.templates.create.useMutation({
    onSuccess: () => {
      void utils.templates.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = api.templates.update.useMutation({
    onSuccess: () => {
      void utils.templates.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
  });

  const activateMutation = api.templates.activate.useMutation({
    onSuccess: () => {
      void utils.templates.list.invalidate();
    },
  });

  function resetForm() {
    setForm({ key: "", language: "EN", channel: "EMAIL", body: "" });
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(template: {
    id: string;
    key: string;
    language: string;
    body: string;
    channel: TemplateChannel | null;
  }) {
    setEditingId(template.id);
    setForm({
      key: template.key,
      language: template.language as "EN" | "RW" | "LG",
      channel: template.channel ?? "EMAIL",
      body: template.body,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({
        orgId,
        templateId: editingId,
        body: form.body,
        channel: form.channel,
      });
    } else {
      createMutation.mutate({ orgId, ...form });
    }
  }

  const templates = data?.items ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Message Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage message templates for reminders and notifications.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : templates.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">{tpl.key}</TableCell>
                    <TableCell>{tpl.language}</TableCell>
                    <TableCell>v{tpl.version}</TableCell>
                    <TableCell>{tpl.channel ?? "ANY"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tpl.approvalStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          tpl.isActive
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                            : "border-zinc-700 bg-zinc-700/20 text-zinc-400"
                        }
                      >
                        {tpl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {tpl.body}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(tpl)}>
                          Edit
                        </Button>
                        {tpl.approvalStatus === "DRAFT" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateMutation.mutate({
                                orgId,
                                templateId: tpl.id,
                                approvalStatus: "PENDING",
                              })
                            }
                          >
                            Submit
                          </Button>
                        ) : null}
                        {tpl.approvalStatus === "PENDING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateMutation.mutate({
                                orgId,
                                templateId: tpl.id,
                                approvalStatus: "APPROVED",
                              })
                            }
                          >
                            Approve
                          </Button>
                        ) : null}
                        {tpl.approvalStatus === "PENDING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateMutation.mutate({
                                orgId,
                                templateId: tpl.id,
                                approvalStatus: "REJECTED",
                                rejectionReason: "Rejected from template console",
                              })
                            }
                          >
                            Reject
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            activateMutation.mutate({
                              orgId,
                              templateId: tpl.id,
                              isActive: !tpl.isActive,
                            })
                          }
                        >
                          {tpl.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No templates yet. Create one to customize your messages.
            </p>
          )}
        </CardContent>
      </Card>

      {dialogOpen ? (
        <Dialog>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Template" : "New Template"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Key</label>
                  <Input
                    value={form.key}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder="FRIENDLY_REMINDER"
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Language</label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, language: e.target.value as "EN" | "RW" | "LG" }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={!!editingId}
                  >
                    <option value="EN">English</option>
                    <option value="RW">Kinyarwanda</option>
                    <option value="LG">Luganda</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Channel</label>
                  <select
                    value={form.channel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, channel: e.target.value as TemplateChannel }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="VOICE">Voice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Body</label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={5}
                  placeholder="Hi {{name}}, your payment of {{amount}} is due on {{dueDate}}. Pay here: {{payLink}}"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Variables: {TEMPLATE_VARS.join(", ")}
                </p>
              </div>

              {form.body ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Preview</label>
                  <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                    {renderPreview(form.body)}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending || !form.key || !form.body}
                >
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
