"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "nfda_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type LoginState = { error?: string; ok?: boolean } | null;

/**
 * Verify the admin email/password and open a session. Returns { ok: true } rather
 * than redirecting from the action — the client then does a full-page navigation,
 * which reliably carries the just-set cookie (a server-action redirect + cookie
 * can race under useActionState and loop back to /login).
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return { ok: true }; // gate isn't configured — let them in
  }
  const emailOk = !adminEmail || email === adminEmail;
  const passwordOk = password === adminPassword;
  if (!emailOk || !passwordOk) {
    return { error: "Wrong email or password." };
  }

  const token = process.env.SESSION_SECRET || adminPassword;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return { ok: true };
}

/** End the session. */
export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
