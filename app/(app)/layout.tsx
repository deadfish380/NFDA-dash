import { AppShell } from "@/components/shell/app-shell";
import { getAllPosts, getOrganizations } from "@/lib/data";

// Always render per-request with fresh DB data; mutations revalidate this layout.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [orgs, posts] = await Promise.all([getOrganizations(), getAllPosts()]);
  const dryRun = process.env.FACEBOOK_DRY_RUN !== "false";
  return (
    <AppShell orgs={orgs} posts={posts} dryRun={dryRun}>
      {children}
    </AppShell>
  );
}
