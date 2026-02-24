"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/onboarding"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { api } from "@/trpc/react"

function statusLabel(status: "LOCKED" | "AVAILABLE" | "COMPLETED") {
  if (status === "COMPLETED") return "Completed"
  if (status === "AVAILABLE") return "In progress"
  return "Locked"
}

function statusClasses(status: "LOCKED" | "AVAILABLE" | "COMPLETED") {
  if (status === "COMPLETED") {
    return "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
  }

  if (status === "AVAILABLE") {
    return "border-blue-500/40 bg-blue-500/20 text-blue-200"
  }

  return "border-zinc-700 bg-zinc-700/20 text-zinc-300"
}

export function OnboardingWizard({
  orgId,
  orgSlug,
}: {
  orgId: string
  orgSlug: string
}) {
  const utils = api.useUtils()
  const { data, isLoading } = api.onboarding.getState.useQuery({ orgId })

  const completeStep = api.onboarding.completeStep.useMutation({
    onSuccess: async () => {
      await utils.onboarding.getState.invalidate({ orgId })
    },
  })

  const saveMission = api.onboarding.saveMissionBriefing.useMutation({
    onSuccess: async () => {
      await utils.onboarding.getState.invalidate({ orgId })
    },
  })

  const requestPhoneCode = api.onboarding.requestPhoneVerification.useMutation({
    onSuccess: async () => {
      await utils.onboarding.getState.invalidate({ orgId })
    },
  })

  const verifyPhoneCode = api.onboarding.verifyPhone.useMutation({
    onSuccess: async () => {
      await utils.onboarding.getState.invalidate({ orgId })
    },
  })

  const updateOrg = api.org.updateOrg.useMutation()

  const createStarterTemplate = api.workflowTemplates.createFromTemplate.useMutation({
    onSuccess: async () => {
      await utils.workflowTemplates.list.invalidate({ orgId })
    },
  })

  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("Professional services")
  const [businessTimezone, setBusinessTimezone] = useState("America/New_York")

  const [invoiceReference, setInvoiceReference] = useState("")
  const [firstReminderChannel, setFirstReminderChannel] = useState("EMAIL")

  const [monthlyTarget, setMonthlyTarget] = useState("")
  const [acceptableDso, setAcceptableDso] = useState("")
  const [priority, setPriority] = useState<"SPEED" | "RELATIONSHIP">("SPEED")
  const [defaultTone, setDefaultTone] = useState<
    "FRIENDLY" | "PROFESSIONAL" | "FIRM"
  >("PROFESSIONAL")
  const [updateChannel, setUpdateChannel] = useState<
    "SMS" | "WHATSAPP" | "EMAIL" | "VOICE" | "IN_APP"
  >("EMAIL")
  const [updateFrequency, setUpdateFrequency] = useState<
    "REAL_TIME" | "DAILY" | "WEEKLY"
  >("DAILY")

  const [phoneE164, setPhoneE164] = useState("")
  const [phoneCode, setPhoneCode] = useState("")
  const [debugCode, setDebugCode] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return

    setBusinessName((previous) => previous || data.org.name || "")
    setBusinessTimezone((previous) => previous || data.org.timezone || "America/New_York")

    const goals = (data.missionBriefing?.goals ?? {}) as Record<string, unknown>
    const maybeTarget = goals.monthlyCollectionTargetMinor
    const maybeDso = goals.acceptableDsoDays

    if (typeof maybeTarget === "number" && Number.isFinite(maybeTarget) && !monthlyTarget) {
      setMonthlyTarget(String(Math.floor(maybeTarget / 100)))
    }

    if (typeof maybeDso === "number" && Number.isFinite(maybeDso) && !acceptableDso) {
      setAcceptableDso(String(maybeDso))
    }

    if (goals.priority === "RELATIONSHIP" || goals.priority === "SPEED") {
      setPriority(goals.priority)
    }

    if (
      goals.defaultTone === "FRIENDLY" ||
      goals.defaultTone === "PROFESSIONAL" ||
      goals.defaultTone === "FIRM"
    ) {
      setDefaultTone(goals.defaultTone)
    }

    if (
      goals.updateChannel === "SMS" ||
      goals.updateChannel === "WHATSAPP" ||
      goals.updateChannel === "EMAIL" ||
      goals.updateChannel === "VOICE" ||
      goals.updateChannel === "IN_APP"
    ) {
      setUpdateChannel(goals.updateChannel)
    }

    if (
      goals.updateFrequency === "REAL_TIME" ||
      goals.updateFrequency === "DAILY" ||
      goals.updateFrequency === "WEEKLY"
    ) {
      setUpdateFrequency(goals.updateFrequency)
    }
  }, [data, monthlyTarget, acceptableDso])

  const stepMap = useMemo(() => {
    const entries = data?.onboarding.steps ?? []
    return new Map(entries.map((step) => [step.id, step]))
  }, [data?.onboarding.steps])

  const phoneUnlocked = Boolean(data?.onboarding.channelUnlocks.sms)
  const onboardingComplete = Boolean(data?.onboarding.isComplete)

  async function runStepCompletion(stepId: OnboardingStepId, payload?: Record<string, unknown>) {
    setError(null)
    setNotice(null)
    try {
      await completeStep.mutateAsync({
        orgId,
        stepId,
        payload,
      })
      setNotice(`Step ${stepId} completed`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete step")
    }
  }

  async function handleBusinessProfileSubmit() {
    setError(null)
    setNotice(null)

    if (!businessName.trim()) {
      setError("Business name is required")
      return
    }

    try {
      await updateOrg.mutateAsync({
        orgId,
        name: businessName.trim(),
        timezone: businessTimezone,
      })

      await runStepCompletion(1, {
        businessType,
        timezone: businessTimezone,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save business profile")
    }
  }

  async function handleConnectStripeDone() {
    await runStepCompletion(2, {
      stripeConnected: Boolean(data?.org.stripeConnected),
    })
  }

  async function handleFirstInvoiceDone() {
    await runStepCompletion(3, {
      invoiceReference: invoiceReference.trim() || null,
    })
  }

  async function handleStarterWorkflow() {
    setError(null)
    setNotice(null)
    try {
      const created = await createStarterTemplate.mutateAsync({
        orgId,
        templateKey: "GENTLE_REMINDER",
      })

      await runStepCompletion(4, {
        templateKey: "GENTLE_REMINDER",
        flowId: created.flowId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create starter workflow")
    }
  }

  async function handleFirstReminderDone() {
    if (!phoneUnlocked && (firstReminderChannel === "SMS" || firstReminderChannel === "VOICE")) {
      setError("Phone verification is required before SMS/voice unlock.")
      return
    }

    await runStepCompletion(5, {
      channel: firstReminderChannel,
    })
  }

  async function handleRequestPhoneCode() {
    setError(null)
    setNotice(null)

    try {
      const result = await requestPhoneCode.mutateAsync({
        orgId,
        phoneE164: phoneE164.trim(),
      })
      if (result.debugCode) {
        setDebugCode(result.debugCode)
      }
      setNotice("Verification code requested")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request phone verification")
    }
  }

  async function handleVerifyPhoneCode() {
    setError(null)
    setNotice(null)

    try {
      await verifyPhoneCode.mutateAsync({
        orgId,
        code: phoneCode.trim(),
      })
      setNotice("Phone verified. SMS/voice unlocked.")
      setDebugCode(null)
      setPhoneCode("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code")
    }
  }

  async function handleMissionBriefingSave() {
    setError(null)
    setNotice(null)

    const targetDollars = Number(monthlyTarget || "0")
    const dsoDays = Number(acceptableDso || "0")

    if (!Number.isFinite(targetDollars) || targetDollars < 0) {
      setError("Monthly target must be a valid number")
      return
    }

    if (!Number.isFinite(dsoDays) || dsoDays < 0) {
      setError("Acceptable DSO must be a valid number")
      return
    }

    if (!phoneUnlocked && (updateChannel === "SMS" || updateChannel === "VOICE")) {
      setError("Phone verification is required before SMS/voice update channels.")
      return
    }

    try {
      await saveMission.mutateAsync({
        orgId,
        monthlyCollectionTargetMinor: Math.round(targetDollars * 100),
        acceptableDsoDays: Math.round(dsoDays),
        priority,
        defaultTone,
        updateChannel,
        updateFrequency,
      })
      setNotice("Mission briefing saved. Onboarding completed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mission briefing")
    }
  }

  if (isLoading || !data) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="text-sm text-muted-foreground">Loading onboarding state...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Onboarding wizard</h1>
        <p className="text-sm text-muted-foreground">
          Complete all 6 steps to unlock automation routes for this organization.
        </p>
        {onboardingComplete ? (
          <Badge className="border-emerald-500/40 bg-emerald-500/20 text-emerald-200">
            Onboarding complete
          </Badge>
        ) : (
          <Badge className="border-blue-500/40 bg-blue-500/20 text-blue-200">
            Current step: {data.onboarding.currentStepId}
          </Badge>
        )}
      </div>

      {notice ? (
        <Card className="border-emerald-500/40">
          <CardContent className="pt-6 text-sm text-emerald-300">{notice}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {ONBOARDING_STEPS.map((step) => {
          const state = stepMap.get(step.id)
          const isAvailable = state?.status === "AVAILABLE" || state?.status === "COMPLETED"
          const isLocked = state?.status === "LOCKED"

          return (
            <Card key={step.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Step {step.id}: {step.title}
                  </CardTitle>
                  <Badge className={statusClasses(state?.status ?? "LOCKED")}>
                    {statusLabel(state?.status ?? "LOCKED")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {step.id === 1 ? (
                  <>
                    <Input
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Business name"
                      disabled={isLocked}
                    />
                    <Input
                      value={businessType}
                      onChange={(event) => setBusinessType(event.target.value)}
                      placeholder="Business type"
                      disabled={isLocked}
                    />
                    <Input
                      value={businessTimezone}
                      onChange={(event) => setBusinessTimezone(event.target.value)}
                      placeholder="Timezone (e.g. America/New_York)"
                      disabled={isLocked}
                    />
                    <Button
                      type="button"
                      onClick={handleBusinessProfileSubmit}
                      disabled={isLocked || updateOrg.isPending || completeStep.isPending}
                    >
                      Save & complete step
                    </Button>
                  </>
                ) : null}

                {step.id === 2 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <Link href="/api/stripe/connect">Open Stripe Connect</Link>
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConnectStripeDone}
                        disabled={isLocked || completeStep.isPending}
                      >
                        Mark connected
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stripe connected: {data.org.stripeConnected ? "Yes" : "No"}
                    </p>
                  </>
                ) : null}

                {step.id === 3 ? (
                  <>
                    <Input
                      value={invoiceReference}
                      onChange={(event) => setInvoiceReference(event.target.value)}
                      placeholder="First invoice ID (optional)"
                      disabled={isLocked}
                    />
                    <Button
                      type="button"
                      onClick={handleFirstInvoiceDone}
                      disabled={isLocked || completeStep.isPending}
                    >
                      Mark first invoice done
                    </Button>
                  </>
                ) : null}

                {step.id === 4 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Creates a "Gentle Reminder" starter workflow.
                    </p>
                    <Button
                      type="button"
                      onClick={handleStarterWorkflow}
                      disabled={isLocked || createStarterTemplate.isPending || completeStep.isPending}
                    >
                      Create starter workflow
                    </Button>
                  </>
                ) : null}

                {step.id === 5 ? (
                  <>
                    <Select
                      value={firstReminderChannel}
                      onChange={(event) => setFirstReminderChannel(event.target.value)}
                      disabled={isLocked}
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="VOICE">Voice</option>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      SMS/voice unlock: {phoneUnlocked ? "Unlocked" : "Locked (verify phone in step 6)"}
                    </p>
                    <Button
                      type="button"
                      onClick={handleFirstReminderDone}
                      disabled={isLocked || completeStep.isPending}
                    >
                      Mark first reminder sent
                    </Button>
                  </>
                ) : null}

                {step.id === 6 ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        value={monthlyTarget}
                        onChange={(event) => setMonthlyTarget(event.target.value)}
                        placeholder="Monthly target ($)"
                        disabled={!isAvailable}
                      />
                      <Input
                        value={acceptableDso}
                        onChange={(event) => setAcceptableDso(event.target.value)}
                        placeholder="Acceptable DSO (days)"
                        disabled={!isAvailable}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={priority}
                        onChange={(event) =>
                          setPriority(event.target.value as "SPEED" | "RELATIONSHIP")
                        }
                        disabled={!isAvailable}
                      >
                        <option value="SPEED">Priority: Speed</option>
                        <option value="RELATIONSHIP">Priority: Relationship</option>
                      </Select>
                      <Select
                        value={defaultTone}
                        onChange={(event) =>
                          setDefaultTone(
                            event.target.value as "FRIENDLY" | "PROFESSIONAL" | "FIRM",
                          )
                        }
                        disabled={!isAvailable}
                      >
                        <option value="FRIENDLY">Tone: Friendly</option>
                        <option value="PROFESSIONAL">Tone: Professional</option>
                        <option value="FIRM">Tone: Firm</option>
                      </Select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={updateChannel}
                        onChange={(event) =>
                          setUpdateChannel(
                            event.target.value as
                              | "SMS"
                              | "WHATSAPP"
                              | "EMAIL"
                              | "VOICE"
                              | "IN_APP",
                          )
                        }
                        disabled={!isAvailable}
                      >
                        <option value="EMAIL">Updates: Email</option>
                        <option value="WHATSAPP">Updates: WhatsApp</option>
                        <option value="SMS">Updates: SMS</option>
                        <option value="VOICE">Updates: Voice</option>
                        <option value="IN_APP">Updates: In-app</option>
                      </Select>
                      <Select
                        value={updateFrequency}
                        onChange={(event) =>
                          setUpdateFrequency(
                            event.target.value as "REAL_TIME" | "DAILY" | "WEEKLY",
                          )
                        }
                        disabled={!isAvailable}
                      >
                        <option value="REAL_TIME">Frequency: Real-time</option>
                        <option value="DAILY">Frequency: Daily</option>
                        <option value="WEEKLY">Frequency: Weekly</option>
                      </Select>
                    </div>

                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-sm">Phone verification (SMS/voice unlock)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          value={phoneE164}
                          onChange={(event) => setPhoneE164(event.target.value)}
                          placeholder="+14155552671"
                          disabled={!isAvailable}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRequestPhoneCode}
                            disabled={!isAvailable || requestPhoneCode.isPending}
                          >
                            Request code
                          </Button>
                          <Input
                            value={phoneCode}
                            onChange={(event) => setPhoneCode(event.target.value)}
                            placeholder="6-digit code"
                            className="max-w-[160px]"
                            disabled={!isAvailable}
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyPhoneCode}
                            disabled={!isAvailable || verifyPhoneCode.isPending}
                          >
                            Verify
                          </Button>
                        </div>
                        {debugCode ? (
                          <p className="text-xs text-muted-foreground">
                            Dev code: <span className="font-mono">{debugCode}</span>
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          SMS/voice status: {phoneUnlocked ? "Unlocked" : "Locked"}
                        </p>
                      </CardContent>
                    </Card>

                    <Button
                      type="button"
                      onClick={handleMissionBriefingSave}
                      disabled={!isAvailable || saveMission.isPending}
                    >
                      Save mission briefing
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {onboardingComplete ? (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="text-base">Automation unlocked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Onboarding is complete. You can now access flow and automation pages.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/${orgSlug}/flows`}>Open flows</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${orgSlug}/automation`}>Open automation rules</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
