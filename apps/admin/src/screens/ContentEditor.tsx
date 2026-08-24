// Record editor: all collection fields, slug handling (editable only on
// create), lifecycle actions per status (Save Draft / Publish / Unpublish /
// Trash / Restore) and a revisions side panel (list → preview JSON → restore
// as draft). Every mutation drives a busy flag plus success/error toast; the
// server's 409 codes surface inline (slug_taken under the slug field,
// invalid_state above the action bar with an automatic row resync).
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ApiError,
  COLLECTIONS,
  createContent,
  getContent,
  getRevision,
  listRevisions,
  publishContent,
  restoreContent,
  restoreRevision,
  trashContent,
  unpublishContent,
  updateContent,
  type CollectionName,
  type ContentRow,
  type ContentStatus,
  type Revision,
  type RevisionSummary,
} from "../content";
import { theme } from "../theme";
import { Btn, ConfirmDialog, LabeledInput, StatusBadge, Toast, type ToastState } from "../ui";

type ConfirmRequest = { kind: "publish" } | { kind: "revision"; version: number };

function describe(err: unknown): string {
  if (!(err instanceof ApiError)) return "Network error. Check your connection.";
  switch (err.code) {
    case "network_error":
      return "Network error. Check your connection.";
    case "slug_taken":
      return "That slug is already taken.";
    case "invalid_state":
      return "The item's state changed elsewhere — it has been refreshed, try again.";
    case "trashed":
      return "This item is in the trash. Restore it first.";
    case "not_found":
      return "This item no longer exists.";
    default:
      return `Request failed (${err.code}).`;
  }
}

