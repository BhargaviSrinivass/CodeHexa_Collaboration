import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === "undefined" ? "desktop" : getBreakpoint(window.innerWidth)
  );

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    breakpoint: bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
    isCompact: bp === "mobile" || bp === "tablet",
  };
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setMatches(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return matches;
}
