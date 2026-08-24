// Forms landing: filter chips, form list, and hand-off into the builder
// editor. Mirrors the Content screen structure (chips, rows, empty states).
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "../api";
import { listForms, type FormFilter, type FormRow } from "../forms";
import { theme } from "../theme";
import { Btn, StatusBadge } from "../ui";
import { formatTimestamp } from "./format";
import { FormEditor } from "./FormEditor";

const FILTERS: { key: FormFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Published" },
  { key: "trashed", label: "Trash" },
];

export function FormsScreen() {
  const [filter, setFilter] = useState<FormFilter>("all");
  const [rows, setRows] = useState<FormRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(null);
    setRows(null);
    listForms(filter)
      .then((list) => {
        if (alive) setRows(list);
      })
      .catch(() => {
        if (alive) setError("Could not load forms.");
      });
    return () => {
      alive = false;
    };
  }, [filter, reloadKey]);

  if (creating || editingId !== null) {
    return (
      <FormEditor
        formId={editingId}
        onBack={() => {
          setCreating(false);
          setEditingId(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Forms</Text>
        <Btn label="New form" variant="primary" onPress={() => setCreating(true)} />
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, f.key === filter && styles.chipActive]}
          >
            <Text style={f.key === filter ? styles.chipTextActive : styles.chipText}>
              {f.label}
            </Text>
          </Pressable>
        ))}
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
        {rows !== null && !error && rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {filter === "trashed" ? "Trash is empty." : "No forms yet."}
            </Text>
            <Text style={styles.emptyBody}>
              {filter === "trashed"
                ? "Trashed forms appear here."
                : "Use “New form” to build the first one."}
            </Text>
          </View>
        ) : null}
        {(rows ?? []).map((row) => (
          <Pressable
            key={row.id}
            onPress={() => setEditingId(row.id)}
            style={({ pressed }) => [rowStyles.row, pressed && rowStyles.rowPressed]}
          >
            <View style={rowStyles.main}>
              <Text style={rowStyles.name} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={rowStyles.meta} numberOfLines={1}>
                {row.fields.length} field{row.fields.length === 1 ? "" : "s"} · updated{" "}
                {formatTimestamp(row.updated_at)}
              </Text>
            </View>
            <StatusBadge status={row.status} />
          </Pressable>
        ))}
      </ScrollView>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 12.5 },
  chipTextActive: { color: "#082f49", fontSize: 12.5, fontWeight: "700" },
  list: { flex: 1 },
  spinner: { marginTop: 48 },
  empty: { alignItems: "center", marginTop: 56, gap: 6 },
  emptyTitle: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
  emptyBody: { color: theme.textDim, fontSize: 13 },
  retry: { color: theme.accent, fontSize: 13.5, fontWeight: "600", marginTop: 4 },
});

const rowStyles = StyleSheet.create({
  row: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    padding: 14,
  },
  rowPressed: { opacity: 0.75 },
  main: { flex: 1, marginRight: 12, gap: 2 },
  name: { color: theme.text, fontSize: 15, fontWeight: "600" },
  meta: { color: theme.textDim, fontSize: 12.5 },
});
