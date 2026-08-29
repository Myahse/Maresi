import { useTranslation } from "react-i18next";
import { Calendar, Clock, Users, Phone, MapPin, MessageSquare } from "lucide-react";
import type { VisitRequest, VisitRequestStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<VisitRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  awaiting_payment: "bg-sky-100 text-sky-800 border-sky-200",
  payment_sent: "bg-violet-100 text-violet-800 border-violet-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
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

export function VisitRequestCard({ visit, showRequester, children }: VisitRequestCardProps) {
  const { t } = useTranslation();

  return (
    <article className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden">
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">{visit.property_title ?? t("common.property")}</h3>
            {visit.location && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
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

        {showRequester && (visit.requester_name || visit.requester_email) && (
          <p className="text-sm text-gray-600">
            {t("visits.requester")}:{" "}
            <span className="font-semibold text-gray-900">
              {visit.requester_name}
              {visit.requester_email ? ` · ${visit.requester_email}` : ""}
            </span>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {visit.check_in && visit.check_out && (
            <div className="flex items-start gap-2 text-gray-700">
              <Calendar className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{t("visits.stayDates")}</p>
                <p>
                  {formatDate(visit.check_in)} → {formatDate(visit.check_out)}
                </p>
              </div>
            </div>
          )}
          {visit.visit_date && (
            <div className="flex items-start gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{t("visits.visitSlot")}</p>
                <p>
                  {formatDate(visit.visit_date)}
                  {visit.visit_time ? ` · ${visit.visit_time}` : ""}
                </p>
              </div>
            </div>
          )}
          {visit.guests_count != null && (
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="h-4 w-4 text-brand shrink-0" />
              <span>
                {visit.guests_count} {t("visits.guests")}
              </span>
            </div>
          )}
          {visit.contact_phone && (
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="h-4 w-4 text-brand shrink-0" />
              <a href={`tel:${visit.contact_phone}`} className="hover:text-brand">
                {visit.contact_phone}
              </a>
            </div>
          )}
        </div>

        {visit.message && (
          <div className="flex gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
            <MessageSquare className="h-4 w-4 shrink-0 text-brand" />
            <p className="whitespace-pre-wrap">{visit.message}</p>
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
