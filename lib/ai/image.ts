import OpenAI from "openai";

/**
 * Generates a photo-style image for a Facebook post from the post's image hint
 * and content. Returns raw bytes so the caller can store them wherever it likes
 * (Supabase Storage in prod, an inline data URL otherwise). Returns null when no
 * OpenAI key is set or image generation is disabled — the app still runs, the
 * preview just falls back to the text hint.
 */
export type GeneratedImage = { bytes: Buffer; contentType: string };

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
// gpt-image-1 landscape size (≈3:2). dall-e-3 users can set 1792x1024 via env.
const IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE ?? "1536x1024";
// "medium" is the sweet spot: great quality at ~20s. "high" looks marginally
// better but takes ~115s/image (too slow). Override with OPENAI_IMAGE_QUALITY.
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? "medium";

/** True unless explicitly turned off — lets you disable paid image calls in tests. */
export function imagesEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.POST_IMAGES !== "false";
}

export async function generatePostImage(input: {
  orgName: string;
  imageHint: string;
  headline?: string;
}): Promise<GeneratedImage | null> {
  if (!imagesEnabled()) return null;

  const client = new OpenAI();
  const prompt = buildPrompt(input);

  // gpt-image-1 returns b64 (no response_format param); JPEG keeps stored bytes
  // small. dall-e models instead return a URL — handled below.
  const isGptImage = IMAGE_MODEL.startsWith("gpt-image");
  const res = (await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: IMAGE_SIZE,
    n: 1,
    ...(isGptImage ? { quality: IMAGE_QUALITY, output_format: "jpeg" } : {}),
  } as Parameters<typeof client.images.generate>[0])) as unknown as {
    data?: Array<{ b64_json?: string | null; url?: string | null }>;
  };

  const item = res.data?.[0];
  if (item?.b64_json) {
    const contentType = isGptImage ? "image/jpeg" : "image/png";
    return { bytes: Buffer.from(item.b64_json, "base64"), contentType };
  }
  if (item?.url) {
    const r = await fetch(item.url);
    if (!r.ok) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    return { bytes, contentType: r.headers.get("content-type") ?? "image/png" };
  }
  return null;
}

function buildPrompt(input: { orgName: string; imageHint: string; headline?: string }): string {
  const subject = input.imageHint?.trim() || input.headline?.trim() || `${input.orgName} social post`;
  // Steer away from garbled text/logos, which image models render poorly.
  return [
    `A warm, high-quality, photorealistic photo for a ${input.orgName} social media post.`,
    `Subject: ${subject}.`,
    "Natural lighting, authentic and editorial, shallow depth of field.",
    "No text, no words, no letters, no watermarks, no logos, no signage.",
  ].join(" ");
}
