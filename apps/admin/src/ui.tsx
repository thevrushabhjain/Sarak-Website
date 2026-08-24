// Small shared UI pieces for the content screens: status badge, buttons,
// labeled inputs, confirm dialog, toast. StyleSheet + RN primitives only.
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ContentStatus } from "./content";
import { theme } from "./theme";

const STATUS_STYLE: Record<ContentStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#334155", fg: "#e2e8f0", label: "Draft" },
  published: { bg: "#052e16", fg: theme.success, label: "Published" },
  unpublished: { bg: "#451a03", fg: theme.warn, label: "Unpublished" },
  trashed: { bg: "#450a0a", fg: theme.danger, label: "Trashed" },
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[badgeStyles.pill, { backgroundColor: s.bg }]}>
      <Text style={[badgeStyles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

type BtnVariant = "default" | "primary" | "danger" | "ghost";

const BTN_VARIANTS: Record<BtnVariant, { btn: object; text: object }> = {
  default: { btn: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, text: { color: theme.text } },
  primary: { btn: { backgroundColor: theme.accent }, text: { color: "#082f49", fontWeight: "700" } },
  danger: { btn: { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.danger }, text: { color: theme.danger } },
  ghost: { btn: { backgroundColor: "transparent" }, text: { color: theme.textDim } },
};

export function Btn({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = "default",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: BtnVariant;
}) {
  const v = BTN_VARIANTS[variant];
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        btnStyles.base,
        v.btn,
        (disabled || busy) && btnStyles.dimmed,
        pressed && !(disabled || busy) && btnStyles.pressed,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={theme.text} /> : null}
      <Text style={[btnStyles.label, v.text]}>{label}</Text>
    </Pressable>
  );
}

export function LabeledInput({
  label,
  value,
  onChangeText,
  multiline = false,
  editable = true,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  editable?: boolean;
  hint?: string;
  error?: string | null;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        placeholderTextColor={theme.border}
        style={[
          fieldStyles.input,
          multiline && fieldStyles.inputMultiline,
          !editable && fieldStyles.inputLocked,
        ]}
      />
      {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={overlayStyles.backdrop}>
      <View style={overlayStyles.card}>
        <Text style={overlayStyles.title}>{title}</Text>
        <Text style={overlayStyles.body}>{message}</Text>
        <View style={overlayStyles.actions}>
          <Btn label="Cancel" variant="ghost" onPress={onCancel} disabled={busy} />
          <Btn
            label={confirmLabel}
            variant={danger ? "danger" : "primary"}
            busy={busy}
            onPress={onConfirm}
          />
        </View>
      </View>
    </View>
  );
}

export type ToastState = { message: string; kind: "ok" | "error" } | null;

export function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[toastStyles.banner, toast.kind === "error" && toastStyles.error]}>
      <Text style={toastStyles.text}>{toast.message}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
});

const btnStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pressed: { opacity: 0.85 },
  dimmed: { opacity: 0.5 },
  label: { fontSize: 13.5 },
});

const fieldStyles = StyleSheet.create({
  wrap: { gap: 5 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
  input: {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: theme.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  inputLocked: { opacity: 0.6 },
  hint: { color: theme.textDim, fontSize: 11.5 },
  error: { color: theme.danger, fontSize: 12 },
});

const overlayStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    justifyContent: "center",
    zIndex: 30,
    padding: 24,
  },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 420,
    padding: 20,
    width: "100%",
    gap: 10,
  },
  title: { color: theme.text, fontSize: 16, fontWeight: "700" },
  body: { color: theme.textDim, fontSize: 13.5, lineHeight: 19 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 6 },
});

const toastStyles = StyleSheet.create({
  banner: {
    backgroundColor: "#065f46",
    borderRadius: 10,
    bottom: 24,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 24,
    zIndex: 40,
  },
  error: { backgroundColor: "#7f1d1d" },
  text: { color: theme.text, fontSize: 13.5 },
});
