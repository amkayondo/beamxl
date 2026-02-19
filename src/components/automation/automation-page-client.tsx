"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

import { RuleFormDialog } from "./rule-form-dialog";

type RuleData = {
  id: string;
  name: string;
  triggerType: string;
  offsetDays: number;
  channel: string;
  templateId: string | null;
  isActive: boolean;
};

export function AutomationPageClient({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleData | null>(null);

  const utils = api.useUtils();

  const { data: rules, isLoading } = api.automation.list.useQuery({ orgId });

  const upsertMutation = api.automation.upsertRule.useMutation({
    onSuccess: () => {
      void utils.automation.list.invalidate();
    },
  });

  const deleteMutation = api.automation.delete.useMutation({
    onSuccess: () => {
      void utils.automation.list.invalidate();
    },
  });

  function openCreate() {
    setEditingRule(null);
    setDialogOpen(true);
  }

  function openEdit(rule: RuleData) {
    setEditingRule(rule);
    setDialogOpen(true);
  }

  function handleToggleActive(rule: RuleData) {
    upsertMutation.mutate({
      orgId,
      ruleId: rule.id,
      name: rule.name,
      triggerType: rule.triggerType as "BEFORE_DUE" | "ON_DUE" | "AFTER_DUE" | "UNRESPONSIVE",
      offsetDays: rule.offsetDays,
      channel: rule.channel as "WHATSAPP" | "VOICE",
      templateId: rule.templateId ?? undefined,
      isActive: !rule.isActive,
    });
  }

  function handleDelete(rule: RuleData) {
    if (!confirm(`Delete rule "${rule.name}"? This action cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate({ orgId, ruleId: rule.id });
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Escalation ladder and reminder schedule controls.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          New Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : rules?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger Type</TableHead>
                  <TableHead>Offset Days</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.triggerType}</TableCell>
                    <TableCell>{rule.offsetDays}</TableCell>
                    <TableCell>{rule.channel}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-sm text-muted-foreground">
                      {rule.template?.key ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rule.isActive
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                            : "border-zinc-700 bg-zinc-700/20 text-zinc-400"
                        }
                      >
                        {rule.isActive ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(rule)}
                          disabled={upsertMutation.isPending}
                        >
                          {rule.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(rule)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No automation rules yet. Create one to set up your escalation ladder.
            </p>
          )}
        </CardContent>
      </Card>

      {dialogOpen ? (
        <RuleFormDialog
          orgId={orgId}
          rule={editingRule}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : null}
    </section>
  );
}
