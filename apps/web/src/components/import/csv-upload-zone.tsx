"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CsvUploadZoneProps {
  onUpload: (csvBase64: string) => void;
  label?: string;
}

export function CsvUploadZone({ onUpload, label }: CsvUploadZoneProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a CSV file.");
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const base64 = btoa(unescape(encodeURIComponent(text)));
        onUpload(base64);
      };
      reader.readAsText(file);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-zinc-700 bg-zinc-900/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <p className="mb-2 text-sm font-medium text-zinc-300">
            {label ?? "Upload CSV File"}
          </p>
          <p className="mb-4 text-xs text-zinc-500">
            Drag and drop a .csv file here, or click to browse
          </p>

          {fileName && (
            <p className="mb-3 text-sm text-primary">
              Selected: {fileName}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {fileName ? "Re-upload" : "Choose File"}
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
