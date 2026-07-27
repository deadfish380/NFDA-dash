"use client";

import { m } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { fadeUp, stagger } from "@/lib/motion";

/** A single element that rises + fades in on mount. */
export function Reveal({ children, ...props }: ComponentPropsWithoutRef<typeof m.div>) {
  return (
    <m.div variants={fadeUp} initial="hidden" animate="show" {...props}>
      {children}
    </m.div>
  );
}

/** Wrap a list; children using <StaggerItem> reveal in sequence. */
export function Stagger({ children, ...props }: ComponentPropsWithoutRef<typeof m.div>) {
  return (
    <m.div variants={stagger} initial="hidden" animate="show" {...props}>
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, ...props }: ComponentPropsWithoutRef<typeof m.div>) {
  return (
    <m.div variants={fadeUp} {...props}>
      {children}
    </m.div>
  );
}

/** Reveals when scrolled into view, once. For long marketing pages. */
export function InView({ children, ...props }: ComponentPropsWithoutRef<typeof m.div>) {
  return (
    <m.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      {...props}
    >
      {children}
    </m.div>
  );
}
