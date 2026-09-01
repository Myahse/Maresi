import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { CLIENT_APP_URL } from "@/lib/clientApp";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/owner";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.user.role !== "owner") {
        logout();
        setError(t("hostGate.wrongRole"));
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("login.title")}</CardTitle>
        <CardDescription>Maresi Host</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.signingIn") : t("login.submit")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <a href={`${CLIENT_APP_URL.replace(/\/$/, "")}/register?intent=host`} className="text-brand font-medium hover:underline">
              {t("login.registerOnClient")}
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
