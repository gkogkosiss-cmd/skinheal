import { useState, useEffect, useCallback } from "react";

/**
 * Hook that tracks the visual viewport height, accounting for
 * on-screen keyboards in webviews (Instagram, etc.) and mobile browsers.
 * Falls back to window.innerHeight when VisualViewport API is unavailable.
 */
export const useVisualViewport = () => {
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== "undefined"
      ? window.visualViewport?.height ?? window.innerHeight
      : 800
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const update = useCallback(() => {
    const vp = window.visualViewport;
    const h = vp ? vp.height : window.innerHeight;
    setViewportHeight(h);
    // Keyboard is "open" when viewport shrinks significantly (>100px less than outer)
    const outer = window.innerHeight;
    setKeyboardOpen(outer - h > 100);
  }, []);

  useEffect(() => {
    const vp = window.visualViewport;
    if (vp) {
      vp.addEventListener("resize", update);
      vp.addEventListener("scroll", update);
    }
    window.addEventListener("resize", update);
    update();

    return () => {
      if (vp) {
        vp.removeEventListener("resize", update);
        vp.removeEventListener("scroll", update);
      }
      window.removeEventListener("resize", update);
    };
  }, [update]);

  return { viewportHeight, keyboardOpen };
};
