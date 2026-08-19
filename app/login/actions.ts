"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "nfda_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Verify the admin email/password from env and open a session on success. */
export async function login(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    // Gate isn't configured — nothing to log into.
    redirect("/");
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
  redirect("/");
}

/** End the session. */
export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}
