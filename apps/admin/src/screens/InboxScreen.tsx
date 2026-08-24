// Inbox: enquiries and registrations submitted through the public site. Tabs
// carry live unread badges from the API's x-unread-count header; rows render
// the stored payload as key/value lines with mark-read and soft-delete
// actions. Owners additionally get a hard purge of already-trashed rows.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  deleteInboxRow,
  listInbox,
  markInboxRead,
  purgeTrashed,
  type InboxKind,
  type InboxRow,
} from "../inbox";
import type { User } from "../config";
import { theme } from "../theme";
import { Btn, ConfirmDialog, Toast, type ToastState } from "../ui";
import { formatTimestamp } from "./format";

type Bucket = { rows: InboxRow[]; unread: number };

export function InboxScreen({ user }: { user: User }) {
  const [kind, setKind] = useState<InboxKind>("enquiry");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [buckets, setBuckets] = useState<Record<InboxKind, Bucket | null>>({
    enquiry: null,
    registration: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [deleting, setDeleting] = useState<InboxRow | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Both tabs need an unread count for their badges, so every pass loads both
  // kinds in parallel; the visible one renders its full list.
  useEffect(() => {
    let alive = true;
    setError(null);
    setBuckets({ enquiry: null, registration: null });
    Promise.all([listInbox("enquiry", unreadOnly), listInbox("registration", unreadOnly)])
      .then(([enquiry, registration]) => {
        if (alive) setBuckets({ enquiry, registration });
      })
      .catch(() => {
        if (alive) setError("Could not load the inbox.");
      });
    return () => {
      alive = false;
    };
  }, [unreadOnly, reloadKey]);

  function refresh(): void {
    setReloadKey((k) => k + 1);
  }

  async function runRow(id: string, action: () => Promise<void>, done: string): Promise<void> {
    setBusyId(id);
    try {
      await action();
      setToast({ message: done, kind: "ok" });
      refresh();
    } catch {
      setToast({ message: "Network error. Check your connection.", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function runPurge(): Promise<void> {
    if (purging) return;
    setPurging(true);
    setConfirmingPurge(false);
    try {
      const { deleted } = await purgeTrashed(kind);
      setToast({
        message:
          deleted === 1 ? "Purged 1 trashed submission." : `Purged ${deleted} trashed submissions.`,
        kind: "ok",
      });
      refresh();
    } catch {
      setToast({ message: "Could not purge trashed submissions.", kind: "error" });
    } finally {
      setPurging(false);
    }
  }

  const current = buckets[kind];
  const isOwner = user.role === "owner";

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        {isOwner ? (
          <Btn
            label="Purge trashed"
            variant="danger"
            disabled={purging}
            onPress={() => setConfirmingPurge(true)}
          />
        ) : null}
      </View>

      <View style={styles.kindTabs}>
        {(["enquiry", "registration"] as const).map((k) => {
          const unread = buckets[k]?.unread ?? 0;
          return (
            <Pressable key={k} style={styles.kindTab} onPress={() => setKind(k)}>
              <Text style={k === kind ? styles.kindTabActive : styles.kindTabText}>
                {k === "enquiry" ? "Enquiries" : "Registrations"}
              </Text>
              {unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setUnreadOnly((v) => !v)}
          style={[styles.chip, unreadOnly && styles.chipActive]}
        >
          <Text style={unreadOnly ? styles.chipTextActive : styles.chipText}>Unread only</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list}>
        {current === null && !error ? (
          <ActivityIndicator color={theme.accent} style={styles.spinner} />
        ) : null}
        {error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error}</Text>
            <Pressable onPress={refresh}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {current !== null && !error && current.rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {unreadOnly ? "No unread submissions." : "Nothing here yet."}
            </Text>
            <Text style={styles.emptyBody}>
              {kind === "enquiry"
                ? "Enquiries sent through the site's contact form land here."
                : "Program registrations land here."}
            </Text>
          </View>
        ) : null}
        {(current?.rows ?? []).map((row) => (
          <SubmissionCard
            key={row.id}
            row={row}
            busy={busyId === row.id}
            onMarkRead={() => void runRow(row.id, () => markInboxRead(row.id), "Marked as read.")}
            onDelete={() => setDeleting(row)}
          />
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete submission?"
        message="It moves to the trash and can be purged later by an owner."
        confirmLabel="Delete"
        danger
        busy={busyId !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void runRow(target.id, () => deleteInboxRow(target.id), "Moved to trash.");
        }}
      />

      <ConfirmDialog
        visible={confirmingPurge}
        title={`Permanently delete trashed ${kind === "enquiry" ? "enquiries" : "registrations"}?`}
        message="This cannot be undone."
        confirmLabel="Purge"
        danger
        busy={purging}
        onCancel={() => setConfirmingPurge(false)}
        onConfirm={() => void runPurge()}
      />

      <Toast toast={toast} onDone={() => setToast(null)} />
    </View>
  );
}

function SubmissionCard({
  row,
  busy,
  onMarkRead,
  onDelete,
}: {
  row: InboxRow;
  busy: boolean;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const entries = Object.entries(row.payload).filter(([, v]) => v !== "" && v != null);
  return (
    <View
      style={[
        cardStyles.card,
        row.read_at === null && cardStyles.cardUnread,
      ]}
    >
      <View style={cardStyles.head}>
        {row.read_at === null ? (
          <View style={cardStyles.newBadge}>
            <Text style={cardStyles.newBadgeText}>NEW</Text>
          </View>
        ) : null}
        <Text style={cardStyles.when}>{formatTimestamp(row.created_at)}</Text>
      </View>
      <View style={cardStyles.payload}>
        {entries.map(([key, value]) => (
          <View key={key} style={cardStyles.payloadRow}>
            <Text style={cardStyles.payloadKey}>{key.replace(/_/g, " ")}</Text>
            <Text style={cardStyles.payloadValue}>{String(value)}</Text>
          </View>
        ))}
      </View>
      <View style={cardStyles.actions}>
        {row.read_at === null ? (
          <Btn label="Mark read" disabled={busy} onPress={onMarkRead} />
        ) : (
          <Btn label="Read" variant="ghost" disabled onPress={onMarkRead} />
        )}
        <Btn label="Delete" variant="danger" disabled={busy} onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { color: theme.text, fontSize: 22, fontWeight: "700" },
  kindTabs: { alignItems: "center", flexDirection: "row", gap: 18, marginBottom: 12 },
  kindTab: { alignItems: "center", flexDirection: "row", gap: 6 },
  kindTabText: { color: theme.textDim, fontSize: 14, fontWeight: "600" },
  kindTabActive: {
    borderBottomColor: theme.accent,
    color: theme.text,
    fontSize: 14,
    fontWeight: "700",
    paddingBottom: 3,
  },
  unreadBadge: {
    backgroundColor: theme.danger,
    borderRadius: 999,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  chip: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 12.5 },
  chipTextActive: { color: "#082f49", fontSize: 12.5, fontWeight: "700" },
  list: { flex: 1 },
  spinner: { marginTop: 48 },
  empty: { alignItems: "center", gap: 6, marginTop: 56, paddingHorizontal: 32 },
  emptyTitle: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
  emptyBody: { color: theme.textDim, fontSize: 13, textAlign: "center" },
  retry: { color: theme.accent, fontSize: 13.5, fontWeight: "600", marginTop: 4 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 14,
    gap: 10,
  },
  cardUnread: { borderColor: theme.accent },
  head: { alignItems: "center", flexDirection: "row", gap: 8 },
  newBadge: {
    backgroundColor: theme.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { color: "#082f49", fontSize: 10.5, fontWeight: "800" },
  when: { color: theme.textDim, fontSize: 12 },
  payload: { gap: 4 },
  payloadRow: { flexDirection: "row", gap: 8 },
  payloadKey: {
    color: theme.textDim,
    fontSize: 13,
    minWidth: 90,
    textTransform: "capitalize",
  },
  payloadValue: { color: theme.text, flex: 1, fontSize: 13, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 10 },
});
