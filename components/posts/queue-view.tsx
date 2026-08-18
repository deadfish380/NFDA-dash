"use client";

import { Check, Inbox, Loader2, Pencil, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PostPreview } from "@/components/posts/post-preview";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { publishPostNow, setPostStatus, updatePostContent } from "@/app/actions";

type Filter = "needs_review" | "scheduled" | "posted" | "draft" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "needs_review", label: "Needs Review" },
  { key: "scheduled", label: "Scheduled" },
  { key: "posted", label: "Posted" },
  { key: "draft", label: "Drafts" },
  { key: "all", label: "All" },
];

type EditBuffer = { body: string; cta: string; link: string };

export function QueueView() {
  const { activeOrg, activePosts } = useOrg();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("needs_review");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditBuffer | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of activePosts) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [activePosts]);

  const visible = activePosts.filter((p) => (filter === "all" ? true : p.status === filter));

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function startEdit(post: { id: string; body: string; cta: string; link: string }) {
    setEditingId(post.id);
    setEdit({ body: post.body, cta: post.cta, link: post.link });
  }

  function saveEdit() {
    if (!editingId || !edit) return;
    run(async () => {
      await updatePostContent(editingId, edit);
      setEditingId(null);
      setEdit(null);
    });
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(({ key, label }) => {
          const count = key === "all" ? activePosts.length : (counts[key] ?? 0);
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")
              }
            >
              {label}
              <span className="tabular-nums opacity-80">{count}</span>
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
          {visible.map((post) => {
            const editing = editingId === post.id;
            const preview = editing && edit ? edit : post;
            return (
              <StaggerItem key={post.id}>
                <Card className="grid gap-5 p-4 lg:grid-cols-2 lg:p-5">
                  <div className="flex flex-col">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <StatusBadge status={post.status} />
                      <span className="text-xs text-muted-foreground">from {post.sourceWebsite}</span>
                    </div>

                    {editing && edit ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`body-${post.id}`}>Post text</Label>
                          <textarea
                            id={`body-${post.id}`}
                            value={edit.body}
                            onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                            rows={6}
                            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`cta-${post.id}`}>Call to action</Label>
                          <Input id={`cta-${post.id}`} value={edit.cta} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`link-${post.id}`}>Link</Label>
                          <Input id={`link-${post.id}`} value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} />
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

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {editing ? (
                        <Button size="sm" onClick={saveEdit} disabled={isPending}>
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(post)} disabled={isPending}>
                          <Pencil className="size-4" /> Edit
                        </Button>
                      )}

                      {post.status !== "posted" ? (
                        <>
                          {post.status !== "scheduled" ? (
                            <Button size="sm" onClick={() => run(() => setPostStatus(post.id, "scheduled"))} disabled={isPending}>
                              <Check className="size-4" /> Approve
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => run(() => publishPostNow(post.id))} disabled={isPending}>
                              <Send className="size-4" /> Post now
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => run(() => setPostStatus(post.id, "rejected"))}
                            disabled={isPending}
                            className="text-danger hover:bg-danger/10 hover:text-danger"
                          >
                            <X className="size-4" /> Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="lg:pl-1">
                    <PostPreview
                      pageName={activeOrg.facebookPage ?? activeOrg.name}
                      body={preview.body}
                      cta={preview.cta}
                      link={preview.link}
                      imageHint={post.imageHint}
                      imageUrl={post.imageUrl}
                    />
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </main>
  );
}
