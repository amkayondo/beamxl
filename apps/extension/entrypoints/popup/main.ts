import type { BackgroundActionRequest } from "../../src/lib/messages";
import { getSettings } from "../../src/lib/storage";

type CaptureResult = {
  draft: {
    clientName?: string;
    clientEmail?: string;
    clientPhoneE164?: string;
    invoiceNumber?: string;
    amountDueMinor?: number;
    dueDate?: string;
    currency?: string;
    notes?: string;
  };
  rawPayload: Record<string, unknown>;
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing app root");

let captureEventId = "";
let createdInvoiceId = "";
let lastCapture: CaptureResult | null = null;

app.innerHTML = `
  <div class="card">
    <strong>DueFlow Capture</strong>
    <div id="settings" class="muted"></div>
    <button id="capture">Capture Current Page</button>
    <div id="status" class="muted"></div>
  </div>

  <div class="card">
    <label>Contact resolution</label>
    <select id="resolutionMode">
      <option value="EXISTING_CONTACT">Use existing contact</option>
      <option value="CREATE_CONTACT">Create new contact</option>
    </select>
    <input id="existingContactId" placeholder="Existing contact ID" />
    <input id="newContactName" placeholder="New contact name" class="hidden" />
    <input id="newContactEmail" placeholder="New contact email" class="hidden" />
    <input id="newContactPhone" placeholder="New contact phone E.164" class="hidden" />
    <button id="createInvoice">Create Invoice From Capture</button>
    <div class="row">
      <select id="sendChannel">
        <option value="EMAIL">Email</option>
        <option value="SMS">SMS</option>
        <option value="WHATSAPP">WhatsApp</option>
      </select>
      <button id="sendLink">Send Payment Link</button>
    </div>
  </div>

  <div class="card">
    <label>Debug</label>
    <pre id="debug"></pre>
  </div>
`;

const captureBtn = document.querySelector<HTMLButtonElement>("#capture")!;
const createInvoiceBtn = document.querySelector<HTMLButtonElement>("#createInvoice")!;
const sendLinkBtn = document.querySelector<HTMLButtonElement>("#sendLink")!;
const sendChannel = document.querySelector<HTMLSelectElement>("#sendChannel")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const settingsEl = document.querySelector<HTMLDivElement>("#settings")!;
const debugEl = document.querySelector<HTMLPreElement>("#debug")!;
const resolutionMode = document.querySelector<HTMLSelectElement>("#resolutionMode")!;
const existingContactId = document.querySelector<HTMLInputElement>("#existingContactId")!;
const newContactName = document.querySelector<HTMLInputElement>("#newContactName")!;
const newContactEmail = document.querySelector<HTMLInputElement>("#newContactEmail")!;
const newContactPhone = document.querySelector<HTMLInputElement>("#newContactPhone")!;

function setStatus(message: string) {
  statusEl.textContent = message;
}

function showDebug(data: unknown) {
  debugEl.textContent = JSON.stringify(data, null, 2);
}

function toggleResolutionFields() {
  const createMode = resolutionMode.value === "CREATE_CONTACT";
  existingContactId.classList.toggle("hidden", createMode);
  newContactName.classList.toggle("hidden", !createMode);
  newContactEmail.classList.toggle("hidden", !createMode);
  newContactPhone.classList.toggle("hidden", !createMode);
}

resolutionMode.addEventListener("change", toggleResolutionFields);
toggleResolutionFields();

async function sendAction(action: BackgroundActionRequest["action"]) {
  const response = await chrome.runtime.sendMessage({
    kind: "DUEFLOW_ACTION",
    action,
  } satisfies BackgroundActionRequest);

  if (!response?.ok) {
    throw new Error(response?.error ?? "Action failed");
  }

  return response.result;
}

async function captureCurrentPage(): Promise<CaptureResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found");

  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: "DUEFLOW_CAPTURE_PAGE",
  })) as CaptureResult;

  if (!response?.draft) {
    throw new Error("No capture data returned by content script");
  }

  return response;
}

captureBtn.addEventListener("click", async () => {
  try {
    setStatus("Capturing...");
    const capture = await captureCurrentPage();
    lastCapture = capture;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const sourceUrl = tab?.url;

    const created = await sendAction({
      type: "createCaptureDraft",
      payload: {
        sourceType: sourceUrl?.includes("mail.google.com") ? "GMAIL" : "WEBPAGE",
        sourceUrl,
        rawPayload: capture.rawPayload,
        draft: capture.draft,
      },
    });

    captureEventId = created.captureEventId;

    const conflicts = await sendAction({
      type: "resolveContactConflicts",
      payload: { captureEventId },
    });

    const preferred = conflicts?.preferredMatchId ?? "";
    if (preferred) {
      existingContactId.value = preferred;
    }

    if (capture.draft.clientEmail || capture.draft.clientPhoneE164) {
      const inlineStatus = await sendAction({
        type: "getClientInlineStatus",
        payload: {
          email: capture.draft.clientEmail,
          phoneE164: capture.draft.clientPhoneE164,
        },
      });
      showDebug({ capture, conflicts, inlineStatus });
    } else {
      showDebug({ capture, conflicts });
    }

    setStatus("Capture draft created.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Capture failed");
  }
});

createInvoiceBtn.addEventListener("click", async () => {
  if (!captureEventId) {
    setStatus("Capture a draft first.");
    return;
  }

  try {
    setStatus("Creating invoice...");

    const resolution =
      resolutionMode.value === "CREATE_CONTACT"
        ? {
            mode: "CREATE_CONTACT" as const,
            newContact: {
              name: newContactName.value || lastCapture?.draft.clientName || "New Contact",
              email: newContactEmail.value || lastCapture?.draft.clientEmail || undefined,
              phoneE164: newContactPhone.value || lastCapture?.draft.clientPhoneE164 || "",
            },
          }
        : {
            mode: "EXISTING_CONTACT" as const,
            existingContactId: existingContactId.value,
          };

    const created = await sendAction({
      type: "createInvoiceFromCapture",
      payload: {
        captureEventId,
        resolution,
      },
    });

    createdInvoiceId = created.invoiceId;
    showDebug({ createdInvoiceId, resolution });
    setStatus(`Invoice ${createdInvoiceId} created.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Invoice creation failed");
  }
});

sendLinkBtn.addEventListener("click", async () => {
  if (!createdInvoiceId) {
    setStatus("Create invoice first.");
    return;
  }

  try {
    setStatus("Sending payment link...");
    const result = await sendAction({
      type: "sendPaymentLink",
      payload: {
        invoiceId: createdInvoiceId,
        channel: sendChannel.value as "EMAIL" | "SMS" | "WHATSAPP",
      },
    });

    showDebug(result);
    setStatus("Payment link sent.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Send failed");
  }
});

void (async () => {
  const settings = await getSettings();
  settingsEl.textContent = `Org: ${settings.orgId || "(not set)"} • API: ${settings.apiBaseUrl}`;
})();
