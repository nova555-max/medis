import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { useTheme } from "@/lib/theme";

export default function ProfileScreen() {
  const { colors, resolved, setMode } = useTheme();
  const { profile, signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 14 }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 20,
        }}
      >
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "800", textAlign: "right" }}>
          {profile?.full_name}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 6, textAlign: "right" }}>{ckb.profile}</Text>
      </View>

      <Pressable
        onPress={() => setMode(resolved === "dark" ? "light" : "dark")}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 16,
        }}
      >
        <Text style={{ color: colors.ink, textAlign: "right", fontWeight: "600" }}>
          {resolved === "dark" ? ckb.lightMode : ckb.darkMode}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => signOut()}
        style={{
          backgroundColor: colors.danger,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>{ckb.logout}</Text>
      </Pressable>
    </View>
  );
}
