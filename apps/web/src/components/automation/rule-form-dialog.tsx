"use client";

import { useState } from "react";

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

type RuleData = {
  id: string;
  name: string;
  triggerType: string;
  offsetDays: number;
  channel: string;
  templateId: string | null;
  isActive: boolean;
};

type RuleFormData = {
  name: string;
  triggerType: "BEFORE_DUE" | "ON_DUE" | "AFTER_DUE" | "UNRESPONSIVE";
  offsetDays: number;
  channel: "WHATSAPP" | "VOICE";
  templateId: string;
  isActive: boolean;
};

export function RuleFormDialog({
  orgId,
  rule,
  open,
  onOpenChange,
}: {
  orgId: string;
  rule?: RuleData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<RuleFormData>({
    name: rule?.name ?? "",
    triggerType: (rule?.triggerType as RuleFormData["triggerType"]) ?? "BEFORE_DUE",
    offsetDays: rule?.offsetDays ?? 0,
    channel: (rule?.channel as RuleFormData["channel"]) ?? "WHATSAPP",
    templateId: rule?.templateId ?? "",
    isActive: rule?.isActive ?? true,
  });

  const utils = api.useUtils();

  const { data: templatesData } = api.templates.list.useQuery({ orgId });
  const templates = templatesData?.items ?? [];

  const upsertMutation = api.automation.upsertRule.useMutation({
    onSuccess: () => {
      void utils.automation.list.invalidate();
      onOpenChange(false);
    },
  });

  function handleSubmit() {
    upsertMutation.mutate({
      orgId,
      ruleId: rule?.id,
      name: form.name,
      triggerType: form.triggerType,
      offsetDays: form.offsetDays,
      channel: form.channel,
      templateId: form.templateId || undefined,
      isActive: form.isActive,
    });
  }

  const isValid = form.name.length >= 2;

  return (
    <Dialog>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Rule" : "New Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. 3-Day Reminder"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Trigger Type</label>
              <Select
                value={form.triggerType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    triggerType: e.target.value as RuleFormData["triggerType"],
                  }))
                }
              >
                <option value="BEFORE_DUE">Before Due</option>
                <option value="ON_DUE">On Due</option>
                <option value="AFTER_DUE">After Due</option>
                <option value="UNRESPONSIVE">Unresponsive</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Offset Days</label>
              <Input
                type="number"
                min={-30}
                max={90}
                value={form.offsetDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, offsetDays: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Channel</label>
              <Select
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    channel: e.target.value as RuleFormData["channel"],
                  }))
                }
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="VOICE">Voice</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Template</label>
              <Select
                value={form.templateId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, templateId: e.target.value }))
                }
              >
                <option value="">None</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.key} ({tpl.language})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={upsertMutation.isPending || !isValid}
            >
              {rule ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
