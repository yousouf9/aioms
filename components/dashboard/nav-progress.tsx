"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { usePathname } from "next/navigation";

const NavProgressContext = createContext<{ isNavigating: boolean; pendingHref: string | null }>({
  isNavigating: false,
  pendingHref: null,
});

export function useNavProgress() {
  return useContext(NavProgressContext);
}

export function NavProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // When pathname changes, navigation is complete
  useEffect(() => {
    setIsNavigating(false);
    setPendingHref(null);
    setProgress(100);
    const timer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Listen for click on internal links to start progress
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (href !== pathname) {
        setIsNavigating(true);
        setPendingHref(href);
        setVisible(true);
        setProgress(20);
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // Animate progress while navigating
  useEffect(() => {
    if (!isNavigating) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + (90 - p) * 0.1;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isNavigating]);

  return (
    <NavProgressContext.Provider value={{ isNavigating, pendingHref }}>
      {visible && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-[3px]">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
          />
        </div>
      )}
      {children}
    </NavProgressContext.Provider>
  );
}
