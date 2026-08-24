// Date formatting shared by the inbox, forms and users screens (mirrors the
// formatter previously local to ContentEditor).
export function formatTimestamp(unixSeconds: number): string {
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
