"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TopDelinquentProps {
  data: Array<{
    contactId: string;
    contactName: string;
    overdueAmount: number;
    overdueCount: number;
  }>;
}

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function TopDelinquent({ data }: TopDelinquentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Delinquent Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No overdue invoices found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead className="text-right">Overdue Amount</TableHead>
                <TableHead className="text-right"># Overdue Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.contactId}>
                  <TableCell className="font-medium">
                    {row.contactName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(row.overdueAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.overdueCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
