import type { TFunction } from "i18next";
import type { RealtimeEvent } from "@/types";

export type InAppAlert = {
  title: string;
  body?: string;
  href?: string;
};

const ACCEPT_STATUSES = new Set([
  "accepted",
  "awaiting_host_agreement",
  "awaiting_agreement",
  "awaiting_key",
  "awaiting_payment",
]);

export function chatPathFor(visitId: string, host: boolean) {
  return host ? `/owner/visits/${visitId}/chat` : `/visits/${visitId}/chat`;
}

export function isOnVisitChat(pathname: string, visitId: string) {
  return (
    pathname.includes(`/visits/${visitId}/chat`) || pathname.includes(`/owner/visits/${visitId}/chat`)
  );
}

function previewText(event: RealtimeEvent, t: TFunction) {
  const body = String(event.data?.body ?? "").trim();
  if (body) return body.length > 80 ? `${body.slice(0, 77)}…` : body;
  if (event.data?.attachment_name) return String(event.data.attachment_name);
  return t("visits.chatAttach");
}

export function alertFromRealtime(
  event: RealtimeEvent,
  userId: string | undefined,
  t: TFunction,
  host: boolean
): InAppAlert | null {
  if (!userId) return null;
  const data = event.data ?? {};
  const listing = String(data.property_title ?? "").trim();
  const visitId =
    data.visit_request_id != null
      ? String(data.visit_request_id)
      : data.id != null
        ? String(data.id)
        : "";
  const visitsHref = host ? "/owner/visits" : "/visits";

  if (event.type === "visit.created") {
    if (String(data.user_id) === String(userId)) return null;
    return {
      title: t("alerts.reservationNew"),
      body: listing || undefined,
      href: visitsHref,
    };
  }

  if (event.type === "visit.status_changed") {
    const status = String(data.status ?? "");
    if (ACCEPT_STATUSES.has(status)) {
      return {
        title: t("alerts.reservationAccepted"),
        body: listing ? t("alerts.reservationAcceptedBody", { title: listing }) : t(`visits.status.${status}`),
        href: visitsHref,
      };
    }
    if (status === "declined") {
      return { title: t("alerts.reservationDeclined"), body: listing || undefined, href: visitsHref };
    }
    return {
      title: t("alerts.reservationUpdated"),
      body: listing
        ? t("alerts.reservationUpdatedBody", { title: listing, status: t(`visits.status.${status}`, { defaultValue: status }) })
        : t(`visits.status.${status}`, { defaultValue: status }),
      href: visitsHref,
    };
  }

  if (event.type === "visit.message") {
    if (String(data.sender_id) === String(userId)) return null;
    if (!visitId) return null;
    if (typeof window !== "undefined" && isOnVisitChat(window.location.pathname, visitId)) return null;
    const sender = String(data.sender_name ?? t("visits.chatOther"));
    return {
      title: t("alerts.newMessage"),
      body: t("alerts.newMessageBody", { sender, preview: previewText(event, t) }),
      href: chatPathFor(visitId, host),
    };
  }

  return null;
}
