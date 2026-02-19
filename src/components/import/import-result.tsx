"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ImportResultProps {
  inserted: number;
  failed: Array<{ row: number; error: string }>;
  onDone: () => void;
}

export function ImportResult({ inserted, failed, onDone }: ImportResultProps) {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        {/* Success */}
        {inserted > 0 && (
          <div className="rounded-lg border border-green-800 bg-green-950/40 p-4">
            <p className="text-sm font-medium text-green-400">
              Successfully imported {inserted} record{inserted !== 1 ? "s" : ""}.
            </p>
          </div>
        )}

        {/* Failures */}
        {failed.length > 0 && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-4">
            <p className="mb-2 text-sm font-medium text-red-400">
              {failed.length} record{failed.length !== 1 ? "s" : ""} failed to
              import:
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {failed.map((f, i) => (
                <li key={i} className="text-xs text-red-300">
                  Row {f.row}: {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No results */}
        {inserted === 0 && failed.length === 0 && (
          <p className="text-sm text-zinc-400">No records were processed.</p>
        )}

        <Button type="button" onClick={onDone}>
          Done
        </Button>
      </CardContent>
    </Card>
  );
}
