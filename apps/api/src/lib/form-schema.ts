// Validation for form builder payloads. A schema is an array of 1..50 field
// objects (`{type,label,key}` plus type-specific extras). Every rule maps to
// one stable error token that admin routes surface verbatim as
// `{"error":<token>}` with status 400.
export type SchemaValidation = { ok: true } | { ok: false; error: string };

const FIELD_TYPES: ReadonlySet<string> = new Set([
  "text",
  "email",
  "phone",
  "number",
  "date",
  "single-choice",
  "multi-choice",
  "consent",
  "long-text",
]);

// Types for which an optional positive-integer max_length is meaningful.
const TEXTISH_TYPES: ReadonlySet<string> = new Set([
  "text",
  "email",
  "phone",
  "number",
  "long-text",
]);

const CHOICE_TYPES: ReadonlySet<string> = new Set(["single-choice", "multi-choice"]);

// snake_case: starts with a lowercase letter, then lowercase letters, digits,
// underscores.
const KEY_RE = /^[a-z][a-z0-9_]*$/;

export function validateSchema(fields: unknown): SchemaValidation {
  if (!Array.isArray(fields)) return { ok: false, error: "fields_invalid" };
  if (fields.length === 0) return { ok: false, error: "fields_empty" };
  if (fields.length > 50) return { ok: false, error: "fields_too_many" };

  const seenKeys = new Set<string>();
  for (const field of fields) {
    if (field === null || typeof field !== "object" || Array.isArray(field)) {
      return { ok: false, error: "field_invalid" };
    }
    // Unknown extra properties are tolerated: the brief pins required keys,
    // not exclusivity.
    const f = field as Record<string, unknown>;
    if (typeof f.type !== "string" || !FIELD_TYPES.has(f.type)) {
      return { ok: false, error: "field_type_invalid" };
    }
    if (typeof f.label !== "string" || f.label.trim() === "") {
      return { ok: false, error: "field_label_invalid" };
    }
    if (typeof f.key !== "string" || !KEY_RE.test(f.key)) {
      return { ok: false, error: "field_key_invalid" };
    }
    if (seenKeys.has(f.key)) return { ok: false, error: "field_key_duplicate" };
    seenKeys.add(f.key);

    if (CHOICE_TYPES.has(f.type)) {
      const options = f.options;
      if (
        !Array.isArray(options) ||
        options.length < 1 ||
        options.length > 20 ||
        options.some((o) => typeof o !== "string")
      ) {
        return { ok: false, error: "field_options_invalid" };
      }
    }
    if ("max_length" in f) {
      const max = f.max_length;
      if (
        !TEXTISH_TYPES.has(f.type) ||
        typeof max !== "number" ||
        !Number.isInteger(max) ||
        max <= 0
      ) {
        return { ok: false, error: "field_max_length_invalid" };
      }
    }
  }
  return { ok: true };
}
