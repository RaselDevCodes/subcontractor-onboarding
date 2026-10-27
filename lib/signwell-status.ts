// Decides whether a SignWell status event may replace the status already stored.
// SignWell can deliver events late or out of order, so a delayed "viewed" must never
// undo "completed", and final states (declined, expired, canceled, bounced) stay put.
const PROGRESS: Record<string, number> = { created: 1, sent: 2, viewed: 3, in_progress: 4, partially_signed: 5 };
const FINAL = new Set(["completed", "declined", "expired", "canceled", "bounced"]);

export function shouldApplyStatus(current: string, next: string): boolean {
  if (current === next) return true;
  if (current === "completed") return false;
  if (FINAL.has(current)) return next === "completed";
  if (next in PROGRESS && current in PROGRESS) return PROGRESS[next] > PROGRESS[current];
  return true;
}
