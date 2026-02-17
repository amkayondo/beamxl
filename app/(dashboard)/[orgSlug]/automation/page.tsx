import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);
  const rules = await api.automation.list({ orgId: org.orgId });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="text-sm text-muted-foreground">Escalation ladder and reminder schedule controls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <CardTitle>{rule.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Trigger: {rule.triggerType}</p>
              <p>Offset: {rule.offsetDays} day(s)</p>
              <p>Channel: {rule.channel}</p>
              <Badge>{rule.isActive ? "ACTIVE" : "PAUSED"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
