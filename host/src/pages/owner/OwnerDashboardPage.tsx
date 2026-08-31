import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { getProperties, deleteProperty, getOwnerVisitRequests, getMySubscription } from "@/services/api";
import { listingImageUrl } from "@/lib/media";
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("owner.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/owner/subscription")}>
            {t("payments.walletNav")}
          </Button>
          <Button onClick={handleAdd}>{t("owner.addProperty")}</Button>
        </div>
      </div>
      <Card className="border-2 border-brand/20">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-base">{t("payments.walletTitle")}</CardTitle>
          <Button size="sm" className="rounded-full bg-brand hover:bg-brand-dark" onClick={() => navigate("/owner/subscription")}>
            {t("payments.walletManage")}
          </Button>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-4">
          <span className="text-sm text-muted-foreground">{t("payments.walletBalance")}</span>
          <span className="text-2xl font-bold text-brand">
            {formatPrice(Number(wallet?.wallet_balance ?? 0))}
          </span>
        </CardContent>
      </Card>
      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : properties.length === 0 ? (
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
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{p.title}</span>
                    {p.is_active === false && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        {t("owner.draftBadge")}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(p.id)}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
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

