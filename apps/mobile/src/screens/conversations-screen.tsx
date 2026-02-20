import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { trpcClient } from "@/lib/trpc";

type Props = {
  orgId: string;
};

type ConversationRow = {
  id: string;
  contactName: string;
  channel: string;
  unreadCount: number;
  updatedAt: string;
};

export function ConversationsScreen({ orgId }: Props) {
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await trpcClient.conversations.list.query({
      orgId,
      page: 1,
      pageSize: 50,
    });

    setItems(
      result.items.map((item: any) => ({
        id: item.id,
        contactName: item.contact?.name ?? "Unknown",
        channel: item.channel,
        unreadCount: item.unreadCount,
        updatedAt: new Date(item.updatedAt).toLocaleString(),
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
  }, [load]);

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
          <Text style={styles.name}>{item.contactName}</Text>
          <Text style={styles.meta}>{item.channel} • Updated {item.updatedAt}</Text>
          <Text style={styles.meta}>Unread: {item.unreadCount}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
    />
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
    gap: 4,
  },
  name: { color: "#EBF2FF", fontSize: 15, fontWeight: "700" },
  meta: { color: "#98A9C6", fontSize: 12 },
  empty: { color: "#98A9C6", textAlign: "center", marginTop: 48 },
  loader: { marginTop: 64 },
});
