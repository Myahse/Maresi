import { useEffect, useState } from "react";
import { isBrowserOnline, onOfflineChange, queueCount } from "@/lib/offline";

export function useNetworkStatus() {
  const [online, setOnline] = useState(isBrowserOnline());
  const [pending, setPending] = useState(queueCount());

  useEffect(() => {
    const sync = () => {
      setOnline(isBrowserOnline());
      setPending(queueCount());
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const unsubscribe = onOfflineChange(sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      unsubscribe();
    };
  }, []);

  return { online, pending };
}
