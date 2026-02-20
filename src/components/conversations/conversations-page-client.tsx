"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReplyBox } from "@/components/conversations/reply-box";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export function ConversationsPageClient({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
}) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: conversations, isLoading: listLoading } =
    api.conversations.list.useQuery({
      orgId,
      page: 1,
      pageSize: 50,
    });

  const { data: thread, isLoading: threadLoading } =
    api.conversations.thread.useQuery(
      { orgId, contactId: selectedContactId! },
      { enabled: !!selectedContactId }
    );

  const { data: members } = api.org.listMembers.useQuery({ orgId });

  const assignMutation = api.conversations.assign.useMutation({
    onSuccess: () => {
      void utils.conversations.list.invalidate();
    },
  });

  const items = conversations?.items ?? [];

  // Build a lookup map from userId to display name
  const memberNameMap = new Map<string, string>();
  if (members) {
    for (const m of members) {
      memberNameMap.set(m.userId, m.user?.name ?? m.userId.slice(0, 8));
    }
  }

  // Find the assignedToUserId for the currently selected conversation
  const selectedConversation = items.find(
    (item) => item.contactId === selectedContactId
  );
  const currentAssignee = selectedConversation?.assignedToUserId ?? "";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Three-column inbox for WhatsApp follow-up workflow.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_300px]">
        {/* Left column: Conversation list */}
        <Card>
          <CardHeader>
            <CardTitle>Threads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {listLoading ? (
              <p className="py-4 text-center text-sm text-zinc-400">
                Loading...
              </p>
            ) : items.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">
                No conversations yet.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedContactId(item.contactId)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition-colors",
                    selectedContactId === item.contactId
                      ? "border-zinc-500 bg-zinc-800/60"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-zinc-100">
                      {item.contact?.name ?? "Unknown"}
                    </p>
                    <Badge>{item.status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-zinc-400">
                      {item.lastMessageAt
                        ? new Date(item.lastMessageAt).toLocaleDateString()
                        : "No messages"}
                    </p>
                    {item.unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                  {item.assignedToUserId && (
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      Assigned to{" "}
                      {memberNameMap.get(item.assignedToUserId) ??
                        item.assignedToUserId.slice(0, 8)}
                    </p>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Center column: Message timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedContactId ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                Select a conversation to view messages.
              </p>
            ) : threadLoading ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                Loading messages...
              </p>
            ) : thread?.items.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                No messages in this thread.
              </p>
            ) : (
              thread?.items.map((entry) => {
                if (entry.type === "CALL") {
                  const call = entry.item;
                  return (
                    <div
                      key={`call-${call.id}`}
                      className="rounded-md border border-zinc-700 bg-zinc-900/60 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-zinc-300">Voice Call</p>
                        <span className="text-xs text-zinc-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-zinc-100">
                        Status: {call.status}
                        {call.outcome ? ` • Outcome: ${call.outcome}` : ""}
                      </p>
                      {call.summary && (
                        <p className="mt-1 text-xs text-zinc-400">{call.summary}</p>
                      )}
                    </div>
                  );
                }

                const message = entry.item;
                return (
                  <div
                    key={`msg-${message.id}`}
                    className={cn(
                      "rounded-md border p-3 text-sm",
                      message.direction === "OUTBOUND"
                        ? "ml-8 border-zinc-700 bg-zinc-800/50"
                        : "mr-8 border-zinc-800 bg-zinc-900"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-zinc-300">
                        {message.direction === "OUTBOUND" ? "You" : "Contact"} • {message.channel}
                      </p>
                      <span className="text-xs text-zinc-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-100">{message.body}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {message.deliveryStatus}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right column: Reply box */}
        <Card>
          <CardHeader>
            <CardTitle>Reply</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedContactId ? (
              <div className="space-y-4">
                {/* Assignment section */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Assigned to
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={currentAssignee}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      assignMutation.mutate({
                        orgId,
                        contactId: selectedContactId,
                        assignedToUserId: value,
                      });
                    }}
                    disabled={assignMutation.isPending}
                  >
                    <option value="">Unassigned</option>
                    {members?.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user?.name ?? m.userId.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
                <ReplyBox orgId={orgId} contactId={selectedContactId} />
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-zinc-400">
                Select a conversation to reply.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
