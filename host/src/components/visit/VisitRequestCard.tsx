import { useTranslation } from "react-i18next";
import { Calendar, Clock, Users, Phone, MapPin, MessageSquare, CreditCard, Mail } from "lucide-react";
import type { VisitRequest, VisitRequestStatus } from "@/types";
import { cn } from "@/lib/utils";
import { AuthImage } from "@/components/visit/AuthImage";

const STATUS_STYLES: Record<VisitRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  awaiting_agreement: "bg-orange-100 text-orange-800 border-orange-200",
  awaiting_key: "bg-teal-100 text-teal-800 border-teal-200",
  awaiting_payment: "bg-sky-100 text-sky-800 border-sky-200",
  payment_sent: "bg-violet-100 text-violet-800 border-violet-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-muted text-foreground border-border",
};

interface VisitRequestCardProps {
  visit: VisitRequest;
  showRequester?: boolean;
  children?: React.ReactNode;
}

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStay(date?: string, time?: string) {
  const hour = time ? String(time).slice(0, 5) : "";
  return hour ? `${formatDate(date)} · ${hour}` : formatDate(date);
}

export function VisitRequestCard({ visit, showRequester, children }: VisitRequestCardProps) {
  const { t } = useTranslation();

  return (
    <article className="rounded-2xl border-2 border-border bg-card overflow-hidden">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-foreground">{visit.property_title ?? t("common.property")}</h3>
            {visit.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {visit.location}
              </p>
            )}
          </div>
          <span
            className={cn(
              "text-xs font-bold uppercase px-3 py-1 rounded-full border",
              STATUS_STYLES[visit.status]
            )}
          >
            {t(`visits.status.${visit.status}`)}
          </span>
        </div>

        {showRequester && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("visits.clientFile")}
            </p>
            <p className="text-sm font-semibold text-foreground">{visit.requester_name || "—"}</p>
            {visit.requester_email && (
              <p className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand shrink-0" />
                <a href={`mailto:${visit.requester_email}`} className="hover:text-brand break-all">
                  {visit.requester_email}
                </a>
              </p>
            )}
            {(visit.requester_phone || visit.contact_phone) && (
              <p className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand shrink-0" />
                <a href={`tel:${visit.contact_phone || visit.requester_phone}`} className="hover:text-brand">
                  {visit.contact_phone || visit.requester_phone}
                </a>
              </p>
            )}
            {(visit.id_card || visit.requester_id_card) && (
              <p className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand shrink-0" />
                <span>
                  {t("visits.idCard")}: {visit.id_card || visit.requester_id_card}
                </span>
              </p>
            )}
            {(visit.requester_selfie_url || visit.requester_id_photo_url || visit.requester_id_back_url) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("visits.selfie")}</p>
                  <AuthImage
                    src={visit.requester_selfie_url}
                    alt={t("visits.selfie")}
                    className="h-28 w-full rounded-lg object-cover bg-muted"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("visits.idPhoto")}</p>
                  <AuthImage
                    src={visit.requester_id_photo_url}
                    alt={t("visits.idPhoto")}
                    className="h-28 w-full rounded-lg object-cover bg-muted"
                  />
                </div>
                {visit.requester_id_back_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("register.idCardBack")}</p>
                    <AuthImage
                      src={visit.requester_id_back_url}
                      alt={t("register.idCardBack")}
                      className="h-28 w-full rounded-lg object-cover bg-muted"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("visits.guestHostNotes")}
              </p>
              <p className="text-sm font-semibold">
                {t("visits.closeStayScore")}:{" "}
                {visit.guest_rating_count
                  ? `${Number(visit.guest_rating_avg ?? 0).toFixed(1)} / 5 (${visit.guest_rating_count})`
                  : "—"}
              </p>
              {(visit.guest_host_notes ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("visits.guestNoNotes")}</p>
              ) : (
                <ul className="space-y-2">
                  {(visit.guest_host_notes ?? []).map((note, i) => (
                    <li key={`${note.created_at ?? i}`} className="text-sm">
                      <span className="font-semibold">{note.score}/5</span>
                      {note.note ? ` — ${note.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {visit.agreement_full_name && (
              <p className="text-xs text-muted-foreground">
                {t("visits.signedBy")}: {visit.agreement_full_name}
                {visit.agreement_signed_at
                  ? ` · ${new Date(visit.agreement_signed_at).toLocaleString()}`
                  : ""}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {visit.check_in && visit.check_out && (
            <div className="flex items-start gap-2 text-foreground">
              <Calendar className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t("visits.stayDates")}</p>
                <p>
                  {formatStay(visit.check_in, visit.arrival_time || visit.check_in_time)} →{" "}
                  {formatStay(visit.check_out, visit.departure_time || visit.check_out_time)}
                </p>
              </div>
            </div>
          )}
          {visit.visit_date && (
            <div className="flex items-start gap-2 text-foreground">
              <Clock className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{t("visits.visitSlot")}</p>
                <p>
                  {formatDate(visit.visit_date)}
                  {visit.visit_time ? ` · ${visit.visit_time}` : ""}
                </p>
              </div>
            </div>
          )}
          {visit.guests_count != null && (
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-brand shrink-0" />
              <span>
                {visit.guests_count} {t("visits.guests")}
              </span>
            </div>
          )}
          {visit.contact_phone && (
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4 text-brand shrink-0" />
              <a href={`tel:${visit.contact_phone}`} className="hover:text-brand">
                {visit.contact_phone}
              </a>
            </div>
          )}
        </div>

        {visit.message && (
          <div className="flex gap-2 text-sm text-muted-foreground bg-muted rounded-xl p-3">
            <MessageSquare className="h-4 w-4 shrink-0 text-brand" />
            <p className="whitespace-pre-wrap">{visit.message}</p>
          </div>
        )}

        {visit.extension_status && visit.extension_check_out && (
          <div className="rounded-xl border border-brand/30 bg-accent p-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">{t("visits.extendTitle")}</p>
            {visit.extension_status === "pending" && (
              <p>{t("visits.extendPending", { date: formatDate(visit.extension_check_out) })}</p>
            )}
            {visit.extension_status !== "pending" && (
              <p>
                {t("visits.extendRequested")}: {formatDate(visit.extension_check_out)}
              </p>
            )}
            {visit.extension_amount != null && (
              <p>
                {t("visits.extendAmount")}: {visit.extension_amount} XOF
              </p>
            )}
            {visit.extension_status === "awaiting_payment" && (
              <p>{t("visits.extendApproved", { date: formatDate(visit.check_out) })}</p>
            )}
            {visit.extension_status === "payment_sent" && <p>{t("visits.extendPaidWaiting")}</p>}
            {visit.extension_status === "confirmed" && (
              <p>{t("visits.extendConfirmed", { date: formatDate(visit.check_out) })}</p>
            )}
            {visit.extension_note && visit.extension_status === "declined" && (
              <p className="text-red-700">{visit.extension_note}</p>
            )}
          </div>
        )}

        {visit.owner_note && visit.status === "declined" && (
          <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">
            <span className="font-semibold">{t("visits.ownerNote")}: </span>
            {visit.owner_note}
          </p>
        )}

        <p className="text-xs text-gray-400">
          {t("visits.submitted")} {new Date(visit.requested_at).toLocaleString()}
          {visit.responded_at && (
            <> · {t("visits.responded")} {new Date(visit.responded_at).toLocaleString()}</>
          )}
        </p>

        {children}
      </div>
    </article>
  );
}
