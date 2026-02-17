import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; contactId: string }>;
}) {
  const { orgSlug, contactId } = await params;
  const org = await requireOrgBySlug(orgSlug);

  const contact = await api.contacts.byId({
    orgId: org.orgId,
    contactId,
  });

  const thread = await api.conversations.thread({
    orgId: org.orgId,
    contactId,
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{contact?.name ?? "Contact"}</h1>
        <p className="text-sm text-muted-foreground">Ledger and communication history.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Phone: {contact?.phoneE164}</p>
            <p>Email: {contact?.email ?? "-"}</p>
            <p>Language: {contact?.language}</p>
            <p>Opted out: {contact?.optedOutAt ? "Yes" : "No"}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversation Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thread.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.direction}</TableCell>
                    <TableCell>{item.body}</TableCell>
                    <TableCell>{item.deliveryStatus}</TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
