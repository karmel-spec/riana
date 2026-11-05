// Small, dependency-free date and money helpers. All dates render in the
// family's local zone (Arizona), which matters for a 10:30 AM appointment.
export const TZ = "America/Phoenix";

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ, ...opts });
}

export function fmtDateLong(iso: string | null | undefined): string {
  return fmtDate(iso, { weekday: "long", month: "long", day: "numeric" });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function monthDay(iso: string): { month: string; day: string } {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return {
    month: d.toLocaleDateString("en-US", { month: "short", timeZone: TZ }).toUpperCase(),
    day: d.toLocaleDateString("en-US", { day: "numeric", timeZone: TZ }),
  };
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function relative(iso: string): string {
  const n = daysUntil(iso);
  if (n === null) return "";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n < 0) return `${-n} days ago`;
  return `in ${n} days`;
}

export function todayLong(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TZ });
}

export function greeting(): string {
  const h = Number(new Date().toLocaleTimeString("en-US", { hour: "numeric", hour12: false, timeZone: TZ }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export const subjectName = (s: string | null | undefined) =>
  s === "rich" ? "Rich" : s === "diana" ? "Diana" : s === "both" ? "Rich & Diana" : "Household";
