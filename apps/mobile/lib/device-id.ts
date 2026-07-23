import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "mo_emp_device_id";

export async function getOrCreateMobileDeviceId(): Promise<string> {
  try {
    let id = await SecureStore.getItemAsync(KEY);
    if (!id || id.length < 8) {
      id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      await SecureStore.setItemAsync(KEY, id);
    }
    return id;
  } catch {
    return `m-${Date.now()}`;
  }
}

export function getMobileDeviceLabel() {
  return Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android" : "Mobile";
}
