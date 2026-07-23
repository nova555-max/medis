import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type SalaryRow = {
  id: string;
  year: number;
  month: number;
  base_amount: number;
  allowances: number;
  deductions: number;
  net_amount: number;
  status: string;
  currency: string | null;
};

function formatMoney(amount: number, currency?: string | null) {
  const cur = currency === "USD" ? "USD" : "IQD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      maximumFractionDigits: cur === "IQD" ? 0 : 2,
    }).format(amount) + ` ${cur}`;
  } catch {
    return `${amount} ${cur}`;
  }
}

function statusLabel(status: string) {
  if (status === "paid") return "پارەدراو";
  if (status === "approved") return "پەسەندکراو";
  if (status === "draft") return "ڕەشنووس";
  return status;
}

export default function SalaryScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [baseSalary, setBaseSalary] = useState(0);
  const [currency, setCurrency] = useState("IQD");
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    const { data: emp } = await supabase
      .from("employees")
      .select("id, base_salary, currency")
      .eq("user_id", profile?.id || "")
      .maybeSingle();

    if (!emp) {
      setLoading(false);
      setMessage("کارمەند نەدۆزرایەوە");
      return;
    }

    setBaseSalary(Number(emp.base_salary || 0));
    setCurrency((emp as { currency?: string }).currency || "IQD");

    const { data } = await supabase
      .from("salaries")
      .select(
        "id, year, month, base_amount, allowances, deductions, net_amount, status, currency",
      )
      .eq("employee_id", emp.id)
      .in("status", ["paid", "approved"])
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12);

    setRows((data as SalaryRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (profile?.id) void load();
  }, [profile?.id]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 14 }}
    >
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 18,
        }}
      >
        <Text style={{ color: colors.muted, textAlign: "right" }}>{ckb.salary}</Text>
        <Text
          style={{
            color: colors.ink,
            fontSize: 22,
            fontWeight: "800",
            marginTop: 6,
            textAlign: "right",
          }}
        >
          {formatMoney(baseSalary, currency)}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 6, textAlign: "right", fontSize: 12 }}>
          مووچەی بنەڕەتی
        </Text>
      </View>

      <Pressable
        onPress={() => void load()}
        style={{
          alignSelf: "flex-end",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Text style={{ color: colors.brand, fontWeight: "600", fontSize: 12 }}>نوێکردنەوە</Text>
      </Pressable>

      {message ? (
        <Text style={{ color: colors.ink, textAlign: "center" }}>{message}</Text>
      ) : null}

      {rows.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 20,
          }}
        >
          <Text style={{ color: colors.muted, textAlign: "center" }}>هیچ مووچەیەک نییە</Text>
        </View>
      ) : (
        rows.map((s) => (
          <View
            key={s.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.line,
              padding: 16,
              gap: 6,
            }}
          >
            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }}>
                {s.month}/{s.year}
              </Text>
              <Text style={{ color: colors.brand, fontSize: 12 }}>{statusLabel(s.status)}</Text>
            </View>
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>
              بنەڕەت: {formatMoney(Number(s.base_amount), s.currency || currency)}
            </Text>
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>
              پاداشت: {formatMoney(Number(s.allowances), s.currency || currency)} · غەرامە:{" "}
              {formatMoney(Number(s.deductions), s.currency || currency)}
            </Text>
            <Text
              style={{
                color: colors.brand,
                fontWeight: "800",
                fontSize: 18,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {formatMoney(Number(s.net_amount), s.currency || currency)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
