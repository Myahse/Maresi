import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { getProperties, deleteProperty, getOwnerVisitRequests, getMySubscription, publishProperty } from "@/services/api";
import { listingImageUrl } from "@/lib/media";
import { shareListingPage } from "@/lib/listingShare";
import { isApprovedHost } from "@/lib/hostAccess";
import { displayPropertyType } from "@/lib/amenities";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { HostHomeHero } from "@/components/layout/HostHomeHero";
import type { OwnerSubscription, Property, VisitRequest } from "@/types";

export function OwnerDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = usePriceFormatter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [wallet, setWallet] = useState<OwnerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [publishingId, setPublishingId] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const refreshVisits = useCallback(() => {
    return getOwnerVisitRequests()
      .then(setVisits)
      .catch(() => undefined);
  }, []);

  useRealtimeRefresh(refreshVisits);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const hostApproved = isApprovedHost(user);
        const [allProps, myVisits, sub] = await Promise.all([
          getProperties({ mine: true }),
          hostApproved ? getOwnerVisitRequests() : Promise.resolve([] as VisitRequest[]),
          hostApproved ? getMySubscription().catch(() => null) : Promise.resolve(null),
        ]);
        setProperties(allProps);
        setVisits(myVisits);
        setWallet(sub);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("owner.failedLoad"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user, t]);

  const approved = isApprovedHost(user);

  const visibleProperties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return properties.filter((p) => {
      const type = String(displayPropertyType(p.property_type || ""));
      if (typeFilter && type !== typeFilter) return false;
      if (!needle) return true;
      return [p.title, p.location, p.property_type].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      );
    });
  }, [properties, query, typeFilter]);

  const handleAdd = () => {
    navigate("/owner/new");
  };

  const handleEdit = (id: string) => {
    navigate(`/owner/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("owner.deleteConfirm"))) return;
    try {
      await deleteProperty(id);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("owner.deleteFailed"));
    }
  };

  const handlePublish = async (property: Property) => {
    if (!approved) {
      setError(t("owner.publishNeedApproval"));
      navigate("/owner/application");
      return;
    }
    setError("");
    setPublishingId(property.id);
    try {
      const updated = await publishProperty(property.id);
      setProperties((prev) => prev.map((item) => (item.id === property.id ? { ...item, ...updated } : item)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("owner.publishFailed"));
    } finally {
      setPublishingId("");
    }
  };

  const handleShare = async (property: Property) => {
    setShareNote("");
    try {
      const result = await shareListingPage({ id: property.id, title: property.title });
      if (result === "copied") setShareNote(t("owner.linkCopied"));
    } catch {
      /* user cancelled the share sheet */
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">
          {t("owner.mustLogin")}{" "}
          <Link to="/login" className="text-primary hover:underline">
            {t("owner.signIn")}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <HostHomeHero
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />
      <div className="container mx-auto px-4 py-6 sm:py-8 space-y-6">
      {!approved && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {user?.host_status === "rejected" ? t("hostApply.rejectedShort") : t("hostApply.pendingShort")}
          </p>
          <button type="button" className="font-semibold text-brand" onClick={() => navigate("/owner/application")}>
            {t("hostApply.openRequest")}
          </button>
        </div>
      )}
      {approved && (
        <button
          type="button"
          onClick={() => navigate("/owner/subscription")}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
        >
          <span className="text-sm text-muted-foreground">{t("payments.walletAvailable")}</span>
          <span className="text-lg font-bold text-brand">{formatPrice(Number(wallet?.wallet_available ?? 0))}</span>
        </button>
      )}
      {error && <p className="text-destructive">{error}</p>}
      {shareNote && <p className="text-sm text-brand">{shareNote}</p>}
      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : properties.length === 0 ? (
        <p className="text-muted-foreground">
          {t(approved ? "owner.empty" : "owner.emptyUnverified")}{" "}
          <button type="button" className="text-primary hover:underline" onClick={handleAdd}>
            {t(approved ? "owner.addFirst" : "owner.addDraft")}
          </button>
          .
        </p>
      ) : (
        visibleProperties.length === 0 ? (
        <p className="text-muted-foreground">{t("owner.homeHero.noMatch")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleProperties.map((p) => {
            const cover = listingImageUrl(p.images?.[0]);
            return (
              <Card key={p.id} className="overflow-hidden">
                {cover ? (
                  <img
                    src={cover}
                    alt={p.title}
                    className="h-40 w-full object-cover bg-muted"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-40 w-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    {t("propertyDetails.noImage")}
                  </div>
                )}
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2 min-w-0">
                    <span className="break-words">{p.title}</span>
                    {p.is_active === false && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        {t("owner.draftBadge")}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {p.is_active === false && (
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none bg-brand hover:bg-brand-dark"
                        disabled={publishingId === p.id}
                        title={!approved ? t("owner.publishNeedApproval") : undefined}
                        onClick={() => void handlePublish(p)}
                      >
                        {publishingId === p.id ? t("common.saving") : t("owner.publish")}
                      </Button>
                    )}
                    {p.is_active !== false && (
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => void handleShare(p)}>
                        {t("owner.share")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => handleEdit(p.id)}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 sm:flex-none" onClick={() => handleDelete(p.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    {p.location} · {p.property_type}
                  </p>
                  <p className="font-semibold text-brand">{formatPrice(Number(p.price))} <span className="text-muted-foreground font-normal text-xs">{p.price_unit === "day" ? t("common.day") : t("common.night")}</span></p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )
      )}

      {approved && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{t("owner.visitRequests")}</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/owner/visits")}>
              {t("owner.manageVisits")}
            </Button>
          </div>
          {visits.length === 0 ? (
            <p className="text-muted-foreground">{t("owner.noVisits")}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("owner.pendingCount", {
                count: visits.filter((v) => v.status === "pending").length,
              })}
            </p>
          )}
        </section>
      )}
      </div>
    </div>
  );
}

