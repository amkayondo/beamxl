export type PopupAction =
  | {
      type: "createCaptureDraft";
      payload: {
        sourceType: "GMAIL" | "WEBPAGE" | "MANUAL";
        sourceUrl?: string;
        rawPayload: Record<string, unknown>;
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
      };
    }
  | {
      type: "resolveContactConflicts";
      payload: {
        captureEventId: string;
      };
    }
  | {
      type: "createInvoiceFromCapture";
      payload: {
        captureEventId: string;
        resolution:
          | { mode: "EXISTING_CONTACT"; existingContactId: string }
          | {
              mode: "CREATE_CONTACT";
              newContact: {
                name: string;
                email?: string;
                phoneE164: string;
                timezone?: string;
              };
            };
      };
    }
  | {
      type: "sendPaymentLink";
      payload: {
        invoiceId: string;
        channel: "EMAIL" | "SMS" | "WHATSAPP";
      };
    }
  | {
      type: "getClientInlineStatus";
      payload: {
        contactId?: string;
        email?: string;
        phoneE164?: string;
      };
    };

export type BackgroundActionRequest = {
  kind: "DUEFLOW_ACTION";
  action: PopupAction;
};
