import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

export type GenerateInput = {
  orgName: string;
  brandVoice: string;
  /** Where the CTA should point — store if there is one, else the main site. */
  ctaUrl: string;
  sourceWebsite: string;
  /** Raw scraped text the post should be grounded in. */
  content: string;
  /** Optional user idea ("new logo shirt"). When absent, the model picks an angle. */
  idea?: string;
};

export type GeneratedDraft = {
  headline: string;
  body: string;
  cta: string;
  link: string;
  imageHint: string;
  sourceWebsite: string;
};

const SYSTEM = `You write Facebook posts for non-profit organizations.
Rules:
- Ground every post in the provided website content — never invent facts, events, or dates.
- Match the given brand voice.
- Keep it 2-4 short paragraphs, warm and specific, at most one relevant emoji.
- Always end with a clear call to action that drives traffic to the org's link.
- Return ONLY a JSON object, no prose, with keys:
  headline (short internal label), body (the post text), cta (button-style call to action, <8 words),
  imageHint (one line describing the ideal photo to attach).`;

/**
 * Generates a post from scraped content + an optional idea. Returns a safe,
 * on-brand stub when ANTHROPIC_API_KEY isn't set, so the dashboard works without
 * a key during early development.
 */
export async function generatePost(input: GenerateInput): Promise<GeneratedDraft> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return stub(input);
  }

  const client = new Anthropic();
  const idea = input.idea?.trim();

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Organization: ${input.orgName}
Brand voice: ${input.brandVoice}
CTA should link to: ${input.ctaUrl}
${idea ? `Post idea from the client: ${idea}` : "No specific idea — choose a strong angle from the content."}

Website content to ground the post in:
"""
${input.content.slice(0, 4000)}
"""`,
      },
    ],
  });

  const text = msg.content.find((b) => b.type === "text")?.text ?? "";
  const parsed = extractJson(text);

  return {
    headline: parsed.headline ?? (idea ?? "New post"),
    body: parsed.body ?? "",
    cta: parsed.cta ?? "Learn more",
    link: input.ctaUrl,
    imageHint: parsed.imageHint ?? "Relevant photo from the website",
    sourceWebsite: input.sourceWebsite,
  };
}

function extractJson(text: string): Partial<GeneratedDraft> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

function stub(input: GenerateInput): GeneratedDraft {
  const idea = input.idea?.trim();
  const lead = idea
    ? `${idea.charAt(0).toUpperCase()}${idea.slice(1)}.`
    : `A little something from ${input.orgName}.`;
  return {
    headline: idea ?? "New post",
    body: `${lead}\n\nWe're posting the best of what we do — the craft, the community, and the moments that bring us together. Follow along and be part of it. 🎣`,
    cta: "Learn more",
    link: input.ctaUrl,
    imageHint: idea ? `Photo suggestion for: ${idea}` : "Relevant photo from the website",
    sourceWebsite: input.sourceWebsite,
  };
}
