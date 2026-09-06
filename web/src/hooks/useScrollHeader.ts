import { useEffect, useRef, useState } from "react";

interface UseScrollHeaderOptions {
  /** Keep chrome visible (e.g. map browse page). */
  disabled?: boolean;
  /** Reset to visible when this changes (usually the route). */
  resetKey?: string;
}

function scrollTopFromEvent(event: Event) {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target !== document.documentElement &&
    target !== document.body &&
    target.scrollHeight > target.clientHeight + 8
  ) {
    return target.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/** Hide chrome on scroll down, show on scroll up. */
export function useScrollHeader({ disabled = false, resetKey }: UseScrollHeaderOptions = {}) {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    setVisible(true);
    lastY.current = 0;
  }, [resetKey]);

  useEffect(() => {
    if (disabled) {
      setVisible(true);
      return;
    }

    let frame = 0;
    const onScroll = (event: Event) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = scrollTopFromEvent(event);
        if (y <= 24) {
          setVisible(true);
          lastY.current = y;
          return;
        }
        const delta = y - lastY.current;
        if (Math.abs(delta) < 8) return;
        setVisible(delta < 0);
        lastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [disabled]);

  return { visible, hovered, setHovered };
}
