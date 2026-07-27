"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

/**
 * Loads only the DOM animation feature set (not the full motion bundle),
 * enforces the lightweight `m` component via `strict`, and honors the user's
 * reduced-motion preference globally. Wrap any surface that animates.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
