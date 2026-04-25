"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook that adds horizontal swipe gestures to navigate between app views.
 * Swipe left  → next view
 * Swipe right → previous view
 */
const VIEWS = ["/tasks", "/all-tasks", "/week", "/board"];

export function useSwipeNavigation(currentPath: string) {
  const router = useRouter();
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    const MIN_SWIPE_X = 60;  // px horizontal threshold
    const MAX_SWIPE_Y = 80;  // px vertical tolerance

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      // If horizontal movement dominates, mark as swipe and prevent scroll
      if (Math.abs(dx) > 15 && dy < MAX_SWIPE_Y) {
        isSwiping.current = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

      if (Math.abs(dx) < MIN_SWIPE_X || dy > MAX_SWIPE_Y) return;

      const currentIdx = VIEWS.indexOf(currentPath);
      if (currentIdx === -1) return;

      if (dx < 0 && currentIdx < VIEWS.length - 1) {
        // Swipe left → next
        router.push(VIEWS[currentIdx + 1]);
      } else if (dx > 0 && currentIdx > 0) {
        // Swipe right → prev
        router.push(VIEWS[currentIdx - 1]);
      }

      isSwiping.current = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [currentPath, router]);
}
