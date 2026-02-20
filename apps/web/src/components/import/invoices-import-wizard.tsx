"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/trpc/react";

import { CsvUploadZone } from "./csv-upload-zone";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportResult } from "./import-result";

type Step = "upload" | "preview" | "importing" | "result";

interface PreviewData {
  rawRows: Record<string, string>[];
  valid: Array<{
    row: number;
    contactPhone: string;
    contactName: string | null;
    invoiceNumber: string;
    amountMinor: number;
    dueDate: string;
    currency: string;
  }>;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: string[];
  totalRows: number;
}

interface ImportResultData {
  inserted: number;
  failed: Array<{ row: number; error: string }>;
}

export function InvoicesImportWizard({
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

  const previewMutation = api.import.previewInvoicesCsv.useMutation({
    onSuccess(data) {
      setPreviewData(data);
      setStep("preview");
    },
  });

  const confirmMutation = api.import.confirmInvoicesImport.useMutation({
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

    const invoicesPayload = previewData.valid.map((v) => ({
      contactPhone: v.contactPhone,
      contactName: v.contactName ?? undefined,
      invoiceNumber: v.invoiceNumber,
      amount: v.amountMinor / 100, // convert cents back to dollars for the API
      dueDate: v.dueDate,
      currency: v.currency,
    }));

    confirmMutation.mutate({ orgId, invoices: invoicesPayload });
  }

  function handleDone() {
    router.push(`/${orgSlug}/invoices`);
  }

  function handleReset() {
    setStep("upload");
    setPreviewData(null);
    setImportResult(null);
  }

  const INVOICE_COLUMNS = [
    "contactPhone",
    "contactName",
    "invoiceNumber",
    "amount",
    "dueDate",
    "currency",
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk-import invoices into your organization.
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
            label="Upload Invoices CSV"
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
                Expected CSV format:{" "}
                <code className="text-zinc-300">
                  contactPhone,contactName,invoiceNumber,amount,dueDate,currency
                </code>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Example:{" "}
                <code className="text-zinc-300">
                  +12125551234,John Doe,INV-001,150.00,2026-03-01,USD
                </code>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Note: Contacts must already exist. They are resolved by phone number first, then by name.
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
                Import {previewData.valid.length} Invoice{previewData.valid.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>

          {/* Warnings */}
          {previewData.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 p-4">
              <p className="mb-1 text-xs font-medium text-yellow-400">Warnings:</p>
              <ul className="space-y-0.5">
                {previewData.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-yellow-300">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ImportPreviewTable
            columns={INVOICE_COLUMNS}
            rows={previewData.rawRows}
            errors={previewData.errors}
          />
        </>
      )}

      {/* Importing Step */}
      {step === "importing" && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-sm text-zinc-400">Importing invoices...</p>
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
