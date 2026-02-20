import { z } from "zod";

export const orgScopedInput = z.object({
  orgId: z.string().min(1),
});

export const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const currencyCode = z.string().length(3).default("USD");
