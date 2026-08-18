import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const ANTHROPIC_MODEL = "claude-sonnet-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

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
  /** Headlines/openers of recent posts — steer the model away from repeating them. */
  avoid?: string[];
};

export type GeneratedDraft = {
  headline: string;
  body: string;
  cta: string;
  link: string;
  imageHint: string;
  sourceWebsite: string;
  /** Set by the caller after image generation — the preview/post image. */
  imageUrl?: string | null;
};

const SYSTEM = `You write Facebook posts for non-profit organizations.
Rules:
- Ground every post in the provided website content — never invent facts, events, or dates.
- Match the given brand voice.
- Keep it 2-4 short paragraphs, warm and specific, at most one relevant emoji.
- Always end with a clear call to action that drives traffic to the org's link.
- Return ONLY a JSON object with keys:
  headline (short internal label), body (the post text), cta (button-style call to action, <8 words),
  imageHint (one line describing the ideal photo to attach).`;

function userPrompt(input: GenerateInput): string {
  const idea = input.idea?.trim();
  const avoid = (input.avoid ?? []).filter(Boolean).slice(0, 8);
  return `Organization: ${input.orgName}
Brand voice: ${input.brandVoice}
CTA should link to: ${input.ctaUrl}
${idea ? `Post idea from the client: ${idea}` : "No specific idea — choose a strong angle from the content."}
${
  avoid.length
    ? `\nWe have recently posted the following — write about something DIFFERENT and do not repeat these angles:\n${avoid
        .map((a) => `- ${a}`)
        .join("\n")}\n`
    : ""
}
Website content to ground the post in:
"""
${input.content.slice(0, 4000)}
"""`;
}

/**
 * Generates a post from scraped content + an optional idea. Picks whichever AI
 * provider has a key configured (OpenAI preferred, then Anthropic), and falls
 * back to a safe on-brand stub when neither is set — so the dashboard always runs.
 */
export async function generatePost(input: GenerateInput): Promise<GeneratedDraft> {
  let parsed: Partial<GeneratedDraft> = {};

  if (process.env.OPENAI_API_KEY) {
    parsed = await generateOpenAI(input);
  } else if (process.env.ANTHROPIC_API_KEY) {
    parsed = await generateAnthropic(input);
  } else {
    return stub(input);
  }

  const idea = input.idea?.trim();
  return {
    headline: parsed.headline ?? (idea ?? "New post"),
    body: parsed.body ?? "",
    cta: parsed.cta ?? "Learn more",
    link: input.ctaUrl,
    imageHint: parsed.imageHint ?? "Relevant photo from the website",
    sourceWebsite: input.sourceWebsite,
  };
}

async function generateOpenAI(input: GenerateInput): Promise<Partial<GeneratedDraft>> {
  const client = new OpenAI();
  const res = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(input) },
    ],
  });
  return safeJson(res.choices[0]?.message?.content ?? "");
}

async function generateAnthropic(input: GenerateInput): Promise<Partial<GeneratedDraft>> {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 700,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt(input) }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "";
  return safeJson(text);
}

function safeJson(text: string): Partial<GeneratedDraft> {
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
