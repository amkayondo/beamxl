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
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const CURRENCIES = ["USD", "EUR", "GBP", "RWF", "UGX"] as const;

type OrgFormData = {
  name: string;
  defaultCurrency: string;
  timezone: string;
};

type IntegrationFormData = {
  providerKind: "PAYMENT" | "WHATSAPP" | "CALL" | "VOICE";
  provider: string;
  isEnabled: boolean;
  secretEnvRef: string;
  config: string;
};

const EMPTY_INTEGRATION_FORM: IntegrationFormData = {
  providerKind: "PAYMENT",
  provider: "",
  isEnabled: true,
  secretEnvRef: "",
  config: "{}",
};

export function SettingsPageClient({
  orgSlug,
  orgId,
  org,
}: {
  orgSlug: string;
  orgId: string;
  org: { name: string; defaultCurrency: string; timezone: string };
}) {
  // Org settings state
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState<OrgFormData>({
    name: org.name,
    defaultCurrency: org.defaultCurrency,
    timezone: org.timezone,
  });

  // Integration dialog state
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);
  const [integrationForm, setIntegrationForm] = useState<IntegrationFormData>(EMPTY_INTEGRATION_FORM);

  const utils = api.useUtils();

  // Queries
  const { data: integrations, isLoading: integrationsLoading } =
    api.settings.listIntegrations.useQuery({ orgId });

  // Mutations
  const updateOrgMutation = api.org.updateOrg.useMutation({
    onSuccess: () => {
      setIsEditingOrg(false);
      void utils.org.listMine.invalidate();
    },
  });

  const upsertIntegrationMutation = api.settings.upsertIntegration.useMutation({
    onSuccess: () => {
      void utils.settings.listIntegrations.invalidate();
      setIntegrationDialogOpen(false);
      resetIntegrationForm();
    },
  });

  // Org settings handlers
  function handleOrgEdit() {
    setIsEditingOrg(true);
  }

  function handleOrgCancel() {
    setOrgForm({
      name: org.name,
      defaultCurrency: org.defaultCurrency,
      timezone: org.timezone,
    });
    setIsEditingOrg(false);
  }

  function handleOrgSave() {
    updateOrgMutation.mutate({
      orgId,
      name: orgForm.name,
      defaultCurrency: orgForm.defaultCurrency,
      timezone: orgForm.timezone,
    });
  }

  // Integration handlers
  function resetIntegrationForm() {
    setIntegrationForm(EMPTY_INTEGRATION_FORM);
    setEditingIntegrationId(null);
  }

  function openCreateIntegration() {
    resetIntegrationForm();
    setIntegrationDialogOpen(true);
  }

  function openEditIntegration(integration: {
    id: string;
    providerKind: string;
    provider: string;
    isEnabled: boolean;
    secretKeyRef: string | null;
    config: unknown;
  }) {
    setEditingIntegrationId(integration.id);
    setIntegrationForm({
      providerKind: integration.providerKind as IntegrationFormData["providerKind"],
      provider: integration.provider,
      isEnabled: integration.isEnabled,
      secretEnvRef: integration.secretKeyRef ?? "",
      config: JSON.stringify(integration.config ?? {}, null, 2),
    });
    setIntegrationDialogOpen(true);
  }

  function handleIntegrationSubmit() {
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(integrationForm.config) as Record<string, unknown>;
    } catch {
      parsedConfig = {};
    }

    upsertIntegrationMutation.mutate({
      orgId,
      providerKind: integrationForm.providerKind,
      provider: integrationForm.provider,
      isEnabled: integrationForm.isEnabled,
      secretEnvRef: integrationForm.secretEnvRef || undefined,
      config: parsedConfig,
    });
  }

  const integrationsList = integrations ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Team, provider connections, and workspace defaults.
        </p>
      </div>

      {/* Org Settings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organization Settings</CardTitle>
          {!isEditingOrg && (
            <Button size="sm" variant="outline" onClick={handleOrgEdit}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingOrg ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Organization Name
                </label>
                <Input
                  value={orgForm.name}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Organization name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Default Currency
                </label>
                <Select
                  value={orgForm.defaultCurrency}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, defaultCurrency: e.target.value }))
                  }
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Timezone
                </label>
                <Input
                  value={orgForm.timezone}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, timezone: e.target.value }))
                  }
                  placeholder="e.g. UTC, Africa/Kigali"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleOrgCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOrgSave}
                  disabled={updateOrgMutation.isPending || !orgForm.name}
                >
                  {updateOrgMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{org.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">
                  Default Currency
                </span>
                <span className="text-sm font-medium">{org.defaultCurrency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Timezone</span>
                <span className="text-sm font-medium">{org.timezone}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrations Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Integrations</CardTitle>
          <Button size="sm" onClick={openCreateIntegration}>
            Add Integration
          </Button>
        </CardHeader>
        <CardContent>
          {integrationsLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : integrationsList.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Secret Ref</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrationsList.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell>{integration.providerKind}</TableCell>
                    <TableCell className="font-medium">
                      {integration.provider}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          integration.isEnabled
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                            : "border-zinc-700 bg-zinc-700/20 text-zinc-400"
                        }
                      >
                        {integration.isEnabled ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {integration.secretKeyRef ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditIntegration(integration)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No integrations configured yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Integration Form Dialog */}
      {integrationDialogOpen ? (
        <Dialog>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingIntegrationId ? "Edit Integration" : "Add Integration"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Provider Kind
                </label>
                <Select
                  value={integrationForm.providerKind}
                  onChange={(e) =>
                    setIntegrationForm((f) => ({
                      ...f,
                      providerKind: e.target.value as IntegrationFormData["providerKind"],
                    }))
                  }
                  disabled={!!editingIntegrationId}
                >
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="WHATSAPP">WHATSAPP</option>
                  <option value="CALL">CALL</option>
                  <option value="VOICE">VOICE</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Provider
                </label>
                <Input
                  value={integrationForm.provider}
                  onChange={(e) =>
                    setIntegrationForm((f) => ({ ...f, provider: e.target.value }))
                  }
                  placeholder="e.g. stripe, twilio"
                  disabled={!!editingIntegrationId}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="integration-enabled"
                  checked={integrationForm.isEnabled}
                  onChange={(e) =>
                    setIntegrationForm((f) => ({
                      ...f,
                      isEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-primary"
                />
                <label
                  htmlFor="integration-enabled"
                  className="text-sm font-medium"
                >
                  Enabled
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Secret Env Ref
                </label>
                <Input
                  value={integrationForm.secretEnvRef}
                  onChange={(e) =>
                    setIntegrationForm((f) => ({
                      ...f,
                      secretEnvRef: e.target.value,
                    }))
                  }
                  placeholder="e.g. STRIPE_SECRET_KEY"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Config (JSON)
                </label>
                <Textarea
                  value={integrationForm.config}
                  onChange={(e) =>
                    setIntegrationForm((f) => ({ ...f, config: e.target.value }))
                  }
                  rows={4}
                  placeholder='{"webhookUrl": "..."}'
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIntegrationDialogOpen(false);
                    resetIntegrationForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleIntegrationSubmit}
                  disabled={
                    upsertIntegrationMutation.isPending ||
                    !integrationForm.provider
                  }
                >
                  {upsertIntegrationMutation.isPending
                    ? "Saving..."
                    : editingIntegrationId
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
