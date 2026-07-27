"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { activeOrg } = useOrg();
  const [postsPerDay, setPostsPerDay] = useState(activeOrg.postsPerDay);
  const [times, setTimes] = useState(["09:00", "15:00"]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [voice, setVoice] = useState(
    "Warm and proud of the craft. Short paragraphs, one relevant emoji, always end with a clear call to action and a link.",
  );

  return (
    <main className="flex-1 p-5 sm:p-6">
      <Reveal className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Settings — {activeOrg.shortName}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">These apply to {activeOrg.name} only.</p>
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
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Fewer posts"
                    onClick={() => setPostsPerDay((n) => Math.max(1, n - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-lg font-semibold tabular-nums">{postsPerDay}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="More posts"
                    onClick={() => setPostsPerDay((n) => Math.min(6, n + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Posting times</Label>
                {times.map((t, i) => (
                  <Input
                    key={i}
                    type="time"
                    value={t}
                    onChange={(e) => setTimes((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                ))}
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
                  <div className="text-xs text-muted-foreground">
                    Off means every post waits for your approval (recommended).
                  </div>
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
                <p className="text-xs text-muted-foreground">
                  The AI writes in this style. Paste a past post to teach it.
                </p>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <Button>Save settings</Button>
      </Reveal>
    </main>
  );
}
