"use client";

import { Building2, Check, Facebook, Globe, Plus, Store } from "lucide-react";
import { useState } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { ORGANIZATIONS, type Organization, type Website } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>(() => ORGANIZATIONS.map((o) => ({ ...o, websites: [...o.websites] })));

  function addWebsite(orgId: string, url: string, label: string) {
    const site: Website = { id: `${orgId}-${Date.now()}`, url, label, lastScrapedAt: null, status: "pending" };
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, websites: [...o.websites, site] } : o)));
  }

  function connectFacebook(orgId: string) {
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, facebookConnected: true, facebookPage: o.facebookPage ?? o.name } : o)),
    );
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      <Reveal className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Organizations</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every organization and website is data — add more anytime, no new build required.
          </p>
        </div>
        <AddOrgButton />
      </Reveal>

      <Stagger className="space-y-4">
        {orgs.map((org) => (
          <StaggerItem key={org.id}>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <CardTitle>{org.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {org.postsPerDay} posts/day · {org.websites.length} website
                      {org.websites.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <FacebookStatus org={org} onConnect={() => connectFacebook(org.id)} />
              </CardHeader>

              <CardContent className="space-y-4">
                {/* websites */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Source websites
                    </span>
                    <AddWebsiteButton orgName={org.shortName} onAdd={(url, label) => addWebsite(org.id, url, label)} />
                  </div>
                  <div className="space-y-1.5">
                    {org.websites.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <Globe className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{w.label}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {w.lastScrapedAt
                              ? `Last read ${dateFmt.format(new Date(w.lastScrapedAt))}`
                              : "Not read yet"}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[11px] font-medium",
                            w.status === "connected" ? "text-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              w.status === "connected" ? "bg-brand-500" : "bg-warning",
                            )}
                          />
                          {w.status === "connected" ? "Reading" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* store */}
                <div className="flex items-center gap-2 text-sm">
                  <Store className="size-4 text-muted-foreground" />
                  {org.storeUrl ? (
                    <span className="text-muted-foreground">
                      Store CTA links to <span className="text-foreground">{org.storeUrl.replace(/^https?:\/\//, "")}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No store linked yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}

function FacebookStatus({ org, onConnect }: { org: Organization; onConnect: () => void }) {
  if (org.facebookConnected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
        <Check className="size-3.5 text-primary" />
        Connected
      </span>
    );
  }
  return (
    <Button size="sm" onClick={onConnect}>
      <Facebook className="size-4" /> Connect page
    </Button>
  );
}

function AddWebsiteButton({ orgName, onAdd }: { orgName: string; onAdd: (url: string, label: string) => void }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  function submit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    onAdd(normalized, normalized.replace(/^https?:\/\//, "").replace(/\/$/, ""));
    setUrl("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="size-4" /> Add website
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a website for {orgName}</DialogTitle>
          <DialogDescription>Paste a URL. It&apos;ll be read for content the next scrape cycle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="new-site">Website URL</Label>
          <Input
            id="new-site"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.org"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={!url.trim()}>
            Add website
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddOrgButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">
          <Plus className="size-4" /> Add organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an organization</DialogTitle>
          <DialogDescription>
            A new organization is just data — name it, add its websites, and connect a Facebook page. No new
            development needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" placeholder="e.g. Longview Conservation" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-site">First website</Label>
            <Input id="org-site" placeholder="example.org" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button>Create organization</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
