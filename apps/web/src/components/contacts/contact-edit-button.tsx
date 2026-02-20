"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ContactFormDialog } from "./contact-form-dialog";

interface ContactEditButtonProps {
  orgId: string;
  contact: {
    id: string;
    name: string;
    phoneE164: string;
    language: string;
  };
}

export function ContactEditButton({ orgId, contact }: ContactEditButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <ContactFormDialog
        orgId={orgId}
        contact={contact}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
