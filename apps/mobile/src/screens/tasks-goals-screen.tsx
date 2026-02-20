import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { trpcClient } from "@/lib/trpc";

type Props = {
  orgId: string;
};

export function TasksGoalsScreen({ orgId }: Props) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{ goals: number; tasks: number; pendingApprovals: number } | null>(null);
  const [tasksCount, setTasksCount] = useState(0);

  const load = useCallback(async () => {
    const [ov, tasks] = await Promise.all([
      trpcClient.agent.overview.query({ orgId }),
      trpcClient.agent.listTasks.query({ orgId }),
    ]);

    setOverview(ov);
    setTasksCount(tasks.length);
  }, [orgId]);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#2A73FF" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Agent Overview</Text>
        <Text style={styles.meta}>Goals: {overview?.goals ?? 0}</Text>
        <Text style={styles.meta}>Tasks: {overview?.tasks ?? 0}</Text>
        <Text style={styles.meta}>Pending approvals: {overview?.pendingApprovals ?? 0}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Current Task Queue</Text>
        <Text style={styles.meta}>{tasksCount} tasks in history.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1426" },
  content: { padding: 16, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23344F",
    backgroundColor: "#111D32",
    padding: 12,
    gap: 6,
  },
  title: { color: "#EBF2FF", fontSize: 16, fontWeight: "700" },
  meta: { color: "#98A9C6", fontSize: 13 },
  loader: { marginTop: 64 },
});
