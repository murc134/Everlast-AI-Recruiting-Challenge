"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isNextNavigationError, toErrorMessage } from "@/lib/errors";

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error(
      "Missing env var NEXT_PUBLIC_SITE_URL. Set it to http://localhost:3000 locally and your Vercel URL in production."
    );
  }
  return siteUrl.replace(/\/+$/, "");
}

export async function signUp(formData: FormData) {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      redirect("/register?error=missing_fields");
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Confirm Email ist bei dir aus. Trotzdem sauberer Callback-Pfad.
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    if (error) {
      redirect(`/register?error=${encodeURIComponent(`Sign up failed: ${error.message}`)}`);
    }

    // Bei Confirm aus: Session ist direkt da -> ab in die App
    redirect("/app");
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = toErrorMessage(error, "Sign up failed");
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }
}

export async function signIn(formData: FormData) {
  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      redirect("/login?error=missing_fields");
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(`Sign in failed: ${error.message}`)}`);
    }

    redirect("/app");
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = toErrorMessage(error, "Sign in failed");
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }
}
