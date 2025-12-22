import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing auth code")}`
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(`Auth callback failed: ${error.message}`)}`
      );
    }
  } catch (error) {
    const message = toErrorMessage(error, "Auth callback failed");
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    );
  }

  return NextResponse.redirect(`${origin}/app`);
}
