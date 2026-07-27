import { STATUS_META, type PostStatus } from "@/lib/post-status";
import { cn } from "@/lib/utils";

/** The one and only way status is shown: neutral pill + a meaning-carrying dot. */
export function StatusBadge({ status }: { status: PostStatus }) {
  const { label, dot } = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
