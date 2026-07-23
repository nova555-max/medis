import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { ckb } from "@/lib/ckb";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type TodayRecord = {
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  worked_minutes: number;
  late_minutes: number;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [onlineActivity, setOnlineActivity] = useState("working");
  const [qrRequired, setQrRequired] = useState(false);
  const [selfieRequired, setSelfieRequired] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [takingSelfie, setTakingSelfie] = useState(false);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const selfieCamRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  async function loadToday() {
    setLoading(true);
    const { data: emp } = await supabase
      .from("employees")
      .select("id, gps_enabled, employee_type, company_id")
      .eq("user_id", profile?.id || "")
      .maybeSingle();

    setGpsEnabled(Boolean(emp?.gps_enabled));
    setIsOnline(
      (emp as { employee_type?: string } | null)?.employee_type === "online",
    );
    setCompanyId(emp?.company_id || null);

    if (emp?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("qr_required, selfie_required")
        .eq("id", emp.company_id)
        .maybeSingle();
      setQrRequired(Boolean(company?.qr_required));
      setSelfieRequired(Boolean(company?.selfie_required));
    }

    if (emp?.id) {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("attendance_records")
        .select(
          "check_in_at, check_out_at, status, worked_minutes, late_minutes",
        )
        .eq("employee_id", emp.id)
        .eq("work_date", today)
        .maybeSingle();
      setRecord(data as TodayRecord | null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (profile?.id) void loadToday();
  }, [profile?.id]);

  async function getCoords() {
    if (!gpsEnabled && !isOnline) {
      return { lat: null as number | null, lng: null as number | null };
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("مۆڵەتی GPS پێویستە");
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async function pushLiveLocation() {
    if (!isOnline && !gpsEnabled) return;
    try {
      const { lat, lng } = await getCoords();
      if (lat == null || lng == null) return;
      await supabase.rpc("employee_update_location", {
        p_lat: lat,
        p_lng: lng,
        p_activity: isOnline ? onlineActivity : null,
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if ((!isOnline && !gpsEnabled) || !profile?.id) return;
    void pushLiveLocation();
    const id = setInterval(() => void pushLiveLocation(), 60_000);
    return () => clearInterval(id);
  }, [isOnline, gpsEnabled, profile?.id, onlineActivity]);

  async function uploadSelfieUri(uri: string) {
    if (!companyId || !profile?.id) throw new Error("پڕۆفایل نەدۆزرایەوە");
    const res = await fetch(uri);
    const blob = await res.blob();
    const path = `${companyId}/${profile.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("selfies").upload(path, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error("بارکردنی selfie سەرنەکەوت");
    return path;
  }

  async function captureSelfie() {
    const cam = selfieCamRef.current;
    if (!cam) return;
    try {
      const photo = await cam.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error("وێنە نەگیرا");
      const path = await uploadSelfieUri(photo.uri);
      setSelfiePath(path);
      setTakingSelfie(false);
      setMessage("Selfie پاشەکەوتکرا");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "هەڵەی selfie");
    }
  }

  async function onCheckIn() {
    setBusy(true);
    setMessage(null);
    try {
      if (qrRequired && !qrToken.trim()) {
        throw new Error("کۆدی QR پێویستە — سکان بکە");
      }
      if (selfieRequired && !selfiePath) {
        throw new Error("وێنەی selfie پێویستە — دوگمەی selfie دابگرە");
      }
      const { lat, lng } = await getCoords();
      const { error } = await supabase.rpc("employee_check_in", {
        p_lat: lat,
        p_lng: lng,
        p_qr_token: qrToken.trim() || null,
        p_device_info: { platform: "mobile" },
        p_selfie_path: selfiePath,
      });
      if (error) throw new Error(mapError(error.message));
      setMessage("چک-ئین سەرکەوتوو بوو");
      setSelfiePath(null);
      await loadToday();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "هەڵە ڕوویدا");
    } finally {
      setBusy(false);
    }
  }

  async function onCheckOut() {
    setBusy(true);
    setMessage(null);
    try {
      const { lat, lng } = await getCoords();
      const { error } = await supabase.rpc("employee_check_out", {
        p_lat: lat,
        p_lng: lng,
        p_device_info: { platform: "mobile" },
      });
      if (error) throw new Error(mapError(error.message));
      setMessage("چک-ئاوت سەرکەوتوو بوو");
      await loadToday();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "هەڵە ڕوویدا");
    } finally {
      setBusy(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setMessage("مۆڵەتی کامێرا پێویستە بۆ سکان");
        return;
      }
    }
    setScanning(true);
  }

  async function openSelfie() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setMessage("مۆڵەتی کامێرا پێویستە بۆ selfie");
        return;
      }
    }
    setTakingSelfie(true);
  }

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

  const checkedIn = Boolean(record?.check_in_at);
  const checkedOut = Boolean(record?.check_out_at);

  if (takingSelfie) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={selfieCamRef} style={{ flex: 1 }} facing="front" />
        <Pressable
          onPress={captureSelfie}
          style={{
            position: "absolute",
            bottom: 40,
            alignSelf: "center",
            backgroundColor: colors.brand,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>گرتنی وێنە</Text>
        </Pressable>
        <Pressable
          onPress={() => setTakingSelfie(false)}
          style={{ position: "absolute", top: 50, right: 20 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>داخستن</Text>
        </Pressable>
      </View>
    );
  }

  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            setQrToken(data);
            setScanning(false);
            setMessage("کۆدی QR خوێندرایەوە");
          }}
        />
        <Pressable
          onPress={() => setScanning(false)}
          style={{
            position: "absolute",
            bottom: 40,
            alignSelf: "center",
            backgroundColor: colors.brand,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>داخستن</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 16 }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 20,
        }}
      >
        <Text style={{ color: colors.muted, textAlign: "right" }}>
          {ckb.todayStatus}
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontSize: 22,
            fontWeight: "800",
            marginTop: 8,
            textAlign: "right",
          }}
        >
          {profile?.full_name}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 8, textAlign: "right" }}>
          {!checkedIn
            ? ckb.notCheckedIn
            : checkedOut
              ? `تەواو · ${record?.worked_minutes || 0} خولەک`
              : `چک-ئین کرا · ${record?.status}`}
        </Text>
      </View>

      {isOnline ? (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 16,
            gap: 10,
          }}
        >
          <Text
            style={{ color: colors.ink, fontWeight: "700", textAlign: "right" }}
          >
            چالاکی ئێستا
          </Text>
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}
          >
            {(
              [
                ["working", "لە کاردا"],
                ["meeting", "کۆبوونەوە"],
                ["break", "پشوو"],
                ["field", "دەرەوە"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setOnlineActivity(value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor:
                    onlineActivity === value ? colors.brand : colors.bg,
                }}
              >
                <Text
                  style={{
                    color: onlineActivity === value ? "#fff" : colors.ink,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {!checkedIn && qrRequired && (
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
          <Text
            style={{ color: colors.ink, textAlign: "right", fontWeight: "600" }}
          >
            کۆدی QR
          </Text>
          <TextInput
            value={qrToken}
            onChangeText={setQrToken}
            placeholder="سکان بکە یان بنووسە"
            placeholderTextColor={colors.muted}
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 12,
              padding: 12,
              color: colors.ink,
              textAlign: "left",
            }}
          />
          <Pressable
            onPress={openScanner}
            style={{
              backgroundColor: colors.brand,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>سکانکردنی QR</Text>
          </Pressable>
        </View>
      )}

      {!checkedIn && selfieRequired && (
        <Pressable
          onPress={openSelfie}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: selfiePath ? "#16a34a" : colors.line,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: "700" }}>
            {selfiePath ? "✓ Selfie ئامادەیە" : "گرتنی Selfie"}
          </Text>
        </Pressable>
      )}

      {!checkedIn && (
        <Pressable
          onPress={onCheckIn}
          disabled={busy}
          style={{
            backgroundColor: colors.brand,
            borderRadius: 20,
            paddingVertical: 28,
            alignItems: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>
            {busy ? ckb.loading : ckb.checkIn}
          </Text>
        </Pressable>
      )}

      {checkedIn && !checkedOut && (
        <Pressable
          onPress={onCheckOut}
          disabled={busy}
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.line,
            paddingVertical: 22,
            alignItems: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "700" }}>
            {busy ? ckb.loading : ckb.checkOut}
          </Text>
        </Pressable>
      )}

      {message ? (
        <Text style={{ color: colors.ink, textAlign: "center" }}>{message}</Text>
      ) : null}
    </View>
  );
}

function mapError(msg: string) {
  if (msg.includes("already checked in")) return "پێشتر چک-ئینت کردووە";
  if (msg.includes("already checked out")) return "پێشتر چک-ئاوتت کردووە";
  if (msg.includes("not checked in")) return "سەرەتا چک-ئین بکە";
  if (msg.includes("gps closed")) return "لە دەرەوەی کاتی دەوام GPS داخراوە";
  if (msg.includes("outside gps radius"))
    return "لە دەرەوەی بازنەی شوێنی کاریت — بۆ هاتن/چوون بچۆ ناو بازنەکە";
  if (msg.includes("gps required")) return "GPS پێویستە";
  if (msg.includes("employee gps location not set"))
    return "شوێنی GPS دیاری نەکراوە — لە ئەدمین بپرسە";
  if (msg.includes("on leave")) return "ئەمڕۆ مۆڵەتت هەیە";
  if (msg.includes("friday off") || msg.includes("weekly off"))
    return "ئەمڕۆ پشووی هەفتانەیە — چک-ئین ناکرێت";
  if (msg.includes("friday")) return "ئەمڕۆ هەینییە — پشوو";
  if (msg.includes("holiday")) return "ئەمڕۆ پشووە";
  if (msg.includes("qr required")) return "کۆدی QR پێویستە";
  if (msg.includes("invalid qr")) return "کۆدی QR نادروستە";
  if (msg.includes("selfie required")) return "Selfie پێویستە";
  return msg;
}
