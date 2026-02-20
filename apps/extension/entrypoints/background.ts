import { getSettings } from "../src/lib/storage";
import { getTrpcClient } from "../src/lib/trpc-client";
import type { BackgroundActionRequest } from "../src/lib/messages";
import { defineBackground } from "wxt/utils/define-background";

type QueuedAction = {
  id: string;
  createdAt: number;
  action: BackgroundActionRequest["action"];
};

const QUEUE_KEY = "dueflow_extension_queue";
const FLUSH_ALARM = "dueflow_flush_queue";

async function enqueueAction(action: BackgroundActionRequest["action"]) {
  const stored = await chrome.storage.local.get(QUEUE_KEY);
  const queue = (stored[QUEUE_KEY] as QueuedAction[] | undefined) ?? [];

  queue.push({
    id: `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    createdAt: Date.now(),
    action,
  });

  await chrome.storage.local.set({ [QUEUE_KEY]: queue.slice(-200) });
}

async function flushQueue() {
  const stored = await chrome.storage.local.get(QUEUE_KEY);
  const queue = (stored[QUEUE_KEY] as QueuedAction[] | undefined) ?? [];
  if (queue.length === 0) {
    return;
  }

  const pending: QueuedAction[] = [];
  for (const item of queue) {
    try {
      await handleAction(item.action);
    } catch {
      pending.push(item);
    }
  }

  await chrome.storage.local.set({ [QUEUE_KEY]: pending });
}

async function handleAction(action: BackgroundActionRequest["action"]) {
  const settings = await getSettings();
  if (!settings.orgId) {
    throw new Error("orgId is required in extension settings");
  }

  const trpc: any = await getTrpcClient();

  if (action.type === "createCaptureDraft") {
    const installationId = `${settings.browser.toLowerCase()}-${chrome.runtime.id}`;
    return trpc.extension.createCaptureDraft.mutate({
      orgId: settings.orgId,
      sourceType: action.payload.sourceType,
      sourceUrl: action.payload.sourceUrl,
      rawPayload: action.payload.rawPayload,
      draft: action.payload.draft,
      installation: {
        installationId,
        browser: settings.browser,
        extensionVersion: settings.extensionVersion,
      },
    });
  }

  if (action.type === "resolveContactConflicts") {
    return trpc.extension.resolveContactConflicts.query({
      orgId: settings.orgId,
      captureEventId: action.payload.captureEventId,
    });
  }

  if (action.type === "createInvoiceFromCapture") {
    return trpc.extension.createInvoiceFromCapture.mutate({
      orgId: settings.orgId,
      captureEventId: action.payload.captureEventId,
      resolution: action.payload.resolution,
    });
  }

  if (action.type === "sendPaymentLink") {
    return trpc.extension.sendPaymentLinkFromExtension.mutate({
      orgId: settings.orgId,
      invoiceId: action.payload.invoiceId,
      channel: action.payload.channel,
    });
  }

  return trpc.extension.getClientInlineStatus.query({
    orgId: settings.orgId,
    ...action.payload,
  });
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === FLUSH_ALARM) {
      void flushQueue();
    }
  });

  chrome.runtime.onMessage.addListener((message: BackgroundActionRequest, _sender, sendResponse) => {
    if (message?.kind !== "DUEFLOW_ACTION") {
      return;
    }

    void (async () => {
      try {
        const result = await handleAction(message.action);
        sendResponse({ ok: true, result });
      } catch (error) {
        await enqueueAction(message.action);
        sendResponse({
          ok: false,
          queued: true,
          error: error instanceof Error ? error.message : "Action queued for retry",
        });
      }
    })();

    return true;
  });
});
