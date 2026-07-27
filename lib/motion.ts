import type { Transition, Variants } from "motion/react";

/**
 * The single source of truth for motion. Everything animated in the app pulls
 * from here — one duration, one ease — so nothing feels hand-tuned or "off".
 * Motion is feedback (something arrived, updated, responded), never decoration.
 */

export const EASE = [0.22, 1, 0.36, 1] as const; // gentle ease-out, no bounce

export const transition: Transition = { duration: 0.22, ease: EASE };
export const transitionFast: Transition = { duration: 0.14, ease: EASE };

/** Content entering the viewport: rise a few px + fade. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition },
};

/** Parent that reveals children one after another. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

/** Route-transition variants used by the app template. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition },
};
