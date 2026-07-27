"use client";

import { Globe, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { PostPreview } from "@/components/posts/post-preview";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { useOrg } from "@/components/shell/org-context";

type Draft = { body: string; cta: string; link: string; imageHint: string };

const IDEAS = [
  "New logo t-shirt just dropped in the store",
  "Promote this year's carving contest",
  "Spotlight a member carver",
  "Remind people about the Perham Show",
];

/**
 * Week-1 mock generator: composes a believable draft from the idea + the active
 * org's store/site. Week 2 replaces this with a real Claude call over the
 * scraped content. The UI contract (idea in → draft out → preview) stays identical.
 */
function fakeGenerate(idea: string, storeUrl: string | null, siteUrl: string): Draft {
  const link = storeUrl ?? siteUrl;
  const clean = idea.trim().replace(/\s+/g, " ");
  return {
    body: `${clean.charAt(0).toUpperCase()}${clean.slice(1)}. \n\nWe're rebuilding our page and posting the best of what we do — the craft, the community, and the shows that bring us together. Follow along and be part of it. 🎣`,
    cta: storeUrl ? "Shop the store" : "Visit our website",
    link,
    imageHint: `Photo suggestion for: ${clean}`,
  };
}

export default function GeneratePage() {
  const { activeOrg } = useOrg();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [added, setAdded] = useState(false);

  const siteUrl = activeOrg.websites[0]?.url ?? "";

  function generate() {
    if (!idea.trim()) return;
    setLoading(true);
    setAdded(false);
    // Simulated latency so the interaction reads like real generation.
    setTimeout(() => {
      setDraft(fakeGenerate(idea, activeOrg.storeUrl, siteUrl));
      setLoading(false);
    }, 700);
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      <Reveal className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Generate a post from your idea</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Type an idea. It&apos;s combined with {activeOrg.shortName}&apos;s website content into a ready-to-approve post.
        </p>
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

              <Button onClick={generate} disabled={loading || !idea.trim()} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Generating…" : "Generate post"}
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
              />
              <div className="flex gap-2">
                <Button onClick={() => setAdded(true)} disabled={added} className="flex-1">
                  {added ? "Added to queue ✓" : "Add to review queue"}
                </Button>
                <Button variant="outline" onClick={generate}>
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
