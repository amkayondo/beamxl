"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

export function ReplyBox({
  orgId,
  contactId,
}: {
  orgId: string;
  contactId: string;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const utils = api.useUtils();

  const sendMutation = api.conversations.sendMessage.useMutation({
    onMutate: () => setSending(true),
    onSuccess: () => {
      setBody("");
      void utils.conversations.thread.invalidate({ orgId, contactId });
      void utils.conversations.list.invalidate();
    },
    onSettled: () => setSending(false),
  });

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    sendMutation.mutate({ orgId, contactId, body: trimmed });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type your reply..."
        className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSend();
          }
        }}
      />
      <Button
        type="button"
        className="w-full"
        onClick={handleSend}
        disabled={sending || !body.trim()}
      >
        {sending ? "Sending..." : "Send"}
      </Button>
    </div>
  );
}
