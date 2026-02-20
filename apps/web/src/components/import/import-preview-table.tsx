"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportPreviewTableProps {
  columns: string[];
  rows: Array<Record<string, string>>;
  errors: Array<{ row: number; field: string; message: string }>;
}

export function ImportPreviewTable({
  columns,
  rows,
  errors,
}: ImportPreviewTableProps) {
  // Build a map: rowNumber -> { field -> message }
  const errorMap = new Map<number, Map<string, string>>();
  for (const err of errors) {
    if (!errorMap.has(err.row)) {
      errorMap.set(err.row, new Map());
    }
    errorMap.get(err.row)!.set(err.field, err.message);
  }

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        No rows found in CSV.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            {columns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const rowNum = idx + 1;
            const rowErrors = errorMap.get(rowNum);
            const hasError = !!rowErrors;

            return (
              <TableRow
                key={rowNum}
                className={hasError ? "bg-red-950/30" : ""}
              >
                <TableCell className="font-mono text-xs text-zinc-500">
                  {rowNum}
                </TableCell>
                {columns.map((col) => {
                  const fieldError = rowErrors?.get(col);
                  return (
                    <TableCell
                      key={col}
                      className={fieldError ? "text-red-400" : ""}
                      title={fieldError ?? undefined}
                    >
                      {row[col] ?? ""}
                      {fieldError && (
                        <span className="ml-2 text-xs text-red-500">
                          ({fieldError})
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>
                  {hasError ? (
                    <span className="text-xs font-medium text-red-400">
                      Error
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-green-400">
                      Valid
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
