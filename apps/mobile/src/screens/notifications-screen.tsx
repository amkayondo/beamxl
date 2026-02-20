import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { trpcClient } from "@/lib/trpc";

type Props = {
  orgId: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsScreen({ orgId }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await trpcClient.notifications.list.query({
      orgId,
      page: 1,
      pageSize: 100,
    });

    setItems(
      response.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        readAt: item.readAt,
        createdAt: new Date(item.createdAt).toLocaleString(),
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

  const markAllRead = useCallback(async () => {
    await trpcClient.notifications.markAllRead.mutate({ orgId });
    await load();
  }, [load, orgId]);

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#2A73FF" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={() => void markAllRead()} style={styles.action}>
          <Text style={styles.actionText}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, item.readAt ? styles.read : styles.unread]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
            <Text style={styles.date}>{item.createdAt}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1426" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#EBF2FF", fontSize: 18, fontWeight: "700" },
  action: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#2A73FF", borderRadius: 8 },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  content: { padding: 16, gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  unread: { borderColor: "#3A5D96", backgroundColor: "#152744" },
  read: { borderColor: "#23344F", backgroundColor: "#111D32" },
  cardTitle: { color: "#EBF2FF", fontSize: 14, fontWeight: "700" },
  cardBody: { color: "#B4C3DB", fontSize: 13 },
  date: { color: "#90A3C2", fontSize: 11 },
  empty: { color: "#98A9C6", textAlign: "center", marginTop: 48 },
  loader: { marginTop: 64 },
});
