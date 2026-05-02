"use client";

import { useState, useEffect, useRef } from "react";

interface UseCounterOptions {
  target: number;
  /** Duration override in ms. Defaults to auto (8ms/tick fast, 20ms/tick slow) */
  duration?: number;
  /** Delay before starting (ms) */
  delay?: number;
}

/**
 * Ticks a number from 0 → target.
 * Fast phase: +1 every 8ms until the last 20% of the value.
 * Slow "locking in" phase: +1 every 20ms for the final 20%.
 * Gated by IntersectionObserver — won't fire until the ref is in view.
 */
export function useCounter({ target, delay = 0 }: UseCounterOptions) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  // IntersectionObserver gate
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setTimeout(() => setHasStarted(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, hasStarted]);

  // Tick-up
  useEffect(() => {
    if (!hasStarted || target === 0) return;

    let current = 0;
    const threshold = Math.floor(target * 0.8);
    let rafId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (current >= target) {
        setCount(target);
        return;
      }

      current++;
      setCount(current);

      const interval = current < threshold ? 8 : 20;
      rafId = setTimeout(tick, interval);
    };

    rafId = setTimeout(tick, 8);
    return () => clearTimeout(rafId);
  }, [hasStarted, target]);

  return { count, ref };
}
