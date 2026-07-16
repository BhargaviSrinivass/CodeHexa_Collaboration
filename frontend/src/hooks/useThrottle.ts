import { useCallback, useRef } from "react";

export function useThrottle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestArgs = useRef<Parameters<T> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      latestArgs.current = args;
      const remaining = ms - (now - last.current);
      if (remaining <= 0) {
        last.current = now;
        fn(...args);
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          last.current = Date.now();
          timer.current = null;
          if (latestArgs.current) fn(...latestArgs.current);
        }, remaining);
      }
    }) as T,
    [fn, ms]
  );
}

export function useDebounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), ms);
    }) as T,
    [fn, ms]
  );
}
