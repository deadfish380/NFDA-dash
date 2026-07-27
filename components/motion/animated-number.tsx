"use client";

import { m, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/**
 * Smoothly tweens between values when `value` changes. Used on live-quote
 * figures so numbers glide instead of snapping — reads as "the system
 * responded", the core feel goal for the estimate builder.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.6 });
  const text = useTransform(spring, (v) => format(v));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <m.span>{text}</m.span>;
}
