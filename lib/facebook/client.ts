import "server-only";

const GRAPH = "https://graph.facebook.com/v21.0";
const APP_ID = process.env.META_APP_ID ?? "";
const APP_SECRET = process.env.META_APP_SECRET ?? "";

/** Callback URL derived from the current request origin — works on localhost and the deployed domain alike. */
function redirectUri(origin: string): string {
  return `${origin}/api/facebook/callback`;
}

/** Dry-run is ON unless explicitly disabled — posting is simulated by default. */
export const DRY_RUN = process.env.FACEBOOK_DRY_RUN !== "false";

const SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
// Business-type apps use a Login Configuration (config_id) instead of raw scopes.
const CONFIG_ID = process.env.META_CONFIG_ID;

export type FacebookPage = { id: string; name: string; access_token: string };

/** The Facebook login dialog URL. `state` carries the org id back to the callback. */
export function getAuthUrl(state: string, origin: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri(origin),
    state,
    response_type: "code",
  });
  if (CONFIG_ID) {
    // Facebook Login for Business: permissions come from the saved configuration.
    params.set("config_id", CONFIG_ID);
  } else {
    params.set("scope", SCOPES.join(","));
  }
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

/** Exchange the OAuth code for a short-lived user token, then a long-lived one. */
export async function exchangeCodeForUserToken(code: string, origin: string): Promise<string> {
  const short = await graphGet("/oauth/access_token", {
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: redirectUri(origin),
    code,
  });
  const long = await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: short.access_token,
  });
  return long.access_token as string;
}

/** Pages the user manages, each with its own page access token. */
export async function getUserPages(userToken: string): Promise<FacebookPage[]> {
  const res = await graphGet("/me/accounts", { access_token: userToken, fields: "id,name,access_token" });
  return (res.data ?? []) as FacebookPage[];
}

/**
 * Publish (or schedule) a post to a page. In dry-run mode this is simulated and
 * NEVER touches Facebook — it returns a fake id so the pipeline works end-to-end.
 * @param scheduledFor optional future time; Facebook schedules instead of publishing now.
 */
export async function postToPage(opts: {
  pageId: string;
  pageToken: string;
  message: string;
  link?: string;
  scheduledFor?: Date | null;
}): Promise<{ id: string; simulated: boolean }> {
  if (DRY_RUN) {
    return { id: `dryrun_${opts.pageId}_${Date.now()}`, simulated: true };
  }

  const body: Record<string, string> = { message: opts.message, access_token: opts.pageToken };
  if (opts.link) body.link = opts.link;
  if (opts.scheduledFor) {
    body.published = "false";
    body.scheduled_publish_time = String(Math.floor(opts.scheduledFor.getTime() / 1000));
  }

  const res = await fetch(`${GRAPH}/${opts.pageId}/feed`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Facebook post failed (${res.status})`);
  return { id: json.id as string, simulated: false };
}

async function graphGet(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}${path}?${new URLSearchParams(params)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Facebook request failed (${res.status})`);
  return json;
}
