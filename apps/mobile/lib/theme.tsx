import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { Appearance, ColorSchemeName } from "react-native";

type ThemeMode = "light" | "dark" | "system";

const palette = {
  light: {
    bg: "#F5F8F8",
    card: "#FFFFFF",
    ink: "#0F2322",
    muted: "#4B6361",
    line: "#D2DEDC",
    brand: "#287570",
    brandSoft: "#D5EFEC",
    danger: "#B42318",
  },
  dark: {
    bg: "#0A1414",
    card: "#162423",
    ink: "#ECF5F4",
    muted: "#9CB2AF",
    line: "#283A38",
    brand: "#4EADA5",
    brandSoft: "#1F403E",
    danger: "#F97066",
  },
};

type Colors = (typeof palette)["light"];

const ThemeContext = createContext<{
  colors: Colors;
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [system, setSystem] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    return () => sub.remove();
  }, []);

  const resolved = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const colors = palette[resolved];

  const value = useMemo(
    () => ({ colors, mode, resolved, setMode }),
    [colors, mode, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
