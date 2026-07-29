"use client";

import { CalendarClock, Facebook, Inbox, Repeat, Send } from "lucide-react";
import Link from "next/link";
import { PostPreview } from "@/components/posts/post-preview";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useOrg } from "@/components/shell/org-context";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function DashboardPage() {
  const { activeOrg, activePosts: posts } = useOrg();

  const needsReview = posts.filter((p) => p.status === "needs_review");
  const scheduled = posts
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
  const posted = posts.filter((p) => p.status === "posted");

  return (
    <main className="flex-1 p-5 sm:p-6">
      <Reveal className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{activeOrg.name}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Here&apos;s what&apos;s waiting for you and what&apos;s going out next.
        </p>
      </Reveal>

      {!activeOrg.facebookConnected ? (
        <Reveal className="mb-5">
          <Card className="flex flex-col gap-3 border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-card">
                <Facebook className="size-4 text-muted-foreground" />
              </span>
              <div>
                <div className="text-sm font-medium">Facebook isn&apos;t connected yet</div>
                <p className="text-sm text-muted-foreground">
                  Connect {activeOrg.shortName}&apos;s page to start scheduling and posting.
                </p>
              </div>
            </div>
            <Link href="/organizations" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
              Connect page
            </Link>
          </Card>
        </Reveal>
      ) : null}

      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StaggerItem>
          <StatCard label="Needs review" value={String(needsReview.length)} sub="Waiting on you" icon={Inbox} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Scheduled" value={String(scheduled.length)} sub="Approved & queued" icon={CalendarClock} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Posted" value={String(posted.length)} sub="Published to Facebook" icon={Send} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Per day" value={String(activeOrg.postsPerDay)} sub="Auto-generated" icon={Repeat} />
        </StaggerItem>
      </Stagger>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {/* Needs review */}
        <Reveal className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Needs your review</CardTitle>
              <Link
                href="/queue"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open queue
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {needsReview.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  All caught up — nothing waiting.
                </p>
              ) : (
                needsReview.map((p) => (
                  <Link
                    key={p.id}
                    href="/queue"
                    className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.headline}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.body}</div>
                      <div className="mt-1.5 text-[11px] text-muted-foreground">
                        from {p.sourceWebsite}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </Reveal>

        {/* Upcoming schedule */}
        <Reveal className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Upcoming schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scheduled.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled yet.</p>
              ) : (
                scheduled.map((p) => (
                  <div key={p.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <CalendarClock className="size-3.5" />
                      {p.scheduledFor ? dateFmt.format(new Date(p.scheduledFor)) : "—"}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{p.headline}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* A live preview of the next post — the "wow" for the client */}
      {scheduled[0] ? (
        <Reveal className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Next post going out</h3>
          <div className="max-w-md">
            <PostPreview
              pageName={activeOrg.facebookPage ?? activeOrg.name}
              body={scheduled[0].body}
              cta={scheduled[0].cta}
              link={scheduled[0].link}
              imageHint={scheduled[0].imageHint}
            />
          </div>
        </Reveal>
      ) : null}
    </main>
  );
}
