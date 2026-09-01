import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { consumeHostIntent } from "@/lib/hostIntent";
import { isHostAppUser } from "@/lib/hostAccess";
import { hostHandoffUrl } from "@/lib/hostApp";
import { isWakingError } from "@/services/api";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as { from?: { pathname?: string; search?: string } })?.from;
  const from = fromLocation?.pathname
    ? `${fromLocation.pathname}${fromLocation.search ?? ""}`
    : "/properties";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      consumeHostIntent();
      if (isHostAppUser(res.user)) {
        window.location.assign(hostHandoffUrl(res));
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        isWakingError(err) ? t("login.serverStarting") : err instanceof Error ? err.message : t("login.failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("login.title")}</CardTitle>
        <CardDescription>{t("login.description")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">{t("common.password")}</Label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                {t("login.forgot")}
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.signingIn") : t("login.submit")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t("login.registerLink")}
            </Link>
          </p>
          <Link
            to={email.trim() ? `/verify-email?email=${encodeURIComponent(email.trim())}` : "/verify-email"}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("verify.resend")}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
