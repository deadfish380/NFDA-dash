"use client";

import { Globe, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PostPreview } from "@/components/posts/post-preview";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { useOrg } from "@/components/shell/org-context";
import { generateDraft, runGenerateNow, saveDraft } from "@/app/actions";

type Draft = {
  headline: string;
  body: string;
  cta: string;
  link: string;
  imageHint: string;
  sourceWebsite: string;
  imageUrl?: string | null;
};

const IDEAS = [
  "New logo t-shirt just dropped in the store",
  "Promote this year's carving contest",
  "Spotlight a member carver",
  "Remind people about the Perham Show",
];

export default function GeneratePage() {
  const { activeOrg } = useOrg();
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [added, setAdded] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);
  const [generating, startGenerate] = useTransition();
  const [saving, startSave] = useTransition();
  const [autoRunning, startAuto] = useTransition();

  function generate() {
    if (!idea.trim()) return;
    setAdded(false);
    startGenerate(async () => {
      const d = await generateDraft(activeOrg.id, idea);
      setDraft(d);
    });
  }

  function autoGenerate() {
    setAutoMsg(null);
    startAuto(async () => {
      const r = await runGenerateNow(activeOrg.id);
      router.refresh();
      setAutoMsg(
        r.created > 0
          ? `Created ${r.created} post${r.created === 1 ? "" : "s"} in the review queue.`
          : `No posts created${r.reason ? ` — ${r.reason}` : ""}.`,
      );
    });
  }

  function add() {
    if (!draft) return;
    startSave(async () => {
      await saveDraft(activeOrg.id, draft);
      router.refresh();
      setAdded(true);
    });
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      <Reveal className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Generate a post from your idea</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Type an idea. It&apos;s combined with {activeOrg.shortName}&apos;s website content into a ready-to-approve post.
        </p>
      </Reveal>

      <Reveal className="mb-4">
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Auto-generate today&apos;s posts</div>
            <p className="text-xs text-muted-foreground">
              Runs the daily pipeline now — writes {activeOrg.postsPerDay} post{activeOrg.postsPerDay === 1 ? "" : "s"} from
              your scraped content, with images, into the review queue.
            </p>
            {autoMsg ? <p className="mt-1 text-xs text-primary">{autoMsg}</p> : null}
          </div>
          <Button variant="outline" onClick={autoGenerate} disabled={autoRunning} className="shrink-0">
            {autoRunning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {autoRunning ? "Generating…" : "Generate now"}
          </Button>
        </Card>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Your idea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="idea">What should this post be about?</Label>
                <textarea
                  id="idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={4}
                  placeholder="e.g. New logo shirt in the store"
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {IDEAS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setIdea(s)}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="size-3.5" />
                Pulls from {activeOrg.websites.map((w) => w.label).join(", ")}
              </div>

              <Button onClick={generate} disabled={generating || !idea.trim()} className="w-full">
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Generating…" : "Generate post"}
              </Button>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          {draft ? (
            <div className="space-y-3">
              <PostPreview
                pageName={activeOrg.facebookPage ?? activeOrg.name}
                body={draft.body}
                cta={draft.cta}
                link={draft.link}
                imageHint={draft.imageHint}
                imageUrl={draft.imageUrl}
              />
              <div className="flex gap-2">
                <Button onClick={add} disabled={added || saving} className="flex-1">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {added ? "Added to queue ✓" : "Add to review queue"}
                </Button>
                <Button variant="outline" onClick={generate} disabled={generating}>
                  Regenerate
                </Button>
              </div>
              {added ? (
                <p className="text-center text-xs text-muted-foreground">
                  Find it under Post Queue → Needs Review.
                </p>
              ) : null}
            </div>
          ) : (
            <Card className="flex h-full min-h-64 flex-col items-center justify-center gap-2 p-8 text-center">
              <Sparkles className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Your generated post preview will appear here.</p>
            </Card>
          )}
        </Reveal>
      </div>
    </main>
  );
}
