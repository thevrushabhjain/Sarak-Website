// Validation for PUBLIC submission payloads against a published form schema
// (or the fixed enquiry schema). Unlike form-schema.ts (which validates admin
// field DEFINITIONS), this checks incoming ANSWER values, so every failure is
// attributable to a specific key: errors are `<rule>:<key>` tokens surfaced
// verbatim by the routes as 400 `{"error":<token>}`:
//   unknown:<key>   payload key not declared in the schema (strict envelope)
//   required:<key>  required field absent or empty
//   invalid:<key>   wrong type / failed per-type rule
//   too_long:<key>  exceeds max_length (or the long-text hard cap)
export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "single-choice"
  | "multi-choice"
  | "consent"
  | "long-text";

export type Field = {
  key: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  options?: string[];
  max_length?: number;
};

export type SubmissionValidation =
  | { ok: true; clean: Record<string, unknown> }
  | { ok: false; error: string };

const LONG_TEXT_CAP = 5000;

// Phone pattern pinned by the brief: optional leading +, digits/spaces/dashes,
// at least 6 chars total.
const PHONE_RE = /^[+\d][\d\s-]{5,}$/;
// Pragmatic email shape: one @, non-empty local part, dotted domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// ISO calendar date, verified as a real day (2026-13-01 must fail).
function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return (
    utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d
  );
}

export function validateAgainstSchema(
  schema: Field[],
  payload: Record<string, unknown>,
): SubmissionValidation {
  if (!Array.isArray(schema)) return { ok: false, error: "invalid_body" };
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "invalid_body" };
  }


  // Strict envelope: anything the published form does not declare is rejected
  // before any per-field work, so injected keys never reach storage.
  const declared: Record<string, true> = {};
  for (const f of schema) declared[f.key] = true;
  for (const key of Object.keys(payload)) {
    if (!declared[key]) return { ok: false, error: `unknown:${key}` };
  }

  const clean: Record<string, unknown> = {};
  for (const field of schema) {
    const raw = payload[field.key];
    // Absent, null and "" all count as unanswered (unchecked HTML inputs
    // arrive as ""), so they hit only the required rule.
    if (raw === undefined || raw === null || raw === "") {
      if (field.required) return { ok: false, error: `required:${field.key}` };
      continue;
    }

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "long-text": {
        if (typeof raw !== "string") return { ok: false, error: `invalid:${field.key}` };
        if (typeof field.max_length === "number" && raw.length > field.max_length) {
          return { ok: false, error: `too_long:${field.key}` };
        }
        if (field.type === "long-text" && raw.length > LONG_TEXT_CAP) {
          return { ok: false, error: `too_long:${field.key}` };
        }
        if (field.type === "email" && !EMAIL_RE.test(raw)) {
          return { ok: false, error: `invalid:${field.key}` };
        }
        if (field.type === "phone" && !PHONE_RE.test(raw)) {
          return { ok: false, error: `invalid:${field.key}` };
        }
        clean[field.key] = raw;
        break;
      }
      case "number": {
        if (typeof raw !== "number" || !Number.isFinite(raw)) {
          return { ok: false, error: `invalid:${field.key}` };
        }
        clean[field.key] = raw;
        break;
      }
      case "date": {
        if (typeof raw !== "string" || !isIsoDate(raw)) {
          return { ok: false, error: `invalid:${field.key}` };
        }
        clean[field.key] = raw;
        break;
      }
      case "single-choice": {
        if (typeof raw !== "string" || !field.options?.includes(raw)) {
          return { ok: false, error: `invalid:${field.key}` };
        }
        clean[field.key] = raw;
        break;
      }
      case "multi-choice": {
        if (
          !Array.isArray(raw) ||
          raw.some((v) => typeof v !== "string" || !field.options?.includes(v))
        ) {
          return { ok: false, error: `invalid:${field.key}` };
        }
        // A required multi-choice needs at least one selection; [] counts as
        // unanswered.
        if (field.required && raw.length === 0) {
          return { ok: false, error: `required:${field.key}` };
        }
        clean[field.key] = raw;
        break;
      }
      case "consent": {
        // Consent boxes carry no value other than agreement: anything but the
        // boolean true (false, "true", 1, ...) is a rejection.
        if (raw !== true) return { ok: false, error: `invalid:${field.key}` };
        clean[field.key] = true;
        break;
      }
    }
  }
  return { ok: true, clean };
}
