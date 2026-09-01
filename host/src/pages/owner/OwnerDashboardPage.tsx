import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { getProperties, deleteProperty, getOwnerVisitRequests, getMySubscription } from "@/services/api";
import { listingImageUrl } from "@/lib/media";
import { shareListingPage } from "@/lib/listingShare";
import { isApprovedHost } from "@/lib/hostAccess";
import { usePriceFormatter } from "@/context/CurrencyContext";
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
        const [allProps, myVisits, sub] = await Promise.all([
          getProperties({ mine: true }),
          getOwnerVisitRequests(),
          getMySubscription().catch(() => null),
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

  const handleAdd = () => {
    navigate(approved ? "/owner/new" : "/owner/application");
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
    <div className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t("owner.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate("/owner/account")}>
            {t("account.title")}
          </Button>
          {approved ? (
            <>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => navigate("/owner/subscription")}
              >
                {t("payments.walletNav")}
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={handleAdd}>
                {t("owner.addProperty")}
              </Button>
            </>
          ) : (
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate("/owner/application")}>
              {t("hostApply.title")}
            </Button>
          )}
        </div>
      </div>
      {!approved && (
        <Card className="border-2 border-brand/30 bg-brand/5">
          <CardContent className="pt-6 space-y-2">
            <p className="font-semibold">
              {user?.host_status === "rejected" ? t("hostApply.rejected") : t("hostApply.pending")}
            </p>
            <p className="text-sm text-muted-foreground">
              {user?.host_status === "rejected" ? t("hostApply.fixHint") : t("hostApply.pendingHint")}
            </p>
            <Button variant="outline" onClick={() => navigate("/owner/application")}>
              {t("hostApply.openRequest")}
            </Button>
          </CardContent>
        </Card>
      )}
      {approved && (
        <Card className="border-2 border-brand/20">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base">{t("payments.walletTitle")}</CardTitle>
            <Button size="sm" className="rounded-full bg-brand hover:bg-brand-dark" onClick={() => navigate("/owner/subscription")}>
              {t("payments.walletManage")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-end justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t("payments.walletBalance")}</span>
              <span className="text-2xl font-bold text-brand">
                {formatPrice(Number(wallet?.wallet_balance ?? 0))}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t("payments.walletHeld")}</span>
              <span className="font-semibold">{formatPrice(Number(wallet?.wallet_held ?? 0))}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t("payments.walletAvailable")}</span>
              <span className="font-semibold">{formatPrice(Number(wallet?.wallet_available ?? 0))}</span>
            </div>
          </CardContent>
        </Card>
      )}
      {error && <p className="text-destructive">{error}</p>}
      {shareNote && <p className="text-sm text-brand">{shareNote}</p>}
      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !approved ? null : properties.length === 0 ? (
        <p className="text-muted-foreground">
          {t("owner.empty")}{" "}
          <button type="button" className="text-primary hover:underline" onClick={handleAdd}>
            {t("owner.addFirst")}
          </button>
          .
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((p) => {
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
                  <p className="font-semibold text-brand">{formatPrice(Number(p.price))}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
}

