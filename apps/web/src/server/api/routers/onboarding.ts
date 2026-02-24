import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  type OnboardingStepKey,
} from "@/lib/onboarding";
import { adminProcedure, createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import {
  completeOnboardingStepForOrg,
  getOnboardingStateForOrg,
  onboardingStepIdFromStepKey,
  requestOnboardingPhoneVerificationForOrg,
  saveMissionBriefingForOrg,
  verifyOnboardingPhoneCodeForOrg,
} from "@/server/services/onboarding.service";

const orgInput = z.object({
  orgId: z.string().min(1),
});

const stepIdSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const missionBriefingInput = z.object({
  orgId: z.string().min(1),
  monthlyCollectionTargetMinor: z.number().int().min(0).optional(),
  acceptableDsoDays: z.number().int().min(0).optional(),
  priority: z.enum(["SPEED", "RELATIONSHIP"]).optional(),
  defaultTone: z.enum(["FRIENDLY", "PROFESSIONAL", "FIRM"]).optional(),
  escalationThresholds: z.record(z.string(), z.unknown()).optional(),
  contactRestrictions: z.record(z.string(), z.unknown()).optional(),
  updateChannel: z.enum(["SMS", "WHATSAPP", "EMAIL", "VOICE", "IN_APP"]).optional(),
  updateFrequency: z.enum(["REAL_TIME", "DAILY", "WEEKLY"]).optional(),
});

function assertOnboardingStepKey(value: string): OnboardingStepKey {
  const matched = ONBOARDING_STEPS.find((step) => step.key === value);
  if (!matched) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid onboarding step key" });
  }

  return matched.key;
}

function toOnboardingStepId(value: OnboardingStepId | OnboardingStepKey) {
  if (typeof value === "number") return value;
  return onboardingStepIdFromStepKey(value);
}

export const onboardingRouter = createTRPCRouter({
  getState: orgProcedure.input(orgInput).query(async ({ ctx, input }) => {
    const snapshot = await getOnboardingStateForOrg(ctx.db, input.orgId);

    return {
      org: {
        orgId: snapshot.org.id,
        slug: snapshot.org.slug,
        name: snapshot.org.name,
        timezone: snapshot.org.timezone,
        defaultCurrency: snapshot.org.defaultCurrency,
        stripeConnected: Boolean(
          snapshot.org.stripeCustomerId || snapshot.org.stripeSubscriptionId,
        ),
      },
      onboarding: snapshot.onboardingState,
      missionBriefing: snapshot.missionBriefing,
    };
  }),

  completeStep: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        stepId: stepIdSchema.optional(),
        stepKey: z.string().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.stepId && !input.stepKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "stepId or stepKey is required",
        });
      }

      const stepId = toOnboardingStepId(
        input.stepId ?? assertOnboardingStepKey(input.stepKey ?? ""),
      );

      try {
        const result = await completeOnboardingStepForOrg(
          ctx.db,
          input.orgId,
          stepId,
          input.payload,
        );

        return {
          ok: true,
          onboarding: result.onboardingState,
          missionBriefing: result.missionBriefing,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to complete onboarding step",
        });
      }
    }),

  requestPhoneVerification: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await requestOnboardingPhoneVerificationForOrg(
        ctx.db,
        input.orgId,
        input.phoneE164,
      );

      return {
        ok: true,
        onboarding: result.onboardingState,
        debugCode: result.debugCode,
      };
    }),

  verifyPhone: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        code: z.string().regex(/^\d{6}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await verifyOnboardingPhoneCodeForOrg(
          ctx.db,
          input.orgId,
          input.code,
        );

        return {
          ok: true,
          onboarding: result.onboardingState,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to verify phone",
        });
      }
    }),

  saveMissionBriefing: adminProcedure
    .input(missionBriefingInput)
    .mutation(async ({ ctx, input }) => {
      const result = await saveMissionBriefingForOrg(ctx.db, input.orgId, {
        monthlyCollectionTargetMinor: input.monthlyCollectionTargetMinor,
        acceptableDsoDays: input.acceptableDsoDays,
        priority: input.priority,
        defaultTone: input.defaultTone,
        escalationThresholds: input.escalationThresholds,
        contactRestrictions: input.contactRestrictions,
        updateChannel: input.updateChannel,
        updateFrequency: input.updateFrequency,
      });

      return {
        ok: true,
        onboarding: result.onboardingState,
        missionBriefing: result.missionBriefing,
      };
    }),

  // Backward-compatible alias to support existing callers while moving to completeStep.
  upsertWizardStep: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        step: stepIdSchema,
        completed: z.boolean().default(true),
        payload: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.completed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uncompleting onboarding steps is not supported.",
        });
      }

      const result = await completeOnboardingStepForOrg(
        ctx.db,
        input.orgId,
        input.step,
        input.payload,
      );

      return {
        ok: true,
        onboarding: result.onboardingState,
        missionBriefing: result.missionBriefing,
      };
    }),
});
