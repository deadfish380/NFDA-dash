import type { PostStatus } from "@/lib/post-status";

/**
 * Week-1 mock store. Everything here is *data*, not hardcoded UI — organizations,
 * their websites, and their Facebook connections are rows. Adding a fourth org
 * later is a new object, never new code. In Week 2 these types back the real
 * database + scraper + Meta API; the UI already speaks this shape.
 */

export type Website = {
  id: string;
  url: string;
  label: string;
  lastScrapedAt: string | null;
  status: "connected" | "pending";
};

export type Organization = {
  id: string;
  name: string;
  shortName: string;
  facebookPage: string | null;
  facebookPageId: string | null;
  facebookConnected: boolean;
  storeUrl: string | null;
  postsPerDay: number;
  postingTimes: string[];
  autoApprove: boolean;
  brandVoice: string | null;
  websites: Website[];
};

export type Post = {
  id: string;
  orgId: string;
  status: PostStatus;
  headline: string;
  body: string;
  cta: string;
  link: string;
  sourceWebsite: string;
  imageHint: string;
  scheduledFor: string | null;
  createdAt: string;
};

export const ORGANIZATIONS: Organization[] = [
  {
    id: "nfda",
    name: "National Fish Decoy Association",
    shortName: "NFDA",
    facebookPage: "National Fish Decoy Association",
    facebookPageId: null,
    facebookConnected: false,
    storeUrl: "https://www.nfdadecoys.org/store",
    postsPerDay: 2,
    postingTimes: ["09:00", "15:00"],
    autoApprove: false,
    brandVoice:
      "Warm and proud of the craft. Short paragraphs, one relevant emoji, always end with a clear call to action and a link.",
    websites: [
      {
        id: "nfda-main",
        url: "https://www.nfdadecoys.org",
        label: "nfdadecoys.org",
        lastScrapedAt: "2026-07-27T06:00:00Z",
        status: "connected",
      },
      {
        id: "nfda-perham",
        url: "https://www.perhamshow.com",
        label: "perhamshow.com",
        lastScrapedAt: "2026-07-27T06:00:00Z",
        status: "connected",
      },
    ],
  },
  {
    id: "longview",
    name: "Longview Conservation",
    shortName: "Longview",
    facebookPage: null,
    facebookPageId: null,
    facebookConnected: false,
    storeUrl: null,
    postsPerDay: 2,
    postingTimes: ["09:00", "15:00"],
    autoApprove: false,
    brandVoice: "Mission-driven and hopeful. Clear, plain language with a strong call to action.",
    websites: [
      {
        id: "longview-main",
        url: "https://www.longviewconservation.org",
        label: "longviewconservation.org",
        lastScrapedAt: null,
        status: "pending",
      },
    ],
  },
];

export const POSTS: Post[] = [
  {
    id: "p1",
    orgId: "nfda",
    status: "needs_review",
    headline: "Meet the carvers behind the National Championship",
    body: "Every decoy tells a story. This year's National Fish Decoy Championship brought together carvers from across the country — each one hand-shaping, painting, and balancing their entries for the ice. Swipe through to see the craftsmanship up close. 🎣",
    cta: "See the full winners gallery",
    link: "https://www.nfdadecoys.org/championship",
    sourceWebsite: "nfdadecoys.org",
    imageHint: "Championship winning decoy collection",
    scheduledFor: null,
    createdAt: "2026-07-27T06:00:00Z",
  },
  {
    id: "p2",
    orgId: "nfda",
    status: "needs_review",
    headline: "The Perham Show is closer than you think",
    body: "Mark your calendar — the Perham Show is one of the best weekends of the year for decoy carvers and collectors. Demos, contests, and a whole hall of hand-carved fish decoys. Whether you carve or just love the craft, there's a spot for you.",
    cta: "Get show details & directions",
    link: "https://www.perhamshow.com",
    sourceWebsite: "perhamshow.com",
    imageHint: "Perham show hall with carvers",
    scheduledFor: null,
    createdAt: "2026-07-27T06:00:00Z",
  },
  {
    id: "p3",
    orgId: "nfda",
    status: "scheduled",
    headline: "New NFDA logo tee just dropped",
    body: "Fresh in the store: our classic NFDA logo tee, redrawn for 2026. Soft, durable, and it wears the association proud. Every order helps keep the tradition — and the contests — going strong.",
    cta: "Grab yours in the store",
    link: "https://www.nfdadecoys.org/store",
    sourceWebsite: "nfdadecoys.org",
    imageHint: "NFDA logo t-shirt on neutral background",
    scheduledFor: "2026-07-28T14:00:00Z",
    createdAt: "2026-07-26T06:00:00Z",
  },
  {
    id: "p4",
    orgId: "nfda",
    status: "scheduled",
    headline: "How a fish decoy is born",
    body: "From a rough basswood blank to a balanced, weighted swimmer — the making of a fish decoy is equal parts art and engineering. Here's a look at the steps every carver knows by heart.",
    cta: "Read the carving guide",
    link: "https://www.nfdadecoys.org/history",
    sourceWebsite: "nfdadecoys.org",
    imageHint: "Carving process step-by-step",
    scheduledFor: "2026-07-28T18:00:00Z",
    createdAt: "2026-07-26T06:00:00Z",
  },
  {
    id: "p5",
    orgId: "nfda",
    status: "posted",
    headline: "20 years of champions in one place",
    body: "We've been crowning National champions for two decades. Take a scroll back through the winners who shaped the craft — and get inspired for your own entry this season.",
    cta: "Browse the archive",
    link: "https://www.nfdadecoys.org/championship",
    sourceWebsite: "nfdadecoys.org",
    imageHint: "Historical champions collage",
    scheduledFor: "2026-07-25T14:00:00Z",
    createdAt: "2026-07-25T06:00:00Z",
  },
  {
    id: "p6",
    orgId: "nfda",
    status: "posted",
    headline: "Follow along as we rebuild",
    body: "If you're new here — welcome back. We're rebuilding our page from the ground up and posting the best of the NFDA every week. Hit follow so you never miss a contest, a carver spotlight, or a new drop in the store.",
    cta: "Follow the page",
    link: "https://www.nfdadecoys.org",
    sourceWebsite: "nfdadecoys.org",
    imageHint: "Welcome back banner",
    scheduledFor: "2026-07-24T14:00:00Z",
    createdAt: "2026-07-24T06:00:00Z",
  },
  {
    id: "p7",
    orgId: "nfda",
    status: "draft",
    headline: "Carver spotlight: submit your work",
    body: "Are you an NFDA carver? We want to feature you. Send us a few photos of your decoys and a sentence about your process — we'll spotlight members all season long.",
    cta: "Submit your spotlight",
    link: "https://www.nfdadecoys.org/members",
    sourceWebsite: "nfdadecoys.org",
    imageHint: "Member carver at workbench",
    scheduledFor: null,
    createdAt: "2026-07-27T06:00:00Z",
  },
];

export function orgById(id: string): Organization | undefined {
  return ORGANIZATIONS.find((o) => o.id === id);
}

export function postsForOrg(orgId: string): Post[] {
  return POSTS.filter((p) => p.orgId === orgId);
}
