import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isHostAppUser } from "@/lib/hostAccess";
import { HOST_APP_URL, hostHandoffUrl } from "@/lib/hostApp";
import { submitHostApplication } from "@/services/api";

export function BecomeHostPage() {
  const { user, isAuthenticated, patchUser } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      window.location.assign("/register?intent=host");
      return;
    }
    if (isHostAppUser(user)) return;
    if (started.current) return;
    started.current = true;
    const name = (user.full_name || "").trim();
    const phone = (user.phone || "").trim();
    const goHost = () => {
      const token = localStorage.getItem("token");
      const next = { ...user, host_status: "pending" as const };
      patchUser({ host_status: "pending" });
      window.location.assign(token ? hostHandoffUrl({ token, user: next }) : HOST_APP_URL);
    };
    if (!name || !phone) {
      window.location.assign("/account");
      return;
    }
    submitHostApplication({ full_name: name, phone: phone })
      .then((created) => {
        const token =
          typeof created.token === "string" && created.token
            ? created.token
            : localStorage.getItem("token");
        const next = { ...user, role: "owner" as const, host_status: "pending" as const };
        patchUser({ role: "owner", host_status: "pending" });
        window.location.assign(token ? hostHandoffUrl({ token, user: next }) : HOST_APP_URL);
      })
      .catch(goHost);
  }, [isAuthenticated, user, patchUser]);

  return null;
}
