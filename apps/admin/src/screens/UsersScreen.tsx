// Owner-only account administration. Editors never see this tab (the shell
// hides it) and the API would 403 them anyway. Destructive actions (disable,
// reset password) confirm first; disabling yourself is blocked client-side
// because the API rejects it with cannot_disable_self.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  createUser,
  disableUser,
  enableUser,
  listUsers,
  resetPassword,
  type AdminUser,
} from "../users";
import { ApiError } from "../api";
import { theme } from "../theme";
import { Btn, ConfirmDialog, LabeledInput, Toast, type ToastState } from "../ui";

export function UsersScreen({ currentUserId }: { currentUserId: string | null }) {
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("editor");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Disable confirm + reset-password modal state
  const [disabling, setDisabling] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setRows(null);
    listUsers()
      .then((list) => {
        if (alive) setRows(list);
      })
      .catch((err: unknown) => {
        if (alive)
          setError(
            err instanceof ApiError && err.status === 403
              ? "Only owners can manage users."
              : "Could not load users.",
          );
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  async function submitCreate() {
    if (creating) return;
    setCreateError(null);
    setCreating(true);
    try {
      await createUser({ email: email.trim(), password, role });
      setEmail("");
      setPassword("");
      setRole("editor");
      setReloadKey((k) => k + 1);
      setToast({ message: "Account created.", kind: "ok" });
    } catch (err) {
      setCreateError(createErrorText(err));
    } finally {
      setCreating(false);
    }
  }

  async function runAction(action: () => Promise<void>, done: string): Promise<void> {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await action();
      setReloadKey((k) => k + 1);
      setToast({ message: done, kind: "ok" });
    } catch (err) {
      setToast({ message: actionErrorText(err), kind: "error" });
    } finally {
      setActionBusy(false);
    }
  }

  function confirmReset(): void {
    if (!resetTarget) return;
    if (newPassword === "") {
      setToast({ message: "Enter a new password first.", kind: "error" });
      return;
    }
    const target = resetTarget;
    setResetTarget(null);
    setNewPassword("");
    void runAction(
      () => resetPassword(target.id, newPassword),
      `Password reset for ${target.email}.`,
    );
  }

  const currentId = currentUserId;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
      </View>

      <View style={styles.createCard}>
        <Text style={styles.cardTitle}>New account</Text>
        <LabeledInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="person@sarak.org"
          autoCapitalize="none"
        />
        <LabeledInput label="Password" value={password} onChangeText={setPassword} />
        <View style={styles.roleRow}>
          <Text style={styles.roleLabel}>Role</Text>
          {(["editor", "owner"] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[styles.roleChip, role === r && styles.roleChipActive]}
            >
              <Text style={role === r ? styles.roleTextActive : styles.roleText}>{r}</Text>
            </Pressable>
          ))}
        </View>
        {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
        <Btn
          label="Create user"
          variant="primary"
          busy={creating}
          onPress={() => void submitCreate()}
        />
      </View>

      <ScrollView style={styles.list}>
        {rows === null && !error ? (
          <ActivityIndicator color={theme.accent} style={styles.spinner} />
        ) : null}
        {error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error}</Text>
            <Pressable onPress={() => setReloadKey((k) => k + 1)}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {(rows ?? []).map((row) => {
          const self = row.id === currentId;
          const off = row.disabled_at !== null;
          return (
            <View key={row.id} style={styles.rowCard}>
              <View style={styles.rowMain}>
                <View style={styles.rowId}>
                  <Text style={styles.rowEmail} numberOfLines={1}>
                    {row.email}
                    {self ? " (you)" : ""}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[styles.badge, row.role === "owner" ? styles.badgeOwner : styles.badgeEditor]}
                    >
                      <Text
                        style={row.role === "owner" ? styles.badgeOwnerText : styles.badgeEditorText}
                      >
                        {row.role}
                      </Text>
                    </View>
                    <View style={[styles.badge, off ? styles.badgeOff : styles.badgeOn]}>
                      <Text style={off ? styles.badgeOffText : styles.badgeOnText}>
                        {off ? "disabled" : "active"}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.rowActions}>
                  {off ? (
                    <Btn
                      label="Enable"
                      disabled={actionBusy}
                      onPress={() => void runAction(() => enableUser(row.id), `${row.email} enabled.`)}
                    />
                  ) : (
                    <Btn
                      label="Disable"
                      variant="danger"
                      disabled={actionBusy || self}
                      onPress={() => setDisabling(row)}
                    />
                  )}
                  <Btn
                    label="Reset password"
                    disabled={actionBusy}
                    onPress={() => {
                      setResetTarget(row);
                      setNewPassword("");
                    }}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <ConfirmDialog
        visible={disabling !== null}
        title="Disable account?"
        message={`${disabling?.email ?? ""} will be unable to log in until re-enabled.`}
        confirmLabel="Disable"
        danger
        busy={actionBusy}
        onCancel={() => setDisabling(null)}
        onConfirm={() => {
          const target = disabling;
          setDisabling(null);
          if (target)
            void runAction(() => disableUser(target.id), `${target.email} disabled.`);
        }}
      />

      {resetTarget !== null ? (
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Reset password</Text>
            <Text style={styles.cardBody}>
              Sets a fresh password for {resetTarget.email} and signs out all its sessions.
            </Text>
            <LabeledInput label="New password" value={newPassword} onChangeText={setNewPassword} />
            <View style={styles.actionsRow}>
              <Btn label="Cancel" variant="ghost" onPress={() => setResetTarget(null)} />
              <Btn label="Reset" busy={actionBusy} onPress={confirmReset} />
            </View>
          </View>
        </View>
      ) : null}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </View>
  );
}

function createErrorText(err: unknown): string {
  if (!(err instanceof ApiError)) return "Network error. Check your connection.";
  switch (err.code) {
    case "network_error":
      return "Network error. Check your connection.";
    case "email_taken":
      return "That email already has an account.";
    case "invalid_role":
      return "Pick a valid role.";
    case "invalid_body":
      return "Email and password are required.";
    default:
      return `Could not create the account (${err.code}).`;
  }
}

function actionErrorText(err: unknown): string {
  if (!(err instanceof ApiError)) return "Network error. Check your connection.";
  switch (err.code) {
    case "network_error":
      return "Network error. Check your connection.";
    case "cannot_disable_self":
      return "You cannot disable your own account.";
    case "invalid_body":
      return "The new password was empty.";
    case "not_found":
      return "That account no longer exists.";
    default:
      return `Request failed (${err.code}).`;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { marginBottom: 12 },
  title: { color: theme.text, fontSize: 22, fontWeight: "700" },
  createCard: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
    gap: 12,
  },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: "700" },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleLabel: { color: theme.textDim, fontSize: 12.5 },
  roleChip: {
    borderColor: theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  roleText: { color: theme.textDim, fontSize: 12.5 },
  roleTextActive: { color: "#082f49", fontSize: 12.5, fontWeight: "700" },
  errorText: { color: theme.danger, fontSize: 12.5 },
  list: { flex: 1 },
  spinner: { marginTop: 48 },
  empty: { alignItems: "center", marginTop: 56, gap: 6 },
  emptyTitle: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
  retry: { color: theme.accent, fontSize: 13.5, fontWeight: "600", marginTop: 4 },
  rowCard: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 14,
  },
  rowMain: { gap: 10 },
  rowId: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowEmail: { color: theme.text, flexShrink: 1, fontSize: 15, fontWeight: "600" },
  badgeRow: { flexDirection: "row", gap: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeOwner: { backgroundColor: "#0c4a6e" },
  badgeOwnerText: { color: theme.accent, fontSize: 11, fontWeight: "700" },
  badgeEditor: { backgroundColor: theme.border },
  badgeEditorText: { color: theme.textDim, fontSize: 11, fontWeight: "700" },
  badgeOn: { backgroundColor: "#052e16" },
  badgeOnText: { color: theme.success, fontSize: 11, fontWeight: "700" },
  badgeOff: { backgroundColor: "#450a0a" },
  badgeOffText: { color: theme.danger, fontSize: 11, fontWeight: "700" },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 24,
    padding: 18,
    width: "100%",
    maxWidth: 420,
  },
  cardHeading: { color: theme.text, fontSize: 17, fontWeight: "700" },
  cardBody: { color: theme.textDim, fontSize: 13 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
});
