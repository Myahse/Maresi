import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resendVerification, verifyEmail } from "@/services/auth";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const sent = params.get("sent") === "1";
  const [email, setEmail] = useState(params.get("email") || "");
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">(token ? "working" : "idle");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(sent);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(sent ? 20 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("verify.failed"));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    setError("");
    if (!address) {
      setError(t("verify.failed"));
      return;
    }
    setLoading(true);
    try {
      await resendVerification(address);
      setEmail(address);
      setResent(true);
      setCooldown(20);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("verify.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("verify.title")}</CardTitle>
        <CardDescription>{t("verify.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "working" && <p className="text-sm text-muted-foreground">{t("verify.checking")}</p>}
        {status === "ok" && (
          <>
            <p className="text-sm">{t("verify.hostPending")}</p>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              {t("forgot.backToLogin")}
            </Link>
          </>
        )}
        {status === "error" && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
        {status !== "ok" && status !== "working" && (
          <>
            {resent && <p className="text-sm">{t("verify.sent")}</p>}
            {error && status === "idle" && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
            )}
            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || cooldown > 0}>
                {loading
                  ? t("common.saving")
                  : cooldown > 0
                    ? t("verify.resendWait", { seconds: cooldown })
                    : t("verify.resend")}
              </Button>
            </form>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              {t("forgot.backToLogin")}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
