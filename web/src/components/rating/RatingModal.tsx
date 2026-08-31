import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { submitPropertyRating } from "@/services/api";

interface RatingModalProps {
  open: boolean;
  propertyId: string;
  onClose: () => void;
  onSubmitted: (review?: import("@/types").PropertyRating) => void;
}

export function RatingModal({ open, propertyId, onClose, onSubmitted }: RatingModalProps) {
  const { t } = useTranslation();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const saved = await submitPropertyRating(propertyId, score, comment);
      onSubmitted(saved);
      onClose();
      setComment("");
      setScore(5);
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
          <DialogTitle>{t("ratings.writeReview")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <StarRating value={score} interactive onChange={setScore} />
          <textarea
            className="w-full min-h-[100px] rounded-xl border border-input px-3 py-2 text-sm"
            placeholder={t("ratings.commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit" className="w-full bg-brand hover:bg-brand-dark rounded-full" disabled={loading}>
            {loading ? t("common.saving") : t("ratings.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
