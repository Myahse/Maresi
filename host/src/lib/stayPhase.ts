import type { VisitRequest } from "@/types";

export type StayPhase = "upcoming" | "active" | "done" | "cancelled";

function startOfToday() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day;
}

function dateOnly(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function stayPhase(visit: VisitRequest): StayPhase {
  if (visit.status === "cancelled" || visit.status === "declined") return "cancelled";
  if (visit.closed_at) return "done";
  const paid = visit.status === "confirmed" || visit.status === "payment_sent";
  if (!paid) return "upcoming";
  const checkIn = dateOnly(visit.check_in);
  if (checkIn && checkIn > startOfToday()) return "upcoming";
  return "active";
}

export function stayPhaseKey(visit: VisitRequest) {
  const phase = stayPhase(visit);
  if (phase === "active" && visit.overstay) return "overstay" as const;
  return phase;
}
