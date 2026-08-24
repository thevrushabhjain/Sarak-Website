// Form builder editor. A form's fields live as an ordered list the user can
// add, remove and reorder; choice types get a comma-separated options line,
// text-ish types an optional max length, everything a required toggle and a
// snake_case key (auto-suggested from the label until manually edited). The
// JSON sent to the API is previewable at all times. Publishing freezes the
// working copy into a new version; published forms keep their fields locked.
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiError } from "../api";
import {
  createForm,
  getForm,
  listVersions,
  publishForm,
  trashForm,
  updateForm,
  type FieldType,
  type FormField,
  type FormRow,
  type FormVersion,
} from "../forms";
import { listContent } from "../content";
import type { ContentRow } from "../content";
import { theme } from "../theme";
import { Btn, ConfirmDialog, LabeledInput, StatusBadge, Toast, type ToastState } from "../ui";
import { formatTimestamp } from "./format";

const FIELD_TYPES: FieldType[] = [
  "text",
  "email",
  "phone",
  "number",
  "date",
  "single-choice",
  "multi-choice",
  "consent",
  "long-text",
];

// Static literal membership tables (same pattern as the API's own guards).
const TEXTISH: Partial<Record<FieldType, true>> = {
  text: true,
  email: true,
  phone: true,
  number: true,
  "long-text": true,
};
const CHOICE: Partial<Record<FieldType, true>> = {
  "single-choice": true,
  "multi-choice": true,
};

const KEY_RE = /^[a-z][a-z0-9_]*$/;

// Editor-side shape: choice options stay a comma-separated line and max_length
// a raw input string so half-typed values never fight the numeric schema.
type DraftField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string;
  maxLengthText: string;
  keyTouched: boolean;
};

function toDraft(fields: FormField[]): DraftField[] {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required === true,
    optionsText: (f.options ?? []).join(", "),
    maxLengthText: f.max_length !== undefined ? String(f.max_length) : "",
    keyTouched: true,
  }));
}

function parseOptions(text: string): string[] {
  return text
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o !== "");
}

function toApiFields(drafts: DraftField[]): FormField[] {
  return drafts.map((d) => {
    const out: FormField = { key: d.key, label: d.label.trim(), type: d.type };
    if (d.required) out.required = true;
    if (CHOICE[d.type]) out.options = parseOptions(d.optionsText);
    const max = Number(d.maxLengthText);
    if (TEXTISH[d.type] && d.maxLengthText !== "" && Number.isInteger(max) && max > 0) {
      out.max_length = max;
    }
    return out;
  });
}

function suggestKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (slug === "") return "";
  return KEY_RE.test(slug) ? slug : `f_${slug}`;
}

// First client-side problem with the draft, or null when it would pass the
// same structural rules the API enforces (field_key_invalid, …).
function validateDraft(name: string, drafts: DraftField[]): string | null {
  if (name.trim() === "") return "Give the form a name.";
  if (drafts.length === 0) return "Add at least one field.";
  const seen = new Set<string>();
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const n = i + 1;
    if (d.label.trim() === "") return `Field ${n}: label is required.`;
    if (!KEY_RE.test(d.key)) return `Field ${n}: key must be snake_case starting with a letter.`;
    if (seen.has(d.key)) return `Field ${n}: key “${d.key}” is used twice.`;
    seen.add(d.key);
    if (CHOICE[d.type]) {
      const options = parseOptions(d.optionsText);
      if (options.length < 1) return `Field ${n}: add at least one option.`;
      if (options.length > 20) return `Field ${n}: at most 20 options are allowed.`;
    }
    if (TEXTISH[d.type] && d.maxLengthText !== "") {
      const max = Number(d.maxLengthText);
      if (!Number.isInteger(max) || max <= 0)
        return `Field ${n}: max length must be a positive whole number.`;
    }
  }
  return null;
}

type ConfirmRequest = { kind: "publish" } | { kind: "trash" };

