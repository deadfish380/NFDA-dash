"use client";

import { m } from "motion/react";
import { Database, Globe, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live pipeline visualization: Websites → Scraper → Database. Dots flow along the
 * connectors continuously (a "live system" cue); when `active`, the flow speeds
 * up and the nodes glow. This is the one place we allow looping motion — it
 * communicates that the pipeline is live, which is the whole point of the screen.
 */
export function ScrapeCanvas({
  websiteCount,
  itemCount,
  active,
}: {
  websiteCount: number;
  itemCount: number;
  active: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-gradient-to-b from-muted/40 to-card p-6">
      <div className="flex min-w-[560px] items-center justify-between gap-2">
        <Node icon={Globe} label="Websites" value={websiteCount} sub="sources" active={active} />
        <Connector active={active} />
        <Node icon={RefreshCw} label="Scraper" value={null} sub={active ? "reading…" : "idle"} active={active} spinning={active} />
        <Connector active={active} delay={0.4} />
        <Node icon={Database} label="Stored" value={itemCount} sub="content rows" active={active} accent />
      </div>
    </div>
  );
}

function Node({
  icon: Icon,
  label,
  value,
  sub,
  active,
  spinning,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  sub: string;
  active: boolean;
  spinning?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 text-center">
      <m.div
        animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={active ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        className={cn(
          "flex size-16 items-center justify-center rounded-2xl border transition-colors",
          accent ? "bg-primary text-primary-foreground border-transparent" : "bg-card text-foreground border-border",
          active && "ring-2 ring-primary/40",
        )}
      >
        <Icon className={cn("size-6", spinning && "animate-spin")} />
      </m.div>
      <div className="leading-tight">
        {value !== null ? <div className="text-lg font-semibold tabular-nums">{value}</div> : null}
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Connector({ active, delay = 0 }: { active: boolean; delay?: number }) {
  const duration = active ? 0.9 : 2.4;
  const dots = active ? [0, 0.3, 0.6] : [0];

  return (
    <div className="relative h-16 flex-1">
      <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-border via-border to-border" />
      {dots.map((d, i) => (
        <m.span
          key={i}
          className={cn("absolute top-1/2 size-2 -translate-y-1/2 rounded-full", active ? "bg-primary" : "bg-muted-foreground/50")}
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration, repeat: Infinity, ease: "linear", delay: delay + d * duration, repeatDelay: active ? 0.05 : 0.8 }}
        />
      ))}
    </div>
  );
}
