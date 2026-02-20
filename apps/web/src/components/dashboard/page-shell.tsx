import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPageShell(props: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        {props.description ? (
          <p className="text-sm text-muted-foreground">{props.description}</p>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
        </CardHeader>
        <CardContent>{props.children}</CardContent>
      </Card>
    </section>
  );
}
