"use client";

import { useRef, useEffect, useState, type MutableRefObject } from "react";

interface ParallaxTransform {
  rotateX: number;
  rotateY: number;
}

/**
 * Returns real-time card tilt from mouse position.
 * Clamps to ±maxDeg on both axes.
 */
export function useParallax(maxDeg = 8): {
  ref: MutableRefObject<HTMLDivElement | null>;
  transform: ParallaxTransform;
} {
  const ref = useRef<HTMLDivElement>(null) as MutableRefObject<HTMLDivElement | null>;
  const [transform, setTransform] = useState<ParallaxTransform>({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      setTransform({
        rotateX: -dy * maxDeg,
        rotateY: dx * maxDeg,
      });
    };

    const handleMouseLeave = () => {
      setTransform({ rotateX: 0, rotateY: 0 });
    };

    const el = ref.current;
    if (el) {
      el.addEventListener("mousemove", handleMouseMove);
      el.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (el) {
        el.removeEventListener("mousemove", handleMouseMove);
        el.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [maxDeg]);

  return { ref, transform };
}
