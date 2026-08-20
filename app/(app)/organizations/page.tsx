"use client";

import { Building2, Check, Facebook, Globe, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { buttonVariants, Button } from "@/components/ui/button";
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
import { ScrapePanel } from "@/components/posts/scrape-panel";
import { addWebsite, createOrganization, disconnectFacebook } from "@/app/actions";
import type { Organization } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function OrganizationsPage() {
  const { orgs } = useOrg();

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
            <OrgCard org={org} />
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}

function OrgCard({ org }: { org: Organization }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Building2 className="size-5" />
          </span>
          <div>
            <CardTitle>{org.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {org.postsPerDay} posts/day · {org.websites.length} website{org.websites.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {org.facebookConnected ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              <Check className="size-3.5 text-primary" />
              {org.facebookPage ?? "Connected"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => startTransition(async () => { await disconnectFacebook(org.id); router.refresh(); })}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Link href={`/api/facebook/login?orgId=${org.id}`} prefetch={false} className={cn(buttonVariants({ size: "sm" }))}>
            <Facebook className="size-4" /> Connect page
          </Link>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source websites</span>
            <AddWebsiteButton orgId={org.id} orgName={org.shortName} />
          </div>
          <div className="space-y-1.5">
            {org.websites.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{w.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {w.lastScrapedAt ? `Last read ${dateFmt.format(new Date(w.lastScrapedAt))}` : "Not read yet"}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[11px] font-medium",
                    w.status === "connected" ? "text-foreground/80" : "text-muted-foreground",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", w.status === "connected" ? "bg-brand-500" : "bg-warning")} />
                  {w.status === "connected" ? "Reading" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ScrapePanel orgId={org.id} />

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
  );
}

function AddWebsiteButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!url.trim()) return;
    startTransition(async () => {
      await addWebsite(orgId, url);
      router.refresh();
      setUrl("");
      setOpen(false);
    });
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
          <DialogDescription>Paste a URL. It&apos;ll be read for content on the next scrape.</DialogDescription>
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
          <Button onClick={submit} disabled={!url.trim() || isPending}>Add website</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddOrgButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createOrganization(name, site);
      router.refresh();
      setName("");
      setSite("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">
          <Plus className="size-4" /> Add organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an organization</DialogTitle>
          <DialogDescription>
            A new organization is just data — name it and add its first website. No new development needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Longview Conservation" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-site">First website</Label>
            <Input id="org-site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="example.org" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={!name.trim() || isPending}>Create organization</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
