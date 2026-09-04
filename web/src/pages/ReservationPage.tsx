import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { WizardPane } from "@/components/ui/WizardPane";
import { getMyProfile, getProperty, requestVisit } from "@/services/api";
import { useAuthModal } from "@/context/AuthModalContext";
import { useAuth } from "@/hooks/useAuth";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { isFutureDate, isValidDateRange, isValidPhone, isValidIdCard, isPositiveInt } from "@/lib/validation";
import type { Property, VisitRequestPayload } from "@/types";

export function ReservationPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
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
  const [arrivalTime, setArrivalTime] = useState("14:00");
  const [departureTime, setDepartureTime] = useState("12:00");
  const [guests_count, setGuestsCount] = useState("2");
  const [contact_phone, setContactPhone] = useState("");
  const [id_card, setIdCard] = useState("");
  const [message, setMessage] = useState("");
  const [agreementName, setAgreementName] = useState("");
  const [agreementChecks, setAgreementChecks] = useState([false, false, false, false, false]);

  const steps = [
    { id: "dates", label: t("wizard.reserve.steps.dates") },
    { id: "contact", label: t("wizard.reserve.steps.contact") },
    { id: "agreement", label: t("wizard.reserve.steps.agreement") },
    { id: "review", label: t("wizard.reserve.steps.review") },
  ];

  useEffect(() => {
    if (!id) return;
    getProperty(id)
      .then((listing) => {
        setProperty(listing);
        if (listing.check_in_time) setArrivalTime(String(listing.check_in_time).slice(0, 5));
        if (listing.check_out_time) setDepartureTime(String(listing.check_out_time).slice(0, 5));
      })
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      requireAuth(() => {});
    }
  }, [isAuthenticated, requireAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.phone && !contact_phone) setContactPhone(user.phone);
    void getMyProfile()
      .then((profile) => {
        if (profile.id_card) setIdCard(profile.id_card);
        if (profile.phone) setContactPhone((current) => current || profile.phone || "");
      })
      .catch(() => undefined);
  }, [isAuthenticated, user?.phone]);

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 0:
        if (!check_in || !check_out) return t("wizard.reserve.errors.datesRequired");
        if (!isFutureDate(check_in)) return t("wizard.reserve.errors.checkInFuture");
        if (!isValidDateRange(check_in, check_out)) return t("wizard.reserve.errors.checkOutAfter");
        if (!arrivalTime || !departureTime) return t("wizard.reserve.errors.timesRequired");
        if (check_in === check_out && arrivalTime >= departureTime) {
          return t("wizard.reserve.errors.timesOrder");
        }
        return null;
      case 1:
        if (!isPositiveInt(guests_count)) return t("wizard.reserve.errors.guests");
        if (property?.max_guests && Number(guests_count) > property.max_guests) {
          return t("wizard.reserve.errors.maxGuests", { max: property.max_guests });
        }
        if (!contact_phone.trim()) return t("wizard.reserve.errors.phone");
        if (!isValidPhone(contact_phone)) return t("wizard.reserve.errors.phoneInvalid");
        if (!isValidIdCard(id_card)) return t("wizard.reserve.errors.idCard");
        return null;
      case 2:
        if (!agreementChecks.every(Boolean)) return t("wizard.reserve.errors.agreementChecks");
        if (agreementName.trim().length < 3) return t("wizard.reserve.errors.agreementName");
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
    const err = validateStep(1);
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
          arrival_time: arrivalTime,
          departure_time: departureTime,
          guests_count: Number(guests_count),
          contact_phone: contact_phone.trim(),
          id_card: id_card.trim(),
          message: message.trim() || undefined,
          agreement_full_name: agreementName.trim(),
          agreement_accepted: true,
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
    <div className="font-jakarta container mx-auto px-4 pt-6 pb-28 md:py-8 max-w-2xl">
      <Link to={`/properties/${id}`} className="text-sm text-brand hover:underline">
        ← {property.title}
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-3 mb-2">{t("wizard.reserve.title")}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t("wizard.reserve.subtitle")}</p>

      <Stepper steps={steps} currentStep={step} className="mb-8" />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl mb-4">{error}</p>
      )}

      {step === 0 && (
        <WizardPane step={0}>
          <h2 className="font-bold text-foreground">{t("wizard.reserve.datesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.reserve.datesHint")}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in">{t("wizard.reserve.checkIn")} *</Label>
              <Input id="check_in" type="date" value={check_in} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival_time">{t("wizard.reserve.arrivalTime")} *</Label>
              <Input
                id="arrival_time"
                type="time"
                step={900}
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out">{t("wizard.reserve.checkOut")} *</Label>
              <Input id="check_out" type="date" value={check_out} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure_time">{t("wizard.reserve.departureTime")} *</Label>
              <Input
                id="departure_time"
                type="time"
                step={900}
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>
          </div>
          {(property.check_in_time || property.check_out_time) && (
            <p className="text-sm text-muted-foreground">
              {t("wizard.reserve.houseHoursHint", {
                arrival: String(property.check_in_time || "14:00").slice(0, 5),
                departure: String(property.check_out_time || "12:00").slice(0, 5),
              })}
            </p>
          )}
          <p className="text-sm text-brand font-semibold">
            {property.price_unit === "day" ? t("common.perDay") : t("common.perNight")}: {formatPrice(property.price)}
          </p>
        </WizardPane>
      )}

      {step === 1 && (
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
              className="w-full min-h-[100px] rounded-xl border border-input px-3 py-2 text-base sm:text-sm"
              placeholder={t("common.optional")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-bold text-foreground">{t("wizard.reserve.agreementTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.reserve.agreementHint")}</p>
          <section className="space-y-2 text-sm leading-relaxed text-foreground bg-muted/60 border border-border rounded-xl p-4">
            <p>{t("visits.agreementPreamble")}</p>
          </section>
          <label className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-3 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              checked={agreementChecks.every(Boolean)}
              onChange={(e) => setAgreementChecks(agreementChecks.map(() => e.target.checked))}
            />
            {t("visits.agreementAcceptAll")}
          </label>
          <ol className="space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} className="flex gap-3 text-sm leading-relaxed text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 h-4 w-4 accent-brand"
                  checked={agreementChecks[n - 1]}
                  onChange={() =>
                    setAgreementChecks((prev) => prev.map((v, i) => (i === n - 1 ? !v : v)))
                  }
                />
                <span>
                  <span className="font-semibold">{t("visits.agreementArticle", { n })} — </span>
                  {t(`visits.agreementArt${n}`)}
                </span>
              </li>
            ))}
          </ol>
          <div className="space-y-2">
            <Label htmlFor="agreementName">{t("visits.agreementSignAs")}</Label>
            <Input
              id="agreementName"
              value={agreementName}
              onChange={(e) => setAgreementName(e.target.value)}
              placeholder={t("visits.agreementNamePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("visits.agreementSignLegal")}</p>
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
                {check_in} {arrivalTime} → {check_out} {departureTime}
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

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0 md:mt-8">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {step > 0 && (
            <Button type="button" variant="outline" className="rounded-full flex-1 md:flex-none" onClick={back}>
              {t("wizard.back")}
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button type="button" className="rounded-full bg-brand hover:bg-brand-dark flex-1 md:ml-auto md:flex-none" onClick={next}>
              {t("wizard.next")}
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-full bg-brand hover:bg-brand-dark flex-1 md:ml-auto md:flex-none"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? t("common.saving") : t("wizard.reserve.submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


