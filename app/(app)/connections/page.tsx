"use client";

import { Check, ChevronDown, Facebook, HelpCircle, KeyRound, Loader2, Unplug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { connectPageWithToken, disconnectFacebook } from "@/app/actions";
import type { Organization } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ConnectionsPage() {
  const { orgs } = useOrg();
  return (
    <main className="flex-1 space-y-5 p-5 sm:p-6">
      <Reveal>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Connections</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          Connect each organization to its own Facebook page. Different orgs can use pages from different accounts.
          For a normal page use <span className="font-medium text-foreground">Connect with Facebook</span>; for a
          business-owned page (like the real NFDA page), paste a System User token.
        </p>
      </Reveal>

      <Reveal>
        <HowToConnect />
      </Reveal>

      <div className="space-y-3">
        {orgs.map((org) => (
          <Reveal key={org.id}>
            <OrgConnectionCard org={org} />
          </Reveal>
        ))}
      </div>
    </main>
  );
}

function HowToConnect() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        <HelpCircle className="size-4 text-primary" />
        How do I connect a page?
        <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <CardContent className="space-y-4 border-t border-border pt-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Two ways to connect</p>
            <ul className="mt-1 space-y-1.5">
              <li>
                <span className="font-medium text-foreground">Connect with Facebook</span> — for a normal page you
                manage. Click it, log in, pick the page. Done.
              </li>
              <li>
                <span className="font-medium text-foreground">Paste a token</span> — for a{" "}
                <span className="text-foreground">business-owned page</span> (managed inside a Business Portfolio, like
                the real NFDA page). These don&apos;t appear in the Facebook login picker, so you connect them with a
                token instead.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-foreground">Where to get the token (a “System User token”)</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                Go to <span className="font-medium text-foreground">business.facebook.com/settings</span> and select the
                business that owns the page.
              </li>
              <li>
                <span className="font-medium text-foreground">Accounts → Apps</span> — make sure{" "}
                <span className="text-foreground">NFDA Poster</span> is added.
              </li>
              <li>
                <span className="font-medium text-foreground">Users → System Users → Add</span> — name it, role{" "}
                <span className="text-foreground">Admin</span>.
              </li>
              <li>
                <span className="font-medium text-foreground">Add Assets</span> → Pages → pick your page →{" "}
                <span className="text-foreground">Manage Page</span>; then Apps → NFDA Poster → Manage app.
              </li>
              <li>
                <span className="font-medium text-foreground">Generate New Token</span> → app: NFDA Poster → check{" "}
                <span className="text-foreground">pages_show_list, pages_read_engagement, pages_manage_posts</span> →
                Generate → <span className="text-foreground">copy the token</span> (shown once).
              </li>
              <li>
                Copy the <span className="font-medium text-foreground">Page ID</span> from the same Pages screen.
              </li>
            </ol>
          </div>

          <div>
            <p className="font-medium text-foreground">To connect</p>
            <p className="mt-1">
              On the organization below, click <span className="text-foreground">Paste a token</span>, enter the Page ID
              and token, and hit <span className="text-foreground">Connect page</span>. It&apos;s verified with Facebook
              before saving.
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">To disconnect or switch</p>
            <p className="mt-1">
              Click <span className="text-foreground">Disconnect</span> on a connected org to unlink it. To switch to a
              different page, just paste a different page&apos;s ID and token — it replaces the old one.
            </p>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function OrgConnectionCard({ org }: { org: Organization }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showPaste, setShowPaste] = useState(false);
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{ ok?: string; error?: string } | null>(null);

  function connect() {
    setResult(null);
    start(async () => {
      const r = await connectPageWithToken(org.id, pageId, token);
      router.refresh();
      if (r.ok) {
        setResult({ ok: `Connected to ${r.pageName}` });
        setShowPaste(false);
        setPageId("");
        setToken("");
      } else {
        setResult({ error: r.error ?? "Couldn't connect." });
      }
    });
  }

  function disconnect() {
    setResult(null);
    start(async () => {
      await disconnectFacebook(org.id);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{org.name}</CardTitle>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <span className={cn("size-1.5 rounded-full", org.facebookConnected ? "bg-brand-500" : "bg-muted-foreground/40")} />
            <span className={org.facebookConnected ? "text-foreground/80" : "text-muted-foreground"}>
              {org.facebookConnected ? `Connected · ${org.facebookPage ?? "page"}` : "Not connected"}
            </span>
          </div>
        </div>
        {org.facebookConnected ? (
          <Button size="sm" variant="ghost" onClick={disconnect} disabled={pending} className="text-danger hover:bg-danger/10 hover:text-danger">
            <Unplug className="size-4" /> Disconnect
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/api/facebook/login?orgId=${org.id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            <Facebook className="size-4" /> Connect with Facebook
          </Link>
          <Button size="sm" variant="outline" onClick={() => setShowPaste((v) => !v)}>
            <KeyRound className="size-4" /> Paste a token
            <ChevronDown className={cn("size-4 transition-transform", showPaste && "rotate-180")} />
          </Button>
        </div>

        {showPaste ? (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              For a business-owned page: paste the Page ID and a System User token with{" "}
              <span className="font-medium">pages_manage_posts</span>. It&apos;s verified with Facebook before saving.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`pid-${org.id}`}>Page ID</Label>
                <Input id={`pid-${org.id}`} value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="1234567890" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`tok-${org.id}`}>System User token</Label>
                <Input
                  id={`tok-${org.id}`}
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="EAAG…"
                  autoComplete="off"
                />
              </div>
            </div>
            <Button size="sm" onClick={connect} disabled={pending || !pageId.trim() || !token.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {pending ? "Connecting…" : "Connect page"}
            </Button>
          </div>
        ) : null}

        {result?.ok ? <p className="text-xs text-primary">{result.ok}</p> : null}
        {result?.error ? <p className="text-xs text-danger">{result.error}</p> : null}
      </CardContent>
    </Card>
  );
}
