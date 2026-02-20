import { eq, sql } from "drizzle-orm";

import { db } from "../../../../src/server/db";
import { invoices } from "../../../../src/server/db/schema";

async function main() {
  const before = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.status, "CANCELLED"));

  const cancelledRows = Number(before[0]?.count ?? 0);

  if (cancelledRows === 0) {
    console.log("[backfill:normalize-invoice-status] no CANCELLED rows found");
    return;
  }

  await db
    .update(invoices)
    .set({
      status: "CANCELED",
      updatedAt: new Date(),
    })
    .where(eq(invoices.status, "CANCELLED"));

  const after = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.status, "CANCELLED"));

  console.log(
    `[backfill:normalize-invoice-status] migrated ${cancelledRows} rows, remaining=${Number(after[0]?.count ?? 0)}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[backfill:normalize-invoice-status] failed", error);
    process.exit(1);
  });
