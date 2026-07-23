import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { useTheme } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn, session, profile, loading } = useAuth();
  const { colors } = useTheme();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!loading && session && profile?.role === "employee") {
    return <Redirect href="/(tabs)" />;
  }

  async function onSubmit() {
    setPending(true);
    setError(null);
    const id = loginId.trim();
    const email = id.includes("@")
      ? id
      : `${id}@emp.mediaoffice.local`;
    const err = await signIn(email, password);
    if (err) setError(err);
    setPending(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" }}
    >
      <View style={{ marginBottom: 28, alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: colors.brand,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>م</Text>
        </View>
        <Text style={{ color: colors.ink, fontSize: 28, fontWeight: "800" }}>{ckb.appName}</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>{ckb.tagline}</Text>
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 20,
          gap: 14,
        }}
      >
        {error ? (
          <Text style={{ color: colors.danger, textAlign: "right" }}>{error}</Text>
        ) : null}

        <View>
          <Text style={{ color: colors.ink, marginBottom: 6, textAlign: "right" }}>
            ئایدی کارمەند
          </Text>
          <TextInput
            value={loginId}
            onChangeText={setLoginId}
            autoCapitalize="none"
            keyboardType="number-pad"
            maxLength={64}
            placeholder="##########"
            placeholderTextColor={colors.muted}
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.ink,
              textAlign: "left",
              writingDirection: "ltr",
              letterSpacing: 2,
            }}
          />
        </View>

        <View>
          <Text style={{ color: colors.ink, marginBottom: 6, textAlign: "right" }}>{ckb.password}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.ink,
              textAlign: "left",
              writingDirection: "ltr",
            }}
          />
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={pending}
          style={{
            backgroundColor: colors.brand,
            borderRadius: 14,
            paddingVertical: 14,
            opacity: pending ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
            {pending ? ckb.loading : ckb.login}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
