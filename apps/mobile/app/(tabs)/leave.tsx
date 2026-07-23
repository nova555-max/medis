import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type LeaveType = { id: string; name_ckb: string };
type LeaveRow = {
  id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  reason: string | null;
  leave_types: { name_ckb: string } | null;
};

export default function LeaveScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: emp } = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("user_id", profile?.id || "")
      .maybeSingle();
    if (!emp) {
      setLoading(false);
      return;
    }
    setEmployeeId(emp.id);
    setCompanyId(emp.company_id);

    const [{ data: t }, { data: r }] = await Promise.all([
      supabase
        .from("leave_types")
        .select("id, name_ckb")
        .eq("company_id", emp.company_id)
        .eq("is_active", true),
      supabase
        .from("leave_requests")
        .select("id, start_date, end_date, days_count, status, reason, leave_types(name_ckb)")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setTypes((t as LeaveType[]) || []);
    if (t?.[0]) setLeaveTypeId(t[0].id);
    setRows((r as unknown as LeaveRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (profile?.id) void load();
  }, [profile?.id]);

  async function submit() {
    if (!employeeId || !companyId || !leaveTypeId || !startDate || !endDate) {
      setMessage("تکایە هەموو خانەکان پڕبکەرەوە");
      return;
    }
    setBusy(true);
    setMessage(null);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days < 1) {
      setMessage("بەروارەکان نادروستن");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("leave_requests").insert({
      company_id: companyId,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      reason: reason || null,
      status: "pending",
    });

    if (error) setMessage("ناردن سەرنەکەوت");
    else {
      setMessage("داواکاری نێردرا");
      setReason("");
      await load();
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 14,
          gap: 10,
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "right" }}>
          داواکاری مۆڵەتی نوێ
        </Text>

        <Text style={{ color: colors.muted, textAlign: "right" }}>جۆری مۆڵەت</Text>
        <View style={{ gap: 6 }}>
          {types.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setLeaveTypeId(t.id)}
              style={{
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: leaveTypeId === t.id ? colors.brand : colors.line,
                backgroundColor: leaveTypeId === t.id ? colors.brandSoft : colors.card,
              }}
            >
              <Text style={{ color: colors.ink, textAlign: "right" }}>{t.name_ckb}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: colors.muted, textAlign: "right" }}>لە (YYYY-MM-DD)</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-07-16"
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 12,
            padding: 10,
            color: colors.ink,
            textAlign: "left",
          }}
        />
        <Text style={{ color: colors.muted, textAlign: "right" }}>تا</Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-07-16"
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 12,
            padding: 10,
            color: colors.ink,
            textAlign: "left",
          }}
        />
        <Text style={{ color: colors.muted, textAlign: "right" }}>هۆکار</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 12,
            padding: 10,
            color: colors.ink,
            textAlign: "right",
          }}
        />

        <Pressable
          onPress={submit}
          disabled={busy}
          style={{
            backgroundColor: colors.brand,
            borderRadius: 12,
            padding: 14,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
            {busy ? ckb.loading : "ناردن"}
          </Text>
        </Pressable>
        {message && <Text style={{ color: colors.ink, textAlign: "center" }}>{message}</Text>}
      </View>

      {rows.map((r) => (
        <View
          key={r.id}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 14,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "right" }}>
            {r.leave_types?.name_ckb || ckb.leave}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4, textAlign: "right" }}>
            {r.start_date} → {r.end_date} · {r.status}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
