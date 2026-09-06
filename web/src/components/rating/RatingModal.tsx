import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { submitPropertyRating } from "@/services/api";

interface RatingModalProps {
  open: boolean;
  propertyId: string;
  existingScore?: number | null;
  onClose: () => void;
  onSubmitted: (review?: import("@/types").PropertyRating) => void;
}

export function RatingModal({ open, propertyId, existingScore, onClose, onSubmitted }: RatingModalProps) {
  const { t } = useTranslation();
  const lockedScore = existingScore != null && existingScore > 0 ? existingScore : null;
  const [score, setScore] = useState(lockedScore ?? 5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedScore && !comment.trim()) {
      setError(t("ratings.commentRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const saved = await submitPropertyRating(propertyId, lockedScore ?? score, comment);
      onSubmitted(saved);
      onClose();
      setComment("");
      if (!lockedScore) setScore(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ratings.submitFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="font-jakarta">
        <DialogHeader>
          <DialogTitle>{lockedScore ? t("ratings.addReview") : t("ratings.writeReview")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {lockedScore ? t("ratings.markLocked") : t("ratings.yourRating")}
            </p>
            <StarRating value={lockedScore ?? score} interactive={!lockedScore} onChange={setScore} />
          </div>
          <textarea
            className="w-full min-h-[100px] rounded-xl border border-input px-3 py-2 text-sm"
            placeholder={t("ratings.commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={!!lockedScore}
          />
          <Button type="submit" className="w-full bg-brand hover:bg-brand-dark rounded-full" disabled={loading}>
            {loading ? t("common.saving") : t("ratings.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
