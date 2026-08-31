import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  dismissPushPrompt,
  enablePush,
  isIosDevice,
  isPushDismissed,
  isStandaloneDisplay,
  pushSupported,
  syncPushSubscription,
  type PushApp,
} from "@/lib/push";

export function PushPrompt({ app }: { app: PushApp }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return;
    }
    if (!pushSupported()) {
      const iosNeedsInstall = isIosDevice() && !isStandaloneDisplay();
      if (iosNeedsInstall && !isPushDismissed()) {
        setIosHint(true);
        setVisible(true);
      } else {
        setVisible(false);
      }
      return;
    }
    if (Notification.permission === "granted") {
      void syncPushSubscription(app).catch(() => undefined);
      setVisible(false);
      return;
    }
    if (isPushDismissed() || Notification.permission === "denied") {
      setVisible(false);
      return;
    }
    setIosHint(isIosDevice() && !isStandaloneDisplay());
    setVisible(true);
  }, [isAuthenticated, app]);

  if (!visible) return null;

  const close = () => {
    dismissPushPrompt();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96 rounded-2xl border bg-card p-4 shadow-lg">
      <p className="font-semibold text-foreground">{t("push.title")}</p>
      <p className="text-sm text-muted-foreground mt-1">{iosHint ? t("push.iosInstall") : t("push.body")}</p>
      <div className="flex gap-2 mt-3">
        {!iosHint && (
          <Button
            className="rounded-full bg-brand hover:bg-brand-dark"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void enablePush(app)
                .then((ok) => {
                  if (ok) setVisible(false);
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? t("common.saving") : t("push.enable")}
          </Button>
        )}
        <Button variant="outline" className="rounded-full" onClick={close}>
          {t("push.later")}
        </Button>
      </div>
    </div>
  );
}
