import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type Row = {
  id: string;
  work_date: string;
  status: string;
  worked_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  check_in_at: string | null;
  check_out_at: string | null;
};

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", profile?.id || "")
        .maybeSingle();
      if (!emp) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("attendance_records")
        .select(
          "id, work_date, status, worked_minutes, late_minutes, overtime_minutes, check_in_at, check_out_at",
        )
        .eq("employee_id", emp.id)
        .order("work_date", { ascending: false })
        .limit(60);
      setRows((data as Row[]) || []);
      setLoading(false);
    }
    if (profile?.id) void load();
  }, [profile?.id]);

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
            هیچ تۆمارێک نییە
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.line,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "right" }}>
              {item.work_date}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4, textAlign: "right" }}>
              {item.status} · {item.worked_minutes || 0} خولەک · دواکەوتن {item.late_minutes || 0}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
