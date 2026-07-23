import { Tabs, Redirect } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const { colors } = useTheme();

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
