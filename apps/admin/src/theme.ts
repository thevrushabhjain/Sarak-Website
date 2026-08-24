import { StyleSheet } from "react-native";

// Dark, system-font theme; no UI kit on purpose.
export const theme = {
  bg: "#0f172a",
  surface: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  textDim: "#94a3b8",
  accent: "#38bdf8",
  danger: "#f87171",
};

export const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
});
