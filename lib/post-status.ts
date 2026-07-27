/**
 * The lifecycle of a post through the dashboard. One neutral pill everywhere,
 * meaning carried by a single leading dot — only four tones (neutral, brand,
 * warning, danger). This replaces turf's project-status with our own domain.
 */
export type PostStatus = "draft" | "needs_review" | "approved" | "scheduled" | "posted" | "rejected";

export const STATUS_META: Record<PostStatus, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-muted-foreground/40" },
  needs_review: { label: "Needs Review", dot: "bg-warning" },
  approved: { label: "Approved", dot: "bg-brand-400" },
  scheduled: { label: "Scheduled", dot: "bg-brand-500" },
  posted: { label: "Posted", dot: "bg-brand-600" },
  rejected: { label: "Rejected", dot: "bg-danger" },
};

export const POST_STATUSES = Object.keys(STATUS_META) as PostStatus[];
