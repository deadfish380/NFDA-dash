import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Facebook } from "lucide-react";
import { connectSelectedPage } from "@/app/actions";
import { getTokenDebug, getUserPages } from "@/lib/facebook/client";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Page picker shown after Facebook login. Lists the pages the user manages so
 * they can attach one to the org — pick the Test Page during testing.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const { orgId = "" } = await searchParams;
  const jar = await cookies();
  const userToken = jar.get("fb_user_token")?.value;

  let pages: Awaited<ReturnType<typeof getUserPages>> = [];
  let error: string | null = null;
  if (!userToken) {
    error = "Your Facebook session expired. Start the connection again.";
  } else {
    try {
      pages = await getUserPages(userToken);
    } catch {
      error = "Couldn't load your Facebook pages. Try connecting again.";
    }
  }

  return (
    <main className="flex-1 p-5 sm:p-6">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Choose a page to connect</CardTitle>
            <p className="text-sm text-muted-foreground">
              During testing, pick <span className="font-medium text-foreground">Test Page</span> — not the real
              NFDA page.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {error ? (
              <div className="space-y-3 py-2 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Link href={`/api/facebook/login?orgId=${orgId}`} className={cn(buttonVariants({ size: "sm" }))}>
                  <Facebook className="size-4" /> Connect again
                </Link>
              </div>
            ) : pages.length === 0 ? (
              <div className="space-y-3 py-2">
                <p className="text-center text-sm text-muted-foreground">No pages found on this account.</p>
                {userToken ? (
                  <details open className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                    <summary className="cursor-pointer font-medium">Diagnostic (temporary)</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                      {JSON.stringify(await getTokenDebug(userToken), null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : (
              pages.map((page) => (
                <form
                  key={page.id}
                  action={async () => {
                    "use server";
                    await connectSelectedPage(orgId, page.id);
                    redirect("/organizations");
                  }}
                >
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Facebook className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{page.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">Page ID {page.id}</span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-primary">Connect</span>
                  </button>
                </form>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