function formatTimestamp(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export function ContentEditor({
  name,
  id,
  onBack,
}: {
  name: CollectionName;
  /** null opens create mode; after creation the component keeps editing inline */
  id: string | null;
  onBack: (changed: boolean) => void;
}) {
  const meta = COLLECTIONS.find((c) => c.name === name)!;

  const [createdId, setCreatedId] = useState<string | null>(null);
  const recordId = id ?? createdId;
  const isEdit = recordId !== null;

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(meta.fields.map((f) => [f.key, ""])),
  );
  const [status, setStatus] = useState<ContentStatus | null>(null);

  // Which action is running; doubles as the global disable signal.
  const [busy, setBusy] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Revision | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const changedRef = useRef(false);

  function applyRow(row: ContentRow) {
    setSlug(row.slug);
    setStatus(row._status);
    setFields(
      Object.fromEntries(
        meta.fields.map((f) => {
          const value = row[f.key];
          return [f.key, typeof value === "string" ? value : ""];
        }),
      ),
    );
  }

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getContent(name, recordId)
      .then((row) => {
        if (!cancelled) applyRow(row);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load this item.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // recordId intentionally omitted: it changes exactly once via createdId,
    // and re-fetching then would clobber the fresh POST response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, id]);

  async function resync() {
    if (recordId === null) return;
    try {
      applyRow(await getContent(name, recordId));
    } catch {
      // best-effort refresh only
    }
  }

  async function saveDraft() {
    setActionError(null);
    if (recordId === null) {
      const trimmed = slug.trim();
      if (trimmed === "") {
        setSlugError("Slug is required.");
        return;
      }
      setSlugError(null);
      setBusy("save");
      try {
        const row = await createContent(name, trimmed, fields);
        setCreatedId(row.id);
        applyRow(row);
        changedRef.current = true;
        setToast({ message: `Draft “${row.slug}” created.`, kind: "ok" });
      } catch (err) {
        if (err instanceof ApiError && err.code === "slug_taken") {
          setSlugError("That slug is already taken.");
        } else {
          setActionError(describe(err));
        }
      } finally {
        setBusy(null);
      }
      return;
    }
    setBusy("save");
    try {
      const row = await updateContent(name, recordId, fields);
      applyRow(row);
      changedRef.current = true;
      setToast({ message: "Draft saved.", kind: "ok" });
    } catch (err) {
      setActionError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  async function publishNow() {
    if (recordId === null) return;
    setBusy("publish");
    try {
      const row = await publishContent(name, recordId);
      applyRow(row);
      changedRef.current = true;
      setConfirm(null);
      setToast({ message: "Published.", kind: "ok" });
    } catch (err) {
      setConfirm(null);
      setActionError(describe(err));
      if (err instanceof ApiError && err.code === "invalid_state") await resync();
    } finally {
      setBusy(null);
    }
  }

  async function unpublishNow() {
    if (recordId === null) return;
    setBusy("unpublish");
    try {
      const row = await unpublishContent(name, recordId);
      applyRow(row);
      changedRef.current = true;
      setToast({ message: "Unpublished — it is no longer live.", kind: "ok" });
    } catch (err) {
      setActionError(describe(err));
      if (err instanceof ApiError && err.code === "invalid_state") await resync();
    } finally {
      setBusy(null);
    }
  }

  async function trashNow() {
    if (recordId === null) return;
    setBusy("trash");
    try {
      await trashContent(name, recordId);
      setStatus("trashed");
      changedRef.current = true;
      setToast({ message: "Moved to trash.", kind: "ok" });
    } catch (err) {
      setActionError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  async function restoreNow() {
    if (recordId === null) return;
    setBusy("restore");
    try {
      const row = await restoreContent(name, recordId);
      applyRow(row);
      changedRef.current = true;
      setToast({ message: "Restored from trash.", kind: "ok" });
    } catch (err) {
      setActionError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  async function openDrawer() {
    if (recordId === null) return;
    setDrawerOpen(true);
    setPreview(null);
    setRevisionsError(null);
    setRevisions(null);
    try {
      setRevisions(await listRevisions(name, recordId));
    } catch {
      setRevisionsError("Could not load revisions.");
    }
  }

  async function openPreview(version: number) {
    if (recordId === null) return;
    setPreviewLoading(true);
    setRevisionsError(null);
    try {
      setPreview(await getRevision(name, recordId, version));
    } catch {
      setRevisionsError("Could not load that version.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function restoreVersionNow(version: number) {
    if (recordId === null) return;
    setBusy("rev-restore");
    try {
      const row = await restoreRevision(name, recordId, version);
      applyRow(row);
      changedRef.current = true;
      setConfirm(null);
      setPreview(null);
      setToast({ message: `Version ${version} restored as draft.`, kind: "ok" });
    } catch (err) {
      setConfirm(null);
      setActionError(describe(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadError}>{loadError}</Text>
        <Btn label="Back to list" onPress={() => onBack(changedRef.current)} />
      </View>
    );
  }

  const trashed = status === "trashed";
  const canPublish = status === "draft" || status === "unpublished";

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => onBack(changedRef.current)} hitSlop={8}>
        <Text style={styles.back}>← Back to list</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {isEdit ? slug || "(untitled)" : `New ${meta.label}`}
        </Text>
        {status !== null ? <StatusBadge status={status} /> : null}
      </View>

      <View style={styles.actionBar}>
        {!trashed ? (
          <>
            <Btn
              label={isEdit ? "Save Draft" : "Create Draft"}
              variant="primary"
              busy={busy === "save"}
              disabled={busy !== null}
              onPress={saveDraft}
            />
            {canPublish && isEdit ? (
              <Btn
                label="Publish"
                busy={busy === "publish"}
                disabled={busy !== null}
                onPress={() => setConfirm({ kind: "publish" })}
              />
            ) : null}
            {status === "published" ? (
              <Btn
                label="Unpublish"
                busy={busy === "unpublish"}
                disabled={busy !== null}
                onPress={unpublishNow}
              />
            ) : null}
            {isEdit ? (
              <Btn
                label="Trash"
                variant="danger"
                busy={busy === "trash"}
                disabled={busy !== null}
                onPress={trashNow}
              />
            ) : null}
          </>
        ) : (
          <>
            <Btn
              label="Restore"
              variant="primary"
              busy={busy === "restore"}
              disabled={busy !== null}
              onPress={restoreNow}
            />
            <Text style={styles.trashNote}>Editing is locked while trashed.</Text>
          </>
        )}
      </View>

      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      <ScrollView style={styles.form}>
        <LabeledInput
          label="Slug"
          value={slug}
          onChangeText={setSlug}
          editable={!isEdit}
          hint={
            isEdit
              ? "Slugs are permanent and cannot be renamed."
              : "URL identifier, e.g. tree-plantation-drive"
          }
          error={slugError}
        />
        {meta.fields.map((f) => (
          <LabeledInput
            key={f.key}
            label={f.label}
            value={fields[f.key] ?? ""}
            onChangeText={(text) => setFields({ ...fields, [f.key]: text })}
            multiline={f.multiline}
          />
        ))}

        <Pressable onPress={openDrawer} hitSlop={6} disabled={trashed || busy !== null}>
          <Text style={[styles.revisionsLink, (trashed || busy !== null) && styles.linkDisabled]}>
            Revisions
          </Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm?.kind === "revision" ? "Restore this version?" : "Publish?"}
        message={
          confirm?.kind === "revision"
            ? `Version ${confirm.version} will replace the current draft content. Publishing afterwards makes it live.`
            : "This applies the saved draft to the live record and snapshots a new revision."
        }
        confirmLabel={confirm?.kind === "revision" ? "Restore version" : "Publish"}
        busy={busy !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "revision") void restoreVersionNow(confirm.version);
          else void publishNow();
        }}
      />

      {drawerOpen ? (
        <View style={drawerStyles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
          <View style={drawerStyles.panel}>
            <View style={drawerStyles.panelHeader}>
              <Text style={drawerStyles.panelTitle}>Revisions</Text>
              <Pressable onPress={() => setDrawerOpen(false)} hitSlop={8}>
                <Text style={drawerStyles.close}>✕ Close</Text>
              </Pressable>
            </View>

            {revisions === null && !revisionsError ? (
              <ActivityIndicator color={theme.accent} style={drawerStyles.spinner} />
            ) : null}
            {revisionsError ? (
              <Text style={drawerStyles.emptyText}>{revisionsError}</Text>
            ) : null}
            {revisions !== null && revisions.length === 0 ? (
              <Text style={drawerStyles.emptyText}>
                No revisions yet. Publishing snapshots the live content as the next version.
              </Text>
            ) : null}

            {revisions !== null && revisions.length > 0 ? (
              <ScrollView style={drawerStyles.versionList}>
                {revisions.map((rev) => (
                  <Pressable
                    key={rev.version}
                    onPress={() => void openPreview(rev.version)}
                    style={[
                      drawerStyles.versionRow,
                      preview?.version === rev.version && drawerStyles.versionRowActive,
                    ]}
                  >
                    <Text style={drawerStyles.versionLabel}>Version {rev.version}</Text>
                    <Text style={drawerStyles.versionDate}>
                      {formatTimestamp(rev.created_at)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {previewLoading ? <ActivityIndicator color={theme.accent} /> : null}
            {preview && !previewLoading ? (
              <View style={drawerStyles.previewBox}>
                <Text style={drawerStyles.previewHeading}>
                  Version {preview.version} · {formatTimestamp(preview.created_at)}
                </Text>
                <ScrollView style={drawerStyles.previewScroll} horizontal>
                  <ScrollView>
                    <Text style={drawerStyles.previewJson}>
                      {JSON.stringify(preview.data, null, 2)}
                    </Text>
                  </ScrollView>
                </ScrollView>
                <Btn
                  label="Restore this version"
                  variant="primary"
                  disabled={trashed || busy !== null}
                  busy={busy === "rev-restore"}
                  onPress={() => setConfirm({ kind: "revision", version: preview.version })}
                />
              </View>
            ) : null}
            {revisions !== null && revisions.length > 0 && !preview && !previewLoading ? (
              <Text style={drawerStyles.hint}>Tap a version to preview its snapshot.</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center" },
  back: { color: theme.textDim, fontSize: 13, marginBottom: 10 },
  headerRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  title: { color: theme.text, flex: 1, fontSize: 20, fontWeight: "700" },
  actionBar: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 12 },
  trashNote: { color: theme.textDim, fontSize: 13, alignSelf: "center" },
  actionError: { color: theme.danger, fontSize: 13, marginBottom: 8 },
  form: { flex: 1, gap: 14, paddingBottom: 24 },
  revisionsLink: {
    color: theme.accent,
    fontSize: 13.5,
    fontWeight: "600",
    marginTop: 4,
  },
  linkDisabled: { opacity: 0.4 },
  loadError: { color: theme.textDim, fontSize: 15 },
});

const drawerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    flexDirection: "row",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  panel: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderLeftWidth: 1,
    height: "100%",
    maxWidth: 480,
    padding: 18,
    width: "100%",
    gap: 12,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  panelTitle: { color: theme.text, fontSize: 16, fontWeight: "700" },
  close: { color: theme.textDim, fontSize: 13 },
  spinner: { marginTop: 24 },
  emptyText: { color: theme.textDim, fontSize: 13.5, lineHeight: 19 },
  versionList: { maxHeight: 260 },
  versionRow: {
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  versionRowActive: { borderColor: theme.accent },
  versionLabel: { color: theme.text, fontSize: 13.5, fontWeight: "600" },
  versionDate: { color: theme.textDim, fontSize: 12 },
  previewBox: { flex: 1, gap: 8 },
  previewHeading: { color: theme.textDim, fontSize: 12 },
  previewScroll: {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  previewJson: {
    color: theme.text,
    fontFamily: "monospace",
    fontSize: 11.5,
    lineHeight: 16,
    padding: 10,
  },
  hint: { color: theme.textDim, fontSize: 12 },
});
