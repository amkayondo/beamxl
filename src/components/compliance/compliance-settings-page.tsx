"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsFormData = {
  defaultFrequencyCap: number;
  frequencyWindowDays: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  defaultTimezone: string;
  enforceTcpa: boolean;
  enforceFdcpa: boolean;
};

type StateRuleFormData = {
  stateCode: string;
  frequencyCap: number;
  frequencyWindowDays: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  notes: string;
};

const EMPTY_STATE_RULE: StateRuleFormData = {
  stateCode: "",
  frequencyCap: 7,
  frequencyWindowDays: 7,
  quietHoursStart: "",
  quietHoursEnd: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceSettingsPage({ orgId }: { orgId: string }) {
  // ---- Settings form state ----
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsFormData | null>(null);

  // ---- State rule dialog state ----
  const [stateRuleDialogOpen, setStateRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [stateRuleForm, setStateRuleForm] = useState<StateRuleFormData>(EMPTY_STATE_RULE);

  const utils = api.useUtils();

  // ---- Queries ----
  const { data: settings, isLoading: settingsLoading } =
    api.compliance.getSettings.useQuery({ orgId });

  const { data: stateRules, isLoading: rulesLoading } =
    api.compliance.listStateRules.useQuery({ orgId });

  // ---- Mutations ----
  const updateSettingsMutation = api.compliance.updateSettings.useMutation({
    onSuccess: () => {
      void utils.compliance.getSettings.invalidate();
      setIsEditingSettings(false);
    },
  });

  const upsertRuleMutation = api.compliance.upsertStateRule.useMutation({
    onSuccess: () => {
      void utils.compliance.listStateRules.invalidate();
      setStateRuleDialogOpen(false);
      resetRuleForm();
    },
  });

  const deleteRuleMutation = api.compliance.deleteStateRule.useMutation({
    onSuccess: () => {
      void utils.compliance.listStateRules.invalidate();
    },
  });

  // ---- Settings handlers ----
  function handleEditSettings() {
    if (!settings) return;
    setSettingsForm({
      defaultFrequencyCap: settings.defaultFrequencyCap,
      frequencyWindowDays: settings.frequencyWindowDays,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      defaultTimezone: settings.defaultTimezone,
      enforceTcpa: settings.enforceTcpa,
      enforceFdcpa: settings.enforceFdcpa,
    });
    setIsEditingSettings(true);
  }

  function handleCancelSettings() {
    setSettingsForm(null);
    setIsEditingSettings(false);
  }

  function handleSaveSettings() {
    if (!settingsForm) return;
    updateSettingsMutation.mutate({
      orgId,
      ...settingsForm,
    });
  }

  // ---- State rule handlers ----
  function resetRuleForm() {
    setStateRuleForm(EMPTY_STATE_RULE);
    setEditingRuleId(null);
  }

  function openCreateRule() {
    resetRuleForm();
    setStateRuleDialogOpen(true);
  }

  function openEditRule(rule: {
    id: string;
    stateCode: string;
    frequencyCap: number;
    frequencyWindowDays: number;
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
    notes: string | null;
  }) {
    setEditingRuleId(rule.id);
    setStateRuleForm({
      stateCode: rule.stateCode,
      frequencyCap: rule.frequencyCap,
      frequencyWindowDays: rule.frequencyWindowDays,
      quietHoursStart: rule.quietHoursStart !== null ? String(rule.quietHoursStart) : "",
      quietHoursEnd: rule.quietHoursEnd !== null ? String(rule.quietHoursEnd) : "",
      notes: rule.notes ?? "",
    });
    setStateRuleDialogOpen(true);
  }

  function handleSubmitRule() {
    upsertRuleMutation.mutate({
      orgId,
      stateCode: stateRuleForm.stateCode.toUpperCase(),
      frequencyCap: stateRuleForm.frequencyCap,
      frequencyWindowDays: stateRuleForm.frequencyWindowDays,
      quietHoursStart: stateRuleForm.quietHoursStart
        ? Number(stateRuleForm.quietHoursStart)
        : null,
      quietHoursEnd: stateRuleForm.quietHoursEnd
        ? Number(stateRuleForm.quietHoursEnd)
        : null,
      notes: stateRuleForm.notes || null,
    });
  }

  function handleDeleteRule(ruleId: string) {
    if (!confirm("Are you sure you want to delete this state rule?")) return;
    deleteRuleMutation.mutate({ orgId, ruleId });
  }

  const rulesList = stateRules ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance Settings</h1>
        <p className="text-sm text-muted-foreground">
          TCPA/FDCPA compliance configuration, quiet hours, and frequency caps.
        </p>
      </div>

      {/* ---- Compliance Settings Card ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>General Compliance Settings</CardTitle>
          {!isEditingSettings && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditSettings}
              disabled={settingsLoading}
            >
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : isEditingSettings && settingsForm ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Default Frequency Cap
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={settingsForm.defaultFrequencyCap}
                    onChange={(e) =>
                      setSettingsForm((f) =>
                        f ? { ...f, defaultFrequencyCap: Number(e.target.value) } : f,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Frequency Window (days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={settingsForm.frequencyWindowDays}
                    onChange={(e) =>
                      setSettingsForm((f) =>
                        f ? { ...f, frequencyWindowDays: Number(e.target.value) } : f,
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quiet Hours Start (0-23)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settingsForm.quietHoursStart}
                    onChange={(e) =>
                      setSettingsForm((f) =>
                        f ? { ...f, quietHoursStart: Number(e.target.value) } : f,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quiet Hours End (0-23)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settingsForm.quietHoursEnd}
                    onChange={(e) =>
                      setSettingsForm((f) =>
                        f ? { ...f, quietHoursEnd: Number(e.target.value) } : f,
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Default Timezone
                </label>
                <Input
                  value={settingsForm.defaultTimezone}
                  onChange={(e) =>
                    setSettingsForm((f) =>
                      f ? { ...f, defaultTimezone: e.target.value } : f,
                    )
                  }
                  placeholder="e.g. America/New_York"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={settingsForm.enforceTcpa}
                    onChange={(e) =>
                      setSettingsForm((f) =>
                        f ? { ...f, enforceTcpa: e.target.checked } : f,
                      )
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-primary"
                  />
                  Enforce TCPA
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={settingsForm.enforceFdcpa}
                    onChange={(e) =>
                      setSettingsForm((f) =>
                        f ? { ...f, enforceFdcpa: e.target.checked } : f,
                      )
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-primary"
                  />
                  Enforce FDCPA
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelSettings}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : settings ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">
                  Default Frequency Cap
                </span>
                <span className="text-sm font-medium">
                  {settings.defaultFrequencyCap} messages
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">
                  Frequency Window
                </span>
                <span className="text-sm font-medium">
                  {settings.frequencyWindowDays} days
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Quiet Hours</span>
                <span className="text-sm font-medium">
                  {settings.quietHoursStart}:00 - {settings.quietHoursEnd}:00
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">
                  Default Timezone
                </span>
                <span className="text-sm font-medium">
                  {settings.defaultTimezone}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Enforce TCPA</span>
                <span className="text-sm font-medium">
                  {settings.enforceTcpa ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Enforce FDCPA</span>
                <span className="text-sm font-medium">
                  {settings.enforceFdcpa ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ---- State Compliance Rules Card ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>State Compliance Rules</CardTitle>
          <Button size="sm" onClick={openCreateRule}>
            Add State Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : rulesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Frequency Cap</TableHead>
                  <TableHead>Window (days)</TableHead>
                  <TableHead>Quiet Hours</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesList.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.stateCode}
                    </TableCell>
                    <TableCell>{rule.frequencyCap}</TableCell>
                    <TableCell>{rule.frequencyWindowDays}</TableCell>
                    <TableCell>
                      {rule.quietHoursStart !== null && rule.quietHoursEnd !== null
                        ? `${rule.quietHoursStart}:00 - ${rule.quietHoursEnd}:00`
                        : "Default"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {rule.notes ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditRule(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={deleteRuleMutation.isPending}
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
              No state-specific rules configured. The default org settings will apply.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ---- State Rule Form (inline card) ---- */}
      {stateRuleDialogOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRuleId ? "Edit State Rule" : "Add State Rule"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    State Code
                  </label>
                  <Input
                    value={stateRuleForm.stateCode}
                    onChange={(e) =>
                      setStateRuleForm((f) => ({
                        ...f,
                        stateCode: e.target.value,
                      }))
                    }
                    placeholder="e.g. CA, NY, TX"
                    maxLength={2}
                    disabled={!!editingRuleId}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Frequency Cap
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={stateRuleForm.frequencyCap}
                    onChange={(e) =>
                      setStateRuleForm((f) => ({
                        ...f,
                        frequencyCap: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Window (days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={stateRuleForm.frequencyWindowDays}
                    onChange={(e) =>
                      setStateRuleForm((f) => ({
                        ...f,
                        frequencyWindowDays: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quiet Start (0-23)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={stateRuleForm.quietHoursStart}
                    onChange={(e) =>
                      setStateRuleForm((f) => ({
                        ...f,
                        quietHoursStart: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quiet End (0-23)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={stateRuleForm.quietHoursEnd}
                    onChange={(e) =>
                      setStateRuleForm((f) => ({
                        ...f,
                        quietHoursEnd: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <Input
                  value={stateRuleForm.notes}
                  onChange={(e) =>
                    setStateRuleForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Optional notes about this state rule"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStateRuleDialogOpen(false);
                    resetRuleForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRule}
                  disabled={
                    upsertRuleMutation.isPending ||
                    !stateRuleForm.stateCode ||
                    stateRuleForm.frequencyCap < 1
                  }
                >
                  {upsertRuleMutation.isPending
                    ? "Saving..."
                    : editingRuleId
                      ? "Update Rule"
                      : "Create Rule"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
