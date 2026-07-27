"use client";

import { Check, Inbox, Pencil, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PostPreview } from "@/components/posts/post-preview";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { postsForOrg, type Post } from "@/lib/mock-data";
import { type PostStatus } from "@/lib/post-status";
import { cn } from "@/lib/utils";

type Filter = "needs_review" | "scheduled" | "posted" | "draft" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "needs_review", label: "Needs Review" },
  { key: "scheduled", label: "Scheduled" },
  { key: "posted", label: "Posted" },
  { key: "draft", label: "Drafts" },
  { key: "all", label: "All" },
];

export function QueueView() {
  const { activeOrg } = useOrg();
  const [posts, setPosts] = useState<Post[]>(() => postsForOrg(activeOrg.id));
  const [filter, setFilter] = useState<Filter>("needs_review");
  const [editingId, setEditingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of posts) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [posts]);

  const visible = posts.filter((p) => (filter === "all" ? true : p.status === filter));

  function setStatus(id: string, status: PostStatus) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    setEditingId(null);
  }

  function updatePost(id: string, patch: Partial<Post>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      {/* filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(({ key, label }) => {
          const count = key === "all" ? posts.length : (counts[key] ?? 0);
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className={cn("tabular-nums", active ? "opacity-90" : "opacity-70")}>{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Inbox className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        </Card>
      ) : (
        <Stagger className="space-y-4">
          {visible.map((post) => (
            <StaggerItem key={post.id}>
              <Card className="grid gap-5 p-4 lg:grid-cols-2 lg:p-5">
                {/* left: content + actions */}
                <div className="flex flex-col">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-muted-foreground">from {post.sourceWebsite}</span>
                  </div>

                  {editingId === post.id ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`body-${post.id}`}>Post text</Label>
                        <textarea
                          id={`body-${post.id}`}
                          value={post.body}
                          onChange={(e) => updatePost(post.id, { body: e.target.value })}
                          rows={6}
                          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`cta-${post.id}`}>Call to action</Label>
                        <Input
                          id={`cta-${post.id}`}
                          value={post.cta}
                          onChange={(e) => updatePost(post.id, { cta: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`link-${post.id}`}>Link</Label>
                        <Input
                          id={`link-${post.id}`}
                          value={post.link}
                          onChange={(e) => updatePost(post.id, { link: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{post.headline}</h3>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {post.body}
                      </p>
                    </div>
                  )}

                  {/* actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {editingId === post.id ? (
                      <Button size="sm" onClick={() => setEditingId(null)}>
                        <Check className="size-4" /> Save
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditingId(post.id)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                    )}

                    {post.status !== "posted" ? (
                      <>
                        {post.status !== "scheduled" ? (
                          <Button size="sm" onClick={() => setStatus(post.id, "scheduled")}>
                            <Check className="size-4" /> Approve
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(post.id, "posted")}>
                            <Send className="size-4" /> Post now
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(post.id, "rejected")}
                          className="text-danger hover:bg-danger/10 hover:text-danger"
                        >
                          <X className="size-4" /> Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* right: live preview */}
                <div className="lg:pl-1">
                  <PostPreview
                    pageName={activeOrg.facebookPage ?? activeOrg.name}
                    body={post.body}
                    cta={post.cta}
                    link={post.link}
                    imageHint={post.imageHint}
                  />
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </main>
  );
}
