import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginModalProps {
  open: boolean;
  tab: "login" | "register";
  onTabChange: (tab: "login" | "register") => void;
  onClose: () => void;
}

export function LoginModal({ open, tab, onTabChange, onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError("");
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({
        email,
        password,
        full_name: fullName,
        phone: phone.trim() || undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="font-jakarta">
        <DialogHeader>
          <DialogTitle className="text-brand text-xl font-bold">
            {tab === "login" ? t("login.title") : t("register.title")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {tab === "login" ? t("login.description") : t("register.description")}
          </p>
        </DialogHeader>

        <div className="flex gap-2 p-1 bg-muted rounded-full">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
              tab === "login" ? "bg-brand text-white" : "text-gray-600"
            }`}
            onClick={() => onTabChange("login")}
          >
            {t("login.submit")}
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
              tab === "register" ? "bg-brand text-white" : "text-gray-600"
            }`}
            onClick={() => onTabChange("register")}
          >
            {t("register.submit")}
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-email">{t("common.email")}</Label>
              <Input
                id="modal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-password">{t("common.password")}</Label>
              <Input
                id="modal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-brand hover:bg-brand-dark rounded-full" disabled={loading}>
              {loading ? t("common.signingIn") : t("login.submit")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-name">{t("register.fullName")}</Label>
              <Input id="modal-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-reg-email">{t("common.email")}</Label>
              <Input
                id="modal-reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-reg-password">{t("common.password")}</Label>
              <Input
                id="modal-reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-reg-phone">{t("register.phoneOptional")}</Label>
              <Input
                id="modal-reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-brand hover:bg-brand-dark rounded-full" disabled={loading}>
              {loading ? t("common.creatingAccount") : t("register.submit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
