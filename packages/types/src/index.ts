export type AppRouter = any;

export type FlowNodeData = {
  label?: string;
  type?: string;
  config?: Record<string, unknown>;
};

export type FlowNode = {
  id: string;
  type: string;
  data: FlowNodeData;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type InvoiceStatusInput =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "DUE"
  | "OVERDUE"
  | "PARTIAL"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "CANCELLED"
  | "WRITTEN_OFF"
  | "IN_DISPUTE";

export type MobileApprovalAction = "APPROVE" | "DENY" | "SNOOZE";

export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type ExtensionCaptureDraft = {
  clientName?: string;
  clientEmail?: string;
  clientPhoneE164?: string;
  invoiceNumber?: string;
  amountDueMinor?: number;
  currency?: string;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
};

export type ExtensionConflictResolution =
  | {
      mode: "EXISTING_CONTACT";
      existingContactId: string;
    }
  | {
      mode: "CREATE_CONTACT";
      newContact: {
        name: string;
        email?: string;
        phoneE164: string;
        timezone?: string;
      };
    };
