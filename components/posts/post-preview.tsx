import { Fish, Globe, ImageIcon, ThumbsUp, MessageCircle, Share2 } from "lucide-react";

/**
 * A faithful-enough Facebook post preview so the client sees exactly what will
 * publish before approving. Image is a labelled placeholder in Week 1 — Week 2
 * swaps in the real scraped photo.
 */
export function PostPreview({
  pageName,
  body,
  cta,
  link,
  imageHint,
}: {
  pageName: string;
  body: string;
  cta: string;
  link: string;
  imageHint: string;
}) {
  const domain = link.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* page header */}
      <div className="flex items-center gap-2.5 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Fish className="size-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{pageName}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            Just now · <Globe className="size-3" />
          </div>
        </div>
      </div>

      {/* body */}
      <p className="whitespace-pre-line px-3 pb-3 text-sm leading-relaxed">{body}</p>

      {/* image placeholder */}
      <div className="flex aspect-[1.91/1] items-center justify-center border-y border-border bg-muted">
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <ImageIcon className="size-6" />
          <span className="px-6 text-center text-xs">{imageHint}</span>
        </div>
      </div>

      {/* link card */}
      <div className="flex items-center justify-between gap-3 bg-muted/50 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{domain}</div>
          <div className="truncate text-sm font-medium">{cta}</div>
        </div>
        <span className="shrink-0 rounded-md bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
          Learn more
        </span>
      </div>

      {/* reaction bar (visual only) */}
      <div className="flex items-center justify-around border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 py-1">
          <ThumbsUp className="size-4" /> Like
        </span>
        <span className="flex items-center gap-1.5 py-1">
          <MessageCircle className="size-4" /> Comment
        </span>
        <span className="flex items-center gap-1.5 py-1">
          <Share2 className="size-4" /> Share
        </span>
      </div>
    </div>
  );
}
