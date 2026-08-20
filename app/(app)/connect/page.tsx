import { cookies } from "next/headers";
import Link from "next/link";
import { Facebook } from "lucide-react";
import { getUserPages } from "@/lib/facebook/client";
import { PagePicker } from "@/components/connect/page-picker";
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
              <p className="py-6 text-center text-sm text-muted-foreground">
                No pages found on this account.
              </p>
            ) : (
              <PagePicker orgId={orgId} pages={pages.map((p) => ({ id: p.id, name: p.name }))} />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
