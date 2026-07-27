"use client";

import { m } from "motion/react";
import { pageTransition } from "@/lib/motion";

/** Gentle enter transition on every route change — feedback, not decoration. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      variants={pageTransition}
      initial="hidden"
      animate="show"
      className="flex min-w-0 flex-1 flex-col"
    >
      {children}
    </m.div>
  );
}
