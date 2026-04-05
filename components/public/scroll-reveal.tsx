"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  threshold?: number;
}

const TRANSLATE: Record<Direction, string> = {
  up: "translateY(32px)",
  down: "translateY(-32px)",
  left: "translateX(-32px)",
  right: "translateX(32px)",
  none: "none",
};

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 600,
  className,
  once = true,
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : TRANSLATE[direction],
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Staggered children wrapper - each direct child gets an incremental delay.
 */
interface StaggerProps {
  children: ReactNode;
  staggerDelay?: number;
  direction?: Direction;
  className?: string;
  childClassName?: string;
}

export function ScrollRevealStagger({
  children,
  staggerDelay = 100,
  direction = "up",
  className,
  childClassName,
}: StaggerProps) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={className}>
      {items.map((child, i) => (
        <ScrollReveal
          key={i}
          direction={direction}
          delay={i * staggerDelay}
          className={childClassName}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}
