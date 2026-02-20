import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { trpcClient } from "@/lib/trpc";

type Props = {
  orgId: string;
};

type ApprovalItem = {
  id: string;
  requestText: string;
  status: "RECEIVED" | "CONFIRMED" | "EXECUTED" | "REJECTED" | "FAILED";
  expiresAt: Date;
};

function idempotencyKey() {
  return `mobile-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function ApprovalsScreen({ orgId }: Props) {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await trpcClient.agent.listApprovalRequests.query({
      orgId,
      status: "RECEIVED",
      limit: 50,
    });

    setItems(
      response.items.map((item: any) => ({
        id: item.id,
        requestText: item.requestText,
        status: item.status,
        expiresAt: new Date(item.expiresAt),
      })),
    );
  }, [orgId]);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();

    const timer = setInterval(() => void load(), 8_000);
    return () => clearInterval(timer);
  }, [load]);

  const act = useCallback(
    async (approvalRequestId: string, action: "APPROVE" | "DENY" | "SNOOZE") => {
      setItems((prev) => prev.filter((x) => x.id !== approvalRequestId));

      await trpcClient.agent.mobileApprovalAction.mutate({
        orgId,
        approvalRequestId,
        action,
        idempotencyKey: idempotencyKey(),
        snoozeMinutes: action === "SNOOZE" ? 60 : undefined,
      });

      await load();
    },
    [load, orgId],
  );

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#2A73FF" />;
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.text}>{item.requestText}</Text>
          <Text style={styles.expiry}>Expires {item.expiresAt.toLocaleString()}</Text>
          <View style={styles.row}>
            <ActionButton label="Approve" tone="ok" onPress={() => void act(item.id, "APPROVE")} />
            <ActionButton label="Deny" tone="bad" onPress={() => void act(item.id, "DENY")} />
            <ActionButton label="Snooze" tone="neutral" onPress={() => void act(item.id, "SNOOZE")} />
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No pending approvals.</Text>}
    />
  );
}

function ActionButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: "ok" | "bad" | "neutral";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, tone === "ok" ? styles.ok : tone === "bad" ? styles.bad : styles.neutral]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#0A1426" },
  content: { padding: 16, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23344F",
    backgroundColor: "#111D32",
    padding: 12,
    gap: 8,
  },
  text: { color: "#E9F1FF", fontSize: 14 },
  expiry: { color: "#A7B5CF", fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  button: {
    minHeight: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  ok: { backgroundColor: "#1E8A4D" },
  bad: { backgroundColor: "#AE3B4A" },
  neutral: { backgroundColor: "#315D9A" },
  buttonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  empty: { color: "#98A9C6", textAlign: "center", marginTop: 48 },
  loader: { marginTop: 64 },
});
