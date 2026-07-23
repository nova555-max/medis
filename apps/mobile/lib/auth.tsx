import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import {
  getMobileDeviceLabel,
  getOrCreateMobileDeviceId,
} from "@/lib/device-id";

type Profile = {
  id: string;
  company_id: string;
  role: "admin" | "employee";
  full_name: string;
  is_active: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function registerExpoPushToken(userId: string) {
  try {
    // Optional: skip on web / missing native module
    if (Platform.OS === "web") return;

    const Notifications = await import("expo-notifications");
    const Constants = await import("expo-constants");

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const projectId =
      Constants.default?.easConfig?.projectId ||
      Constants.default?.expoConfig?.extra?.eas?.projectId;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResult?.data;
    if (!token) return;

    await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userId);
  } catch {
    // expo-notifications may be unavailable in some builds — ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_id, role, full_name, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      return null;
    }

    setProfile(data as Profile);
    return data as Profile;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        loadProfile(next.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error || !data.user) {
          return "ئایدی یان وشەی نهێنی هەڵەیە.";
        }
        const p = await loadProfile(data.user.id);
        if (!p || p.role !== "employee" || !p.is_active) {
          await supabase.auth.signOut();
          setProfile(null);
          return "ئەم ئەپە تەنها بۆ کارمەندانە. بەڕێوەبەران پانێڵی وێب بەکاربهێنن.";
        }

        const deviceId = await getOrCreateMobileDeviceId();
        const { data: deviceResult, error: deviceError } = await supabase.rpc(
          "employee_register_device",
          {
            p_device_id: deviceId,
            p_device_label: getMobileDeviceLabel(),
          },
        );

        if (deviceError) {
          await supabase.auth.signOut();
          setProfile(null);
          return "پشکنینی مۆبایل سەرنەکەوت.";
        }

        const result = deviceResult as { ok?: boolean } | null;
        if (!result?.ok) {
          await supabase.auth.signOut();
          setProfile(null);
          return "ئەم مۆبایلە تۆمار نەکراوە. داواکاری بۆ ئەدمین نێردرا — دوای پەسەندکردن دووبارە هەوڵ بدە.";
        }

        void registerExpoPushToken(data.user.id);

        return null;
      },
      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
