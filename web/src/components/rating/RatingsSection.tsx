import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StarRating } from "./StarRating";
import { RatingModal } from "./RatingModal";
import { getPropertyRatings } from "@/services/api";
import type { PropertyRating, RatingStats } from "@/types";
import { useAuthModal } from "@/context/AuthModalContext";
import { Button } from "@/components/ui/button";

interface RatingsSectionProps {
  propertyId: string;
  averageRating?: number;
  ratingCount?: number;
}

export function RatingsSection({ propertyId, averageRating = 0, ratingCount = 0 }: RatingsSectionProps) {
  const { t } = useTranslation();
  const { requireAuth } = useAuthModal();
  const [reviews, setReviews] = useState<PropertyRating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    getPropertyRatings(propertyId)
      .then(({ ratings, statistics }) => {
        setReviews(ratings);
        setStats(statistics);
      })
      .catch(() => {});
  }, [propertyId, refresh]);

  const avg = stats?.average ?? averageRating;
  const count = stats?.count ?? ratingCount;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("ratings.title")}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={avg} size="sm" />
            <span className="text-sm text-muted-foreground">
              {avg.toFixed(1)} · {t("ratings.count", { count })}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-2 border-brand text-brand"
          onClick={() => requireAuth(() => setModalOpen(true))}
        >
          {t("ratings.writeReview")}
        </Button>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("ratings.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{r.user_name}</p>
                <StarRating value={r.score} size="sm" />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      <RatingModal
        open={modalOpen}
        propertyId={propertyId}
        onClose={() => setModalOpen(false)}
        onSubmitted={() => setRefresh((n) => n + 1)}
      />
    </section>
  );
}
