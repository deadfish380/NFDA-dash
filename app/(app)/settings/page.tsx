"use client";

import { Check, Loader2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateOrgSettings } from "@/app/actions";
import type { Organization } from "@/lib/mock-data";

export default function SettingsPage() {
  const { activeOrg } = useOrg();
  // Remount on org switch so the form reflects that org's saved values.
  return <SettingsForm key={activeOrg.id} org={activeOrg} />;
}

// Sensible default times to seed new slots when "posts per day" goes up.
const DEFAULT_TIMES = ["09:00", "15:00", "12:00", "18:00", "10:30", "14:00"];

/** Keep exactly one posting-time slot per post: pad up, trim down. */
function fitTimes(times: string[], count: number): string[] {
  const next = times.slice(0, count);
  while (next.length < count) next.push(DEFAULT_TIMES[next.length] ?? "12:00");
  return next;
}

function SettingsForm({ org }: { org: Organization }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [postsPerDay, setPostsPerDay] = useState(org.postsPerDay);
  const [times, setTimes] = useState(() =>
    fitTimes(org.postingTimes?.length ? org.postingTimes : ["09:00", "15:00"], org.postsPerDay),
  );

  // Changing the post count adds/removes time slots so there's always one per post.
  function changeCount(delta: number) {
    setPostsPerDay((n) => {
      const next = Math.max(1, Math.min(6, n + delta));
      setTimes((prev) => fitTimes(prev, next));
      return next;
    });
  }
  const [autoApprove, setAutoApprove] = useState(org.autoApprove);
  const [voice, setVoice] = useState(org.brandVoice ?? "");

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateOrgSettings(org.id, { postsPerDay, postingTimes: times, autoApprove, brandVoice: voice });
      router.refresh();
      setSaved(true);
    });
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      <Reveal className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Settings — {org.shortName}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">These apply to {org.name} only.</p>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Posting frequency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Posts per day</div>
                  <div className="text-xs text-muted-foreground">How many the system drafts each day</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" aria-label="Fewer posts" onClick={() => changeCount(-1)}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-lg font-semibold tabular-nums">{postsPerDay}</span>
                  <Button size="sm" variant="outline" aria-label="More posts" onClick={() => changeCount(1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Posting times</Label>
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                    <Input
                      type="time"
                      value={t}
                      onChange={(e) => setTimes((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  One time per post. Change &ldquo;Posts per day&rdquo; to add or remove slots.
                </p>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Review & voice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Auto-approve</div>
                  <div className="text-xs text-muted-foreground">Off means every post waits for your approval (recommended).</div>
                </div>
                <Switch checked={autoApprove} onCheckedChange={setAutoApprove} aria-label="Auto-approve posts" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="voice">Brand voice</Label>
                <textarea
                  id="voice"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <p className="text-xs text-muted-foreground">The AI writes in this style. Paste a past post to teach it.</p>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Save settings
        </Button>
        {saved && !isPending ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4 text-primary" /> Saved
          </span>
        ) : null}
      </Reveal>
    </main>
  );
}