export function FormEditor({ formId, onBack }: { formId: string | null; onBack: () => void }) {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const recordId = formId ?? createdId;

  const [name, setName] = useState("");
  const [programId, setProgramId] = useState<string | null>(null);
  const [status, setStatus] = useState<FormRow["status"]>("draft");
  const [drafts, setDrafts] = useState<DraftField[]>([]);

  const [loading, setLoading] = useState(recordId !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ContentRow[] | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirming, setConfirming] = useState<ConfirmRequest | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [versions, setVersions] = useState<FormVersion[] | null>(null);
  const [versionPreview, setVersionPreview] = useState<FormVersion | null>(null);

  const locked = status === "published";
  const trashed = status === "trashed";

  useEffect(() => {
    if (recordId === null) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getForm(recordId)
      .then((row) => {
        if (cancelled) return;
        setName(row.name);
        setProgramId(row.program_id);
        setStatus(row.status);
        setDrafts(toDraft(row.fields));
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load this form.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  // Program linking is optional; the programs collection doubles as the
  // picker source.
  useEffect(() => {
    let alive = true;
    listContent("programs", "all")
      .then((rows) => {
        if (alive) setPrograms(rows);
      })
      .catch(() => {
        if (alive) setPrograms([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  function patchDraft(index: number, patch: Partial<DraftField>): void {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function move(index: number, delta: -1 | 1): void {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function openVersions(): Promise<void> {
    if (recordId === null || drawerOpen) {
      setDrawerOpen(false);
      return;
    }
    setDrawerOpen(true);
    setVersions(null);
    setVersionPreview(null);
    try {
      setVersions(await listVersions(recordId));
    } catch {
      setVersions([]);
    }
  }

  function applyForm(row: FormRow): void {
    setName(row.name);
    setProgramId(row.program_id);
    setStatus(row.status);
    setDrafts(toDraft(row.fields));
  }

  async function save(): Promise<void> {
    if (busy !== null || recordId === null) return;
    setSaveError(null);
    const problem = validateDraft(name, drafts);
    if (problem !== null) {
      setSaveError(problem);
      return;
    }
    setBusy("save");
    try {
      const patch = { name: name.trim(), program_id: programId };
      const row = await updateForm(
        recordId,
        locked ? patch : { ...patch, fields: toApiFields(drafts) },
      );
      applyForm(row);
      setToast({ message: "Saved.", kind: "ok" });
    } catch (err) {
      setSaveError(saveErrorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function create(): Promise<void> {
    if (busy !== null) return;
    setSaveError(null);
    const problem = validateDraft(name, drafts);
    if (problem !== null) {
      setSaveError(problem);
      return;
    }
    setBusy("save");
    try {
      const row = await createForm(name.trim(), programId, toApiFields(drafts));
      setCreatedId(row.id);
      applyForm(row);
      setToast({ message: "Form created as draft.", kind: "ok" });
    } catch (err) {
      setSaveError(saveErrorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function runPublish(): Promise<void> {
    if (recordId === null || busy !== null) return;
    setConfirming(null);
    setBusy("publish");
    try {
      const { version } = await publishForm(recordId);
      setStatus("published");
      setDrawerOpen(false);
      setToast({ message: `Published as version ${version}.`, kind: "ok" });
    } catch (err) {
      setSaveError(saveErrorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function runTrash(): Promise<void> {
    if (recordId === null || busy !== null) return;
    setConfirming(null);
    setBusy("trash");
    try {
      await trashForm(recordId);
      onBack();
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError && err.code === "has_submissions") {
        setSaveError(
          "This form has registrations, so it cannot be trashed. Archive its program instead.",
        );
      } else {
        setSaveError(saveErrorText(err));
      }
    }
  }

  const canTouchFields = !locked && !trashed;
  const json = JSON.stringify(toApiFields(drafts), null, 2);

  if (loadError) {
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Btn label="← Forms" variant="ghost" onPress={onBack} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{loadError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Btn label="← Forms" variant="ghost" onPress={onBack} />
        <View style={styles.headerSide}>
          {!trashed && recordId !== null ? (
            <Btn label="Versions" onPress={() => void openVersions()} disabled={busy !== null} />
          ) : null}
          {createdId === null && formId === null ? null : (
            <>
              {status === "draft" ? (
                <Btn label="Publish" variant="primary" onPress={() => setConfirming({ kind: "publish" })} disabled={busy !== null} />
              ) : null}
              <Btn label="Trash" variant="danger" onPress={() => setConfirming({ kind: "trash" })} disabled={busy !== null} />
            </>
          )}
        </View>
      </View>

      {loading ? <ActivityIndicator color={theme.accent} style={styles.spinner} /> : null}

      {!loading ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
          {trashed ? (
            <Text style={styles.lockNote}>This form is in the trash.</Text>
          ) : locked ? (
            <Text style={styles.lockNote}>
              Published — fields are frozen. Editing still available: name and linked program.
            </Text>
          ) : null}

          <LabeledInput label="Form name" value={name} onChangeText={setName} editable={!trashed} />

          <View style={styles.programBlock}>
            <Text style={styles.blockLabel}>Linked program (optional)</Text>
            <View style={styles.programChips}>
              <Pressable
                onPress={() => setProgramId(null)}
                style={[styles.chip, programId === null && styles.chipActive]}
              >
                <Text style={programId === null ? styles.chipTextActive : styles.chipText}>
                  None
                </Text>
              </Pressable>
              {(programs ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setProgramId(p.id)}
                  style={[styles.chip, programId === p.id && styles.chipActive]}
                >
                  <Text style={programId === p.id ? styles.chipTextActive : styles.chipText}>
                    {typeof p.title === "string" ? p.title : p.slug}
                  </Text>
                </Pressable>
              ))}
            </View>
            {programs === null ? (
              <Text style={styles.hint}>Loading programs…</Text>
            ) : programs.length === 0 ? (
              <Text style={styles.hint}>No programs exist yet.</Text>
            ) : null}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.blockLabel}>Fields</Text>
            {canTouchFields ? (
              <Btn
                label="+ Add field"
                onPress={() =>
                  setDrafts((prev) => [
                    ...prev,
                    {
                      key: "",
                      label: "",
                      type: "text",
                      required: false,
                      optionsText: "",
                      maxLengthText: "",
                      keyTouched: false,
                    },
                  ])
                }
              />
            ) : null}
          </View>

          {drafts.length === 0 ? (
            <Text style={styles.hint}>No fields yet — add the first one above.</Text>
          ) : null}

          {drafts.map((draft, i) => (
            <FieldCard
              key={i}
              index={i}
              count={drafts.length}
              draft={draft}
              locked={!canTouchFields}
              onChange={(patch) => patchDraft(i, patch)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              onRemove={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}

          <View style={styles.previewBlock}>
            <Text style={styles.blockLabel}>JSON preview</Text>
            <ScrollView style={styles.jsonBox}>
              <Text style={styles.jsonText}>{json}</Text>
            </ScrollView>
          </View>

          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

          <View style={styles.actions}>
            {createdId === null && formId === null ? (
              <Btn label="Create draft" variant="primary" busy={busy === "save"} onPress={() => void create()} />
            ) : (
              <>
                <Btn
                  label="Save"
                  variant="primary"
                  busy={busy === "save"}
                  disabled={busy !== null || trashed}
                  onPress={() => void save()}
                />
                {status === "draft" ? (
                  <Btn
                    label="Publish"
                    variant="primary"
                    busy={busy === "publish"}
                    disabled={busy !== null}
                    onPress={() => setConfirming({ kind: "publish" })}
                  />
                ) : null}
                <Btn
                  label="Trash"
                  variant="danger"
                  busy={busy === "trash"}
                  disabled={busy !== null}
                  onPress={() => setConfirming({ kind: "trash" })}
                />
              </>
            )}
          </View>
        </ScrollView>
      ) : null}

      {drawerOpen ? (
        <View style={drawerStyles.backdrop}>
          <View style={drawerStyles.panel}>
            <View style={drawerStyles.head}>
              <Text style={drawerStyles.title}>Versions</Text>
              <Btn label="Close" variant="ghost" onPress={() => setDrawerOpen(false)} />
            </View>
            <ScrollView style={drawerStyles.list}>
              {versions === null ? (
                <ActivityIndicator color={theme.accent} style={styles.spinner} />
              ) : versions.length === 0 ? (
                <Text style={drawerStyles.hint}>Not published yet — no versions exist.</Text>
              ) : (
                versions.map((v) => (
                  <View key={v.version} style={drawerStyles.versionCard}>
                    <Pressable
                      onPress={() => setVersionPreview(versionPreview?.version === v.version ? null : v)}
                    >
                      <Text style={drawerStyles.versionTitle}>
                        v{v.version} · {formatTimestamp(v.created_at)} · {v.fields.length} field
                        {v.fields.length === 1 ? "" : "s"}
                      </Text>
                    </Pressable>
                    {versionPreview?.version === v.version ? (
                      <View style={drawerStyles.previewBox}>
                        <Text style={styles.jsonText}>{JSON.stringify(v.fields, null, 2)}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirming?.kind === "publish"}
        title="Publish this form?"
        message="The current fields freeze into a new public version."
        confirmLabel="Publish"
        busy={busy === "publish"}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void runPublish()}
      />
      <ConfirmDialog
        visible={confirming?.kind === "trash"}
        title="Trash this form?"
        message="Forms with registrations cannot be trashed."
        confirmLabel="Trash"
        danger
        busy={busy === "trash"}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void runTrash()}
      />

      <Toast toast={toast} onDone={() => setToast(null)} />
    </View>
  );
}

function FieldCard({
  index,
  count,
  draft,
  locked,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number;
  count: number;
  draft: DraftField;
  locked: boolean;
  onChange: (patch: Partial<DraftField>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.cardHead}>
        <Text style={cardStyles.fieldNo}>Field {index + 1}</Text>
        {!locked ? (
          <View style={cardStyles.cardActions}>
            <Btn label="↑" disabled={index === 0} onPress={onMoveUp} />
            <Btn label="↓" disabled={index === count - 1} onPress={onMoveDown} />
            <Btn label="Remove" variant="danger" onPress={onRemove} />
          </View>
        ) : null}
      </View>

      <LabeledInput
        label="Label"
        value={draft.label}
        onChangeText={(text) => {
          const patch: Partial<DraftField> = { label: text };
          if (!draft.keyTouched) patch.key = suggestKey(text);
          onChange(patch);
        }}
        editable={!locked}
      />
      <LabeledInput
        label="Key (snake_case)"
        value={draft.key}
        onChangeText={(key) => onChange({ key, keyTouched: true })}
        editable={!locked}
        autoCapitalize="none"
        hint="Stable identifier used in submissions"
      />

      <View style={cardStyles.typeBlock}>
        <Text style={cardStyles.typeLabel}>Type</Text>
        <View style={cardStyles.typeChips}>
          {FIELD_TYPES.map((t) => (
            <Pressable
              key={t}
              disabled={locked}
              onPress={() => onChange({ type: t })}
              style={[cardStyles.chip, draft.type === t && cardStyles.chipActive]}
            >
              <Text style={draft.type === t ? cardStyles.chipTextActive : cardStyles.chipText}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        disabled={locked}
        onPress={() => onChange({ required: !draft.required })}
        style={[cardStyles.chip, draft.required && cardStyles.requiredOn]}
      >
        <Text style={draft.required ? cardStyles.requiredTextActive : cardStyles.chipText}>
          {draft.required ? "✓ Required" : "Optional"}
        </Text>
      </Pressable>

      {CHOICE[draft.type] ? (
        <LabeledInput
          label="Options (comma-separated)"
          value={draft.optionsText}
          onChangeText={(optionsText) => onChange({ optionsText })}
          editable={!locked}
          hint={`${parseOptions(draft.optionsText).length}/20 options`}
        />
      ) : null}

      {TEXTISH[draft.type] ? (
        <LabeledInput
          label="Max length (optional)"
          value={draft.maxLengthText}
          onChangeText={(maxLengthText) => onChange({ maxLengthText })}
          editable={!locked}
          autoCapitalize="none"
        />
      ) : null}
    </View>
  );
}

function saveErrorText(err: unknown): string {
  if (!(err instanceof ApiError)) return "Network error. Check your connection.";
  switch (err.code) {
    case "network_error":
      return "Network error. Check your connection.";
    case "republish_required":
      return "This form is published — its fields are frozen.";
    case "has_submissions":
      return "Registrations exist on this form, so it cannot be trashed.";
    case "unknown_program":
      return "That program no longer exists.";
    case "fields_invalid":
    case "field_invalid":
    case "field_type_invalid":
    case "field_label_invalid":
    case "field_key_invalid":
    case "field_key_duplicate":
    case "field_options_invalid":
    case "field_max_length_invalid":
      return `A field is invalid (${err.code}).`;
    default:
      return `Request failed (${err.code}).`;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  headerSide: { alignItems: "center", flexDirection: "row", gap: 8 },
  spinner: { marginTop: 48 },
  scroll: { flex: 1 },
  scrollInner: { gap: 14, paddingBottom: 40 },
  lockNote: {
    color: theme.warn,
    fontSize: 12.5,
    backgroundColor: "#78350f33",
    borderColor: theme.warn,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  blockLabel: { color: theme.textDim, fontSize: 12.5, fontWeight: "700" },
  sectionHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  programBlock: { gap: 8 },
  programChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  hint: { color: theme.textDim, fontSize: 12.5 },
  previewBlock: { gap: 8, marginTop: 8 },
  jsonBox: {
    backgroundColor: "#020617",
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 220,
    padding: 10,
  },
  jsonText: { color: theme.success, fontFamily: "monospace", fontSize: 12 },
  errorText: { color: theme.danger, fontSize: 13 },
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  empty: { alignItems: "center", marginTop: 56 },
  emptyTitle: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  cardHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fieldNo: { color: theme.textDim, fontSize: 12, fontWeight: "700" },
  cardActions: { alignItems: "center", flexDirection: "row", gap: 6 },
  typeBlock: { gap: 6 },
  typeLabel: { color: theme.textDim, fontSize: 12 },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 11.5 },
  chipTextActive: { color: "#082f49", fontSize: 11.5, fontWeight: "700" },
  requiredOn: { alignSelf: "flex-start", backgroundColor: "#052e16", borderColor: theme.success },
  requiredTextActive: { color: theme.success, fontSize: 11.5, fontWeight: "700" },
});

const drawerStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  panel: {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    borderLeftWidth: 1,
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  head: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { color: theme.text, fontSize: 18, fontWeight: "700" },
  list: { flex: 1 },
  hint: { color: theme.textDim, fontSize: 13 },
  versionCard: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
    gap: 8,
  },
  versionTitle: { color: theme.text, fontSize: 13.5, fontWeight: "600" },
  previewBox: {
    backgroundColor: "#020617",
    borderColor: theme.border,
    borderRadius: 6,
    borderWidth: 1,
    maxHeight: 260,
    padding: 8,
  },
});
