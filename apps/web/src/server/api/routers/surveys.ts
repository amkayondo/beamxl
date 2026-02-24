import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { surveyQuestions, surveyResponses, surveys } from "@/server/db/schema";

export const surveysRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.surveys.findMany({
        where: (s, { and, eq }) =>
          and(
            eq(s.orgId, input.orgId),
            input.isActive === undefined ? undefined : eq(s.isActive, input.isActive),
          ),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        name: z.string().min(2),
        triggerType: z.string().min(2),
        channel: z.enum(["WHATSAPP", "VOICE", "EMAIL", "SMS"]).default("EMAIL"),
        questions: z
          .array(
            z.object({
              prompt: z.string().min(2),
              type: z.enum(["TEXT", "RATING", "MULTIPLE_CHOICE", "YES_NO"]),
              isRequired: z.boolean().default(false),
              config: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const surveyId = crypto.randomUUID();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(surveys).values({
          id: surveyId,
          orgId: input.orgId,
          name: input.name,
          triggerType: input.triggerType,
          channel: input.channel,
          isActive: true,
          createdByUserId: ctx.session.user.id,
        });

        await tx.insert(surveyQuestions).values(
          input.questions.map((question, index) => ({
            id: crypto.randomUUID(),
            orgId: input.orgId,
            surveyId,
            questionType: question.type,
            prompt: question.prompt,
            isRequired: question.isRequired,
            position: index,
            config: question.config ?? {},
          })),
        );
      });

      return { surveyId };
    }),

  results: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        surveyId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const totalResponses = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(surveyResponses)
        .where(and(eq(surveyResponses.orgId, input.orgId), eq(surveyResponses.surveyId, input.surveyId)));

      const rows = await ctx.db.query.surveyResponses.findMany({
        where: (r, { and, eq }) =>
          and(eq(r.orgId, input.orgId), eq(r.surveyId, input.surveyId)),
        orderBy: (r, { desc }) => [desc(r.submittedAt)],
        limit: 100,
      });

      return {
        total: Number(totalResponses[0]?.count ?? 0),
        recent: rows,
      };
    }),
});
