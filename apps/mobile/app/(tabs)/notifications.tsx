import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type Notif = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, is_read, created_at")
      .eq("user_id", profile?.id || "")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as Notif[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (profile?.id) void load();
  }, [profile?.id]);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setRows((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 40 }}>
            هیچ ئاگادارییەک نییە
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => markRead(item.id)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: item.is_read ? colors.line : colors.brand,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "right" }}>
              {item.title}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 6, textAlign: "right" }}>
              {item.body}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
