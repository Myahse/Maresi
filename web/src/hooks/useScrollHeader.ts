import { useCallback, useEffect, useState } from "react";

interface UseScrollHeaderOptions {
  /** Keep header visible (e.g. map browse page). */
  disabled?: boolean;
}

/** Hide header on scroll down, show on scroll up (immo rental pattern). */
export function useScrollHeader({ disabled = false }: UseScrollHeaderOptions = {}) {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [lastY, setLastY] = useState(0);

  const onScroll = useCallback(() => {
    if (disabled) {
      setVisible(true);
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const atBottom = y + winHeight >= docHeight - 50;

    if (y <= 100 || atBottom) {
      setVisible(true);
      setLastY(y);
      return;
    }

    if (Math.abs(y - lastY) < 15) return;

    if (y < lastY) setVisible(true);
    else if (y > lastY) setVisible(false);

    setLastY(y);
  }, [disabled, lastY]);

  useEffect(() => {
    if (disabled) {
      setVisible(true);
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        onScroll();
        timeout = null;
      }, 16);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      if (timeout) clearTimeout(timeout);
    };
  }, [disabled, onScroll]);

  return { visible, hovered, setHovered };
}
