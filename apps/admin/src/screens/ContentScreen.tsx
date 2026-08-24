// Content manager landing: collection tabs, status filter chips, record list.
// Opens the editor (create or edit) in place; the list refetches when the
// editor reports changes or when filters change.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "../api";
import {
  COLLECTIONS,
  listContent,
  type CollectionName,
  type ContentRow,
  type StatusFilter,
} from "../content";
import { theme } from "../theme";
import { Btn, StatusBadge } from "../ui";
import { ContentEditor } from "./ContentEditor";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Published" },
  { key: "unpublished", label: "Unpublished" },
  { key: "trashed", label: "Trash" },
];

type EditorTarget = { id: string | null };

export function ContentScreen() {
  const [collectionName, setCollectionName] = useState<CollectionName>("activities");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<ContentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const collectionLabel =
    COLLECTIONS.find((c) => c.name === collectionName)?.label ?? collectionName;

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    listContent(collectionName, filter)
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Could not load ${collectionLabel.toLowerCase()} (${err.code}).`
            : "Network error. Check your connection.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [collectionName, filter, reloadKey, collectionLabel]);

  if (editing) {
    return (
      <ContentEditor
        name={collectionName}
        id={editing.id}
        onBack={(changed) => {
          setEditing(null);
          if (changed) setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Content</Text>
        <Btn label={`New ${collectionLabel}`} variant="primary" onPress={() => setEditing({ id: null })} />
      </View>

      <View style={styles.collectionTabs}>
        {COLLECTIONS.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => {
              setCollectionName(c.name);
              setFilter("all");
            }}
          >
            <Text style={c.name === collectionName ? styles.tabActive : styles.tab}>
              {c.label}
            </Text>
          </Pressable>
        ))}
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
              {filter === "trashed" ? "Trash is empty." : "Nothing here yet."}
            </Text>
            <Text style={styles.emptyBody}>
              {filter === "trashed"
                ? "Trashed items appear here until restored."
                : `Use “New ${collectionLabel}” to add the first one.`}
            </Text>
          </View>
        ) : null}
        {rows !== null && !error
          ? rows.map((row) => <ListRow key={row.id} row={row} onOpen={() => setEditing({ id: row.id })} />)
          : null}
      </ScrollView>
    </View>
  );
}

function ListRow({ row, onOpen }: { row: ContentRow; onOpen: () => void }) {
  const rawTitle = row.title;
  const title = typeof rawTitle === "string" && rawTitle.trim() !== "" ? rawTitle : row.slug;
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [listStyles.row, pressed && listStyles.rowPressed]}
    >
      <View style={listStyles.main}>
        <Text style={listStyles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={listStyles.slug} numberOfLines={1}>
          /{row.slug}
        </Text>
      </View>
      <View style={listStyles.side}>
        <StatusBadge status={row._status} />
        <Text style={listStyles.updated}>{formatUpdatedAt(row.updated_at)}</Text>
      </View>
    </Pressable>
  );
}

function formatUpdatedAt(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";
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
  collectionTabs: { flexDirection: "row", gap: 18, marginBottom: 10 },
  tab: { color: theme.textDim, fontSize: 14, fontWeight: "600" },
  tabActive: {
    borderBottomColor: theme.accent,
    color: theme.text,
    fontSize: 14,
    fontWeight: "700",
    paddingBottom: 3,
  },
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

const listStyles = StyleSheet.create({
  row: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: 14,
  },
  rowPressed: { opacity: 0.75 },
  main: { flex: 1, marginRight: 12, gap: 2 },
  title: { color: theme.text, fontSize: 15, fontWeight: "600" },
  slug: { color: theme.textDim, fontSize: 12.5 },
  side: { alignItems: "flex-end", gap: 6 },
  updated: { color: theme.textDim, fontSize: 11.5 },
});
