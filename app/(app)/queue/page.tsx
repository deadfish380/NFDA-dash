"use client";

import { QueueView } from "@/components/posts/queue-view";
import { useOrg } from "@/components/shell/org-context";

export default function QueuePage() {
  const { activeOrg } = useOrg();
  // Remount on org switch so review state resets cleanly per organization.
  return <QueueView key={activeOrg.id} />;
}
