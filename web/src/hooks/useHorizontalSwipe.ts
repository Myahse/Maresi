import { useRef, type PointerEvent } from "react";

const THRESHOLD = 36;

export function useHorizontalSwipe(onSwipe: (direction: -1 | 1) => void, enabled = true) {
  const startX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const consumeSwipe = () => {
    if (!didSwipe.current) return false;
    didSwipe.current = false;
    return true;
  };

  return {
    consumeSwipe,
    handlers: {
      onPointerDown: (event: PointerEvent) => {
        startX.current = event.clientX;
        didSwipe.current = false;
      },
      onPointerMove: (event: PointerEvent) => {
        if (startX.current == null) return;
        if (Math.abs(event.clientX - startX.current) > THRESHOLD) didSwipe.current = true;
      },
      onPointerUp: (event: PointerEvent) => {
        const start = startX.current;
        startX.current = null;
        if (start == null || !enabled || !didSwipe.current) return;
        const dx = event.clientX - start;
        if (Math.abs(dx) > THRESHOLD) onSwipe(dx < 0 ? 1 : -1);
      },
      onPointerCancel: () => {
        startX.current = null;
      },
    },
  };
}
