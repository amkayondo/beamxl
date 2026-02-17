import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  const conversations = await api.conversations.list({
    orgId: org.orgId,
    page: 1,
    pageSize: 50,
  });

  const first = conversations.items[0];
  const thread = first
    ? await api.conversations.thread({
        orgId: org.orgId,
        contactId: first.contactId,
      })
    : { items: [] };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground">Three-column inbox for WhatsApp follow-up workflow.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle>Threads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.items.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.contact?.name ?? "Unknown"}</p>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Unread: {item.unreadCount}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thread.items.map((message) => (
              <div key={message.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{message.direction}</p>
                <p>{message.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{message.deliveryStatus}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Type reply suggestion..." />
            <Button type="button" className="w-full">
              Send
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
