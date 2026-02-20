import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { trpcClient } from "@/lib/trpc";

type Props = {
  orgId: string;
};

type DashboardData = {
  outstandingMinor: number;
  overdueCount: number;
  forecast30Minor: number;
  atRiskMinor: number;
};

function money(minor: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(minor / 100);
}

export function DashboardScreen({ orgId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [aging, forecast] = await Promise.all([
        trpcClient.analytics.agingAtRisk.query({ orgId }),
        trpcClient.analytics.forecast.query({ orgId, horizonDays: "30" }),
      ]);

      setData({
        outstandingMinor: Number((aging as any).overdue_minor ?? 0),
        overdueCount: Number((aging as any).overdue_count ?? 0),
        forecast30Minor: Number(forecast.projectedCollectionsMinor ?? 0),
        atRiskMinor: Number(forecast.atRiskMinor ?? 0),
      });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return <ActivityIndicator style={styles.loader} color="#2A73FF" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.grid}>
        <MetricCard label="Overdue value" value={money(data?.outstandingMinor ?? 0)} />
        <MetricCard label="Overdue invoices" value={String(data?.overdueCount ?? 0)} />
        <MetricCard label="30-day forecast" value={money(data?.forecast30Minor ?? 0)} />
        <MetricCard label="At risk" value={money(data?.atRiskMinor ?? 0)} />
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1426" },
  content: { padding: 16, gap: 16 },
  title: { color: "#EAF0FF", fontSize: 22, fontWeight: "700" },
  grid: { gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#24334D",
    backgroundColor: "#111D32",
    padding: 14,
    gap: 4,
  },
  cardLabel: { color: "#96A8C8", fontSize: 13 },
  cardValue: { color: "#F5F8FF", fontSize: 20, fontWeight: "700" },
  loader: { marginTop: 64 },
});
