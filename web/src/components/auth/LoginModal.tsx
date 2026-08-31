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
  onClose: () => void;
  onRegister: () => void;
}

export function LoginModal({ open, onClose, onRegister }: LoginModalProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError("");
    setEmail("");
    setPassword("");
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="font-jakarta">
        <DialogHeader>
          <DialogTitle className="text-brand text-xl font-bold">{t("login.title")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t("login.description")}</p>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

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
          <p className="text-sm text-muted-foreground text-center">
            {t("login.noAccount")}{" "}
            <button type="button" className="text-brand font-medium hover:underline" onClick={onRegister}>
              {t("login.registerLink")}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
