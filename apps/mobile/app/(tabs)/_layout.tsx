import { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const { colors } = useTheme();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile?.id) {
      setUnread(0);
      return;
    }

    let cancelled = false;

    async function refresh() {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile!.id)
        .eq("is_read", false);
      if (!cancelled && !error) setUnread(count ?? 0);
    }

    void refresh();
    const id = setInterval(() => void refresh(), 20000);
    const channel = supabase
      .channel(`mobile-unread-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(id);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!loading && (!session || profile?.role !== "employee")) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.ink, fontWeight: "700" },
        headerTitleAlign: "center",
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: ckb.home,
          tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: ckb.history,
          tabBarIcon: ({ color }) => <Text style={{ color }}>◷</Text>,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: ckb.leave,
          tabBarIcon: ({ color }) => <Text style={{ color }}>✈</Text>,
        }}
      />
      <Tabs.Screen
        name="salary"
        options={{
          title: ckb.salary,
          tabBarIcon: ({ color }) => <Text style={{ color }}>₪</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: ckb.notifications,
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#dc2626",
            color: "#fff",
            fontSize: 10,
            fontWeight: "700",
          },
          tabBarIcon: ({ color }) => <Text style={{ color }}>◉</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: ckb.profile,
          tabBarIcon: ({ color }) => <Text style={{ color }}>☺</Text>,
        }}
      />
    </Tabs>
  );
}
