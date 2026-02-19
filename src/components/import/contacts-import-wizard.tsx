"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";

import { CsvUploadZone } from "./csv-upload-zone";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportResult } from "./import-result";

type Step = "upload" | "preview" | "importing" | "result";

interface PreviewData {
  rawRows: Record<string, string>[];
  valid: Array<{
    row: number;
    name: string;
    phone: string;
    email: string | null;
    language: "EN" | "RW" | "LG";
    tags: string[];
  }>;
  errors: Array<{ row: number; field: string; message: string }>;
  totalRows: number;
}

interface ImportResultData {
  inserted: number;
  failed: Array<{ row: number; error: string }>;
}

export function ContactsImportWizard({
  orgId,
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);

  const previewMutation = api.import.previewContactsCsv.useMutation({
    onSuccess(data) {
      setPreviewData(data);
      setStep("preview");
    },
  });

  const confirmMutation = api.import.confirmContactsImport.useMutation({
    onSuccess(data) {
      setImportResult(data);
      setStep("result");
    },
  });

  function handleUpload(csvBase64: string) {
    previewMutation.mutate({ orgId, csvBase64 });
  }

  function handleConfirm() {
    if (!previewData) return;

    setStep("importing");

    const contactsPayload = previewData.valid.map((v) => ({
      name: v.name,
      phone: v.phone,
      email: v.email ?? undefined,
      language: v.language,
      tags: v.tags,
    }));

    confirmMutation.mutate({ orgId, contacts: contactsPayload });
  }

  function handleDone() {
    router.push(`/${orgSlug}/contacts`);
  }

  function handleReset() {
    setStep("upload");
    setPreviewData(null);
    setImportResult(null);
  }

  const CONTACT_COLUMNS = ["name", "phone", "email", "language", "tags"];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk-import contacts into your organization.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span className={step === "upload" ? "font-semibold text-primary" : ""}>
          1. Upload
        </span>
        <span>-</span>
        <span className={step === "preview" ? "font-semibold text-primary" : ""}>
          2. Preview
        </span>
        <span>-</span>
        <span className={step === "importing" || step === "result" ? "font-semibold text-primary" : ""}>
          3. Import
        </span>
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <>
          <CsvUploadZone
            onUpload={handleUpload}
            label="Upload Contacts CSV"
          />

          {previewMutation.isPending && (
            <p className="text-sm text-zinc-400">Parsing CSV...</p>
          )}
          {previewMutation.isError && (
            <p className="text-sm text-red-400">
              Error: {previewMutation.error.message}
            </p>
          )}

          <Card>
            <CardContent className="p-6">
              <p className="text-xs text-zinc-500">
                Expected CSV format: <code className="text-zinc-300">name,phone,email,language,tags</code>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Example: <code className="text-zinc-300">John Doe,+12125551234,john@example.com,EN,&quot;vip,new-customer&quot;</code>
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Preview Step */}
      {step === "preview" && previewData && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">
                {previewData.totalRows} row{previewData.totalRows !== 1 ? "s" : ""} found.{" "}
                <span className="text-green-400">{previewData.valid.length} valid</span>
                {previewData.errors.length > 0 && (
                  <>, <span className="text-red-400">{previewData.errors.length} error{previewData.errors.length !== 1 ? "s" : ""}</span></>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleReset}>
                Re-upload
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={previewData.valid.length === 0}
              >
                Import {previewData.valid.length} Contact{previewData.valid.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>

          <ImportPreviewTable
            columns={CONTACT_COLUMNS}
            rows={previewData.rawRows}
            errors={previewData.errors}
          />
        </>
      )}

      {/* Importing Step */}
      {step === "importing" && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-sm text-zinc-400">Importing contacts...</p>
          </CardContent>
        </Card>
      )}

      {/* Result Step */}
      {step === "result" && importResult && (
        <ImportResult
          inserted={importResult.inserted}
          failed={importResult.failed}
          onDone={handleDone}
        />
      )}
    </section>
  );
}
