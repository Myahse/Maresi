import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { getProperty, requestVisit } from "@/services/api";
import { useAuthModal } from "@/context/AuthModalContext";
import { useAuth } from "@/hooks/useAuth";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { isFutureDate, isValidDateRange, isValidPhone, isValidIdCard, isPositiveInt } from "@/lib/validation";
import type { Property, VisitRequestPayload } from "@/types";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

export function ReservationPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthModal();
  const { formatPrice } = usePriceFormatter();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [check_in, setCheckIn] = useState("");
  const [check_out, setCheckOut] = useState("");
  const [includeVisit, setIncludeVisit] = useState(searchParams.get("visit") === "1");
  const [visit_date, setVisitDate] = useState("");
  const [visit_time, setVisitTime] = useState("10:00");
  const [guests_count, setGuestsCount] = useState("2");
  const [contact_phone, setContactPhone] = useState("");
  const [id_card, setIdCard] = useState("");
  const [message, setMessage] = useState("");

  const steps = [
    { id: "dates", label: t("wizard.reserve.steps.dates") },
    { id: "visit", label: t("wizard.reserve.steps.visit") },
    { id: "contact", label: t("wizard.reserve.steps.contact") },
    { id: "review", label: t("wizard.reserve.steps.review") },
  ];

  useEffect(() => {
    if (!id) return;
    getProperty(id)
      .then(setProperty)
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      requireAuth(() => {});
    }
  }, [isAuthenticated, requireAuth]);

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 0:
        if (!check_in || !check_out) return t("wizard.reserve.errors.datesRequired");
        if (!isFutureDate(check_in)) return t("wizard.reserve.errors.checkInFuture");
        if (!isValidDateRange(check_in, check_out)) return t("wizard.reserve.errors.checkOutAfter");
        return null;
      case 1:
        if (!includeVisit) return null;
        if (!visit_date) return t("wizard.reserve.errors.visitDate");
        if (!isFutureDate(visit_date)) return t("wizard.reserve.errors.visitFuture");
        if (!visit_time) return t("wizard.reserve.errors.visitTime");
        return null;
      case 2:
        if (!isPositiveInt(guests_count)) return t("wizard.reserve.errors.guests");
        if (property?.max_guests && Number(guests_count) > property.max_guests) {
          return t("wizard.reserve.errors.maxGuests", { max: property.max_guests });
        }
        if (!contact_phone.trim()) return t("wizard.reserve.errors.phone");
        if (!isValidPhone(contact_phone)) return t("wizard.reserve.errors.phoneInvalid");
        if (!isValidIdCard(id_card)) return t("wizard.reserve.errors.idCard");
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  };

  const back = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const submit = () => {
    if (!id) return;
    const err = validateStep(2);
    if (err) {
      setError(err);
      return;
    }
    requireAuth(async () => {
      setSubmitting(true);
      setError("");
      try {
        const payload: VisitRequestPayload = {
          propertyId: id,
          check_in,
          check_out,
          visit_date: includeVisit ? visit_date : undefined,
          visit_time: includeVisit ? visit_time : undefined,
          guests_count: Number(guests_count),
          contact_phone: contact_phone.trim(),
          id_card: id_card.trim(),
          message: message.trim() || undefined,
        };
        await requestVisit(payload);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("wizard.reserve.errors.submit"));
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12">{t("common.loading")}</div>;
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p>{t("propertyDetails.notFound")}</p>
        <Link to="/properties" className="text-brand hover:underline text-sm">
          {t("header.browse")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="font-jakarta max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="h-16 w-16 text-brand mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">{t("wizard.reserve.successTitle")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("wizard.reserve.successText")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button className="rounded-full bg-brand hover:bg-brand-dark" onClick={() => navigate("/visits")}>
            {t("visits.viewMine")}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => navigate(`/properties/${id}`)}>
            {t("wizard.reserve.backToProperty")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-jakarta container mx-auto px-4 py-8 max-w-2xl">
      <Link to={`/properties/${id}`} className="text-sm text-brand hover:underline">
        ← {property.title}
      </Link>
      <h1 className="text-2xl font-bold text-foreground mt-4 mb-2">{t("wizard.reserve.title")}</h1>
      <p className="text-muted-foreground text-sm mb-8">{t("wizard.reserve.subtitle")}</p>

      <Stepper steps={steps} currentStep={step} className="mb-8" />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl mb-4">{error}</p>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-foreground">{t("wizard.reserve.datesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.reserve.datesHint")}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in">{t("wizard.reserve.checkIn")} *</Label>
              <Input id="check_in" type="date" value={check_in} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out">{t("wizard.reserve.checkOut")} *</Label>
              <Input id="check_out" type="date" value={check_out} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-brand font-semibold">
            {t("common.perNight")}: {formatPrice(property.price)}
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-bold text-foreground">{t("wizard.reserve.visitTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.reserve.visitHint")}</p>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={includeVisit}
              onChange={(e) => setIncludeVisit(e.target.checked)}
            />
            {t("wizard.reserve.addVisit")}
          </label>
          {includeVisit && (
          <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visit_date">{t("wizard.reserve.visitDate")} *</Label>
            <Input
              id="visit_date"
              type="date"
              value={visit_date}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visit_time">{t("wizard.reserve.visitTime")} *</Label>
            <Select id="visit_time" value={visit_time} onChange={(e) => setVisitTime(e.target.value)}>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </Select>
          </div>
          </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-bold text-foreground">{t("wizard.reserve.contactTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.reserve.contactHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="guests">{t("wizard.reserve.guests")} *</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={property.max_guests ?? 20}
              value={guests_count}
              onChange={(e) => setGuestsCount(e.target.value)}
            />
            {property.max_guests && (
              <p className="text-xs text-muted-foreground">{t("wizard.reserve.maxGuestsHint", { max: property.max_guests })}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("wizard.reserve.phone")} *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+225 07 00 00 00 00"
              value={contact_phone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_card">{t("wizard.reserve.idCard")} *</Label>
            <Input
              id="id_card"
              placeholder={t("wizard.reserve.idCardHint")}
              value={id_card}
              onChange={(e) => setIdCard(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t("wizard.reserve.message")}</Label>
            <textarea
              id="message"
              className="w-full min-h-[100px] rounded-xl border border-input px-3 py-2 text-sm"
              placeholder={t("common.optional")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-bold text-foreground">{t("wizard.reserve.reviewTitle")}</h2>
          <dl className="rounded-2xl border-2 border-border divide-y text-sm">
            <div className="p-4">
              <dt className="text-muted-foreground">{t("common.property")}</dt>
              <dd className="font-bold text-foreground">{property.title}</dd>
            </div>
            <div className="p-4">
              <dt className="text-muted-foreground">{t("wizard.reserve.stay")}</dt>
              <dd className="font-semibold">
                {check_in} → {check_out}
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-muted-foreground">{t("wizard.reserve.visitSlot")}</dt>
              <dd className="font-semibold">
                {includeVisit ? `${visit_date} · ${visit_time}` : t("wizard.reserve.visitSkipped")}
              </dd>
            </div>
            <div className="p-4 flex justify-between">
              <dt className="text-muted-foreground">{t("wizard.reserve.guests")}</dt>
              <dd className="font-semibold">{guests_count}</dd>
            </div>
            <div className="p-4 flex justify-between">
              <dt className="text-muted-foreground">{t("wizard.reserve.phone")}</dt>
              <dd className="font-semibold">{contact_phone}</dd>
            </div>
            <div className="p-4 flex justify-between">
              <dt className="text-muted-foreground">{t("wizard.reserve.idCard")}</dt>
              <dd className="font-semibold">{id_card}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">{t("wizard.reserve.validationNote")}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-8">
        {step > 0 && (
          <Button type="button" variant="outline" className="rounded-full" onClick={back}>
            {t("wizard.back")}
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button type="button" className="rounded-full bg-brand hover:bg-brand-dark ml-auto" onClick={next}>
            {t("wizard.next")}
          </Button>
        ) : (
          <Button
            type="button"
            className="rounded-full bg-brand hover:bg-brand-dark ml-auto"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? t("common.saving") : t("wizard.reserve.submit")}
          </Button>
        )}
      </div>
    </div>
  );
}
